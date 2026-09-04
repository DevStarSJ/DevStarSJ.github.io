---
layout: post
title: "Kubernetes Gateway API: The Future of Ingress and Traffic Management"
subtitle: "Why Gateway API is replacing Ingress, how to migrate, and production patterns with Envoy Gateway and Istio"
date: 2026-05-16 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1600&auto=format&fit=crop&q=80&ixlib=rb-4.0.3"
catalog: true
tags:
  - Kubernetes
  - Gateway API
  - Ingress
  - Service Mesh
  - Cloud Native
  - DevOps
---

# Kubernetes Gateway API: The Future of Ingress and Traffic Management

The Kubernetes `Ingress` API was fine in 2017. In 2026, it's a liability. Gateway API—now GA for L4/L7 traffic—offers role-based routing, cross-namespace rules, and first-class traffic policies. If you're still writing Ingress resources, it's time to migrate.

![Kubernetes Networking](https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&auto=format&fit=crop)
*Photo by Taylor Vick on Unsplash*

## What's Wrong with Ingress?

```yaml
# Classic Ingress — deceptively simple
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"   # vendor-specific
    nginx.ingress.kubernetes.io/canary: "true"       # vendor-specific
    nginx.ingress.kubernetes.io/canary-weight: "20"  # vendor-specific
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /v1
            pathType: Prefix
            backend:
              service:
                name: api-v1
                port:
                  number: 80
```

Problems:
1. **Annotation hell**: Traffic policies live in untyped string annotations
2. **No role separation**: Infra teams and app teams share the same resource
3. **Vendor lock-in**: Annotations differ between nginx, HAProxy, AWS ALB
4. **Limited expressiveness**: No native weighted routing, header matching, or traffic mirroring

## Gateway API Core Concepts

Gateway API separates concerns into three role-aligned resource types:

```
Infrastructure Admin     Platform Admin       Application Developer
      │                       │                       │
      ▼                       ▼                       ▼
 GatewayClass             Gateway               HTTPRoute
 (defines provider)    (listener config)    (routing rules)
```

### GatewayClass — Defined Once by Infra Team

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: envoy-gateway
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
  parametersRef:
    group: gateway.envoyproxy.io
    kind: EnvoyProxy
    name: custom-proxy-config
    namespace: envoy-gateway-system
```

### Gateway — Managed by Platform Team

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: prod-gateway
  namespace: infra
spec:
  gatewayClassName: envoy-gateway
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: wildcard-tls
            namespace: infra
      allowedRoutes:
        namespaces:
          from: Selector
          selector:
            matchLabels:
              gateway-access: "true"
    - name: http
      protocol: HTTP
      port: 80
      allowedRoutes:
        namespaces:
          from: Same
```

### HTTPRoute — Owned by Application Teams

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-route
  namespace: api-team          # App team's namespace
spec:
  parentRefs:
    - name: prod-gateway
      namespace: infra          # Cross-namespace reference
      sectionName: https
  hostnames:
    - "api.example.com"
  rules:
    # Canary: 10% to v2
    - matches:
        - path:
            type: PathPrefix
            value: /v1/orders
      filters:
        - type: RequestHeaderModifier
          requestHeaderModifier:
            add:
              - name: X-App-Version
                value: "v1"
      backendRefs:
        - name: orders-v1
          port: 8080
          weight: 90
        - name: orders-v2
          port: 8080
          weight: 10

    # A/B test: route beta users to v2
    - matches:
        - path:
            type: PathPrefix
            value: /v1/orders
          headers:
            - name: X-Beta-User
              value: "true"
      backendRefs:
        - name: orders-v2
          port: 8080
```

## Envoy Gateway: The Reference Implementation

Envoy Gateway (1.3, graduated to CNCF Incubating in 2026) is the recommended implementation for most Kubernetes clusters.

### Installation

```bash
helm install eg oci://docker.io/envoyproxy/gateway-helm \
  --version v1.3.0 \
  -n envoy-gateway-system \
  --create-namespace \
  --set config.envoyGateway.logging.level.default=warn
```

### Backend TLS Policies

```yaml
# BackendTLSPolicy: enforce mTLS to backends
apiVersion: gateway.networking.k8s.io/v1alpha3
kind: BackendTLSPolicy
metadata:
  name: orders-mtls
  namespace: api-team
spec:
  targetRefs:
    - group: ""
      kind: Service
      name: orders-v2
  validation:
    caCertificateRefs:
      - name: internal-ca
        group: ""
        kind: ConfigMap
    hostname: orders-v2.api-team.svc.cluster.local
```

### Traffic Policies (Envoy Gateway Extension)

```yaml
# Rate limiting via BackendTrafficPolicy
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: api-rate-limit
  namespace: api-team
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: api-route
  rateLimit:
    type: Global
    global:
      rules:
        - clientSelectors:
            - headers:
                - name: X-API-Key
                  type: Distinct
          limit:
            requests: 1000
            unit: Hour
        - clientSelectors:
            - sourceCIDR:
                value: 0.0.0.0/0
                type: RemoteAddr
          limit:
            requests: 100
            unit: Minute
```

## Migration from Ingress: A Practical Guide

### Step 1: Audit Existing Annotations

```bash
# List all ingress resources and their annotations
kubectl get ingress -A -o json | jq '
  .items[] |
  {
    name: .metadata.name,
    namespace: .metadata.namespace,
    annotations: (.metadata.annotations | keys)
  }
'
```

Map nginx annotations to Gateway API equivalents:

| nginx annotation | Gateway API equivalent |
|-----------------|----------------------|
| `ssl-redirect` | `HTTPRoute` with redirect filter |
| `rewrite-target` | `URLRewrite` filter |
| `canary-weight` | `weight` in `backendRefs` |
| `rate-limit` | `BackendTrafficPolicy` |
| `auth-url` | `ExtensionRef` to external auth |

### Step 2: Parallel Operation

Gateway API and Ingress can run simultaneously. Use a migration period:

```bash
# Install conversion tool
kubectl krew install convert-ingress

# Dry-run conversion
kubectl convert-ingress \
  --ingress-class nginx \
  --gateway-name prod-gateway \
  --gateway-namespace infra \
  --namespace api-team \
  --dry-run
```

### Step 3: Verify and Cut Over

```bash
# Verify Gateway API route resolves identically
kubectl get httproute -n api-team api-route -o yaml | \
  grep -A5 "conditions:"

# Check resolved references
kubectl describe httproute api-route -n api-team
# Look for: Parents: Accepted=True, ResolvedRefs=True

# Cut over DNS
kubectl annotate ingress my-ingress \
  nginx.ingress.kubernetes.io/enabled=false
```

## GRPCRoute and TCPRoute: Beyond HTTP

```yaml
# GRPCRoute for gRPC services
apiVersion: gateway.networking.k8s.io/v1
kind: GRPCRoute
metadata:
  name: grpc-route
  namespace: grpc-team
spec:
  parentRefs:
    - name: prod-gateway
      namespace: infra
      sectionName: https
  hostnames:
    - grpc.example.com
  rules:
    - matches:
        - method:
            service: orders.v1.OrderService
            method: CreateOrder
      filters:
        - type: RequestHeaderModifier
          requestHeaderModifier:
            add:
              - name: X-Upstream-Service
                value: orders
      backendRefs:
        - name: orders-grpc
          port: 9090
```

## Observability Integration

```yaml
# EnvoyProxy config for tracing
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: EnvoyProxy
metadata:
  name: custom-proxy-config
  namespace: envoy-gateway-system
spec:
  telemetry:
    tracing:
      samplingRate: 1.0
      provider:
        backendRefs:
          - name: otel-collector
            namespace: observability
            port: 4317
        type: OpenTelemetry
    metrics:
      sinks:
        - type: OpenTelemetry
          openTelemetry:
            backendRefs:
              - name: otel-collector
                namespace: observability
                port: 4317
    accessLog:
      settings:
        - format:
            type: JSON
          sinks:
            - type: OpenTelemetry
              openTelemetry:
                backendRefs:
                  - name: otel-collector
                    namespace: observability
                    port: 4317
```

## Conclusion

Gateway API isn't just "Ingress v2"—it's a fundamental redesign of how Kubernetes handles traffic. The role-based model (GatewayClass / Gateway / HTTPRoute) maps cleanly to organizational responsibility. Cross-namespace routing unlocks platform team delegation without sacrificing control.

With Envoy Gateway maturing, the implementation risk is low. The migration payoff—typed policies, no annotation drift, native canary support—is substantial. Start with a non-production namespace this week. You'll wonder why you waited.
