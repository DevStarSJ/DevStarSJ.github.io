---
layout: post
title: "Platform Engineering in 2026: Building Internal Developer Platforms That Actually Get Used"
subtitle: "From golden paths to self-service infrastructure — a practitioner's guide to IDP design, tooling, and adoption"
date: 2026-03-30 00:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80"
catalog: true
tags:
  - Platform Engineering
  - DevOps
  - Kubernetes
  - Backstage
  - IDP
  - Cloud
---

# Platform Engineering in 2026: Building Internal Developer Platforms That Actually Get Used

The platform engineering movement promised to free developers from infrastructure toil. In practice, many organizations built beautiful platforms that nobody wanted to use. This post is about closing that gap — what makes an Internal Developer Platform (IDP) succeed or fail, and how to build one people actually adopt.

![Platform Engineering](https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=1000&auto=format&fit=crop&q=80)
*Photo by [Markus Spiske](https://unsplash.com/@markusspiske) on Unsplash*

---

## Why Platform Engineering Exists

In 2016, "everyone does DevOps" meant "every developer is also an SRE." Teams owned their deployments end-to-end. This was empowering until it wasn't — until every team was reinventing CI/CD pipelines, writing their own Terraform modules, managing their own Kubernetes clusters, and spending more time on infrastructure than product.

**Platform engineering** is the organizational response: a dedicated team that builds shared tooling so product teams can self-serve. The platform team is a force multiplier.

The goal isn't to take control away from developers. It's to make the "right thing" the easy thing — what Camille Fournier calls *building the guardrails, not the road.*

---

## The Golden Path Concept

A **golden path** is the platform's recommended, well-supported way to do something. It's not mandatory, but it's the path of least resistance.

A golden path for "deploy a new microservice" might include:
- A repository template (pre-configured CI/CD, Dockerfile, Kubernetes manifests)
- A Backstage scaffolder template that generates the repo with one click
- Pre-wired observability (logs → Loki, metrics → Prometheus, traces → Tempo)
- A default Kubernetes namespace with pre-configured RBAC
- A service entry in the internal service catalog

Teams *can* deviate from the golden path. But the golden path should handle 80% of use cases well enough that deviation is rarely needed.

---

## Backstage: The IDP Framework

[Backstage](https://backstage.io/) (open-sourced by Spotify, now a CNCF incubating project) has become the de-facto platform for building IDPs. It provides:

- **Software Catalog**: a searchable inventory of all your services, APIs, libraries, and teams
- **TechDocs**: documentation that lives alongside code
- **Scaffolder**: self-service templates for creating new components
- **Plugins**: extensible architecture for custom tooling

### Setting Up Backstage

```yaml
# app-config.yaml
app:
  title: ACME Developer Platform
  baseUrl: http://localhost:3000

backend:
  baseUrl: http://localhost:7007
  database:
    client: pg
    connection: ${POSTGRES_URL}

catalog:
  locations:
    - type: url
      target: https://github.com/acme/catalog/blob/main/all-components.yaml
    - type: github-discovery
      target: https://github.com/acme
      catalogPath: /catalog-info.yaml

auth:
  providers:
    github:
      development:
        clientId: ${AUTH_GITHUB_CLIENT_ID}
        clientSecret: ${AUTH_GITHUB_CLIENT_SECRET}
```

### Writing catalog-info.yaml

Every service should have a `catalog-info.yaml` in its root:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-service
  description: Handles payment processing and refunds
  annotations:
    github.com/project-slug: acme/payment-service
    backstage.io/techdocs-ref: dir:.
    grafana/dashboard-selector: "title='Payment Service'"
    pagerduty.com/service-id: "PAYSERV"
  tags:
    - java
    - payments
    - tier-1
spec:
  type: service
  lifecycle: production
  owner: payments-team
  system: checkout
  providesApis:
    - payment-api
  consumesApis:
    - fraud-detection-api
    - notification-api
  dependsOn:
    - resource:payments-postgres
    - resource:payments-redis
```

The catalog becomes your organization's source of truth for "what exists, who owns it, and what depends on what."

---

## Scaffolder Templates: Self-Service Service Creation

This is where platforms win or lose adoption. If creating a new service takes 30 minutes of CLI commands and Terraform, developers will skip the platform. If it takes 3 minutes in a UI with a form, they'll use it every time.

{% raw %}
```yaml
# templates/microservice/template.yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: microservice-template
  title: Python Microservice
  description: Create a new Python microservice with FastAPI, Docker, and CI/CD
spec:
  owner: platform-team
  type: service

  parameters:
    - title: Service Details
      required: [name, description, owner]
      properties:
        name:
          title: Service Name
          type: string
          pattern: '^[a-z][a-z0-9-]*$'
        description:
          title: Description
          type: string
        owner:
          title: Owner Team
          type: string
          ui:field: OwnerPicker
          ui:options:
            catalogFilter:
              kind: Group
        tier:
          title: Service Tier
          type: string
          enum: [tier-1, tier-2, tier-3]
          description: "Tier 1: critical, on-call required. Tier 3: best-effort."

  steps:
    - id: fetch-base
      name: Fetch Base Template
      action: fetch:template
      input:
        url: ./skeleton
        values:
          name: ${{ parameters.name }}
          description: ${{ parameters.description }}
          owner: ${{ parameters.owner }}

    - id: create-repo
      name: Create GitHub Repository
      action: publish:github
      input:
        repoUrl: github.com?owner=acme&repo=${{ parameters.name }}
        description: ${{ parameters.description }}
        defaultBranch: main

    - id: create-argocd-app
      name: Register in ArgoCD
      action: http:backstage:request
      input:
        method: POST
        path: /api/proxy/argocd/api/v1/applications
        body:
          metadata:
            name: ${{ parameters.name }}
          spec:
            source:
              repoURL: https://github.com/acme/${{ parameters.name }}
              path: kubernetes/
            destination:
              server: https://kubernetes.default.svc
              namespace: ${{ parameters.name }}

    - id: register
      name: Register in Catalog
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps['create-repo'].output.repoContentsUrl }}
        catalogInfoPath: /catalog-info.yaml

  output:
    links:
      - title: Repository
        url: ${{ steps['create-repo'].output.remoteUrl }}
      - title: Open in catalog
        icon: catalog
        entityRef: ${{ steps['register'].output.entityRef }}
```
{% endraw %}

When a developer fills out this form, they get: a GitHub repo with pre-configured CI/CD, a registered ArgoCD application, a catalog entry, TechDocs scaffolded, and Slack channel created — all in 2 minutes, zero tickets.

---

## Kubernetes Abstractions: Less YAML, More Intent

Raw Kubernetes YAML is too low-level for most developers. The platform should provide abstractions.

### Crossplane for Infrastructure

[Crossplane](https://crossplane.io/) extends Kubernetes to provision cloud infrastructure using the same declarative model. Your developers write `CompositeResourceClaims` that your platform team backs with cloud resources.

```yaml
# Developer writes this (simple, intent-based)
apiVersion: platform.acme.io/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: payment-db
  namespace: payment-service
spec:
  parameters:
    storageGB: 20
    version: "16"
    tier: standard
  writeConnectionSecretToRef:
    name: payment-db-credentials
```

```yaml
# Platform team defines what this maps to (Composition)
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: postgresql-aws-rds
spec:
  compositeTypeRef:
    apiVersion: platform.acme.io/v1alpha1
    kind: PostgreSQLInstance
  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            region: ap-northeast-2
            instanceClass: db.t3.medium
            engine: postgres
            # ... full RDS config
      patches:
        - fromFieldPath: spec.parameters.storageGB
          toFieldPath: spec.forProvider.allocatedStorage
        - fromFieldPath: spec.parameters.version
          toFieldPath: spec.forProvider.engineVersion
```

Developers get a simple API. The platform controls what actually gets provisioned.

### Score: Application-Centric Spec

[Score](https://score.dev/) (CNCF sandbox) takes a different angle — developers describe their workload requirements, and Score translates to the target platform (Kubernetes, Docker Compose, etc.).

```yaml
# score.yaml — developer writes this, platform translates it
apiVersion: score.dev/v1b1
metadata:
  name: payment-service

containers:
  main:
    image: acme/payment-service:${IMAGE_TAG}
    resources:
      requests:
        cpu: "250m"
        memory: "256Mi"
    variables:
      DATABASE_URL: ${resources.db.connection_string}
      REDIS_URL: ${resources.cache.connection_string}

service:
  ports:
    http:
      port: 8080

resources:
  db:
    type: postgres
    params:
      version: "16"
  cache:
    type: redis
```

---

## Metrics That Matter for Platform Adoption

The classic DORA metrics are a good starting point:
- **Deployment frequency**
- **Lead time for changes**
- **Change failure rate**
- **Mean time to recovery**

But platforms need additional metrics:

| Metric | What It Measures |
|--------|-----------------|
| Template adoption rate | % of new services using golden path |
| Time to first deploy | How long from repo creation to first production deploy |
| Self-service ratio | % of infra changes that didn't require a platform team ticket |
| Platform NPS | Developer satisfaction with the platform |
| Cognitive load incidents | How often developers escalate due to platform complexity |

Track these. If template adoption is low, your templates aren't solving real problems. If self-service ratio is low, your platform is creating toil instead of reducing it.

---

## The Adoption Trap

The most common platform failure: **building for the platform team's preferences, not developer needs.**

Signs you're in this trap:
- Your platform's documentation is comprehensive but developers still open tickets.
- You built a beautiful portal but people SSH directly to prod servers.
- Your golden path is "golden" only if you already know how everything works.

The fix: **treat developers as your customers.** Do user research. Watch developers try to use your platform. Every ticket is a usability failure. Every workaround is a feature gap.

The best platform teams embed with product teams for a week each quarter. They see what pain actually looks like, not what they imagined it looks like.

---

## Platform Team Topologies

Per the *Team Topologies* framework (Skelton & Pais), a platform team is an **enabling team** — it exists to increase the autonomy of stream-aligned (product) teams.

The failure mode: the platform team becomes a **bottleneck team** that every feature has to go through. This happens when:
- Platform changes require tickets to the platform team
- The platform has no self-service capabilities
- The platform team is understaffed relative to the product org

**Healthy ratio:** Roughly 1 platform engineer per 10-15 product engineers, depending on complexity.

---

## What to Build vs Buy

| Capability | Build | Buy/OSS |
|-----------|-------|---------|
| Service catalog | ❌ | Backstage |
| CI/CD platform | ❌ | GitHub Actions, ArgoCD |
| Kubernetes management | ❌ | Rancher, EKS, GKE |
| Observability stack | Dashboards, alerts | Grafana, Prometheus, Tempo |
| Secrets management | ❌ | Vault, AWS Secrets Manager |
| Service mesh | ❌ | Istio, Linkerd, Cilium |
| Custom abstractions | ✅ | Crossplane compositions |
| Internal tooling | ✅ | — |

Build your differentiators — the abstractions and workflows specific to your organization. Buy (or use OSS) for everything else.

---

A platform is never finished. The best platform teams treat it like a product: continuous discovery, regular releases, and a feedback loop with their users. The goal isn't to have the most sophisticated platform — it's to have the one that makes your developers most productive.

---

*What's your IDP stack in 2026? Drop a comment or open an issue on GitHub.*
