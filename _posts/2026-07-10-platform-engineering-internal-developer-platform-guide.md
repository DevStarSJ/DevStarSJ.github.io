---
layout: post
title: "Platform Engineering: Building Internal Developer Platforms That Actually Get Used"
subtitle: "Why most IDPs fail, and the golden path approach that makes developers love their infrastructure"
date: 2026-07-10 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - Platform Engineering
  - DevOps
  - IDP
  - Kubernetes
  - Backstage
  - Developer Experience
---

# Platform Engineering: Building Internal Developer Platforms That Actually Get Used

Most Internal Developer Platforms (IDPs) die quietly. They're built with good intentions, launched with fanfare, and abandoned within a year. Not because the idea was bad — but because teams built a product nobody wanted to buy.

This post breaks down what separates successful IDPs from expensive shelfware.

![Platform Engineering](https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=900&auto=format&fit=crop)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

---

## The Core Problem: Platforms as a Product

Platform teams often think they're building infrastructure. They're not. They're building a product whose customers are internal developers. And product success requires:

1. **Understanding the customer** (what does a dev actually struggle with?)
2. **Reducing friction** (not adding it with mandatory tickets and approvals)
3. **Measuring adoption** (not "we deployed it" but "devs actually use it")

The most common failure mode: a platform team builds what *they* think developers need, based on their own infrastructure perspective — not what developers actually find painful.

---

## The Golden Path Framework

The "golden path" concept, popularized by Spotify's engineering culture, is the right mental model:

> A golden path is an opinionated, well-lit path that gets you from "I have an idea" to "it's running in production" with minimal friction. It's not a mandatory railroad. It's a recommendation that's easy enough to follow that most people choose it voluntarily.

### What a Golden Path Includes

```
┌─────────────────────────────────────────────────────────────────┐
│                         Golden Path                              │
│                                                                  │
│  Code Template ──► CI Pipeline ──► Container Build ──► Deploy   │
│      │                 │                 │               │       │
│   (scaffolding)    (testing,          (scanning,      (canary,  │
│                    linting,           signing,         rollback) │
│                    SAST)              SBOM)                      │
│                                                                  │
│  All preconfigured. One command to start. Zero config to deploy. │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture: The Modern IDP Stack

A practical IDP in 2026 typically combines:

### 1. Developer Portal — Backstage (or Alternatives)

Backstage remains the dominant open-source portal, though commercial alternatives (Port, Cortex, OpsLevel) have matured significantly.

```yaml
# backstage/catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payments-service
  description: Core payment processing service
  annotations:
    github.com/project-slug: myorg/payments-service
    grafana/dashboard-selector: "payments"
    pagerduty.com/service-id: "PXXXXXX"
    sonarqube.org/project-key: "payments-service"
  tags:
    - java
    - payments
    - tier-1
spec:
  type: service
  lifecycle: production
  owner: group:payments-team
  system: financial-platform
  dependsOn:
    - component:user-service
    - resource:payments-database
  providesApis:
    - payments-api-v3
```

This single YAML file, committed alongside the code, automatically:
- Registers the service in the software catalog
- Links to dashboards, alerts, and on-call
- Tracks dependencies
- Shows code quality metrics

### 2. Self-Service with Crossplane

Crossplane lets you expose Kubernetes-native APIs for cloud resources:

```yaml
# A developer "orders" a database by applying this YAML
apiVersion: database.platform.company.com/v1alpha1
kind: PostgresInstance
metadata:
  name: my-service-db
  namespace: my-team
spec:
  parameters:
    storageGB: 20
    tier: standard          # Defined by platform team: maps to RDS db.t3.medium
    backupEnabled: true
    maintenanceWindow: "Sun:03:00-Sun:04:00"
  writeConnectionSecretToRef:
    name: my-service-db-credentials
```

The platform team defines what "standard tier" means (instance type, multi-AZ, backup policy). The developer just declares their intent. No tickets. No waiting.

### 3. Scaffolding with Backstage Software Templates

{% raw %}
```yaml
# backstage/templates/microservice/template.yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: microservice-java
  title: Java Microservice
  description: Create a production-ready Spring Boot microservice
  tags: [java, microservice, recommended]
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
        javaVersion:
          title: Java Version
          type: string
          default: "21"
          enum: ["21", "17"]
        includeDatabase:
          title: Include PostgreSQL?
          type: boolean
          default: false
  
  steps:
    - id: fetch
      name: Fetch Template
      action: fetch:template
      input:
        url: ./skeleton
        values:
          name: ${{ parameters.name }}
          javaVersion: ${{ parameters.javaVersion }}
    
    - id: create-repo
      name: Create GitHub Repository
      action: github:repo:create
      input:
        repoUrl: github.com?owner=myorg&repo=${{ parameters.name }}
    
    - id: register
      name: Register in Catalog
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps['create-repo'].output.repoContentsUrl }}
```
{% endraw %}

A developer fills in a form in the UI, clicks "Create," and gets:
- A new GitHub repository with standard structure
- Pre-configured CI/CD pipeline
- Grafana dashboard
- Runbook template
- Automatic catalog registration

Time from "I need a new service" to "first deployment": under 5 minutes.

---

## The Platform API Surface

Define your platform API carefully. The right level of abstraction:

```yaml
# Too low-level (forcing devs to know k8s internals):
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: app
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
        # ... 40 more lines of config

# Just right (developer expresses intent, platform handles details):
apiVersion: apps.platform.company.com/v1
kind: WebService
metadata:
  name: my-service
spec:
  image: myorg/my-service:v1.2.3
  tier: standard          # Platform maps this to appropriate k8s resources
  replicas: 2
  healthCheckPath: /healthz
  env:
    - name: DATABASE_URL
      valueFrom:
        secretRef: my-service-db-credentials
```

---

## Measuring Platform Success

**Don't measure:**
- "Number of services onboarded" (vanity metric)
- "Platform uptime" (baseline expectation, not success)

**Do measure:**

```
Developer Experience Metrics:
├── DORA Metrics (deployment frequency, lead time, MTTR, CFR)
├── Self-service rate: % of infra provisioned without tickets
├── Time-to-first-deployment: new service → prod in minutes
├── Platform NPS: quarterly survey of developer satisfaction
└── Cognitive load: survey "how much do you need to know about infra to deploy?"

Adoption Metrics:
├── Weekly active users of the developer portal
├── % of services using golden path templates
├── % of deployments using platform CI/CD
└── Support ticket reduction rate
```

---

## Common Anti-Patterns to Avoid

### 1. The Mandatory Tax
Making the platform mandatory before it's better than the alternative. Developers will route around you if you force them into something that slows them down.

**Fix:** Make the golden path so good that developers *choose* it. Mandate it only when it's clearly better.

### 2. The Feature Factory
Building features based on platform team assumptions instead of developer requests.

**Fix:** Embed platform engineers in product teams for 1-2 months per year. You'll learn more about actual pain than any survey.

### 3. The Abstraction Ceiling
Building abstractions that work for 90% of cases but make the 10% edge cases impossible.

**Fix:** Always provide an "escape hatch" to the raw underlying platform. The golden path should be the easy path, not the only path.

### 4. The Documentation Debt
Building great tools with no documentation.

**Fix:** Treat docs as a first-class deliverable. A feature that isn't documented doesn't exist.

---

## Getting Started: A 90-Day Roadmap

**Days 1-30: Listen and Learn**
- Interview 15+ developers across teams
- Map their current deployment journey
- Identify the top 3 pain points
- Define success metrics

**Days 31-60: Build the MVP**
- Implement ONE golden path end-to-end
- Launch Backstage (or chosen portal) with basic catalog
- Set up self-service for the #1 pain point

**Days 61-90: Iterate and Measure**
- Measure adoption
- Run NPS survey
- Fix the sharp edges
- Document everything

---

## Key Takeaways

- Platform engineering is product engineering — treat developers as customers
- Golden paths work because they're easy to choose, not mandatory
- Self-service (Crossplane, Backstage templates) eliminates ticket-driven bottlenecks
- Measure developer experience metrics, not infrastructure metrics
- Avoid over-engineering abstractions — always provide escape hatches

The best IDP is the one developers actually use. Build for them, not for your architecture diagrams.

![Developer Experience](https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&auto=format&fit=crop)
*Photo by [Annie Spratt](https://unsplash.com/@anniespratt) on Unsplash*
