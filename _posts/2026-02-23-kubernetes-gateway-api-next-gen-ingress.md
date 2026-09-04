---
layout: post
title: "Kubernetes Gateway API: The Future of Ingress Is Already Here"
subtitle: "Why the Ingress resource is being deprecated and how to migrate to the expressive, role-aware, multi-protocol Gateway API before it becomes urgent"
date: 2026-02-23
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200"
catalog: true
tags:
  - Kubernetes
  - Gateway API
  - Ingress
  - Cloud Native
  - Networking
  - DevOps
---

# Kubernetes Gateway API: The Future of Ingress Is Already Here

Every Kubernetes engineer knows the pain: `Ingress` resources with vendor-specific annotations scattered everywhere, NGINX configs buried in ConfigMaps, cert-manager fighting with your ingress controller, and TCP/UDP routing that Ingress simply can't express.

The Kubernetes **Gateway API** — now GA and widely implemented — is the answer. It replaces the aging `Ingress` resource with a powerful, expressive, role-separated API that covers HTTP, TCP, UDP, TLS, and gRPC routing in a single coherent model.

![Kubernetes container orchestration visualization](https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

---

## Why `Ingress` Is Being Replaced

The Kubernetes `Ingress` resource was always a compromise. It defined just enough to be useful — hostname-based routing, TLS termination — and left everything else to `metadata.annotations`.

The result: each ingress controller has its own annotation dialect. NGINX, Traefik, HAProxy, and AWS ALB Ingress Controller have hundreds of incompatible annotations for the same features. **Portability is fiction.**

Additional problems:
- **No TCP/UDP support**: Ingress only handles HTTP. Everything else needs custom resources or ConfigMaps.
- **No role separation**: Platform teams and app teams share the same Ingress objects with no clear ownership model.
- **No cross-namespace routing**: Services in different namespaces can't be referenced from an Ingress.
- **No traffic weighting**: Canary deployments need annotations or CRDs — nothing standard.

Gateway API was designed specifically to fix all of this.

---

## Core Concepts: The Role-Separated Model

Gateway API introduces **three resource types** with explicit ownership boundaries:

```
GatewayClass  ←── Infrastructure Provider (cloud team)
     ↓
Gateway       ←── Platform Team (cluster ops)
     ↓
HTTPRoute     ←── Application Team (dev teams)
```

### GatewayClass

Defines the type of gateway infrastructure — created by the cluster infrastructure team.

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: nginx
spec:
  controllerName: k8s.nginx.org/nginx-gateway-controller
```

### Gateway

Instantiates a listener with a specific protocol and port — managed by platform/ops teams. Multiple namespaces can share a single Gateway.

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production-gateway
  namespace: infra
spec:
  gatewayClassName: nginx
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: production-tls-cert
            namespace: infra
      allowedRoutes:
        namespaces:
          from: Selector
          selector:
            matchLabels:
              gateway-access: allowed
    - name: http
      protocol: HTTP
      port: 80
      allowedRoutes:
        namespaces:
          from: Same
```

### HTTPRoute

Routes HTTP traffic to services — created by application developers in their own namespaces.

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-routes
  namespace: my-app
spec:
  parentRefs:
    - name: production-gateway
      namespace: infra
      sectionName: https
  hostnames:
    - "api.example.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /v2/users
      backendRefs:
        - name: users-service-v2
          port: 8080
          weight: 90
        - name: users-service-v3
          port: 8080
          weight: 10   # canary: 10% traffic to v3
    - matches:
        - path:
            type: PathPrefix
            value: /v2/orders
      backendRefs:
        - name: orders-service
          port: 8080
```

---

## Advanced Features

### Traffic Splitting and Canary Deployments

Native canary deployments without annotations or external tools:

```yaml
rules:
  - backendRefs:
      - name: app-stable
        port: 8080
        weight: 95
      - name: app-canary
        port: 8080
        weight: 5
```

Increment the canary weight gradually. No NGINX annotation soup required.

### Header-Based Routing

```yaml
rules:
  - matches:
      - headers:
          - name: "X-App-Version"
            value: "v2"
    backendRefs:
      - name: app-v2
        port: 8080
  - matches:
      - path:
          type: PathPrefix
          value: /
    backendRefs:
      - name: app-v1
        port: 8080
```

### Request Modification

```yaml
rules:
  - filters:
      - type: RequestHeaderModifier
        requestHeaderModifier:
          add:
            - name: X-Request-Source
              value: gateway
          remove:
            - X-Internal-Token
      - type: URLRewrite
        urlRewrite:
          path:
            type: ReplacePrefixMatch
            replacePrefixMatch: /api/v1
    backendRefs:
      - name: api-service
        port: 8080
```

### Redirects

```yaml
rules:
  - matches:
      - path:
          type: PathPrefix
          value: /old-path
    filters:
      - type: RequestRedirect
        requestRedirect:
          path:
            type: ReplacePrefixMatch
            replacePrefixMatch: /new-path
          statusCode: 301
```

---

## TCP and TLS Routes

Unlike `Ingress`, Gateway API handles non-HTTP traffic natively.

### TCPRoute (for raw TCP load balancing)

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: postgres-route
  namespace: databases
spec:
  parentRefs:
    - name: tcp-gateway
      namespace: infra
      sectionName: postgres
  rules:
    - backendRefs:
        - name: postgres-primary
          port: 5432
```

### TLSRoute (for TLS passthrough)

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: secure-app-route
spec:
  parentRefs:
    - name: production-gateway
      namespace: infra
      sectionName: tls-passthrough
  hostnames:
    - "secure.example.com"
  rules:
    - backendRefs:
        - name: secure-app
          port: 443
```

---

## ReferenceGrant: Cross-Namespace Security

When an HTTPRoute in namespace `app-team` needs to reference a backend in namespace `shared-services`, it needs a `ReferenceGrant` from the target namespace:

```yaml
# In the shared-services namespace (controlled by platform team)
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-app-team
  namespace: shared-services
spec:
  from:
    - group: gateway.networking.k8s.io
      kind: HTTPRoute
      namespace: app-team
  to:
    - group: ""
      kind: Service
```

This is a critical security model: **cross-namespace references require explicit consent from the target namespace's owner**.

---

## Implementations in 2026

| Implementation | Maturity | Key Strengths |
|---|---|---|
| **NGINX Gateway Fabric** | GA | Familiar NGINX backend, enterprise support |
| **Envoy Gateway** | GA | Envoy-based, extensible, high performance |
| **Istio (via Kubernetes Gateway)** | GA | Service mesh + ingress unified |
| **Cilium** | GA | eBPF-based, high throughput, no sidecar |
| **Traefik** | GA | Great for small clusters, easy config |
| **HAProxy Ingress** | Beta | HAProxy performance characteristics |
| **AWS Load Balancer Controller** | GA | ALB/NLB native integration |
| **Google Cloud** | GA | GKE native, managed infrastructure |

Most major cloud providers and ingress controllers have GA support. Migration is practical today.

---

## Migrating from Ingress to HTTPRoute

### Before (Ingress with NGINX annotations)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
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

### After (Gateway API)

```yaml
# Platform team creates Gateway (once per cluster/team)
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: infra
spec:
  gatewayClassName: nginx
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        certificateRefs:
          - name: wildcard-cert
---
# App team creates HTTPRoute in their namespace
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app
  namespace: my-team
spec:
  parentRefs:
    - name: main-gateway
      namespace: infra
  hostnames:
    - app.example.com
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: api-service-stable
          port: 8080
          weight: 90
        - name: api-service-canary
          port: 8080
          weight: 10
```

---

## Policy Attachment: The Extension Model

Gateway API uses **Policy Attachment** to extend gateway and route behaviors without annotations. Policies are separate objects that attach to Gateway API resources:

```yaml
# Timeout policy (implementation-specific)
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: BackendLBPolicy
metadata:
  name: api-timeouts
spec:
  targetRef:
    group: ""
    kind: Service
    name: api-service
  sessionPersistence:
    sessionName: "api-session"
    absoluteTimeout: PT1H
    idleTimeout: PT30M
    type: Cookie
```

This model keeps the core API stable while allowing implementations to add features cleanly.

---

## Why Migrate Now?

1. **Ingress API is feature-frozen**: No new features will be added to `networking.k8s.io/v1/Ingress`. Gateway API is where active development happens.
2. **Deprecation is coming**: The Kubernetes community has signaled Ingress will eventually be deprecated.
3. **Portability**: HTTPRoutes work the same across NGINX, Envoy, Istio, and cloud provider implementations.
4. **Team autonomy**: The role-separated model lets app teams own their routes without cluster-admin involvement.
5. **Better features now**: Traffic splitting, header routing, cross-namespace references — available today.

---

## Conclusion

The Kubernetes Gateway API is not a future technology — it's production-ready, GA, and widely implemented. If you're still writing NGINX annotations to configure canary deployments or fighting with Ingress limitations for TCP routing, it's time to migrate.

Start by deploying Envoy Gateway or NGINX Gateway Fabric, migrate one non-critical service to HTTPRoute, and feel the difference. The role-separated model alone is worth the migration — app teams controlling their own routing without platform team bottlenecks is a genuine organizational win.

The future of Kubernetes networking is already here. Annotations are the past.

![Network infrastructure representing Kubernetes networking and load balancing](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800)
*Photo by [JJ Ying](https://unsplash.com/@jjying) on Unsplash*
