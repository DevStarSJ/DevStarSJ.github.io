---
layout: post
title: "Kubernetes 1.33: What's New and How to Leverage the Latest Features in 2026"
subtitle: "A comprehensive guide to the most impactful changes in K8s 1.33 — from sidecar containers GA to improved scheduling"
date: 2026-03-22 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - Kubernetes
  - DevOps
  - Cloud
  - Containers
  - Infrastructure
---

# Kubernetes 1.33: What's New and How to Leverage the Latest Features in 2026

Kubernetes 1.33 continues the project's tradition of delivering meaningful improvements across reliability, performance, and developer experience. This release brings several features to **General Availability (GA)**, a handful of exciting beta promotions, and a continued focus on making cluster operations smoother at scale.

Whether you're a platform engineer managing production clusters or a developer deploying workloads, here's what you need to know.

![Kubernetes architecture overview](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&auto=format&fit=crop)
*Photo by Taylor Vick on Unsplash*

---

## 1. Sidecar Containers — Now GA 🎉

After a long journey through alpha and beta, **sidecar containers** (native init containers with `restartPolicy: Always`) have graduated to **General Availability** in 1.33.

### Why This Matters

Previously, running a sidecar required hacks — like keeping a process alive or using wrappers — because regular init containers exit before the main container starts. With native sidecar support, you can declare a container that:

- **Starts before** the main app container
- **Stays running** alongside it
- **Shuts down after** the main container exits

### Example: Envoy Proxy as a Sidecar

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-envoy
spec:
  initContainers:
  - name: envoy
    image: envoyproxy/envoy:v1.29
    restartPolicy: Always   # ← This makes it a sidecar
    ports:
    - containerPort: 9901
    readinessProbe:
      httpGet:
        path: /ready
        port: 9901
  containers:
  - name: app
    image: my-app:latest
```

This is huge for service mesh deployments, log forwarders (Fluentbit, Vector), and secret rotation agents.

---

## 2. Job Success Policy — Beta

A new `successPolicy` field for Jobs allows you to declare a Job complete when *specific* pods succeed, rather than waiting for all pods to finish.

This is particularly powerful for:
- **Machine learning training jobs** where leader-follower patterns exist
- **Indexed Jobs** where only certain indices matter for success
- **Batch workloads** with optional bonus tasks

```yaml
apiVersion: batch/v1
kind: Job
spec:
  completions: 10
  parallelism: 5
  completionMode: Indexed
  successPolicy:
    rules:
    - succeededIndexes: "0-4"   # Only indices 0–4 need to succeed
      succeededCount: 5
```

---

## 3. Improved Scheduler: `MatchLabelKeys` for Pod Affinity

The scheduler now supports `matchLabelKeys` and `mismatchLabelKeys` in pod affinity/anti-affinity rules — bringing **rolling-deployment awareness** to scheduling.

### The Problem It Solves

During a rolling update, you'd have old and new ReplicaSet pods running simultaneously. Previously, anti-affinity rules couldn't distinguish between them, potentially spreading both old and new pods across the same nodes.

```yaml
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values: ["frontend"]
      matchLabelKeys:
      - pod-template-hash    # ← differentiates old vs new pods
      topologyKey: kubernetes.io/hostname
```

With `matchLabelKeys`, new pods will only enforce anti-affinity against pods from the **same ReplicaSet revision**, not old ones that are being drained.

---

## 4. VolumeAttributesClass — Beta

`VolumeAttributesClass` is a new API that lets storage admins define **mutable storage parameters** (like IOPS and throughput tiers) separately from the storage class — and modify them without recreating the PVC.

```yaml
apiVersion: storage.k8s.io/v1beta1
kind: VolumeAttributesClass
metadata:
  name: high-iops
driverName: ebs.csi.aws.com
parameters:
  iops: "16000"
  throughput: "1000"
```

You can then dynamically **upgrade or downgrade** storage performance on a live PVC by patching `spec.volumeAttributesClassName`. No more drain, delete, recreate cycles for storage tuning.

---

## 5. Node Memory Swap — Beta

Kubernetes has long discouraged swap memory on nodes. That stance is softening. In 1.33, node swap support reaches **Beta**, allowing workloads to use swap under controlled conditions.

Configure it in `kubelet` config:

```yaml
memorySwap:
  swapBehavior: LimitedSwap  # Only burstable pods can use swap
```

This is valuable for workloads that occasionally spike beyond their memory limits but don't need the performance of RAM 100% of the time.

---

## 6. Deprecations and Removals

Stay ahead of these before upgrading:

| Feature | Status | Action |
|---|---|---|
| `v1beta3` FlowSchema API | Deprecated | Migrate to `v1` |
| `SecurityContextDeny` admission plugin | Removed | Use Pod Security Admission |
| In-tree `gitRepo` volume | Removed | Use init containers instead |
| `status.nodeInfo.kubeProxyVersion` | Removed | Don't depend on this field |

---

## Upgrade Checklist

Before upgrading to 1.33:

1. **Audit deprecated API usage** with `kubectl convert` and `pluto`
2. **Test sidecar container behavior** if you're using init container patterns
3. **Review PodDisruptionBudgets** — scheduler changes may affect upgrade behavior
4. **Check CSI driver compatibility** if using `VolumeAttributesClass`
5. **Update Helm charts** for any API version removals

```bash
# Check for deprecated APIs in your cluster
pluto detect-all-in-cluster --target-versions k8s=v1.33.0

# Or use kubectl
kubectl get --raw /metrics | grep apiserver_requested_deprecated_apis
```

---

## Conclusion

Kubernetes 1.33 is a solid release that rewards teams who've been waiting for sidecar containers to stabilize, and brings storage and scheduling improvements that matter at scale. The graduation of sidecar containers to GA alone makes this worth upgrading for many teams.

As always, test in a staging environment first, keep your node images updated, and check the [official CHANGELOG](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md) for the full picture.

---

*Related Posts:*
- *Terraform vs OpenTofu 2026 Comparison*
- *GitHub Actions vs GitLab CI vs Jenkins 2026*
