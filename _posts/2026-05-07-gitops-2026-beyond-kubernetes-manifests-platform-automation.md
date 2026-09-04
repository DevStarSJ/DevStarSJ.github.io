---
layout: post
title: "GitOps in 2026: From Kubernetes Manifests to Full Platform Automation"
subtitle: "How GitOps has evolved from a CD pattern into the foundation of modern platform engineering"
date: 2026-05-07 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - GitOps
  - DevOps
  - Kubernetes
  - ArgoCD
  - FluxCD
  - CI/CD
---

# GitOps in 2026: From Kubernetes Manifests to Full Platform Automation

GitOps started as a simple idea: use Git as the single source of truth for infrastructure state. Pull requests as change management. Git history as an audit log. Automatic reconciliation between desired state (in Git) and actual state (in the cluster).

Simple idea. Profound implications. In 2026, GitOps has expanded far beyond Kubernetes YAML files into a foundational pattern for operating entire platforms.

![Git and code collaboration](https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=900&auto=format&fit=crop)
*Photo by [Yancy Min](https://unsplash.com/@yancymin) on Unsplash*

---

## GitOps: The Core Principles (Refresher)

The OpenGitOps specification defines four principles:

1. **Declarative** — The system's desired state is expressed declaratively (not imperative scripts)
2. **Versioned and Immutable** — Desired state is stored in Git, with history preserved
3. **Pulled Automatically** — Software agents automatically pull the desired state
4. **Continuously Reconciled** — Agents continuously observe and correct drift

The key word is **reconciliation**. Traditional CI/CD *pushes* changes: a pipeline fires when something changes and applies the update. GitOps *pulls*: an agent continuously watches Git and the cluster, and corrects any deviation between them.

This distinction matters. With push-based CD:
- Someone manually edits a configmap → drift, no record
- A node fails and a pod gets rescheduled with different settings → drift, no alert
- A junior engineer runs `kubectl apply` with last month's config → regression, no audit trail

With GitOps, all of these trigger automatic reconciliation. The cluster *always* reflects what's in Git.

---

## ArgoCD vs Flux: The 2026 State of Play

The two dominant GitOps tools remain **ArgoCD** and **Flux**, and both have matured significantly.

### ArgoCD: The UI-First Approach

ArgoCD's visual interface remains its killer feature:

```yaml
# ArgoCD Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/myorg/gitops-repo
    targetRevision: HEAD
    path: apps/payment-service/production
  destination:
    server: https://kubernetes.default.svc
    namespace: payment
  syncPolicy:
    automated:
      prune: true      # Delete resources removed from Git
      selfHeal: true   # Auto-correct manual changes
    syncOptions:
    - CreateNamespace=true
```

The ArgoCD UI gives you:
- Visual diff between desired and actual state
- Rollback to any previous Git commit with one click
- Real-time resource health across all managed applications
- Multi-cluster management from a single control plane

### Flux: The GitOps Toolkit Approach

Flux took a more composable approach, splitting into separate controllers that you assemble:

```yaml
# GitRepository: where to pull from
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: gitops-repo
spec:
  interval: 1m
  url: https://github.com/myorg/gitops-repo
  ref:
    branch: main

---
# Kustomization: what to apply
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: payment-service
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: gitops-repo
  path: ./apps/payment-service/production
  prune: true
  healthChecks:
  - apiVersion: apps/v1
    kind: Deployment
    name: payment-service
    namespace: payment
```

Flux's controller-per-concern model makes it highly extensible and fits well in platform engineering contexts where different teams need different reconciliation behaviors.

---

## Beyond Manifests: GitOps for Everything

The real evolution of GitOps in 2026 is its expansion beyond Kubernetes YAML.

### Infrastructure as Code + GitOps

Terraform and Pulumi with GitOps reconcilers:

```yaml
# Terraform GitOps with Atlantis or tf-controller
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: aws-vpc
spec:
  interval: 1h
  path: ./terraform/vpc
  sourceRef:
    kind: GitRepository
    name: infra-repo
  approvePlan: auto  # Or require PR approval for plan
  vars:
  - name: region
    value: ap-northeast-2
  writeOutputsToSecret:
    name: vpc-outputs
```

Cloud infrastructure changes go through the same PR review process as application changes. The reconciler detects drift (someone manually changed a security group) and corrects it automatically, or alerts if it can't.

### Database Migrations with GitOps

Schema changes are among the most dangerous operations in software delivery. GitOps patterns are increasingly applied here too:

```yaml
# Schemachange or Flyway in a GitOps workflow
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate-v42
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: flyway:10
        args: ["migrate"]
        env:
        - name: FLYWAY_URL
          value: jdbc:postgresql://postgres:5432/mydb
```

Migrations run as pre-sync hooks — they execute before the new application version deploys, and the deploy only proceeds if the migration succeeds.

![Team collaboration and workflow](https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&auto=format&fit=crop)
*Photo by [Annie Spratt](https://unsplash.com/@anniespratt) on Unsplash*

---

## Progressive Delivery: GitOps + Canary Deployments

GitOps pairs naturally with progressive delivery tools like **Argo Rollouts** and **Flagger**:

```yaml
# Argo Rollouts canary strategy
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: payment-api
spec:
  replicas: 10
  strategy:
    canary:
      steps:
      - setWeight: 10    # 10% traffic to new version
      - pause:
          duration: 10m  # Wait 10 minutes
      - analysis:        # Auto-promote if metrics pass
          templates:
          - templateName: success-rate
      - setWeight: 50
      - pause:
          duration: 5m
      - setWeight: 100
  selector:
    matchLabels:
      app: payment-api
```

The workflow:
1. Developer pushes a new image tag to Git
2. ArgoCD detects the change and triggers the Rollout
3. Argo Rollouts gradually shifts traffic, analyzing metrics at each step
4. If error rates spike, it automatically rolls back to the previous version
5. Git history reflects exactly what was deployed when

---

## Secret Management in a GitOps World

You can't store secrets in Git. But GitOps requires Git to be the source of truth. How do you reconcile this?

The 2026 standard answer is **external secret operators**:

```yaml
# ExternalSecret references secrets in Vault/AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: db-secret
    creationPolicy: Owner
  data:
  - secretKey: password
    remoteRef:
      key: production/database
      property: password
```

The `ExternalSecret` manifest is safe to commit — it's just a reference, not the actual secret. The operator fetches the real secret from Vault or AWS Secrets Manager and creates a Kubernetes `Secret` in the cluster. Rotation happens automatically on the configured interval.

---

## Multi-Cluster GitOps

As organizations grow, they manage dozens or hundreds of Kubernetes clusters. GitOps scales naturally:

```
gitops-repo/
├── clusters/
│   ├── production-ap-northeast-2/
│   │   ├── flux-system/        # Flux bootstrap for this cluster
│   │   └── apps/               # Apps running in this cluster
│   ├── production-us-east-1/
│   └── staging/
└── apps/
    ├── payment-service/
    │   ├── base/               # Shared base manifests
    │   └── overlays/
    │       ├── production/     # Production-specific patches
    │       └── staging/        # Staging overrides
```

Kustomize overlays handle the per-environment customization. Each cluster's Flux instance points to its own folder in the same repo. New cluster? Add a folder, bootstrap Flux, and everything it should run is pulled automatically.

---

## GitOps Maturity Model

**Level 1 — App Deployments**
Basic: application Helm charts reconciled by ArgoCD/Flux. Single cluster.

**Level 2 — Infrastructure + Apps**
Terraform or Crossplane resources managed alongside application manifests. Multi-cluster.

**Level 3 — Progressive Delivery**
Argo Rollouts or Flagger for canary/blue-green. Automated metric-based promotion/rollback.

**Level 4 — Full Platform GitOps**
Everything through Git: cluster provisioning, add-on lifecycle, secret rotation, database schemas, security policies. Drift detection with automated remediation.

Most organizations are at Level 1-2. Level 4 is the north star.

---

## Getting Started

```bash
# Bootstrap Flux on your cluster (GitHub example)
flux bootstrap github \
  --owner=myorg \
  --repository=gitops-repo \
  --branch=main \
  --path=clusters/my-cluster \
  --personal

# That's it. Flux is now managing your cluster from Git.
# Commit manifests to clusters/my-cluster/ and they'll be applied.
```

For ArgoCD:
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
# Then create Application resources pointing at your Git repo
```

---

## The Philosophical Shift

GitOps represents a deeper shift than just tooling. It's a commitment to **infrastructure as a first-class software artifact**.

Your infrastructure deserves:
- Code review before changes go live
- An audit trail of who changed what and when
- Automated testing of proposed changes
- Rollback capability at any moment
- Drift detection and automatic correction

Git gave application code all of these. GitOps brings the same rigor to infrastructure. In 2026, with platforms managing hundreds of microservices across dozens of clusters, that rigor isn't optional — it's what makes the system governable.

The pull request is the unit of trust. The commit is the audit log. The reconciler is the enforcement mechanism.

Simple idea. Profound implications.
