---
layout: post
title: "Pulumi for Multi-Cloud: Infrastructure as Code with Real Programming Languages"
subtitle: "Master multi-cloud infrastructure management using TypeScript, Python, and Go with Pulumi's modern IaC approach"
date: 2026-02-12
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200"
tags: [Pulumi, Infrastructure as Code, Multi-Cloud, DevOps, Cloud Architecture]
---

# Pulumi for Multi-Cloud: Infrastructure as Code with Real Programming Languages

Infrastructure as Code (IaC) has evolved beyond declarative YAML configurations. Pulumi brings the power of real programming languages—TypeScript, Python, Go, C#, and Java—to infrastructure management, enabling developers to apply software engineering best practices to cloud infrastructure.

![Cloud Infrastructure](https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800)
*Photo by [Pero Kalimero](https://unsplash.com/@peterkal) on Unsplash*

## Why Pulumi Over Terraform?

| Feature | Pulumi | Terraform |
|---------|--------|-----------|
| Language | TypeScript, Python, Go, C#, Java | HCL |
| IDE Support | Full (autocomplete, refactoring) | Limited |
| Testing | Native unit/integration tests | Separate tools |
| Loops/Conditions | Native language constructs | Limited HCL syntax |
| Package Management | npm, pip, go mod | Terraform Registry |
| State Management | Pulumi Cloud or self-hosted | Terraform Cloud or self-hosted |

## Getting Started

### Installation

```bash
# macOS
brew install pulumi

# Linux
curl -fsSL https://get.pulumi.com | sh

# Verify
pulumi version
```

### Creating Your First Project

```bash
# TypeScript project for AWS
pulumi new aws-typescript

# Python project for Azure
pulumi new azure-python

# Go project for GCP
pulumi new gcp-go
```

## Multi-Cloud Architecture with TypeScript

### Project Structure

```
infrastructure/
├── Pulumi.yaml
├── Pulumi.dev.yaml
├── Pulumi.prod.yaml
├── index.ts
├── aws/
│   ├── vpc.ts
│   ├── eks.ts
│   └── rds.ts
├── azure/
│   ├── vnet.ts
│   ├── aks.ts
│   └── cosmosdb.ts
├── gcp/
│   ├── vpc.ts
│   ├── gke.ts
│   └── cloudsql.ts
└── shared/
    ├── types.ts
    └── config.ts
```

### Shared Configuration

```typescript
// shared/config.ts
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

export interface EnvironmentConfig {
  environment: string;
  region: {
    aws: string;
    azure: string;
    gcp: string;
  };
  kubernetes: {
    nodeCount: number;
    nodeSize: string;
    version: string;
  };
  database: {
    instanceClass: string;
    storageGb: number;
  };
}

export const envConfig: EnvironmentConfig = {
  environment: pulumi.getStack(),
  region: {
    aws: config.get("aws-region") || "us-west-2",
    azure: config.get("azure-region") || "westus2",
    gcp: config.get("gcp-region") || "us-west1",
  },
  kubernetes: {
    nodeCount: config.getNumber("k8s-nodes") || 3,
    nodeSize: config.get("k8s-size") || "medium",
    version: config.get("k8s-version") || "1.29",
  },
  database: {
    instanceClass: config.get("db-class") || "db.t3.medium",
    storageGb: config.getNumber("db-storage") || 100,
  },
};
```

### AWS Infrastructure Module

```typescript
// aws/eks.ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import { envConfig } from "../shared/config";

export interface EksClusterResult {
  cluster: eks.Cluster;
  kubeconfig: pulumi.Output<string>;
  oidcProvider: aws.iam.OpenIdConnectProvider;
}

export function createEksCluster(
  vpc: aws.ec2.Vpc,
  privateSubnets: aws.ec2.Subnet[]
): EksClusterResult {
  // IAM role for EKS
  const clusterRole = new aws.iam.Role("eks-cluster-role", {
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [{
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: { Service: "eks.amazonaws.com" }
      }]
    })
  });

  // Attach required policies
  new aws.iam.RolePolicyAttachment("eks-cluster-policy", {
    role: clusterRole,
    policyArn: "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  });

  // Create EKS cluster
  const cluster = new eks.Cluster("main-cluster", {
    vpcId: vpc.id,
    subnetIds: privateSubnets.map(s => s.id),
    instanceType: getInstanceType(envConfig.kubernetes.nodeSize),
    desiredCapacity: envConfig.kubernetes.nodeCount,
    minSize: 1,
    maxSize: envConfig.kubernetes.nodeCount * 2,
    version: envConfig.kubernetes.version,
    nodeAssociatePublicIpAddress: false,
    enabledClusterLogTypes: [
      "api",
      "audit",
      "authenticator",
      "controllerManager",
      "scheduler"
    ],
    tags: {
      Environment: envConfig.environment,
      ManagedBy: "pulumi"
    }
  });

  // OIDC provider for IAM roles for service accounts
  const oidcProvider = new aws.iam.OpenIdConnectProvider("eks-oidc", {
    clientIdLists: ["sts.amazonaws.com"],
    thumbprintLists: ["9e99a48a9960b14926bb7f3b02e22da2b0ab7280"],
    url: cluster.core.oidcProvider.url
  });

  return {
    cluster,
    kubeconfig: cluster.kubeconfig,
    oidcProvider
  };
}

function getInstanceType(size: string): string {
  const sizeMap: Record<string, string> = {
    small: "t3.medium",
    medium: "t3.large",
    large: "t3.xlarge",
    xlarge: "t3.2xlarge"
  };
  return sizeMap[size] || "t3.large";
}
```

### Azure Kubernetes Service Module

```typescript
// azure/aks.ts
import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import { envConfig } from "../shared/config";

export interface AksClusterResult {
  cluster: azure.containerservice.ManagedCluster;
  kubeconfig: pulumi.Output<string>;
}

export function createAksCluster(
  resourceGroup: azure.resources.ResourceGroup,
  vnet: azure.network.VirtualNetwork,
  subnet: azure.network.Subnet
): AksClusterResult {
  const cluster = new azure.containerservice.ManagedCluster("aks-cluster", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    dnsPrefix: `aks-${envConfig.environment}`,
    kubernetesVersion: envConfig.kubernetes.version,
    
    identity: {
      type: "SystemAssigned"
    },
    
    agentPoolProfiles: [{
      name: "default",
      count: envConfig.kubernetes.nodeCount,
      vmSize: getVmSize(envConfig.kubernetes.nodeSize),
      mode: "System",
      osType: "Linux",
      vnetSubnetID: subnet.id,
      enableAutoScaling: true,
      minCount: 1,
      maxCount: envConfig.kubernetes.nodeCount * 2
    }],
    
    networkProfile: {
      networkPlugin: "azure",
      networkPolicy: "calico",
      serviceCidr: "10.0.0.0/16",
      dnsServiceIP: "10.0.0.10"
    },
    
    addonProfiles: {
      omsagent: {
        enabled: true,
        config: {
          logAnalyticsWorkspaceResourceID: createLogWorkspace(resourceGroup).id
        }
      }
    },
    
    tags: {
      Environment: envConfig.environment,
      ManagedBy: "pulumi"
    }
  });

  const kubeconfig = pulumi.all([
    resourceGroup.name,
    cluster.name
  ]).apply(([rgName, clusterName]) =>
    azure.containerservice.listManagedClusterUserCredentials({
      resourceGroupName: rgName,
      resourceName: clusterName
    }).then(creds => {
      const encoded = creds.kubeconfigs[0].value;
      return Buffer.from(encoded, "base64").toString("utf-8");
    })
  );

  return { cluster, kubeconfig };
}

function getVmSize(size: string): string {
  const sizeMap: Record<string, string> = {
    small: "Standard_D2s_v3",
    medium: "Standard_D4s_v3",
    large: "Standard_D8s_v3",
    xlarge: "Standard_D16s_v3"
  };
  return sizeMap[size] || "Standard_D4s_v3";
}
```

![Network Connections](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800)
*Photo by [Taylor Vick](https://unsplash.com/@tvick) on Unsplash*

### GCP Google Kubernetes Engine Module

```typescript
// gcp/gke.ts
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import { envConfig } from "../shared/config";

export interface GkeClusterResult {
  cluster: gcp.container.Cluster;
  kubeconfig: pulumi.Output<string>;
}

export function createGkeCluster(
  network: gcp.compute.Network,
  subnet: gcp.compute.Subnetwork
): GkeClusterResult {
  const cluster = new gcp.container.Cluster("gke-cluster", {
    location: envConfig.region.gcp,
    network: network.name,
    subnetwork: subnet.name,
    
    // Use separately managed node pool
    removeDefaultNodePool: true,
    initialNodeCount: 1,
    
    minMasterVersion: envConfig.kubernetes.version,
    
    workloadIdentityConfig: {
      workloadPool: `${gcp.config.project}.svc.id.goog`
    },
    
    privateClusterConfig: {
      enablePrivateNodes: true,
      enablePrivateEndpoint: false,
      masterIpv4CidrBlock: "172.16.0.0/28"
    },
    
    ipAllocationPolicy: {
      clusterSecondaryRangeName: "pods",
      servicesSecondaryRangeName: "services"
    },
    
    addonsConfig: {
      httpLoadBalancing: { disabled: false },
      horizontalPodAutoscaling: { disabled: false },
      gcePersistentDiskCsiDriverConfig: { enabled: true }
    },
    
    resourceLabels: {
      environment: envConfig.environment,
      managed_by: "pulumi"
    }
  });

  // Create node pool
  const nodePool = new gcp.container.NodePool("primary-nodes", {
    cluster: cluster.name,
    location: envConfig.region.gcp,
    nodeCount: envConfig.kubernetes.nodeCount,
    
    autoscaling: {
      minNodeCount: 1,
      maxNodeCount: envConfig.kubernetes.nodeCount * 2
    },
    
    nodeConfig: {
      machineType: getMachineType(envConfig.kubernetes.nodeSize),
      diskSizeGb: 100,
      diskType: "pd-ssd",
      
      oauthScopes: [
        "https://www.googleapis.com/auth/cloud-platform"
      ],
      
      workloadMetadataConfig: {
        mode: "GKE_METADATA"
      },
      
      shieldedInstanceConfig: {
        enableSecureBoot: true,
        enableIntegrityMonitoring: true
      }
    },
    
    management: {
      autoUpgrade: true,
      autoRepair: true
    }
  });

  const kubeconfig = pulumi.all([
    cluster.name,
    cluster.endpoint,
    cluster.masterAuth
  ]).apply(([name, endpoint, auth]) => `
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: ${auth.clusterCaCertificate}
    server: https://${endpoint}
  name: ${name}
contexts:
- context:
    cluster: ${name}
    user: ${name}
  name: ${name}
current-context: ${name}
users:
- name: ${name}
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: gke-gcloud-auth-plugin
      installHint: Install gke-gcloud-auth-plugin
      provideClusterInfo: true
`);

  return { cluster, kubeconfig };
}

function getMachineType(size: string): string {
  const sizeMap: Record<string, string> = {
    small: "e2-medium",
    medium: "e2-standard-4",
    large: "e2-standard-8",
    xlarge: "e2-standard-16"
  };
  return sizeMap[size] || "e2-standard-4";
}
```

## Testing Infrastructure Code

### Unit Tests with Jest

```typescript
// __tests__/aws/eks.test.ts
import * as pulumi from "@pulumi/pulumi";
import "jest";

// Mock Pulumi runtime
pulumi.runtime.setMocks({
  newResource: (args: pulumi.runtime.MockResourceArgs) => {
    return {
      id: `${args.name}-id`,
      state: args.inputs
    };
  },
  call: (args: pulumi.runtime.MockCallArgs) => {
    return args.inputs;
  }
});

describe("EKS Cluster", () => {
  let eksModule: typeof import("../aws/eks");

  beforeAll(async () => {
    eksModule = await import("../aws/eks");
  });

  it("creates cluster with correct node count", async () => {
    const vpc = { id: "vpc-123" } as any;
    const subnets = [{ id: "subnet-1" }, { id: "subnet-2" }] as any[];
    
    const result = eksModule.createEksCluster(vpc, subnets);
    
    const desiredCapacity = await new Promise(resolve =>
      result.cluster.desiredCapacity.apply(resolve)
    );
    
    expect(desiredCapacity).toBeGreaterThanOrEqual(1);
  });

  it("enables required logging types", async () => {
    const vpc = { id: "vpc-123" } as any;
    const subnets = [{ id: "subnet-1" }] as any[];
    
    const result = eksModule.createEksCluster(vpc, subnets);
    
    const logTypes = await new Promise(resolve =>
      result.cluster.enabledClusterLogTypes.apply(resolve)
    );
    
    expect(logTypes).toContain("api");
    expect(logTypes).toContain("audit");
  });
});
```

### Integration Tests with Pulumi Automation API

```typescript
// __tests__/integration/deploy.test.ts
import { LocalWorkspace, Stack } from "@pulumi/pulumi/automation";

describe("Multi-Cloud Deployment", () => {
  let stack: Stack;

  beforeAll(async () => {
    stack = await LocalWorkspace.createOrSelectStack({
      stackName: "test",
      workDir: "."
    });
    
    await stack.setConfig("aws-region", { value: "us-west-2" });
    await stack.setConfig("k8s-nodes", { value: "2" });
  }, 60000);

  afterAll(async () => {
    await stack.destroy();
  }, 300000);

  it("deploys infrastructure successfully", async () => {
    const result = await stack.up({ onOutput: console.log });
    
    expect(result.summary.result).toBe("succeeded");
    expect(result.outputs["eksClusterName"]).toBeDefined();
    expect(result.outputs["aksClusterName"]).toBeDefined();
    expect(result.outputs["gkeClusterName"]).toBeDefined();
  }, 600000);
});
```

## CI/CD Pipeline Integration

### GitHub Actions Workflow

{% raw %}
```yaml
# .github/workflows/infrastructure.yml
name: Infrastructure Deployment

on:
  push:
    branches: [main]
    paths: ['infrastructure/**']
  pull_request:
    branches: [main]
    paths: ['infrastructure/**']

env:
  PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}

jobs:
  preview:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        working-directory: infrastructure
        run: npm ci
        
      - name: Configure cloud credentials
        run: |
          aws configure set aws_access_key_id ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws configure set aws_secret_access_key ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          
      - name: Pulumi Preview
        uses: pulumi/actions@v5
        with:
          command: preview
          stack-name: dev
          work-dir: infrastructure

  deploy:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        working-directory: infrastructure
        run: npm ci
        
      - name: Configure cloud credentials
        run: |
          aws configure set aws_access_key_id ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws configure set aws_secret_access_key ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          echo '${{ secrets.AZURE_CREDENTIALS }}' > azure-creds.json
          echo '${{ secrets.GCP_CREDENTIALS }}' > gcp-creds.json
          
      - name: Pulumi Deploy
        uses: pulumi/actions@v5
        with:
          command: up
          stack-name: prod
          work-dir: infrastructure
```
{% endraw %}

## Best Practices

1. **Use Component Resources** for reusable infrastructure patterns
2. **Implement stack references** for cross-stack dependencies
3. **Store secrets** using Pulumi's built-in secret management
4. **Tag all resources** consistently for cost tracking
5. **Use policy packs** for compliance enforcement

## Conclusion

Pulumi transforms infrastructure management by bringing software engineering practices to cloud operations. With support for multiple programming languages and cloud providers, it enables teams to build, test, and deploy infrastructure with confidence across any cloud environment.

## Resources

- [Pulumi Documentation](https://www.pulumi.com/docs/)
- [Pulumi Examples](https://github.com/pulumi/examples)
- [Pulumi Registry](https://www.pulumi.com/registry/)
- [Pulumi AI](https://www.pulumi.com/ai)
