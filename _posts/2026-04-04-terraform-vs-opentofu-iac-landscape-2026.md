---
layout: post
title: "Terraform vs OpenTofu in 2026: The IaC Landscape After the HashiCorp Fork"
subtitle: "Two years after HashiCorp's BSL license change, how has the infrastructure-as-code ecosystem evolved?"
date: 2026-04-04 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - Terraform
  - OpenTofu
  - IaC
  - Infrastructure as Code
  - DevOps
  - Cloud
  - HashiCorp
  - Platform Engineering
---

# Terraform vs OpenTofu in 2026: The IaC Landscape After the HashiCorp Fork

In August 2023, HashiCorp changed Terraform's license from MPL-2.0 to the Business Source License (BSL). The community responded by forking Terraform into **OpenTofu**, now under the Linux Foundation. Fast forward to 2026: OpenTofu has surpassed 25,000 GitHub stars, major cloud providers have added native OpenTofu support, and HashiCorp (now IBM) has continued developing Terraform commercially.

If you're choosing an IaC tool in 2026 — or deciding whether to migrate — this guide covers everything you need to know.

![Cloud infrastructure landscape](https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&auto=format&fit=crop)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

## Where Things Stand in 2026

### Terraform (HashiCorp/IBM)
- **License**: Business Source License (BSL 1.1) — free for non-competitive use
- **Current version**: 1.11.x
- **Governance**: IBM (acquired HashiCorp in late 2024)
- **Notable additions**: Stacks (multi-stack deployments), Ephemeral Values
- **Terraform Cloud/Enterprise**: Available, with Sentinel policy as code

### OpenTofu
- **License**: Mozilla Public License 2.0 (MPL-2.0) — fully open source
- **Current version**: 1.9.x
- **Governance**: Linux Foundation, community-driven
- **Notable additions**: Native state encryption, provider iteration, loopable imports, dynamic provider configuration
- **Registry**: OpenTofu Registry (opentf.org) + compatible with Terraform Registry

The codebases diverged significantly in 2025, with OpenTofu shipping features that Terraform hadn't implemented and vice versa.

## Key Feature Differences

### OpenTofu's Exclusive Features

#### 1. Native State Encryption
One of the most requested features, finally delivered in OpenTofu:

```hcl
# terraform.tf (OpenTofu)
terraform {
  encryption {
    key_provider "pbkdf2" "my_key" {
      passphrase = var.encryption_passphrase
    }

    method "aes_gcm" "state_encryption" {
      keys = key_provider.pbkdf2.my_key
    }

    state {
      method = method.aes_gcm.state_encryption
      enforced = true
    }

    plan {
      method = method.aes_gcm.state_encryption
      enforced = true
    }
  }
}
```

With AWS KMS:

```hcl
terraform {
  encryption {
    key_provider "aws_kms" "state_key" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789:key/abc-123"
      region     = "us-east-1"
    }

    method "aes_gcm" "state_method" {
      keys = key_provider.aws_kms.state_key
    }

    state {
      method = method.aes_gcm.state_method
    }
  }
}
```

Terraform still requires external solutions (S3 server-side encryption, etc.) for state encryption.

#### 2. Dynamic Provider Configuration (OpenTofu 1.8+)

```hcl
# Create multiple provider configurations dynamically
locals {
  aws_regions = ["us-east-1", "eu-west-1", "ap-southeast-1"]
}

provider "aws" {
  for_each = toset(local.aws_regions)
  alias    = each.key
  region   = each.key
}

# Use providers dynamically in modules
module "vpc" {
  for_each = toset(local.aws_regions)
  source   = "./modules/vpc"
  
  providers = {
    aws = aws[each.key]
  }
}
```

This eliminates the need for duplicated provider blocks when deploying to multiple regions.

#### 3. Loopable Import Blocks

```hcl
# Import multiple existing resources at once
import {
  for_each = {
    "web-1" = "i-1234567890abcdef0"
    "web-2" = "i-0987654321fedcba0"
    "db-1"  = "i-abcdef0123456789"
  }
  
  id = each.value
  to = aws_instance.servers[each.key]
}

resource "aws_instance" "servers" {
  for_each = toset(["web-1", "web-2", "db-1"])
  # ... configuration
}
```

### Terraform's Exclusive Features

#### 1. Stacks
Terraform Stacks (Terraform 1.9+) enable orchestrating multiple configurations:

```hcl
# stacks/production.tfstack.hcl
component "networking" {
  source  = "./components/networking"
  version = "~> 2.0"

  inputs = {
    environment = "production"
    region      = "us-east-1"
  }
}

component "application" {
  source  = "./components/application"

  inputs = {
    vpc_id     = component.networking.vpc_id
    subnet_ids = component.networking.private_subnets
  }
}
```

OpenTofu is working on a similar feature called "Stacks" but it's not yet released.

#### 2. Ephemeral Values (Terraform 1.10+)

```hcl
# Ephemeral resources — not stored in state
ephemeral "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db.id
}

resource "aws_db_instance" "main" {
  password = ephemeral.aws_secretsmanager_secret_version.db_password.secret_string
  # Password never written to state!
}
```

OpenTofu is implementing ephemeral resources in their upcoming 1.10 release.

## Migration: Terraform → OpenTofu

The migration is surprisingly straightforward. OpenTofu maintains backward compatibility:

```bash
# Option 1: Direct binary replacement (for most cases)
# Simply replace the 'terraform' binary with 'tofu'

# Install OpenTofu
brew install opentofu  # macOS
# or
curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh | sh

# Migrate state metadata
tofu init
# OpenTofu will detect existing Terraform state and migrate

# Option 2: Official migration tool
tofu state migrate
```

For CI/CD pipelines, update your workflow:

```yaml
# Before (GitHub Actions with Terraform)
- uses: hashicorp/setup-terraform@v3
  with:
    terraform_version: "1.10.0"

# After (OpenTofu)
- uses: opentofu/setup-opentofu@v1
  with:
    tofu_version: "1.9.0"

# Replace all 'terraform' commands with 'tofu'
- run: tofu init && tofu plan && tofu apply -auto-approve
```

### Gotchas During Migration

1. **Provider registry**: OpenTofu defaults to its own registry. Most Terraform providers work, but update your `required_providers`:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "registry.opentofu.org/hashicorp/aws"  # OpenTofu registry
      # or
      source  = "hashicorp/aws"  # Uses OpenTofu registry by default
      version = "~> 5.0"
    }
  }
}
```

2. **Terraform Cloud**: If you use Terraform Cloud for remote state, you'll need to migrate to either OpenTofu's compatible backend, Spacelift, Atlantis, or another solution.

3. **Sentinel policies**: Terraform Enterprise's Sentinel isn't available in OpenTofu. Consider OPA (Open Policy Agent) as an alternative.

## Modern IaC Tooling Ecosystem

Beyond Terraform/OpenTofu, the IaC landscape in 2026 includes strong alternatives worth knowing:

### Pulumi
Pulumi lets you write infrastructure in real programming languages (TypeScript, Python, Go):

```typescript
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Real TypeScript — loops, functions, conditionals
const environments = ["staging", "production"];

const clusters = environments.map(env => 
  new aws.ecs.Cluster(`${env}-cluster`, {
    tags: { Environment: env }
  })
);

// Type-safe — catch errors at compile time
const lb = new awsx.lb.ApplicationLoadBalancer("app-lb", {
  subnetIds: vpc.publicSubnetIds,
});
```

**When to choose Pulumi**: Teams comfortable with TypeScript/Python who want type safety and full programming language features.

### AWS CDK / CDK for Terraform
CDK synthesizes to CloudFormation or Terraform HCL:

```python
# CDK for Terraform (CDKTF) - Python
from cdktf import App, TerraformStack
from cdktf_cdktf_provider_aws.vpc import Vpc

class NetworkStack(TerraformStack):
    def __init__(self, scope, id):
        super().__init__(scope, id)
        
        vpc = Vpc(self, "main",
            cidr_block="10.0.0.0/16",
            tags={"Name": "production-vpc"}
        )
```

### Crossplane
For Kubernetes-native infrastructure management:

```yaml
# Declare cloud resources as Kubernetes objects
apiVersion: ec2.aws.upbound.io/v1beta1
kind: VPC
metadata:
  name: production-vpc
spec:
  forProvider:
    region: us-east-1
    cidrBlock: 10.0.0.0/16
    enableDnsHostnames: true
  providerConfigRef:
    name: aws-provider
```

**When to choose Crossplane**: Teams already deep in Kubernetes who want to manage cloud resources the same way they manage Kubernetes resources.

## Choosing in 2026

| Scenario | Recommendation |
|----------|---------------|
| New OSS project | OpenTofu |
| Existing Terraform, no Cloud/Enterprise | Migrate to OpenTofu |
| Using Terraform Enterprise + Sentinel | Terraform (stay for now) |
| TypeScript/Python-first team | Consider Pulumi |
| Kubernetes-native platform team | Consider Crossplane |
| AWS-only workloads | Consider AWS CDK |
| Multi-cloud, maximum flexibility | OpenTofu |

## The State of the IaC Wars

Despite the ecosystem fragmentation, **HCL-based IaC (Terraform/OpenTofu) remains dominant** for good reasons:
- Enormous module ecosystem (Terraform Registry has 15,000+ providers)
- Declarative syntax that's approachable for operations teams
- State management is battle-tested at scale
- Massive community knowledge base

OpenTofu has proven itself as a viable, actively-developed alternative. For open source projects and companies concerned about BSL restrictions, OpenTofu is the clear choice. For enterprises deeply integrated with HashiCorp's commercial stack (Vault, Consul, Nomad, Terraform Enterprise), there are still reasons to stick with Terraform.

The good news: if you need to switch, the migration path is well-worn and generally pain-free.

---

*Have you migrated from Terraform to OpenTofu? Share your experience in the comments.*
