---
layout: post
title: "Kubernetes 1.31 to 1.33: Every Feature You Need to Know Right Now"
subtitle: "Gateway API GA, in-place pod resizing, and the deprecations that will break your cluster"
date: 2026-06-30 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&q=80"
catalog: true
tags:
  - Kubernetes
  - Cloud Native
  - DevOps
  - Container
  - Infrastructure
---

# Kubernetes 1.31 to 1.33: Every Feature You Need to Know Right Now

Kubernetes release velocity hasn't slowed. Three releases between mid-2025 and mid-2026 packed in graduated features, removed long-deprecated APIs, and fundamentally changed how you should think about cluster networking and resource management.

This is the condensed guide — what graduated to GA, what's new in beta, and what's going to break your workloads if you don't act now.

![Kubernetes cluster visualization](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&q=80)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

---

## Gateway API: Finally GA

After years in beta, the **Gateway API** graduated to stable in 1.31. This is the most significant networking change since Ingress was introduced.

### Why It Matters

The Ingress resource was always a lowest-common-denominator API. Every cloud provider and ingress controller bolted on custom annotations to expose features that the API couldn't express natively. This made configurations non-portable and hard to reason about.

Gateway API fixes this with a proper role-oriented hierarchy:

```
GatewayClass (cluster-admin)
  └── Gateway (network admin)
        └── HTTPRoute / GRPCRoute / TCPRoute (developer)
```

### Basic HTTPRoute Example

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
        - name: api-v2
          port: 8080
          weight: 90
        - name: api-v1
          port: 8080
          weight: 10  # Canary: 10% to old version
```

Native traffic splitting, header-based routing, and backend weighting — no annotations required.

### Migration Path from Ingress

1. Install a Gateway API-compatible controller (Contour, Envoy Gateway, Istio all support it)
2. Create a `GatewayClass` and `Gateway` resource
3. Migrate Ingress resources to `HTTPRoute` one-by-one
4. Remove old Ingress resources after validation

The old Ingress API isn't deprecated yet, but new features will only land in Gateway API going forward.

---

## In-Place Pod Vertical Scaling (1.33 GA)

This one changes operations significantly. Previously, scaling CPU/memory requests for a running pod required **killing and recreating it**. 

With in-place resizing, you can update a pod's resources without disruption:

```bash
# Before: kubectl edit pod my-pod, then wait for restart
# After: direct patch, no restart needed

kubectl patch pod my-pod --subresource=resize \
  -p '{"spec":{"containers":[{"name":"app","resources":{"requests":{"cpu":"500m","memory":"512Mi"}}}]}}'
```

### What Actually Changes

- Pod spec gets a new `resizePolicy` field per container
- Supported policies: `RestartNotRequired` (default for CPU), `RestartContainer` (for memory on some runtimes)
- Status shows `allocatedResources` (current) vs `resources` (desired)

```yaml
spec:
  containers:
    - name: app
      resources:
        requests:
          cpu: "250m"
          memory: "256Mi"
        limits:
          cpu: "500m"
          memory: "512Mi"
      resizePolicy:
        - resourceName: cpu
          restartPolicy: NotRequired
        - resourceName: memory
          restartPolicy: RestartContainer
```

### HPA + In-Place Resizing

This is where it gets interesting. HPA can now be configured to prefer vertical scaling over horizontal for certain workloads — useful for stateful applications where you want fewer, larger pods rather than more pods.

---

## Structured Authorization (1.32 GA)

Authorization plugins finally have a first-class, structured API. Before 1.30, webhook-based authorization was your only extensibility option — and it was a performance nightmare.

The new `AuthorizationConfiguration` API lets you chain multiple authorizers with ordered evaluation:

```yaml
apiVersion: apiserver.config.k8s.io/v1beta1
kind: AuthorizationConfiguration
authorizers:
  - type: Node
    name: node
  - type: RBAC
    name: rbac
  - type: Webhook
    name: opa-webhook
    webhook:
      timeout: 3s
      failurePolicy: Deny
      matchConditionSubjectAccessReviewVersion: v1
      matchConditions:
        - name: only-non-system
          expression: "!request.userInfo.username.startsWith('system:')"
```

The `matchConditions` CEL expressions let you apply webhook authorization selectively — enormous performance win vs. sending every request to an external webhook.

---

## Deprecations and Removals That Will Break You

### Removed in 1.32

**`flowcontrol.apiserver.k8s.io/v1beta2`** — Flow control APIs for API priority and fairness. Migrate to `v1` or `v1beta3`.

```bash
# Check if you're using deprecated versions
kubectl get prioritylevelconfigurations.flowcontrol.apiserver.k8s.io -o yaml | grep apiVersion
kubectl get flowschemas.flowcontrol.apiserver.k8s.io -o yaml | grep apiVersion
```

### Deprecated in 1.33 (removal upcoming)

**`--cloud-provider` in-tree providers** — AWS, GCP, and Azure in-tree cloud providers are fully removed. You must use the external CCM (Cloud Controller Manager).

```yaml
# Old (broken in 1.33+)
spec:
  providerSpec:
    value:
      cloudProvider: aws  # Gone

# New: run aws-cloud-controller-manager as a DaemonSet
```

**`kubectl run --generator`** — Finally gone. Just use `kubectl run` or write a proper YAML manifest.

### Deprecated (Plan to Migrate)

**`PodSecurityPolicy`** — Removed in 1.25 but clusters upgraded via EKS/GKE managed services sometimes still have PSP admission webhook controllers running. **Pod Security Admission (built-in) is the replacement.** Audit your namespace labels:

```bash
kubectl get namespaces -o json | jq '.items[] | {name: .metadata.name, pss: .metadata.labels["pod-security.kubernetes.io/enforce"]}'
```

---

## Sidecar Containers: The Quiet Revolution

1.29 introduced native sidecar container support as beta; it's now stable and changing how service mesh and observability tooling deploys.

Before: init containers ran first, then regular containers started. There was no way to guarantee a sidecar (like Envoy) was ready before the main app.

After: `initContainers` with `restartPolicy: Always` become "sidecar containers" — they start before regular containers and stay running throughout the pod lifecycle.

```yaml
spec:
  initContainers:
    - name: envoy-proxy
      image: envoyproxy/envoy:v1.30
      restartPolicy: Always  # <- Makes this a sidecar
      startupProbe:
        httpGet:
          path: /ready
          port: 9901
        failureThreshold: 30
  containers:
    - name: app
      image: myapp:latest
      # Guaranteed: envoy is ready before app starts
```

This is significant for Istio, Linkerd, and OpenTelemetry Collectors deployed as sidecars. The lifecycle ordering is now predictable.

---

## Job Enhancements: Success Policy and Backoff Limits Per Index

Batch workloads get meaningful improvements in 1.33:

**Success Policy** — Define what "done" means for a Job beyond "all pods completed":

```yaml
spec:
  completions: 100
  parallelism: 10
  successPolicy:
    rules:
      - succeededIndexes: "0-9"  # First 10 indexes must succeed
        succeededCount: 8        # At least 8 of those
```

**Per-Index Backoff** — Indexed Jobs can now set failure thresholds per index, preventing a single flaky task from failing the entire job.

---

## Upgrade Strategy for 2026

If you're on 1.29 or earlier, here's the path:

1. **Audit API usage** with `kubectl convert` and the deprecation API endpoint
2. **Update manifests** to remove deprecated API versions
3. **Migrate PSP to PSA** if you haven't
4. **Deploy external CCM** if using a major cloud (not just pointing at in-tree provider)
5. **Test Gateway API** with a non-critical ingress before full migration
6. **Upgrade sequentially** (skip no more than 2 minor versions per hop)

```bash
# Useful: check deprecated API usage
kubectl get --raw /metrics | grep apiserver_requested_deprecated_apis
```

---

## Conclusion

Kubernetes 1.31–1.33 represents a maturation cycle more than a revolution. Gateway API GA fixes networking for good. In-place resizing removes a major operational pain point. Sidecar containers solve lifecycle ordering that service meshes have been working around for years.

The deprecation pressure is real — if you're managing clusters professionally, now is the time to pay down that technical debt before those APIs vanish in the next cycle.

---

*Running a specific version and wondering about the upgrade path? Drop a comment with your cluster version and workload type.*
