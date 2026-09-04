---
layout: post
title: "Kubernetes Cost Optimization: Cutting Your Cloud Bill Without Cutting Corners"
subtitle: "Practical strategies to reduce Kubernetes infrastructure costs by 30-60% while maintaining reliability and performance"
date: 2026-05-08 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - Kubernetes
  - Cloud Cost
  - FinOps
  - DevOps
  - AWS
  - GKE
---

# Kubernetes Cost Optimization: Cutting Your Cloud Bill Without Cutting Corners

Kubernetes is phenomenal at abstracting away infrastructure. It's also phenomenal at running up your cloud bill.

The average Kubernetes-powered organization wastes 30-45% of their cloud spend. Not because Kubernetes is inefficient — because teams don't configure it well for cost. The defaults optimize for simplicity, not cost. Over-provisioned nodes, idle replicas, oversized requests, forgotten staging clusters still running on Friday afternoon — it adds up fast.

This post is the practical guide to finding and eliminating that waste.

![Cloud infrastructure diagram](https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=900&auto=format&fit=crop)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

---

## Step 1: Know Where Your Money Is Going

You can't optimize what you can't measure. Before changing anything, get visibility.

### Kubecost (or OpenCost)

OpenCost is the CNCF-incubating open standard for Kubernetes cost measurement. Kubecost builds on it with a production-grade UI.

```bash
helm install kubecost cost-analyzer \
  --repo https://kubecost.github.io/cost-analyzer/ \
  --namespace kubecost --create-namespace \
  --set kubecostToken="your-token"
```

Within hours, you'll have cost breakdown by namespace, deployment, label, and team. The most common finding: 20% of workloads account for 80% of cost.

### Cloud Native FinOps Labels

Establish a labeling taxonomy before you go further. Cost allocation is only useful if you can attribute costs to teams and products.

```yaml
metadata:
  labels:
    team: platform-engineering
    product: api-gateway
    environment: production
    cost-center: "1234"
```

---

## Step 2: Fix Resource Requests and Limits

This is the highest-leverage change most teams can make.

**The problem:** Teams set requests based on peaks or guesses, not actual usage. Kubernetes schedules pods based on requests, so over-requesting means nodes fill up with "reserved" capacity that's never actually used.

**Typical findings from VPA analysis:**
- CPU requests 3-5x higher than actual usage
- Memory requests 2-3x higher than P99 usage

### Use Vertical Pod Autoscaler (VPA) in Recommendation Mode

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-app-vpa
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: my-app
  updatePolicy:
    updateMode: "Off"  # Recommendation only — don't auto-apply yet
```

```bash
# See recommendations after a week of data
kubectl describe vpa my-app-vpa

# Output shows:
# Container: app
#   Recommended:
#     Lower Bound: cpu: 50m, memory: 128Mi
#     Target:      cpu: 100m, memory: 256Mi
#     Upper Bound: cpu: 500m, memory: 512Mi
#
# Your current request: cpu: 2000m, memory: 2Gi  ← 20x over-provisioned
```

Right-size based on recommendations. This alone commonly reduces cluster resource consumption by 40-60%.

---

## Step 3: Horizontal Pod Autoscaler Tuning

The default HPA scales on CPU utilization at 50% target. For most applications, this is too conservative.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Increased from default 50
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # Don't scale down too aggressively
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

For web services with predictable traffic patterns, consider **KEDA (Kubernetes Event Driven Autoscaling)** for scaling based on queue depth, request rate, or custom metrics rather than just CPU.

---

## Step 4: Cluster Autoscaler and Node Selection

### Use Spot/Preemptible Instances

Spot instances (AWS), Preemptible VMs (GCP), and Spot VMs (Azure) offer 60-90% discount over on-demand pricing. The catch: they can be terminated with ~2 minutes notice.

Architecture for spot tolerance:
- Run stateless workloads on spot nodes
- Graceful shutdown handling with `preStop` hooks and `terminationGracePeriodSeconds`
- Never run databases or stateful workloads on spot

```yaml
# Node selector for spot instances
spec:
  nodeSelector:
    node.kubernetes.io/lifecycle: spot
  tolerations:
  - key: "kubernetes.azure.com/scalesetpriority"
    operator: "Equal"
    value: "spot"
    effect: "NoSchedule"
```

For AWS: **Karpenter** has replaced the Cluster Autoscaler as the recommendation for node provisioning. It provisions nodes in seconds (not minutes), selects optimal instance types automatically, and handles spot fallback gracefully.

```yaml
# Karpenter NodePool — automatically chooses cheapest compatible instance
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
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 1m
```

### ARM64 / Graviton Instances

AWS Graviton (arm64) instances offer 20-40% better price/performance than x86 equivalents. Most containerized workloads run on arm64 without code changes.

```yaml
spec:
  nodeSelector:
    kubernetes.io/arch: arm64
```

---

## Step 5: Namespace-Level Policies

### Resource Quotas

Prevent any single team from accidentally consuming unbounded cluster resources.

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: team-alpha
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
    count/pods: "50"
```

### LimitRange

Set default requests/limits for pods that don't specify them. This prevents un-configured pods from consuming unlimited resources.

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: team-alpha
spec:
  limits:
  - default:
      cpu: "500m"
      memory: "256Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
    type: Container
```

---

## Step 6: Kill Idle Resources

**Environments that run 24/7 when they should run 8/5:**
- Dev clusters running on weekends
- Staging environments idle overnight

```bash
# Scale down non-production workloads outside business hours
# Using Kubernetes CronJob or external scheduler

# Scale down
kubectl scale deployment --all --replicas=0 -n staging

# Scale up
kubectl scale deployment --all --replicas=1 -n staging
```

Or use **Kube Downscaler** — annotate deployments with their schedule:

```yaml
metadata:
  annotations:
    downscaler/uptime: "Mon-Fri 08:00-20:00 Asia/Seoul"
```

---

## Step 7: Storage Cost Reduction

Persistent Volume claims are often forgotten. Teams delete applications but leave PVCs (and their associated cloud disks) running.

```bash
# Find unbound PVCs — likely orphaned
kubectl get pvc --all-namespaces | grep -v Bound

# Find PVs in Released state (disk exists but no claim)
kubectl get pv | grep Released
```

Set up regular audits. In large clusters, orphaned storage can add up to hundreds of dollars monthly.

---

## The Cost Optimization Roadmap

| Priority | Action | Typical Savings |
|----------|--------|-----------------|
| 1 | Right-size resource requests (VPA) | 30-50% |
| 2 | Enable spot/preemptible instances | 40-70% of node costs |
| 3 | Fix HPA targets | 10-20% |
| 4 | Kill idle environments (nights/weekends) | 30-60% on non-prod |
| 5 | ARM64 migration | 20-40% on affected nodes |
| 6 | Audit orphaned storage | 5-15% |

---

## Conclusion

Kubernetes cost optimization isn't one big fix — it's a collection of incremental improvements that compound. Teams that implement these strategies systematically typically reduce cloud spend by 35-55% without impacting reliability.

The foundational principle: measure first. Kubecost or OpenCost will show you exactly where money is going. From there, the optimizations follow logically.

The cloud bill doesn't have to be a mystery. Make it a managed metric like any other engineering KPI.

---

*References:*
- *[Kubecost Documentation](https://www.kubecost.com/)*
- *[OpenCost CNCF Project](https://www.opencost.io/)*
- *[Karpenter Documentation](https://karpenter.sh/)*
- *[Vertical Pod Autoscaler](https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler)*
