---
layout: post
title: "The Death of the Monolith? Why Modular Monoliths Are Making a Comeback in 2026"
subtitle: "After years of microservices hype, engineering teams are rediscovering the modular monolith — and for good reason"
date: 2026-04-30 12:00:00
author: "Seokjun Lee"
header-img: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1600&auto=format&fit=crop"
catalog: true
categories:
  - Software Architecture
  - Backend
tags:
  - Monolith
  - Microservices
  - Software Architecture
  - Backend
  - System Design
  - Modulith
---

# The Death of the Monolith? Why Modular Monoliths Are Making a Comeback in 2026

In 2018, saying you were building a monolith at a tech conference felt like admitting defeat. By 2022, the microservices hangover had set in and teams were quietly consolidating. In 2026, the pendulum has swung back — not all the way to "big ball of mud" monoliths, but to something more sophisticated: the **modular monolith** (or "modulith"), and it's earning genuine respect from engineers who've been burned by both extremes.

![Architecture diagram on whiteboard](https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=1200&auto=format&fit=crop)
*Photo by Kelly Sikkema on Unsplash*

## The Microservices Tax Nobody Talks About

Let me be clear: microservices solve real problems. For genuinely independent teams working on genuinely independent domains at scale, they enable autonomous deployment and scaling. Netflix, Uber, and Amazon aren't running microservices because of hype — they're running them because the organizational and scaling benefits are real *at their scale*.

But here's what we collectively learned the hard way: **microservices distribute your complexity — they don't eliminate it.** They trade development complexity for operational complexity.

The microservices tax includes:

- **Network latency** on every inter-service call (was a function call, now is HTTP)
- **Distributed tracing** required to debug what was previously a local function call
- **Service mesh overhead** for traffic management, authentication, observability
- **Data consistency headaches** (distributed transactions, eventual consistency)
- **Deployment orchestration** — a simple feature might touch 4 services with 4 deployment pipelines
- **Local development friction** — spinning up 12 services to run the app locally

For a 10-person team building a B2B SaaS product, this tax is devastating. You're spending 40% of engineering cycles on microservices infrastructure that a 1000-person company actually needs.

## What a Modular Monolith Actually Is

The term gets used loosely, so let's be precise. A modular monolith has:

1. **A single deployable unit** — one process, one deployment pipeline
2. **Strict module boundaries** — code enforces separation between modules
3. **Module-level APIs** — modules communicate through defined interfaces, not shared database tables or internal function calls
4. **No shared mutable state** between modules (each module owns its data)
5. **Independent business domains** — modules map to bounded contexts

This is *not* just "a big codebase." The defining characteristic is that modules are enforced boundaries, not just folders.

## Spring Modulith — The Reference Implementation

Spring has been ahead of the curve here. Spring Modulith emerged as one of the most influential frameworks for modular monolith patterns, and it's worth understanding its approach even if you're not in the Java ecosystem.

```java
// Module structure — packages as modules
com.example.app
├── orders/           ← Orders module
│   ├── OrderService.java
│   ├── OrderRepository.java
│   └── internal/     ← Private to orders module
│       └── OrderValidator.java
├── inventory/        ← Inventory module
│   ├── InventoryService.java
│   └── internal/
│       └── StockCalculator.java
└── notifications/    ← Notifications module
    └── NotificationService.java
```

```java
// Cross-module communication via events (not direct calls)
// In orders module:
@Service
public class OrderService {
    private final ApplicationEventPublisher events;
    
    public Order placeOrder(PlaceOrderCommand cmd) {
        Order order = Order.place(cmd);
        orderRepository.save(order);
        
        // Don't call inventory directly — publish event
        events.publishEvent(new OrderPlaced(order.getId(), order.getItems()));
        
        return order;
    }
}

// In inventory module — listens for the event:
@ApplicationModuleListener
public class InventoryOnOrderPlaced {
    public void on(OrderPlaced event) {
        inventoryService.reserveStock(event.items());
    }
}
```

The `@ApplicationModuleListener` annotation is key — Spring Modulith enforces that modules can't directly import each other's internal classes. The event bus is the only communication mechanism, which means:

- Modules can evolve independently
- You can test modules in isolation
- When you eventually need to extract a service, the interface is already defined

## The Node.js/TypeScript Pattern

For TypeScript applications, the pattern is similar but the tooling is less mature. Here's how leading teams are structuring it:

```typescript
// Module interface — the only public API
// src/modules/orders/index.ts
export { OrderService } from './OrderService';
export type { Order, OrderStatus, PlaceOrderDto } from './types';
// NotImplemented NOT exported:
// export { OrderRepository } from './OrderRepository'; ← private

// Enforcing boundaries with TypeScript path aliases
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@orders/*": ["src/modules/orders/*"],
      "@inventory/*": ["src/modules/inventory/*"],
      "@notifications/*": ["src/modules/notifications/*"]
    }
  }
}

// ESLint rule to prevent cross-module internal imports
// .eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        // Prevent importing from other modules' internals
        '../*/internal/*',
        '../../*/internal/*',
      ]
    }]
  }
}
```

For event-based communication in Node.js:

```typescript
// Type-safe domain events
interface DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
}

interface OrderPlaced extends DomainEvent {
  readonly orderId: string;
  readonly customerId: string;
  readonly items: OrderItem[];
}

// Event bus (in-process for monolith, swappable to message queue later)
class EventBus {
  private handlers = new Map<string, Function[]>();
  
  publish<T extends DomainEvent>(eventType: string, event: T): void {
    const eventHandlers = this.handlers.get(eventType) ?? [];
    eventHandlers.forEach(handler => handler(event));
  }
  
  subscribe<T extends DomainEvent>(
    eventType: string, 
    handler: (event: T) => void
  ): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...existing, handler]);
  }
}
```

The in-process event bus is a critical design decision: when (if) you need to extract a module to a microservice, you swap the in-process bus for a Kafka/SQS producer/consumer. The module code doesn't change.

## Database Per Module — The Hard Part

The module that most people get wrong is data ownership. A true modular monolith has each module owning its data. This *doesn't* mean separate databases (that would defeat the operational simplicity). It means separate schemas or separate tables with enforced ownership.

```sql
-- Each module gets its own schema
CREATE SCHEMA orders;
CREATE SCHEMA inventory;
CREATE SCHEMA notifications;

-- Cross-schema references are NOT foreign keys
-- Instead, IDs are stored and consistency is eventual
CREATE TABLE orders.orders (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL,  -- Not a FK to customers!
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory.reservations (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL,  -- Not a FK to orders.orders!
    item_sku VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL
);
```

This looks weird at first. No foreign keys across schemas? How do we maintain consistency?

Through events and compensation logic — the same patterns you'd use in microservices, but simpler because everything runs in the same process and you can use database transactions within a module.

## When to Use Modular Monolith vs. Microservices

This decision framework has held up well in practice:

**Modular monolith is better when:**
- Team size < 30–50 engineers
- Bounded contexts aren't truly independent (shared data needs are common)
- Deployment frequency is moderate (< 10 deploys/day)
- You're not yet sure where the boundaries should be
- Operational simplicity is valued over independent scalability

**Microservices are better when:**
- Truly independent teams with different deployment needs
- Specific services have dramatically different scaling requirements (10x difference)
- Regulatory/compliance requires data isolation
- > 100 engineers working on the system
- You have platform engineering capacity to maintain the infrastructure

The critical insight: **microservices are an organizational scaling solution**, not a technical one. The distributed system complexity is worth paying when it enables teams to work independently. If teams are coordinating constantly anyway, you're paying the distributed systems tax without the benefit.

## Migration Paths: Both Directions

**Monolith → Modular Monolith:**
This is usually the first step. Enforce module boundaries before considering extraction. Many teams do this and never need to go further.

**Modular Monolith → Selective Microservices:**
When one module needs independent scaling (say, your document processing module during peak load), extract that module. Your event-driven interface is already defined — you're just moving the consumer to a separate process.

**Microservices → Modular Monolith:**
This is the "majestic monolith" move. Combine chatty microservices that always deploy together and share data anyway. Amazon famously did this with some internal services. It's not going backwards — it's recognizing the right tool for the problem.

## The 2026 Consensus

The industry has largely landed here: **start with a modular monolith, extract services when you have a specific, demonstrated reason to**. The days of building microservices-first as a default architectural choice are over, at least for teams that have been paying attention.

The modular monolith is the "boring technology" that turns out to be the right choice most of the time — powerful enough to scale to a surprisingly large team and load, simple enough to operate with a small team, and extensible enough to evolve when you genuinely need distributed services.

Don't let architecture conference talks make you feel behind. The smartest teams I've seen in 2026 are building modular monoliths and loving it.

---

*Inspired by Sam Newman's "Building Microservices," Martin Fowler's writing on modular monoliths, and the excellent Spring Modulith documentation.*
