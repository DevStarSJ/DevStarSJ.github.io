---
layout: post
title: "OpenTelemetry in Production: End-to-End Observability for Microservices in 2026"
subtitle: "From zero to full-stack distributed tracing, metrics, and logs with OpenTelemetry, Grafana, and Tempo"
date: 2026-03-18 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&q=80"
catalog: true
tags:
  - OpenTelemetry
  - Observability
  - DevOps
  - Microservices
  - Grafana
---

# OpenTelemetry in Production: End-to-End Observability for Microservices in 2026

Observability has crossed the chasm from "nice to have" to "table stakes" for production systems. But instrumenting dozens of microservices across multiple languages used to mean maintaining separate integrations for each observability backend. OpenTelemetry (OTel) changed that permanently. In 2026, OTel is the universal standard — vendor-neutral, runtime-agnostic, and stable across all three signal types: traces, metrics, and logs.

This guide walks you through setting up production-grade observability from scratch using OpenTelemetry with Grafana's LGTM stack (Loki, Grafana, Tempo, Mimir).

![Observability Dashboard](https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80)
*Photo by [Carlos Muza](https://unsplash.com/@kmuza) on Unsplash*

---

## The Three Pillars of Observability

| Signal | What It Tells You | OTel Component |
|---|---|---|
| **Traces** | How a request flows through your system | OTLP traces → Tempo |
| **Metrics** | Aggregated system health over time | OTLP metrics → Mimir/Prometheus |
| **Logs** | Timestamped event records | OTLP logs → Loki |

The OTel promise: instrument once, export anywhere.

---

## Architecture Overview

```
Your Services (Node/Python/Java/Go)
    ↓ OTLP (gRPC/HTTP)
OTel Collector (sidecar or daemonset)
    ↓ ↓ ↓
  Tempo  Mimir  Loki
    ↓ ↓ ↓
    Grafana (unified UI)
```

The **OTel Collector** is the backbone: it receives telemetry from your services, transforms it, and routes it to the appropriate backends.

---

## Setting Up the Collector

### docker-compose.yml

```yaml
version: "3.9"
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.115.0
    command: ["--config=/etc/otelcol-contrib/config.yaml"]
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
      - "8888:8888"    # Collector metrics
      - "8889:8889"    # Prometheus scrape endpoint
    depends_on:
      - tempo
      - loki
      - mimir

  tempo:
    image: grafana/tempo:2.6.0
    command: ["-config.file=/etc/tempo.yaml"]
    volumes:
      - ./tempo-config.yaml:/etc/tempo.yaml
      - tempo-data:/var/tempo
    ports:
      - "3200:3200"

  loki:
    image: grafana/loki:3.3.0
    command: ["-config.file=/etc/loki/local-config.yaml"]
    volumes:
      - loki-data:/loki
    ports:
      - "3100:3100"

  mimir:
    image: grafana/mimir:2.14.0
    command: ["--config.file=/etc/mimir/mimir.yaml"]
    volumes:
      - ./mimir-config.yaml:/etc/mimir/mimir.yaml
      - mimir-data:/data
    ports:
      - "9009:9009"

  grafana:
    image: grafana/grafana:11.4.0
    environment:
      - GF_FEATURE_TOGGLES_ENABLE=traceqlEditor metricsSummary
    volumes:
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
      - grafana-data:/var/lib/grafana
    ports:
      - "3000:3000"

volumes:
  tempo-data:
  loki-data:
  mimir-data:
  grafana-data:
```

### otel-config.yaml

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024

  # Add resource attributes to all signals
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: upsert

  # Memory limiter prevents OOM
  memory_limiter:
    check_interval: 1s
    limit_mib: 400
    spike_limit_mib: 100

  # Tail sampling: keep 100% of errors, 10% of success
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: errors-policy
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: slow-traces-policy
        type: latency
        latency: { threshold_ms: 1000 }
      - name: sampling-policy
        type: probabilistic
        probabilistic: { sampling_percentage: 10 }

exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

  loki:
    endpoint: http://loki:3100/loki/api/v1/push
    default_labels_enabled:
      exporter: false
      job: true

  prometheusremotewrite:
    endpoint: http://mimir:9009/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch, tail_sampling]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [loki]
```

---

## Instrumenting a Node.js Service

### Auto-Instrumentation (Zero Code Changes)

```typescript
// tracing.ts — import BEFORE anything else
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "order-service",
    [ATTR_SERVICE_VERSION]: "2.1.0",
    "deployment.environment": process.env.NODE_ENV ?? "development",
  }),

  traceExporter: new OTLPTraceExporter({
    url: "http://otel-collector:4317",
  }),

  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: "http://otel-collector:4317",
    }),
    exportIntervalMillis: 10_000,
  }),

  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({ url: "http://otel-collector:4317" })
  ),

  // Auto-instruments: express, http, pg, redis, grpc, and 40+ more
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-http": {
        ignoreIncomingRequestHook: (req) => req.url === "/health",
      },
      "@opentelemetry/instrumentation-pg": {
        enhancedDatabaseReporting: true, // Include SQL queries in spans
      },
    }),
  ],
});

sdk.start();
process.on("SIGTERM", () => sdk.shutdown());
```

```bash
# package.json start command
node -r ./tracing.js dist/server.js
```

That's it. Express routes, database queries, outbound HTTP calls, and Redis operations are all automatically traced.

### Manual Instrumentation for Business Logic

```typescript
import { trace, metrics, context, propagation } from "@opentelemetry/api";

const tracer = trace.getTracer("order-service");
const meter = metrics.getMeter("order-service");

// Custom metrics
const orderCounter = meter.createCounter("orders.created", {
  description: "Number of orders created",
  unit: "{order}",
});

const processingTime = meter.createHistogram("order.processing.duration", {
  description: "Time to process an order",
  unit: "ms",
});

export async function processOrder(orderId: string, items: OrderItem[]) {
  // Create a custom span
  return tracer.startActiveSpan("processOrder", async (span) => {
    try {
      // Add semantic attributes
      span.setAttribute("order.id", orderId);
      span.setAttribute("order.item_count", items.length);
      span.setAttribute("order.total_value", calculateTotal(items));

      const start = performance.now();

      // Validate inventory
      span.addEvent("inventory_check_started");
      await checkInventory(items);
      span.addEvent("inventory_check_completed");

      // Create order in DB
      const order = await db.orders.create({ orderId, items });
      
      // Record metrics
      const duration = performance.now() - start;
      orderCounter.add(1, { "order.status": "success", "order.region": "us-east" });
      processingTime.record(duration, { "order.item_count": items.length });

      span.setStatus({ code: SpanStatusCode.OK });
      return order;
    } catch (error) {
      // Record error details
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      orderCounter.add(1, { "order.status": "error" });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## Structured Logging with Trace Correlation

The real power of OTel comes from correlating logs with traces. When a log message includes `trace_id` and `span_id`, Grafana can link directly from a log line to the trace that produced it.

```typescript
import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { context, trace } from "@opentelemetry/api";

const logger = logs.getLogger("order-service");

function log(
  severity: SeverityNumber,
  message: string,
  attributes?: Record<string, string | number | boolean>
) {
  const activeSpan = trace.getActiveSpan();
  const spanContext = activeSpan?.spanContext();

  logger.emit({
    severityNumber: severity,
    severityText: SeverityNumber[severity],
    body: message,
    attributes: {
      ...attributes,
      // Auto-correlate with active trace
      "trace.id": spanContext?.traceId,
      "span.id": spanContext?.spanId,
    },
  });
}

// Usage
log(SeverityNumber.INFO, "Order created successfully", {
  "order.id": order.id,
  "user.id": userId,
});
```

---

## Grafana Dashboards and Alerts

### Provisioned Datasource Configuration

```yaml
# grafana/datasources/datasources.yaml
apiVersion: 1
datasources:
  - name: Tempo
    type: tempo
    url: http://tempo:3200
    jsonData:
      tracesToLogsV2:
        datasourceUid: loki
        tags: [{ key: "service.name", value: "service" }]
      serviceMap:
        datasourceUid: mimir
      
  - name: Loki
    type: loki
    url: http://loki:3100
    jsonData:
      derivedFields:
        - name: TraceID
          matcherRegex: '"trace.id":"(\w+)"'
          url: "$${__value.raw}"
          datasourceUid: tempo
          
  - name: Mimir
    type: prometheus
    url: http://mimir:9009/prometheus
```

### Key Alerts to Configure

{% raw %}
```yaml
# Grafana alert rule (via API or dashboard)
groups:
  - name: order-service
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_server_request_duration_seconds_count{
            job="order-service",
            http_response_status_code=~"5.."
          }[5m])) /
          sum(rate(http_server_request_duration_seconds_count{
            job="order-service"
          }[5m])) > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Error rate > 1% for order-service"
          
      - alert: SlowP99Latency
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_server_request_duration_seconds_bucket{
              job="order-service"
            }[5m])) by (le, http_route)
          ) > 2.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 latency > 2s on {{ $labels.http_route }}"
```
{% endraw %}

---

## Python Service Instrumentation

```python
# tracing.py
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor

def setup_telemetry(service_name: str):
    # Traces
    tracer_provider = TracerProvider(
        resource=Resource.create({
            SERVICE_NAME: service_name,
            DEPLOYMENT_ENVIRONMENT: os.getenv("ENVIRONMENT", "dev"),
        })
    )
    tracer_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
    )
    trace.set_tracer_provider(tracer_provider)

    # Metrics
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint="http://otel-collector:4317"),
        export_interval_millis=10_000,
    )
    meter_provider = MeterProvider(
        resource=tracer_provider.resource,
        metric_readers=[metric_reader],
    )
    metrics.set_meter_provider(meter_provider)

    # Auto-instrumentations
    FastAPIInstrumentor().instrument()
    SQLAlchemyInstrumentor().instrument()
    RedisInstrumentor().instrument()
```

---

## Production Checklist

- [ ] **Sampling configured**: Don't send 100% of traces in high-traffic environments
- [ ] **Sensitive data scrubbed**: Remove PII from span attributes (credit card numbers, passwords)
- [ ] **Collector resource limits set**: Memory limiter prevents cascade failures
- [ ] **Trace context propagated**: `traceparent` header forwarded through all service calls
- [ ] **Baseline alerts defined**: Error rate, latency P99, saturation
- [ ] **Log-trace correlation enabled**: `trace_id` in structured logs
- [ ] **Retention policies configured**: Don't keep 13 months of raw traces
- [ ] **Cost monitored**: High-cardinality metrics can blow up storage costs

---

## Conclusion

OpenTelemetry in 2026 has reached a level of maturity that makes "observability as an afterthought" inexcusable. The collector-based architecture means you can switch backends without changing application code. Auto-instrumentation handles the boilerplate, and manual instrumentation fills in the business-logic gaps. With the LGTM stack, you get a fully integrated observability platform at near-zero licensing cost. Start with auto-instrumentation, add custom metrics for your key business events, configure alert thresholds for your SLOs, and you'll have production-grade observability in a day.
