---
layout: post
title: "Kubernetes 1.32 Features Every DevOps Engineer Needs to Know"
subtitle: "Gateway API GA, in-place pod resize, sidecar containers, and the deprecations you can't ignore"
date: 2026-04-17 12:00:00
author: "Seokjun Lee"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&q=80"
catalog: true
tags:
  - Kubernetes
  - DevOps
  - Cloud Native
  - Container
  - Infrastructure
---

# Kubernetes 1.32 Features Every DevOps Engineer Needs to Know

Kubernetes 1.32 landed with a significant set of improvements that directly affect how teams run production workloads. From the long-awaited GA graduation of Gateway API to in-place pod resource resizing, this release is packed with changes that will reshape day-to-day operations. Let's break down what matters most.

![Kubernetes Container Orchestration](https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1000&q=80)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

---

## Gateway API Reaches GA

The Gateway API — the spiritual successor to Ingress — has officially graduated to stable in 1.32. This is the moment many platform teams have been waiting for.

### Why Gateway API Beats Ingress

The Ingress resource has been frozen in feature development for years. Gateway API provides:

- **Role-based separation**: Infrastructure providers manage `GatewayClass`, platform teams manage `Gateway`, app teams manage `HTTPRoute`
- **Richer routing**: Header-based routing, traffic weighting, URL rewrites
- **Protocol support**: HTTP, HTTPS, TCP, TLS, gRPC — all first-class

### Example: Canary Deployment with HTTPRoute

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app-canary
  namespace: production
spec:
  parentRefs:
  - name: prod-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: my-app-stable
      port: 8080
      weight: 90
    - name: my-app-canary
      port: 8080
      weight: 10
```

This achieves a 90/10 traffic split between stable and canary — something that required custom Ingress annotations or a service mesh before Gateway API.

### Migration from Ingress

```bash
# Check your current Ingress resources
kubectl get ingress --all-namespaces

# Install the Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml

# Migrate with the official conversion tool
gateway-api-convert --input ingress.yaml --output httproute.yaml
```

---

## In-Place Pod Resource Resizing (Beta)

One of the most operationally significant features in 1.32: you can now resize pod CPU and memory limits without restarting the pod. This is a huge deal for stateful workloads.

### Why This Matters

Previously, changing a pod's resource requests/limits required:
1. Deleting the pod
2. Recreating it with new specs
3. Dealing with downtime or complex rollout strategies

Now, for many workloads, you can resize in place.

### How It Works

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-database
spec:
  containers:
  - name: postgres
    image: postgres:16
    resizePolicy:
    - resourceName: cpu
      restartPolicy: NotRequired
    - resourceName: memory
      restartPolicy: RestartContainer
    resources:
      requests:
        cpu: "1"
        memory: "2Gi"
      limits:
        cpu: "2"
        memory: "4Gi"
```

To resize without restart:
```bash
kubectl patch pod my-database --subresource resize --type merge \
  -p '{"spec":{"containers":[{"name":"postgres","resources":{"requests":{"cpu":"2"},"limits":{"cpu":"4"}}}]}}'
```

> **Note**: CPU resize is typically `NotRequired` (no restart needed). Memory resize often requires container restart due to how Linux memory limits work.

---

## Sidecar Containers: Production-Ready

The sidecar container feature (introduced in 1.28) is now stable. This changes how init containers with `restartPolicy: Always` behave — they run alongside the main container throughout the pod lifecycle.

### Before vs. After Sidecars

**Before (workaround using init containers):**
```yaml
# Hacky — init container ran to completion before main app started
initContainers:
- name: istio-proxy
  image: istio/proxyv2:latest
  # Complex lifecycle hooks needed
```

**After (native sidecar):**
```yaml
initContainers:
- name: log-collector
  image: fluentbit:latest
  restartPolicy: Always  # This is now a sidecar!
  volumeMounts:
  - name: logs
    mountPath: /var/log/app

containers:
- name: my-app
  image: my-app:latest
  volumeMounts:
  - name: logs
    mountPath: /var/log/app
```

Kubernetes guarantees the sidecar starts before the main container and terminates after it.

---

## Job API Improvements: Indexed Jobs and Backoff

Batch workloads get major improvements:

### Per-Index Backoff

Previously, job failure handling was coarse — a single failure policy applied to all indices. Now you can set per-index backoff limits:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ml-training-job
spec:
  completions: 100
  parallelism: 10
  completionMode: Indexed
  backoffLimitPerIndex: 3
  maxFailedIndexes: 10
  template:
    spec:
      containers:
      - name: trainer
        image: ml-training:latest
        env:
        - name: JOB_INDEX
          valueFrom:
            fieldRef:
              fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
```

This allows up to 3 retries per index, with the job failing only if 10 or more indices fail permanently.

---

## Node Feature Discovery: Automatic Hardware-Aware Scheduling

NFD v0.16 ships with 1.32 and adds automatic detection of:
- GPU vendor and model
- CPU microarchitecture features (AVX-512, AMX)
- Network card capabilities (RDMA, SR-IOV)

```yaml
# Schedule only on nodes with AVX-512 support
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: feature.node.kubernetes.io/cpu-cpuid.AVX512F
          operator: In
          values:
          - "true"
```

---

## Critical Deprecations and Removals

### Removed in 1.32

| Feature | Replacement |
|---------|-------------|
| `flowcontrol.apiserver.k8s.io/v1beta2` | `flowcontrol.apiserver.k8s.io/v1` |
| `--cloud-provider` kubelet flag | External cloud controllers |
| `cgroup v1` support (deprecated) | Migrate to cgroup v2 |

### Check Your Cluster

```bash
# Find deprecated API usage
kubectl api-resources --verbs=list -o name | xargs -I {} kubectl get {} --all-namespaces 2>&1 | grep -i deprecated

# Check cgroup version on nodes
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.osImage}{"\n"}{end}'

# Use pluto for comprehensive deprecation scanning
pluto detect-helm -o wide
pluto detect-files -d ./manifests
```

---

![Cloud Native Architecture](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1000&q=80)
*Photo by [C Dustin](https://unsplash.com/@dianamia) on Unsplash*

## Performance Improvements

### etcd 3.6 Support

1.32 adds first-class support for etcd 3.6, which brings:
- 30% improvement in watch efficiency
- Reduced memory usage under high-churn workloads
- Better multi-region replication

### API Server Admission Webhook Latency

A new admission webhook timeout enforcement mechanism reduces tail latency at the API server by 40% in high-throughput environments.

---

## Upgrading to 1.32

### Prerequisites

```bash
# Check upgrade path (must go through each minor version)
kubectl version
# Must be on 1.31.x before upgrading to 1.32

# Backup etcd
ETCDCTL_API=3 etcdctl snapshot save backup.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key
```

### With kubeadm

```bash
# Upgrade control plane
apt-get update && apt-get install -y kubeadm=1.32.0-00
kubeadm upgrade plan
kubeadm upgrade apply v1.32.0

# Upgrade kubelet on each node
apt-get install -y kubelet=1.32.0-00 kubectl=1.32.0-00
systemctl daemon-reload && systemctl restart kubelet
```

---

## Summary

Kubernetes 1.32 is one of the more impactful releases in recent memory. Key takeaways:

- **Gateway API is stable** — start migrating from Ingress now
- **In-place pod resize** eliminates restarts for resource adjustments
- **Native sidecars** simplify service mesh and logging patterns
- **Job improvements** make batch workloads more resilient
- **cgroup v1 deprecation** — audit your nodes today

The Kubernetes community continues to deliver on the promise of making complex distributed systems manageable. 1.32 is a solid upgrade for any production cluster.
