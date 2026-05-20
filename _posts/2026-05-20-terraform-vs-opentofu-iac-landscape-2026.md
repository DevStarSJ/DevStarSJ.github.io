---
layout: post
title: "Terraform vs OpenTofu in 2026: The State of Infrastructure as Code After the Fork"
subtitle: "Two years after the license change, how has the IaC landscape evolved and which tool should you choose?"
date: 2026-05-20 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - Terraform
  - OpenTofu
  - Infrastructure as Code
  - IaC
  - DevOps
  - Cloud
---

# Terraform vs OpenTofu in 2026: The State of Infrastructure as Code After the Fork

In August 2023, HashiCorp changed Terraform's license from the Mozilla Public License (MPL 2.0) to the Business Source License (BSL 1.1) — a move that effectively prevented competitors from using Terraform in commercial products. The community responded with **OpenTofu**, an open-source fork backed by the Linux Foundation. By 2026, two mature, diverging products exist. Here's where they stand and how teams should think about the choice.

![Infrastructure as Code](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop)
*Photo by [Lars Kienle](https://unsplash.com/@larskienle) on Unsplash*

---

## The Backstory (Short Version)

**HashiCorp** → Terraform (BSL 1.1 license since August 2023, acquired by IBM in 2024)  
**OpenTofu** → Linux Foundation project, true MPL 2.0 fork, maintained by community + major cloud/platform companies

The license change was controversial but HashiCorp's reasoning was sound for a commercial company: Terraform was being used by direct competitors (Pulumi, env0, Spacelift) without contribution back. IBM's acquisition in 2024 accelerated commercial focus on Terraform Cloud and HCP (HashiCorp Cloud Platform).

The fork started as a near-identical copy but has since diverged in meaningful ways.

---

## Feature Comparison: Where They've Diverged

As of mid-2026, OpenTofu has shipped several features that Terraform hasn't:

### 1. State Encryption (OpenTofu Only)

One of the most requested Terraform features for years:

```hcl
# opentofu >= 1.7
terraform {
  encryption {
    key_provider "pbkdf2" "my_key" {
      passphrase = var.state_passphrase
    }
    
    method "aes_gcm" "encrypt_state" {
      keys = key_provider.pbkdf2.my_key
    }
    
    state {
      method = method.aes_gcm.encrypt_state
    }
    
    plan {
      method = method.aes_gcm.encrypt_state
    }
  }
}
```

This encrypts state files at rest in S3/GCS/Azure Blob with customer-managed keys. In regulated industries (HIPAA, PCI, FedRAMP), this removes a significant compliance barrier.

### 2. `provider_functions` and Enhanced Functions

OpenTofu 1.8+ allows provider-contributed functions:

```hcl
# Providers can now export custom functions
output "encoded_arn" {
  value = provider::aws::arn_parse(aws_instance.web.arn).account_id
}
```

### 3. `for_each` on Module Calls with Complex Objects

```hcl
# OpenTofu supports more complex for_each expressions on modules
module "service" {
  for_each = {
    for svc in var.services : svc.name => svc
    if svc.enabled
  }
  source    = "./modules/service"
  name      = each.value.name
  config    = each.value.config
}
```

### 4. `tofu test` Improvements

OpenTofu's testing framework (based on the upstream `terraform test` feature) has shipped faster iterations with better mock support and parallel test execution.

---

## What Terraform Still Has

Terraform isn't standing still either:

**Terraform Stacks (HCP-native)**: A new abstraction for managing multiple configurations as a single deployable unit — designed for complex multi-environment/multi-region deployments. Currently HCP-only (no OSS equivalent).

```hcl
# stacks/production/production.tfstack.hcl
component "networking" {
  source = "./components/networking"
  inputs = { region = "us-east-1", env = "prod" }
}

component "eks_cluster" {
  source = "./components/eks"
  inputs = {
    vpc_id = component.networking.vpc_id
    env    = "prod"
  }
}
```

**CDK for Terraform (CDKTF)**: Increasingly mature, especially for teams already using TypeScript or Python CDK for AWS.

**Terraform Cloud/HCP ecosystem**: Policy as Code (Sentinel), cost estimation, private module registry — still best-in-class for managed Terraform.

---

## Migration: Terraform → OpenTofu

The migration is remarkably straightforward for most configurations:

```bash
# Install OpenTofu
brew install opentofu

# For existing state, no migration needed — OpenTofu reads Terraform state
cd your-terraform-project

# Initialize with OpenTofu
tofu init

# Validate everything looks correct
tofu plan

# Update provider locks
tofu providers lock
```

Caveats:
- **Custom provider plugins**: any provider using BSL libraries needs evaluation
- **Terraform Cloud/HCP**: if using remote operations, you'll need to migrate to OpenTofu Cloud or self-hosted alternatives (Scalr, env0, Atlantis)
- **Sentinel policies**: need to migrate to OpenTofu's OPA (Open Policy Agent) integration

---

## Alternative: Pulumi

No IaC discussion in 2026 is complete without **Pulumi**. If you're greenfield, it's worth serious consideration:

```typescript
// TypeScript-native infrastructure — real language, real IDE support
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";

const cluster = new eks.Cluster("prod-cluster", {
  nodeGroupOptions: {
    instanceType: "m6i.large",
    desiredCapacity: 3,
    minSize: 1,
    maxSize: 10,
  },
  enabledClusterLogTypes: ["api", "audit"],
});

// Actual loops and conditionals — no HCL limitations
const buckets = ["assets", "backups", "logs"].map(
  (name) => new aws.s3.Bucket(`${name}-bucket`, {
    acl: "private",
    serverSideEncryptionConfiguration: {
      rule: {
        applyServerSideEncryptionByDefault: {
          sseAlgorithm: "aws:kms",
        },
      },
    },
  })
);

export const clusterName = cluster.eksCluster.name;
export const bucketNames = buckets.map(b => b.bucket);
```

Pulumi's advantage: **real programming languages** mean you get loops, conditionals, classes, unit testing, and IDE autocompletion without HCL's limitations. The tradeoff: less community knowledge, fewer examples, and HCL ecosystem compatibility.

---

## The OpenGitOps Picture

Both tools now integrate well with GitOps workflows. The dominant pattern:

```
Developer → PR → Terraform/OpenTofu Plan → Review → Merge → Apply
```

Tools like **Atlantis** (self-hosted) and **Digger** (GitHub Actions-native) handle this well for both Terraform and OpenTofu.

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  pull_request:
    paths: ["infrastructure/**"]

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.9.0"
      
      - name: OpenTofu Plan
        id: plan
        run: |
          tofu init
          tofu plan -out=tfplan -no-color
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      
      - name: Comment PR with Plan
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## OpenTofu Plan\n\`\`\`\n${{ steps.plan.outputs.stdout }}\n\`\`\``
            })
```

---

## Decision Framework: Which Should You Choose?

### Use **OpenTofu** if:
- You're building open-source tools or products that include IaC
- You need state encryption as a compliance requirement
- You prefer open governance (Linux Foundation vs. IBM subsidiary)
- You want to avoid BSL license concerns in commercial products
- You're already on Terraform and want a no-drama migration path

### Use **Terraform** if:
- You're heavily invested in HCP (Terraform Cloud, Terraform Enterprise)
- You need Sentinel policy as code
- Your team size justifies the HCP collaboration features
- You want the largest community/Stack Overflow answer base

### Evaluate **Pulumi** if:
- Greenfield project with a team that loves TypeScript/Python
- Complex logic that HCL can't express cleanly
- You want unit-testable infrastructure code without workarounds

### Use **AWS CDK / GCP CDM** if:
- Single-cloud and you want deep native integration

---

## The Module Ecosystem

One concern at the fork: would OpenTofu fragment the module ecosystem? In practice, **the module ecosystem has remained unified**. The Terraform Registry hosts modules that work on both Terraform and OpenTofu with minimal changes (provider version constraints occasionally need updates).

The main friction is with **verified modules** on the Terraform Registry, which are tested against Terraform specifically. OpenTofu has its own registry at `registry.opentofu.org` with growing content.

---

## Conclusion

The 2023 fork that many feared would fracture the IaC ecosystem has instead produced two healthy, evolving products. OpenTofu has established itself as a genuinely separate project — not just a compatibility shim — with features shipping ahead of Terraform. Terraform has doubled down on its commercial ecosystem with Stacks and HCP integrations.

For most teams:
- **Migrating from Terraform to OpenTofu is nearly zero-risk** if you're not using HCP-specific features
- **New projects** should evaluate both; OpenTofu is the better default for open-source and license-sensitive contexts
- **HCP users** have real lock-in to consider before migrating

The competition is healthy. Both products are shipping faster in 2026 than Terraform was in 2022. The winner is the IaC ecosystem.

---

*Related posts: Platform Engineering Internal Developer Platform Guide, Kubernetes 2026 Gateway API*
