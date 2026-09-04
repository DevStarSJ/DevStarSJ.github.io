---
layout: post
title: "OpenTofu: The Open Source Terraform Alternative That's Now Production-Ready"
subtitle: "Why the infrastructure-as-code community migrated and what it means for your IaC strategy"
date: 2026-06-05 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop"
header-mask: 0.4
catalog: true
tags:
  - Infrastructure as Code
  - OpenTofu
  - Terraform
  - DevOps
  - Cloud
---

## The Fork That Shook IaC

In August 2023, HashiCorp made a decision that sent shockwaves through the DevOps community: they relicensed Terraform from the Mozilla Public License (MPL 2.0) to the **Business Source License (BSL 1.1)**. The BSL restricts competitive use — you cannot use Terraform to build a competing product.

For the broader open-source ecosystem — Pulumi, Spacelift, env0, Scalr, and many others — this was an existential threat. Within weeks, a coalition of companies and community members announced a fork: **OpenTofu**.

Two and a half years later, OpenTofu isn't just a maintenance fork. It's a thriving project with features that have leapfrogged Terraform.

![Infrastructure Code](https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=900&auto=format&fit=crop)
*Photo by Growtika on Unsplash*

## What Is OpenTofu?

[OpenTofu](https://opentofu.org/) is a community-driven, fully open-source (MPL 2.0) fork of Terraform, now a project under the **Linux Foundation**. It maintains **100% backwards compatibility** with Terraform up to version 1.5, meaning most migrations require zero code changes.

### Governance

Unlike Terraform (HashiCorp → IBM), OpenTofu has a transparent governance model:
- **Technical Steering Committee** elected from community contributors
- RFC process for major features
- Public roadmap and meeting notes
- Contributions from AWS, Google, Spacelift, Harness, Gruntwork, and hundreds of individuals

This distributed governance is a feature, not a bug — no single company can change the license again.

## What OpenTofu Has That Terraform Doesn't

OpenTofu v1.9 (June 2026) includes several features that have never landed in Terraform:

### 1. State Encryption (Native)

One of the most requested Terraform features for years. OpenTofu now supports native state file encryption:

```hcl
terraform {
  encryption {
    key_provider "pbkdf2" "my_key" {
      passphrase = var.state_passphrase
    }

    method "aes_gcm" "default_method" {
      keys = key_provider.pbkdf2.my_key
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

Also supports AWS KMS, GCP KMS, and Azure Key Vault as key providers. State files at rest are now encrypted without needing third-party tooling.

### 2. Removed Deprecated Functions Replaced with Better Ones

OpenTofu 1.7+ replaced several confusing legacy functions with clear, modern equivalents:

```hcl
# Old Terraform way (still works in OpenTofu for compatibility)
resource "aws_s3_bucket" "example" {
  bucket = "my-bucket-${terraform.workspace}"
}

# New OpenTofu: provider-defined functions
output "bucket_arn" {
  value = provider::aws::arn_parse(aws_s3_bucket.example.arn).region
}
```

**Provider-defined functions** are a major OpenTofu contribution — providers can now expose functions callable in HCL, not just resources and data sources.

### 3. `for_each` on Module `import` Blocks

```hcl
import {
  for_each = {
    "prod-bucket" = "arn:aws:s3:::my-prod-bucket"
    "dev-bucket"  = "arn:aws:s3:::my-dev-bucket"
  }
  
  id = each.value
  to = aws_s3_bucket.buckets[each.key]
}
```

Import existing resources in bulk — essential for bringing legacy infrastructure under IaC management.

### 4. Improved Testing Framework

```hcl
# tests/main.tftest.hcl
run "creates_vpc_with_correct_cidr" {
  command = plan

  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "VPC CIDR must be 10.0.0.0/16"
  }
}

run "applies_tags_to_all_resources" {
  command = apply

  assert {
    condition     = alltrue([
      for r in [aws_vpc.main, aws_subnet.public] : 
      lookup(r.tags, "Environment", "") == var.environment
    ])
    error_message = "All resources must have Environment tag"
  }
}
```

The testing framework (contributed from Terraform 1.6, then extended by OpenTofu) now supports mocking providers for faster unit tests.

## Migration Guide

Moving from Terraform to OpenTofu is usually a one-command operation:

```bash
# Install OpenTofu
brew install opentofu  # macOS
# or
curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh | sh

# Initialize (reads existing .terraform.lock.hcl and state)
tofu init

# Run as normal — commands are identical
tofu plan
tofu apply
```

For CI/CD systems using `hashicorp/setup-terraform`, switch to `opentofu/setup-opentofu`:

```yaml
# GitHub Actions
- uses: opentofu/setup-opentofu@v1
  with:
    tofu_version: "1.9.0"
    
- run: tofu init && tofu plan
```

### When You Might Hit Issues

1. **Terraform Cloud / HCP Terraform** — these are HashiCorp commercial products; you'll need an alternative (Spacelift, env0, Terrateam, or self-hosted Atlantis)
2. **Sentinel policies** — if you use Sentinel for policy enforcement, migrate to OPA/Conftest
3. **Custom provider versions ≥ 1.6** — providers using BSL themselves won't be distributed through OpenTofu's registry (rare in practice)

## The Ecosystem Support

| Tool | OpenTofu Support |
|---|---|
| Atlantis | ✅ Full support (1.0+) |
| Terragrunt | ✅ Full support |
| Infracost | ✅ Full support |
| Checkov | ✅ Full support |
| tfsec / trivy | ✅ Full support |
| pre-commit-terraform | ✅ Full support |
| Spacelift | ✅ Native first-class |
| env0 | ✅ Native first-class |

The tooling ecosystem has fully caught up. There's no meaningful gap between the Terraform and OpenTofu ecosystems for most users.

## Should You Migrate?

**Yes, if:**
- You use or plan to use IaC automation tools (Atlantis, Spacelift, etc.)
- You care about open governance and license stability
- You want state encryption, provider-defined functions, or other new features
- You're starting a new project

**Maybe wait, if:**
- You're heavily invested in HCP Terraform (Terraform Cloud)
- Your team has standardized tooling training on "Terraform" specifically
- You're on a regulated migration freeze

The migration is low-risk, reversible (state files are compatible), and the long-term trajectory of OpenTofu is clearly healthier than a product owned by IBM.

## Conclusion

The OpenTofu fork was a calculated bet that the community could maintain and improve Terraform better than a single commercial vendor. Two and a half years in, that bet is paying off. The project has shipped features faster than Terraform, has broader governance, and hasn't compromised on backwards compatibility.

If you're still on Terraform, the migration is worth your time. If you're starting a new IaC project, start with OpenTofu.

**Resources:**
- [OpenTofu Official Site](https://opentofu.org)
- [OpenTofu GitHub](https://github.com/opentofu/opentofu)
- [Migration Guide](https://opentofu.org/docs/intro/migration/)
- [OpenTofu Registry](https://registry.opentofu.org)
