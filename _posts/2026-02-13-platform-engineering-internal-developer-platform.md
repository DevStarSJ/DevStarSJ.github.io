---
layout: post
title: "Platform Engineering: Building Internal Developer Platforms That Actually Get Used"
subtitle: "Design principles and implementation patterns for creating developer platforms that boost productivity"
date: 2026-02-13
author: "Dev Star"
header-img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200"
tags: [Platform Engineering, DevOps, Internal Developer Platform, Backstage, Developer Experience]
---

# Platform Engineering: Building Internal Developer Platforms That Actually Get Used

Platform Engineering has emerged as the answer to DevOps complexity. Instead of expecting every developer to be a Kubernetes expert, platform teams build golden paths that make the right way the easy way.

![Team Collaboration](https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800)
*Photo by [Annie Spratt](https://unsplash.com/@anniespratt) on Unsplash*

## The Platform Engineering Manifesto

**Developer Experience is the Product**: If developers don't use it, it doesn't matter how technically elegant it is.

**Golden Paths, Not Golden Cages**: Provide paved roads with escape hatches.

**Self-Service Everything**: No tickets for provisioning resources.

**Measure What Matters**: Track adoption, not just availability.

## Platform Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Portal                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Service Catalog │ Docs │ Templates │ APIs │ Scorecards │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                    Platform APIs
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Platform Services                         │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────────┐  │
│  │ Compute   │ │ Database  │ │ Secrets   │ │ Observability│  │
│  │ Provisioner│ │ Provisioner│ │ Manager   │ │ Stack       │  │
│  └───────────┘ └───────────┘ └───────────┘ └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                    Infrastructure APIs
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                      │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────────┐  │
│  │ Kubernetes│ │ Cloud     │ │ Terraform │ │ Service     │  │
│  │ Clusters  │ │ Services  │ │ State     │ │ Mesh        │  │
│  └───────────┘ └───────────┘ └───────────┘ └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Developer Portal with Backstage

### Setting Up Backstage

```bash
npx @backstage/create-app@latest
cd my-backstage-app
yarn dev
```

### Defining Service Templates

{% raw %}
```yaml
# templates/microservice/template.yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: microservice-template
  title: Production Microservice
  description: Create a production-ready microservice with all the bells and whistles
  tags:
    - recommended
    - microservice
spec:
  owner: platform-team
  type: service
  
  parameters:
    - title: Service Information
      required:
        - name
        - team
      properties:
        name:
          title: Service Name
          type: string
          pattern: '^[a-z][a-z0-9-]*$'
          description: Lowercase letters, numbers, and dashes only
        team:
          title: Owning Team
          type: string
          ui:field: OwnerPicker
          ui:options:
            catalogFilter:
              kind: Group
        description:
          title: Description
          type: string
    
    - title: Technical Specifications
      properties:
        language:
          title: Programming Language
          type: string
          enum: ['go', 'python', 'typescript', 'rust']
          default: 'go'
        database:
          title: Database
          type: string
          enum: ['none', 'postgresql', 'mysql', 'mongodb']
          default: 'none'
        hasPublicAPI:
          title: Expose Public API
          type: boolean
          default: false
  
  steps:
    - id: fetch-template
      name: Fetch Template
      action: fetch:template
      input:
        url: ./skeleton
        values:
          name: ${{ parameters.name }}
          team: ${{ parameters.team }}
          language: ${{ parameters.language }}
          database: ${{ parameters.database }}
    
    - id: create-repo
      name: Create Repository
      action: publish:github
      input:
        repoUrl: github.com?owner=myorg&repo=${{ parameters.name }}
        defaultBranch: main
        protectDefaultBranch: true
    
    - id: register-component
      name: Register in Catalog
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps['create-repo'].output.repoContentsUrl }}
        catalogInfoPath: '/catalog-info.yaml'
    
    - id: create-argocd-app
      name: Setup GitOps
      action: argocd:create-resources
      input:
        appName: ${{ parameters.name }}
        repoUrl: ${{ steps['create-repo'].output.remoteUrl }}
        path: k8s/
  
  output:
    links:
      - title: Repository
        url: ${{ steps['create-repo'].output.remoteUrl }}
      - title: Service in Catalog
        icon: catalog
        entityRef: ${{ steps['register-component'].output.entityRef }}
```
{% endraw %}

### Service Catalog Entry

```yaml
# catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-service
  description: Handles payment processing
  annotations:
    github.com/project-slug: myorg/payment-service
    backstage.io/techdocs-ref: dir:.
    argocd/app-name: payment-service
    prometheus.io/scrape-port: '8080'
  tags:
    - python
    - payments
  links:
    - url: https://payment-service.internal.example.com
      title: Internal API
      icon: dashboard
spec:
  type: service
  lifecycle: production
  owner: payments-team
  system: checkout
  providesApis:
    - payment-api
  consumesApis:
    - user-api
    - notification-api
  dependsOn:
    - resource:default/payments-db
```

![Dashboard Analytics](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800)
*Photo by [Luke Chesser](https://unsplash.com/@lukechesser) on Unsplash*

## Self-Service Infrastructure

### Crossplane for Infrastructure Abstraction

Define your own APIs for infrastructure:

```yaml
# Definition: What a "Database" means in your platform
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: databases.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: Database
    plural: databases
  versions:
    - name: v1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                size:
                  type: string
                  enum: ["small", "medium", "large"]
                  default: "small"
                engine:
                  type: string
                  enum: ["postgresql", "mysql"]
                  default: "postgresql"
                highAvailability:
                  type: boolean
                  default: false
              required:
                - size
                - engine
```

Composition - how it's actually implemented:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: database-aws
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1
    kind: Database
  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.crossplane.io/v1beta1
        kind: DBInstance
        spec:
          forProvider:
            engine: postgresql
            engineVersion: "15"
            dbInstanceClass: db.t3.micro
            allocatedStorage: 20
            publiclyAccessible: false
            skipFinalSnapshot: true
          providerConfigRef:
            name: aws-provider
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.size
          toFieldPath: spec.forProvider.dbInstanceClass
          transforms:
            - type: map
              map:
                small: db.t3.micro
                medium: db.t3.medium
                large: db.r5.large
        - type: FromCompositeFieldPath
          fromFieldPath: spec.highAvailability
          toFieldPath: spec.forProvider.multiAZ
```

Developers just create:

```yaml
apiVersion: platform.example.com/v1
kind: Database
metadata:
  name: orders-db
  namespace: orders-team
spec:
  size: medium
  engine: postgresql
  highAvailability: true
```

## Golden Paths with Scaffolding

### Helm Chart Templates

```yaml
# charts/service/values.yaml
# Sensible defaults - developers override only what they need
replicaCount: 2

image:
  repository: ""  # Required
  tag: "latest"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8080

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilization: 70

# Platform team manages these - developers don't touch
observability:
  metrics:
    enabled: true
    port: 9090
  tracing:
    enabled: true
    samplingRate: 0.1

security:
  networkPolicy:
    enabled: true
  podSecurityContext:
    runAsNonRoot: true
    readOnlyRootFilesystem: true
```

## Developer Experience Metrics

### DORA Metrics Dashboard

```yaml
# Grafana dashboard config
apiVersion: v1
kind: ConfigMap
metadata:
  name: dora-metrics-dashboard
data:
  dashboard.json: |
    {
      "title": "DORA Metrics",
      "panels": [
        {
          "title": "Deployment Frequency",
          "targets": [{
            "expr": "sum(increase(deployments_total[7d])) by (team)"
          }]
        },
        {
          "title": "Lead Time for Changes",
          "targets": [{
            "expr": "histogram_quantile(0.50, sum(rate(lead_time_seconds_bucket[7d])) by (le, team))"
          }]
        },
        {
          "title": "Change Failure Rate",
          "targets": [{
            "expr": "sum(deployments_failed_total) / sum(deployments_total) * 100"
          }]
        },
        {
          "title": "Mean Time to Recovery",
          "targets": [{
            "expr": "avg(incident_recovery_time_seconds) by (team)"
          }]
        }
      ]
    }
```

### Platform Adoption Tracking

```python
# Track platform adoption metrics
from prometheus_client import Counter, Histogram, Gauge

# Track template usage
template_usage = Counter(
    'platform_template_usage_total',
    'Number of times each template is used',
    ['template_name', 'team']
)

# Track self-service vs ticket
provisioning_method = Counter(
    'platform_provisioning_method_total',
    'How resources are provisioned',
    ['resource_type', 'method']  # method: self-service, ticket
)

# Track time to first deployment
time_to_first_deploy = Histogram(
    'platform_time_to_first_deploy_seconds',
    'Time from repo creation to first deployment',
    ['team', 'template']
)

# Track developer satisfaction
developer_satisfaction = Gauge(
    'platform_developer_satisfaction_score',
    'NPS score from developer surveys',
    ['team']
)
```

## Platform Team Structure

| Role | Responsibilities |
|------|------------------|
| Platform Product Manager | Roadmap, prioritization, stakeholder communication |
| Platform Engineers | Build and maintain platform components |
| Developer Advocates | Adoption, documentation, training |
| SRE | Reliability, incident response, capacity planning |

## Implementation Roadmap

### Phase 1: Foundation (Months 1-3)
- Deploy Backstage
- Create 2-3 service templates
- Implement basic self-service compute

### Phase 2: Expansion (Months 4-6)
- Add database provisioning
- Implement secrets management
- Build observability stack

### Phase 3: Optimization (Months 7-12)
- Service scorecards
- Cost attribution
- Advanced automation

## Common Pitfalls

1. **Building Without Listening**: Survey developers first
2. **Too Much Too Soon**: Start small, iterate
3. **No Escape Hatches**: Golden paths, not golden cages
4. **Ignoring Adoption**: Track and optimize for usage
5. **Platform as Cost Center**: Measure productivity gains

## Conclusion

Platform Engineering is about removing friction from software delivery. Focus on developer experience, measure adoption, and iterate continuously. The best platform is one developers actually want to use.

---

*Building an internal platform? Share your experiences in the comments!*
