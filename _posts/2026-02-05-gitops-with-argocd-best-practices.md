---
layout: post
title: "GitOps with ArgoCD: Best Practices for Production"
subtitle: "Declarative, auditable, and automated Kubernetes deployments"
date: 2026-02-05
author: "Dev Star"
header-img: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=1920&q=80"
tags: [GitOps, ArgoCD, Kubernetes, DevOps, CI/CD]
---

GitOps has become the standard for Kubernetes deployments. The idea is simple: **Git is the single source of truth**. ArgoCD watches your repo and ensures your cluster matches your manifests.

But getting GitOps right in production takes more than `kubectl apply`. Here's what I've learned from running ArgoCD at scale.

![Git Workflow](https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800&q=80)
*Photo by [Yancy Min](https://unsplash.com/@yancymin) on Unsplash*

## Why GitOps?

- **Auditability**: Every change is a commit
- **Rollback**: `git revert` undoes deployments
- **Security**: No direct cluster access needed
- **Consistency**: Drift detection built-in

## ArgoCD Architecture Quick Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Git Repo  │────▶│   ArgoCD    │────▶│  Kubernetes │
│  (manifests)│     │  (watches)  │     │  (applies)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Best Practice #1: Separate App and Config Repos

**Don't** put Kubernetes manifests in your application repo.

```
# Bad: Mixed repo
myapp/
├── src/
├── Dockerfile
└── k8s/
    └── deployment.yaml

# Good: Separate repos
myapp/          # Application code
myapp-config/   # Kubernetes manifests
```

Why? CI builds update the config repo with new image tags. This creates a clean separation of concerns.

## Best Practice #2: Use App of Apps Pattern

Managing dozens of applications individually is painful. Use the "App of Apps" pattern:

```yaml
# apps/root-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/platform-config
    path: apps
    targetRevision: HEAD
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

```yaml
# apps/api.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api
spec:
  source:
    path: services/api
    # ...
```

Now adding a new app is just adding a YAML file.

## Best Practice #3: Environment Promotion with Kustomize

Structure your repo for multi-environment deployments:

```
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
├── overlays/
│   ├── dev/
│   │   └── kustomization.yaml
│   ├── staging/
│   │   └── kustomization.yaml
│   └── prod/
│       └── kustomization.yaml
```

```yaml
# overlays/prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patchesStrategicMerge:
  - replica-patch.yaml
images:
  - name: myapp
    newTag: v1.2.3
```

![DevOps Pipeline](https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=800&q=80)
*Photo by [Mohammad Rahmani](https://unsplash.com/@afgprogrammer) on Unsplash*

## Best Practice #4: Sync Waves for Dependencies

Control deployment order with sync waves:

```yaml
# Deploy namespace first
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "-1"

---
# Then secrets
apiVersion: v1
kind: Secret
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "0"

---
# Finally the app
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

## Best Practice #5: Health Checks Beyond Default

ArgoCD's default health checks aren't always enough:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  # Custom health check for Jobs
  ignoreDifferences:
    - group: batch
      kind: Job
      jsonPointers:
        - /spec/selector
        - /spec/template/metadata/labels
```

For custom resources, define health checks in ArgoCD's ConfigMap:

```yaml
resource.customizations.health.mycrd.example.com_MyResource: |
  hs = {}
  if obj.status ~= nil then
    if obj.status.phase == "Ready" then
      hs.status = "Healthy"
    else
      hs.status = "Progressing"
    end
  end
  return hs
```

## Best Practice #6: Notifications

Don't watch the UI—let ArgoCD tell you:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
data:
  service.slack: |
    token: $slack-token
  trigger.on-sync-failed: |
    - when: app.status.sync.status == 'Unknown'
      send: [app-sync-failed]
  template.app-sync-failed: |
    message: |
      {{.app.metadata.name}} sync failed!
```

## Best Practice #7: RBAC and Projects

Limit what teams can deploy where:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-alpha
spec:
  sourceRepos:
    - 'https://github.com/org/team-alpha-*'
  destinations:
    - namespace: 'team-alpha-*'
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: ''
      kind: Namespace
```

## Quick Reference: Sync Options

| Option | Use Case |
|--------|----------|
| `Prune=true` | Delete removed resources |
| `SelfHeal=true` | Revert manual changes |
| `Replace=true` | For immutable fields |
| `ServerSideApply=true` | Large CRDs, fewer conflicts |

## Common Pitfalls

1. **Secrets in Git**: Use Sealed Secrets or External Secrets Operator
2. **Image tag `latest`**: Always use specific tags
3. **No sync windows**: Define maintenance windows for prod
4. **Ignoring drift**: Enable self-heal or investigate why

## Conclusion

GitOps with ArgoCD isn't just about automation—it's about building a deployment process you can trust. Start simple, add patterns as you scale, and always keep Git as your source of truth.

---

*More resources: [ArgoCD Docs](https://argo-cd.readthedocs.io/) | [GitOps Principles](https://opengitops.dev/)*
