---
layout: post
title: "Kubernetes for AI/ML Workloads: Complete Infrastructure Guide 2026"
subtitle: Deploy and scale machine learning workloads on Kubernetes
categories: development
tags: kubernetes ai ml devops cloud
comments: true
---

# Kubernetes for AI/ML Workloads: Complete Infrastructure Guide 2026

Running AI and ML workloads on Kubernetes has become the industry standard. This comprehensive guide covers GPU scheduling, distributed training, model serving, and best practices for production AI infrastructure.

## Why Kubernetes for AI/ML?

- **Resource Efficiency**: Share expensive GPU resources across teams
- **Scalability**: Auto-scale inference based on demand
- **Reproducibility**: Consistent environments with containers
- **Orchestration**: Manage complex training pipelines

## GPU Support in Kubernetes

### NVIDIA Device Plugin

```bash
# Install NVIDIA device plugin
kubectl create -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.0/nvidia-device-plugin.yml
```

### Request GPUs in Pods

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-training
spec:
  containers:
  - name: training
    image: pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime
    resources:
      limits:
        nvidia.com/gpu: 2  # Request 2 GPUs
    command: ["python", "train.py"]
  nodeSelector:
    accelerator: nvidia-a100
```

### GPU Time-Slicing (MIG)

```yaml
# ConfigMap for MIG configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: nvidia-device-plugin-config
data:
  config.yaml: |
    version: v1
    sharing:
      timeSlicing:
        resources:
        - name: nvidia.com/gpu
          replicas: 4  # Split each GPU into 4 slices
```

## Distributed Training

### PyTorch Distributed with Kubeflow

```yaml
apiVersion: kubeflow.org/v1
kind: PyTorchJob
metadata:
  name: distributed-training
spec:
  pytorchReplicaSpecs:
    Master:
      replicas: 1
      template:
        spec:
          containers:
          - name: pytorch
            image: my-training:latest
            resources:
              limits:
                nvidia.com/gpu: 4
            env:
            - name: NCCL_DEBUG
              value: "INFO"
    Worker:
      replicas: 3
      template:
        spec:
          containers:
          - name: pytorch
            image: my-training:latest
            resources:
              limits:
                nvidia.com/gpu: 4
```

### Training Script for Distributed

```python
import torch
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP

def setup_distributed():
    dist.init_process_group(backend='nccl')
    local_rank = int(os.environ['LOCAL_RANK'])
    torch.cuda.set_device(local_rank)
    return local_rank

def train():
    local_rank = setup_distributed()
    
    model = MyModel().cuda(local_rank)
    model = DDP(model, device_ids=[local_rank])
    
    # Training loop
    for epoch in range(num_epochs):
        for batch in dataloader:
            loss = model(batch)
            loss.backward()
            optimizer.step()
    
    dist.destroy_process_group()

if __name__ == "__main__":
    train()
```

## Model Serving

### KServe (Kubernetes Serving)

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: llm-predictor
spec:
  predictor:
    model:
      modelFormat:
        name: pytorch
      storageUri: "s3://models/llama-7b"
      resources:
        limits:
          nvidia.com/gpu: 1
          memory: 32Gi
        requests:
          cpu: 4
          memory: 16Gi
    minReplicas: 1
    maxReplicas: 10
    scaleTarget: 70
    scaleMetric: concurrency
```

### vLLM for High-Performance LLM Serving

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vllm
  template:
    metadata:
      labels:
        app: vllm
    spec:
      containers:
      - name: vllm
        image: vllm/vllm-openai:latest
        args:
        - --model=meta-llama/Llama-2-7b-chat-hf
        - --tensor-parallel-size=2
        - --max-model-len=4096
        ports:
        - containerPort: 8000
        resources:
          limits:
            nvidia.com/gpu: 2
            memory: 64Gi
        volumeMounts:
        - name: model-cache
          mountPath: /root/.cache
      volumes:
      - name: model-cache
        persistentVolumeClaim:
          claimName: model-cache-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: vllm-service
spec:
  selector:
    app: vllm
  ports:
  - port: 8000
    targetPort: 8000
```

## Auto-Scaling for Inference

### HPA with Custom Metrics

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: inference-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vllm-server
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Pods
    pods:
      metric:
        name: inference_requests_per_second
      target:
        type: AverageValue
        averageValue: 100
  - type: Resource
    resource:
      name: nvidia.com/gpu
      target:
        type: Utilization
        averageUtilization: 80
```

### KEDA for Event-Driven Scaling

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: inference-scaler
spec:
  scaleTargetRef:
    name: vllm-server
  minReplicaCount: 0
  maxReplicaCount: 20
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: inference_queue_length
      threshold: '50'
      query: sum(inference_pending_requests)
```

## Data Pipelines

### Kubeflow Pipelines

```python
from kfp import dsl
from kfp.dsl import component, pipeline

@component(base_image="python:3.11")
def preprocess_data(input_path: str, output_path: str):
    import pandas as pd
    df = pd.read_parquet(input_path)
    # Preprocessing logic
    df.to_parquet(output_path)

@component(base_image="pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime")
def train_model(data_path: str, model_path: str, epochs: int = 10):
    # Training logic
    pass

@component(base_image="python:3.11")
def evaluate_model(model_path: str, test_data: str) -> float:
    # Evaluation logic
    return accuracy

@pipeline(name="ml-training-pipeline")
def training_pipeline(input_data: str, model_output: str):
    preprocess_task = preprocess_data(
        input_path=input_data,
        output_path="/tmp/processed"
    )
    
    train_task = train_model(
        data_path=preprocess_task.output,
        model_path=model_output
    ).set_gpu_limit(2)
    
    evaluate_task = evaluate_model(
        model_path=train_task.output,
        test_data="/tmp/test"
    )
```

## Monitoring and Observability

### Prometheus Metrics for ML

```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server

# Define metrics
INFERENCE_LATENCY = Histogram(
    'inference_latency_seconds',
    'Time spent processing inference request',
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0]
)

INFERENCE_REQUESTS = Counter(
    'inference_requests_total',
    'Total inference requests',
    ['model', 'status']
)

GPU_MEMORY_USED = Gauge(
    'gpu_memory_used_bytes',
    'GPU memory usage',
    ['gpu_id']
)

@INFERENCE_LATENCY.time()
def inference(input_data):
    result = model.predict(input_data)
    INFERENCE_REQUESTS.labels(model='llama-7b', status='success').inc()
    return result
```

### Grafana Dashboard

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ml-dashboard
data:
  dashboard.json: |
    {
      "panels": [
        {
          "title": "Inference Latency P99",
          "targets": [{
            "expr": "histogram_quantile(0.99, rate(inference_latency_seconds_bucket[5m]))"
          }]
        },
        {
          "title": "GPU Utilization",
          "targets": [{
            "expr": "DCGM_FI_DEV_GPU_UTIL"
          }]
        }
      ]
    }
```

## Cost Optimization

### Spot Instances for Training

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: training-spot
spec:
  nodeSelector:
    node.kubernetes.io/instance-type: p4d.24xlarge
    karpenter.sh/capacity-type: spot
  tolerations:
  - key: "nvidia.com/gpu"
    operator: "Exists"
    effect: "NoSchedule"
  containers:
  - name: training
    image: training:latest
    resources:
      limits:
        nvidia.com/gpu: 8
```

### Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ml-team-quota
  namespace: ml-team
spec:
  hard:
    requests.nvidia.com/gpu: "16"
    limits.nvidia.com/gpu: "32"
    persistentvolumeclaims: "10"
```

## Best Practices

1. **Right-size GPU requests**: Don't over-provision
2. **Use preemption**: Set PriorityClasses for training vs inference
3. **Cache models**: Use PVCs to avoid repeated downloads
4. **Monitor GPU health**: Use DCGM exporter
5. **Implement checkpointing**: Save progress for spot instances

## Conclusion

Kubernetes provides a robust platform for AI/ML workloads. By leveraging GPU scheduling, distributed training frameworks, and proper auto-scaling, you can build efficient and cost-effective AI infrastructure.

## References

- [Kubeflow Documentation](https://www.kubeflow.org/docs/)
- [NVIDIA GPU Operator](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/)
- [KServe](https://kserve.github.io/website/)
