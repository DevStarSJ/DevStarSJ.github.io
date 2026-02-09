---
layout: post
title: "Kubernetes Cost Optimization: A FinOps Engineering Guide"
subtitle: "Cut your K8s bill by 40% without sacrificing reliability"
date: 2026-02-09
author: "Dev Star"
header-img: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1920&q=80"
tags: [Kubernetes, FinOps, Cost Optimization, Cloud, DevOps, AWS, GCP, Azure]
---

Kubernetes makes scaling easy. Too easy. Teams often overprovision by 3-5x without realizing it. This guide shows you how to find and eliminate waste.

![Cost analysis](https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80)
*Photo by [Carlos Muza](https://unsplash.com/@kmuza) on Unsplash*

## The Typical Kubernetes Waste Pattern

Most clusters look like this:

```
Requested CPU:  1000 cores
Actually Used:   200 cores  ← 80% waste

Requested RAM:  2000 GB
Actually Used:   600 GB    ← 70% waste
```

Why? Developers request resources based on fear, not data.

## Step 1: Measure Everything

You can't optimize what you don't measure. Install cost visibility:

### Option A: Kubecost (Open Source)
```bash
helm install kubecost cost-analyzer \
  --repo https://kubecost.github.io/cost-analyzer/ \
  --namespace kubecost --create-namespace
```

### Option B: OpenCost (CNCF)
```bash
helm install opencost opencost \
  --repo https://opencost.github.io/opencost-helm-chart \
  --namespace opencost --create-namespace
```

![Dashboard](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80)
*Photo by [Luke Chesser](https://unsplash.com/@lukechesser) on Unsplash*

## Step 2: Right-Size Requests and Limits

### Find Over-Provisioned Workloads
```bash
# Using kubectl-view-allocations plugin
kubectl view-allocations -u

# Or query Prometheus directly
# CPU: requested vs used
sum(kube_pod_container_resource_requests{resource="cpu"}) by (namespace)
/
sum(rate(container_cpu_usage_seconds_total[5m])) by (namespace)
```

### Apply Recommendations
```yaml
# Before: Developer's guess
resources:
  requests:
    cpu: "2"
    memory: "4Gi"
  limits:
    cpu: "4"
    memory: "8Gi"

# After: Based on P95 usage + 20% buffer
resources:
  requests:
    cpu: "200m"
    memory: "512Mi"
  limits:
    cpu: "500m"
    memory: "1Gi"
```

### Automate with VPA
Vertical Pod Autoscaler adjusts resources automatically:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  updatePolicy:
    updateMode: "Auto"  # or "Off" for recommendations only
  resourcePolicy:
    containerPolicies:
    - containerName: "*"
      minAllowed:
        cpu: "50m"
        memory: "64Mi"
      maxAllowed:
        cpu: "2"
        memory: "4Gi"
```

## Step 3: Use Spot/Preemptible Nodes

Spot instances cost 60-90% less. Use them for:
- Stateless workloads
- Batch jobs
- Dev/staging environments

### Node Pool Setup (GKE)
```yaml
apiVersion: container.google.com/v1
kind: NodePool
spec:
  config:
    spot: true
  autoscaling:
    enabled: true
    minNodeCount: 0
    maxNodeCount: 10
```

### Workload Tolerations
```yaml
spec:
  tolerations:
  - key: "kubernetes.azure.com/scalesetpriority"
    operator: "Equal"
    value: "spot"
    effect: "NoSchedule"
  affinity:
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        preference:
          matchExpressions:
          - key: "node.kubernetes.io/lifecycle"
            operator: "In"
            values: ["spot"]
```

## Step 4: Scale Down Non-Production

Dev and staging clusters don't need to run 24/7.

### Kube-downscaler
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    # Scale to 0 outside business hours
    downscaler/downtime: "Mon-Fri 20:00-08:00 UTC, Sat-Sun 00:00-24:00 UTC"
```

### Cluster Auto-Sleep
```bash
# Scale all deployments to 0 replicas
kubectl get deploy -A -o name | xargs -I {} kubectl scale {} --replicas=0

# Or use a CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-down-dev
spec:
  schedule: "0 20 * * 1-5"  # 8 PM weekdays
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: kubectl
            image: bitnami/kubectl
            command:
            - /bin/sh
            - -c
            - kubectl scale deploy --all --replicas=0 -n dev
```

## Step 5: Optimize Storage

### Delete Orphaned PVCs
```bash
# Find unbound PVCs
kubectl get pvc -A | grep -v Bound

# Find PVs without claims
kubectl get pv | grep Released
```

### Use Appropriate Storage Classes
```yaml
# Don't use SSD for logs
kind: PersistentVolumeClaim
spec:
  storageClassName: standard  # Not premium-ssd
  resources:
    requests:
      storage: 100Gi
```

### Enable Storage Auto-Expansion
```yaml
allowVolumeExpansion: true  # In StorageClass
```

## Step 6: Network Cost Reduction

Cross-AZ traffic is expensive. Keep pods close:

```yaml
spec:
  affinity:
    podAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: database
          topologyKey: topology.kubernetes.io/zone
```

## Cost Monitoring Queries

### Prometheus/Grafana Alerts
```yaml
# Alert if namespace cost exceeds budget
- alert: NamespaceCostOverBudget
  expr: |
    sum(
      container_memory_working_set_bytes{namespace="production"} 
      * on(node) group_left() node_ram_hourly_cost
    ) > 1000  # $1000/hour threshold
  for: 1h
  labels:
    severity: warning
```

### Daily Cost Report
```sql
-- Kubecost SQL query
SELECT 
  namespace,
  SUM(cpu_cost + ram_cost + pv_cost + network_cost) as total_cost
FROM allocations
WHERE window_start >= NOW() - INTERVAL '24 hours'
GROUP BY namespace
ORDER BY total_cost DESC
LIMIT 10;
```

## Quick Wins Summary

| Action | Effort | Savings |
|--------|--------|---------|
| Right-size requests | Medium | 20-40% |
| Spot nodes for stateless | Low | 30-60% |
| Scale down non-prod | Low | 50-70% |
| Delete orphaned resources | Low | 5-10% |
| Pod topology awareness | Medium | 10-20% |

## Tools Comparison

| Tool | Type | Best For |
|------|------|----------|
| Kubecost | Full platform | Enterprise visibility |
| OpenCost | Open source | Cost allocation |
| Goldilocks | VPA helper | Right-sizing |
| kube-downscaler | Scheduler | Non-prod savings |
| CAST AI | Automation | Hands-off optimization |

## Action Plan

1. **Week 1**: Install Kubecost/OpenCost, get baseline
2. **Week 2**: Apply VPA recommendations to top 10 workloads
3. **Week 3**: Add spot nodes, migrate stateless workloads
4. **Week 4**: Set up non-prod downscaling
5. **Ongoing**: Monthly cost reviews, budget alerts

---

*The goal isn't minimum cost—it's efficient cost. Pay for what you use, and use what you pay for.*
