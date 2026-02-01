---
layout: post
title: "Kubernetes Cost Optimization: 10 Strategies to Cut Your Cloud Bill in Half"
description: "Learn proven Kubernetes cost optimization techniques. Reduce cloud spending with right-sizing, spot instances, autoscaling, and resource management best practices."
category: devops
tags: [kubernetes, k8s, cloud, cost-optimization, devops, aws, gcp, azure]
date: 2026-02-01
read_time: 14
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200"
---

# Kubernetes Cost Optimization: 10 Strategies to Cut Your Cloud Bill in Half

Running Kubernetes in production is expensive. The average enterprise wastes **35-45% of their cloud budget** on over-provisioned resources. Here's how to stop the bleeding.

![Cloud Infrastructure](https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

## The Hidden Cost of Kubernetes

Before diving into solutions, let's understand the problem:

- **Over-provisioning**: Developers request 4 CPU cores, use 0.5
- **Zombie workloads**: Forgotten deployments running 24/7
- **Wrong instance types**: Using compute-optimized for memory-heavy apps
- **No autoscaling**: Fixed replicas regardless of traffic

A typical 100-node cluster can easily waste **$50,000-100,000/month**.

## Strategy 1: Right-Size Your Pods

The biggest waste comes from incorrect resource requests and limits.

### Analyze Current Usage

```bash
# Install metrics-server if not present
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Check actual vs requested resources
kubectl top pods --all-namespaces
```

### Use Vertical Pod Autoscaler (VPA)

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
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: '*'
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 4
        memory: 8Gi
```

**Impact**: Typically reduces resource waste by **40-60%**.

## Strategy 2: Implement Cluster Autoscaler

Stop paying for idle nodes.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    spec:
      containers:
      - name: cluster-autoscaler
        image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.28.0
        command:
        - ./cluster-autoscaler
        - --cloud-provider=aws
        - --scale-down-delay-after-add=10m
        - --scale-down-unneeded-time=5m
        - --skip-nodes-with-local-storage=false
```

### Key Settings

| Parameter | Recommended | Why |
|-----------|-------------|-----|
| scale-down-delay-after-add | 10m | Prevent thrashing |
| scale-down-unneeded-time | 5m | Quick response |
| max-node-provision-time | 15m | Fail fast |

![Server Room](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800)
*Photo by [Taylor Vick](https://unsplash.com/@tvick) on Unsplash*

## Strategy 3: Use Spot/Preemptible Instances

Spot instances cost **60-90% less** than on-demand.

### AWS Spot with Karpenter

```yaml
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: spot-provisioner
spec:
  requirements:
  - key: karpenter.sh/capacity-type
    operator: In
    values: ["spot", "on-demand"]
  - key: kubernetes.io/arch
    operator: In
    values: ["amd64", "arm64"]
  limits:
    resources:
      cpu: 1000
  providerRef:
    name: default
  ttlSecondsAfterEmpty: 30
```

### Best Practices for Spot

1. **Diversify instance types** — Use multiple families (m5, m6i, c5, c6i)
2. **Handle interruptions gracefully** — Use PodDisruptionBudgets
3. **Keep stateful workloads on-demand** — Databases, message queues
4. **Use spot for batch jobs** — CI/CD, data processing

## Strategy 4: Namespace Resource Quotas

Prevent runaway resource consumption.

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-budget
  namespace: team-alpha
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
    pods: "50"
    services: "10"
    persistentvolumeclaims: "20"
```

## Strategy 5: Implement Pod Priority and Preemption

Let critical workloads survive during resource contention.

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
description: "Critical production workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 100
globalDefault: true
description: "Development and batch jobs"
```

## Strategy 6: Right-Size Your Nodes

Node selection matters more than you think.

### Instance Type Comparison

| Workload Type | Recommended Instance | Why |
|---------------|---------------------|-----|
| General apps | m6i.xlarge | Balanced CPU/memory |
| Memory-heavy | r6i.xlarge | 8:1 memory ratio |
| Compute-heavy | c6i.xlarge | High CPU clock |
| ML inference | g5.xlarge | Cost-effective GPU |
| Batch jobs | m6i.large (spot) | Cheap and disposable |

### ARM64 Can Save 20-40%

```yaml
spec:
  nodeSelector:
    kubernetes.io/arch: arm64
```

Graviton3 instances offer better price-performance for many workloads.

## Strategy 7: Scheduled Scaling

Development environments don't need to run 24/7.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: dev-scaler
spec:
  scaleTargetRef:
    name: dev-deployment
  minReplicaCount: 0
  maxReplicaCount: 5
  triggers:
  - type: cron
    metadata:
      timezone: America/New_York
      start: 0 8 * * 1-5  # 8 AM weekdays
      end: 0 20 * * 1-5   # 8 PM weekdays
      desiredReplicas: "3"
```

**Savings**: 60%+ for non-production environments.

## Strategy 8: Storage Optimization

PersistentVolumes can silently drain your budget.

### Use Appropriate Storage Classes

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cold-storage
provisioner: ebs.csi.aws.com
parameters:
  type: sc1  # Cold HDD - $0.015/GB vs $0.10/GB for gp3
  fsType: ext4
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

### Storage Tier Guidelines

| Use Case | AWS | GCP | Azure |
|----------|-----|-----|-------|
| Databases | gp3 | pd-ssd | Premium SSD |
| Logs/Archives | sc1 | pd-standard | Standard HDD |
| Scratch/Temp | Instance store | Local SSD | Temp disk |

## Strategy 9: Network Cost Reduction

Cross-AZ traffic adds up quickly.

### Keep Traffic Local

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  annotations:
    service.kubernetes.io/topology-aware-hints: auto
spec:
  topologyKeys:
  - "topology.kubernetes.io/zone"
  - "*"
```

### Use Internal Load Balancers

External ALBs cost more. Use internal where possible:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-internal: "true"
```

## Strategy 10: Implement FinOps Practices

Make cost visibility part of your culture.

### Essential Tools

1. **Kubecost** — Real-time cost allocation
2. **OpenCost** — CNCF open-source alternative
3. **Kubernetes Resource Report** — Lightweight usage reports
4. **Cloud provider tools** — AWS Cost Explorer, GCP Billing

### Cost Allocation Labels

```yaml
metadata:
  labels:
    app: my-app
    team: platform
    environment: production
    cost-center: eng-123
```

## Quick Wins Checklist

| Action | Effort | Savings |
|--------|--------|---------|
| Right-size pods with VPA | Medium | 30-50% |
| Enable cluster autoscaler | Low | 20-40% |
| Use spot for stateless | Medium | 60-70% |
| Schedule dev environments | Low | 60%+ |
| Switch to ARM64 | Medium | 20-40% |
| Optimize storage classes | Low | 30-50% |

## Measuring Success

Track these metrics weekly:

1. **Cost per pod-hour** — Should decrease over time
2. **Resource utilization** — Target 60-70%
3. **Spot instance percentage** — Aim for 50%+ of compute
4. **Idle resource hours** — Should trend toward zero

## Conclusion

Kubernetes cost optimization isn't a one-time project — it's an ongoing practice. Start with the quick wins (autoscaling, spot instances), then build toward a FinOps culture where every team understands their infrastructure costs.

The best part? These optimizations often **improve performance too**. Right-sized pods schedule faster, and autoscaling handles traffic spikes better than fixed capacity.

**Start today**: Install Kubecost, review your top 10 most expensive workloads, and right-size them. You'll likely find 30%+ savings in your first week.

---

*What's your Kubernetes cost optimization strategy? The cloud bill never lies.*
