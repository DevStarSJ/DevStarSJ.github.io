---
layout: post
title: "Database-Per-Service vs Shared Database: Microservices Data Architecture in 2026"
subtitle: "The real trade-offs of data isolation in distributed systems — and when each pattern makes sense"
date: 2026-05-14 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&auto=format&fit=crop&q=80"
catalog: true
tags:
  - Microservices
  - Database
  - Architecture
  - Distributed Systems
  - PostgreSQL
  - Event Sourcing
---

# Database-Per-Service vs Shared Database: Microservices Data Architecture in 2026

Few decisions in distributed systems generate more debate than data architecture. Should each microservice own its database? Share one? Use event sourcing? The answer, frustratingly, is: *it depends* — but the trade-offs are well-understood, and the patterns have matured significantly.

This post provides a practical framework for making this decision, with concrete examples of each pattern and their failure modes.

![Database Architecture](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80)
*Photo by Luke Chesser on Unsplash*

---

## The Core Tension

Microservices promise independent deployability and team autonomy. Both are threatened by shared data. When two services share a database:

- A schema migration in Service A can break Service B
- Service B's slow query can lock tables Service A needs
- You can't scale Service A's database independently of Service B
- The deployment of both services becomes coupled

But the alternative — database-per-service — introduces its own complexity: distributed transactions, eventual consistency, and data duplication.

Neither is free. The question is which costs fit your organization.

---

## Pattern 1: Database-Per-Service

Each service owns its data store. No other service accesses it directly.

```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  User Service  │    │  Order Service │    │ Product Service│
│                │    │                │    │                │
│  ┌──────────┐  │    │  ┌──────────┐  │    │  ┌──────────┐  │
│  │PostgreSQL│  │    │  │PostgreSQL│  │    │  │ MongoDB  │  │
│  └──────────┘  │    │  └──────────┘  │    │  └──────────┘  │
└────────────────┘    └────────────────┘    └────────────────┘
```

Services communicate via APIs or events — **never** via SQL JOINs across service boundaries.

### When to Use It

- Teams need to deploy independently without coordination
- Services have radically different data access patterns or scaling needs
- You're building for long-term autonomy at the cost of initial complexity
- GDPR/compliance requires strict data isolation

### The JOIN Problem

The biggest pain point: you can no longer do cross-service JOINs. If your Order Service needs customer names, you have options:

**Option A: API Composition (synchronous)**
```typescript
// Order API response composition
async function getOrderWithCustomer(orderId: string) {
  const order = await orderRepo.findById(orderId);
  const customer = await userService.getUser(order.customerId);
  
  return {
    ...order,
    customer: {
      name: customer.name,
      email: customer.email,
    },
  };
}
```

Simple, but adds latency and creates temporal coupling. If User Service is down, this fails.

**Option B: Data Denormalization**
```typescript
// When an order is placed, copy the customer name you need
interface Order {
  id: string;
  customerId: string;
  customerName: string;     // Denormalized at creation time
  customerEmail: string;    // Denormalized at creation time
  // ... rest of order
}
```

Fast reads, but the name might become stale if the customer updates their profile. For orders, this is usually acceptable — you want the name *at time of purchase*, not the current name.

**Option C: Event-Driven Sync**
```typescript
// User Service publishes events
interface UserUpdatedEvent {
  userId: string;
  name: string;
  email: string;
  updatedAt: Date;
}

// Order Service subscribes and maintains a local projection
class UserProjection {
  async handleUserUpdated(event: UserUpdatedEvent) {
    await this.db.query(
      "INSERT INTO user_cache (id, name, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $2, email = $3",
      [event.userId, event.name, event.email]
    );
  }
}
```

Reads are local (fast, resilient), but introduces eventual consistency and event schema coupling.

---

## Pattern 2: Shared Database (The Anti-Pattern That Isn't Always Wrong)

All services connect to the same database. Often an evolution from a monolith.

```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  User Service  │    │  Order Service │    │ Product Service│
└───────┬────────┘    └───────┬────────┘    └───────┬────────┘
        │                     │                     │
        └──────────────────────┴─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    PostgreSQL        │
                    │  (shared schema)    │
                    └─────────────────────┘
```

Textbooks call this an anti-pattern. It often is. But:

- A small team (2-5 engineers) owning all services doesn't actually need data isolation
- During a monolith-to-microservices migration, this is an acceptable intermediate state
- Some workloads *need* ACID transactions across data domains

### Making Shared Database Less Bad

If you're using a shared database, at least enforce logical isolation:

```sql
-- PostgreSQL row-level security for tenant isolation
CREATE POLICY user_service_policy ON users
  USING (pg_has_role(current_user, 'user_service_role', 'MEMBER'));

-- Schema-per-service: services own their schema
CREATE SCHEMA user_service;
CREATE SCHEMA order_service;

GRANT ALL ON SCHEMA user_service TO user_service_role;
GRANT SELECT ON user_service.users TO order_service_role; -- explicit cross-schema grants only
```

Schema-per-service in a shared database gives you:
- Clear ownership
- Explicit cross-service data contracts (via grants)
- The ability to migrate to separate databases later (schema already isolated)

---

## Pattern 3: Saga Pattern for Distributed Transactions

When you have database-per-service and need to coordinate multi-step operations, sagas replace distributed transactions.

A saga is a sequence of local transactions, each publishing an event/message that triggers the next step. On failure, compensating transactions roll back completed steps.

### Choreography-Based Saga

```typescript
// Services react to events from each other
// No central coordinator

// Step 1: Order Service creates order in PENDING state
async function placeOrder(order: CreateOrderDto) {
  const savedOrder = await orderRepo.create({ ...order, status: "PENDING" });
  await eventBus.publish("order.created", { orderId: savedOrder.id, userId: order.userId, items: order.items });
  return savedOrder;
}

// Step 2: Inventory Service reacts to order.created
async function onOrderCreated(event: OrderCreatedEvent) {
  const reserved = await inventoryRepo.reserve(event.items);
  if (reserved) {
    await eventBus.publish("inventory.reserved", { orderId: event.orderId });
  } else {
    await eventBus.publish("inventory.reservation_failed", { orderId: event.orderId });
  }
}

// Step 3a: Payment Service reacts to inventory.reserved
async function onInventoryReserved(event: InventoryReservedEvent) {
  const payment = await paymentProvider.charge(/* ... */);
  if (payment.success) {
    await eventBus.publish("payment.completed", { orderId: event.orderId });
  } else {
    await eventBus.publish("payment.failed", { orderId: event.orderId });
  }
}

// Step 3b: Compensating transaction on failure
async function onInventoryFailed(event: InventoryFailedEvent) {
  await orderRepo.update(event.orderId, { status: "FAILED" });
  await eventBus.publish("order.cancelled", { orderId: event.orderId, reason: "out_of_stock" });
}
```

### Orchestration-Based Saga (Temporal)

More explicit and auditable — a central workflow orchestrates all steps:

```typescript
// Temporal workflow — the saga coordinator
export async function placeOrderWorkflow(order: CreateOrderDto): Promise<OrderResult> {
  // Step 1
  const orderId = await createOrder(order);
  
  try {
    // Step 2
    await reserveInventory(orderId, order.items);
    
    try {
      // Step 3
      const paymentResult = await chargePayment(orderId, order.totalAmount);
      
      // Confirm
      await confirmOrder(orderId);
      return { orderId, status: "confirmed" };
      
    } catch (paymentError) {
      // Compensate step 2
      await releaseInventory(orderId, order.items);
      await cancelOrder(orderId, "payment_failed");
      throw paymentError;
    }
    
  } catch (inventoryError) {
    // Compensate step 1
    await cancelOrder(orderId, "out_of_stock");
    throw inventoryError;
  }
}
```

The Temporal server handles retries, timeouts, and history — the workflow is durable across crashes.

---

## Pattern 4: CQRS + Event Sourcing

For services with complex domain logic, Command Query Responsibility Segregation (CQRS) with Event Sourcing provides the ultimate audit trail and temporal queries.

```typescript
// Event store — the source of truth
interface DomainEvent {
  aggregateId: string;
  version: number;
  eventType: string;
  payload: unknown;
  timestamp: Date;
}

class Order {
  private events: DomainEvent[] = [];
  
  static rehydrate(events: DomainEvent[]): Order {
    const order = new Order();
    for (const event of events) {
      order.apply(event);
    }
    return order;
  }
  
  placeOrder(items: Item[], customerId: string): void {
    this.applyNewEvent({
      eventType: "OrderPlaced",
      payload: { items, customerId, totalAmount: this.calculateTotal(items) },
    });
  }
  
  ship(trackingNumber: string): void {
    if (this.status !== "PAID") throw new Error("Can only ship paid orders");
    this.applyNewEvent({
      eventType: "OrderShipped",
      payload: { trackingNumber, shippedAt: new Date() },
    });
  }
  
  private apply(event: DomainEvent): void {
    switch (event.eventType) {
      case "OrderPlaced":
        this.status = "PENDING";
        this.items = event.payload.items;
        break;
      case "OrderShipped":
        this.status = "SHIPPED";
        this.trackingNumber = event.payload.trackingNumber;
        break;
    }
  }
}
```

The event store is append-only. Read models (projections) are built from the event stream and can be rebuilt at any time.

---

## Decision Framework

```
Start here: How many teams work on this system?

1-3 teams
    └─► Shared database with schema-per-service
        (Migrate to separate databases when teams grow)

3+ teams
    └─► Is there cross-domain transactional requirement?
        │
        ├─► Yes → Saga pattern (choreography for simple, orchestration for complex)
        │
        └─► No → Database-per-service
                  │
                  └─► Complex domain with audit/temporal needs?
                      ├─► Yes → CQRS + Event Sourcing
                      └─► No  → API Composition or Denormalization
```

---

## Common Mistakes to Avoid

**1. Sharing database AND having separate services**  
The worst of both worlds: you have distributed system complexity (network calls, partial failures) without data isolation.

**2. Treating eventual consistency as an edge case**  
If you're denormalizing or event-sourcing, design your UI around eventual consistency from day one. "Show stale data" is a UX decision, not a bug.

**3. Implementing sagas without idempotency**  
Events can be delivered more than once. Every event handler must be idempotent:
```typescript
// Store processed event IDs
async function handleEvent(event: DomainEvent) {
  const alreadyProcessed = await eventLog.exists(event.id);
  if (alreadyProcessed) return; // idempotent!
  
  await processEvent(event);
  await eventLog.record(event.id);
}
```

**4. Cross-service transactions via distributed locks**  
This is a smell. Redesign your service boundaries — you've split a naturally cohesive aggregate.

---

## Conclusion

There's no universally correct data architecture for microservices. Database-per-service maximizes autonomy and scalability at the cost of query complexity. Shared databases are pragmatic for small teams. Sagas handle multi-step workflows. Event Sourcing provides an unassailable audit trail.

The mature organizations in 2026 aren't dogmatic about these patterns. They start simple (shared database, schema isolation), measure the pain points, and migrate toward more complex patterns only when they have evidence — slow queries, deployment coupling, scaling bottlenecks — that justify the investment.

Data architecture, like all architecture, should be driven by real constraints, not ideological purity.
