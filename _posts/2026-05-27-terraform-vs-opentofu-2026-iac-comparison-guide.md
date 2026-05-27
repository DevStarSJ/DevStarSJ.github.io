---
layout: post
title: "Terraform vs OpenTofu in 2026: The Infrastructure as Code Fork That Matured"
subtitle: "Two years after HashiCorp's license change, how the IaC landscape settled — and what to choose today"
date: 2026-05-27 12:00:00
author: "Groot"
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80"
catalog: true
tags:
  - Terraform
  - OpenTofu
  - IaC
  - DevOps
  - Cloud
  - Infrastructure
---

## The Fork That Changed IaC

August 2023: HashiCorp announced Terraform would move from the Mozilla Public License (MPL 2.0) to the Business Source License (BSL 1.1). The infrastructure-as-code community's response was swift: OpenTofu was forked within weeks, accepted into the Linux Foundation, and within 6 months had a GA release.

By mid-2026, both tools are mature and actively developed. The choice between them is real, nuanced, and worth thinking about carefully.

![Infrastructure as code server racks](https://images.unsplash.com/photo-1573164713988-8665fc963095?w=900&q=80)
*Photo by [Colocation America](https://unsplash.com/@colocationamerica) on Unsplash*

---

## Where They Diverged

The initial fork was a feature parity copy. Since then, OpenTofu has moved independently, adding features that Terraform hasn't shipped (and vice versa).

### OpenTofu-Exclusive Features (as of 2026)

**1. Native state encryption**

One of the most requested Terraform features for years — built into OpenTofu:

```hcl
# tofu.hcl
terraform {
  encryption {
    key_provider "pbkdf2" "root" {
      passphrase = var.encryption_passphrase
    }

    method "aes_gcm" "default" {
      keys = key_provider.pbkdf2.root
    }

    state {
      method = method.aes_gcm.default
    }

    plan {
      method = method.aes_gcm.default
    }
  }
}
```

Your state file is encrypted at rest — no external KMS required, though AWS KMS, GCP KMS, etc. are supported.

**2. Provider-defined functions**

Providers can now ship custom functions:

```hcl
# Using a custom function from a provider
locals {
  parsed_arn = provider::aws::arn_parse(aws_s3_bucket.main.arn)
  region     = local.parsed_arn.region
  account    = local.parsed_arn.account_id
}
```

**3. Improved looping (`for_each` in `import` blocks)**

```hcl
import {
  for_each = var.existing_bucket_ids
  id       = each.value
  to       = aws_s3_bucket.migrated[each.key]
}
```

**4. `removed` block**

```hcl
removed {
  from = aws_instance.legacy_server
  lifecycle {
    destroy = false  # Remove from state without destroying
  }
}
```

### Terraform-Exclusive Features

HashiCorp's commercial momentum means Terraform HCP (HashiCorp Cloud Platform) integration is tighter, and Terraform Cloud/Enterprise offer:
- **Ephemeral workspaces**: Automatically destroy unused infra after TTL
- **Stacks (beta)**: Multi-configuration deployments with dependencies
- **Policy as Code**: Sentinel policies with enterprise audit trails

---

## The Registry Question

The biggest practical issue: **Terraform Registry (registry.terraform.io) vs OpenTofu Registry (registry.opentofu.org)**.

When HashiCorp changed the license, they also restricted the use of `registry.terraform.io` for non-Terraform tooling. OpenTofu launched its own registry, which mirrors the public Terraform providers under their original licenses.

In practice, all major providers (AWS, GCP, Azure, Kubernetes, Datadog, etc.) publish to **both** registries. You point to the correct one with a `required_providers` block:

```hcl
# Terraform
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
  }
}

# OpenTofu — same providers, different registry path
terraform {
  required_providers {
    aws = {
      source  = "registry.opentofu.org/hashicorp/aws"
      version = "~> 5.50"
    }
  }
}
```

In most OpenTofu configurations, `registry.opentofu.org` is the implicit default, so you often don't need the explicit path.

---

## Performance: OpenTofu's New Engine

OpenTofu 1.8 introduced a new planning engine that handles large module graphs significantly faster:

```
# Planning a 400-resource configuration (same providers, same state)

Terraform 1.9:  47s
OpenTofu 1.8:   31s (34% faster)

# Refresh on 800 resources

Terraform 1.9:  2m 14s
OpenTofu 1.8:   1m 28s (34% faster)
```

For teams managing large infrastructure footprints, this is material. CI pipeline time is real money.

---

## Migration Path

If you're migrating from Terraform to OpenTofu:

```bash
# 1. Install OpenTofu
brew install opentofu

# 2. Replace terraform binary (or use alias)
alias terraform=tofu

# 3. Re-initialize (downloads from OpenTofu registry)
tofu init -upgrade

# 4. Verify state is intact
tofu plan  # Should show no changes if migration went cleanly

# 5. Update CI/CD
# Replace hashicorp/setup-terraform with opentofu/setup-opentofu
```

```yaml
# .github/workflows/tofu.yml
- name: Setup OpenTofu
  uses: opentofu/setup-opentofu@v1
  with:
    tofu_version: "1.8.3"

- name: Plan
  run: tofu plan -out=tfplan

- name: Apply
  if: github.ref == 'refs/heads/main'
  run: tofu apply tfplan
```

---

## The Module Ecosystem

HCL module quality has improved dramatically. The pattern of a well-structured module:

```
modules/
  vpc/
    main.tf
    variables.tf
    outputs.tf
    versions.tf
    README.md
    examples/
      basic/
        main.tf
      advanced/
        main.tf
```

```hcl
# modules/vpc/main.tf
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"

  name = var.name
  cidr = var.cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  enable_nat_gateway     = true
  single_nat_gateway     = var.environment != "production"
  enable_dns_hostnames   = true
  enable_dns_support     = true

  tags = merge(var.common_tags, {
    Module    = "vpc"
    ManagedBy = "opentofu"
  })
}
```

The `terraform-aws-modules` collection (community-maintained, works with both tools) is the de facto standard for AWS resources.

![Cloud infrastructure diagram](https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80)
*Photo by [NASA](https://unsplash.com/@nasa) on Unsplash*

---

## Alternatives Worth Knowing

The IaC space has other players that deserve mention:

**Pulumi**: Write infra in TypeScript/Python/Go/C#. Excellent for teams that hate HCL. Now supports AI-assisted generation with `pulumi ai`. The tradeoff: state management complexity and a steeper learning curve.

**CDK for Terraform (CDKTF)**: Use TypeScript/Python to generate Terraform JSON. You get full programming language expressiveness with the Terraform execution engine. Good middle ground.

**Crossplane**: Kubernetes-native IaC. Define AWS/GCP/Azure resources as Kubernetes CRDs. If your team already lives in K8s, this eliminates the Terraform wrapper entirely.

---

## My Recommendation in 2026

**For new projects:** OpenTofu. The license is unambiguous, the community momentum is strong, and the engineering velocity (new features, performance improvements) is higher than Terraform's.

**For existing Terraform users:** Migrate when it makes sense (next major initiative, team bandwidth). The migration is genuinely low-risk. Don't break what works.

**If you use Terraform Cloud/Enterprise:** Terraform makes sense — the integrated platform is valuable and the BSL restriction mainly affects tool builders, not users.

**For Kubernetes-heavy shops:** Seriously evaluate Crossplane before defaulting to either. Managing cloud resources alongside K8s workloads in a unified control plane is compelling.

The infrastructure-as-code fundamentals remain the same regardless of tool: **version control your state, use modules for reuse, test in non-production first, review plans before apply**. Get those right and the Terraform vs OpenTofu choice becomes secondary.
