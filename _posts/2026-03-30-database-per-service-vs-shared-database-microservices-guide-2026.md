---
layout: post
title: "Database-per-Service vs Shared Database in Microservices: A 2026 Decision Guide"
subtitle: "Deep dive into data isolation patterns, sagas, and the realities of distributed transactions"
date: 2026-03-30 00:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&auto=format&fit=crop&q=80"
catalog: true
tags:
  - Microservices
  - Database
  - Architecture
  - Distributed Systems
  - Backend
---

# Database-per-Service vs Shared Database in Microservices: A 2026 Decision Guide

If you're building microservices, you will eventually face this question: does each service own its own database, or do they share one? It sounds like an implementation detail. It isn't. This decision shapes your deployment topology, your consistency model, your operational complexity, and how quickly your teams can move independently. Let's break it down.

![Database Architecture](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1000&auto=format&fit=crop&q=80)
*Photo by [Taylor Vick](https://unsplash.com/@tvick) on Unsplash*

---

## The Core Trade-off

The microservices canon (and Sam Newman's *Building Microservices*) advocates strongly for **database-per-service**. The reasoning: if two services share a database, they're coupled at the storage layer. One team's schema migration can break another team's service. That's not a microservice — that's a distributed monolith with extra network hops.

But the canonical answer glosses over the operational cost: distributed transactions, eventual consistency, duplicate data, and a dozen new failure modes. The right answer for your system depends on your scale, team structure, and tolerance for complexity.

---

## Pattern 1: Database-per-Service (Full Isolation)

Each service owns its schema. No other service may read or write to it directly. Data sharing happens through APIs or events.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Order Svc  │     │ Inventory   │     │  Payment    │
│             │     │   Svc       │     │    Svc      │
│  ┌────────┐ │     │  ┌────────┐ │     │  ┌────────┐ │
│  │  PG DB │ │     │  │ MySQL  │ │     │  │ Mongo  │ │
│  └────────┘ │     │  └────────┘ │     │  └────────┘ │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                      Event Bus (Kafka)
```

### Advantages

**Technological freedom:** Each service can choose the right database for the job. User profiles → PostgreSQL. Product catalog → Elasticsearch. Sessions → Redis. You're not forced into one-size-fits-all.

**Independent deployability:** You can migrate Order's schema without touching Inventory's deployment. Teams ship on their own schedules.

**Failure isolation:** A database outage in Payment doesn't cascade to Order processing (assuming graceful degradation is implemented).

**Scalability:** Scale each database independently based on load patterns.

### The Hard Parts

**Cross-service queries are gone.** That `SELECT orders.*, users.name FROM orders JOIN users ON ...` query you wrote in five seconds? Now it's an API call, a data join in memory, or a denormalized read model. Every cross-service query becomes an engineering conversation.

**Distributed transactions require sagas.** An operation that spans multiple services (place order → reserve inventory → charge payment) cannot use a database transaction. You need a saga.

---

## Sagas: The Distributed Transaction Replacement

A **saga** is a sequence of local transactions, each publishing an event or message that triggers the next step. If a step fails, compensating transactions undo the preceding steps.

### Choreography-based Saga

Services react to events from each other. No central coordinator.

```
OrderService          InventoryService         PaymentService
     │                      │                       │
     │ OrderCreated ──────►  │                       │
     │                      │ InventoryReserved ───► │
     │                      │                       │ PaymentProcessed
     │ ◄──────────────────── │ ◄───────────────────── │
     │ (order confirmed)     │                       │
```

**Failure case:**
```
OrderService          InventoryService         PaymentService
     │                      │                       │
     │ OrderCreated ──────►  │                       │
     │                      │ InventoryReserved ───► │
     │                      │                       │ PaymentFailed
     │                      │ ◄───────────────────── │
     │ ◄────────────────────  │ Inventoryreleased    │
     │ (order cancelled)     │                       │
```

**Pros:** Simple, no single point of failure.  
**Cons:** Hard to understand the overall flow; cyclic dependencies can emerge.

### Orchestration-based Saga

A central **saga orchestrator** (often a dedicated service or state machine) drives the workflow.

```python
from enum import Enum
from dataclasses import dataclass

class OrderSagaState(Enum):
    STARTED = "started"
    INVENTORY_RESERVED = "inventory_reserved"
    PAYMENT_PROCESSED = "payment_processed"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    FAILED = "failed"

@dataclass
class OrderSaga:
    order_id: str
    state: OrderSagaState
    
    async def execute(self):
        try:
            # Step 1: Reserve inventory
            await inventory_client.reserve(self.order_id)
            self.state = OrderSagaState.INVENTORY_RESERVED
            await self.save()
            
            # Step 2: Process payment
            await payment_client.charge(self.order_id)
            self.state = OrderSagaState.PAYMENT_PROCESSED
            await self.save()
            
            # Step 3: Confirm order
            await order_client.confirm(self.order_id)
            self.state = OrderSagaState.COMPLETED
            await self.save()
            
        except PaymentFailed:
            await self.compensate()
    
    async def compensate(self):
        self.state = OrderSagaState.COMPENSATING
        if self.state >= OrderSagaState.INVENTORY_RESERVED:
            await inventory_client.release(self.order_id)
        self.state = OrderSagaState.FAILED
        await self.save()
```

Using a framework like [Conductor](https://orkes.io/) or [Temporal](https://temporal.io/) for orchestration gives you durable execution — if the orchestrator crashes mid-saga, it resumes from the last saved state.

```python
# Temporal workflow example
from temporalio import workflow, activity
from datetime import timedelta

@workflow.defn
class OrderSagaWorkflow:
    @workflow.run
    async def run(self, order_id: str) -> str:
        try:
            await workflow.execute_activity(
                reserve_inventory,
                order_id,
                start_to_close_timeout=timedelta(seconds=30)
            )
            await workflow.execute_activity(
                process_payment,
                order_id,
                start_to_close_timeout=timedelta(seconds=60)
            )
            await workflow.execute_activity(
                confirm_order,
                order_id,
                start_to_close_timeout=timedelta(seconds=30)
            )
            return "completed"
        except Exception as e:
            await workflow.execute_activity(
                compensate_order,
                order_id,
                start_to_close_timeout=timedelta(seconds=60)
            )
            raise
```

Temporal makes sagas dramatically simpler by handling retries, timeouts, and state persistence automatically.

---

## Pattern 2: Schema-per-Service (Shared Server)

A middle ground: all services share a single database *server*, but each service owns a distinct schema (or set of tables prefixed with the service name). Access control enforces isolation.

```sql
-- Order service owns these
CREATE SCHEMA orders;
CREATE TABLE orders.orders (...);
CREATE TABLE orders.order_items (...);

-- Inventory service owns these  
CREATE SCHEMA inventory;
CREATE TABLE inventory.products (...);
CREATE TABLE inventory.reservations (...);

-- Grant access only to the owning service's DB user
GRANT USAGE ON SCHEMA orders TO orders_service_user;
GRANT USAGE ON SCHEMA inventory TO inventory_service_user;
```

### When This Makes Sense

- You're in early stages and full database isolation is premature optimization.
- Your services are on the same cloud account/region and latency between services is minimal.
- Your team doesn't yet have the operational maturity to run 10 separate databases.
- Your scale doesn't justify separate database servers.

### Risks

This is a stepping stone, not a destination. Enforce strict access control from day one. It's too easy to write a cross-schema JOIN during a deadline crunch, which re-creates coupling. Add a CI check that rejects SQL queries touching foreign schemas.

---

## Pattern 3: CQRS + Read Models

**Command Query Responsibility Segregation** separates write models (commands) from read models (queries). This is often used alongside database-per-service to solve the cross-service query problem.

```
Write Path:                         Read Path:
                                    
OrderService                        OrderQueryService
  │ writes to                          │ reads from
  ▼                                    ▼
orders DB ──(events)──► Kafka ──► read_model DB
                                   (denormalized,
                                    optimized for
                                    specific queries)
```

The `OrderQueryService` subscribes to events from multiple services and builds a denormalized view optimized for the UI's query patterns. The `orders` read model might join order data with user names and product names — but that join happened asynchronously when the event was processed, not at query time.

```python
# Event consumer builds read model
@kafka_consumer(topic="order.created")
async def on_order_created(event: OrderCreatedEvent):
    # Fetch user name from User service (or a cache)
    user = await user_service.get(event.user_id)
    
    # Write denormalized view
    await read_db.execute("""
        INSERT INTO order_view (order_id, user_id, user_name, total, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
    """, event.order_id, event.user_id, user.name, event.total, "pending", event.created_at)
```

**Trade-off:** Your read model is *eventually consistent*. There's a lag between a write happening and the read model reflecting it. For most use-cases (dashboards, order history) this is fine. For real-time checks ("is this seat still available?") it's not.

---

## When to Use What

| Scenario | Pattern |
|----------|---------|
| Startup / MVP | Monolith or shared DB with schemas |
| Small team, few services | Schema-per-service on shared server |
| Independent teams, different tech choices | Database-per-service |
| Complex cross-service queries | CQRS + read models |
| Multi-step business transactions | Sagas (Temporal for durability) |
| Read-heavy reporting | Dedicated analytics DB (Snowflake, ClickHouse) |

---

## Operational Checklist for Database-per-Service

Before going all-in, make sure you have:

- [ ] **Service-specific connection pools** — don't share a connection pool between services.
- [ ] **Schema migration CI** — each service's migrations run in its own pipeline.
- [ ] **Cross-service data access via API contracts** — document and version these.
- [ ] **Outbox pattern** for reliable event publishing (write event to DB atomically with business data, then publish from DB).
- [ ] **Idempotent consumers** — events may be delivered more than once.
- [ ] **Dead letter queues** — failed event processing needs a recovery path.
- [ ] **Distributed tracing** — correlate a request across 5 services' databases.
- [ ] **Backup and restore strategy** for each database independently.

---

## The Outbox Pattern (Don't Skip This)

The most common bug in database-per-service implementations: you update the database and then publish an event to Kafka. What if the service crashes between those two steps? You've got data inconsistency.

The outbox pattern solves this atomically:

```sql
-- In the same transaction as your business logic
BEGIN;
INSERT INTO orders (id, user_id, total, status) VALUES ($1, $2, $3, 'pending');
INSERT INTO outbox (event_type, payload, created_at) 
  VALUES ('OrderCreated', '{"order_id": "..."}', NOW());
COMMIT;

-- Separate process polls outbox and publishes to Kafka
-- (or use Debezium CDC to stream from the outbox table)
```

[Debezium](https://debezium.io/) with its Change Data Capture (CDC) approach is the production-grade solution — it reads the database's WAL (write-ahead log) and publishes changes to Kafka without any polling overhead.

---

## Summary

Database-per-service is the right default for teams that have achieved Conway's Law alignment — where your system's architecture mirrors your team structure. It enables true independent deployability and technological flexibility.

But it comes with real costs: no distributed transactions (learn sagas), no cross-service joins (learn CQRS), and significantly more operational surface area (learn observability).

Start simpler than you think you need. Migrate toward stricter isolation as team boundaries harden and scale demands it. The worst outcome is premature distribution — building all the complexity of microservices without the organizational scale that makes it worthwhile.

---

*Found this useful? Star the repo or share it with a teammate who's about to make a database architecture decision.*
