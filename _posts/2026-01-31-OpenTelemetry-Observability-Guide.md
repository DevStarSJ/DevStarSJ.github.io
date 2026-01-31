---
layout: post
title: "OpenTelemetry: Complete Guide to Modern Observability"
subtitle: Implement distributed tracing, metrics, and logging with OpenTelemetry
categories: development
tags: opentelemetry observability tracing metrics monitoring devops
comments: true
---

# OpenTelemetry: Complete Guide to Modern Observability

OpenTelemetry (OTel) has become the industry standard for observability, providing vendor-neutral APIs and SDKs for distributed tracing, metrics, and logging. This comprehensive guide will help you implement production-grade observability in your applications.

## What is OpenTelemetry?

OpenTelemetry provides three pillars of observability:

```
┌─────────────────────────────────────────────────────────────┐
│                     OpenTelemetry                           │
├───────────────────┬───────────────────┬─────────────────────┤
│      Traces       │      Metrics      │        Logs         │
├───────────────────┼───────────────────┼─────────────────────┤
│ Request flow      │ Counters/Gauges   │ Structured events   │
│ Latency analysis  │ Histograms        │ Context correlation │
│ Error tracking    │ Resource usage    │ Debug information   │
└───────────────────┴───────────────────┴─────────────────────┘
```

## Setting Up OpenTelemetry

### Node.js/TypeScript

```bash
npm install @opentelemetry/api \
            @opentelemetry/sdk-node \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-trace-otlp-http \
            @opentelemetry/exporter-metrics-otlp-http
```

### Basic Configuration

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'my-service',
    [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://localhost:4318/v1/metrics',
    }),
    exportIntervalMillis: 10000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0));
});

export { sdk };
```

### Initialize Before App

```typescript
// index.ts
import './tracing'; // Must be first!
import express from 'express';

const app = express();
// ... rest of your app
```

## Distributed Tracing

### Manual Instrumentation

```typescript
import { trace, SpanStatusCode, SpanKind } from '@opentelemetry/api';

const tracer = trace.getTracer('my-service');

async function processOrder(orderId: string): Promise<Order> {
  return tracer.startActiveSpan('processOrder', async (span) => {
    try {
      span.setAttribute('order.id', orderId);
      
      // Create child spans for sub-operations
      const order = await tracer.startActiveSpan('fetchOrder', async (fetchSpan) => {
        fetchSpan.setAttribute('db.operation', 'SELECT');
        const result = await db.orders.findById(orderId);
        fetchSpan.end();
        return result;
      });
      
      await tracer.startActiveSpan('validateInventory', async (validateSpan) => {
        validateSpan.setAttribute('items.count', order.items.length);
        await validateInventory(order.items);
        validateSpan.end();
      });
      
      await tracer.startActiveSpan('processPayment', async (paymentSpan) => {
        paymentSpan.setAttribute('payment.amount', order.total);
        paymentSpan.setAttributes({
          'payment.currency': 'USD',
          'payment.method': order.paymentMethod,
        });
        await chargePayment(order);
        paymentSpan.end();
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      return order;
      
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);
      throw error;
      
    } finally {
      span.end();
    }
  });
}
```

### Context Propagation

```typescript
import { context, propagation, trace } from '@opentelemetry/api';

// Extract context from incoming request
app.use((req, res, next) => {
  const parentContext = propagation.extract(context.active(), req.headers);
  context.with(parentContext, () => next());
});

// Inject context into outgoing request
async function callExternalService(data: any) {
  const headers: Record<string, string> = {};
  propagation.inject(context.active(), headers);
  
  return fetch('http://other-service/api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers, // Trace context headers
    },
    body: JSON.stringify(data),
  });
}
```

## Metrics

### Creating Metrics

```typescript
import { metrics, ValueType } from '@opentelemetry/api';

const meter = metrics.getMeter('my-service');

// Counter - for counting events
const requestCounter = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests',
  unit: '1',
});

// Histogram - for measuring distributions
const requestDuration = meter.createHistogram('http_request_duration_ms', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
});

// Gauge - for current values (using observable)
const activeConnections = meter.createObservableGauge('active_connections', {
  description: 'Number of active connections',
});

activeConnections.addCallback((result) => {
  result.observe(connectionPool.activeCount, { pool: 'main' });
});

// UpDownCounter - for values that go up and down
const queueSize = meter.createUpDownCounter('queue_size', {
  description: 'Current queue size',
});
```

### Using Metrics

```typescript
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const attributes = {
      'http.method': req.method,
      'http.route': req.route?.path || 'unknown',
      'http.status_code': res.statusCode,
    };
    
    requestCounter.add(1, attributes);
    requestDuration.record(duration, attributes);
  });
  
  next();
});
```

### Custom Business Metrics

```typescript
const orderMetrics = {
  ordersCreated: meter.createCounter('orders_created_total'),
  orderValue: meter.createHistogram('order_value_usd', {
    description: 'Order value in USD',
    boundaries: [10, 50, 100, 250, 500, 1000],
  }),
  orderProcessingTime: meter.createHistogram('order_processing_seconds'),
};

async function createOrder(order: Order) {
  const startTime = Date.now();
  
  try {
    const result = await db.orders.create(order);
    
    orderMetrics.ordersCreated.add(1, {
      'order.type': order.type,
      'order.status': 'success',
    });
    orderMetrics.orderValue.record(order.total);
    
    return result;
  } finally {
    const duration = (Date.now() - startTime) / 1000;
    orderMetrics.orderProcessingTime.record(duration);
  }
}
```

## Structured Logging

### Integrating with OpenTelemetry

```typescript
import { trace, context } from '@opentelemetry/api';
import pino from 'pino';

const logger = pino({
  mixin() {
    const span = trace.getActiveSpan();
    if (span) {
      const spanContext = span.spanContext();
      return {
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
        trace_flags: spanContext.traceFlags,
      };
    }
    return {};
  },
});

// Now logs automatically include trace context
logger.info({ orderId: '123' }, 'Processing order');
// Output: {"level":30,"trace_id":"abc...","span_id":"def...","orderId":"123","msg":"Processing order"}
```

### OpenTelemetry Logs API

```typescript
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

const loggerProvider = logs.getLoggerProvider();
const otelLogger = loggerProvider.getLogger('my-service');

function logWithContext(message: string, attributes: Record<string, unknown>) {
  const span = trace.getActiveSpan();
  
  otelLogger.emit({
    severityNumber: SeverityNumber.INFO,
    body: message,
    attributes: {
      ...attributes,
      'service.name': 'my-service',
    },
    context: span ? trace.setSpan(context.active(), span) : context.active(),
  });
}
```

## OpenTelemetry Collector

### Configuration

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
    timeout: 1s
    send_batch_size: 1024
  
  memory_limiter:
    check_interval: 1s
    limit_mib: 1000
  
  attributes:
    actions:
      - key: environment
        value: production
        action: insert

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
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
      processors: [memory_limiter, batch, attributes]
      exporters: [otlp/jaeger]
    
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
    
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loki]
```

### Docker Compose

```yaml
version: '3.8'
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "8889:8889"   # Prometheus metrics

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686" # UI
      - "4317"        # OTLP gRPC

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  grafana-data:
```

## Auto-Instrumentation

### Supported Libraries

OpenTelemetry auto-instruments these libraries automatically:

- **HTTP**: Express, Fastify, Koa, Hapi
- **Databases**: PostgreSQL, MySQL, MongoDB, Redis
- **Messaging**: Kafka, RabbitMQ, AWS SQS
- **Cloud**: AWS SDK, GCP, Azure
- **GraphQL**: Apollo, graphql-js

### Configuration

```typescript
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const instrumentations = getNodeAutoInstrumentations({
  '@opentelemetry/instrumentation-http': {
    ignoreIncomingPaths: ['/health', '/ready'],
    requestHook: (span, request) => {
      span.setAttribute('custom.header', request.headers['x-custom']);
    },
  },
  '@opentelemetry/instrumentation-express': {
    enabled: true,
  },
  '@opentelemetry/instrumentation-pg': {
    enhancedDatabaseReporting: true,
  },
});
```

## Sampling Strategies

### Head-Based Sampling

```typescript
import { TraceIdRatioBasedSampler, ParentBasedSampler } from '@opentelemetry/sdk-trace-base';

// Sample 10% of traces
const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.1),
});
```

### Custom Sampler

```typescript
import { Sampler, SamplingDecision, SamplingResult } from '@opentelemetry/sdk-trace-base';

class PrioritySampler implements Sampler {
  shouldSample(context, traceId, spanName, spanKind, attributes): SamplingResult {
    // Always sample errors
    if (attributes['error'] === true) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }
    
    // Always sample VIP customers
    if (attributes['customer.tier'] === 'vip') {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }
    
    // Sample 10% of everything else
    const random = Math.random();
    if (random < 0.1) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }
    
    return { decision: SamplingDecision.NOT_RECORD };
  }
  
  toString(): string {
    return 'PrioritySampler';
  }
}
```

## Best Practices

### 1. Semantic Conventions

Use standard attribute names:

```typescript
import {
  SEMATTRS_HTTP_METHOD,
  SEMATTRS_HTTP_STATUS_CODE,
  SEMATTRS_HTTP_URL,
  SEMATTRS_DB_SYSTEM,
  SEMATTRS_DB_OPERATION,
} from '@opentelemetry/semantic-conventions';

span.setAttributes({
  [SEMATTRS_HTTP_METHOD]: 'GET',
  [SEMATTRS_HTTP_STATUS_CODE]: 200,
  [SEMATTRS_HTTP_URL]: 'https://api.example.com/users',
});
```

### 2. Error Handling

```typescript
span.setStatus({
  code: SpanStatusCode.ERROR,
  message: error.message,
});

span.recordException(error, {
  'exception.escaped': true,
});
```

### 3. Span Events

```typescript
span.addEvent('cache_miss', {
  'cache.key': 'user:123',
  'cache.type': 'redis',
});

span.addEvent('retry_attempt', {
  'retry.count': 2,
  'retry.delay_ms': 100,
});
```

### 4. Resource Detection

```typescript
import { envDetector, processDetector, hostDetector } from '@opentelemetry/resources';
import { awsEc2Detector } from '@opentelemetry/resource-detector-aws';

const resource = await detectResources({
  detectors: [envDetector, processDetector, hostDetector, awsEc2Detector],
});
```

## Conclusion

OpenTelemetry provides:

- **Vendor neutrality** - Switch backends without code changes
- **Unified observability** - Traces, metrics, and logs correlated
- **Automatic instrumentation** - Minimal code changes
- **Industry standard** - Wide adoption and support

Start with auto-instrumentation, then add custom spans and metrics where you need deeper visibility.

## Resources

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [OpenTelemetry Registry](https://opentelemetry.io/ecosystem/registry/)
- [Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
