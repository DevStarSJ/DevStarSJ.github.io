---
layout: post
title: "Kubernetes 1.34 Deep Dive: Gateway API v1.2, Declarative Node Management, and the End of Ingress"
subtitle: "Everything you need to know about the latest Kubernetes release — and why Gateway API is finally ready for production"
date: 2026-04-11 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&auto=format&fit=crop&q=80"
categories: [DevOps, Kubernetes]
tags: [Kubernetes, K8s, Gateway API, DevOps, Cloud Native, Container Orchestration]
---

## Introduction

Kubernetes 1.34, released in early 2026, continues the platform's steady evolution with several features graduating to GA and a few significant architecture improvements. The headline story? **Gateway API v1.2 is now fully stable**, and the Kubernetes project has officially recommended migrating away from the legacy `Ingress` resource. In this deep dive, we'll cover what's changed, what it means for your clusters, and how to take advantage of the new capabilities.

![Kubernetes Cluster Architecture](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&auto=format&fit=crop&q=80)

*Photo by Taylor Vick on Unsplash*

---

## Gateway API v1.2: What's New and Why It Matters

Gateway API has been shipping incrementally since Kubernetes 1.18, but 1.34 marks the point where the **entire core API surface** (GatewayClass, Gateway, HTTPRoute, GRPCRoute, TCPRoute) is now GA. The experimental channel still carries newer resources, but for standard HTTP/HTTPS routing, you no longer need to opt into alpha or beta features.

### Why Ingress Is Being Retired

The `Ingress` resource, despite its ubiquity, has long been a source of frustration:

| Problem | Ingress | Gateway API |
|---------|---------|-------------|
| Vendor extensions | Annotations (unstandard) | Typed extension points |
| Role separation | None | Infrastructure vs. app layers |
| Protocol support | HTTP only | HTTP, HTTPS, gRPC, TCP, TLS |
| Traffic splitting | Annotation-dependent | Native `HTTPRoute` weights |
| Cross-namespace | Not supported | Gateway + ReferenceGrant |

### Migrating from Ingress to Gateway API

Here's a practical migration from a typical nginx Ingress to Gateway API:

**Before (Ingress):**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  tls:
  - hosts: ["app.example.com"]
    secretName: app-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
```

**After (Gateway API):**
```yaml
# GatewayClass (once per cluster, set by infra team)
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: nginx
spec:
  controllerName: k8s.nginx.org/nginx-gateway-controller
---
# Gateway (once per environment, owned by platform team)
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: prod-gateway
  namespace: infra
spec:
  gatewayClassName: nginx
  listeners:
  - name: https
    port: 443
    protocol: HTTPS
    tls:
      mode: Terminate
      certificateRefs:
      - name: app-tls
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            gateway-access: "true"
---
# HTTPRoute (per application, owned by app team)
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app
  namespace: my-app-ns
spec:
  parentRefs:
  - name: prod-gateway
    namespace: infra
  hostnames: ["app.example.com"]
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-service
      port: 80
      weight: 90
    - name: api-service-canary
      port: 80
      weight: 10
```

The key improvement: traffic splitting with `weight` is **native**, not annotation-based. And the role separation between `GatewayClass`/`Gateway` (platform team) and `HTTPRoute` (app team) maps naturally to real org structures.

---

## Declarative Node Management (GA in 1.34)

One of the biggest operational headaches in Kubernetes has been node lifecycle management — draining nodes for maintenance, handling hardware failures, and ensuring workloads are properly rescheduled. Kubernetes 1.34 graduates the **Declarative Node Management** APIs to GA.

### NodeMaintenanceWindow

```yaml
apiVersion: node.k8s.io/v1
kind: NodeMaintenanceWindow
metadata:
  name: node-upgrade-batch-1
spec:
  nodeSelector:
    matchLabels:
      upgrade-batch: "1"
  schedule:
    # Cron: every Saturday 2-4 AM
    cron: "0 2 * * 6"
    duration: 2h
  drainSettings:
    gracePeriodSeconds: 300
    podSelectors:
    - matchLabels:
        disruption-tolerance: high
    skipPodSelectors:
    - matchLabels:
        disruption-tolerance: none
  afterDrainAction: Reboot
```

This eliminates the need for external tools like `kured` or custom maintenance scripts. The controller handles drain sequencing, respects PodDisruptionBudgets, and can trigger post-maintenance actions.

### Node Problem Detection (Enhanced)

Node Problem Detector is now integrated with the control plane, surfacing issues as structured Kubernetes events and conditions:

```bash
$ kubectl describe node worker-42
...
Conditions:
  Type                     Status  Reason           Message
  ----                     ------  ------           -------
  Ready                    True    KubeletReady     kubelet is posting ready status
  MemoryPressure           False   KubeletHasSufficientMemory
  DiskPressure             False   KubeletHasSufficientDisk
  NetworkUnavailable       False   RouteCreated
  KernelDeadlock           False   KernelHasNoDeadlock
  ReadonlyFilesystem       False   FilesystemIsNotReadOnly
  FrequentKubeletRestart   False   NoFrequentKubeletRestart
  CorruptDockerOverlay2    False   NoCorruptDockerOverlay2
```

---

## Resource Management Improvements

### In-Place Pod Vertical Scaling (GA)

First introduced as alpha in 1.27, **in-place pod vertical scaling** is now GA. You can now adjust CPU and memory requests/limits without restarting pods:

```bash
# Before: had to delete and recreate pod
kubectl patch pod my-app -p '{"spec":{"containers":[{"name":"app","resources":{"requests":{"memory":"512Mi"},"limits":{"memory":"1Gi"}}}]}}'
# Pod restarts automatically, causing downtime

# Now: in-place resize (no restart for memory changes)
kubectl patch pod my-app --subresource resize -p '
{
  "spec": {
    "containers": [{
      "name": "app",
      "resources": {
        "requests": {"memory": "512Mi"},
        "limits": {"memory": "1Gi"}
      }
    }]
  }
}'

# Check resize status
kubectl get pod my-app -o jsonpath='{.status.resize}'
# Output: "Proposed" → "InProgress" → "Infeasible" or gone (success)
```

Note: CPU changes don't require a restart on Linux. Memory increases don't require restart; memory decreases do (kernel limitation).

---

## Structured Authorization (Beta → GA)

The new `Authorization` API provides structured, auditable authorization policies as Kubernetes resources rather than webhook-only delegation:

```yaml
apiVersion: authorization.k8s.io/v1alpha1
kind: AuthorizationPolicy
metadata:
  name: engineering-team-policy
spec:
  subjects:
  - kind: Group
    name: engineering
  rules:
  - verbs: [get, list, watch, create, update, patch]
    resources:
    - apiGroups: [apps]
      resources: [deployments, replicasets]
    - apiGroups: [""]
      resources: [pods, services, configmaps]
  - verbs: [get, list]
    resources:
    - apiGroups: [""]
      resources: [secrets]
  namespaceSelector:
    matchLabels:
      team: engineering
```

---

## Upgrade Notes: Breaking Changes in 1.34

1. **`Ingress` deprecation notice added** — Ingress resources are still functional but now show deprecation warnings in `kubectl apply` output
2. **`PodSecurityPolicy` removal complete** — if you somehow still have PSP in use, this is your final deadline
3. **`v1beta1` CRD version dropped** — all CRDs must be `v1` or `v1alpha1`+
4. **Endpoint slices exclusively used** — the old `Endpoints` resource is now only synced from `EndpointSlice`, not directly managed
5. **containerd 1.7+ required** — Docker shim has been removed for several releases; this release requires containerd 1.7 minimum

---

## What's Coming in 1.35

Based on open KEPs and community discussions:
- **Cluster-level resource quotas** spanning multiple namespaces
- **Snapshot-based node restoration** for rapid recovery
- **OCI artifact support** for Helm charts and config bundles stored in container registries
- **Improved multi-cluster services** via the MCS API graduation

---

## Summary

Kubernetes 1.34 is a maturity release: fewer flashy new features, more production-grade stabilization. The Gateway API migration from Ingress is the most significant operational change for most teams. Start planning your migration now — the annotation-based era of Ingress is ending, and the structured, role-separated world of Gateway API is genuinely better.

---

*Found this useful? Check out our other Kubernetes deep dives and subscribe for weekly cloud-native updates.*
