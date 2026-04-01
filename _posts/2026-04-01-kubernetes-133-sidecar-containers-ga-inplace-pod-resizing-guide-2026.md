---
layout: post
title: "Kubernetes 1.33 Deep Dive: Sidecar Containers GA, In-Place Pod Resizing, and What's Next"
subtitle: "Everything you need to know about the most impactful Kubernetes release of 2026"
date: 2026-04-01 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - Kubernetes
  - Cloud Native
  - DevOps
  - Container Orchestration
  - SRE
  - Platform Engineering
---

# Kubernetes 1.33 Deep Dive: Sidecar Containers GA, In-Place Pod Resizing, and What's Next

Kubernetes 1.33 landed in early 2026 with a feature set that platform engineers have been waiting years for. Two of the biggest items — native sidecar containers and in-place pod resource resizing — have reached GA. This post covers what's changed, why it matters, and how to start using these features today.

![Kubernetes cluster](https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=900&auto=format&fit=crop)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

## Native Sidecar Containers: Finally GA

For years, running sidecars (service mesh proxies, log shippers, secret injectors) was a kludge. You'd define an init container or rely on ordering hacks and hope your main app didn't start before the sidecar was ready.

Kubernetes 1.33 ships [KEP-753](https://github.com/kubernetes/enhancements/issues/753) as GA: **native sidecar support via `initContainers` with `restartPolicy: Always`**.

### How It Works

```yaml
apiVersion: v1
kind: Pod
spec:
  initContainers:
  # Native sidecar: runs throughout pod lifecycle
  - name: log-forwarder
    image: fluent/fluent-bit:3.2
    restartPolicy: Always    # <-- This is what makes it a sidecar
    resources:
      requests:
        memory: "64Mi"
        cpu: "50m"
      limits:
        memory: "128Mi"
        cpu: "100m"
    volumeMounts:
    - name: varlog
      mountPath: /var/log
  
  # Regular init container: runs once before app starts
  - name: wait-for-db
    image: busybox:1.36
    command: ['sh', '-c', 'until nc -z postgres 5432; do sleep 1; done']
  
  containers:
  - name: app
    image: myapp:latest
```

**Key behaviors with native sidecars:**
1. **Lifecycle guarantee:** Sidecars start *before* regular containers and stop *after* them — no more race conditions
2. **Restart independence:** The sidecar restarts independently of the main container; a crash loop in log-forwarder doesn't kill your app
3. **Resource attribution:** Sidecar resources are properly accounted for in scheduler decisions
4. **Probe support:** Sidecars can have startup/readiness/liveness probes like regular containers

### Migration from Legacy Patterns

If you were using the old "pause sidecar" pattern (an init container that blocks forever after setup), here's the migration:

```yaml
# BEFORE (hacky approach)
initContainers:
- name: istio-init
  image: istio/proxyv2:1.20
  command: ["/bin/sh", "-c", "iptables-restore < /tmp/iptables && while true; do sleep 3600; done"]

# AFTER (native sidecar)
initContainers:
- name: istio-proxy
  image: istio/proxyv2:1.20
  restartPolicy: Always
  args: ["proxy", "sidecar"]
```

Service meshes like Istio (1.23+) and Linkerd (2.16+) have updated their injection webhooks to use native sidecars automatically.

---

## In-Place Pod Resource Resizing: GA

This one deserves a standing ovation. Before 1.33, changing CPU/memory on a running pod required killing and rescheduling it — disruptive for stateful workloads, painful for databases.

[KEP-1287](https://github.com/kubernetes/enhancements/issues/1287) is now GA: you can modify pod resource requests/limits without restart.

### Basic Usage

```bash
# Scale up memory limit on a running pod
kubectl patch pod my-app-pod -p '{
  "spec": {
    "containers": [{
      "name": "app",
      "resources": {
        "requests": {"memory": "512Mi"},
        "limits": {"memory": "1Gi"}
      }
    }]
  }
}'
```

### Resize Policy

Containers can declare how they want to handle resizes:

```yaml
containers:
- name: app
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  resizePolicy:
  - resourceName: cpu
    restartPolicy: NotRequired   # CPU changes apply without restart
  - resourceName: memory
    restartPolicy: RestartContainer  # Memory changes require restart
```

`NotRequired` is the magic — on Linux with cgroups v2 (which is now the default on all major distributions), CPU adjustments can be applied live to the container's cgroup.

### Real-World Impact: VPA Without Disruption

Combine in-place resizing with the Vertical Pod Autoscaler in `Recreate` mode and you now get smooth vertical scaling:

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
    updateMode: "InPlace"  # Uses in-place resize instead of pod kill
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 4
        memory: 8Gi
```

This is a game-changer for database pods, message queue consumers, and any workload that accumulated state in memory.

---

## Other Notable Changes in 1.33

### Structured Authorization Webhook (GA)

Authorization webhooks can now return structured reasons, enabling richer RBAC tooling:

```json
{
  "apiVersion": "authorization.k8s.io/v1",
  "kind": "SubjectAccessReview",
  "status": {
    "allowed": false,
    "reason": "missing required label: team=platform",
    "evaluationError": ""
  }
}
```

### Dynamic Resource Allocation (Beta)

DRA moves to beta, enabling GPU/FPGA/network hardware sharing across pods with proper lifecycle management — critical for AI workloads:

```yaml
apiVersion: resource.k8s.io/v1beta1
kind: ResourceClaim
metadata:
  name: my-gpu-claim
spec:
  devices:
    requests:
    - name: gpu
      deviceClassName: gpu.nvidia.com
      count: 1
```

### Job Success Policy (GA)

Define complex completion conditions for batch workloads:

```yaml
spec:
  successPolicy:
    rules:
    - succeededIndexes: "0-2"
      succeededCount: 2   # 2 out of indices 0,1,2 must succeed
```

---

## Deprecations and Breaking Changes

**etcd 3.4 support dropped.** If you're still on etcd 3.4, upgrade before moving to 1.33.

**In-tree cloud providers removed.** AWS, Azure, and GCP in-tree volume plugins are fully gone. Migrate to CSI drivers if you haven't already:

```bash
# Check for in-tree volume usage
kubectl get pv -o json | jq '.items[] | select(.spec | keys[] | startswith("aws")) | .metadata.name'
```

**Seccomp default changed.** `RuntimeDefault` seccomp profile is now the default for new pods. If your apps break with seccomp, you'll need explicit `Unconfined` profiles (and a conversation with your security team).

---

![Container orchestration](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&auto=format&fit=crop)
*Photo by [Manuel Geissinger](https://unsplash.com/@manuelgeissinger) on Unsplash*

## Upgrading to 1.33

Standard upgrade advice applies: test in staging, upgrade control plane before workers, check API deprecations with `kubectl deprecations` (or `pluto`).

```bash
# Check for deprecated APIs before upgrading
pluto detect-all-in-cluster --target-versions k8s=v1.33.0

# Upgrade with kubeadm
kubeadm upgrade plan
kubeadm upgrade apply v1.33.0

# Upgrade worker nodes (drain first!)
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data
# ... upgrade kubelet/kubectl on the node ...
kubectl uncordon node-1
```

Managed Kubernetes users (EKS, GKE, AKS): your cloud provider's upgrade tooling handles most of this, but still audit your workloads for deprecated features.

---

## What's Coming in 1.34

Already merged/in-flight for the next release:
- **Topology-aware volume provisioning improvements** — smarter PVC scheduling for multi-zone clusters
- **Fine-grained pod disruption controls** — `maxSurge` support in PodDisruptionBudget
- **Improved NUMA-aware scheduling** — better hardware locality for high-performance workloads
- **Gateway API v2 graduation** — the Ingress replacement continues its march toward stability

---

## Conclusion

Kubernetes 1.33 marks a maturity milestone. Native sidecars and in-place resizing aren't flashy new features — they're fixes to longstanding operational pain points that every platform team knows intimately. The platform is getting more ergonomic, not just more capable.

If you're running production Kubernetes, there's a strong case for upgrading sooner rather than later, particularly if you're managing stateful workloads or service mesh architectures where these GA features deliver immediate operational wins.

---

*References:*
- [Kubernetes 1.33 Release Notes](https://kubernetes.io/blog/2026/04/kubernetes-1-33-release/)
- [KEP-753: Sidecar Containers](https://github.com/kubernetes/enhancements/issues/753)
- [KEP-1287: In-Place Pod Resize](https://github.com/kubernetes/enhancements/issues/1287)
- [Kubernetes Enhancement Proposals](https://github.com/kubernetes/enhancements)
