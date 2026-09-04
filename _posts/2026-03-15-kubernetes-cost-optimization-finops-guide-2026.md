---
layout: post
title: "Kubernetes Cost Optimization: From Cloud Bill Shock to FinOps Mastery"
subtitle: "Practical strategies to reduce Kubernetes infrastructure costs by 40-70% without sacrificing reliability"
date: 2026-03-15 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80"
categories: [Kubernetes, FinOps]
tags: [Kubernetes, FinOps, Cost-Optimization, Cloud, AWS, GCP, Azure, Spot-Instances, HPA, VPA]
---

## Introduction

You've built a beautiful Kubernetes platform. Your engineers love it, deployments are fast, and the system is reliable. Then the finance team calls.

The cloud bill arrived.

This is a story repeated at hundreds of companies every year. Kubernetes' abstraction layer makes it easy to request resources — and dangerously easy to over-provision them. The average Kubernetes cluster wastes **60-70% of its allocated compute**, according to CNCF's 2025 FinOps survey.

This post is a practical guide to eliminating that waste.

![Server infrastructure and data center overhead view](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&q=80)
*Photo by Taylor Vick on Unsplash*

---

## Understanding Where Your Money Goes

Before optimizing, you need to understand the problem. Most Kubernetes cost waste falls into three categories:

### 1. Over-provisioned Resource Requests

```yaml
# The classic developer mistake
resources:
  requests:
    memory: "4Gi"   # Actual usage: 400Mi
    cpu: "2000m"     # Actual usage: 50m
  limits:
    memory: "8Gi"
    cpu: "4000m"
```

When developers set requests conservatively (to avoid OOM kills), the scheduler over-provisions nodes. A node with 8 cores might only run 2 pods — each requesting 2 cores but using 50m.

### 2. Idle/Underutilized Workloads

Non-production environments (dev, staging, QA) often run 24/7 but are only used 8-10 hours a day. At $0.10/vCPU-hour, a 50-node staging cluster costs $3,600/day to run idle at night.

### 3. Unoptimized Node Selection

Choosing general-purpose on-demand instances for everything instead of:
- Spot/preemptible instances for fault-tolerant workloads
- Graviton/Arm instances for 20-40% price reduction
- Committed use discounts for baseline workloads

---

## Step 1: Visibility — You Can't Optimize What You Can't See

### OpenCost: Free, Open-Source Cost Attribution

OpenCost is the CNCF standard for Kubernetes cost allocation. It runs in your cluster and provides per-namespace, per-deployment, and per-pod cost data:

```bash
# Install OpenCost
helm install opencost opencost/opencost \
  --namespace opencost \
  --create-namespace \
  -f values.yaml
```

```yaml
# values.yaml
opencost:
  exporter:
    cloudProviderApiKey: ""  # Optional for on-prem pricing
  ui:
    enabled: true
  prometheus:
    external:
      enabled: true
      url: "http://prometheus:9090"
```

Access the dashboard to see exactly which teams and services are driving your bill.

### Goldilocks: Right-Sizing Recommendations

Goldilocks uses VPA (Vertical Pod Autoscaler) in recommendation mode to suggest better resource requests:

```bash
helm install goldilocks fairwinds/goldilocks \
  --namespace goldilocks \
  --create-namespace

# Label a namespace for analysis
kubectl label ns production goldilocks.fairwinds.com/enabled=true
```

Visit the Goldilocks dashboard to see actual vs. requested resources for every deployment, with recommended right-sized values.

---

## Step 2: Right-Size Your Resource Requests

### Vertical Pod Autoscaler (VPA)

VPA can automatically adjust resource requests based on actual usage:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-api
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-api
  updatePolicy:
    updateMode: "Auto"  # or "Initial" to only set on pod creation
  resourcePolicy:
    containerPolicies:
    - containerName: "*"
      minAllowed:
        cpu: 10m
        memory: 50Mi
      maxAllowed:
        cpu: 2000m
        memory: 2Gi
      controlledResources: ["cpu", "memory"]
```

⚠️ **Important**: VPA in `Auto` mode restarts pods to apply new values. Use `Initial` mode in production to avoid disruption, or pair with PodDisruptionBudgets.

### Manual Right-Sizing Script

If you prefer a manual approach, use kubectl-resource-capacity:

```bash
# Install
kubectl krew install resource-capacity

# Show actual vs requested
kubectl resource-capacity --util --pods --namespace production

# Example output:
# NODE               CPU REQUESTS  CPU LIMITS   CPU UTIL    MEM REQUESTS  MEM LIMITS   MEM UTIL
# node-1             1280m/4000m   2560m/4000m  89m/4000m   2Gi/8Gi       4Gi/8Gi      1.2Gi/8Gi
```

This reveals the gap between requests and actual usage — your optimization opportunity.

---

## Step 3: Autoscaling — Pay Only for What You Use

### Horizontal Pod Autoscaler (HPA)

The basics are well-known, but in 2026, HPA with KEDA (Kubernetes Event-Driven Autoscaling) is the standard for fine-grained scaling:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: my-api-scaler
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-api
  minReplicaCount: 1
  maxReplicaCount: 50
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: http_requests_per_second
      query: sum(rate(http_requests_total{service="my-api"}[2m]))
      threshold: "100"  # Scale when >100 req/s per replica
  - type: cron
    metadata:
      timezone: Asia/Seoul
      start: 0 9 * * 1-5   # Business hours: scale up at 9 AM weekdays
      end: 0 18 * * 1-5     # Scale down at 6 PM weekdays
      desiredReplicas: "10"
```

![Cloud infrastructure visualization in data center](https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=900&q=80)
*Photo by Taylor Vick on Unsplash*

### Cluster Autoscaler vs. Karpenter

For node-level scaling, **Karpenter** has largely replaced Cluster Autoscaler for AWS users:

```yaml
# Karpenter NodePool — diverse instance selection for cost optimization
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]  # Prefer spot
        - key: kubernetes.io/arch
          operator: In
          values: ["arm64", "amd64"]  # Include Graviton
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["c", "m", "r"]
        - key: karpenter.k8s.aws/instance-generation
          operator: Gt
          values: ["3"]
  disruption:
    consolidationPolicy: WhenUnderutilized
    consolidateAfter: 30s  # Aggressively consolidate idle nodes
  limits:
    cpu: 1000
    memory: 2000Gi
```

Karpenter's consolidation actively **removes underutilized nodes** — a feature Cluster Autoscaler handles poorly.

---

## Step 4: Spot/Preemptible Instances

The single highest-impact cost optimization is running fault-tolerant workloads on spot instances at 60-90% discount.

### Making Workloads Spot-Tolerant

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
spec:
  replicas: 10
  template:
    spec:
      # Tolerate spot instance interruption label
      tolerations:
      - key: "karpenter.sh/interruption"
        operator: "Exists"
        effect: "NoSchedule"
      # Prefer spot but fall back to on-demand
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: karpenter.sh/capacity-type
                operator: In
                values: ["spot"]
      # Graceful shutdown on spot interruption
      terminationGracePeriodSeconds: 120
      containers:
      - name: worker
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 10 && /app/graceful-shutdown"]
```

### Spot-Safe Workload Checklist

✅ Stateless (no local state)  
✅ Idempotent operations (safe to retry)  
✅ Handles SIGTERM gracefully  
✅ Multiple replicas with PodDisruptionBudget  
✅ Work can be checkpointed (for batch jobs)  

---

## Step 5: Non-Production Environment Scheduling

Staging and dev environments often account for 30-40% of total Kubernetes costs. Most of this runs overnight for no reason.

### KEDA Cron Scaling for Non-Production

```yaml
# Scale staging to zero outside business hours
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: staging-scaler
  namespace: staging
spec:
  scaleTargetRef:
    name: my-app
  minReplicaCount: 0  # Scale to zero!
  maxReplicaCount: 5
  triggers:
  - type: cron
    metadata:
      timezone: Asia/Seoul
      start: 0 9 * * 1-5
      end: 0 20 * * 1-5
      desiredReplicas: "3"
```

### Cluster Sleep Scripts

For full cluster scale-down (dev environments):

```bash
#!/bin/bash
# save-and-sleep.sh — run as a cron job at 8 PM weekdays
NAMESPACE="dev"

# Save current replica counts
kubectl get deployments -n $NAMESPACE \
  -o json | jq -r '.items[] | "\(.metadata.name)=\(.spec.replicas)"' \
  > /tmp/dev-replicas-$(date +%Y%m%d).txt

# Scale everything to zero
kubectl scale deployments --all --replicas=0 -n $NAMESPACE

echo "Dev environment scaled to zero. Saved state to /tmp/"
```

---

## Real-World Results

A B2B SaaS company (200-person startup) implemented these optimizations over 3 months:

| Optimization | Monthly Savings |
|---|---|
| Right-sized resource requests | $8,200 |
| Spot instances for workers | $14,500 |
| Non-prod environment scheduling | $6,800 |
| Karpenter consolidation | $4,100 |
| Reserved instances for baseline | $11,000 |
| **Total** | **$44,600/month** |

Their Kubernetes bill went from $89,000/month to $44,400/month — a **50% reduction** with no impact on production reliability.

---

## Building a FinOps Culture

Technical optimizations only stick if supported by process changes:

1. **Showback, then chargeback**: Show teams their costs before making them responsible
2. **Cost in PRs**: Tools like Infracost add estimated cost changes to pull requests
3. **Weekly cost reviews**: 15-minute review of top cost movers with engineering leads
4. **Budgets and alerts**: Set namespace-level budgets in OpenCost; alert on overruns
5. **Efficiency KPIs**: Track CPU efficiency (actual/requested) as a team metric

---

## Conclusion

Kubernetes cost optimization is not a one-time project — it's an ongoing practice. The tools and techniques in this post can realistically reduce your Kubernetes bill by 40-70%, but the real win is building a culture where every engineer thinks about resource efficiency.

Start with visibility (OpenCost + Goldilocks), address the quick wins (right-sizing and non-prod scheduling), then layer in advanced patterns (Karpenter + Spot + KEDA). The savings compound quickly.

---

## Resources

- [OpenCost Documentation](https://www.opencost.io/docs/)
- [KEDA Official Site](https://keda.sh/)
- [Karpenter Documentation](https://karpenter.sh/)
- [Goldilocks by Fairwinds](https://goldilocks.docs.fairwinds.com/)
- [FinOps Foundation Best Practices](https://www.finops.org/framework/practices/)
