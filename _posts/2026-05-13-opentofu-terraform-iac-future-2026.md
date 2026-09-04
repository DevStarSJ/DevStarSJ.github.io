---
layout: post
title: "OpenTofu and the Future of Infrastructure as Code After Terraform's License Change"
subtitle: "How the open-source IaC ecosystem evolved after HashiCorp's BSL pivot and what it means for your infrastructure strategy"
date: 2026-05-13 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80"
header-mask: 0.4
catalog: true
tags:
  - DevOps
  - IaC
  - OpenTofu
  - Terraform
  - Cloud
---

In August 2023, HashiCorp announced it was changing Terraform's license from MPL 2.0 (open source) to the Business Source License (BSL). The community reaction was swift and decisive: within weeks, the OpenTF Foundation forked Terraform and launched **OpenTofu**. By 2026, OpenTofu has not only caught up with Terraform but diverged meaningfully, adding features the HashiCorp roadmap deprioritized. Here's the state of IaC in 2026.

![Cloud Infrastructure](https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80)
*Photo by [NASA](https://unsplash.com/@nasa) on Unsplash*

## The Fork: What Actually Changed

OpenTofu forked Terraform at version 1.6, remaining wire-compatible with Terraform providers and state files. The key practical facts:

- **100% Terraform provider compatible**: Any provider from the Terraform Registry works with OpenTofu
- **State file compatible**: Migrate from Terraform to OpenTofu with zero state migration
- **HCL syntax compatible**: Most Terraform code runs unmodified
- **CLI flag compatible**: `tofu plan`, `tofu apply` — same muscle memory

IBM acquired HashiCorp in 2024, then IBM acquired Red Hat years before. The combined entity kept Terraform under BSL. OpenTofu joined the Linux Foundation and is now governed by the community.

## OpenTofu Features That Terraform Doesn't Have

By mid-2026, OpenTofu has shipped several significant features:

### 1. Provider-Level Encryption of State Files

State files contain sensitive data: API keys, passwords, database connection strings. OpenTofu added native encryption:

```hcl
# opentofu/encryption.tf
terraform {
  encryption {
    key_provider "pbkdf2" "main" {
      passphrase = var.state_encryption_passphrase
    }
    
    method "aes_gcm" "default_method" {
      keys = key_provider.pbkdf2.main
    }
    
    state {
      method = method.aes_gcm.default_method
    }
    
    plan {
      method = method.aes_gcm.default_method
    }
  }
}
```

This is a security win that Terraform users have requested for years.

### 2. `removed` Block for Safer Resource Removal

```hcl
# Remove a resource from state without destroying it
removed {
  from = aws_instance.legacy_server
  
  lifecycle {
    destroy = false
  }
}
```

This lets you "orphan" resources — removing them from Terraform management without destroying the actual cloud resource. Previously you had to `terraform state rm` manually.

### 3. Dynamic Provider Configuration

```hcl
# Generate provider configs dynamically
locals {
  regions = ["us-east-1", "eu-west-1", "ap-southeast-1"]
}

provider "aws" {
  for_each = toset(local.regions)
  alias    = each.key
  region   = each.key
}
```

### 4. Loophole: The `for_each` on Modules

OpenTofu shipped `for_each` on module blocks before Terraform:

```hcl
module "per_region_vpc" {
  for_each = var.regions
  
  source     = "./modules/vpc"
  region     = each.key
  cidr_block = each.value.cidr
}
```

This was one of the most requested features and OpenTofu shipped it first.

## The Migration Path: Terraform → OpenTofu

Migration is genuinely simple:

```bash
# Install OpenTofu
brew install opentofu

# Verify compatibility
tofu version
# OpenTofu v1.9.0
# on darwin_arm64

# In your existing Terraform directory
cd my-terraform-project/

# OpenTofu reads existing .terraform state and providers
tofu init     # downloads providers (compatible with Terraform registry)
tofu plan     # same output format as terraform plan
tofu apply    # same behavior

# Optional: explicitly migrate state
tofu state list  # shows existing resources
```

The only friction is the Terraform Registry. OpenTofu uses the OpenTofu Registry (`registry.opentofu.org`) by default, which mirrors the Terraform Registry. Most major providers are available.

For providers only in the Terraform Registry:

```hcl
terraform {
  required_providers {
    some-provider = {
      source = "registry.terraform.io/vendor/some-provider"  # explicit Terraform registry
    }
  }
}
```

## State Management in 2026: Terraform Cloud Alternatives

One complication of moving to OpenTofu: you lose access to Terraform Cloud (now HCP Terraform). Alternatives:

### Spacelift

The most feature-rich Terraform/OpenTofu management platform. Supports policy-as-code (OPA), drift detection, and approval workflows:

```yaml
# .spacelift/config.yml
version: "1"

stacks:
  - name: production-aws
    project_root: terraform/aws/production
    terraform_version: "1.9.0"  # or opentofu version
    runner_image: public.ecr.aws/spacelift/runner-terraform:latest
    
    policies:
      - type: plan
        body: |
          deny["Destroying RDS is not allowed without approval"] {
            destroyed := input.terraform.resource_changes[_]
            destroyed.type == "aws_db_instance"
            destroyed.change.actions[_] == "delete"
          }
```

### Atlantis (Self-Hosted)

Classic GitOps for Terraform/OpenTofu. A GitHub PR comment triggers plan/apply:

```yaml
# atlantis.yaml
version: 3
projects:
  - name: production
    dir: terraform/production
    workspace: default
    terraform_version: tofu1.9.0  # OpenTofu support added
    autoplan:
      when_modified: ["*.tf", "../modules/**/*.tf"]
      enabled: true
    apply_requirements:
      - approved
      - mergeable
```

### Env0

Managed platform similar to Spacelift with good OpenTofu support. Notable for TTL environments (auto-destroy development environments after N hours).

### OpenTF (Self-Managed)

Run your own remote state with just S3 + DynamoDB for state locking:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-tofu-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tofu-state-lock"
    encrypt        = true
  }
}
```

Combine with GitHub Actions for a zero-cost CI/CD pipeline:

{% raw %}
```yaml
# .github/workflows/tofu.yml
name: OpenTofu

on:
  pull_request:
    paths: ['terraform/**']

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - uses: opentofu/setup-opentofu@v1
      with:
        tofu_version: 1.9.0
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
        aws-region: us-east-1
    
    - name: Tofu Init
      run: tofu init
      working-directory: terraform/production
    
    - name: Tofu Plan
      id: plan
      run: |
        tofu plan -out=tfplan -no-color 2>&1 | tee plan_output.txt
        echo "exitcode=$?" >> $GITHUB_OUTPUT
      working-directory: terraform/production
    
    - name: Post Plan to PR
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs');
          const plan = fs.readFileSync('terraform/production/plan_output.txt', 'utf8');
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: `\`\`\`\n${plan.slice(0, 65000)}\n\`\`\``
          });
```
{% endraw %}

## CDK for Terraform (CDKTF) and Pulumi: The Imperative IaC Layer

Some teams prefer writing infrastructure in TypeScript or Python instead of HCL. Both CDKTF and Pulumi remain popular:

**CDKTF** — synthesizes to Terraform HCL under the hood, so you get Terraform's provider ecosystem with TypeScript's type system:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { AwsProvider, ec2 } from "@cdktf/provider-aws";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "AWS", { region: "us-east-1" });

    const vpc = new ec2.Vpc(this, "MyVpc", {
      cidrBlock: "10.0.0.0/16",
      enableDnsHostnames: true,
      tags: { Name: "my-vpc", Environment: "production" },
    });

    // TypeScript: you get autocomplete, type checking, refactoring
    console.log(`VPC ID: ${vpc.id}`);
  }
}
```

**Pulumi** — truly imperative, state stored in Pulumi Cloud or self-hosted:

```python
import pulumi
import pulumi_aws as aws

vpc = aws.ec2.Vpc("my-vpc",
    cidr_block="10.0.0.0/16",
    enable_dns_hostnames=True,
    tags={"Name": "my-vpc", "Environment": "production"}
)

pulumi.export("vpc_id", vpc.id)
```

## The Reality: Is OpenTofu Enterprise-Ready?

Yes, with caveats. Organizations that have migrated report:

**Pros:**
- No licensing concerns — fully OSS under MPL 2.0
- Active community, fast feature velocity
- Backward compatible with existing investments

**Cons:**
- Smaller ecosystem than Terraform Cloud's managed features
- Enterprise support is via third parties (Spacelift, env0, etc.), not the OpenTofu project directly
- Some niche providers are Terraform Registry-only

For most teams, the migration is low-risk and the licensing freedom is worth it. For large enterprises already invested in HCP Terraform, the calculus depends on pricing negotiations with IBM/HashiCorp.

## Conclusion

The 2023 license change was a watershed moment for IaC. OpenTofu proved that a well-executed community fork can not only survive but thrive. In 2026, it's the natural choice for new projects and a pragmatic migration target for existing Terraform users who want to escape license uncertainty.

The IaC ecosystem is healthier for the competition — Pulumi is moving faster, Crossplane has grown, and even AWS CDK has improved. HashiCorp's gamble may have backfired: the community built something better.

---

*Related: [Platform Engineering: Golden Paths and IDPs](/2026/05/10/platform-engineering-golden-paths-idp-2026/)*
