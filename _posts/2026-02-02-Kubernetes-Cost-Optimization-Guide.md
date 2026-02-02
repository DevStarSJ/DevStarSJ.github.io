---
layout: post
title: "Kubernetes Cost Optimization: 7 Proven Strategies to Cut Cloud Spending by 50%"
description: "Learn practical Kubernetes cost optimization techniques including right-sizing, spot instances, autoscaling, and resource quotas. Reduce your K8s cloud bill significantly."
category: DevOps
tags: [kubernetes, cloud, cost-optimization, devops, aws, gcp, azure]
date: 2026-02-02
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200"
---

# Kubernetes Cost Optimization: 7 Proven Strategies to Cut Cloud Spending by 50%

Running Kubernetes in production is powerful—but expensive. The average organization wastes **30-40% of their cloud budget** on idle or over-provisioned resources. Here's how to fix that.

![Cloud Infrastructure](https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

## The Hidden Cost of Kubernetes

Before diving into solutions, let's understand where money disappears:

- **Over-provisioned pods**: Requesting 2GB RAM when using 200MB
- **Idle resources**: Dev clusters running 24/7
- **Unused persistent volumes**: Orphaned PVCs eating storage costs
- **Inefficient autoscaling**: Scaling too aggressively or too slowly

## Strategy 1: Right-Size Your Workloads

The biggest win. Most teams set resource requests based on guesses, not data.

### Use Vertical Pod Autoscaler (VPA) for Recommendations

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  updatePolicy:
    updateMode: "Off"  # Just get recommendations first
```

Check recommendations:

```bash
kubectl describe vpa my-app-vpa
```

### Tools for Right-Sizing

- **Kubecost**: Free tier available, shows cost by namespace/deployment
- **Goldilocks**: Open-source VPA dashboard
- **AWS Compute Optimizer**: If running EKS

## Strategy 2: Leverage Spot/Preemptible Instances

Spot instances cost **60-90% less** than on-demand. Perfect for:

- Batch processing
- CI/CD runners
- Stateless workloads
- Dev/staging environments

### Implementation with Node Affinity

```yaml
affinity:
  nodeAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      preference:
        matchExpressions:
        - key: kubernetes.io/os
          operator: In
          values:
          - linux
        - key: node.kubernetes.io/lifecycle
          operator: In
          values:
          - spot
```

### Handle Spot Interruptions

Use **AWS Node Termination Handler** or **Karpenter** to gracefully drain nodes before termination.

![Server Infrastructure](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800)
*Photo by [Taylor Vick](https://unsplash.com/@tvick) on Unsplash*

## Strategy 3: Implement Cluster Autoscaler Properly

Default autoscaler settings are conservative. Tune them:

```yaml
# cluster-autoscaler deployment args
- --scale-down-delay-after-add=5m      # Default 10m
- --scale-down-unneeded-time=5m        # Default 10m
- --scale-down-utilization-threshold=0.5
- --skip-nodes-with-local-storage=false
```

### Consider Karpenter (AWS)

Karpenter is faster and smarter than Cluster Autoscaler:

- Provisions nodes in seconds, not minutes
- Automatically selects optimal instance types
- Better bin-packing

## Strategy 4: Schedule Non-Production Workloads

Dev and staging don't need to run at 3 AM.

### Using Kube-downscaler

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  annotations:
    downscaler/uptime: "Mon-Fri 08:00-20:00 Asia/Seoul"
```

### Savings Potential

- 8 hours/day × 5 days = 40 hours running
- vs 168 hours/week
- **76% savings** on dev/staging

## Strategy 5: Use Resource Quotas and Limit Ranges

Prevent teams from over-requesting:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: team-a
spec:
  limits:
  - default:
      memory: 512Mi
      cpu: 500m
    defaultRequest:
      memory: 256Mi
      cpu: 100m
    type: Container
```

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: team-a
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
```

## Strategy 6: Optimize Persistent Storage

Storage costs sneak up on you.

### Clean Up Orphaned PVCs

```bash
# Find unbound PVCs
kubectl get pvc --all-namespaces | grep -v Bound

# Find PVs without claims
kubectl get pv | grep Released
```

### Use Appropriate Storage Classes

| Workload | Storage Type | Cost |
|----------|-------------|------|
| Databases | SSD (gp3) | $$ |
| Logs | HDD (st1) | $ |
| Temp data | Local SSD | $ |
| Archives | S3/GCS | ¢ |

## Strategy 7: Monitor and Set Budgets

You can't optimize what you don't measure.

### Kubecost Setup

```bash
helm install kubecost cost-analyzer \
  --repo https://kubecost.github.io/cost-analyzer/ \
  --namespace kubecost \
  --create-namespace
```

### Set Cloud Provider Budgets

Create alerts at 50%, 80%, and 100% of expected spend. Don't wait for the bill.

## Quick Wins Checklist

- [ ] Enable VPA in recommendation mode
- [ ] Move CI/CD to spot instances
- [ ] Schedule dev cluster downtime
- [ ] Set default resource limits
- [ ] Clean up orphaned PVCs
- [ ] Install Kubecost or similar
- [ ] Create budget alerts

## Expected Savings by Strategy

| Strategy | Effort | Savings |
|----------|--------|---------|
| Right-sizing | Medium | 20-30% |
| Spot instances | Medium | 30-40% |
| Autoscaler tuning | Low | 10-15% |
| Scheduling | Low | 15-25% |
| Resource quotas | Low | 10-20% |
| Storage optimization | Medium | 5-15% |

Combined, these strategies typically achieve **40-60% cost reduction**.

## Conclusion

Kubernetes cost optimization isn't a one-time project—it's an ongoing practice. Start with the quick wins (scheduling, autoscaler tuning), then tackle the bigger items (right-sizing, spot instances).

The goal isn't to minimize spending at all costs. It's to **maximize value per dollar spent**. Sometimes that means spending more on production reliability while aggressively cutting dev/staging costs.

Start measuring today. Your finance team will thank you.
