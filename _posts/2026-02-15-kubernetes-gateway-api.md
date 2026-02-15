---
layout: post
title: "Kubernetes Gateway API: The Future of Ingress and Service Mesh"
subtitle: "Master the new standard for traffic management in Kubernetes clusters"
date: 2026-02-15
author: "Dev Star"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200"
tags: [Kubernetes, Gateway API, Ingress, Service Mesh, Cloud Native, DevOps]
---

# Kubernetes Gateway API: The Future of Ingress and Service Mesh

The Kubernetes Gateway API has graduated to GA, marking a new era for traffic management. This powerful, expressive API supersedes the traditional Ingress resource, offering role-oriented design, portable configurations, and advanced routing capabilities.

![Cloud Infrastructure](https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800)
*Photo by [Taylor Vick](https://unsplash.com/@tvick) on Unsplash*

## Why Gateway API?

The original Ingress API served Kubernetes well, but had limitations:

| Ingress Limitations | Gateway API Solution |
|---------------------|---------------------|
| Limited routing options | Rich HTTPRoute matching |
| No TCP/UDP support | TCPRoute, UDPRoute, GRPCRoute |
| Vendor-specific annotations | Portable, standardized API |
| Single resource type | Role-based resource model |
| No traffic splitting | Native weighted routing |

## Core Resources

### GatewayClass

Defines the controller implementation:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: production-gateway
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
  parametersRef:
    group: gateway.envoyproxy.io
    kind: EnvoyProxy
    name: custom-proxy-config
    namespace: envoy-gateway-system
```

### Gateway

The actual load balancer/proxy instance:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: infrastructure
spec:
  gatewayClassName: production-gateway
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      hostname: "*.example.com"
      tls:
        mode: Terminate
        certificateRefs:
          - kind: Secret
            name: wildcard-cert
      allowedRoutes:
        namespaces:
          from: Selector
          selector:
            matchLabels:
              gateway-access: "true"
    
    - name: http
      protocol: HTTP
      port: 80
      hostname: "*.example.com"
      allowedRoutes:
        namespaces:
          from: Same
```

### HTTPRoute

Defines routing rules:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-routes
  namespace: api-team
spec:
  parentRefs:
    - name: main-gateway
      namespace: infrastructure
      sectionName: https
  
  hostnames:
    - "api.example.com"
  
  rules:
    # Exact path match
    - matches:
        - path:
            type: Exact
            value: /health
      backendRefs:
        - name: health-service
          port: 8080
    
    # Prefix match with header condition
    - matches:
        - path:
            type: PathPrefix
            value: /api/v2
          headers:
            - name: X-API-Version
              value: "2"
      backendRefs:
        - name: api-v2
          port: 8080
    
    # Default route with traffic splitting
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: api-stable
          port: 8080
          weight: 90
        - name: api-canary
          port: 8080
          weight: 10
```

## Advanced Routing

### Header-based Routing

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-routing
spec:
  parentRefs:
    - name: main-gateway
  rules:
    - matches:
        - headers:
            - name: X-Feature-Flag
              value: "new-ui"
      backendRefs:
        - name: frontend-beta
          port: 3000
    
    - matches:
        - headers:
            - name: X-User-Tier
              type: RegularExpression
              value: "^(premium|enterprise)$"
      backendRefs:
        - name: premium-api
          port: 8080
```

### Query Parameter Matching

```yaml
rules:
  - matches:
      - queryParams:
          - name: version
            value: "beta"
    backendRefs:
      - name: beta-service
        port: 8080
```

### Method-based Routing

```yaml
rules:
  - matches:
      - method: GET
        path:
          type: PathPrefix
          value: /resources
    backendRefs:
      - name: read-service
        port: 8080
  
  - matches:
      - method: POST
        path:
          type: PathPrefix
          value: /resources
    backendRefs:
      - name: write-service
        port: 8080
```

![Server Room](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800)
*Photo by [Taylor Vick](https://unsplash.com/@tvick) on Unsplash*

## Traffic Management

### Canary Deployments

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary-rollout
spec:
  parentRefs:
    - name: main-gateway
  hostnames:
    - "app.example.com"
  rules:
    - backendRefs:
        - name: app-v1
          port: 8080
          weight: 95
        - name: app-v2
          port: 8080
          weight: 5
```

### Blue-Green with Header Override

```yaml
rules:
  # Testing header bypasses normal routing
  - matches:
      - headers:
          - name: X-Test-Green
            value: "true"
    backendRefs:
      - name: app-green
        port: 8080
  
  # Normal traffic to blue
  - backendRefs:
      - name: app-blue
        port: 8080
```

### Request Mirroring

```yaml
rules:
  - backendRefs:
      - name: production-service
        port: 8080
    filters:
      - type: RequestMirror
        requestMirror:
          backendRef:
            name: shadow-service
            port: 8080
          percent: 10
```

## HTTPRoute Filters

### URL Rewriting

```yaml
rules:
  - matches:
      - path:
          type: PathPrefix
          value: /legacy-api
    filters:
      - type: URLRewrite
        urlRewrite:
          path:
            type: ReplacePrefixMatch
            replacePrefixMatch: /api/v1
    backendRefs:
      - name: api-service
        port: 8080
```

### Request Header Modification

```yaml
filters:
  - type: RequestHeaderModifier
    requestHeaderModifier:
      add:
        - name: X-Request-ID
          value: "${REQUEST_ID}"
        - name: X-Forwarded-Proto
          value: https
      set:
        - name: Host
          value: internal-api.svc.cluster.local
      remove:
        - X-Debug-Header
```

### Response Header Modification

```yaml
filters:
  - type: ResponseHeaderModifier
    responseHeaderModifier:
      add:
        - name: X-Cache-Status
          value: "MISS"
        - name: Strict-Transport-Security
          value: "max-age=31536000; includeSubDomains"
      remove:
        - Server
        - X-Powered-By
```

### Request Redirect

```yaml
rules:
  - matches:
      - path:
          type: Exact
          value: /old-page
    filters:
      - type: RequestRedirect
        requestRedirect:
          scheme: https
          hostname: new.example.com
          path:
            type: ReplaceFullPath
            replaceFullPath: /new-page
          statusCode: 301
```

## GRPCRoute

For gRPC traffic:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GRPCRoute
metadata:
  name: grpc-services
spec:
  parentRefs:
    - name: main-gateway
  hostnames:
    - "grpc.example.com"
  rules:
    - matches:
        - method:
            service: user.UserService
            method: GetUser
      backendRefs:
        - name: user-service
          port: 9090
    
    - matches:
        - method:
            service: order.OrderService
      backendRefs:
        - name: order-service
          port: 9090
```

## TCPRoute and UDPRoute

### TCP Route

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: database-route
spec:
  parentRefs:
    - name: tcp-gateway
      sectionName: postgres
  rules:
    - backendRefs:
        - name: postgres-primary
          port: 5432
```

### UDP Route

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: UDPRoute
metadata:
  name: dns-route
spec:
  parentRefs:
    - name: udp-gateway
  rules:
    - backendRefs:
        - name: coredns
          port: 53
```

## TLS Configuration

### TLS Passthrough

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: tls-passthrough
spec:
  gatewayClassName: production-gateway
  listeners:
    - name: tls
      protocol: TLS
      port: 443
      tls:
        mode: Passthrough
---
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: backend-tls
spec:
  parentRefs:
    - name: tls-passthrough
  hostnames:
    - "secure.example.com"
  rules:
    - backendRefs:
        - name: secure-backend
          port: 443
```

### Multiple Certificates

```yaml
listeners:
  - name: api-tls
    protocol: HTTPS
    port: 443
    hostname: "api.example.com"
    tls:
      certificateRefs:
        - name: api-cert
  
  - name: app-tls
    protocol: HTTPS
    port: 443
    hostname: "app.example.com"
    tls:
      certificateRefs:
        - name: app-cert
```

## Role-Based Access

The Gateway API enables clean separation of concerns:

```yaml
# Platform team manages GatewayClass and Gateway
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: platform
spec:
  listeners:
    - name: https
      allowedRoutes:
        namespaces:
          from: Selector
          selector:
            matchExpressions:
              - key: team
                operator: In
                values: ["api", "frontend", "data"]
---
# Application teams create Routes in their namespaces
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app
  namespace: api-team  # Has label: team=api
spec:
  parentRefs:
    - name: shared-gateway
      namespace: platform
```

## Policy Attachment

### Rate Limiting (Implementation-Specific)

```yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: rate-limit
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: api-routes
  rateLimit:
    type: Global
    global:
      rules:
        - clientSelectors:
            - headers:
                - name: X-API-Key
                  type: Distinct
          limit:
            requests: 100
            unit: Minute
```

### Timeout Configuration

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
spec:
  rules:
    - backendRefs:
        - name: slow-service
          port: 8080
      timeouts:
        request: 30s
        backendRequest: 25s
```

## Migration from Ingress

### Before (Ingress)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
    - host: example.com
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

### After (Gateway API)

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-route
spec:
  parentRefs:
    - name: my-gateway
  hostnames:
    - "example.com"
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
          port: 80
```

## Conclusion

The Gateway API represents a significant evolution in Kubernetes networking:

- **Expressive**: Rich routing capabilities built-in
- **Portable**: Works across implementations
- **Role-Oriented**: Clear separation between platform and app teams
- **Extensible**: Policy attachment for custom behaviors

Start migrating your Ingress resources today. The Gateway API is the future of Kubernetes traffic management.

---

*Ready to modernize your Kubernetes networking?*
