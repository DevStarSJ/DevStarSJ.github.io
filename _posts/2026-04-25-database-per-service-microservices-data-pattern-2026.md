---
layout: post
title: "Database Per Service: The Microservices Data Pattern You're Probably Doing Wrong"
subtitle: "Distributed data ownership, eventual consistency, and the practical tradeoffs of database-per-service in production"
date: 2026-04-25 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&q=80"
categories: [Architecture, Microservices, Database]
tags: [microservices, database per service, event sourcing, CQRS, saga pattern, distributed data, eventual consistency]
---

## Database Per Service: The Microservices Data Pattern You're Probably Doing Wrong

The database-per-service pattern is one of the core tenets of microservices architecture: each service owns its data, with no shared databases. The theory is clean. The practice is hard. And in 2026, with a decade of production microservices experience in the industry, we can talk honestly about what the theory misses.

This isn't another "database per service is good actually" post. It's a practical guide to making distributed data ownership work without creating an eventual-consistency nightmare.

![Database Architecture](https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=900&q=80)
*Photo by [Jan Antonin Kolar](https://unsplash.com/@jankolar) on Unsplash*

---

## Why Database Per Service Exists

The motivation is sound: shared databases create tight coupling. If multiple services share a database schema, changing that schema requires coordinating all the services simultaneously. The database becomes a coordination bottleneck — a hidden monolith that undermines the independence you built microservices to achieve.

Database per service breaks this coupling. Each service's data model can evolve independently. Services don't need to coordinate on schema changes. You can pick the right database type per service (relational, document, graph, time-series).

The tradeoff: queries that were a single SQL JOIN are now cross-service data aggregation problems.

---

## The Four Data Patterns

When you adopt database per service, you need patterns for four distinct problems:

### 1. Cross-Service Queries

**Problem**: You need data from Service A and Service B together.

**Wrong approach**: Direct DB-to-DB queries between services. This is the pattern that eliminates the coupling benefits you wanted.

**Right approaches**:

**API Composition** — call both services, join in the caller:
```typescript
// In the BFF (Backend for Frontend) or GraphQL resolver
async function getOrderWithCustomer(orderId: string) {
  const order = await orderService.getOrder(orderId);
  const customer = await customerService.getCustomer(order.customerId);
  
  return {
    ...order,
    customer: {
      name: customer.name,
      email: customer.email,
    }
  };
}
```

Simple, but has N+1 problems at scale and degrades when either service is slow.

**Read-optimized views** (CQRS) — maintain a denormalized read model that serves aggregated queries:
```typescript
// Event handler in the Order Query Service
@EventHandler(OrderPlaced)
async handleOrderPlaced(event: OrderPlaced) {
  const customer = await customerService.getCustomer(event.customerId);
  
  await this.orderReadModel.upsert({
    orderId: event.orderId,
    // Denormalized customer data
    customerName: customer.name,
    customerEmail: customer.email,
    // Order data
    items: event.items,
    total: event.total,
    status: event.status,
    placedAt: event.occurredAt,
  });
}
```

The read model is eventually consistent with the source data, but queries are fast and isolated.

### 2. Distributed Transactions

**Problem**: An operation spans multiple services and needs to either succeed or fail atomically.

**Wrong approach**: Two-phase commit (2PC). It's theoretically correct but practically fragile — network partitions can leave participants in-doubt indefinitely.

**Right approach**: The Saga pattern — a sequence of local transactions coordinated through events.

**Choreography-based Saga** (good for simple flows):

```typescript
// Order Service
async function placeOrder(order: CreateOrderRequest) {
  // 1. Create order in PENDING state
  const pendingOrder = await orderRepository.create({
    ...order,
    status: 'PENDING'
  });
  
  // 2. Publish event to trigger next step
  await eventBus.publish(new OrderCreated({
    orderId: pendingOrder.id,
    customerId: order.customerId,
    items: order.items,
    totalAmount: order.totalAmount,
  }));
  
  return pendingOrder;
}

// Payment Service — reacts to OrderCreated
@EventHandler(OrderCreated)
async handleOrderCreated(event: OrderCreated) {
  try {
    await paymentGateway.charge({
      customerId: event.customerId,
      amount: event.totalAmount,
      reference: event.orderId,
    });
    
    await eventBus.publish(new PaymentCompleted({ orderId: event.orderId }));
  } catch (error) {
    await eventBus.publish(new PaymentFailed({ 
      orderId: event.orderId,
      reason: error.message,
    }));
  }
}

// Order Service — reacts to PaymentFailed (compensating transaction)
@EventHandler(PaymentFailed)
async handlePaymentFailed(event: PaymentFailed) {
  await orderRepository.update(event.orderId, { status: 'CANCELLED' });
  await eventBus.publish(new OrderCancelled({ orderId: event.orderId }));
}
```

**Orchestration-based Saga** (better for complex flows with many steps):

```typescript
class PlaceOrderSaga {
  async execute(command: PlaceOrderCommand) {
    const sagaId = uuid();
    
    try {
      // Step 1: Reserve inventory
      await this.inventoryService.reserve({
        sagaId,
        items: command.items,
      });
      
      // Step 2: Process payment
      await this.paymentService.charge({
        sagaId,
        amount: command.totalAmount,
        customerId: command.customerId,
      });
      
      // Step 3: Confirm order
      await this.orderService.confirm({ sagaId, orderId: command.orderId });
      
    } catch (error) {
      // Compensate in reverse order
      await this.compensate(sagaId, command, error);
      throw error;
    }
  }
  
  private async compensate(sagaId: string, command: PlaceOrderCommand, error: Error) {
    // Only compensate steps that succeeded
    await this.paymentService.refund({ sagaId }).catch(() => {});
    await this.inventoryService.release({ sagaId }).catch(() => {});
  }
}
```

### 3. Referential Integrity

**Problem**: Service B has a foreign key to data owned by Service A. What ensures that key is valid?

In a monolith, the database enforces this with a foreign key constraint. In a distributed system, you can't have cross-service foreign key constraints.

**Strategies**:

**Soft references with validation**: Store the ID, validate at write time via API call, accept that the reference can become stale:
```typescript
async function createOrder(order: CreateOrderRequest) {
  // Validate the customer exists at creation time
  const customer = await customerService.getCustomer(order.customerId);
  if (!customer) {
    throw new CustomerNotFoundError(order.customerId);
  }
  
  // Store the denormalized data you need (not just the ID)
  return orderRepository.create({
    ...order,
    customerSnapshot: {  // Point-in-time snapshot
      id: customer.id,
      name: customer.name,
      email: customer.email,
    }
  });
}
```

**Eventual integrity via events**: Listen for deletion events and clean up references:
```typescript
@EventHandler(CustomerDeleted)
async handleCustomerDeleted(event: CustomerDeleted) {
  // Soft-delete orders or reassign to a "deleted customer" placeholder
  await orderRepository.updateMany(
    { customerId: event.customerId },
    { customerId: 'DELETED_CUSTOMER', status: 'ARCHIVED' }
  );
}
```

### 4. Reporting and Analytics

Cross-service queries are particularly painful for reporting, which often needs data from many services in complex aggregations.

The answer is almost always a separate data platform — an analytics database that aggregates from all services via CDC (Change Data Capture) or event streams:

```
Service Databases → CDC (Debezium/DMS) → Event Stream (Kafka) → Data Warehouse (BigQuery/Snowflake) → BI Tools
```

```yaml
# Debezium connector for Order Service PostgreSQL
{
  "name": "order-service-cdc",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "order-db.internal",
    "database.dbname": "orders",
    "table.include.list": "public.orders,public.order_items",
    "topic.prefix": "cdc.order-service",
    "transforms": "route",
    "transforms.route.type": "org.apache.kafka.connect.transforms.ReplaceField$Value"
  }
}
```

Don't use your operational service databases for reporting. The load profiles are incompatible.

---

## When NOT to Use Database Per Service

This is underemphasized. Database per service is not always the right choice.

**Use a shared database when:**
- You have a small team (< 5 engineers) — the operational overhead exceeds the benefit
- Services truly need transactional consistency across entities — some domains don't tolerate eventual consistency
- You're in an early-stage product and don't know your service boundaries yet

The most expensive migration in microservices is the wrong service boundary. Premature decomposition creates distributed systems complexity without the scale benefits that justify it.

A sensible evolution path:
1. Start with a well-structured monolith, clear module boundaries
2. When a module needs independent scaling or deployment: extract it, give it its own database
3. Repeat for each module that earns independence

---

## The Outbox Pattern: Guaranteed Event Delivery

One subtle failure mode: you save to the database and *then* publish an event. If the service crashes between these two operations, the database update succeeds but the event never fires — leaving other services with stale data.

The Outbox pattern solves this by making event publishing part of the same database transaction:

```typescript
async function placeOrder(order: CreateOrderRequest) {
  await this.db.transaction(async (trx) => {
    // Both happen atomically
    const newOrder = await trx('orders').insert(order).returning('*');
    
    await trx('outbox').insert({
      id: uuid(),
      topic: 'OrderPlaced',
      payload: JSON.stringify(new OrderPlaced(newOrder[0])),
      created_at: new Date(),
      sent: false,
    });
  });
}

// Separate process polls and publishes outbox events
async function processOutbox() {
  const pending = await db('outbox')
    .where({ sent: false })
    .orderBy('created_at')
    .limit(100);
  
  for (const event of pending) {
    await eventBus.publish(event.topic, JSON.parse(event.payload));
    await db('outbox').where({ id: event.id }).update({ sent: true });
  }
}
```

The Transactional Outbox pattern ensures at-least-once delivery. Consumers must be idempotent to handle duplicates.

---

## Practical Tooling

| Problem | Tool Options |
|---------|-------------|
| Change Data Capture | Debezium, AWS DMS, Estuary Flow |
| Event streaming | Apache Kafka, AWS Kinesis, Redpanda |
| Saga orchestration | Temporal, Conductor, AWS Step Functions |
| CQRS/Event Sourcing | EventStoreDB, Axon Framework, custom |
| Analytics aggregation | BigQuery, Snowflake, ClickHouse |
| API composition | GraphQL Federation, BFF pattern |

---

![Distributed Systems](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&q=80)
*Photo by [Taylor Vick](https://unsplash.com/@tvick) on Unsplash*

Database per service is the right pattern for teams and systems at the right scale. The key is understanding that you're not just decomposing your database — you're adopting a fundamentally different consistency model. Design for eventual consistency from the start, pick your synchronization patterns deliberately, and use the outbox pattern everywhere you publish events from a transactional write.

*What's the hardest distributed data problem you've hit in production? Cross-service reporting and transactional saga failures are usually where the complexity really bites.*
