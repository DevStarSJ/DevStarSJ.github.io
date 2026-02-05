---
layout: post
title: "Kubernetes Cost Optimization: 7 Strategies That Actually Work"
subtitle: "Stop overpaying for cloud resources without sacrificing performance"
date: 2026-02-05
author: "Dev Star"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1920&q=80"
tags: [Kubernetes, Cloud, DevOps, Cost Optimization, FinOps]
---

Running Kubernetes in production is expensive. Most teams overprovision by **40-60%** because they fear outages more than wasted money. But there's a better way.

![Cloud Cost](https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

Here are seven strategies that have saved real teams real money—without compromising reliability.

## 1. Right-Size Your Resource Requests

The biggest cost driver isn't what you use—it's what you **request**.

```yaml
# Before: Guessing
resources:
  requests:
    cpu: "1000m"
    memory: "2Gi"

# After: Based on actual usage
resources:
  requests:
    cpu: "250m"
    memory: "512Mi"
```

**Tools to measure actual usage:**
- Kubernetes Metrics Server
- Prometheus + Grafana
- [Goldilocks](https://github.com/FairwindsOps/goldilocks) (auto-recommends based on VPA)

## 2. Use Spot/Preemptible Instances (Wisely)

Spot instances cost **60-90% less** than on-demand. The catch? They can be terminated anytime.

```yaml
# Node affinity for spot-tolerant workloads
affinity:
  nodeAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        preference:
          matchExpressions:
            - key: kubernetes.io/lifecycle
              operator: In
              values: ["spot"]
```

**Good for spot:**
- Batch jobs
- Stateless services with replicas > 2
- Dev/staging environments

**Bad for spot:**
- Databases
- Single-replica services
- Stateful workloads

## 3. Implement Cluster Autoscaler + Pod Disruption Budgets

Scale down aggressively, but safely:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api
```

Configure the autoscaler to scale down faster:

```yaml
# cluster-autoscaler config
scale-down-delay-after-add: 5m
scale-down-unneeded-time: 5m
scale-down-utilization-threshold: 0.5
```

## 4. Namespace Resource Quotas

Prevent teams from accidentally spinning up massive workloads:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: team-alpha
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
```

![Resource Management](https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80)
*Photo by [Carlos Muza](https://unsplash.com/@kmuza) on Unsplash*

## 5. Scheduled Scaling for Non-Production

Dev and staging don't need to run 24/7:

```yaml
# Using KEDA for scheduled scaling
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: staging-scaler
spec:
  scaleTargetRef:
    name: staging-deployment
  triggers:
    - type: cron
      metadata:
        timezone: Asia/Seoul
        start: "0 9 * * 1-5"   # Scale up 9 AM weekdays
        end: "0 19 * * 1-5"   # Scale down 7 PM
        desiredReplicas: "3"
```

## 6. Use Karpenter (If You're on AWS)

Karpenter is smarter than Cluster Autoscaler:

- Provisions optimal instance types automatically
- Consolidates workloads to reduce node count
- Responds faster to scaling needs

```yaml
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
          values: ["spot", "on-demand"]
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64", "arm64"]
  disruption:
    consolidationPolicy: WhenUnderutilized
```

## 7. Monitor with Kubecost or OpenCost

You can't optimize what you don't measure:

```bash
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --set prometheus.enabled=false \
  --set prometheus.server.external.enabled=true
```

Key metrics to track:
- **Cost per namespace/team**
- **Idle resources** (requested but unused)
- **Efficiency score** (usage / request)

## Quick Wins Checklist

| Action | Potential Savings |
|--------|-------------------|
| Right-size requests | 20-40% |
| Spot instances for batch | 60-90% |
| Scale down non-prod at night | 50%+ |
| Delete unused PVCs | 10-20% |
| Use ARM instances | 20-30% |

## The Bottom Line

Cost optimization isn't a one-time project—it's a culture. Set up dashboards, establish quotas, and make cost a first-class metric alongside latency and availability.

Your CFO will thank you.

---

*For more cloud optimization tips, check out the [FinOps Foundation](https://www.finops.org/) resources.*
