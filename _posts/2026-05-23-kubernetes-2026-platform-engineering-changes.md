---
layout: post
title: "Kubernetes 2026: What's Changed and What Your Platform Team Needs to Know"
subtitle: "From Gateway API GA to AI workload scheduling — the Kubernetes landscape has shifted significantly. Here's the practical update for platform engineers."
date: 2026-05-23 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - Kubernetes
  - Platform Engineering
  - DevOps
  - Cloud Native
  - K8s
  - Infrastructure
---

# Kubernetes 2026: What's Changed and What Your Platform Team Needs to Know

Kubernetes 1.32 through 1.34 have landed since the start of 2025, and the cumulative changes are significant enough that if your platform team hasn't done a "what's new" review recently, you're likely missing real quality-of-life and capability improvements. This post covers the changes that matter most in practice — not the exhaustive changelog, but the things that should actually change how you operate.

![Kubernetes Container Orchestration](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1000&auto=format&fit=crop)
*Photo by imgix on Unsplash*

---

## Gateway API is Now the Ingress Standard

The Gateway API graduated to stable (v1) and should now be the default choice for new clusters. If you're still using `Ingress` resources, it's time to plan a migration.

### Why Switch?

The old `Ingress` API was too limited. Advanced routing required vendor-specific annotations that polluted your manifests and created lock-in. Gateway API solves this with a proper resource hierarchy:

```
GatewayClass (cluster-wide, owned by infra team)
  └── Gateway (namespace or cluster-scoped, owned by platform team)
        ├── HTTPRoute (owned by app team)
        ├── GRPCRoute (owned by app team)
        └── TLSRoute (owned by app team)
```

This maps cleanly to real organizational boundaries. The infrastructure team manages the GatewayClass (which cloud LB to use, TLS termination policy). Platform teams provision Gateways. App teams attach routes.

### Basic Migration Example

Before (Ingress):
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
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
              number: 8080
```

After (Gateway API):
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app
spec:
  parentRefs:
  - name: platform-gateway
    namespace: infra
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    filters:
    - type: URLRewrite
      urlRewrite:
        path:
          type: ReplacePrefixMatch
          replacePrefixMatch: /
    backendRefs:
    - name: api-service
      port: 8080
```

The annotations are gone. The routing logic is explicit and portable across implementations.

---

## AI/ML Workload Scheduling: `ResourceClaim` and Dynamic Resource Allocation

If your cluster runs GPU workloads, Dynamic Resource Allocation (DRA) has graduated to beta and changes how you should think about GPU scheduling.

### The Problem with `nvidia.com/gpu: 1`

The old node selector approach for GPUs was blunt. You could request a GPU, but you couldn't express *which kind* of GPU sharing you needed — whether you wanted MIG partitions, time-slicing, or a full GPU. DRA fixes this.

### DRA in Practice

```yaml
# ResourceClaimTemplate: defines what kind of resource you need
apiVersion: resource.k8s.io/v1beta1
kind: ResourceClaimTemplate
metadata:
  name: gpu-a100-80g
spec:
  spec:
    devices:
      requests:
      - name: gpu
        deviceClassName: nvidia.com/gpu
        selectors:
        - cel:
            expression: device.attributes["memory"].isGreaterThan(quantity("70Gi"))
---
# Pod uses the claim template
apiVersion: v1
kind: Pod
metadata:
  name: training-job
spec:
  resourceClaims:
  - name: my-gpu
    resourceClaimTemplateName: gpu-a100-80g
  containers:
  - name: trainer
    image: my-training-image
    resources:
      claims:
      - name: my-gpu
```

The CEL expression in `selectors` lets you express fine-grained requirements — GPU memory, compute capability, NVLink topology — without node affinity sprawl.

---

## Sidecar Containers: Finally a First-Class Concept

`initContainers` with `restartPolicy: Always` (sidecar semantics) graduated to stable in 1.33. This is a quiet but impactful change.

Previously, running sidecar processes (log shippers, service mesh proxies, secret agents) in a Pod was hacky — init containers ran serially before the main container, and regular containers all started simultaneously with no ordering guarantees.

Now you can express sidecars properly:

```yaml
spec:
  initContainers:
  - name: log-forwarder
    image: fluent/fluent-bit:latest
    restartPolicy: Always    # This makes it a sidecar
    resources:
      requests:
        memory: "64Mi"
        cpu: "50m"
  containers:
  - name: app
    image: my-app:latest
```

What this gives you:
- Sidecar starts **before** the main container (init ordering)
- Sidecar stays running for the lifetime of the Pod
- Pod isn't marked ready until the sidecar is ready
- Pod completion waits for main containers only — sidecars are terminated after main containers exit

This is especially useful for service mesh injection, secrets sync (e.g., Vault agent), and log shipping.

---

## In-Place Pod Resize: The End of Disruptive CPU/Memory Changes

In-Place Pod Vertical Scaling (stable in 1.33) lets you update CPU and memory requests/limits without restarting the Pod. This sounds incremental, but it fundamentally changes how you do right-sizing.

```bash
# Resize a running pod's CPU/memory
kubectl patch pod my-app --subresource resize --patch '
{
  "spec": {
    "containers": [
      {
        "name": "app",
        "resources": {
          "requests": {"cpu": "500m", "memory": "1Gi"},
          "limits":   {"cpu": "1000m", "memory": "2Gi"}
        }
      }
    ]
  }
}'
```

The container is resized live (on Linux, via cgroup updates). No restart, no traffic disruption. Combined with a VPA in "auto" mode, this enables fully automated vertical scaling for stateful workloads that can't tolerate pod churn.

![Platform Engineering Infrastructure](https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&auto=format&fit=crop)
*Photo by NASA on Unsplash*

---

## Pod Disruption Budget Improvements

PDBs gained two important new behaviors:

**1. `unhealthyPodEvictionPolicy`:** Control whether unhealthy pods count against your PDB's `minAvailable` budget.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: my-app
  unhealthyPodEvictionPolicy: AlwaysAllow  # Unhealthy pods can always be evicted
```

Previously, a crashed pod would block node drains because evicting it would violate the PDB. `AlwaysAllow` lets unhealthy pods be evicted freely, unblocking drain operations.

**2. PDB conditions:** PDBs now surface conditions that explain disruption status, making `kubectl describe pdb` actually useful for debugging stuck drains.

---

## Security: What's Changed

### Pod Security Standards — Enforce, Don't Audit

If you're still running PSA (Pod Security Admission) in `warn` or `audit` mode, it's time to move to `enforce`. The warnings have been live long enough that legitimate workloads should be compliant.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: v1.33
```

### Service Account Token Improvements

Bound service account tokens (with expiration and audience binding) are now the default. If you have workloads using long-lived service account tokens via `automountServiceAccountToken: true` and manually mounting the secret, audit and migrate them. The auto-mounted projected tokens expire and rotate automatically — far more secure.

---

## What to Prioritize for Your Platform

| Change | Priority | Why |
|--------|----------|-----|
| Migrate Ingress → Gateway API | High | Annotation sprawl, portability |
| Adopt DRA for GPU workloads | High (if you run AI/ML) | Expressive scheduling |
| Use sidecar containers | Medium | Cleaner mesh/logging |
| Enable in-place resize + VPA | Medium | Cost optimization |
| Move PSA to enforce mode | High (security) | Actually enforce what you audit |

Kubernetes has matured significantly — the primitives are richer, the edges are smoother, and the gap between "what you want to express" and "what the API lets you express" keeps narrowing. The operational overhead of staying current is real, but so is the cost of running on patterns the community has moved past.

Time to upgrade your mental model along with your cluster version.
