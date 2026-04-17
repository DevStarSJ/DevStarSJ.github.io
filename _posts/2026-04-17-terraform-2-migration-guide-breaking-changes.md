---
layout: post
title: "Terraform 2.0: What Changed and How to Migrate Your Infrastructure Code"
subtitle: "Breaking changes, the new state backend model, provider v6, and the definitive upgrade checklist"
date: 2026-04-17 12:00:00
author: "Seokjun Lee"
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80"
catalog: true
tags:
  - Terraform
  - Infrastructure as Code
  - DevOps
  - Cloud
  - HashiCorp
---

# Terraform 2.0: What Changed and How to Migrate Your Infrastructure Code

Terraform 2.0 is the most significant release in the tool's history. After years of incremental improvements under the 1.x series, HashiCorp (now under IBM's ownership and with OpenTofu splitting the community) finally shipped the breaking changes they'd been deferring. If you manage any non-trivial infrastructure, this migration will require real work — but the improvements are worth it.

Let's walk through every significant change and exactly what you need to do.

![Infrastructure and Server Management](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1000&q=80)
*Photo by [C Dustin](https://unsplash.com/@dianamia) on Unsplash*

---

## What Drove Terraform 2.0?

Three forces pushed HashiCorp to finally make breaking changes:

1. **OpenTofu forked at 1.6** — having the reference implementation release 2.0 reclaims mindshare
2. **State management has been brittle at scale** — the new state backend model addresses years of complaints
3. **Provider ecosystem fragmentation** — Provider Protocol v6 standardizes the extension API

---

## Breaking Changes: The Complete List

### 1. `count` and `for_each` Can No Longer Be Mixed

**Before (Terraform 1.x):**
```hcl
# This worked but caused confusing behavior
resource "aws_instance" "servers" {
  count = var.use_count ? var.server_count : null
  for_each = var.use_count ? null : var.server_map
  
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
}
```

**Terraform 2.0 (required):**
```hcl
# Choose ONE: count OR for_each, never conditional switching
resource "aws_instance" "servers" {
  for_each = var.servers  # Always use for_each for map/set
  
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = each.value.instance_type
  tags = {
    Name = each.key
  }
}
```

**Migration:** Audit every resource using `count` with map-like inputs. Convert to `for_each`.

### 2. Legacy `backend` Blocks Removed

The old `terraform {}` backend configuration is replaced by the new `state` block.

**Before:**
```hcl
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}
```

**After:**
```hcl
terraform {
  state {
    store "s3" {
      bucket = "my-terraform-state"
      key    = "prod/terraform.tfstate"
      region = "us-east-1"
    }
    
    # New: explicit lock configuration
    lock "dynamodb" {
      table = "terraform-locks"
    }
  }
}
```

The separation of state storage from locking is a major improvement — you can now use S3 for state and Redis for distributed locking, for example.

### 3. `terraform_remote_state` Data Source Deprecated

The `terraform_remote_state` data source is removed. Use the new `state_ref` resource instead.

**Before:**
```hcl
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "network/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.network.outputs.private_subnet_id
}
```

**After:**
```hcl
state_ref "network" {
  store "s3" {
    bucket = "my-terraform-state"
    key    = "network/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  subnet_id = state_ref.network.outputs.private_subnet_id
}
```

### 4. Variable Validation Is Now Enforced at Module Boundaries

In Terraform 1.x, variable validations were suggestions that could be bypassed. In 2.0, they're hard-enforced at module call sites.

```hcl
variable "environment" {
  type        = string
  description = "Deployment environment"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}
```

If a caller passes `production` instead of `prod`, it now fails at plan time. Update your variable definitions to be explicit.

### 5. Provider Inheritance Changes

Child modules no longer automatically inherit provider configurations from the root module. You must explicitly pass providers.

**Before (implicit, no longer works):**
```hcl
# root/main.tf - provider configured here
provider "aws" {
  region = "us-east-1"
}

module "vpc" {
  source = "./modules/vpc"
  # Provider automatically inherited
}
```

**After (explicit):**
```hcl
provider "aws" {
  region = "us-east-1"
  alias  = "primary"
}

module "vpc" {
  source = "./modules/vpc"
  
  providers = {
    aws = aws.primary  # Explicit pass-through
  }
}
```

This is more verbose but eliminates a whole class of bugs where modules accidentally use the wrong provider configuration.

---

## New Features Worth Knowing

### 1. Stacks (GA in 2.0)

Terraform Stacks — previously in preview — are now stable. Stacks let you deploy the same configuration to multiple targets without duplicating code.

```hcl
# stack.tfstack.hcl
deployment "us-east" {
  variables = {
    region = "us-east-1"
    environment = "prod"
  }
}

deployment "eu-west" {
  variables = {
    region = "eu-west-1"  
    environment = "prod"
  }
}
```

### 2. Test Framework Improvements

The `terraform test` framework now supports mocking providers, enabling unit testing without real cloud resources.

```hcl
# tests/main.tftest.hcl

mock_provider "aws" {
  mock_resource "aws_instance" {
    defaults = {
      id         = "i-mock12345678"
      private_ip = "10.0.1.100"
      public_ip  = "1.2.3.4"
    }
  }
}

run "creates_instance_with_correct_type" {
  command = plan
  
  variables {
    instance_type = "t3.medium"
    environment   = "dev"
  }
  
  assert {
    condition     = aws_instance.app.instance_type == "t3.medium"
    error_message = "Instance type doesn't match"
  }
}
```

### 3. Native Drift Detection

```bash
# New command: check for drift without planning
terraform drift

# Output:
# DRIFT DETECTED: aws_security_group.allow_ssh
#   Rule added outside Terraform: ingress port 22 from 203.0.113.0/24
#   
# DRIFT DETECTED: aws_instance.web[0]
#   instance_type: t3.medium → t3.large (changed outside Terraform)
```

---

![DevOps Workflow Automation](https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=1000&q=80)
*Photo by [Glenn Carstens-Peters](https://unsplash.com/@glenncarstens) on Unsplash*

## Migration Strategy

### Step 1: Audit Your Current Code

```bash
# Install terraform-upgrade tool
brew install terraform-upgrade  

# Scan for breaking changes
terraform-upgrade scan --target-version 2.0 ./

# Output shows:
# - Files with legacy backend blocks
# - Mixed count/for_each usage  
# - terraform_remote_state usage
# - Implicit provider inheritance
```

### Step 2: Migrate State Backend

```bash
# Generate new state block from existing backend
terraform-upgrade migrate-backend --input main.tf --output main.tf.new

# Verify the migration
diff main.tf main.tf.new

# Apply when ready
mv main.tf.new main.tf
terraform init -reconfigure
```

### Step 3: Fix Count/ForEach Issues

```bash
# This will flag problematic patterns
terraform-upgrade fix --rules count-foreach ./

# Review suggested changes before accepting
terraform-upgrade fix --rules count-foreach --dry-run ./
```

### Step 4: Update Provider Pass-Through

```bash
# Auto-fix implicit provider inheritance
terraform-upgrade fix --rules provider-inheritance ./
```

### Step 5: Test Everything

```bash
# Run full test suite
terraform test

# Check plans look correct
terraform plan -out=tfplan
terraform show tfplan
```

---

## OpenTofu Compatibility

If your organization has moved to OpenTofu (the open-source Terraform fork), the situation is nuanced:

- OpenTofu 1.x is mostly compatible with Terraform 1.x HCL
- OpenTofu 2.0 (in development) will adopt some but not all of Terraform 2.0's changes
- The `state` block syntax differs between the two

For teams maintaining code that needs to work with both, use feature detection:

```hcl
# Compatible with both Terraform 2.x and OpenTofu 2.x
terraform {
  required_version = ">= 2.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}
```

---

## CI/CD Updates

Update your pipeline to use Terraform 2.0:

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  push:
    branches: [main]
  pull_request:

jobs:
  terraform:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Terraform
      uses: hashicorp/setup-terraform@v3
      with:
        terraform_version: "2.0.0"
    
    - name: Terraform Init
      run: terraform init
      
    - name: Terraform Validate
      run: terraform validate
      
    - name: Terraform Test
      run: terraform test
      
    - name: Terraform Plan
      run: terraform plan -out=tfplan
      
    - name: Upload Plan
      uses: actions/upload-artifact@v4
      with:
        name: terraform-plan
        path: tfplan
```

---

## Conclusion

Terraform 2.0 is a significant but manageable migration. The breaking changes — while annoying — address real pain points that have frustrated teams for years. The new state backend model alone is worth the migration effort.

**Migration priority:**
1. 🔴 **High**: Backend block migration (required, state becomes inaccessible)
2. 🔴 **High**: `terraform_remote_state` removal (breaks cross-stack references)
3. 🟡 **Medium**: Provider inheritance (causes plan failures on first run)
4. 🟡 **Medium**: Variable validation enforcement (may break existing modules)
5. 🟢 **Low**: count/for_each (works in most cases, clean up for correctness)

Start with a non-production environment, use the `terraform-upgrade` tooling, and you'll be through in a few days of focused work.
