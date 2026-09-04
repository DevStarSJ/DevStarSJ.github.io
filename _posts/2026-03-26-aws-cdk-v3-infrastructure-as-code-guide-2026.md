---
layout: post
title: "AWS CDK v3 Guide: Infrastructure as Code for the Modern Cloud in 2026"
subtitle: "From stacks to constructs to production deployments — the definitive CDK v3 tutorial"
date: 2026-03-26 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - AWS
  - CDK
  - InfrastructureAsCode
  - CloudFormation
  - DevOps
  - Cloud
---

# AWS CDK v3 Guide: Infrastructure as Code for the Modern Cloud in 2026

AWS CDK (Cloud Development Kit) v3 has redefined what Infrastructure as Code looks like. Gone are the days of YAML-wrestling with CloudFormation. With CDK v3, you write real TypeScript (or Python, Java, Go) and get type-safe, testable infrastructure that compiles to CloudFormation. This guide covers everything from project setup to advanced patterns used in production.

![Cloud Infrastructure](https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1000&auto=format&fit=crop)
*Photo by Ilya Pavlov on Unsplash*

## Why CDK v3 Over Terraform?

Before diving in, let's address the elephant in the room. Terraform (and OpenTofu) is still excellent and has broader multi-cloud support. But CDK v3 has clear advantages for AWS-native teams:

| | CDK v3 | Terraform |
|--|--------|-----------|
| **Language** | TypeScript/Python/Java/Go/C# | HCL |
| **Type safety** | ✅ Full IDE intellisense | ❌ Limited |
| **Testing** | ✅ Unit tests with Jest/pytest | Partial (terratest) |
| **AWS integration** | ✅ Direct SDK calls in CDK constructs | Via providers |
| **Multi-cloud** | ❌ AWS only (mostly) | ✅ Excellent |
| **State management** | CloudFormation (managed) | Self-managed or Terraform Cloud |
| **Ecosystem** | Construct Hub | Terraform Registry |

**Choose CDK if:** You're AWS-first and want type safety + unit testing.
**Choose Terraform:** Multi-cloud or you have a strong existing Terraform team.

---

## CDK v3 Installation & Project Setup

```bash
npm install -g aws-cdk@latest
cdk --version
# 3.x.x

# Create a new project
mkdir my-infra && cd my-infra
cdk init app --language=typescript

# Project structure
.
├── bin/
│   └── my-infra.ts         # App entry point
├── lib/
│   └── my-infra-stack.ts   # Your stacks
├── test/
│   └── my-infra.test.ts    # Tests
├── cdk.json
├── package.json
└── tsconfig.json
```

```bash
# Bootstrap your account (one-time setup per account/region)
cdk bootstrap aws://ACCOUNT_ID/us-east-1

# Deploy
cdk deploy

# Preview changes (like terraform plan)
cdk diff

# Synthesize CloudFormation template
cdk synth
```

---

## Core Concepts

### Constructs: The Building Blocks

Everything in CDK is a Construct. They form a tree:

```
App
├── Stack (AccountA / us-east-1)
│   ├── VPC Construct
│   │   ├── L1: CfnVPC
│   │   ├── L1: CfnSubnet (x6)
│   │   └── L1: CfnRouteTable (x3)
│   └── ECS Cluster Construct
│       ├── L2: Cluster
│       └── L2: FargateService
└── Stack (AccountA / eu-west-1)
    └── ...
```

**L1 constructs:** 1:1 mapping to CloudFormation resources (prefixed with `Cfn`)
**L2 constructs:** Higher-level abstractions with sensible defaults
**L3 constructs (Patterns):** Opinionated multi-resource patterns

### Your First Real Stack

```typescript
// lib/web-app-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

interface WebAppStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'prod';
  domainName?: string;
}

export class WebAppStack extends cdk.Stack {
  public readonly loadBalancerDns: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: WebAppStackProps) {
    super(scope, id, props);

    const isProd = props.environment === 'prod';

    // VPC with private and public subnets
    const vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: isProd ? 3 : 2,
      natGateways: isProd ? 3 : 1, // Cost vs HA tradeoff
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 28,
        },
      ],
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      containerInsights: isProd,
    });

    // Fargate service with ALB — this is an L3 pattern
    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      'Service',
      {
        cluster,
        memoryLimitMiB: isProd ? 1024 : 512,
        cpu: isProd ? 512 : 256,
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry('nginx:latest'),
          containerPort: 80,
          environment: {
            NODE_ENV: props.environment,
          },
        },
        publicLoadBalancer: true,
        desiredCount: isProd ? 3 : 1,
        // Enable circuit breaker for automatic rollback
        circuitBreaker: { rollback: isProd },
      }
    );

    // Auto-scaling
    const scaling = fargateService.service.autoScaleTaskCount({
      maxCapacity: isProd ? 20 : 4,
      minCapacity: isProd ? 3 : 1,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(30),
    });

    scaling.scaleOnRequestCount('RequestScaling', {
      requestsPerTarget: 1000,
      targetGroup: fargateService.targetGroup,
    });

    // RDS PostgreSQL
    const database = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_2,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      writer: rds.ClusterInstance.provisioned('writer', {
        instanceType: isProd ? ec2.InstanceType.of(
          ec2.InstanceClass.R6G, ec2.InstanceSize.LARGE
        ) : ec2.InstanceType.of(
          ec2.InstanceClass.T4G, ec2.InstanceSize.MEDIUM
        ),
      }),
      readers: isProd ? [
        rds.ClusterInstance.provisioned('reader', {
          instanceType: ec2.InstanceType.of(
            ec2.InstanceClass.R6G, ec2.InstanceSize.LARGE
          ),
        }),
      ] : [],
      deletionProtection: isProd,
      backup: {
        retention: isProd ? cdk.Duration.days(30) : cdk.Duration.days(7),
      },
    });

    // Allow Fargate to connect to RDS
    database.connections.allowFrom(
      fargateService.service,
      ec2.Port.tcp(5432),
      'Allow ECS to connect to RDS'
    );

    // Outputs
    this.loadBalancerDns = new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: fargateService.loadBalancer.loadBalancerDnsName,
      exportName: `${props.environment}-load-balancer-dns`,
    });

    // Tags
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
```

---

## Custom Constructs: The Real Power of CDK

The real CDK superpower is building reusable constructs — your own L3 patterns:

```typescript
// lib/constructs/secure-lambda.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

interface SecureLambdaProps {
  functionName: string;
  handler: string;
  runtime: lambda.Runtime;
  code: lambda.Code;
  timeout?: cdk.Duration;
  memorySize?: number;
  environment?: Record<string, string>;
  alarmTopic?: sns.ITopic;
  /** Error rate threshold % to trigger alarm, default 5 */
  errorRateThreshold?: number;
}

/**
 * Opinionated Lambda construct with:
 * - Dead letter queue
 * - X-Ray tracing
 * - CloudWatch alarms
 * - Reserved concurrency option
 * - Proper IAM boundaries
 */
export class SecureLambda extends Construct {
  public readonly function: lambda.Function;
  public readonly errorAlarm: cloudwatch.Alarm;

  constructor(scope: Construct, id: string, props: SecureLambdaProps) {
    super(scope, id);

    // Dead letter queue
    const dlq = new cdk.aws_sqs.Queue(this, 'DLQ', {
      queueName: `${props.functionName}-dlq`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: cdk.aws_sqs.QueueEncryption.SQS_MANAGED,
    });

    // Log group with retention
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${props.functionName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // The Lambda function
    this.function = new lambda.Function(this, 'Function', {
      functionName: props.functionName,
      handler: props.handler,
      runtime: props.runtime,
      code: props.code,
      timeout: props.timeout ?? cdk.Duration.seconds(30),
      memorySize: props.memorySize ?? 512,
      environment: props.environment,
      tracing: lambda.Tracing.ACTIVE,
      logGroup,
      deadLetterQueue: dlq,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_229_0,
    });

    // Error rate alarm
    const errorMetric = this.function.metricErrors({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    const invocationsMetric = this.function.metricInvocations({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    // Use math expression for error rate
    this.errorAlarm = new cloudwatch.Alarm(this, 'ErrorAlarm', {
      alarmName: `${props.functionName}-error-rate`,
      metric: new cloudwatch.MathExpression({
        expression: '(errors / invocations) * 100',
        usingMetrics: {
          errors: errorMetric,
          invocations: invocationsMetric,
        },
        period: cdk.Duration.minutes(5),
      }),
      threshold: props.errorRateThreshold ?? 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: `Error rate > ${props.errorRateThreshold ?? 5}% for ${props.functionName}`,
    });

    if (props.alarmTopic) {
      this.errorAlarm.addAlarmAction(
        new cloudwatch_actions.SnsAction(props.alarmTopic)
      );
    }
  }
}
```

Usage:

```typescript
// lib/my-stack.ts
const apiLambda = new SecureLambda(this, 'ApiLambda', {
  functionName: 'my-api-handler',
  handler: 'index.handler',
  runtime: lambda.Runtime.NODEJS_22_X,
  code: lambda.Code.fromAsset('src/lambda/api'),
  timeout: cdk.Duration.seconds(10),
  environment: {
    TABLE_NAME: table.tableName,
  },
  alarmTopic: onCallTopic,
  errorRateThreshold: 1, // Stricter for production API
});

// Grant permissions using CDK's grantXxx() pattern
table.grantReadWriteData(apiLambda.function);
```

---

## Testing CDK Code

This is where CDK really shines over Terraform:

```typescript
// test/web-app-stack.test.ts
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { WebAppStack } from '../lib/web-app-stack';

describe('WebAppStack - Production', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new WebAppStack(app, 'TestStack', {
      environment: 'prod',
      env: { account: '123456789', region: 'us-east-1' },
    });
    template = Template.fromStack(stack);
  });

  test('VPC has 3 AZs in production', () => {
    template.resourceCountIs('AWS::EC2::Subnet', 9); // 3 AZs × 3 subnet types
  });

  test('RDS deletion protection enabled in prod', () => {
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      DeletionProtection: true,
    });
  });

  test('Fargate service has circuit breaker enabled', () => {
    template.hasResourceProperties('AWS::ECS::Service', {
      DeploymentConfiguration: {
        DeploymentCircuitBreaker: {
          Enable: true,
          Rollback: true,
        },
      },
    });
  });

  test('RDS is in isolated subnets', () => {
    // Verify DB subnet group only references isolated subnets
    template.hasResourceProperties('AWS::RDS::DBSubnetGroup', {
      SubnetIds: Match.arrayWith([
        Match.objectLike({ Ref: Match.stringLikeRegexp('.*Isolated.*') }),
      ]),
    });
  });
});

describe('WebAppStack - Dev', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new WebAppStack(app, 'DevStack', {
      environment: 'dev',
      env: { account: '123456789', region: 'us-east-1' },
    });
    template = Template.fromStack(stack);
  });

  test('Only 1 NAT gateway in dev (cost saving)', () => {
    template.resourceCountIs('AWS::EC2::NatGateway', 1);
  });

  test('RDS deletion protection disabled in dev', () => {
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      DeletionProtection: false,
    });
  });
});
```

---

## Multi-Account, Multi-Region Deployments

```typescript
// bin/my-infra.ts
import * as cdk from 'aws-cdk-lib';
import { WebAppStack } from '../lib/web-app-stack';
import { MonitoringStack } from '../lib/monitoring-stack';

const app = new cdk.App();

// Dev account
new WebAppStack(app, 'Dev-WebApp', {
  environment: 'dev',
  env: { account: '111111111111', region: 'us-east-1' },
});

// Staging account
new WebAppStack(app, 'Staging-WebApp', {
  environment: 'staging',
  env: { account: '222222222222', region: 'us-east-1' },
});

// Production: Multi-region active-active
for (const region of ['us-east-1', 'eu-west-1', 'ap-northeast-1']) {
  new WebAppStack(app, `Prod-WebApp-${region}`, {
    environment: 'prod',
    env: { account: '333333333333', region },
  });
}

// Centralized monitoring in security account
new MonitoringStack(app, 'Monitoring', {
  env: { account: '444444444444', region: 'us-east-1' },
  monitoredAccounts: ['111111111111', '222222222222', '333333333333'],
});
```

### CDK Pipelines: Self-Mutating Pipelines

```typescript
// lib/pipeline-stack.ts
import * as cdk from 'aws-cdk-lib';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { WebAppStack } from './web-app-stack';
import { Construct } from 'constructs';

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'WebAppPipeline',
      selfMutation: true, // Pipeline updates itself when CDK code changes!
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection('myorg/my-infra', 'main', {
          connectionArn: 'arn:aws:codestar-connections:...',
        }),
        commands: [
          'npm ci',
          'npm run build',
          'npx cdk synth',
        ],
      }),
    });

    // Dev stage — deploy immediately
    pipeline.addStage(new WebAppStage(this, 'Dev', {
      env: { account: '111111111111', region: 'us-east-1' },
      environment: 'dev',
    }));

    // Staging — with automated tests
    const staging = pipeline.addStage(new WebAppStage(this, 'Staging', {
      env: { account: '222222222222', region: 'us-east-1' },
      environment: 'staging',
    }));

    staging.addPost(new ShellStep('IntegrationTests', {
      commands: ['npm run test:integration'],
      envFromCfnOutputs: {
        API_URL: staging.loadBalancerDns,
      },
    }));

    // Prod — with manual approval gate
    pipeline.addStage(new WebAppStage(this, 'Prod', {
      env: { account: '333333333333', region: 'us-east-1' },
      environment: 'prod',
    }), {
      pre: [
        new cdk.pipelines.ManualApprovalStep('Approve-Prod'),
      ],
    });
  }
}
```

---

## CDK v3 New Features (2025-2026)

### 1. Aspects: Cross-Cutting Concerns

```typescript
// Apply security policy to ALL resources in a stack
class SecurityAspect implements cdk.IAspect {
  visit(node: cdk.IConstruct): void {
    // Enforce encryption on all S3 buckets
    if (node instanceof s3.CfnBucket) {
      node.bucketEncryption = {
        serverSideEncryptionConfiguration: [{
          serverSideEncryptionByDefault: {
            sseAlgorithm: 'aws:kms',
          },
        }],
      };
    }

    // Enforce logging on all ALBs
    if (node instanceof elbv2.CfnLoadBalancer) {
      node.loadBalancerAttributes = [
        { key: 'access_logs.s3.enabled', value: 'true' },
        { key: 'access_logs.s3.bucket', value: 'my-access-logs-bucket' },
      ];
    }
  }
}

// Apply to entire app
cdk.Aspects.of(app).add(new SecurityAspect());
```

### 2. Context and Environment Variables

```typescript
// cdk.json
{
  "context": {
    "env": "dev",
    "@aws-cdk/aws-rds:databaseProxyUniqueResourceName": true,
    "aws-cdk:enableDiffNoFail": "true"
  }
}
```

```typescript
// In stack
const envName = this.node.tryGetContext('env') as 'dev' | 'prod';
```

---

## Production Checklist

Before deploying CDK stacks to production:

- [ ] `cdk diff` reviewed by second engineer
- [ ] `RemovalPolicy.RETAIN` on stateful resources (RDS, S3, DynamoDB)
- [ ] Deletion protection on RDS clusters
- [ ] VPC flow logs enabled
- [ ] CloudTrail enabled in the account
- [ ] All Lambda functions have DLQ
- [ ] All queues have DLQ with alerts
- [ ] S3 buckets have versioning + lifecycle rules
- [ ] CloudWatch alarms on critical metrics
- [ ] IAM roles follow least privilege (use `grant*()` methods)
- [ ] Unit tests pass: `npm test`
- [ ] CDK nag checks pass: no HIGH severity findings

```bash
# Run CDK nag security checks
npm install cdk-nag
```

```typescript
import { AwsSolutionsChecks } from 'cdk-nag';
cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
```

---

## Conclusion

AWS CDK v3 represents the mature state of Infrastructure as Code. The combination of type safety, unit testing, reusable constructs, and self-mutating pipelines creates a developer experience that raw CloudFormation or even Terraform can't match for AWS-native teams.

The learning curve is real — you need to understand both CDK abstractions AND underlying CloudFormation concepts. But once you've built your first custom construct library, you'll never go back to copying YAML.

*Start with a single stack, build your first custom construct, write some tests. The rest follows naturally.*

---

*Questions about CDK patterns? Leave a comment below!*
