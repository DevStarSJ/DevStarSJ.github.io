---
layout: post
title: "Terraform vs. Pulumi vs. OpenTofu: The IaC Landscape in 2026"
subtitle: "After HashiCorp's license change, the infrastructure-as-code ecosystem fractured — and it's more interesting for it"
date: 2026-03-16 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&q=80"
categories: [DevOps, Infrastructure, Cloud]
tags: [Terraform, Pulumi, OpenTofu, IaC, Infrastructure-as-Code, DevOps, Cloud, HashiCorp, CDKTF]
---

## Introduction

The infrastructure-as-code landscape looked simple in 2022: use Terraform. The HCL DSL was learnable, the provider ecosystem was unmatched, and HashiCorp was a trusted open-source steward.

Then August 2023 happened. HashiCorp changed Terraform's license from MPL 2.0 to BUSL 1.1 — effectively making it source-available rather than open source. The community response was swift: **OpenTofu** forked under the Linux Foundation and reached feature parity within months.

In 2026, the IaC landscape is more fragmented — but also more innovative. Here's a clear-eyed look at the three main options and when to use each.

![Data center with server racks and blue lighting](https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=900&q=80)
*Photo by Taylor Vick on Unsplash*

---

## The State of Play in 2026

### Terraform (HashiCorp / IBM)

IBM acquired HashiCorp in 2024, and Terraform is now the commercial centerpiece of IBM's cloud automation stack. The product has continued to improve:

- **Terraform Stacks**: Coordinate deployments across multiple root modules with proper dependency management
- **Ephemeral Values**: Credentials and secrets that exist only during plan/apply, never written to state
- **Provider-defined functions**: Custom functions implemented in Go, callable from HCL
- **Terraform Cloud** integration has gotten deeper and more capable

The license situation hasn't changed. If you're using Terraform in a way that doesn't compete with HashiCorp's commercial offerings, BUSL doesn't affect you. If you're building tooling on top of Terraform, you need legal review.

### OpenTofu

OpenTofu has done what everyone hoped: it's kept up with Terraform feature parity while adding community-driven improvements:

- **State encryption**: Built-in encryption for remote state (a feature Terraform still lacks)
- **Provider iteration**: `for_each` on module sources
- **Testing improvements**: Better mocking framework for unit tests

The OpenTofu registry has its own provider copies, but the Terraform registry remains the source of truth and OpenTofu reads from it (with some caveats). For most users, OpenTofu is a drop-in replacement for Terraform — `terraform` → `tofu` in your commands.

**The key question**: For greenfield projects, should you start with OpenTofu? If license concerns matter to your organization, yes. If you want IBM's commercial support, no.

### Pulumi

Pulumi took a fundamentally different approach: instead of a DSL (HCL), use real programming languages. Python, TypeScript, Go, Java, .NET — write your infrastructure with the same tools you write your application.

In 2026, Pulumi has won significant adoption in teams with strong software engineering culture. Here's why:

---

## The Case for Pulumi

### Real Code, Not DSL

```typescript
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Pulumi: build infrastructure with real TypeScript
const vpc = new awsx.ec2.Vpc("app-vpc", {
    numberOfAvailabilityZones: 2,
    natGateways: { strategy: "Single" },
});

// Dynamic configuration with real conditionals
const isProd = pulumi.getStack() === "production";

const cluster = new aws.ecs.Cluster("app-cluster", {
    settings: isProd ? [{
        name: "containerInsights",
        value: "enabled",
    }] : [],
});

// Real loops, not HCL count/for_each limitations
const services = ["api", "worker", "scheduler"];

const taskDefinitions = services.map(service => 
    new aws.ecs.TaskDefinition(`${service}-task`, {
        family: `${service}-${pulumi.getStack()}`,
        cpu: isProd ? "512" : "256",
        memory: isProd ? "1024" : "512",
        networkMode: "awsvpc",
        requiresCompatibilities: ["FARGATE"],
        executionRoleArn: executionRole.arn,
        containerDefinitions: pulumi.output(
            aws.ecr.getRepository({ name: `myapp/${service}` })
        ).apply(repo => JSON.stringify([{
            name: service,
            image: `${repo.repositoryUrl}:latest`,
            essential: true,
            portMappings: service === "api" ? [{
                containerPort: 3000,
                protocol: "tcp",
            }] : [],
        }])),
    })
);

// Export stack outputs
export const vpcId = vpc.vpcId;
export const clusterArn = cluster.arn;
```

Try doing complex conditional logic or dynamic resource creation in HCL. It's possible, but it's fighting against the language. In TypeScript or Python, it's just code.

### Component Libraries

Pulumi's component resource system enables you to build reusable infrastructure abstractions that look like any other class:

```typescript
// Define a reusable "microservice" component
class Microservice extends pulumi.ComponentResource {
    public readonly url: pulumi.Output<string>;
    
    constructor(
        name: string,
        args: MicroserviceArgs,
        opts?: pulumi.ComponentResourceOptions
    ) {
        super("mycompany:app:Microservice", name, {}, opts);
        
        // Encapsulate all the complexity: ECR, ECS task, service, load balancer
        const repo = new aws.ecr.Repository(`${name}-repo`, {}, { parent: this });
        
        const taskDef = new aws.ecs.TaskDefinition(`${name}-task`, {
            // ... configured from args
        }, { parent: this });
        
        const service = new aws.ecs.Service(`${name}-service`, {
            // ...
        }, { parent: this });
        
        const lb = new awsx.lb.ApplicationLoadBalancer(`${name}-lb`, {
            // ...
        }, { parent: this });
        
        this.url = lb.loadBalancer.dnsName.apply(dns => `https://${dns}`);
        
        this.registerOutputs({ url: this.url });
    }
}

// Now deploying a microservice is one line
const apiService = new Microservice("api", {
    image: "myapp/api:latest",
    port: 3000,
    cpu: 512,
    memory: 1024,
    desiredCount: isProd ? 3 : 1,
});

export const apiUrl = apiService.url;
```

This is impossible to achieve cleanly in HCL.

### Testing Infrastructure Code

Because Pulumi is real code, you can test it with real testing frameworks:

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Unit test with mocked Pulumi resources
describe("ECS Task Definition", () => {
    let taskDef: aws.ecs.TaskDefinition;
    
    beforeAll(async () => {
        pulumi.runtime.setMocks({
            newResource: (args) => ({
                id: `${args.name}-id`,
                state: args.inputs,
            }),
            call: (args) => ({ result: args.inputs }),
        });
        
        const infra = await import("../index");
        taskDef = infra.taskDefinition;
    });
    
    it("should use Fargate compatibility", async () => {
        const compatibilities = await taskDef.requiresCompatibilities;
        expect(compatibilities).toContain("FARGATE");
    });
    
    it("should have adequate memory in production", async () => {
        const memory = await taskDef.memory;
        expect(parseInt(memory!)).toBeGreaterThanOrEqual(1024);
    });
});
```

---

## The Case for Terraform/OpenTofu

Despite Pulumi's advantages for complex cases, HCL has real strengths:

### Ecosystem Depth

The Terraform provider ecosystem is unmatched. 4,000+ providers covering every cloud service, SaaS tool, and enterprise system. Many of these providers have no Pulumi equivalent (though Pulumi can bridge to Terraform providers via the `terraform-provider` bridge).

### Simpler Mental Model for Infrastructure Teams

For teams where infrastructure is managed by ops/platform engineers rather than software engineers, HCL's declarative simplicity is a genuine advantage. No need to think about programming language semantics — just describe what you want:

```hcl
resource "aws_ecs_service" "api" {
  name            = "api-${terraform.workspace}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.environment == "production" ? 3 : 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.api.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }
}
```

This is readable and unambiguous. Anyone who knows AWS and has seen HCL once can understand it.

### Stability and Predictability

HCL is boring in the best possible way. It doesn't have runtime errors. It can't accidentally call an external API during planning. The execution model is simple and predictable. For infrastructure that must be reliable and auditable, boring is good.

---

## Decision Framework

**Choose Terraform if:**
- You need IBM's commercial support and enterprise tooling
- Your team has existing HCL expertise and Terraform state
- You don't need programmatic infrastructure abstractions
- Your provider needs are standard (all major cloud providers are fully supported)

**Choose OpenTofu if:**
- License compliance is a concern for your organization
- You want to contribute to or build tooling on an open-source IaC tool
- You're starting fresh and want the community-governed version

**Choose Pulumi if:**
- Your infrastructure team has strong software engineering backgrounds
- You need complex conditional logic, loops, or dynamic configuration
- You want to build reusable infrastructure components as libraries
- You're embedding infrastructure code in the same repo as application code
- You want to write real unit tests for your infrastructure

---

## The CDKTF Option

Worth mentioning: HashiCorp also maintains **CDK for Terraform (CDKTF)** — which lets you use TypeScript, Python, or Go to generate Terraform JSON configuration. It's a middle ground: you get real programming languages, but the execution still goes through Terraform.

In practice, CDKTF has less adoption than Pulumi for the "use a real language" use case. The abstraction is leaky, and the DX is rougher. But if you're already invested in Terraform state and want to add programming language expressiveness, it's worth evaluating.

![Cloud computing infrastructure diagram with colorful network](https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80)
*Photo by NASA on Unsplash*

---

## Migrating Between Tools

The hardest part of switching IaC tools is state. Here's the realistic picture:

**Terraform → OpenTofu:** Trivial. State format is identical. Change `terraform` to `tofu` in your commands and CI/CD. Done.

**Terraform → Pulumi:** Hard. Pulumi has import tools to pull existing resources into Pulumi state, but this is a significant migration. Plan for it taking months for a large infrastructure footprint.

**OpenTofu → Terraform:** Possible (state formats are compatible) but requires re-evaluating your license situation and potentially paying for Terraform Cloud.

---

## Conclusion

The "Terraform is the obvious choice" era is over. OpenTofu has proven that community governance can sustain a serious IaC tool, and Pulumi has built a compelling case for software-first infrastructure teams.

My current recommendation for new projects in 2026:

- **Large enterprise with IBM relationship:** Terraform
- **Open-source-first or license-sensitive:** OpenTofu  
- **Engineering-driven team, complex infrastructure:** Pulumi
- **Small team, simple infrastructure:** Terraform/OpenTofu (less to learn)

Whatever you choose: pick one, invest in it deeply, and build good practices around it. The tool matters less than the discipline.

---

## Resources

- [OpenTofu](https://opentofu.org/)
- [Terraform Documentation](https://developer.hashicorp.com/terraform)
- [Pulumi Documentation](https://www.pulumi.com/docs/)
- [CDKTF](https://developer.hashicorp.com/terraform/cdktf)
- [Pulumi vs. Terraform Comparison](https://www.pulumi.com/docs/concepts/vs/terraform/)
