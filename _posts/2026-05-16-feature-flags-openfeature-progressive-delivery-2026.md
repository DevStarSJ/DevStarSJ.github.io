---
layout: post
title: "Feature Flags at Scale: OpenFeature, Flagsmith, and Progressive Delivery in 2026"
subtitle: "How to build a feature flag system that supports safe deployments, A/B tests, and gradual rollouts without vendor lock-in"
date: 2026-05-16 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&auto=format&fit=crop"
catalog: true
tags:
  - DevOps
  - Feature Flags
  - OpenFeature
  - Progressive Delivery
  - CI/CD
  - Platform Engineering
---

# Feature Flags at Scale: OpenFeature, Flagsmith, and Progressive Delivery in 2026

Feature flags are the deployment primitive that makes everything else easier: canary releases, kill switches, A/B tests, beta programs. But naive implementations accumulate technical debt faster than almost anything else. This post covers production patterns, OpenFeature standardization, and when to use which tooling.

![Dashboard Analytics](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop)
*Photo by Luke Chesser on Unsplash*

## The OpenFeature Standard

Before picking a vendor, understand OpenFeature (CNCF Incubating). It's a vendor-neutral API spec that lets you swap flag providers without rewriting application code.

### Core Concepts

```typescript
// OpenFeature SDK — provider-agnostic interface
import { OpenFeature, Client } from '@openfeature/server-sdk';
import { FlagsmithProvider } from '@openfeature/flagsmith-provider';

// Wire up provider ONCE at startup
await OpenFeature.setProviderAndWait(
  new FlagsmithProvider({
    environmentKey: process.env.FLAGSMITH_SERVER_KEY!,
    // Optional: in-process evaluation (no network per flag evaluation)
    enableLocalEvaluation: true,
    localEvaluationPollingInterval: 60,
  })
);

// Get a client (use feature domain as name)
const client: Client = OpenFeature.getClient('checkout');

// Evaluate flags — type-safe
const enableNewCheckout = await client.getBooleanValue(
  'checkout.new-flow',
  false,  // default value
  {
    targetingKey: userId,
    attributes: {
      plan: user.plan,
      country: user.country,
      createdAt: user.createdAt.toISOString(),
    }
  }
);

const checkoutVariant = await client.getStringValue(
  'checkout.variant',
  'control',
  { targetingKey: userId }
);
```

**Key benefit**: Switching from Flagsmith to LaunchDarkly (or your own system) means changing one `setProvider()` call. No hunting through 300 scattered flag evaluations.

### Hooks: Cross-Cutting Concerns

```typescript
import { Hook, HookContext, EvaluationDetails, FlagValue } from '@openfeature/server-sdk';
import { metrics, trace } from '@opentelemetry/api';

const meter = metrics.getMeter('feature-flags');
const flagEvaluationCounter = meter.createCounter('feature_flag_evaluations_total');
const tracer = trace.getTracer('feature-flags');

class ObservabilityHook implements Hook {
  async after(
    hookContext: HookContext,
    evaluationDetails: EvaluationDetails<FlagValue>
  ) {
    // Metric: count evaluations by flag and variant
    flagEvaluationCounter.add(1, {
      flag_key: hookContext.flagKey,
      variant: String(evaluationDetails.value),
      reason: evaluationDetails.reason ?? 'UNKNOWN',
    });
  }

  async error(hookContext: HookContext, error: unknown) {
    // Alert on flag evaluation errors (flag not found, provider down)
    console.error(`Flag evaluation error: ${hookContext.flagKey}`, error);
  }
}

// Register globally
OpenFeature.addHooks(new ObservabilityHook());
```

## Flagsmith: Self-Hosted Production Setup

Flagsmith is the leading open-source flag platform. Here's a production-grade Helm deployment:

```yaml
# values.yaml for Flagsmith Helm chart
flagsmith:
  replicaCount: 3

  image:
    repository: flagsmith/flagsmith
    tag: "3.1.0"

  database:
    url: "postgresql://flagsmith:$(DB_PASSWORD)@postgres:5432/flagsmith"

  cache:
    # Redis for flag state caching
    url: "redis://redis:6379/0"

  env:
    - name: ALLOW_REGISTRATION_WITHOUT_INVITE
      value: "false"
    - name: ENABLE_ADMIN_CONSOLE
      value: "false"
    - name: FLAG_EVALUATION_CACHE_SECONDS
      value: "30"
    - name: ANALYTICS_DATABASE_URL
      value: "postgresql://flagsmith:$(DB_PASSWORD)@analytics-postgres:5432/flagsmith_analytics"

  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 512Mi

  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 60
```

### In-Process Evaluation for High-Throughput

Local evaluation caches the entire flag ruleset in-process—critical for paths called thousands of times per second:

```python
import flagsmith
from flagsmith import Flagsmith

# Server-side SDK with local evaluation
fs = Flagsmith(
    environment_key=os.environ["FLAGSMITH_SERVER_KEY"],
    enable_local_evaluation=True,        # No HTTP per evaluation
    environment_refresh_interval_seconds=60,
    request_timeout_seconds=10,
    enable_analytics=True,               # Async batched analytics
)

# Targeting rules evaluated in-process
def get_flags_for_request(user_id: str, user_traits: dict):
    return fs.get_identity_flags(
        identifier=user_id,
        traits=user_traits
    )

# Extremely fast — no network hop
flags = get_flags_for_request(
    "user-123",
    {"plan": "enterprise", "country": "KR"}
)

if flags.is_feature_enabled("new-dashboard"):
    return render_new_dashboard()
```

## Progressive Delivery Patterns

### Pattern 1: Ring-Based Rollout

```typescript
interface RolloutConfig {
  rings: {
    name: string;
    percentage: number;
    targeting?: Record<string, string[]>;
  }[];
}

// Flagsmith segment rules mapping to rings
const rolloutConfig: RolloutConfig = {
  rings: [
    { name: "internal", percentage: 100, targeting: { team: ["engineering"] } },
    { name: "beta", percentage: 100, targeting: { plan: ["enterprise"] } },
    { name: "gradual-1pct", percentage: 1 },
    { name: "gradual-10pct", percentage: 10 },
    { name: "gradual-50pct", percentage: 50 },
    { name: "ga", percentage: 100 },
  ]
};

// Automate ring progression with metrics gates
async function progressRollout(
  flagKey: string,
  currentRing: string,
  metricsClient: MetricsClient
): Promise<{ proceed: boolean; reason: string }> {
  const errorRate = await metricsClient.getErrorRate(
    `feature.${flagKey}`,
    "15m"
  );
  const p99Latency = await metricsClient.getP99Latency(
    `feature.${flagKey}`,
    "15m"
  );

  if (errorRate > 0.01) {  // > 1% error rate
    return { proceed: false, reason: `Error rate ${errorRate * 100}% exceeds 1% threshold` };
  }

  if (p99Latency > 2000) {  // > 2s P99
    return { proceed: false, reason: `P99 latency ${p99Latency}ms exceeds 2000ms threshold` };
  }

  return { proceed: true, reason: "All metrics within bounds" };
}
```

### Pattern 2: Kill Switch Pattern

```typescript
// Kill switches: flags that default ON, exist to disable
// Name them with a negative framing for clarity
const KILL_SWITCHES = {
  DISABLE_NEW_PAYMENT_FLOW: 'payments.kill-switch.new-flow',
  DISABLE_AI_RECOMMENDATIONS: 'recommendations.kill-switch.ai',
  DISABLE_REALTIME_SYNC: 'sync.kill-switch.realtime',
} as const;

async function processPayment(request: PaymentRequest) {
  const isNewFlowKilled = await featureClient.getBooleanValue(
    KILL_SWITCHES.DISABLE_NEW_PAYMENT_FLOW,
    false  // default: NOT killed (new flow is active)
  );

  if (isNewFlowKilled) {
    // Automatic fallback to stable implementation
    return processPaymentLegacy(request);
  }

  return processPaymentV2(request);
}
```

### Pattern 3: Experiment-Driven Development

```typescript
interface ExperimentResult {
  variant: string;
  metadata: Record<string, unknown>;
}

class ExperimentService {
  constructor(private client: Client, private analytics: Analytics) {}

  async getVariant(
    experimentKey: string,
    userId: string,
    context: Record<string, string>
  ): Promise<ExperimentResult> {
    const variant = await this.client.getStringValue(
      experimentKey,
      'control',
      { targetingKey: userId, attributes: context }
    );

    // Track exposure immediately (before any outcome)
    await this.analytics.track('experiment_exposure', {
      experiment: experimentKey,
      variant,
      userId,
      timestamp: Date.now(),
    });

    return { variant, metadata: { experimentKey } };
  }

  async trackOutcome(
    experimentKey: string,
    userId: string,
    metric: string,
    value: number
  ) {
    await this.analytics.track('experiment_outcome', {
      experiment: experimentKey,
      userId,
      metric,
      value,
      timestamp: Date.now(),
    });
  }
}

// Usage
const { variant } = await experiments.getVariant(
  'checkout.cta-text',
  userId,
  { plan: user.plan }
);

const ctaText = {
  control: 'Complete Purchase',
  variant_a: 'Buy Now',
  variant_b: 'Confirm Order',
}[variant] ?? 'Complete Purchase';

// After conversion
await experiments.trackOutcome('checkout.cta-text', userId, 'conversion', 1);
```

## Flag Hygiene: The Maintenance Problem

Feature flags rot. Every stale flag is hidden complexity.

### Automated Staleness Detection

```python
from datetime import datetime, timedelta
from flagsmith.api import FlagsmithAPI

async def audit_stale_flags(
    api: FlagsmithAPI,
    project_id: str,
    stale_threshold_days: int = 90
) -> list[dict]:
    flags = await api.get_flags(project_id)
    stale = []

    for flag in flags:
        last_evaluation = await api.get_flag_last_evaluated(flag["id"])
        last_modified = datetime.fromisoformat(flag["updated_at"])

        is_stale = (
            (datetime.utcnow() - last_modified) > timedelta(days=stale_threshold_days)
            and flag["enabled"]  # Only flag enabled-but-unused ones
        )

        if is_stale:
            stale.append({
                "name": flag["name"],
                "key": flag["feature"]["name"],
                "days_since_modified": (datetime.utcnow() - last_modified).days,
                "owner": flag.get("owner", "unknown"),
            })

    return sorted(stale, key=lambda x: x["days_since_modified"], reverse=True)
```

### Flag Ownership Convention

```typescript
// Document ownership in flag metadata
// Flagsmith supports custom metadata fields
const flagMetadata = {
  owner: "payments-team",
  ticket: "PAYMENTS-1234",
  created: "2026-03-15",
  expires: "2026-06-15",       // When this flag should be removed
  rollout_complete: false,     // Set true when permanently on
  type: "release" | "experiment" | "kill-switch" | "ops"
};
```

## Comparison: OpenFeature Providers

| Provider | Self-Hosted | Multi-Variant | A/B Testing | Analytics | OTel |
|----------|------------|--------------|-------------|-----------|------|
| Flagsmith | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Built-in | ✅ |
| Unleash | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Built-in | ✅ |
| LaunchDarkly | ❌ SaaS | ✅ Yes | ✅ Yes | ✅ Advanced | ✅ |
| GrowthBook | ✅ Yes | ✅ Yes | ✅ Stats engine | ✅ Yes | ⚠️ |
| CloudBees | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ |

For startups: **Flagsmith** (generous free tier, self-hosted option).
For enterprises with existing GCP/AWS: **CloudBees** or **LaunchDarkly**.
For data-driven experimentation: **GrowthBook** (Bayesian stats engine).

## Conclusion

Feature flags done right are a deployment superpower. The key disciplines are: standardize on OpenFeature to avoid vendor lock-in, implement local evaluation for performance-critical paths, automate flag lifecycle tracking to prevent rot, and always measure before and after flag-gated changes.

A mature flag system lets you deploy any time, release when ready, experiment continuously, and roll back in seconds. That's the difference between a deployment event and a deployment routine.
