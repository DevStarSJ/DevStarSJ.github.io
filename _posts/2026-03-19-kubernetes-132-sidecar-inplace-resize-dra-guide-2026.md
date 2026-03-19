---
layout: post
title: "Kubernetes 1.32 Deep Dive: Sidecar Containers, In-Place Pod Resizing, and What's Next"
subtitle: "The most impactful Kubernetes changes in 2026 and how to take advantage of them in production clusters"
date: 2026-03-19 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1600&q=80"
catalog: true
tags:
  - Kubernetes
  - DevOps
  - Cloud Native
  - Containers
  - Platform Engineering
---

# Kubernetes 1.32 Deep Dive: Sidecar Containers, In-Place Pod Resizing, and What's Next

Kubernetes 1.32 shipped several features that have been in development for years and are finally ready for production use. In this post, we'll explore the most impactful changes: native sidecar container support, in-place pod resource resizing, and the DRA (Dynamic Resource Allocation) framework that's reshaping how GPU workloads are scheduled.

![Kubernetes cluster visualization](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80)
*Photo by Taylor Vick on Unsplash*

---

## 1. Native Sidecar Containers (GA in 1.32)

For years, sidecars were an informal pattern — just regular init containers or containers that happened to support a main workload. Kubernetes 1.32 makes them a first-class citizen with proper lifecycle semantics.

### The Problem with Old-Style Sidecars

The classic approach was to add a sidecar as a regular container. This created annoying issues:

1. **Ordering**: Sidecar might not be ready when main container starts
2. **Termination**: Job pods wouldn't complete because the sidecar kept running
3. **Probes**: Sidecar failures could be masked

```yaml
# OLD approach — problematic
apiVersion: v1
kind: Pod
spec:
  initContainers:
    - name: wait-for-envoy
      image: busybox
      command: ['sh', '-c', 'until nc -z localhost 15000; do sleep 1; done']
  containers:
    - name: app
      image: myapp:latest
    - name: envoy-proxy        # This sidecar has no lifecycle guarantees
      image: envoyproxy/envoy:v1.28.0
```

### New Native Sidecar Syntax

```yaml
apiVersion: v1
kind: Pod
spec:
  initContainers:
    - name: envoy-proxy
      image: envoyproxy/envoy:v1.28.0
      restartPolicy: Always     # 👈 This is the magic field
      ports:
        - containerPort: 15000
      readinessProbe:
        httpGet:
          path: /ready
          port: 15000
        initialDelaySeconds: 5
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
  containers:
    - name: app
      image: myapp:latest
      env:
        - name: HTTP_PROXY
          value: "http://localhost:15001"
```

The `restartPolicy: Always` on an init container declares it as a sidecar. Key behaviors:

- **Starts before** the main containers
- **Stays running** for the pod's lifetime
- **Terminates after** main containers exit (critical for Jobs!)
- **Counted separately** for pod readiness

### Sidecar Lifecycle in Jobs

This is the killer feature. Before, running Istio-proxied batch jobs was painful:

```yaml
# Now Job pods terminate cleanly
apiVersion: batch/v1
kind: Job
spec:
  template:
    spec:
      initContainers:
        - name: istio-proxy
          image: istio/proxyv2:1.22.0
          restartPolicy: Always
          lifecycle:
            preStop:
              exec:
                command: ["/usr/local/bin/pilot-agent", "request", "POST", "quitquitquit"]
      containers:
        - name: data-processor
          image: myapp/processor:latest
          command: ["python", "process.py"]
      restartPolicy: Never
```

The sidecar now waits for `data-processor` to complete, runs its `preStop` hook, then exits. The Job completes properly.

---

## 2. In-Place Pod Resource Resizing (Beta in 1.32)

Traditionally, changing a Pod's CPU or memory requests/limits required killing and recreating the Pod — downtime, rescheduling delays, potential disruption. In-place resizing changes all of that.

### Enabling In-Place Resize

```bash
# Feature gate (enabled by default in 1.32 beta)
kube-apiserver --feature-gates=InPlacePodVerticalScaling=true
kubelet --feature-gates=InPlacePodVerticalScaling=true
```

### How It Works

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-server
spec:
  containers:
    - name: nginx
      image: nginx:1.27
      resources:
        requests:
          cpu: "500m"
          memory: "512Mi"
        limits:
          cpu: "1000m"
          memory: "1Gi"
      resizePolicy:             # 👈 New field
        - resourceName: cpu
          restartPolicy: NotRequired    # CPU resize without restart
        - resourceName: memory
          restartPolicy: RestartContainer  # Memory resize requires restart
```

### Performing a Resize

```bash
# Patch the pod resources directly
kubectl patch pod web-server --type=merge -p '{
  "spec": {
    "containers": [{
      "name": "nginx",
      "resources": {
        "requests": {"cpu": "750m", "memory": "512Mi"},
        "limits": {"cpu": "1500m", "memory": "1Gi"}
      }
    }]
  }
}'

# Check resize status
kubectl get pod web-server -o jsonpath='{.status.resize}'
# Output: "InProgress" → "Deferred" → "" (success) or "Infeasible"
```

### VPA Integration

The Vertical Pod Autoscaler now supports in-place resizing natively:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-server-vpa
spec:
  targetRef:
    apiVersion: v1
    kind: Deployment
    name: web-server
  updatePolicy:
    updateMode: "InPlace"     # 👈 Use in-place instead of eviction
  resourcePolicy:
    containerPolicies:
      - containerName: nginx
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: 4
          memory: 4Gi
        controlledResources: ["cpu", "memory"]
```

This is a massive improvement for stateful workloads like databases, caches, and ML inference servers where pod restarts are costly.

---

## 3. Dynamic Resource Allocation (DRA) — Stable in 1.32

GPU scheduling in Kubernetes used to be surprisingly primitive. The extended resources model (`nvidia.com/gpu: 1`) treated GPUs as opaque integers — you couldn't request specific GPU models, share GPUs between pods, or allocate fractional GPU resources.

DRA solves this with a pluggable resource claim model.

### Old GPU Scheduling

```yaml
# Old way — can't specify GPU type, no sharing
spec:
  containers:
    - name: ml-training
      resources:
        limits:
          nvidia.com/gpu: "1"    # Which GPU? No idea.
```

### DRA ResourceClaim Model

```yaml
# Define what kind of GPU you need
apiVersion: resource.k8s.io/v1alpha3
kind: ResourceClaim
metadata:
  name: h100-claim
spec:
  devices:
    requests:
      - name: gpu
        deviceClassName: gpu.nvidia.com
        selectors:
          - cel:
              expression: >
                device.attributes["gpu.nvidia.com"].model == "H100" &&
                device.attributes["gpu.nvidia.com"].memoryGB >= 80
---
# Reference it from the Pod
apiVersion: v1
kind: Pod
metadata:
  name: llm-training
spec:
  resourceClaims:
    - name: my-gpu
      resourceClaimName: h100-claim
  containers:
    - name: trainer
      image: pytorch/pytorch:2.5.0-cuda12.4-cudnn9-runtime
      resources:
        claims:
          - name: my-gpu
      command: ["torchrun", "--nproc_per_node=1", "train.py"]
```

### GPU Sharing with DRA

```yaml
# ResourceClaimTemplate for shared GPU
apiVersion: resource.k8s.io/v1alpha3
kind: ResourceClaimTemplate
metadata:
  name: shared-a100
spec:
  spec:
    devices:
      requests:
        - name: gpu
          deviceClassName: gpu.nvidia.com
          allocationMode: All          # Claim the GPU
      config:
        - requests: ["gpu"]
          opaque:
            driver: gpu.nvidia.com
            parameters:
              apiVersion: gpu.nvidia.com/v1
              kind: GpuConfig
              sharing:
                strategy: TimeSlicing
                timeSlicingConfig:
                  interval: Default
```

---

## 4. Structured Parameters for Admission Webhooks

Kubernetes 1.32 also introduces Validating Admission Policies (CEL-based) reaching full GA with much richer capabilities, reducing the need for webhook servers for common validation patterns.

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: "no-latest-tag"
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["deployments"]
  validations:
    - expression: >
        object.spec.template.spec.containers.all(c,
          !c.image.endsWith(':latest') &&
          c.image.contains(':')
        )
      message: "Container images must not use 'latest' tag and must specify a version"
    - expression: >
        object.spec.template.spec.containers.all(c,
          has(c.resources) &&
          has(c.resources.requests) &&
          has(c.resources.requests.cpu) &&
          has(c.resources.requests.memory)
        )
      message: "All containers must specify CPU and memory requests"
  auditAnnotations:
    - key: "invalid-images"
      valueExpression: >
        object.spec.template.spec.containers
          .filter(c, c.image.endsWith(':latest'))
          .map(c, c.name)
          .join(", ")
```

This replaces entire webhook servers with a few lines of YAML. No deployment, no TLS, no latency.

---

## 5. Cluster API and Fleet Management

For teams managing multiple clusters, Cluster API (CAPI) 1.8 brings major improvements to cluster lifecycle management.

```yaml
# Declarative cluster definition with CAPI
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: production-east
  namespace: clusters
spec:
  clusterNetwork:
    pods:
      cidrBlocks: ["192.168.0.0/16"]
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
    kind: AWSCluster
    name: production-east
  controlPlaneRef:
    apiVersion: controlplane.cluster.x-k8s.io/v1beta2
    kind: KubeadmControlPlane
    name: production-east-cp
---
apiVersion: controlplane.cluster.x-k8s.io/v1beta2
kind: KubeadmControlPlane
metadata:
  name: production-east-cp
spec:
  replicas: 3
  version: v1.32.0
  machineTemplate:
    infrastructureRef:
      apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
      kind: AWSMachineTemplate
      name: control-plane-template
  kubeadmConfigSpec:
    clusterConfiguration:
      apiServer:
        extraArgs:
          feature-gates: "InPlacePodVerticalScaling=true,DynamicResourceAllocation=true"
```

---

## Migration Guide: Upgrading to 1.32

### Pre-upgrade Checklist

```bash
#!/bin/bash

# 1. Check deprecated API usage
kubectl get --raw /metrics | grep apiserver_requested_deprecated_apis

# 2. Validate admission webhooks compatibility
kubectl get validatingwebhookconfigurations -o json | \
  jq '.items[].webhooks[].admissionReviewVersions'

# 3. Check PodDisruptionBudgets for all stateful workloads
kubectl get pdb --all-namespaces

# 4. Verify node version skew (nodes must be within 2 minor versions)
kubectl get nodes -o custom-columns='NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion'

# 5. Test in staging with feature gates enabled
kubectl --context=staging get nodes
```

### Upgrading Control Plane

```bash
# Using kubeadm
kubeadm upgrade plan v1.32.0
kubeadm upgrade apply v1.32.0

# Verify
kubectl version --short
kubectl get componentstatus
```

---

## What's Coming in 1.33

The Kubernetes roadmap for 1.33 (expected mid-2026) includes:

- **PodLifecycleManager**: More granular control over container startup/shutdown ordering
- **ClusterTrustBundles GA**: Standard way to distribute trust anchors
- **Job success/failure policies**: Finer-grained exit code handling for ML training jobs
- **Storage capacity-aware scheduling improvements**: Better bin-packing for I/O-intensive workloads

---

## Conclusion

Kubernetes 1.32 represents a meaningful maturation of the platform. Native sidecars eliminate an entire category of Job-completion bugs. In-place resizing removes one of the most painful operational friction points for stateful workloads. DRA finally makes GPU scheduling first-class.

If you're still on 1.29 or 1.30, these features alone are worth the upgrade. Start with a staging cluster, enable the feature gates, and test your sidecar-heavy workloads — you'll likely find the new model cleaner and more predictable.

The platform is growing up. So should our configurations.
