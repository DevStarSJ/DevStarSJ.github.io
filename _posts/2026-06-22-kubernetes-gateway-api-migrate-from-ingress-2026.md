---
layout: post
title: "Kubernetes Gateway API: Why You Should Migrate from Ingress Now"
subtitle: "A complete guide to the GA-stable Gateway API — roles, routes, traffic splitting, and a migration path from NGINX Ingress"
date: 2026-06-22 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - Kubernetes
  - Gateway
  - Networking
  - DevOps
  - Cloud
  - Infrastructure
---

# Kubernetes Gateway API: Why You Should Migrate from Ingress Now

The Kubernetes `Ingress` resource turned 7 years old in 2026, and it's showing its age. Every production cluster has a story: NGINX annotations that only work with one controller, custom CRDs bolted on because Ingress couldn't express the required traffic shape, or a fragile regex in an annotation that nobody dares touch. **Gateway API** — now GA-stable and backed by every major cloud provider and ingress controller vendor — was designed to fix all of this. Here's why the migration is worth it, and how to actually do it.

![Kubernetes networking diagram](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1000&auto=format&fit=crop)
*Photo by Thomas Jensen on Unsplash*

## Why Ingress Is Broken

Ingress's problems are structural:

**1. Annotation Hell**
Ingress has a minimal spec. Anything beyond basic host/path routing requires controller-specific annotations:

```yaml
# NGINX-specific — completely non-portable
nginx.ingress.kubernetes.io/rate-limit: "100"
nginx.ingress.kubernetes.io/rate-limit-window: "1m"
nginx.ingress.kubernetes.io/upstream-hash-by: "$request_uri"
```

**2. No Role Separation**
Infrastructure teams and application teams fight over the same Ingress resource. There's no clean ownership model.

**3. Limited Expressiveness**
Traffic splitting, header-based routing, request mirroring, and TLS passthrough all require workarounds or controller-specific CRDs.

## Gateway API: The Design Philosophy

Gateway API introduces a **role-oriented model** with three distinct resource types:

```
GatewayClass    ← Managed by: Cloud Provider / Infra Team
    └── Gateway     ← Managed by: Cluster Operator
            └── HTTPRoute   ← Managed by: Application Team
```

This separation means app teams can manage their routing rules without touching the underlying load balancer configuration.

## Core Resources

### GatewayClass

Defines the controller type — set by your infrastructure provider:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: istio
spec:
  controllerName: istio.io/gateway-controller
```

### Gateway

Defines the listener — managed by cluster operators:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: prod-gateway
  namespace: istio-system
spec:
  gatewayClassName: istio
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: prod-tls-secret
            namespace: istio-system
      allowedRoutes:
        namespaces:
          from: Selector
          selector:
            matchLabels:
              gateway-access: "allowed"
```

### HTTPRoute

Defines routing rules — managed by application teams:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-routes
  namespace: my-app
spec:
  parentRefs:
    - name: prod-gateway
      namespace: istio-system
  hostnames:
    - "api.example.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /v2/
      backendRefs:
        - name: api-v2-service
          port: 8080
          weight: 90
        - name: api-v2-canary
          port: 8080
          weight: 10
    - matches:
        - path:
            type: PathPrefix
            value: /v1/
      backendRefs:
        - name: api-v1-service
          port: 8080
```

Notice what just happened: **canary traffic splitting with weights** — something that requires annotations or custom CRDs in classic Ingress — is a first-class spec feature.

## Advanced Traffic Patterns

### Header-Based Routing

```yaml
rules:
  - matches:
      - headers:
          - name: "X-Beta-User"
            value: "true"
    backendRefs:
      - name: beta-service
        port: 8080
  - matches:
      - path:
          type: PathPrefix
          value: /
    backendRefs:
      - name: stable-service
        port: 8080
```

### Request Mirroring (Shadow Traffic)

```yaml
rules:
  - matches:
      - path:
          type: PathPrefix
          value: /api
    backendRefs:
      - name: production-service
        port: 8080
    filters:
      - type: RequestMirror
        requestMirror:
          backendRef:
            name: shadow-service
            port: 8080
```

### URL Rewriting

```yaml
filters:
  - type: URLRewrite
    urlRewrite:
      path:
        type: ReplacePrefixMatch
        replacePrefixMatch: /newpath
```

### GRPC Routes

Gateway API v1 includes `GRPCRoute` as a first-class resource:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GRPCRoute
metadata:
  name: grpc-routes
spec:
  parentRefs:
    - name: prod-gateway
  rules:
    - matches:
        - method:
            service: com.example.ProductService
            method: GetProduct
      backendRefs:
        - name: product-service
          port: 50051
```

## Migration from NGINX Ingress

### Step 1: Inventory Your Ingress Resources

```bash
kubectl get ingress -A -o json | jq '.items[] | {
  name: .metadata.name,
  namespace: .metadata.namespace,
  annotations: (.metadata.annotations | keys)
}'
```

### Step 2: Map Annotations to HTTPRoute Features

| NGINX Annotation | HTTPRoute Equivalent |
|-----------------|---------------------|
| `nginx.ingress.kubernetes.io/rewrite-target` | `URLRewrite` filter |
| `nginx.ingress.kubernetes.io/canary-weight` | `weight` in `backendRefs` |
| `nginx.ingress.kubernetes.io/use-regex` | `RegularExpression` path match |
| `nginx.ingress.kubernetes.io/proxy-set-headers` | `RequestHeaderModifier` filter |

### Step 3: Deploy in Parallel

Both Ingress and HTTPRoute can coexist. Run them in parallel, validate the HTTPRoute behavior, then remove the old Ingress:

```bash
# Install Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml

# Create GatewayClass + Gateway
kubectl apply -f gateway.yaml

# Create HTTPRoute alongside existing Ingress
kubectl apply -f httproute.yaml

# Test via HTTPRoute endpoint
curl -H "Host: api.example.com" https://new-gateway-ip/api/health

# Remove Ingress after validation
kubectl delete ingress old-ingress
```

## Controller Support in 2026

Every major controller supports Gateway API:

- **AWS Load Balancer Controller** — full GA support
- **GKE Gateway** — native GKE integration
- **Azure Application Gateway** — AGIC v2
- **Istio** — first-class support since 1.16
- **Envoy Gateway** — reference implementation
- **NGINX Gateway Fabric** — official NGINX implementation
- **Cilium** — eBPF-accelerated Gateway API
- **Traefik** — v3.x full support

## Status Conditions: Better Observability

One underrated improvement: Gateway API resources expose structured status conditions:

```bash
kubectl describe httproute api-routes

# Status:
# Parents:
#   Parent Ref:
#     Group: gateway.networking.k8s.io
#     Kind: Gateway
#     Name: prod-gateway
#   Conditions:
#     Type: Accepted
#     Status: True
#     Reason: Accepted
#     Type: ResolvedRefs
#     Status: True
```

Compare this to debugging why an Ingress annotation isn't working — which usually involves reading controller logs and hoping.

## When to Stay with Ingress

Gateway API isn't always the right choice:

- **Simple single-team clusters** — the role model adds complexity without benefit
- **Controller without GA support** — check compatibility first
- **Minimal routing needs** — basic host/path routing still works fine with Ingress

## The Bottom Line

Gateway API solves real problems that teams have been working around for years. The role-based model, first-class traffic splitting, and native extensibility points make it genuinely superior for production multi-team clusters. With every major cloud provider and controller vendor now supporting it, the migration risk is low.

If you're running Ingress with more than a handful of annotations, the migration is worth planning now. Start with a non-production namespace, get familiar with `HTTPRoute`, then migrate service by service.

The annotations were always a hack. Now there's a real API.

## References

- [Gateway API Documentation](https://gateway-api.sigs.k8s.io/)
- [Gateway API GitHub](https://github.com/kubernetes-sigs/gateway-api)
- [NGINX Gateway Fabric](https://github.com/nginx/nginx-gateway-fabric)
- [Migrating from Ingress — official guide](https://gateway-api.sigs.k8s.io/guides/migrating-from-ingress/)
