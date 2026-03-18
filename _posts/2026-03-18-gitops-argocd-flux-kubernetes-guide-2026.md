---
layout: post
title: "GitOps with ArgoCD and Flux: Deploying Kubernetes Applications the Right Way in 2026"
subtitle: "A complete guide to GitOps principles, ArgoCD vs Flux comparison, ApplicationSet patterns, and progressive delivery with Argo Rollouts"
date: 2026-03-18 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=1600&q=80"
catalog: true
tags:
  - GitOps
  - ArgoCD
  - Kubernetes
  - DevOps
  - CI/CD
---

# GitOps with ArgoCD and Flux: Deploying Kubernetes Applications the Right Way in 2026

GitOps has moved from pioneering practice to industry standard. In 2026, if your Kubernetes deployments aren't driven by Git as the single source of truth, you're carrying operational debt. ArgoCD and Flux remain the two dominant GitOps controllers, each with a distinct philosophy and ecosystem. This guide covers both, when to choose each, and the advanced patterns that separate mature GitOps implementations from basic ones.

![Kubernetes Deployment](https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&q=80)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

---

## The Four GitOps Principles

Before diving into tools, the [OpenGitOps](https://opengitops.dev/) project codified what GitOps actually means:

1. **Declarative** — Desired state is expressed as declarations (YAML, Helm values, Kustomize)
2. **Versioned and Immutable** — Git is the single source of truth; history is auditable
3. **Pulled Automatically** — Software agents continuously pull and apply desired state
4. **Continuously Reconciled** — Agents detect and correct drift between desired and actual state

The key word in principle 3 is **pulled** — the cluster pulls from Git, not the other way around. This eliminates the need to give CI pipelines `kubectl` access to production clusters.

---

## ArgoCD: The UI-First GitOps Controller

ArgoCD is the CNCF-graduated GitOps tool favored for its rich UI, powerful Application model, and extensive integrations.

### Installation

```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/v2.12.0/manifests/install.yaml

# Get the initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d && echo

# Port-forward to access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

### Your First Application

```yaml
# apps/my-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io  # Cascade delete
spec:
  project: default

  source:
    repoURL: https://github.com/myorg/k8s-manifests
    targetRevision: HEAD
    path: apps/my-app/overlays/production

  destination:
    server: https://kubernetes.default.svc
    namespace: my-app-prod

  syncPolicy:
    automated:
      prune: true      # Delete resources removed from Git
      selfHeal: true   # Revert manual cluster changes
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - ApplyOutOfSyncOnly=true  # Only sync changed resources
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

```bash
kubectl apply -f apps/my-app.yaml
argocd app sync my-app  # Or let automated sync handle it
```

---

## ApplicationSet: Managing Many Applications at Scale

Single `Application` resources don't scale when you have 50 microservices across 10 clusters. `ApplicationSet` solves this with generator-based templating.

### Directory Generator

```yaml
# applicationsets/microservices.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservices
  namespace: argocd
spec:
  generators:
    # Creates one Application per directory in apps/
    - git:
        repoURL: https://github.com/myorg/k8s-manifests
        revision: HEAD
        directories:
          - path: apps/*
          - path: apps/experimental/*
            exclude: true  # Skip experimental services

  template:
    metadata:
      name: "{{path.basename}}"
      labels:
        app.kubernetes.io/name: "{{path.basename}}"
    spec:
      project: microservices
      source:
        repoURL: https://github.com/myorg/k8s-manifests
        targetRevision: HEAD
        path: "{{path}}"
      destination:
        server: https://kubernetes.default.svc
        namespace: "{{path.basename}}"
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

### Matrix Generator: All Services × All Clusters

```yaml
spec:
  generators:
    - matrix:
        generators:
          - list:
              elements:
                - cluster: production-us-east
                  url: https://k8s-us-east.example.com
                - cluster: production-eu-west  
                  url: https://k8s-eu-west.example.com
                - cluster: staging
                  url: https://k8s-staging.example.com

          - git:
              repoURL: https://github.com/myorg/k8s-manifests
              revision: HEAD
              directories:
                - path: apps/*

  template:
    metadata:
      name: "{{cluster}}-{{path.basename}}"
    spec:
      source:
        path: "apps/{{path.basename}}/overlays/{{cluster}}"
      destination:
        server: "{{url}}"
        namespace: "{{path.basename}}"
```

This single `ApplicationSet` creates one `Application` per service per cluster — no manual duplication.

---

## Flux: The Kubernetes-Native Alternative

Flux takes a different approach: rather than one monolithic controller, it's a set of composable Kubernetes controllers (GitRepository, Kustomization, HelmRelease, etc.).

### Installation with Flux CLI

```bash
# Install Flux CLI
brew install fluxcd/tap/flux

# Bootstrap Flux (creates GitRepository and Kustomization in your cluster)
flux bootstrap github \
  --owner=myorg \
  --repository=k8s-gitops \
  --branch=main \
  --path=clusters/production \
  --personal
```

This creates a Git repository structure and pushes Flux's own manifests into it — Flux manages itself via GitOps.

### Core Flux Resources

```yaml
# clusters/production/apps/source.yaml
---
# Point to your app's Helm chart repository
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: HelmRepository
metadata:
  name: my-charts
  namespace: flux-system
spec:
  interval: 10m
  url: https://charts.myorg.com

---
# Point to your config repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app-config
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/k8s-manifests
  ref:
    branch: main
  secretRef:
    name: github-token
```

```yaml
# clusters/production/apps/my-app.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: my-app
  namespace: my-app-prod
spec:
  interval: 15m
  chart:
    spec:
      chart: my-app
      version: ">=2.0.0 <3.0.0"  # SemVer range!
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system

  values:
    replicaCount: 3
    image:
      repository: myorg/my-app
      tag: "1.8.2"
    resources:
      requests:
        memory: 256Mi
        cpu: 100m

  # Override values from a ConfigMap (environment-specific)
  valuesFrom:
    - kind: ConfigMap
      name: my-app-prod-values
    - kind: Secret
      name: my-app-secrets
      valuesKey: helm-values.yaml

  # Dependencies — wait for database before deploying
  dependsOn:
    - name: postgresql
      namespace: database
```

### Flux Image Automation (Auto-Update Image Tags)

```yaml
# Auto-update the image tag when a new image is pushed to the registry
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.myorg.com/my-app
  interval: 5m

---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0 <2.0.0"  # Only update within v1.x.x

---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: my-app-config
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux@myorg.com
        name: Flux Bot
      messageTemplate: "chore: update {{.AutomationObject}} images"
    push:
      branch: main
```

With this setup, when you push a new Docker image tagged `1.8.3`, Flux automatically updates the YAML in Git and reconciles the cluster — zero human intervention.

---

## ArgoCD vs. Flux: Decision Guide

| Criteria | ArgoCD | Flux |
|---|---|---|
| **UI** | Excellent built-in dashboard | Basic (use Weave GitOps for UI) |
| **Multi-cluster** | Excellent (native hub-spoke) | Good (with Flux multitenancy) |
| **Helm support** | Native + raw manifests | HelmRelease controller |
| **Kustomize** | Native | Native (Kustomization resource) |
| **Image automation** | Argocd-image-updater (addon) | Built-in |
| **RBAC** | Fine-grained per-project | Kubernetes RBAC |
| **Learning curve** | Moderate (UI helps) | Steeper (CLI-first) |
| **GitOps purity** | Good | Stricter (more composable) |
| **CNCF status** | Graduated | Graduated |

**Choose ArgoCD when:**
- You want a great UI for your team
- You're managing dozens of clusters from a hub
- You need application-level RBAC separate from Kubernetes RBAC

**Choose Flux when:**
- You prefer Kubernetes-native CRDs and operators
- You want image automation built-in
- You're comfortable with a CLI-first workflow
- You need GitOps for Flux itself (it bootstraps itself)

---

## Progressive Delivery with Argo Rollouts

GitOps tells you *that* a deployment should happen. **Argo Rollouts** tells you *how*:

```yaml
# rollout.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app
spec:
  replicas: 10
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: myorg/my-app:1.9.0

  strategy:
    canary:
      # Send 10% traffic to canary initially
      steps:
        - setWeight: 10
        - pause: { duration: 5m }   # Wait 5 minutes
        - setWeight: 25
        - pause: {}                  # Manual approval gate
        - setWeight: 50
        - pause: { duration: 5m }
        - setWeight: 100

      # Automatic rollback on errors
      analysis:
        templates:
          - templateName: success-rate
        startingStep: 2
        args:
          - name: service-name
            value: my-app

  # Canary traffic split via Istio
  trafficRouting:
    istio:
      virtualService:
        name: my-app-vsvc
      destinationRule:
        name: my-app-destrule
        canarySubsetName: canary
        stableSubsetName: stable
```

```yaml
# AnalysisTemplate for automatic pass/fail criteria
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      interval: 1m
      failureCondition: "result[0] < 0.95"  # Fail if <95% success rate
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(
              istio_requests_total{
                destination_service_name="{{args.service-name}}",
                response_code!~"5.*"
              }[5m]
            )) /
            sum(rate(
              istio_requests_total{
                destination_service_name="{{args.service-name}}"
              }[5m]
            ))
```

If the success rate drops below 95% during the canary phase, Argo Rollouts automatically promotes back to the stable version.

---

## Secrets Management in GitOps

Never commit secrets to Git. Use sealed secrets or external secret operators:

### Sealed Secrets (Simple)

```bash
# Install kubeseal CLI
brew install kubeseal

# Encrypt a secret
kubectl create secret generic db-creds \
  --from-literal=password=supersecret \
  --dry-run=client -o yaml | \
  kubeseal --controller-namespace sealed-secrets | \
  kubectl apply -f -
```

The `SealedSecret` CRD is safe to commit to Git — only the controller in-cluster can decrypt it.

### External Secrets Operator (Enterprise)

```yaml
# Sync from AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
    - secretKey: password
      remoteRef:
        key: production/myapp/database
        property: password
```

![DevOps Workflow](https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80)
*Photo by [Annie Spratt](https://unsplash.com/@anniespratt) on Unsplash*

---

## Repository Structure Best Practices

```
k8s-gitops/
├── clusters/
│   ├── production/
│   │   ├── flux-system/          # Flux bootstrap manifests
│   │   └── apps/                 # Application manifests
│   └── staging/
├── apps/
│   ├── base/                     # Shared base manifests
│   │   ├── my-app/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── kustomization.yaml
│   └── overlays/                 # Environment-specific overrides
│       ├── production/
│       │   └── my-app/
│       │       ├── kustomization.yaml
│       │       └── replica-patch.yaml
│       └── staging/
│           └── my-app/
│               └── kustomization.yaml
└── infrastructure/
    ├── cert-manager/
    ├── ingress-nginx/
    └── monitoring/
```

**Key rule**: Application code and Kubernetes manifests live in **separate repositories**. CI updates the manifest repo; GitOps reconciles from it.

---

## Conclusion

GitOps has solved the operability and auditability challenges that plagued traditional CI/CD pipelines. ArgoCD and Flux have both reached maturity levels where the choice is more about team preference and workflow than feature gaps. Start with ArgoCD if you want immediate productivity via its UI; start with Flux if you prefer a fully Kubernetes-native approach. Add Argo Rollouts for progressive delivery and you have a complete, production-grade deployment platform that gives you a full audit trail, automatic drift correction, and the confidence that what's in Git is what's running in your cluster.
