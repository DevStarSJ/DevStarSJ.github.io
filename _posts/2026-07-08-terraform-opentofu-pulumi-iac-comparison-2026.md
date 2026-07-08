---
layout: post
title: "Terraform vs. OpenTofu vs. Pulumi: Infrastructure as Code in 2026"
subtitle: "HashiCorp's license change created a fork — here's how the IaC landscape looks now and what to choose"
date: 2026-07-08 12:00:00
author: "Groot"
header-img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80"
catalog: true
tags:
  - Terraform
  - OpenTofu
  - Pulumi
  - IaC
  - DevOps
  - Cloud
  - Infrastructure
---

# Terraform vs. OpenTofu vs. Pulumi: Infrastructure as Code in 2026

The Infrastructure as Code (IaC) landscape shifted dramatically in August 2023 when HashiCorp changed Terraform's license from open-source MPL 2.0 to the Business Source License (BSL). For many organizations, BSL is incompatible with their commercial or internal use constraints. The community's response was swift: **OpenTofu** forked from Terraform 1.5 and joined the Linux Foundation.

Two years later, in 2026, the dust has settled into a clear three-horse race. Here's where things stand and how to choose.

![Cloud infrastructure servers](https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80)
*Photo by [NASA](https://unsplash.com/@nasa) on Unsplash*

## The Terraform Licensing Situation

HashiCorp (now owned by IBM since 2024) has repositioned Terraform under the BSL. The key restriction: you cannot use Terraform to build a competing product or service that "competes with HashiCorp."

For most end-user companies using Terraform to manage their own cloud infrastructure, BSL does **not** restrict their use. You can keep using Terraform free of charge for internal infrastructure management.

However, BSL creates concerns for:
- **SaaS platforms** that wrap Terraform and offer IaC automation to customers
- **Consulting firms** reselling Terraform-based automation as a product
- **Open-source tools** that depend on Terraform as a component

For these use cases, OpenTofu is the answer.

## OpenTofu: The True Open-Source Fork

OpenTofu is now on version 1.9+ (as of mid-2026), having diverged from Terraform's feature set with several independently developed capabilities:

**Key OpenTofu-only features:**
- **State encryption at rest** (native, without third-party backends)
- **`for_each` on `provider` blocks** (long-requested, not yet in Terraform)
- **`removed` block** (remove resources from state without destroying them)
- **Registry.opentofu.org** (fully open, no rate limits for provider downloads)

```hcl
# OpenTofu - State encryption (native feature)
terraform {
  encryption {
    key_provider "pbkdf2" "main" {
      passphrase = var.state_encryption_key
    }
    method "aes_gcm" "default" {
      keys = key_provider.pbkdf2.main
    }
    state {
      method = method.aes_gcm.default
    }
  }
  
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}
```

**Migration from Terraform to OpenTofu:**

```bash
# Install OpenTofu
brew install opentofu

# In your existing Terraform directory
tofu init   # instead of terraform init
tofu plan   # same flags, same output format
tofu apply  # drop-in replacement
```

The migration is genuinely seamless for most configurations. OpenTofu maintains HCL syntax compatibility and can read Terraform state files directly.

## Pulumi: General-Purpose Languages for IaC

Pulumi takes a fundamentally different approach: instead of a domain-specific language (HCL), you write infrastructure in real programming languages — TypeScript, Python, Go, Java, C#, or YAML.

```typescript
// Pulumi TypeScript - Full language power
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Create a VPC with sensible defaults
const vpc = new awsx.ec2.Vpc("production-vpc", {
    numberOfAvailabilityZones: 3,
    natGateways: { strategy: "Single" },
});

// Create ECS cluster
const cluster = new aws.ecs.Cluster("app-cluster", {
    settings: [{
        name: "containerInsights",
        value: "enabled",
    }],
});

// Fargate service with load balancer - all in one
const service = new awsx.ecs.FargateService("api-service", {
    cluster: cluster.arn,
    taskDefinitionArgs: {
        containers: {
            api: {
                image: awsx.ecr.buildAndPushImage("api", {
                    context: "./app",
                }).imageUri,
                memory: 512,
                portMappings: [{ containerPort: 3000, protocol: "tcp" }],
                environment: [
                    { name: "NODE_ENV", value: "production" },
                    { name: "DATABASE_URL", value: dbSecret.secretString },
                ],
            },
        },
    },
    desiredCount: 3,
    loadBalancers: [{ /* ... */ }],
});

export const serviceUrl = loadBalancer.dnsName;
```

**Pulumi strengths:**

1. **Real loops and conditionals** — no HCL workarounds for complex iteration
2. **Type safety** — TypeScript catches provider API mismatches at compile time
3. **Testing** — unit test your infrastructure with Jest/pytest/go test
4. **Reuse** — publish infrastructure components as npm/PyPI packages
5. **Secret handling** — `pulumi.secret()` encrypts sensitive values in state natively
6. **Automation API** — embed Pulumi in your own Go/Python/TypeScript programs

**Pulumi weaknesses:**
- Steeper learning curve for non-developers (HCL is more accessible for Ops-focused teams)
- Larger state management complexity
- The Pulumi SaaS backend is recommended but requires either their service or self-hosted alternatives

![Technology abstract network](https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80)
*Photo by [Alexandre Debiève](https://unsplash.com/@alexkixa) on Unsplash*

## Side-by-Side Comparison

| Feature | Terraform | OpenTofu | Pulumi |
|---|---|---|---|
| Language | HCL | HCL | TS/Python/Go/Java/C# |
| License | BSL 1.1 | MPL 2.0 (true OSS) | Apache 2.0 |
| State encryption | Enterprise only | ✅ Native | ✅ Native |
| Provider ecosystem | Largest | Same as TF (compatible) | Good (uses TF providers via bridge) |
| Testing | `terraform test` | `tofu test` | Full unit testing |
| CD integration | Atlantis, Spacelift | Atlantis, Spacelift, Env0 | Pulumi Deployments |
| Learning curve | Low (HCL) | Low (HCL) | Moderate (real lang) |
| Drift detection | Weak | Weak | Better |

## Module Compatibility

All three tools share the same provider plugin ecosystem at the binary level (Terraform providers work with OpenTofu). Pulumi bridges Terraform providers through its Terraform Provider SDK bridge, giving access to 1,200+ providers.

```hcl
# This HCL works identically in Terraform and OpenTofu
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "production"
  cluster_version = "1.30"

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    general = {
      min_size     = 2
      max_size     = 10
      desired_size = 3
      instance_types = ["m7g.xlarge"]
    }
  }
}
```

## The Verdict: Which One to Use in 2026

**Use Terraform (BSL) if:**
- Your use case is unambiguously internal infrastructure management
- You're invested in HashiCorp's ecosystem (Vault, Consul, HCP Terraform)
- Your team has deep Terraform expertise and no compliance concerns about BSL

**Use OpenTofu if:**
- You need true open-source compliance (FOSS policies, legal requirements)
- You want native state encryption
- You're a platform or tool builder that wraps IaC functionality
- You want to avoid vendor lock-in risk from a BSL license

**Use Pulumi if:**
- Your team is primarily developers (not traditional Ops/Infra)
- Infrastructure complexity demands real programming constructs (complex loops, conditional logic, data transformations)
- You want to unit test infrastructure code
- You're building infrastructure as a reusable library/product

**Use both (hybrid approach):**
Many teams use Pulumi for application infrastructure (ECS services, Lambda functions, databases per app) while keeping foundational infrastructure (VPCs, IAM foundations, shared services) in OpenTofu/Terraform. This is increasingly common and works well.

## The Elephant in the Room: AWS CDK and Bicep

AWS CDK (using TypeScript/Python) and Azure Bicep compete in this space but are cloud-specific. If you're single-cloud and developer-focused, CDK is excellent. For multi-cloud or cloud-agnostic infrastructure, Terraform/OpenTofu/Pulumi remain superior.

## Conclusion

The IaC landscape in 2026 offers clearer choices than ever. OpenTofu has delivered on its promise as a true open-source Terraform fork with meaningful improvements. Pulumi has matured into a compelling choice for developer-centric teams. Terraform itself remains viable for organizations without BSL concerns.

The "just use Terraform" default answer of 2020 is no longer quite right. Evaluate your licensing constraints, team composition, and infrastructure complexity — then choose deliberately.

---

*Has your team migrated from Terraform to OpenTofu? What drove the decision? Or are you on Pulumi? Share your experience in the comments.*
