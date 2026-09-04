---
layout: post
title: "OpenTelemetry in 2026: The Observability Standard That Finally Won"
subtitle: "How OTel went from promising standard to ubiquitous infrastructure — and what that means for your monitoring stack"
date: 2026-03-08 10:30:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200"
catalog: true
tags:
  - OpenTelemetry
  - Observability
  - DevOps
  - Cloud Native
  - Monitoring
---

There's a moment in the adoption of every technology when it crosses from "the smart teams are using it" to "everyone uses it by default." For OpenTelemetry, that moment happened somewhere around mid-2025.

Today, in early 2026, OTel is the observability standard. Not a standard. *The* standard. If you're building a new service and you're not instrumenting it with OpenTelemetry, you're the exception.

This post is about understanding what that means practically — the architecture, the tooling, the gotchas, and what the mature OTel ecosystem looks like now that the dust has settled.

![Dashboard showing monitoring metrics and observability data](https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1200)
*Photo by Luke Chesser on Unsplash*

## Why OTel Won

The observability landscape before OpenTelemetry was a mess. Every vendor — Datadog, New Relic, Dynatrace, Splunk — had its own SDK, its own agent, its own data format. Switching vendors meant ripping out instrumentation and starting over. Teams were locked in.

OpenTelemetry solved this at the right layer. Instead of standardizing the backend (where vendors would never agree), it standardized the **instrumentation API and data format**. You instrument once, emit to the OTel Collector, and the Collector routes telemetry to any backend.

The result:
- **Vendor portability** — Change your observability backend without touching application code
- **Framework auto-instrumentation** — Major frameworks (Spring, Django, Express, Rails) now ship OTel support natively
- **Consistent data model** — Traces, metrics, and logs share the same context model, enabling correlation

The CNCF project hitting GA status across traces, metrics, and logs (finally, logs!) was the tipping point. Vendors who were resisting the standard realized they had to join or lose market position.

## The OTel Architecture You Need to Understand

OpenTelemetry has a few core components. Confusion about which does what is the most common source of implementation mistakes.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Application                          │
│  ┌─────────────┐  ┌───────────────┐  ┌────────────────────┐    │
│  │  OTel SDK   │  │ Auto-Instrum. │  │  Manual Instrum.   │    │
│  └──────┬──────┘  └───────┬───────┘  └──────────┬─────────┘    │
└─────────┼─────────────────┼────────────────────┼─────────────-─┘
          │                 │                     │
          └────────────────▼─────────────────────┘
                           │
                    OTLP Protocol
                           │
          ┌────────────────▼─────────────────────┐
          │          OTel Collector               │
          │  Receivers → Processors → Exporters   │
          └──────────┬────────────┬───────────────┘
                     │            │
            ┌────────▼───┐  ┌────▼──────────┐
            │  Jaeger /  │  │   Prometheus / │
            │  Tempo     │  │   Mimir        │
            └────────────┘  └───────────────┘
```

**The SDK** lives in your application. It provides the API for creating spans, recording metrics, and emitting logs. You mostly don't interact with it directly.

**Auto-instrumentation** hooks into your framework and libraries automatically. For Java, it's a javaagent. For Python and Node.js, it's a package that patches common libraries at startup. This gives you HTTP spans, DB query spans, message queue instrumentation — without writing any code.

**The Collector** is the crucial middleman. It receives telemetry via OTLP (or legacy protocols), processes it, and exports to backends. The Collector handles:
- Protocol translation (Zipkin → OTLP, Prometheus → OTLP)
- Sampling decisions
- PII scrubbing / attribute filtering  
- Batching and compression
- Routing to multiple backends simultaneously

**Never** send telemetry directly from your application to backends in production. Always go through the Collector. This decoupling is what gives you vendor flexibility.

## Setting Up the Collector Properly

The OTel Collector configuration is YAML-based and surprisingly readable once you understand the pipeline model:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
  # Also receive Prometheus metrics
  prometheus:
    config:
      scrape_configs:
      - job_name: 'k8s-pods'
        kubernetes_sd_configs:
        - role: pod

processors:
  # Add resource attributes (pod name, namespace, etc.)
  resourcedetection:
    detectors: [env, k8sattributes, gcp, aws]
  
  # Batch for efficiency
  batch:
    timeout: 5s
    send_batch_size: 512
  
  # Filter sensitive data
  attributes:
    actions:
    - key: http.request.header.authorization
      action: delete
    - key: db.statement
      action: hash  # Hash SQL queries to avoid PII
  
  # Tail-based sampling (sample 100% of error traces, 5% of success)
  tail_sampling:
    decision_wait: 10s
    policies:
    - name: errors-policy
      type: status_code
      status_code: {status_codes: [ERROR]}
    - name: slow-traces
      type: latency
      latency: {threshold_ms: 1000}
    - name: probabilistic
      type: probabilistic
      probabilistic: {sampling_percentage: 5}

exporters:
  # Traces → Jaeger or Tempo
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true
  
  # Metrics → Prometheus
  prometheus:
    endpoint: 0.0.0.0:8889
  
  # Logs → Loki
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resourcedetection, batch, tail_sampling]
      exporters: [otlp/jaeger]
    metrics:
      receivers: [otlp, prometheus]
      processors: [resourcedetection, batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [resourcedetection, batch, attributes]
      exporters: [loki]
```

The tail-based sampling configuration is worth emphasizing. Head-based sampling (decided at trace start) is simple but results in sampled-away errors. Tail-based sampling waits for the full trace to complete before deciding — so error traces are always captured, regardless of volume.

## Instrumenting Your Code

For most languages and frameworks, auto-instrumentation covers 80% of what you need. For the remaining 20% — business logic spans, custom metrics — manual instrumentation is straightforward:

```typescript
// TypeScript example with @opentelemetry/api
import { trace, metrics, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('payment-service', '1.0.0');
const meter = metrics.getMeter('payment-service', '1.0.0');

// Custom metric
const paymentCounter = meter.createCounter('payments.processed', {
  description: 'Number of payment transactions processed',
  unit: '{payment}'
});

const paymentDuration = meter.createHistogram('payments.duration', {
  description: 'Payment processing duration',
  unit: 'ms',
  advice: {
    explicitBucketBoundaries: [10, 25, 50, 100, 250, 500, 1000, 2500]
  }
});

async function processPayment(orderId: string, amount: number): Promise<PaymentResult> {
  return tracer.startActiveSpan('processPayment', async (span) => {
    // Add rich context to the span
    span.setAttributes({
      'payment.order_id': orderId,
      'payment.amount_cents': Math.round(amount * 100),
      'payment.currency': 'USD'
    });
    
    const startTime = Date.now();
    
    try {
      const result = await chargeCard(orderId, amount);
      
      // Record success
      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute('payment.result', 'success');
      
      paymentCounter.add(1, { 
        status: 'success',
        payment_method: result.method 
      });
      
      return result;
    } catch (error) {
      // Record failure with details
      span.recordException(error as Error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: (error as Error).message 
      });
      
      paymentCounter.add(1, { 
        status: 'error',
        error_type: (error as Error).constructor.name
      });
      
      throw error;
    } finally {
      paymentDuration.record(Date.now() - startTime, {
        status: span.isRecording() ? 'completed' : 'error'
      });
      span.end();
    }
  });
}
```

The key pattern: **add business context as span attributes**. Generic HTTP spans tell you "this endpoint was slow." Spans with business attributes tell you "payment processing for orders over $1000 is slow."

![Team analyzing dashboard metrics on large monitor](https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200)
*Photo by Carlos Muza on Unsplash*

## The Observability Backends in 2026

With OTel abstracting the instrumentation layer, backend choice is now a first-class architectural decision rather than a painful lock-in.

**Self-hosted open source stack:**
- **Grafana + Tempo** (traces) + **Mimir** (metrics) + **Loki** (logs) — The "Grafana LGTM stack" is now production-grade and widely adopted. Highly recommended for teams with Kubernetes and operational maturity.
- **Jaeger + Prometheus** — The older combination, still solid, but Grafana's stack has better correlation features.

**Commercial options:**
- **Grafana Cloud** — Hosted version of the above, generous free tier
- **Honeycomb** — Superior querying capabilities, especially for high-cardinality data
- **Datadog** — Comprehensive but expensive; OTel ingest is now first-class
- **Axiom** — High-value option for logs, surprisingly cheap at scale

The trend: most new greenfield projects go with the self-hosted Grafana stack on Kubernetes. It's genuinely production-ready, the operational burden is manageable with Helm charts, and the $0 license cost matters at scale.

## Semantic Conventions: The Part People Skip

OpenTelemetry's semantic conventions are a set of standard attribute names for common concepts. They're not enforced, but ignoring them is a mistake.

```yaml
# Without semantic conventions
span.setAttributes({
  'request.url': '/api/users',    # ❌ Non-standard
  'http.code': 200,               # ❌ Non-standard  
  'query': 'SELECT * FROM users'  # ❌ Non-standard
});

# With semantic conventions
span.setAttributes({
  [SemanticAttributes.HTTP_TARGET]: '/api/users',  # ✅
  [SemanticAttributes.HTTP_STATUS_CODE]: 200,       # ✅
  [SemanticAttributes.DB_STATEMENT]: 'SELECT...',   # ✅
});
```

When everyone uses standard attribute names, dashboards, alerts, and queries become portable. A Grafana dashboard built for HTTP spans using semantic conventions works across services, languages, and frameworks.

## Where OTel Is Heading

The work isn't done. A few areas in active development:

**Profiling signals** — The OTel profiling specification is maturing. Continuous profiling (CPU flames, memory allocations) as a first-class telemetry signal, correlated with traces, is the goal. Early implementations exist; wide adoption is 12-18 months away.

**Logs GA maturity** — OTel logs hit GA in 2025, but production adoption is still catching up to traces and metrics. The challenge is migrating existing log pipelines (Fluentd, Logstash) to OTel.

**AI/ML observability** — The community is defining semantic conventions for LLM operations: model name, token usage, prompt length, latency. This is increasingly critical as AI inference becomes a core application component.

The foundation is solid. OpenTelemetry has won. Now the work is making the ecosystem deeper, not broader.

---

*Resources: [OpenTelemetry documentation](https://opentelemetry.io/docs/), [OTel Collector configuration](https://opentelemetry.io/docs/collector/configuration/), [Grafana LGTM stack](https://grafana.com/oss/)*
