---
layout: post
title: "Kubernetes Observability with OpenTelemetry: The Complete Guide"
subtitle: "Unified traces, metrics, and logs for cloud-native applications"
date: 2026-02-08
author: "Dev Star"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1920&q=80"
tags: [Kubernetes, OpenTelemetry, Observability, DevOps, Monitoring, Distributed Systems]
---

Debugging distributed systems is hard. Requests bounce between dozens of services, and when something breaks, finding the root cause feels like searching for a needle in a haystack. OpenTelemetry (OTel) solves this by providing a unified standard for collecting traces, metrics, and logs.

![Server room](https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&q=80)
*Photo by [Taylor Vick](https://unsplash.com/@tvick) on Unsplash*

## Why OpenTelemetry?

Before OTel, every observability vendor had proprietary agents and formats:
- Datadog agent for Datadog
- Jaeger client for Jaeger
- Prometheus client for metrics

Switching vendors meant rewriting instrumentation. OpenTelemetry fixes this with:

- **Vendor-neutral SDK**: Write once, export anywhere
- **Automatic instrumentation**: Trace HTTP, gRPC, databases without code changes
- **Unified format**: OTLP protocol for all telemetry types
- **CNCF backing**: Industry standard, not a single vendor's project

## Setting Up the OTel Collector

The OpenTelemetry Collector receives, processes, and exports telemetry data. Deploy it as a DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector
  namespace: observability
spec:
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.96.0
          args:
            - --config=/etc/otel/config.yaml
          ports:
            - containerPort: 4317  # OTLP gRPC
            - containerPort: 4318  # OTLP HTTP
            - containerPort: 8888  # Metrics
          volumeMounts:
            - name: config
              mountPath: /etc/otel
          resources:
            requests:
              memory: 256Mi
              cpu: 100m
            limits:
              memory: 512Mi
              cpu: 500m
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
```

Configure the collector pipeline:

```yaml
# otel-collector-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318
      
      # Scrape Kubernetes metrics
      prometheus:
        config:
          scrape_configs:
            - job_name: 'kubernetes-pods'
              kubernetes_sd_configs:
                - role: pod
    
    processors:
      batch:
        timeout: 5s
        send_batch_size: 1000
      
      # Add Kubernetes metadata
      k8sattributes:
        extract:
          metadata:
            - k8s.namespace.name
            - k8s.pod.name
            - k8s.deployment.name
        pod_association:
          - sources:
              - from: resource_attribute
                name: k8s.pod.ip
      
      # Sample traces to reduce volume
      probabilistic_sampler:
        sampling_percentage: 10
    
    exporters:
      # Send to your backend of choice
      otlp/jaeger:
        endpoint: jaeger-collector:4317
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
          processors: [batch, k8sattributes, probabilistic_sampler]
          exporters: [otlp/jaeger]
        
        metrics:
          receivers: [otlp, prometheus]
          processors: [batch, k8sattributes]
          exporters: [prometheus]
        
        logs:
          receivers: [otlp]
          processors: [batch, k8sattributes]
          exporters: [loki]
```

![Data center](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80)
*Photo by [Jordan Harrison](https://unsplash.com/@jordanharrison) on Unsplash*

## Instrumenting Your Application

### Python with Auto-Instrumentation

Install packages:
```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install
```

Run with auto-instrumentation:
```bash
opentelemetry-instrument \
    --service_name=order-service \
    --exporter_otlp_endpoint=http://otel-collector:4317 \
    python app.py
```

### Go Manual Instrumentation

```go
package main

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/trace"
    "go.opentelemetry.io/otel/attribute"
)

func initTracer() (*trace.TracerProvider, error) {
    exporter, err := otlptracegrpc.New(
        context.Background(),
        otlptracegrpc.WithEndpoint("otel-collector:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }
    
    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
        trace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName("payment-service"),
            semconv.ServiceVersion("1.0.0"),
        )),
    )
    otel.SetTracerProvider(tp)
    return tp, nil
}

func processPayment(ctx context.Context, orderID string) error {
    tracer := otel.Tracer("payment")
    ctx, span := tracer.Start(ctx, "process_payment")
    defer span.End()
    
    span.SetAttributes(
        attribute.String("order.id", orderID),
        attribute.Float64("payment.amount", 99.99),
    )
    
    // Your payment logic here
    err := chargeCard(ctx, orderID)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return err
    }
    
    return nil
}
```

### Node.js with SDK

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  serviceName: 'api-gateway',
  traceExporter: new OTLPTraceExporter({
    url: 'grpc://otel-collector:4317',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Custom spans
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('api-gateway');

async function handleRequest(req, res) {
  const span = tracer.startSpan('handle_request');
  span.setAttribute('http.route', req.path);
  
  try {
    const result = await processRequest(req);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}
```

## Correlating Traces with Logs

The killer feature: connecting logs to traces. When a trace ID appears in logs, you can jump directly to the relevant trace.

```python
import logging
from opentelemetry import trace
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter

# Setup OTel logging
logger_provider = LoggerProvider()
logger_provider.add_log_record_processor(
    BatchLogRecordProcessor(OTLPLogExporter())
)
set_logger_provider(logger_provider)

# Add OTel handler to standard logging
handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
logging.getLogger().addHandler(handler)

# Logs automatically include trace context
logger = logging.getLogger(__name__)

def process_order(order_id):
    tracer = trace.get_tracer(__name__)
    with tracer.start_as_current_span("process_order") as span:
        span.set_attribute("order.id", order_id)
        
        # This log will include trace_id and span_id
        logger.info(f"Processing order {order_id}")
        
        # Business logic...
        logger.info(f"Order {order_id} completed")
```

## Dashboards and Alerting

With data flowing to Grafana, create unified dashboards:

```yaml
# Grafana dashboard example - RED metrics
panels:
  - title: Request Rate
    type: graph
    targets:
      - expr: sum(rate(http_server_request_count[5m])) by (service)
  
  - title: Error Rate  
    type: graph
    targets:
      - expr: |
          sum(rate(http_server_request_count{http_status_code=~"5.."}[5m])) 
          / 
          sum(rate(http_server_request_count[5m]))
  
  - title: Latency (p99)
    type: graph
    targets:
      - expr: histogram_quantile(0.99, rate(http_server_duration_bucket[5m]))
```

Alert on SLO violations:

```yaml
groups:
  - name: slo-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_server_request_count{http_status_code=~"5.."}[5m])) 
          / 
          sum(rate(http_server_request_count[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error rate exceeds 1% SLO"
      
      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, rate(http_server_duration_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 latency exceeds 500ms"
```

## Best Practices

1. **Sample intelligently**: 100% tracing is expensive. Use head-based sampling for errors and tail-based for interesting patterns.

2. **Add business context**: Trace attributes should include business IDs (order_id, user_id) for debugging.

3. **Set resource attributes**: Service name, version, and environment make filtering easier.

4. **Use semantic conventions**: Follow OTel naming standards (http.method, db.system, etc.) for cross-service consistency.

5. **Monitor the collector**: The collector itself needs monitoring—set resource limits and alert on queue buildup.

## Conclusion

OpenTelemetry transforms Kubernetes observability from a vendor lock-in nightmare into a standards-based capability. Instrument once, export anywhere, and finally understand what your distributed system is actually doing.

Start with auto-instrumentation, add custom spans where needed, and build dashboards that answer real questions about your system's health.
