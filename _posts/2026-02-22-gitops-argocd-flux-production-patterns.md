---
layout: post
title: "GitOps in Production: ArgoCD vs Flux and the Patterns That Actually Work"
subtitle: "A practitioner's guide to GitOps at scale — choosing between ArgoCD and Flux, structuring your repos, handling secrets, and avoiding the common pitfalls that kill GitOps rollouts"
date: 2026-02-22
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200"
catalog: true
tags:
  - GitOps
  - ArgoCD
  - Flux
  - Kubernetes
  - DevOps
---

# GitOps in Production: ArgoCD vs Flux and the Patterns That Actually Work

GitOps has moved from buzzword to baseline. The idea — git is the single source of truth, and a controller continuously reconciles the cluster state to match what's in git — is simple. The implementation at scale is not.

After two years of GitOps rollouts across engineering teams of different sizes and complexity, patterns have emerged: what works, what doesn't, and where the popular advice falls flat.

This post is the practical guide I wish I had before my first GitOps project.

![Kubernetes cluster diagram with nodes and pods representing container orchestration](https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

---

## ArgoCD vs Flux: Making the Call

The most common first question. The honest answer: both are excellent, both are production-proven, and your context matters more than the tools.

### ArgoCD

**Strengths:**
- Rich UI — best-in-class visual representation of application state
- Application-centric model with health status and sync status per app
- Strong RBAC model — easy to give teams access only to their apps
- Better multi-tenant story out of the box
- App-of-Apps and ApplicationSets for managing many apps

**Weaknesses:**
- Heavier install (more Kubernetes resources)
- Drift from pure Kubernetes-native patterns (has its own CRD ecosystem)
- Larger learning curve for operators new to it

### Flux

**Strengths:**
- Pure Kubernetes-native — everything is a Custom Resource
- Modular architecture (source, kustomize, helm, notification controllers)
- Better at multi-tenancy via separate namespaced resources
- GitRepository + HelmRepository + OCIRepository support out of the box
- Lighter weight

**Weaknesses:**
- No built-in UI (need Weave GitOps or third-party)
- Steeper conceptual learning curve
- Less hand-holding for newcomers

### Decision Framework

| Scenario | Recommendation |
|----------|---------------|
| Team is new to GitOps | **ArgoCD** — the UI helps with learning |
| Platform team managing 50+ microservices | **ArgoCD + ApplicationSets** |
| Security-sensitive, minimizing attack surface | **Flux** — smaller footprint |
| Full Kubernetes-native, no GUI preference | **Flux** |
| Need fine-grained team access control | **ArgoCD** |

For most teams starting fresh: ArgoCD wins on developer experience. For platform teams who are Kubernetes-native and prefer CLI: Flux wins on elegance.

---

## Repository Structure: The Decision That Shapes Everything

How you structure your GitOps repos affects team velocity, blast radius of changes, and security posture. Three viable patterns:

### Pattern 1: Monorepo (Everything Together)

```
gitops-repo/
├── apps/
│   ├── production/
│   │   ├── frontend/
│   │   │   ├── deployment.yaml
│   │   │   └── kustomization.yaml
│   │   └── backend/
│   │       ├── deployment.yaml
│   │       └── kustomization.yaml
│   └── staging/
│       ├── frontend/
│       └── backend/
├── infrastructure/
│   ├── cert-manager/
│   ├── ingress-nginx/
│   └── monitoring/
└── clusters/
    ├── production/
    │   └── kustomization.yaml
    └── staging/
        └── kustomization.yaml
```

**Works well for:** Small teams, early-stage projects, high coordination needs.

**Problems at scale:** Every team modifies the same repo, PR reviews become bottlenecks, CODEOWNERS gets complicated.

### Pattern 2: Platform + App Split

```
platform-gitops/          # Platform team owns this
├── clusters/
├── infrastructure/
└── base-apps/

team-a-gitops/           # Team A owns this
├── production/
└── staging/

team-b-gitops/           # Team B owns this  
├── production/
└── staging/
```

**Works well for:** Multi-team orgs where platform and application teams have different release cadences.

**ArgoCD implementation using ApplicationSets:**

{% raw %}
```yaml
# platform-gitops/argocd/app-set.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: team-apps
  namespace: argocd
spec:
  generators:
  - git:
      repoURL: https://github.com/myorg/platform-gitops
      revision: HEAD
      directories:
      - path: "teams/*/production"
  template:
    metadata:
      name: '{{path.basename}}-production'
    spec:
      project: '{{path[1]}}'  # team name as ArgoCD project
      source:
        repoURL: https://github.com/myorg/platform-gitops
        targetRevision: HEAD
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path[1]}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```
{% endraw %}

### Pattern 3: Config Repo + App Repo (Separate CD from CI)

```
app-repo/                 # Application code + CI
├── src/
├── Dockerfile
└── .github/workflows/
    └── ci.yaml           # Builds image, then updates config repo

config-repo/              # GitOps source of truth  
├── production/
│   └── deployment.yaml   # image: myapp:v1.2.3 ← CI updates this
└── staging/
    └── deployment.yaml   # image: myapp:v1.2.3-rc1
```

This is the canonical GitOps pattern. CI builds and tests the app, then opens a PR to the config repo updating the image tag. ArgoCD watches the config repo and deploys automatically.

```yaml
# CI workflow: update image tag in config repo
- name: Update image tag
  run: |
    git clone https://github.com/myorg/config-repo
    cd config-repo
    
    # Update image tag using yq
    yq e ".spec.template.spec.containers[0].image = \"${IMAGE}:${TAG}\"" \
      -i staging/deployment.yaml
    
    git config user.name "GitHub Actions"
    git config user.email "ci@myorg.com"
    git commit -am "ci: update staging image to ${TAG}"
    git push
    
    # Create PR to production (requires human approval)
    gh pr create \
      --title "Deploy ${TAG} to production" \
      --body "Promotes ${TAG} from staging to production" \
      --base main \
      --head "staging-${TAG}"
```

---

## Secrets Management: The Hardest Part

"Everything in git" breaks immediately when you have secrets. You cannot put raw secrets in git. Solutions in order of recommendation:

### 1. External Secrets Operator (ESO)

ESO pulls secrets from external stores (AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager) and creates Kubernetes Secrets. The `ExternalSecret` manifest references the secret by name — safe to commit.

```yaml
# Safe to commit — no secret values here
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: database-credentials  # Creates this K8s Secret
    creationPolicy: Owner
  data:
  - secretKey: DB_PASSWORD        # K8s Secret key
    remoteRef:
      key: prod/database          # AWS Secrets Manager key
      property: password
  - secretKey: DB_HOST
    remoteRef:
      key: prod/database
      property: host
```

Configure the `ClusterSecretStore` with IAM role (not credentials) using IRSA:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
```

### 2. Sealed Secrets

Encrypt secrets using a cluster-specific public key. The encrypted `SealedSecret` is safe to commit; only the cluster can decrypt it.

```bash
# Encrypt a secret (one-time)
kubectl create secret generic db-password \
  --from-literal=password="super-secret" \
  --dry-run=client -o yaml | \
  kubeseal --controller-namespace kube-system \
  --format yaml > sealed-db-password.yaml

# sealed-db-password.yaml is safe to commit
```

**ESO vs Sealed Secrets:** ESO wins for most production setups because it keeps secrets out of git entirely. Sealed Secrets are simpler to set up but tie you to cluster-specific encryption keys.

---

## Sync Policies and the Automation Question

The most controversial GitOps decision: how much to automate?

```yaml
# ArgoCD sync policy options
syncPolicy:
  automated:
    prune: true       # Delete resources removed from git
    selfHeal: true    # Revert manual kubectl changes
    allowEmpty: false # Don't sync if nothing would deploy
  syncOptions:
  - CreateNamespace=true
  - PrunePropagationPolicy=foreground
  retry:
    limit: 3
    backoff:
      duration: 5s
      factor: 2
      maxDuration: 3m
```

**Recommended policy by environment:**

| Environment | Auto-sync | Self-heal | Prune | Manual gate |
|-------------|-----------|-----------|-------|-------------|
| Dev | ✅ | ✅ | ✅ | None |
| Staging | ✅ | ✅ | ✅ | None |
| Production | ⚠️ | ✅ | ✅ | PR approval |

For production, auto-sync on merge to main (after PR approval) is safer than fully automated. Self-heal is almost always safe to enable — it prevents drift from manual `kubectl` changes that bypass git.

---

## Health Checks and Progressive Delivery

GitOps ships code to git; progressive delivery ships code to users. Combine them with Argo Rollouts:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: backend-api
spec:
  replicas: 10
  strategy:
    canary:
      steps:
      - setWeight: 10    # Send 10% traffic to new version
      - pause: {}        # Wait for manual approval
      - setWeight: 50    # 50% traffic
      - pause:
          duration: 30m  # Auto-advance after 30 mins if healthy
      - setWeight: 100   # Full rollout
      canaryService: backend-api-canary
      stableService: backend-api-stable
      trafficRouting:
        istio:
          virtualService:
            name: backend-api-vs
      analysis:
        templates:
        - templateName: success-rate
        startingStep: 2
        args:
        - name: service-name
          value: backend-api-canary
```

ArgoCD tracks the Rollout's health status and shows you exactly where a deployment is in the canary progression.

![Pipeline diagram showing CI/CD workflow automation](https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=800)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

---

## Drift Detection and Alerting

GitOps without alerting is just hoping. Set up alerts for drift and sync failures:

{% raw %}
```yaml
# ArgoCD notification template + trigger
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
data:
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [slack-sync-failed]
  
  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      send: [slack-degraded]
  
  template.slack-sync-failed: |
    message: |
      :red_circle: *{{.app.metadata.name}}* sync failed
      Reason: {{.app.status.operationState.message}}
      <{{.context.argocdUrl}}/applications/{{.app.metadata.name}}|View in ArgoCD>

  service.slack: |
    token: $slack-token
    channels:
    - name: platform-alerts
```
{% endraw %}

---

## Common Pitfalls to Avoid

1. **Storing environment-specific values in the app repo** — they belong in the config/GitOps repo. Mixing them creates tight coupling between CI and CD.

2. **Giant ApplicationSets with no blast radius control** — ApplicationSets that generate 100 apps mean one bad template breaks 100 apps. Add wave sync to control rollout order.

3. **Skipping staging** — teams that go directly to production GitOps without a staging environment lose the safety net of seeing sync behavior before it matters.

4. **Ignoring the ArgoCD API server's security** — the ArgoCD API server should not be publicly exposed. Use SSO + RBAC + private VPN/bastion access.

5. **Pruning without understanding resource ownership** — `prune: true` deletes resources no longer in git. If you have resources managed by other tools (Helm, Terraform), they'll get deleted. Be explicit about what ArgoCD owns.

---

## Key Takeaways

GitOps done right gives you:
- **Full audit trail** — every change has a git commit and PR
- **Rollback in 30 seconds** — `git revert` + merge = instant rollback
- **Declarative everything** — cluster state is defined, not imperative
- **Drift prevention** — controllers fix drift automatically

GitOps done wrong gives you a repo nobody trusts and a cluster that drifts anyway. The difference is structure, discipline, and the right amount of automation.

Pick one tool (ArgoCD or Flux), commit to a repo structure, solve secrets early, and start with one service. The patterns scale up from there.
