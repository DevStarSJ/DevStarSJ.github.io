---
layout: post
title: "Event-Driven Architecture in 2026: Kafka, Redpanda, and Building Resilient Systems"
subtitle: "A practical guide to designing, implementing, and operating event-driven systems that scale to millions of events per second"
date: 2026-02-26
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200"
catalog: true
tags:
  - Kafka
  - Redpanda
  - Event-Driven Architecture
  - Distributed Systems
  - Backend
  - Microservices
---

# Event-Driven Architecture in 2026: Kafka, Redpanda, and Building Resilient Systems

Event-driven architecture (EDA) has moved from a pattern used by large-scale companies like Netflix and Uber to something engineering teams of all sizes are adopting. The tooling has matured, the operational complexity has decreased, and the benefits — loose coupling, scalability, and resilience — are too significant to ignore.

This guide covers the essentials: core patterns, technology choices, and the hard-won lessons from running EDA in production.

![Server rack with blinking lights representing distributed data streams](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800)
*Photo by [Taylor Vick](https://unsplash.com/@tvick) on Unsplash*

---

## Why Event-Driven Architecture?

Traditional request-response APIs couple services tightly:

```
OrderService → PaymentService → InventoryService → NotificationService
```

If any service is slow or down, the whole chain fails. Event-driven flips this:

```
OrderService publishes OrderCreated event
  └── PaymentService (subscriber) processes it independently
  └── InventoryService (subscriber) processes it independently
  └── NotificationService (subscriber) processes it independently
```

Benefits:
- **Resilience**: Downstream failures don't cascade upstream
- **Scalability**: Each consumer scales independently
- **Decoupling**: Services don't need to know about each other
- **Replay**: Events are persisted — you can reprocess historical data
- **Audit trail**: Full history of what happened and when

---

## Kafka vs. Redpanda: Choosing Your Broker

### Apache Kafka

The industry standard. Proven at LinkedIn, Netflix, Uber — trillions of messages per day. Written in Java/Scala with ZooKeeper (now KRaft mode) for metadata.

**Kafka KRaft Mode (2026 default):**
```bash
# No more ZooKeeper dependency
# Kafka manages its own metadata via Raft consensus

# kraft/server.properties
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@kafka1:9093,2@kafka2:9093,3@kafka3:9093
listeners=PLAINTEXT://:9092,CONTROLLER://:9093
```

### Redpanda

A Kafka-compatible broker written in C++. Same API, dramatically simpler operations:

```bash
# Single binary, no JVM, no ZooKeeper
docker run -p 9092:9092 redpandadata/redpanda:latest \
  redpanda start \
  --overprovisioned \
  --smp 1 \
  --memory 1G \
  --reserve-memory 0M \
  --node-id 0 \
  --check=false
```

**Key differences:**

| Feature | Kafka | Redpanda |
|---|---|---|
| Runtime | JVM | Native C++ |
| Dependencies | ZooKeeper (legacy) / KRaft | None |
| P99 Latency | ~5-15ms | ~1-3ms |
| Ops complexity | High | Low |
| Kafka compatibility | Native | API-compatible |
| Storage | Segment files | Custom storage engine |
| Best for | Massive scale, ecosystem | Simplicity, low latency |

**Verdict for 2026**: Redpanda for new projects. Kafka when you need the full ecosystem (Kafka Streams, hundreds of connectors, existing expertise).

---

## Core Patterns

### 1. Event Notification

The simplest pattern — notify that something happened:

```typescript
// Producer
interface OrderCreatedEvent {
  eventId: string;
  eventType: 'order.created';
  occurredAt: string; // ISO-8601
  payload: {
    orderId: string;
    customerId: string;
    totalAmount: number;
    currency: string;
  };
}

const event: OrderCreatedEvent = {
  eventId: crypto.randomUUID(),
  eventType: 'order.created',
  occurredAt: new Date().toISOString(),
  payload: {
    orderId: order.id,
    customerId: order.customerId,
    totalAmount: order.total,
    currency: 'USD',
  },
};

await producer.send({
  topic: 'orders',
  messages: [{ 
    key: order.id,  // Ensures ordering per order
    value: JSON.stringify(event),
  }],
});
```

### 2. Event-Carried State Transfer

Include enough data in the event so consumers don't need to call back:

```typescript
// Bad: Consumer must call back to get order details
interface OrderCreatedEvent {
  orderId: string; // Consumer needs to GET /orders/{id}
}

// Good: Include all needed state
interface OrderCreatedEvent {
  orderId: string;
  customerId: string;
  customerEmail: string;
  items: Array<{ sku: string; quantity: number; price: number }>;
  totalAmount: number;
  shippingAddress: Address;
}
```

This avoids thundering herds on your APIs when an event triggers many consumers.

### 3. Outbox Pattern

The #1 source of bugs in EDA: you save to the database AND publish an event, but one fails:

```typescript
// WRONG — not atomic
await db.orders.create(order);
await kafka.produce('orders', orderCreatedEvent); // What if this fails?
```

The Outbox Pattern fixes this using a single database transaction:

```typescript
// CORRECT — atomic via outbox
await db.transaction(async (tx) => {
  await tx.orders.create(order);
  
  // Write to outbox table in same transaction
  await tx.outbox.create({
    id: crypto.randomUUID(),
    topic: 'orders',
    key: order.id,
    payload: JSON.stringify(orderCreatedEvent),
    createdAt: new Date(),
    publishedAt: null,
  });
});

// Separate process reads outbox and publishes
// (Debezium CDC is the gold standard for this)
```

**Debezium CDC for Outbox:**

```json
// Debezium connector config
{
  "name": "outbox-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.dbname": "myapp",
    "table.include.list": "public.outbox",
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.table.field.event.key": "key",
    "transforms.outbox.table.field.event.payload": "payload",
    "transforms.outbox.route.by.field": "topic"
  }
}
```

---

## Schema Management with Schema Registry

Untyped JSON events are a maintenance nightmare. Schema Registry enforces contracts.

```bash
# Confluent Schema Registry (works with Redpanda too)
docker run -p 8081:8081 \
  -e SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS=kafka:9092 \
  confluentinc/cp-schema-registry
```

### Avro Schema Example

```json
// Register schema for order.created
{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.myapp.events",
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "eventType", "type": "string"},
    {"name": "occurredAt", "type": "string"},
    {
      "name": "payload",
      "type": {
        "type": "record",
        "name": "OrderCreatedPayload",
        "fields": [
          {"name": "orderId", "type": "string"},
          {"name": "customerId", "type": "string"},
          {"name": "totalAmount", "type": "double"},
          {"name": "currency", "type": "string"}
        ]
      }
    }
  ]
}
```

### Evolution Rules

Kafka supports backward and forward compatibility:

```bash
# Set subject compatibility
curl -X PUT http://schema-registry:8081/config/orders-value \
  -H "Content-Type: application/json" \
  -d '{"compatibility": "BACKWARD"}'

# BACKWARD compatible changes (safe):
# - Add optional field with default value
# - Remove field (old consumers ignore unknown fields)

# BREAKING changes (require coordination):
# - Rename a field
# - Change a field type
# - Remove a required field
```

---

## Consumer Groups and Scaling

```typescript
const consumer = kafka.consumer({ 
  groupId: 'payment-service',  // All instances share work
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
});

await consumer.subscribe({ 
  topics: ['orders'],
  fromBeginning: false,
});

await consumer.run({
  partitionsConsumedConcurrently: 3,
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value!.toString());
    
    try {
      await processOrderPayment(event);
      // Kafka auto-commits offset after successful processing
    } catch (error) {
      if (isRetryable(error)) {
        // Don't commit — message will be redelivered
        throw error;
      }
      // Non-retryable: send to DLQ
      await sendToDeadLetterQueue(topic, message, error);
    }
  },
});
```

### Dead Letter Queue Pattern

```typescript
async function sendToDeadLetterQueue(
  originalTopic: string,
  message: KafkaMessage,
  error: Error,
): Promise<void> {
  await producer.send({
    topic: `${originalTopic}.dlq`,
    messages: [{
      key: message.key,
      value: message.value,
      headers: {
        'dlq-original-topic': originalTopic,
        'dlq-error-message': error.message,
        'dlq-error-stack': error.stack ?? '',
        'dlq-failed-at': new Date().toISOString(),
        'dlq-consumer-group': 'payment-service',
      },
    }],
  });
}
```

---

## Exactly-Once Semantics

Most systems only need "at-least-once" delivery with idempotent consumers. But for financial systems, exactly-once matters.

```typescript
// Producer-side: Enable idempotent producer
const producer = kafka.producer({
  idempotent: true,         // Prevents duplicate sends
  transactionalId: 'payment-service-txn',
  maxInFlightRequests: 5,
});

// Transactional produce + consume
await producer.transaction(async (tx) => {
  // Read from input topic
  const messages = await consumeMessages();
  
  // Process and produce to output topic
  await tx.send({
    topic: 'payment-results',
    messages: messages.map(processMessage),
  });
  
  // Commit offsets atomically
  await tx.sendOffsets({
    consumerGroupId: 'payment-processor',
    topics: [{ topic: 'orders', partitions: [...] }],
  });
});
```

---

## Monitoring Your Event-Driven System

![Dashboard showing system metrics and monitoring graphs in dark mode](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800)
*Photo by [Luke Chesser](https://unsplash.com/@lukechesser) on Unsplash*

### Critical Metrics

```yaml
# Key metrics to alert on:

Consumer Lag:
  - Alert when lag > 10,000 messages and growing
  - Topic: kafka_consumergroup_lag
  - Tool: Kafka Exporter → Prometheus → Grafana

Throughput:
  - Bytes in/out per broker
  - Messages per second per topic

Latency:
  - Producer send latency (p99)
  - End-to-end latency (event time to consumer processing)

Error rates:
  - DLQ message count (should be near zero)
  - Consumer processing errors
```

### Redpanda Console (formerly Kowl)

```bash
docker run -p 8080:8080 \
  -e KAFKA_BROKERS=redpanda:9092 \
  docker.redpanda.com/redpandadata/console:latest
```

The Redpanda Console gives you topic browsing, consumer group management, and schema visualization in one UI.

---

## Testing Event-Driven Systems

```typescript
// Integration test with embedded Kafka (Testcontainers)
import { KafkaContainer } from '@testcontainers/kafka';

describe('Order processing', () => {
  let kafka: StartedKafkaContainer;
  
  beforeAll(async () => {
    kafka = await new KafkaContainer('confluentinc/cp-kafka:7.5.0')
      .withExposedPorts(9093)
      .start();
  });
  
  it('publishes OrderCreated event when order is saved', async () => {
    const brokers = [`${kafka.getHost()}:${kafka.getMappedPort(9093)}`];
    const consumer = new Kafka({ brokers }).consumer({ groupId: 'test' });
    
    await consumer.subscribe({ topics: ['orders'] });
    
    const receivedMessages: KafkaMessage[] = [];
    await consumer.run({
      eachMessage: async ({ message }) => {
        receivedMessages.push(message);
      },
    });
    
    // Trigger the action
    await orderService.createOrder({ customerId: 'cust_123', items: [...] });
    
    // Wait for message propagation
    await waitFor(() => receivedMessages.length > 0, { timeout: 5000 });
    
    const event = JSON.parse(receivedMessages[0].value!.toString());
    expect(event.eventType).toBe('order.created');
    expect(event.payload.customerId).toBe('cust_123');
  });
});
```

---

## When NOT to Use Event-Driven Architecture

EDA adds complexity. Don't use it when:

- **Simple CRUD**: A REST API is faster to build and understand
- **Strong consistency required**: Distributed events make ACID guarantees hard
- **Small team, early stage**: The operational overhead isn't worth it yet
- **Low traffic**: Kafka/Redpanda have minimum resource requirements
- **Synchronous by nature**: Real-time request-response (auth checks, read APIs)

A monolith with a well-structured domain model beats a distributed mess every time.

---

## Getting Started Checklist

```bash
# 1. Start Redpanda locally
docker compose up redpanda redpanda-console

# 2. Create your first topic
rpk topic create orders --partitions 6 --replicas 1

# 3. Produce test messages
rpk topic produce orders --key "order-123"

# 4. Consume and verify
rpk topic consume orders --num 10

# 5. Set up Schema Registry
# (Redpanda has it built-in)
rpk registry schema create --schema orders-value.avsc
```

---

## Resources

- [Redpanda documentation](https://docs.redpanda.com)
- [Confluent Kafka documentation](https://docs.confluent.io)
- [Event-Driven Architecture — Martin Fowler](https://martinfowler.com/articles/201701-event-driven.html)
- [Designing Event-Driven Systems — Ben Stopford (free ebook)](https://www.confluent.io/designing-event-driven-systems/)
- [Debezium documentation](https://debezium.io/docs)
- [kafkajs — Node.js Kafka client](https://kafka.js.org)
