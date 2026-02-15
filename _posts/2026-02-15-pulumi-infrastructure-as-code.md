---
layout: post
title: "Pulumi: Infrastructure as Code with Real Programming Languages"
subtitle: "Move beyond YAML and HCL—define cloud infrastructure using TypeScript, Python, Go, or C#"
date: 2026-02-15
author: "Dev Star"
header-img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200"
tags: [Pulumi, Infrastructure as Code, IaC, DevOps, Cloud, AWS, Terraform, TypeScript]
---

# Pulumi: Infrastructure as Code with Real Programming Languages

Infrastructure as Code has evolved beyond YAML and domain-specific languages. Pulumi lets you define cloud resources using TypeScript, Python, Go, C#, or Java—bringing software engineering practices like abstraction, testing, and IDE support to infrastructure management.

![Cloud Computing](https://images.unsplash.com/photo-1560732488-6b0df240254a?w=800)
*Photo by [Pero Kalimero](https://unsplash.com/@pericakalimeansen) on Unsplash*

## Why Pulumi?

| Feature | Terraform | Pulumi |
|---------|-----------|--------|
| Language | HCL | TypeScript, Python, Go, C#, Java |
| Loops | `count`, `for_each` | Native loops |
| Conditionals | Ternary only | Full conditionals |
| Testing | Limited | Unit tests, property tests |
| IDE Support | Basic | Full autocomplete, type checking |
| Abstraction | Modules | Functions, classes, packages |
| Package Manager | Registry | npm, pip, go mod |

## Getting Started

```bash
# Install Pulumi
curl -fsSL https://get.pulumi.com | sh

# Create a new project
mkdir my-infra && cd my-infra
pulumi new aws-typescript

# Preview changes
pulumi preview

# Deploy
pulumi up
```

## Basic AWS Infrastructure

```typescript
// index.ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Create a VPC
const vpc = new aws.ec2.Vpc("main-vpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: {
        Name: "main-vpc",
        Environment: pulumi.getStack(),
    },
});

// Create public subnets
const publicSubnets = ["10.0.1.0/24", "10.0.2.0/24"].map((cidr, index) => {
    return new aws.ec2.Subnet(`public-subnet-${index}`, {
        vpcId: vpc.id,
        cidrBlock: cidr,
        availabilityZone: `us-west-2${["a", "b"][index]}`,
        mapPublicIpOnLaunch: true,
        tags: {
            Name: `public-subnet-${index}`,
            Type: "public",
        },
    });
});

// Create Internet Gateway
const igw = new aws.ec2.InternetGateway("igw", {
    vpcId: vpc.id,
});

// Create route table
const publicRouteTable = new aws.ec2.RouteTable("public-rt", {
    vpcId: vpc.id,
    routes: [{
        cidrBlock: "0.0.0.0/0",
        gatewayId: igw.id,
    }],
});

// Associate subnets with route table
publicSubnets.forEach((subnet, index) => {
    new aws.ec2.RouteTableAssociation(`public-rta-${index}`, {
        subnetId: subnet.id,
        routeTableId: publicRouteTable.id,
    });
});

// Export values
export const vpcId = vpc.id;
export const subnetIds = publicSubnets.map(s => s.id);
```

## Component Resources

Create reusable, encapsulated infrastructure components:

```typescript
// components/vpc.ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export interface VpcArgs {
    cidrBlock: string;
    azCount: number;
    enableNatGateway?: boolean;
    tags?: Record<string, string>;
}

export class Vpc extends pulumi.ComponentResource {
    public readonly vpc: aws.ec2.Vpc;
    public readonly publicSubnets: aws.ec2.Subnet[];
    public readonly privateSubnets: aws.ec2.Subnet[];
    
    constructor(name: string, args: VpcArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:network:Vpc", name, {}, opts);
        
        const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
        
        // Create VPC
        this.vpc = new aws.ec2.Vpc(`${name}-vpc`, {
            cidrBlock: args.cidrBlock,
            enableDnsHostnames: true,
            enableDnsSupport: true,
            tags: { ...args.tags, Name: `${name}-vpc` },
        }, defaultResourceOptions);
        
        // Get availability zones
        const azs = aws.getAvailabilityZones({ state: "available" });
        
        // Create subnets
        this.publicSubnets = [];
        this.privateSubnets = [];
        
        for (let i = 0; i < args.azCount; i++) {
            const publicSubnet = new aws.ec2.Subnet(`${name}-public-${i}`, {
                vpcId: this.vpc.id,
                cidrBlock: `10.0.${i * 2}.0/24`,
                availabilityZone: azs.then(az => az.names[i]),
                mapPublicIpOnLaunch: true,
                tags: { ...args.tags, Name: `${name}-public-${i}` },
            }, defaultResourceOptions);
            this.publicSubnets.push(publicSubnet);
            
            const privateSubnet = new aws.ec2.Subnet(`${name}-private-${i}`, {
                vpcId: this.vpc.id,
                cidrBlock: `10.0.${i * 2 + 1}.0/24`,
                availabilityZone: azs.then(az => az.names[i]),
                tags: { ...args.tags, Name: `${name}-private-${i}` },
            }, defaultResourceOptions);
            this.privateSubnets.push(privateSubnet);
        }
        
        // Register outputs
        this.registerOutputs({
            vpcId: this.vpc.id,
            publicSubnetIds: this.publicSubnets.map(s => s.id),
            privateSubnetIds: this.privateSubnets.map(s => s.id),
        });
    }
}

// Usage
const network = new Vpc("production", {
    cidrBlock: "10.0.0.0/16",
    azCount: 3,
    enableNatGateway: true,
    tags: { Environment: "production" },
});
```

## EKS Cluster

```typescript
// eks-cluster.ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";

// Create EKS cluster with managed node groups
const cluster = new eks.Cluster("my-cluster", {
    vpcId: vpc.id,
    subnetIds: privateSubnets.map(s => s.id),
    instanceType: "t3.medium",
    desiredCapacity: 3,
    minSize: 1,
    maxSize: 5,
    enabledClusterLogTypes: [
        "api",
        "audit",
        "authenticator",
    ],
    tags: {
        Environment: "production",
    },
});

// Add a managed node group
const nodeGroup = new aws.eks.NodeGroup("app-nodes", {
    clusterName: cluster.eksCluster.name,
    nodeRoleArn: cluster.instanceRoles[0].arn,
    subnetIds: privateSubnets.map(s => s.id),
    scalingConfig: {
        desiredSize: 3,
        maxSize: 10,
        minSize: 1,
    },
    instanceTypes: ["t3.large"],
    labels: {
        role: "application",
    },
    taints: [],
});

// Export kubeconfig
export const kubeconfig = cluster.kubeconfig;
```

![Server Infrastructure](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800)
*Photo by [Taylor Vick](https://unsplash.com/@tvick) on Unsplash*

## Kubernetes Resources

```typescript
// kubernetes.ts
import * as k8s from "@pulumi/kubernetes";

// Create a Kubernetes provider using the EKS kubeconfig
const k8sProvider = new k8s.Provider("k8s", {
    kubeconfig: cluster.kubeconfig,
});

// Deploy an application
const appLabels = { app: "my-app" };

const deployment = new k8s.apps.v1.Deployment("my-app", {
    metadata: { name: "my-app" },
    spec: {
        replicas: 3,
        selector: { matchLabels: appLabels },
        template: {
            metadata: { labels: appLabels },
            spec: {
                containers: [{
                    name: "my-app",
                    image: "nginx:latest",
                    ports: [{ containerPort: 80 }],
                    resources: {
                        requests: { cpu: "100m", memory: "128Mi" },
                        limits: { cpu: "500m", memory: "512Mi" },
                    },
                }],
            },
        },
    },
}, { provider: k8sProvider });

const service = new k8s.core.v1.Service("my-app-svc", {
    metadata: { name: "my-app" },
    spec: {
        type: "LoadBalancer",
        selector: appLabels,
        ports: [{ port: 80, targetPort: 80 }],
    },
}, { provider: k8sProvider });

export const serviceUrl = service.status.loadBalancer.ingress[0].hostname;
```

## Configuration and Secrets

```typescript
// config.ts
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

// Plain configuration
const environment = config.require("environment");
const instanceCount = config.getNumber("instanceCount") ?? 2;

// Secrets (encrypted in state)
const dbPassword = config.requireSecret("dbPassword");

// Use in resources
const dbInstance = new aws.rds.Instance("db", {
    instanceClass: "db.t3.micro",
    allocatedStorage: 20,
    engine: "postgres",
    username: "admin",
    password: dbPassword,  // Automatically marked as secret
});
```

Set configuration:

```bash
# Plain value
pulumi config set environment production

# Secret value (encrypted)
pulumi config set --secret dbPassword "super-secret-123"
```

## Testing Infrastructure

### Unit Tests

```typescript
// __tests__/vpc.test.ts
import * as pulumi from "@pulumi/pulumi";
import "jest";

pulumi.runtime.setMocks({
    newResource: (args: pulumi.runtime.MockResourceArgs) => {
        return { id: `${args.name}-id`, state: args.inputs };
    },
    call: (args: pulumi.runtime.MockCallArgs) => {
        return args.inputs;
    },
});

describe("VPC", () => {
    let vpc: typeof import("../index");

    beforeAll(async () => {
        vpc = await import("../index");
    });

    test("VPC has correct CIDR block", async () => {
        const cidrBlock = await new Promise<string>((resolve) => {
            vpc.vpcCidrBlock.apply(resolve);
        });
        expect(cidrBlock).toBe("10.0.0.0/16");
    });

    test("Creates correct number of subnets", async () => {
        const subnetCount = await new Promise<number>((resolve) => {
            vpc.subnetIds.apply((ids) => resolve(ids.length));
        });
        expect(subnetCount).toBe(4);
    });
});
```

### Policy as Code

```typescript
// policy.ts
import * as policy from "@pulumi/policy";

new policy.PolicyPack("aws-policies", {
    policies: [
        {
            name: "s3-no-public-read",
            description: "S3 buckets must not have public read access",
            enforcementLevel: "mandatory",
            validateResource: policy.validateResourceOfType(
                aws.s3.Bucket,
                (bucket, args, reportViolation) => {
                    if (bucket.acl === "public-read") {
                        reportViolation("S3 buckets cannot be public-read");
                    }
                }
            ),
        },
        {
            name: "ec2-require-tags",
            description: "EC2 instances must have required tags",
            enforcementLevel: "mandatory",
            validateResource: policy.validateResourceOfType(
                aws.ec2.Instance,
                (instance, args, reportViolation) => {
                    const requiredTags = ["Environment", "Owner", "Project"];
                    const tags = instance.tags || {};
                    
                    for (const tag of requiredTags) {
                        if (!tags[tag]) {
                            reportViolation(`Missing required tag: ${tag}`);
                        }
                    }
                }
            ),
        },
    ],
});
```

## Stack References

Share outputs between stacks:

```typescript
// network-stack/index.ts
export const vpcId = vpc.id;
export const privateSubnetIds = privateSubnets.map(s => s.id);

// app-stack/index.ts
const networkStack = new pulumi.StackReference("org/network-stack/production");
const vpcId = networkStack.getOutput("vpcId");
const subnetIds = networkStack.getOutput("privateSubnetIds");

const cluster = new eks.Cluster("app-cluster", {
    vpcId: vpcId,
    subnetIds: subnetIds,
});
```

## Dynamic Providers

Create custom resources:

```typescript
// custom-resource.ts
import * as pulumi from "@pulumi/pulumi";

class RandomPasswordProvider implements pulumi.dynamic.ResourceProvider {
    async create(inputs: any): Promise<pulumi.dynamic.CreateResult> {
        const crypto = await import("crypto");
        const password = crypto.randomBytes(inputs.length).toString("base64");
        
        return {
            id: crypto.randomUUID(),
            outs: { password },
        };
    }
}

export class RandomPassword extends pulumi.dynamic.Resource {
    public readonly password: pulumi.Output<string>;

    constructor(name: string, args: { length: number }, opts?: pulumi.CustomResourceOptions) {
        super(new RandomPasswordProvider(), name, { password: undefined, ...args }, opts);
    }
}

// Usage
const dbPassword = new RandomPassword("db-password", { length: 32 });
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/pulumi.yml
name: Pulumi
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  preview:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - uses: pulumi/actions@v5
        with:
          command: preview
          stack-name: org/project/dev
        env:
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

  deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - uses: pulumi/actions@v5
        with:
          command: up
          stack-name: org/project/production
        env:
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Best Practices

1. **Use Component Resources**: Encapsulate related resources
2. **Type Everything**: Leverage TypeScript's type system
3. **Test Your Infrastructure**: Unit tests and policy checks
4. **Use Stack References**: Share outputs between stacks
5. **Keep Secrets Secret**: Use `pulumi config set --secret`
6. **Tag Everything**: Consistent tagging for cost tracking
7. **Use Pulumi ESC**: Centralized secrets and configuration

## Conclusion

Pulumi brings modern software engineering to infrastructure:

- **Real Languages**: TypeScript, Python, Go, C#, Java
- **Full IDE Support**: Autocomplete, type checking, refactoring
- **Testing**: Unit tests, integration tests, policy tests
- **Abstraction**: Functions, classes, packages
- **Ecosystem**: npm, pip, go mod for sharing

Stop wrestling with YAML. Start building infrastructure with the same tools you use for application code.

---

*Ready to modernize your infrastructure as code?*
