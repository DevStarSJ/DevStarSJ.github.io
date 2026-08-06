---
layout: post
title: "OpenTelemetry in Production: The Complete Observability Setup Guide"
subtitle: "From zero to full-stack observability — instrumenting your services, choosing backends, and building the dashboards and alerts that actually help you find and fix problems fast"
date: 2026-02-22
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200"
catalog: true
tags:
  - OpenTelemetry
  - Observability
  - Distributed Tracing
  - Monitoring
  - DevOps
---

# OpenTelemetry in Production: The Complete Observability Setup Guide

You can't fix what you can't see. That's the oldest truth in software operations, and it's never been more relevant than in 2026, when the average production system involves dozens of microservices, multiple cloud providers, and AI models making decisions in the middle of your request path.

OpenTelemetry (OTel) has become the industry standard for collecting observability data — traces, metrics, and logs — from your services. It's vendor-neutral, widely supported, and backed by the CNCF. The days of choosing between Datadog, Honeycomb, and New Relic instrumentation libraries are over. Instrument once with OTel, send to any backend.

This guide is the production setup I use across teams: not the "getting started" toy example, but the real configuration that holds up under load.

![Monitoring dashboard with multiple metrics and graphs on screens](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800)
*Photo by [Luke Chesser](https://unsplash.com/@lukechesser) on Unsplash*

---

## The Three Pillars, Unified

OpenTelemetry's core value is correlating all three observability signals:

| Signal | What it tells you | OTel Component |
|--------|-------------------|----------------|
| **Traces** | The path of a request through your system | TracerProvider |
| **Metrics** | The health and performance of your system | MeterProvider |
| **Logs** | What happened (with trace context attached) | LoggerProvider |

Before OTel, these three lived in separate systems with no connection. A trace ID in Datadog APM wasn't linked to the log in Splunk. OTel weaves them together — logs carry trace IDs, metrics carry span context, and you can jump from a slow trace to the logs generated during that span.

---

## The OTel Collector: Your Observability Router

The OTel Collector is the backbone of any production OTel setup. It's a vendor-agnostic proxy that receives telemetry from your services, processes it, and forwards it to one or more backends.

```
┌─────────────────┐     OTLP      ┌─────────────────┐     ┌──────────────┐
│  Your Services  │ ──────────── ▶│  OTel Collector │────▶│  Honeycomb   │
│  (instrumented) │               │                 │     └──────────────┘
└─────────────────┘               │  - Filter       │     ┌──────────────┐
                                  │  - Transform    │────▶│  Prometheus  │
                                  │  - Sample       │     └──────────────┘
                                  │  - Enrich       │     ┌──────────────┐
                                  └─────────────────┘────▶│  Loki        │
                                                          └──────────────┘
```

**Why route through the Collector instead of sending directly to backends?**

1. **Sampling** — reduce trace volume by 90% before it hits your expensive trace backend
2. **Transformation** — add metadata, scrub PII, normalize field names
3. **Fan-out** — send the same data to multiple backends (traces to Honeycomb + logs to Loki)
4. **Resilience** — Collector buffers and retries; your services don't need to handle backend outages

### Production Collector Configuration

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
  
  # Scrape Prometheus metrics from services that expose /metrics
  prometheus:
    config:
      scrape_configs:
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
        - role: pod
        relabel_configs:
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
          action: keep
          regex: 'true'

processors:
  # Add k8s metadata to all telemetry
  k8sattributes:
    auth_type: serviceAccount
    extract:
      metadata:
      - k8s.pod.name
      - k8s.namespace.name
      - k8s.deployment.name
      - k8s.node.name

  # Tail-based sampling: keep 100% of error traces, 5% of success traces
  tail_sampling:
    decision_wait: 10s
    policies:
    - name: errors-policy
      type: status_code
      status_code: {status_codes: [ERROR]}
    - name: slow-traces-policy
      type: latency
      latency: {threshold_ms: 1000}
    - name: probabilistic-policy
      type: probabilistic
      probabilistic: {sampling_percentage: 5}

  # Remove PII from spans before sending
  transform:
    trace_statements:
    - context: span
      statements:
      - replace_pattern(attributes["http.url"], "token=[^&]*", "token=REDACTED")
      - delete_key(attributes, "user.email") where IsMatch(name, "auth.*")

  batch:
    timeout: 5s
    send_batch_size: 1000

exporters:
  # Traces to Honeycomb
  otlp/honeycomb:
    endpoint: api.honeycomb.io:443
    headers:
      x-honeycomb-team: ${HONEYCOMB_API_KEY}
  
  # Metrics to Prometheus remote write
  prometheusremotewrite:
    endpoint: https://prometheus.mycompany.com/api/v1/write
    tls:
      insecure: false
  
  # Logs to Loki
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [k8sattributes, tail_sampling, transform, batch]
      exporters: [otlp/honeycomb]
    
    metrics:
      receivers: [otlp, prometheus]
      processors: [k8sattributes, batch]
      exporters: [prometheusremotewrite]
    
    logs:
      receivers: [otlp]
      processors: [k8sattributes, batch]
      exporters: [loki]
```

---

## Instrumenting Your Services

### Auto-Instrumentation (Zero Code Changes)

For Python, Java, and Node.js, OTel provides auto-instrumentation that injects traces without touching application code:

```yaml
# Kubernetes: inject OTel auto-instrumentation via operator
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: python-instrumentation
  namespace: production
spec:
  exporter:
    endpoint: http://otel-collector:4317
  propagators:
    - tracecontext
    - baggage
    - b3
  python:
    env:
    - name: OTEL_PYTHON_LOG_CORRELATION
      value: "true"
    - name: OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED
      value: "true"

---
# Annotate your deployment to enable auto-instrumentation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-python-service
  annotations:
    instrumentation.opentelemetry.io/inject-python: "python-instrumentation"
```

This gets you automatic traces for HTTP requests, database queries, Redis calls, and more — with zero code changes.

### Manual Instrumentation (For Custom Spans)

When you need to trace your own business logic:

```python
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
import opentelemetry.propagate as propagate

# Initialize (usually in app startup)
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="otel-collector:4317"))
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer(__name__)

# Use in your code
async def process_order(order_id: str, items: list[dict]):
    with tracer.start_as_current_span("process_order") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("order.item_count", len(items))
        
        try:
            # Nested span for the inventory check
            with tracer.start_as_current_span("check_inventory") as inv_span:
                inventory = await check_inventory(items)
                inv_span.set_attribute("inventory.all_available", inventory.all_available)
                
                if not inventory.all_available:
                    inv_span.set_attribute("inventory.missing_items", 
                                          str(inventory.missing))
                    raise InsufficientInventory(inventory.missing)
            
            # Nested span for payment processing
            with tracer.start_as_current_span("charge_payment") as pay_span:
                payment = await charge_payment(order_id)
                pay_span.set_attribute("payment.transaction_id", payment.transaction_id)
                pay_span.set_attribute("payment.amount", payment.amount)
            
            span.set_status(Status(StatusCode.OK))
            return {"order_id": order_id, "status": "confirmed"}
        
        except Exception as e:
            span.set_status(Status(StatusCode.ERROR, str(e)))
            span.record_exception(e)
            raise
```

---

## Custom Metrics with OTel

Beyond auto-collected metrics, add business metrics that matter to you:

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Initialize meter
meter_provider = MeterProvider(
    metric_readers=[
        PeriodicExportingMetricReader(
            OTLPMetricExporter(endpoint="otel-collector:4317"),
            export_interval_millis=30_000
        )
    ]
)
metrics.set_meter_provider(meter_provider)
meter = metrics.get_meter(__name__)

# Create instruments
order_counter = meter.create_counter(
    name="orders.total",
    description="Total number of orders processed",
    unit="1"
)

order_revenue = meter.create_counter(
    name="orders.revenue",
    description="Total revenue from orders",
    unit="USD"
)

order_latency = meter.create_histogram(
    name="orders.processing_latency",
    description="Time to process an order",
    unit="ms"
)

checkout_queue_depth = meter.create_observable_gauge(
    name="checkout.queue_depth",
    callbacks=[lambda: [(queue.qsize(), {})]],
    description="Current checkout queue depth"
)

# Use in your business logic
async def process_order(order: Order):
    start = time.time()
    
    try:
        result = await _process_order_internal(order)
        
        # Record success metrics with dimensions
        order_counter.add(1, {
            "status": "success",
            "region": order.region,
            "tier": order.customer_tier,
        })
        order_revenue.add(order.total_amount, {
            "region": order.region,
            "payment_method": order.payment_method,
        })
        return result
    
    except Exception as e:
        order_counter.add(1, {
            "status": "error",
            "error_type": type(e).__name__,
            "region": order.region,
        })
        raise
    
    finally:
        order_latency.record(
            (time.time() - start) * 1000,
            {"region": order.region}
        )
```

---

## Connecting Logs to Traces

The killer feature of OTel observability is jumping from a slow trace directly to the logs generated during that span. Requires adding the trace context to your log records:

```python
import logging
from opentelemetry import trace
from opentelemetry.instrumentation.logging import LoggingInstrumentor

# Enable OTel log instrumentation (automatically injects trace_id into logs)
LoggingInstrumentor().instrument(set_logging_format=True)

logger = logging.getLogger(__name__)

# Now every log call automatically includes trace_id and span_id
def handle_request(request_id: str):
    logger.info("Processing request", extra={
        "request_id": request_id,
        "user_id": get_current_user_id(),
    })
    # Log output: {"message": "Processing request", "trace_id": "abc123", 
    #              "span_id": "def456", "request_id": "req-789", ...}
```

In Grafana, configure the logs datasource to extract `trace_id` as a derived field, linking directly to the trace in Tempo or Jaeger.

---

## Sampling Strategy: Don't Go Broke on Traces

Sending 100% of traces to a backend like Honeycomb gets expensive fast. At 1,000 req/s, that's 86M traces/day. Smart sampling keeps costs under control without losing visibility.

### Head-Based Sampling (Simple but Lossy)

```python
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased, ALWAYS_ON, ALWAYS_OFF, ParentBased

# Sample 10% of traces, but always sample if parent was sampled
sampler = ParentBased(
    root=TraceIdRatioBased(0.1),  # 10% of new traces
    remote_parent_sampled=ALWAYS_ON,    # Always continue sampled traces
    remote_parent_not_sampled=ALWAYS_OFF
)
```

**Problem:** You sample before you know if the request will fail, meaning 90% of your error traces get dropped.

### Tail-Based Sampling (Smarter)

The Collector's tail-based sampling policy sees the complete trace before deciding. Use the configuration shown earlier in the Collector config — keep 100% of errors, 100% of slow requests, 5% of everything else.

This is the right production default. Errors are rare and always worth keeping; healthy fast requests are repetitive and cheap to sample.

---

## Dashboards and Alerts That Matter

Three dashboards every service needs:

**1. Service Health (the one you check first)**
- Request rate (req/s)
- Error rate (%)
- P50/P95/P99 latency
- Apdex score

**2. Infrastructure**
- CPU / memory utilization
- GC pause time (JVM/Go)
- Thread pool saturation
- Database connection pool usage

**3. Business Metrics**
- Orders/transactions per minute
- Revenue rate
- Conversion funnel drop-offs

Alert rules (start with these, tune thresholds over time):

{% raw %}
```yaml
# Grafana alert rules (as code)
- alert: HighErrorRate
  expr: |
    sum(rate(http_requests_total{status=~"5.."}[5m])) /
    sum(rate(http_requests_total[5m])) > 0.01
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Error rate > 1% for {{ $labels.service }}"

- alert: P99LatencyHigh
  expr: |
    histogram_quantile(0.99, 
      sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
    ) > 2
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "P99 latency > 2s for {{ $labels.service }}"
```
{% endraw %}

![Multi-monitor setup showing code and dashboards for system monitoring](https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800)
*Photo by [Carlos Muza](https://unsplash.com/@kmuza) on Unsplash*

---

## The OSS Stack vs Commercial Backends

| Stack | Cost | Ops Burden | Features |
|-------|------|-----------|---------|
| **Grafana + Tempo + Loki + Prometheus** | Low (infra only) | High | Full control |
| **Honeycomb** | Medium-high | Low | Best trace UX |
| **Datadog** | High | Low | Best all-in-one |
| **Grafana Cloud** | Medium | Low | OSS stack hosted |
| **New Relic** | Medium | Low | Good for .NET/Java |

For teams under 50 engineers: use **Grafana Cloud** or **Honeycomb**. Managed services cost less than an engineer's time to run the OSS stack.

For large orgs with dedicated platform teams: the OSS stack (Grafana + Tempo + Loki + Prometheus + VictoriaMetrics) is cheaper at scale and gives you full data ownership.

---

## Getting Started in a Day

1. **Deploy the OTel Collector** as a DaemonSet in your k8s cluster
2. **Enable auto-instrumentation** for your primary language (Python/Java/Node.js operator)
3. **Pick one backend** — Grafana Cloud is the fastest path to a working setup
4. **Build the service health dashboard** — request rate, error rate, latency
5. **Add three alerts** — error rate spike, latency spike, pod restart loop

You'll have meaningful observability in under a day. Everything else — custom business metrics, tail-based sampling, log correlation — is iterative improvement on a working foundation.

Observability is a product. Ship v1, then improve.
