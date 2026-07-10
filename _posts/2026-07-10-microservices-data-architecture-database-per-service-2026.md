---
layout: post
title: "Database Per Service vs. Shared Database: Microservices Data Architecture in 2026"
subtitle: "The patterns, trade-offs, and when each approach actually makes sense for your team"
date: 2026-07-10 12:00:00
author: "Seokjun Lee"
header-img: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - Microservices
  - Database
  - Architecture
  - PostgreSQL
  - Event-Driven
  - System Design
---

# Database Per Service vs. Shared Database: Microservices Data Architecture in 2026

One of the most consequential decisions in microservices architecture is data ownership. Get it wrong and you'll spend years fighting data consistency bugs, deployment coupling, and performance bottlenecks. Get it right and you have teams that can move independently at speed.

This post covers the real trade-offs — not the textbook version, but what actually happens in production.

![Database Architecture](https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=900&auto=format&fit=crop)
*Photo by [Jan Antonin Kolar](https://unsplash.com/@jankolar) on Unsplash*

---

## The Two Camps

### Option A: Database per Service

Each microservice owns its data store. No other service touches its database directly.

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Order Service  │    │  Product Service  │    │   User Service   │
│                  │    │                   │    │                  │
│  ┌─────────────┐ │    │  ┌─────────────┐  │    │  ┌─────────────┐ │
│  │ orders_db   │ │    │  │ products_db  │  │    │  │  users_db   │ │
│  │ (PostgreSQL)│ │    │  │  (MongoDB)  │  │    │  │ (PostgreSQL)│ │
│  └─────────────┘ │    │  └─────────────┘  │    │  └─────────────┘ │
└──────────────────┘    └──────────────────┘    └──────────────────┘
         │                       │                        │
         └───────────────────────┘                        │
                     Events / APIs                        │
```

**Advantages:**
- Teams deploy independently (no shared schema migrations)
- Each service can choose the right database type for its needs
- Failure isolation — orders DB down doesn't take down products
- Scale each database independently

**Disadvantages:**
- No joins across service boundaries
- Eventual consistency instead of ACID transactions
- Data duplication (users denormalized into orders)
- Complex distributed transaction patterns

### Option B: Shared Database

Multiple services share a database, often separated by schema or table naming conventions.

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Order Service  │    │  Product Service  │    │   User Service   │
└────────┬─────────┘    └────────┬──────────┘    └────────┬─────────┘
         │                       │                        │
         └───────────────────────┴────────────────────────┘
                                 │
                    ┌────────────┴───────────┐
                    │     Shared PostgreSQL   │
                    │                         │
                    │  schema: orders         │
                    │  schema: products       │
                    │  schema: users          │
                    └────────────────────────┘
```

**Advantages:**
- ACID transactions across services
- SQL joins — reporting is simple
- One backup, one monitoring setup
- Simpler ops for small teams

**Disadvantages:**
- Schema changes require coordination across teams
- One team's bad query can tank everyone
- Can't scale individual services' data independently
- Tight coupling defeats microservices purpose

---

## The Honest Answer: It Depends on Team Size

The most important variable isn't technical — it's **organizational**.

```
Team Size         Recommended Approach
─────────────────────────────────────────────────────────────
1-5 engineers     Shared DB (monolith is fine)
5-20 engineers    Shared DB with strict ownership boundaries
20-50 engineers   Hybrid (separate DBs for bounded contexts)
50+ engineers     Database per service (Conway's Law applies)
```

Conway's Law: your system architecture will mirror your communication structure. If you have one team, you'll fight against a database-per-service architecture. If you have 10 teams, you'll fight against a shared database.

---

## Implementing Database per Service: The Hard Parts

### The No-Join Problem

You can't do `JOIN orders o ON o.user_id = u.id` when user data is in a different database.

**Pattern 1: API Composition**
```typescript
// OrderService.ts
async function getOrderWithUser(orderId: string) {
  // Fetch from own DB
  const order = await db.orders.findById(orderId);
  
  // Fetch from UserService via API
  const user = await userServiceClient.getUser(order.userId);
  
  // Compose in application layer
  return {
    ...order,
    customer: {
      name: user.name,
      email: user.email,
    }
  };
}
```

Simple, but has latency overhead and creates runtime dependency on UserService.

**Pattern 2: Denormalization + Event Sync**
```typescript
// OrderService stores a snapshot of user data it needs
interface Order {
  id: string;
  userId: string;
  // Denormalized from UserService at order creation time
  customerName: string;     // ← copied from user
  customerEmail: string;    // ← copied from user
  lineItems: LineItem[];
  total: number;
  createdAt: Date;
}

// When user updates their name, publish an event
// OrderService listens and updates its own snapshot
async function handleUserUpdated(event: UserUpdatedEvent) {
  await db.orders.updateMany({
    where: { userId: event.userId },
    data: {
      customerName: event.newName,
      customerEmail: event.newEmail,
    }
  });
}
```

Tradeoff: data duplication, eventual consistency, but no runtime dependency.

---

### Distributed Transactions: The Saga Pattern

What replaces `BEGIN TRANSACTION` across services?

The **Saga pattern** orchestrates a sequence of local transactions, each publishing events that trigger the next step. If any step fails, compensating transactions roll back.

```typescript
// Choreography-based Saga (event-driven)
// Order placement spans 3 services

// 1. OrderService: create order in PENDING state
async function placeOrder(orderData: OrderData) {
  const order = await db.orders.create({
    ...orderData,
    status: 'PENDING'
  });
  
  await eventBus.publish('order.created', {
    orderId: order.id,
    userId: order.userId,
    items: order.lineItems,
    total: order.total,
  });
  
  return order;
}

// 2. InventoryService: listens to order.created
async function handleOrderCreated(event: OrderCreatedEvent) {
  try {
    await db.inventory.reserve(event.items);
    await eventBus.publish('inventory.reserved', { orderId: event.orderId });
  } catch (error) {
    // Reservation failed — publish failure event
    await eventBus.publish('inventory.reservation.failed', {
      orderId: event.orderId,
      reason: error.message,
    });
  }
}

// 3. PaymentService: listens to inventory.reserved
async function handleInventoryReserved(event: InventoryReservedEvent) {
  try {
    const charge = await paymentGateway.charge(event.orderId);
    await eventBus.publish('payment.captured', { orderId: event.orderId });
  } catch (error) {
    await eventBus.publish('payment.failed', {
      orderId: event.orderId,
      reason: error.message,
    });
  }
}

// OrderService: listens to payment.captured
async function handlePaymentCaptured(event: PaymentCapturedEvent) {
  await db.orders.update({
    where: { id: event.orderId },
    data: { status: 'CONFIRMED' }
  });
}

// Compensating transaction: if payment fails, release inventory
async function handlePaymentFailed(event: PaymentFailedEvent) {
  await db.inventory.release(event.orderId); // Compensate
  await db.orders.update({
    where: { id: event.orderId },
    data: { status: 'FAILED', failureReason: event.reason }
  });
}
```

### Outbox Pattern: Reliable Event Publishing

The biggest risk in event-driven sagas: your DB write succeeds but your event publish fails. You need both to be atomic.

```typescript
// Transactional Outbox Pattern
async function placeOrder(orderData: OrderData) {
  // Both the order AND the event go in the same transaction
  await db.$transaction(async (tx) => {
    const order = await tx.orders.create({
      ...orderData,
      status: 'PENDING'
    });
    
    // Event stored in outbox table, not published yet
    await tx.outbox.create({
      eventType: 'order.created',
      aggregateId: order.id,
      payload: JSON.stringify({
        orderId: order.id,
        userId: order.userId,
        items: order.lineItems,
        total: order.total,
      }),
      processedAt: null,
    });
    
    return order;
  });
  
  // Separate process (Debezium CDC or polling) publishes outbox events
  // If this service crashes, the outbox row still exists and will be published on restart
}
```

```sql
-- Debezium captures changes from this table via PostgreSQL CDC
-- and publishes to Kafka automatically
CREATE TABLE outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(255) NOT NULL,
  aggregate_id VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX outbox_unprocessed_idx ON outbox(created_at) 
WHERE processed_at IS NULL;
```

---

## CQRS: Separating Reads from Writes

In high-read systems, **CQRS (Command Query Responsibility Segregation)** pairs naturally with event-driven architectures:

```typescript
// Write side: optimized for consistency
class OrderCommandHandler {
  async placeOrder(command: PlaceOrderCommand): Promise<string> {
    // Validate, apply business rules, save to write DB
    const order = new Order(command);
    order.validate();
    
    await this.writeDb.orders.save(order);
    await this.eventBus.publish('order.placed', order.toEvent());
    
    return order.id;
  }
}

// Read side: denormalized, optimized for query patterns
class OrderQueryHandler {
  // This table is materialized from events — no joins needed
  async getOrderDashboard(userId: string): Promise<OrderDashboard> {
    return this.readDb.orderViews.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

// Event handler that updates the read model
class OrderReadModelUpdater {
  async handleOrderPlaced(event: OrderPlacedEvent) {
    await this.readDb.orderViews.create({
      orderId: event.orderId,
      userId: event.userId,
      customerName: event.customerName,  // denormalized
      status: 'pending',
      itemCount: event.items.length,
      total: event.total,
      productNames: event.items.map(i => i.name).join(', '),  // denormalized for display
      createdAt: event.timestamp,
    });
  }
}
```

---

## Practical Recommendation: The Hybrid Approach

For most teams (20-100 engineers), a hybrid approach works best:

```
┌────────────────────────────────────────────────────────────────┐
│                     Bounded Contexts                            │
│                                                                  │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │    Commerce Context      │  │      Identity Context         │  │
│  │                          │  │                               │  │
│  │  OrderService ─┐         │  │  UserService ─┐              │  │
│  │  CartService  ─┤ Shared  │  │  AuthService ─┤ Shared       │  │
│  │  PromoService ─┤  DB     │  │  OrgService  ─┤  DB          │  │
│  │                │         │  │               │              │  │
│  │             commerce_db  │  │           identity_db        │  │
│  └─────────────────────────┘  └──────────────────────────────┘  │
│                   │                          │                   │
│                   └──────── Events ──────────┘                   │
└────────────────────────────────────────────────────────────────┘
```

Services within the same bounded context share a database. Cross-context communication is via events/APIs only. You get:
- ACID transactions within a context
- Team independence between contexts
- Manageable event complexity

---

## Key Takeaways

- **Team topology** is the primary driver of data architecture choices, not technology
- **Database per service** is right for large orgs with many independent teams — not startups
- **Saga pattern** replaces distributed transactions — design for compensating transactions
- **Outbox pattern** is essential for reliable event publishing (at-least-once delivery)
- **CQRS** pairs naturally with event-driven architecture for complex read patterns
- **Bounded context + shared DB** is a pragmatic middle ground for mid-size teams
- Eventual consistency is a genuine trade-off — not all business operations can tolerate it

The best data architecture is the one that maps to your team's communication patterns, not the one that looks best on a diagram. Start simple, extract when the pain is real.

![System Architecture](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&auto=format&fit=crop)
*Photo by [Luke Chesser](https://unsplash.com/@lukechesser) on Unsplash*
