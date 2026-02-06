---
layout: post
title: "Serverless Containers in 2026: AWS Fargate vs Cloud Run vs Azure Container Apps"
subtitle: "The definitive comparison for container workloads without infrastructure headaches"
date: 2026-02-06
author: "Dev Star"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1920&q=80"
tags: [Cloud, Containers, AWS, GCP, Azure, Serverless, DevOps]
---

You want containers. You don't want to manage Kubernetes. Welcome to serverless containers—where you get the packaging benefits of containers without the operational overhead.

![Cloud infrastructure](https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80)
*Photo by [Taylor Vick](https://unsplash.com/@tvick) on Unsplash*

## The Contenders

In 2026, three platforms dominate serverless containers:

1. **AWS Fargate** - The pioneer, deep AWS integration
2. **Google Cloud Run** - Developer-friendly, scale-to-zero
3. **Azure Container Apps** - Kubernetes-native, event-driven

Let's see how they stack up.

## AWS Fargate

Fargate is AWS's answer to "I want containers but not EC2 instances." It runs on ECS or EKS without managing servers.

### Deployment

```yaml
# fargate-task-definition.json
{
  "family": "my-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/my-api:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/my-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Terraform Setup

```hcl
resource "aws_ecs_cluster" "main" {
  name = "my-cluster"
}

resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnets
    security_groups  = [aws_security_group.api.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }
}
```

### Fargate Pros & Cons

**Pros:**
- Deep AWS ecosystem integration
- Spot capacity for cost savings (up to 70% off)
- Works with ECS and EKS
- Fine-grained IAM policies

**Cons:**
- No scale-to-zero (minimum 1 task)
- Complex networking setup
- Cold starts can be slow
- Requires VPC configuration

## Google Cloud Run

Cloud Run is the developer favorite. Deploy a container, get a URL. That simple.

### Deployment

```bash
# One command deployment
gcloud run deploy my-api \
  --image gcr.io/my-project/my-api:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 100 \
  --concurrency 80
```

### Cloud Run YAML

```yaml
# service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-api
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "100"
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containerConcurrency: 80
      timeoutSeconds: 300
      containers:
        - image: gcr.io/my-project/my-api:latest
          ports:
            - containerPort: 8080
          resources:
            limits:
              memory: 512Mi
              cpu: "1"
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
```

![Server room](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80)
*Photo by [Taylor Vick](https://unsplash.com/@tvick) on Unsplash*

### Cloud Run Pros & Cons

**Pros:**
- True scale-to-zero
- Simple developer experience
- Fast cold starts (~100ms)
- Built-in HTTPS and custom domains
- Request-based billing (pay per request)

**Cons:**
- Limited to HTTP workloads
- Max 60-minute request timeout
- Less control over networking
- GCP lock-in for some features

## Azure Container Apps

Container Apps combines Kubernetes power with serverless simplicity. Built on Dapr and KEDA.

### Deployment

```bash
# Azure CLI deployment
az containerapp create \
  --name my-api \
  --resource-group my-rg \
  --environment my-env \
  --image myregistry.azurecr.io/my-api:latest \
  --target-port 8080 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 30 \
  --cpu 0.5 \
  --memory 1.0Gi
```

### Bicep Template

```bicep
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'my-api'
  location: location
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'http'
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      secrets: [
        {
          name: 'db-connection'
          value: dbConnectionString
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: 'myregistry.azurecr.io/my-api:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'DATABASE_URL'
              secretRef: 'db-connection'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 30
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}
```

### Container Apps Pros & Cons

**Pros:**
- Scale-to-zero
- Built-in Dapr for microservices
- KEDA-based autoscaling (Kafka, queues, etc.)
- Revision management for A/B testing
- Simpler than AKS

**Cons:**
- Younger platform (fewer features)
- Limited regions
- Less community content
- Some Kubernetes concepts leak through

## Head-to-Head Comparison

| Feature | Fargate | Cloud Run | Container Apps |
|---------|---------|-----------|----------------|
| Scale to Zero | ❌ | ✅ | ✅ |
| Cold Start | ~5-30s | ~100ms-2s | ~2-10s |
| Max Timeout | Unlimited | 60 min | 30 min |
| GPU Support | ✅ | ✅ | ❌ |
| Min Billing | 1 min | 100ms | 1 min |
| VPC Integration | Native | Via connector | Native |
| Event Triggers | Via EventBridge | Pub/Sub, direct | KEDA (many) |
| gRPC | ✅ | ✅ | ✅ |
| WebSocket | ✅ | ✅ (60 min) | ✅ |

## Cost Comparison

For a workload with 1M requests/month, 500ms average duration:

```
AWS Fargate (always-on):
  - 2 tasks × 0.25 vCPU × 0.5 GB × 720 hours
  - ~$25-35/month

Google Cloud Run (scale-to-zero):
  - 1M requests × 500ms × 0.5 vCPU × 0.5 GB
  - ~$5-15/month

Azure Container Apps (scale-to-zero):
  - 1M requests × 500ms × 0.5 vCPU × 1 GB
  - ~$8-18/month
```

**Winner for cost:** Cloud Run (request-based billing wins for variable workloads)

## When to Choose Each

### Choose Fargate When:
- You're already deep in AWS
- You need long-running background jobs
- GPU workloads are required
- You want Spot capacity savings
- Complex VPC networking is needed

### Choose Cloud Run When:
- Developer experience is priority
- Workloads are bursty/variable
- You want true scale-to-zero
- Fast cold starts matter
- Simple HTTP services

### Choose Container Apps When:
- You need Dapr for microservices
- Event-driven scaling (Kafka, queues)
- Microsoft/Azure shop
- You want Kubernetes-like but simpler
- Revision-based deployments

## Real Architecture Example

Here's a production setup using Cloud Run:

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/api:$COMMIT_SHA', '.']
  
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/api:$COMMIT_SHA']
  
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'api'
      - '--image=gcr.io/$PROJECT_ID/api:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
      - '--no-traffic'  # Deploy without traffic
  
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'services'
      - 'update-traffic'
      - 'api'
      - '--to-latest'  # Gradual rollout after health checks
```

## Conclusion

All three platforms are production-ready. Your choice depends on:

1. **Existing cloud investment** - Use what you know
2. **Workload patterns** - Bursty = scale-to-zero matters
3. **Cold start sensitivity** - Cloud Run wins here
4. **Complexity tolerance** - Cloud Run < Container Apps < Fargate

For most new projects, I'd start with Cloud Run. It's the simplest path from container to production. If you need more control or AWS ecosystem, go Fargate. If you're building event-driven microservices on Azure, Container Apps is compelling.

The serverless container future is here. Pick your platform and ship.

---

*What's your serverless container platform of choice? Let me know in the comments.*
