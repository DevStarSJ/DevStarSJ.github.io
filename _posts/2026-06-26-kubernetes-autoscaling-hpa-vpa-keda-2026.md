---
layout: post
title: "Kubernetes Autoscaling in 2026: HPA, VPA, KEDA, and When to Use Each"
subtitle: "A practical guide to choosing and combining Kubernetes autoscaling strategies for modern cloud-native workloads"
date: 2026-06-26 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - Kubernetes
  - DevOps
  - CloudNative
  - Autoscaling
  - KEDA
  - Platform Engineering
---

## Introduction

Kubernetes autoscaling has evolved significantly. In 2026, most production clusters aren't just using the basic Horizontal Pod Autoscaler — they're combining multiple scaling strategies to handle different workload characteristics. This post covers the full autoscaling toolkit: HPA, VPA, KEDA, and cluster-level scaling, with decision guidance on which to reach for and when.

![Server infrastructure at scale](https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=900&auto=format&fit=crop)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

---

## The Four Scaling Axes

Before diving into tools, understand the four dimensions you can scale along:

| Axis | What it does | Tool |
|---|---|---|
| Horizontal (pods) | Add/remove pod replicas | HPA, KEDA |
| Vertical (resources) | Resize CPU/memory per pod | VPA |
| Cluster (nodes) | Add/remove cluster nodes | Cluster Autoscaler, Karpenter |
| Predictive | Scale ahead of demand | KEDA scheduled scalers, HPA v2 |

Real production systems usually need 2-3 of these working together.

---

## Horizontal Pod Autoscaler (HPA)

HPA is the classic: it scales pod replicas based on metrics, typically CPU or memory.

### Basic Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 2
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### The Stabilization Window Problem

Default HPA behavior is aggressively reactive — it scales up fast but scales down fast too, causing flapping. Use stabilization windows to control this:

```yaml
behavior:
  scaleDown:
    stabilizationWindowSeconds: 300  # Wait 5 min before scaling down
    policies:
    - type: Percent
      value: 10
      periodSeconds: 60  # Remove at most 10% of pods per minute
  scaleUp:
    stabilizationWindowSeconds: 0    # Scale up immediately
    policies:
    - type: Percent
      value: 100
      periodSeconds: 15  # Can double pod count every 15s
```

### Custom Metrics with HPA

HPA v2 supports custom metrics via the Custom Metrics API. Common sources: Prometheus Adapter, Datadog Cluster Agent, Google Cloud Monitoring.

```yaml
metrics:
- type: Pods
  pods:
    metric:
      name: http_requests_per_second
    target:
      type: AverageValue
      averageValue: "500"  # 500 RPS per pod target
```

---

## Vertical Pod Autoscaler (VPA)

VPA resizes the CPU and memory requests/limits of running pods. It's the right tool when your pods have inconsistent or poorly calibrated resource requests.

### The VPA Operating Modes

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-server-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  updatePolicy:
    updateMode: "Auto"   # Off | Initial | Recreate | Auto
```

| Mode | Behavior |
|---|---|
| `Off` | Recommendations only, no changes |
| `Initial` | Apply recommendations only to new pods |
| `Recreate` | Evict pods to apply updates (downtime possible) |
| `Auto` | Best effort in-place update (requires InPlaceOrRecreate) |

### VPA + HPA Conflict

**Warning**: Don't use VPA and HPA on the same resource metrics (CPU/memory). They fight each other. The safe combination:

- **HPA on custom metrics** (RPS, queue depth) + **VPA on CPU/memory**
- Or: **HPA on CPU/memory** + **VPA in `Off` mode** (recommendations only)

---

## KEDA: Event-Driven Autoscaling

KEDA (Kubernetes Event-Driven Autoscaling) is where modern Kubernetes scaling gets interesting. It can scale based on virtually any external signal: Kafka lag, SQS queue depth, Redis list length, cron schedules, Prometheus queries, HTTP request rates, and 60+ other scalers.

```bash
helm install keda kedacore/keda --namespace keda --create-namespace
```

### Example: Scale on Kafka Consumer Lag

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer-scaledobject
spec:
  scaleTargetRef:
    name: order-processor
  pollingInterval: 15
  cooldownPeriod: 60
  minReplicaCount: 0    # KEDA can scale to zero!
  maxReplicaCount: 100
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka-broker:9092
      consumerGroup: order-processors
      topic: orders
      lagThreshold: "50"      # 1 pod per 50 messages of lag
      activationLagThreshold: "5"  # Don't wake from 0 until 5+ messages
```

### Scaling to Zero

KEDA's killer feature: scale to zero. When there are no messages in the queue, you run zero pods. When messages arrive, KEDA wakes them. This is transformative for batch workloads and event-driven microservices.

For HTTP workloads, KEDA HTTP Add-on handles scale-to-zero by buffering requests:

```yaml
apiVersion: http.keda.sh/v1alpha1
kind: HTTPScaledObject
metadata:
  name: api-server-http
spec:
  hosts:
  - api.example.com
  targetPendingRequests: 100
  scaleTargetRef:
    name: api-server
    port: 8080
  replicas:
    min: 0
    max: 30
```

### Scheduled Scaling

Pre-scale for known traffic patterns:

```yaml
triggers:
- type: cron
  metadata:
    timezone: Asia/Seoul
    start: "0 9 * * 1-5"     # 9 AM weekdays
    end: "0 18 * * 1-5"      # 6 PM weekdays
    desiredReplicas: "20"
- type: cron
  metadata:
    timezone: Asia/Seoul
    start: "0 18 * * 1-5"    # After hours
    end: "0 9 * * 1-5"
    desiredReplicas: "3"
```

---

## Cluster-Level Scaling: Karpenter vs. Cluster Autoscaler

Pod scaling only works if there are nodes to schedule onto. For cluster-level scaling in 2026, Karpenter has become the preferred choice on AWS (and increasingly on Azure/GCP via Karpenter providers).

### Karpenter NodePool

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
      - key: node.kubernetes.io/instance-type
        operator: In
        values: ["m5.large", "m5.xlarge", "m5.2xlarge", "m6i.large", "m6i.xlarge"]
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
  limits:
    cpu: 1000
  disruption:
    consolidationPolicy: WhenUnderutilized
    consolidateAfter: 30s
```

Karpenter provisions nodes directly via cloud APIs (no node groups), picks the optimal instance type for pending pods, and consolidates underutilized nodes aggressively. The result is typically 40-60% better node utilization vs. Cluster Autoscaler.

---

## Practical Scaling Architecture by Workload Type

### Web API (stateless, latency-sensitive)

```
HPA (CPU + RPS custom metric)
  → minReplicas: 3, maxReplicas: 200
  → scaleUp: fast (0s stabilization)
  → scaleDown: slow (300s stabilization)
VPA: Off mode (for recommendations only)
Karpenter: on-demand + spot mix (spot for non-critical, on-demand for baseline)
```

### Background Workers (queue consumers)

```
KEDA (queue depth scaler)
  → minReplicas: 0, maxReplicas: 50
  → lagThreshold based on processing SLA
  → scale-to-zero when idle
Karpenter: spot-only (interruptions acceptable, jobs retry)
```

### ML Inference (GPU workloads)

```
KEDA (HTTP scaler or custom Prometheus metric)
  → scale based on pending inference requests
  → longer cooldown (GPU nodes are expensive to spin up)
Karpenter: GPU instance types, on-demand (spot GPU availability is inconsistent)
VPA: Auto mode for CPU/memory (GPU memory managed separately)
```

![Cloud infrastructure diagram](https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=900&auto=format&fit=crop)
*Photo by [Taylor Vick](https://unsplash.com/@tvick) on Unsplash*

---

## Observability for Autoscaling

You can't tune what you can't see. Essential metrics to monitor:

```yaml
# Key Prometheus queries for autoscaling health

# HPA: Current vs. desired replicas
kube_horizontalpodautoscaler_status_current_replicas
kube_horizontalpodautoscaler_status_desired_replicas

# KEDA: ScaledObject active status
keda_scaler_active

# Karpenter: Node provisioning latency
karpenter_nodes_allocatable

# Pod pending time (indicates scaling lag)
kube_pod_status_unschedulable
```

Alert on:
- HPA maxReplicas hit (you're capacity-constrained)
- Pods pending > 3 minutes (node provisioning lagging)
- KEDA scaled-to-zero but traffic arriving (activation threshold too high)

---

## Decision Tree: Which Scaler for My Workload?

```
Is your trigger event-driven (queues, events, cron)?
  Yes → KEDA
  No  ↓

Is CPU/memory the right scaling signal?
  Yes → HPA (resource metrics)
  No  ↓

Do you have application-level metrics (RPS, latency)?
  Yes → HPA (custom metrics via Prometheus Adapter)
  No  ↓

Are your resource requests badly miscalibrated?
  Yes → VPA (Auto or Initial mode)
  No  → Profile your app first, then revisit
```

---

## Conclusion

Kubernetes autoscaling in 2026 is a solved problem — but it requires assembling the right combination of tools for your workload. HPA handles reactive CPU/memory scaling. KEDA handles event-driven and scale-to-zero scenarios. VPA handles right-sizing. Karpenter handles cost-efficient node provisioning.

The most common mistake is reaching for HPA by default for everything. For event-driven workloads, KEDA is almost always the better choice. For batch jobs that can go to zero, KEDA is essential.

Start with your scaling signal, pick the right tool for that signal, then layer in Karpenter for node-level efficiency. That combination handles the vast majority of production autoscaling requirements cleanly.
