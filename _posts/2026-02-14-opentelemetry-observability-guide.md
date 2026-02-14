---
layout: post
title: "OpenTelemetry: The Complete Guide to Modern Observability"
subtitle: "Implement unified tracing, metrics, and logging across your distributed systems with OpenTelemetry"
date: 2026-02-14
author: "Dev Star"
header-img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200"
tags: [OpenTelemetry, Observability, Monitoring, Tracing, Metrics, DevOps, SRE]
---

# OpenTelemetry: The Complete Guide to Modern Observability

In the world of distributed systems, understanding what's happening across your services is crucial. OpenTelemetry (OTel) has emerged as the industry standard for observability, providing a unified approach to traces, metrics, and logs.

![Dashboard Monitoring](https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800)
*Photo by [Carlos Muza](https://unsplash.com/@kmuza) on Unsplash*

## What is OpenTelemetry?

OpenTelemetry is a vendor-neutral, open-source observability framework that provides:

- **Traces**: Follow requests across service boundaries
- **Metrics**: Measure system and application performance
- **Logs**: Contextual event data linked to traces

### Why OpenTelemetry?

1. **Vendor Agnostic**: Export to any backend (Jaeger, Zipkin, Datadog, etc.)
2. **Industry Standard**: CNCF graduated project with wide adoption
3. **Unified SDK**: One instrumentation for all telemetry types
4. **Auto-Instrumentation**: Minimal code changes required

## Core Concepts

### Traces and Spans

A trace represents an end-to-end request journey. Each operation is a span:

```
Trace: user-checkout
├── Span: api-gateway (50ms)
│   ├── Span: auth-service (10ms)
│   └── Span: order-service (35ms)
│       ├── Span: inventory-check (15ms)
│       └── Span: payment-process (18ms)
└── Total: 50ms
```

### Metrics Types

- **Counter**: Cumulative values (requests, errors)
- **Gauge**: Point-in-time values (CPU usage, queue size)
- **Histogram**: Distribution of values (latency buckets)

## Getting Started with Python

### Installation

```bash
pip install opentelemetry-api \
            opentelemetry-sdk \
            opentelemetry-instrumentation-fastapi \
            opentelemetry-exporter-otlp
```

### Basic Setup

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Configure resource (identifies your service)
resource = Resource.create({
    "service.name": "order-service",
    "service.version": "1.0.0",
    "deployment.environment": "production"
})

# Set up tracer provider
provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="localhost:4317"))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# Get tracer
tracer = trace.get_tracer(__name__)
```

### Manual Instrumentation

```python
@tracer.start_as_current_span("process_order")
def process_order(order_id: str):
    span = trace.get_current_span()
    
    # Add attributes
    span.set_attribute("order.id", order_id)
    span.set_attribute("order.type", "standard")
    
    # Create child span
    with tracer.start_as_current_span("validate_payment") as child:
        child.set_attribute("payment.method", "credit_card")
        result = validate_payment(order_id)
        
        if not result:
            child.set_status(trace.Status(trace.StatusCode.ERROR))
            span.record_exception(PaymentError("Validation failed"))
    
    return complete_order(order_id)
```

![Code Analysis](https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800)
*Photo by [Kevin Ku](https://unsplash.com/@ikukevk) on Unsplash*

## Auto-Instrumentation

The real power of OTel—automatic instrumentation with zero code changes:

```bash
# Install auto-instrumentation
pip install opentelemetry-distro
opentelemetry-bootstrap -a install

# Run your app with auto-instrumentation
opentelemetry-instrument \
    --service_name order-service \
    --exporter_otlp_endpoint localhost:4317 \
    python app.py
```

This automatically instruments:
- HTTP frameworks (FastAPI, Flask, Django)
- Database clients (SQLAlchemy, psycopg2)
- HTTP clients (requests, httpx)
- Message queues (Celery, Kafka)

## FastAPI Integration

```python
from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

app = FastAPI()

# Instrument FastAPI
FastAPIInstrumentor.instrument_app(app)

# Instrument outgoing HTTP calls
HTTPXClientInstrumentor().instrument()

@app.get("/orders/{order_id}")
async def get_order(order_id: str):
    # This span is automatically created by FastAPI instrumentation
    # Add custom attributes
    span = trace.get_current_span()
    span.set_attribute("order.id", order_id)
    
    return {"order_id": order_id, "status": "completed"}
```

## Metrics Implementation

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Set up metrics
reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="localhost:4317"),
    export_interval_millis=60000
)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter(__name__)

# Create instruments
request_counter = meter.create_counter(
    name="http_requests_total",
    description="Total HTTP requests",
    unit="1"
)

latency_histogram = meter.create_histogram(
    name="http_request_duration_seconds",
    description="HTTP request latency",
    unit="s"
)

active_connections = meter.create_up_down_counter(
    name="active_connections",
    description="Number of active connections"
)

# Use metrics
def handle_request(method: str, path: str):
    start = time.time()
    active_connections.add(1)
    
    try:
        result = process_request()
        request_counter.add(1, {"method": method, "path": path, "status": "200"})
        return result
    except Exception as e:
        request_counter.add(1, {"method": method, "path": path, "status": "500"})
        raise
    finally:
        duration = time.time() - start
        latency_histogram.record(duration, {"method": method, "path": path})
        active_connections.add(-1)
```

## Logging Integration

Connect your logs to traces:

```python
import logging
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter

# Set up log provider
log_provider = LoggerProvider(resource=resource)
log_provider.add_log_record_processor(
    BatchLogRecordProcessor(OTLPLogExporter(endpoint="localhost:4317"))
)
set_logger_provider(log_provider)

# Add OTel handler to Python logging
handler = LoggingHandler(level=logging.INFO)
logging.getLogger().addHandler(handler)

# Logs are now correlated with traces!
logger = logging.getLogger(__name__)

@tracer.start_as_current_span("process_order")
def process_order(order_id: str):
    logger.info(f"Processing order {order_id}")  # Linked to current span
    # ...
```

## OpenTelemetry Collector

The OTel Collector is a proxy that receives, processes, and exports telemetry:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
  memory_limiter:
    check_interval: 1s
    limit_mib: 1000

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true
  prometheus:
    endpoint: 0.0.0.0:8889
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [jaeger]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loki]
```

## Best Practices

### 1. Semantic Conventions

Follow OTel semantic conventions for consistent attributes:

```python
from opentelemetry.semconv.trace import SpanAttributes

span.set_attribute(SpanAttributes.HTTP_METHOD, "GET")
span.set_attribute(SpanAttributes.HTTP_URL, "/api/orders")
span.set_attribute(SpanAttributes.HTTP_STATUS_CODE, 200)
span.set_attribute(SpanAttributes.DB_SYSTEM, "postgresql")
```

### 2. Sampling Strategy

Control trace volume with sampling:

```python
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased, ParentBased

# Sample 10% of traces, but always sample if parent was sampled
sampler = ParentBased(root=TraceIdRatioBased(0.1))
provider = TracerProvider(sampler=sampler, resource=resource)
```

### 3. Context Propagation

Ensure trace context flows across services:

```python
from opentelemetry.propagate import inject, extract

# Inject context into outgoing requests
headers = {}
inject(headers)
response = httpx.get("http://service-b/api", headers=headers)

# Extract context from incoming requests
context = extract(request.headers)
with tracer.start_as_current_span("handle", context=context):
    # Process request
```

## Conclusion

OpenTelemetry provides the foundation for modern observability. With unified instrumentation for traces, metrics, and logs, you can gain deep insights into your distributed systems without vendor lock-in.

Start with auto-instrumentation, add custom spans where needed, and export to your preferred backends. Your future self debugging a production incident will thank you.

---

*Implementing observability in your stack? OpenTelemetry is the way forward!*
