---
layout: post
title: "Kubernetes 1.32: Gateway API Goes GA and the Rise of Autopilot Features"
subtitle: "Gateway API has finally reached GA, kubectl get all actually works now, and cluster autoscaling is smarter than ever — here's what engineers need to know in 2026"
date: 2026-03-10 09:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200"
catalog: true
tags:
  - Kubernetes
  - Cloud Native
  - DevOps
  - Infrastructure
  - Container Orchestration
---

Kubernetes 1.32 dropped in early 2026 with some of the most developer-friendly changes the project has shipped in years. Gateway API is now stable, the scheduler has new autopilot behaviors that reduce toil, and there are long-awaited quality-of-life improvements that make operating clusters less painful. Let's dig in.

---

## Gateway API: Finally GA

After years of `networking.k8s.io/v1beta1` sitting in beta, **Gateway API v1.2** is now stable and ships as a core Kubernetes API in 1.32.

![Kubernetes Gateway API architecture diagram](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900)
*Photo by Jordan Harrison on Unsplash*

If you're still using `Ingress`, here's why you should care:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-route
  namespace: production
spec:
  parentRefs:
  - name: prod-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /v2
    backendRefs:
    - name: api-v2-service
      port: 8080
      weight: 90
    - name: api-v1-service
      port: 8080
      weight: 10
```

Gateway API gives you:

- **Role-based delegation**: Platform teams own `GatewayClass` and `Gateway`. App teams own `HTTPRoute`. No more RBAC gymnastics on a monolithic Ingress resource.
- **Traffic splitting built-in**: Weight-based routing without nginx annotations or custom CRDs.
- **Protocol-native routing**: `GRPCRoute`, `TCPRoute`, `TLSRoute` — all first-class citizens.
- **Multi-tenancy**: Multiple teams can attach routes to the same gateway without stepping on each other.

### Migrating from Ingress

Most Gateway API implementations ship a migration tool now:

```bash
kubectl-gateway migrate --from ingress/my-app-ingress --to httproute/my-app-route --dry-run
```

The semantic differences are minor but worth knowing. Ingress path matching was implementation-defined; HTTPRoute path matching is spec-defined. Test your routing rules before cutting over.

---

## Autopilot Scheduling: Less YAML, More Intelligence

Kubernetes 1.32 introduces **Autopilot Hints**, a new mechanism where the scheduler can suggest resource adjustments back to workloads without requiring VPA (Vertical Pod Autoscaler) to be installed separately.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: recommendation-service
spec:
  template:
    spec:
      containers:
      - name: app
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2"
            memory: "2Gi"
        # New in 1.32
        resourcePolicy:
          autopilot: suggest  # "suggest" | "apply" | "off"
```

With `suggest`, the scheduler annotates pods with recommended resource changes after observing actual utilization. With `apply`, it does rolling restarts automatically when requests are significantly off.

This is the GKE Autopilot experience being upstreamed into vanilla Kubernetes — a long time coming.

---

## Structured Authentication Config Goes Stable

Token-based webhook auth (`--token-auth-file`) has been deprecated for a while. In 1.32, the **Structured Authentication Configuration** format is stable:

```yaml
apiVersion: apiserver.config.k8s.io/v1alpha1
kind: AuthenticationConfiguration
jwt:
- issuer:
    url: https://token.actions.githubusercontent.com
    audiences:
    - https://kubernetes.default.svc.cluster.local
  claimMappings:
    username:
      claim: sub
      prefix: "github:"
    groups:
      claim: groups
      prefix: "github:"
  claimValidationRules:
  - claim: repository
    requiredValue: "myorg/myrepo"
```

This replaces the fragile flag-based webhook approach with a declarative, auditable config. GitHub Actions OIDC, Vault, and custom IdPs all work cleanly with this.

---

## `kubectl get all` Actually Gets All Now

OK, this one is controversial. Historically, `kubectl get all` conspicuously omitted CRDs — it only returned core API group resources. In 1.32, there's a new flag:

```bash
kubectl get all --include-crds
```

And if you configure `kubectl` client-side:

```yaml
# ~/.kube/config additions
preferences:
  extensions:
  - name: client.authentication.k8s.io/exec
    extension:
      getAll:
        includeCRDs: true
```

It's not default-on because the output can be enormous in clusters with many CRDs, but at least the option exists without third-party plugins.

---

## Sidecar Containers: Fully Stable

Sidecar containers (native init containers with `restartPolicy: Always`) graduated to stable in 1.32. This is a big deal for service mesh and observability use cases:

```yaml
initContainers:
- name: istio-proxy
  image: istio/proxyv2:1.21
  restartPolicy: Always  # Makes it a sidecar
  lifecycle:
    postStart:
      exec:
        command: ["/bin/sh", "-c", "until curl -s localhost:15000/ready; do sleep 1; done"]
```

Before this feature, sidecars had ordering and lifecycle problems — the sidecar could terminate before the main container finished, causing job failures. Native sidecars solve this.

---

## Node Memory Manager Improvements

NUMA-aware scheduling gets meaningful improvements in 1.32. For latency-sensitive workloads running on multi-socket servers, the Memory Manager now supports:

- **NUMA node pinning** without requiring the CPU Manager to be enabled
- **Hugepage-aware NUMA alignment** — hugepage requests are now co-located with CPU topology hints
- **Pod-level NUMA affinity hints** in the downward API

```bash
# Check NUMA topology decisions
kubectl describe node worker-node-01 | grep -A 20 "Topology"
```

---

## What to Do Right Now

1. **Migrate Ingress to HTTPRoute** in dev/staging. The ecosystem is moving fast; controllers like Envoy Gateway, Cilium, and NGINX now have excellent Gateway API support.
2. **Try Autopilot Hints in suggest mode** on non-critical workloads. Let it collect data for a week before considering `apply`.
3. **Adopt Structured Authentication Config** if you're using OIDC. The old webhook approach will be removed in 1.35.
4. **Enable native sidecars** for any new service mesh deployments.

Kubernetes 1.32 isn't a revolutionary release, but it's one of the most operationally mature ones in recent memory. The platform is growing up.

---

*References: [Kubernetes 1.32 Release Notes](https://kubernetes.io/blog/), [Gateway API v1.2 Changelog](https://gateway-api.sigs.k8s.io/), [KEP-753 Sidecar Containers](https://github.com/kubernetes/enhancements)*
