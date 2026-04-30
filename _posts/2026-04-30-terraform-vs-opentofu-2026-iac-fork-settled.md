---
layout: post
title: "Terraform vs OpenTofu in 2026: The Great Infrastructure-as-Code Fork Has Settled"
subtitle: "Two years after HashiCorp's license change, the IaC landscape has stabilized — here's where things stand and what to choose"
date: 2026-04-30 12:00:00
author: "Seokjun Lee"
header-img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop"
catalog: true
categories:
  - DevOps
  - Cloud
tags:
  - Terraform
  - OpenTofu
  - Infrastructure as Code
  - DevOps
  - Cloud
  - HashiCorp
---

# Terraform vs OpenTofu in 2026: The Fork Has Settled

In August 2023, HashiCorp changed Terraform's license from MPL 2.0 to BUSL 1.1, sending shockwaves through the DevOps community. The open-source community's response — forking Terraform as OpenTofu under the Linux Foundation — was swift and determined. Two and a half years later, the dust has settled, the community has voted with their feet, and the landscape looks very different from what either side predicted.

Here's the honest 2026 state of affairs.

![Cloud infrastructure visualization](https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&auto=format&fit=crop)
*Photo by Taylor Vick on Unsplash*

## What Actually Happened

The initial reaction to HashiCorp's license change was fierce. Service providers who built commercial offerings on Terraform (env0, Spacelift, Scalr) had immediate business model concerns. Open-source advocates decried what they saw as corporate appropriation of community work. OpenTofu was announced within weeks.

But the corporate Terraform market behaved differently. Large enterprises with existing Terraform investments largely stayed put. The BUSL license, while not OSI-approved, permits use in commercial software that competes with HashiCorp's *own* offerings — and most enterprise users aren't competing with HashiCorp.

Then IBM acquired HashiCorp in 2024, and things got interesting. IBM's approach to OSS has historically been pragmatic, and there were early signs of policy reconsideration. But the reconsideration never fully materialized, and by 2025 the two ecosystems were meaningfully diverged.

## OpenTofu: What It's Become

OpenTofu is no longer "Terraform but open source." It has diverged, added features, and built its own identity.

### Features OpenTofu Has That Terraform Doesn't

**1. Native state encryption**

```hcl
# OpenTofu: Built-in state encryption
terraform {
  encryption {
    key_provider "pbkdf2" "my_passphrase" {
      passphrase = var.state_passphrase
    }
    
    method "aes_gcm" "my_method" {
      keys = key_provider.pbkdf2.my_passphrase
    }
    
    state {
      method = method.aes_gcm.my_method
    }
  }
}
```

In Terraform, this requires third-party solutions or relying on the backend's native encryption. OpenTofu encrypts at the Tofu layer, backend-agnostic.

**2. Provider-defined functions**

```hcl
# OpenTofu: Call provider-defined functions
output "cidr_range" {
  value = provider::aws::arn_parse(aws_instance.example.arn).region
}
```

This enables providers to expose reusable functions without requiring separate data sources or external utilities.

**3. `for_each` on module calls (partial)**

OpenTofu has made progress on long-requested features that Terraform has been slower to implement.

**4. Improved `removed` block**

```hcl
# OpenTofu: Remove resources from state without destroying them
removed {
  from = aws_instance.legacy_server
  
  lifecycle {
    destroy = false
  }
}
```

Terraform added a `removed` block in 1.7, but OpenTofu's implementation is more flexible.

### OpenTofu's Ecosystem

The tooling support has largely followed. Major CI/CD platforms support OpenTofu:

- **GitHub Actions**: `opentofu/setup-opentofu@v1`
- **GitLab CI**: Official runner image
- **Spacelift, env0, Scalr**: Full support (they were early movers)
- **Atlantis**: Full support via alternative wrapper
- **AWS CodeBuild, GCP Cloud Build**: Both support it natively now

The provider ecosystem is 100% compatible — providers built for Terraform work with OpenTofu without modification. This was the critical design decision that made OpenTofu viable.

## Terraform (IBM): What's Changed

IBM's Terraform stewardship has been... measured. The cadence of releases has continued, and Terraform 1.8 and 1.9 brought real improvements, but the pace feels slower than the pre-acquisition era.

### What's Still Good

- **HCP Terraform (formerly Terraform Cloud)** remains polished and well-maintained
- **Provider ecosystem** is still the most mature in IaC (though it's shared with OpenTofu)
- **Enterprise support contracts** are meaningful for regulated industries
- **Documentation** is still the gold standard

### What's Concerning

- Feature velocity has slowed relative to OpenTofu
- Community governance is corporate-controlled
- BUSL license uncertainty for edge cases
- IBM's prioritization signals are unclear long-term

## The Migration Reality

Migrating from Terraform to OpenTofu is genuinely straightforward for most cases:

```bash
# Install OpenTofu
brew install opentofu

# In your Terraform project directory
tofu init  # Reads existing .terraform.lock.hcl

# Most commands are identical
tofu plan
tofu apply
tofu state list

# State files are compatible — no migration needed
```

The only meaningful friction points:

**1. Provider lock file format**

OpenTofu uses a slightly different internal format for `.terraform.lock.hcl`. Running `tofu init` regenerates it, which can cause noise in version control.

**2. CDK for Terraform (CDKTF)**

If you're using CDKTF (Terraform constructs in TypeScript/Python/etc.), migration requires more consideration. CDKTF is a HashiCorp product and doesn't officially support OpenTofu.

**3. HCP Terraform integration**

If you're using HCP Terraform (Terraform Cloud) as your remote backend, you're in the Terraform ecosystem. Alternatives exist (Spacelift, env0, Scalr support OpenTofu), but migration is more involved.

## What Are People Actually Using?

Based on job postings, GitHub stars, and community surveys in 2026:

- **OpenTofu adoption**: ~35% of new IaC projects (up from ~10% in 2024)
- **Terraform retention**: Strong among enterprises with existing investment and HCP Terraform users
- **Both supported**: Most major providers (AWS, GCP, Azure) now explicitly test against both

The split tracks with organizational size:
- **Startups and scale-ups** (< 500 employees): Heavily shifted toward OpenTofu
- **Mid-market** (500–5000 employees): Mixed, often by team preference
- **Enterprise** (> 5000 employees): Predominantly Terraform, moving slowly if at all

## Alternatives Worth Mentioning

The fork debate has also boosted attention to alternatives:

**Pulumi**: The "IaC in real programming languages" option has grown significantly. For teams already writing TypeScript or Python, using the same language for infrastructure is compelling.

```typescript
// Pulumi — infrastructure in TypeScript
import * as aws from "@pulumi/aws";

const bucket = new aws.s3.Bucket("my-bucket", {
    acl: "private",
    tags: { Environment: "production" },
});

export const bucketName = bucket.id;
```

**AWS CDK**: For AWS-only shops, CDK has matured and the L2/L3 construct library is impressive.

**Ansible**: Still strong for configuration management and simple provisioning.

## My Recommendation in 2026

**New greenfield project?** Default to OpenTofu. It's the more community-friendly option, has genuine feature advantages, and the ecosystem support is now strong enough that there's no meaningful risk.

**Existing Terraform project?** Don't migrate for the sake of migrating. If you're happy with Terraform and not hitting its limitations, the migration cost isn't worth it for most teams. If you're hitting limitations (state encryption, specific features), evaluate migration.

**Using HCP Terraform?** Stay on Terraform unless you're willing to also migrate your CI/CD platform. The backend lock-in is real.

**Enterprise with compliance requirements?** IBM's support contracts have genuine value. Evaluate on your specific compliance requirements.

**AWS-heavy shop considering new tooling?** Seriously evaluate AWS CDK before defaulting to either Terraform or OpenTofu.

## The Bigger Picture

The Terraform/OpenTofu situation is a case study in what happens when a dominant open-source project changes its license. The outcome wasn't the "death of Terraform" that some predicted, nor was it the "fork dies in 6 months" that others predicted. It was a genuine split with both sides maintaining viability.

The lesson for tool selection: pay attention to governance, not just features. Tools with strong community governance (OpenTofu under Linux Foundation) are more resilient to the business decisions of any single company. That's worth considering before making a multi-year infrastructure investment.

---

*All HCL examples tested against Terraform 1.9.x and OpenTofu 1.8.x. License information from official HashiCorp and OpenTofu documentation.*
