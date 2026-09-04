---
layout: post
title: "Kubernetes Gateway API: The Modern Replacement for Ingress in 2026"
subtitle: "Why Gateway API is Finally Ready for Production and How to Migrate from Ingress"
date: 2026-03-27 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&auto=format&fit=crop&q=80"
catalog: true
tags:
  - Kubernetes
  - Gateway API
  - Ingress
  - Cloud Native
  - DevOps
  - Networking
---

# Kubernetes Gateway API: The Modern Replacement for Ingress in 2026

The Kubernetes **Gateway API** reached GA (General Availability) in 2023, but 2026 is finally the year teams are making the real switch from Ingress. If you're still writing `kind: Ingress` manifests, this guide explains why you should upgrade — and how to do it safely.

![Kubernetes Gateway API Architecture](https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1000&auto=format&fit=crop&q=80)
*Photo by [ZHENYU LUO](https://unsplash.com/@mrnuclear) on Unsplash*

---

## Why Ingress Is Showing Its Age

Kubernetes `Ingress` has served us well since 2016, but it was designed for a simpler era:

- **Limited expressiveness** — annotations hell (`nginx.ingress.kubernetes.io/...`)
- **Single resource model** — no separation between infrastructure and app concerns
- **No traffic splitting** — canary deployments require hacky annotations
- **No TCP/UDP support** — HTTP-only by spec
- **Vendor lock-in** — every controller implements annotations differently

The result? Ingress manifests that only work with one specific controller, full of controller-specific annotations that are impossible to validate and hard to migrate.

---

## Gateway API: The Design Philosophy

Gateway API introduces a **role-oriented** model with clear separation of concerns:

```
Infrastructure Provider → GatewayClass
Cluster Operator       → Gateway
Application Developer  → HTTPRoute / TCPRoute / GRPCRoute
```

This separation maps to real organizational boundaries. Ops controls the Gateway; devs control their routes. No more dangerous annotation drift.

### Core Resources

| Resource | Owner | Purpose |
|----------|-------|---------|
| `GatewayClass` | Infra Provider | Defines controller implementation |
| `Gateway` | Cluster Operator | Binds ports, TLS, infrastructure |
| `HTTPRoute` | App Developer | HTTP routing rules |
| `GRPCRoute` | App Developer | gRPC routing rules |
| `TCPRoute` | App Developer | TCP routing rules |
| `ReferenceGrant` | Namespace Owner | Cross-namespace permissions |

---

## Installation: Envoy Gateway (Recommended in 2026)

Envoy Gateway has become the de facto standard Gateway API implementation in 2026. Let's set it up:

```bash
# Install Envoy Gateway
helm install eg oci://docker.io/envoyproxy/gateway-helm \
  --version v1.3.0 \
  -n envoy-gateway-system \
  --create-namespace

# Verify installation
kubectl get pods -n envoy-gateway-system
```

Expected output:
```
NAME                                READY   STATUS    RESTARTS   AGE
envoy-gateway-7d9f8b6c5-xk2lp      1/1     Running   0          30s
```

---

## Your First Gateway

### Step 1: Create a GatewayClass

```yaml
# gatewayclass.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: envoy
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
  description: "Envoy Gateway - Production Class"
```

### Step 2: Create the Gateway

```yaml
# gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: prod-gateway
  namespace: infra
spec:
  gatewayClassName: envoy
  listeners:
  - name: http
    port: 80
    protocol: HTTP
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            gateway-access: "true"
  - name: https
    port: 443
    protocol: HTTPS
    tls:
      mode: Terminate
      certificateRefs:
      - name: prod-tls-cert
        namespace: infra
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            gateway-access: "true"
```

### Step 3: Create an HTTPRoute

```yaml
# httproute-myapp.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: myapp-route
  namespace: production  # App team's namespace
spec:
  parentRefs:
  - name: prod-gateway
    namespace: infra
  hostnames:
  - "myapp.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: myapp-api
      port: 8080
      weight: 100
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: myapp-frontend
      port: 3000
```

```bash
kubectl apply -f gatewayclass.yaml
kubectl apply -f gateway.yaml
kubectl label namespace production gateway-access=true
kubectl apply -f httproute-myapp.yaml
```

---

## Advanced Features: What You Couldn't Do with Ingress

### 1. Traffic Splitting (Canary Deployments)

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary-route
  namespace: production
spec:
  parentRefs:
  - name: prod-gateway
    namespace: infra
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: api-stable
      port: 8080
      weight: 90   # 90% traffic
    - name: api-canary
      port: 8080
      weight: 10   # 10% traffic (canary)
```

No annotations. No controller-specific hacks. Pure, portable YAML.

### 2. Header-Based Routing

```yaml
rules:
- matches:
  - headers:
    - name: "X-User-Beta"
      value: "true"
  backendRefs:
  - name: api-beta
    port: 8080
- matches:
  - path:
      type: PathPrefix
      value: /
  backendRefs:
  - name: api-stable
    port: 8080
```

### 3. Request/Response Modification

```yaml
rules:
- matches:
  - path:
      type: PathPrefix
      value: /old-path
  filters:
  - type: URLRewrite
    urlRewrite:
      path:
        type: ReplacePrefixMatch
        replacePrefixMatch: /new-path
  - type: RequestHeaderModifier
    requestHeaderModifier:
      add:
      - name: X-Forwarded-Prefix
        value: /old-path
      remove:
      - X-Internal-Debug
  backendRefs:
  - name: my-service
    port: 8080
```

### 4. Cross-Namespace References with ReferenceGrant

```yaml
# In the 'infra' namespace - allows 'production' to reference its TLS cert
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-production-tls
  namespace: infra
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: production
  to:
  - group: ""
    kind: Secret
    name: prod-tls-cert
```

---

## gRPC Support (Native in 2026)

`GRPCRoute` is now stable. No more custom annotations for gRPC traffic:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GRPCRoute
metadata:
  name: grpc-payments
  namespace: production
spec:
  parentRefs:
  - name: prod-gateway
    namespace: infra
  hostnames:
  - "payments.internal.example.com"
  rules:
  - matches:
    - method:
        service: payments.v1.PaymentsService
        method: ProcessPayment
    backendRefs:
    - name: payments-service
      port: 9090
  - matches:
    - method:
        service: payments.v1.PaymentsService
    backendRefs:
    - name: payments-service-v2
      port: 9090
```

---

## Migrating from Ingress: Step-by-Step

### Assessment Phase

```bash
# List all Ingress resources
kubectl get ingress --all-namespaces

# Check which controller you're using
kubectl get ingressclass

# Export existing configs
kubectl get ingress --all-namespaces -o yaml > ingress-backup.yaml
```

### Conversion Script

Here's a Python helper to convert simple Ingress to HTTPRoute:

```python
import yaml
import sys

def ingress_to_httproute(ingress: dict) -> dict:
    meta = ingress["metadata"]
    spec = ingress["spec"]
    
    rules = []
    for rule in spec.get("rules", []):
        hostname = rule.get("host")
        for path_item in rule.get("http", {}).get("paths", []):
            path = path_item["path"]
            path_type = path_item.get("pathType", "Prefix")
            backend = path_item["backend"]["service"]
            
            route_rule = {
                "matches": [{
                    "path": {
                        "type": "PathPrefix" if path_type == "Prefix" else "Exact",
                        "value": path
                    }
                }],
                "backendRefs": [{
                    "name": backend["name"],
                    "port": backend["port"]["number"],
                }]
            }
            rules.append(route_rule)
    
    return {
        "apiVersion": "gateway.networking.k8s.io/v1",
        "kind": "HTTPRoute",
        "metadata": {
            "name": meta["name"],
            "namespace": meta.get("namespace", "default")
        },
        "spec": {
            "parentRefs": [{"name": "prod-gateway", "namespace": "infra"}],
            "hostnames": [rule.get("host") for rule in spec.get("rules", []) if rule.get("host")],
            "rules": rules
        }
    }

# Usage
with open(sys.argv[1]) as f:
    ingress = yaml.safe_load(f)

httproute = ingress_to_httproute(ingress)
print(yaml.dump(httproute))
```

### Migration Strategy

1. **Dual-run period** — deploy HTTPRoute alongside existing Ingress
2. **Test routes** — verify HTTPRoute works correctly
3. **Shift traffic** — update DNS or use weighted routing
4. **Remove Ingress** — delete old resources after validation

---

## Observability with Gateway API

Envoy Gateway exposes rich metrics out of the box:

```yaml
# Enable prometheus metrics
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: EnvoyProxy
metadata:
  name: prod-proxy-config
  namespace: infra
spec:
  telemetry:
    metrics:
      prometheus:
        disable: false
  logging:
    level:
      default: warn
```

Key metrics to monitor:

```promql
# Request rate per route
sum(rate(envoy_cluster_upstream_rq_total[5m])) by (envoy_cluster_name)

# P99 latency
histogram_quantile(0.99, 
  sum(rate(envoy_cluster_upstream_rq_time_bucket[5m])) by (le, envoy_cluster_name)
)

# Error rate
sum(rate(envoy_cluster_upstream_rq_5xx[5m])) by (envoy_cluster_name)
/ sum(rate(envoy_cluster_upstream_rq_total[5m])) by (envoy_cluster_name)
```

---

## Gateway API vs Service Mesh

A common question in 2026: "Should I use Gateway API or a service mesh like Istio/Linkerd?"

| Concern | Gateway API | Service Mesh |
|---------|------------|-------------|
| North-South traffic | ✅ Primary use case | ✅ Supported |
| East-West (service-to-service) | ⚠️ Limited | ✅ Primary use case |
| mTLS everywhere | ❌ No | ✅ Yes |
| Traffic management | ✅ HTTPRoute | ✅ VirtualService |
| Complexity | Low | High |
| Observability | Good | Excellent |

**Best practice in 2026:** Use Gateway API for ingress + Cilium/Istio for service mesh. Many service meshes now implement Gateway API as their ingress layer anyway.

---

## Production Checklist

Before going live:

- [ ] **TLS configured** on all HTTPS listeners
- [ ] **Rate limiting** via `BackendTrafficPolicy`
- [ ] **Timeouts** set on routes (default: none!)
- [ ] **Health checks** configured for backends
- [ ] **RBAC** — developers can only manage routes in their namespace
- [ ] **ReferenceGrants** audited — no unintended cross-namespace access
- [ ] **Metrics/alerting** on gateway error rate and latency
- [ ] **Backup** — Gateway configs in Git (GitOps)

---

## Conclusion

Kubernetes Gateway API in 2026 is production-ready, widely supported, and genuinely better than Ingress in every way that matters. The role-oriented model reduces friction between platform and application teams. Features like traffic splitting, gRPC routing, and header manipulation are first-class citizens — no more annotation wars.

If you're starting a new cluster, use Gateway API from day one. If you're migrating, the dual-run strategy makes it low-risk. The ecosystem (Envoy Gateway, Cilium, Istio, Traefik, Nginx) all support it — your skills transfer across controllers.

**The era of Ingress is ending. Gateway API is the future.**

---

*References:*
- [Gateway API Official Docs](https://gateway-api.sigs.k8s.io/)
- [Envoy Gateway](https://gateway.envoyproxy.io/)
- [Kubernetes SIG-Network](https://github.com/kubernetes-sigs/gateway-api)
