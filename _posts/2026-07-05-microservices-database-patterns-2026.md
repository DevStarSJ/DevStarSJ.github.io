---
layout: post
title: "Database per Service vs. Shared Database: Microservices Data Patterns in 2026"
subtitle: "The definitive trade-off guide for teams designing microservice data boundaries"
date: 2026-07-05 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&q=80"
catalog: true
tags:
  - Microservices
  - Architecture
  - Database
  - Backend
  - DistributedSystems
---

# Database per Service vs. Shared Database: Microservices Data Patterns in 2026

The "database per service" pattern is one of microservices' most celebrated principles and most consistently misapplied in practice. Teams adopt it religiously, suffer the operational consequences, then either retreat to a shared database or build elaborate distributed systems to compensate.

This post is a realistic assessment of both patterns — when each is right, what the trade-offs actually cost, and how mature teams navigate the middle ground.

![Database architecture diagram](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1000&q=80)

*Photo by Taylor Vick on Unsplash*

---

## The Case for Database per Service

The theoretical argument is clean: if services share a database, they share a schema. Schema changes in Service A can break Service B. Your services are microservices in name only — they're a distributed monolith with all the coupling and none of the independence.

The **database per service** pattern enforces true independence:

- Services can evolve their schemas without coordination
- Failure isolation: a corrupt database in one service doesn't take down others
- Technology freedom: use PostgreSQL for transactional data, Redis for sessions, Cassandra for time-series
- Independent scaling: scale the Order service database separately from the User service database

This works well. For large teams at real scale, these benefits are real and significant.

### When It Works

- **Team autonomy matters:** Teams can own their service end-to-end, including schema
- **High deployment velocity:** Services need to deploy without coordination ceremonies
- **Diverse data needs:** Different services genuinely benefit from different storage technologies
- **Regulatory isolation:** Some data must be stored in specific regions or encrypted differently

---

## The Hidden Costs

The textbooks cover the benefits. The costs show up at 2 AM during an incident.

### Cross-Service Queries

The most immediate pain: you can no longer do a SQL JOIN across service boundaries. In a monolith:

```sql
-- This is trivially easy in a monolith
SELECT o.id, o.amount, u.email, u.name
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending'
  AND o.created_at > NOW() - INTERVAL '24 hours';
```

In a microservices world, this becomes:
1. Query Order service for pending orders in last 24h → returns `[{id, amount, user_id}]`
2. Extract all `user_id` values
3. Call User service in batch to resolve user details
4. Join in application code

This is **API composition** — orchestrating multiple service calls and merging results in memory. It's not impossible, but it's verbose, error-prone, and creates chatty service communication.

### Distributed Transactions

Atomic operations across service boundaries require distributed transactions. The canonical patterns:

**Saga Pattern:** Break a multi-step transaction into a sequence of local transactions, each publishing an event. On failure, execute compensating transactions.

```
CreateOrder → (event) → ReserveInventory → (event) → ChargePayment → (event) → ConfirmOrder
                                                            ↓ (failure)
                                     ↑ ReleaseInventory ← CancelPayment
```

Sagas are choreography-heavy (event-driven) or orchestration-heavy (workflow engine). Both are significantly more complex than a SQL `BEGIN TRANSACTION`.

**Two-Phase Commit (2PC):** Coordinate a distributed commit across multiple databases. Technically possible; practically a reliability nightmare. Most teams avoid it.

The honest truth: **distributed transactions are 10x harder than local transactions.** If your business logic requires cross-service atomicity frequently, this is a strong signal your service boundaries are wrong.

### Eventual Consistency UI Problems

Users expect consistency. They submit a form and expect to see their change reflected immediately. With eventual consistency — where updates propagate via events — you can create awkward UX:

1. User creates an order (Order service)
2. Response says "order created"
3. User checks order history... their new order isn't there yet (event hasn't propagated)
4. User thinks it's broken, submits again

Solutions:
- **Read-your-own-writes:** The creating service returns the new record, and the UI uses that data immediately without re-querying
- **Versioned reads:** Include an expected version in read requests; the service waits until it's caught up
- **Accept it:** Tell users "your change may take a few seconds to appear"

---

## The Shared Database Pattern: Reevaluating the Boogeyman

Shared databases have a bad reputation that's partly earned and partly tribal. Let's separate the concerns.

### Shared Database, Separate Schemas

The most pragmatic middle ground: multiple services share the *same database server* but each service owns its own schema (or set of tables). Services cannot query each other's tables directly — only their own.

```sql
-- Order service owns orders schema
-- User service owns users schema
-- Direct cross-schema queries are forbidden by convention or enforced by grants

-- Bad (cross-service join):
SELECT * FROM users.profiles JOIN orders.items ON ...;

-- Good (each service queries its own schema):
-- In Order service: SELECT * FROM orders.items WHERE ...;
-- In User service: SELECT * FROM users.profiles WHERE ...;
```

This gives you:
- Operational simplicity: one database cluster to operate
- Schema isolation enforced by PostgreSQL roles
- Still possible to run a JOIN for reporting (read-only replica, separate credentials)
- No inter-service API calls for cross-cutting queries in reporting/analytics

### When Shared Database is Fine

- **Small teams:** The coupling costs are real but manageable with discipline and conventions
- **Early product:** Move fast, avoid distributed systems overhead, extract later
- **OLAP/reporting:** Analytics queries across service boundaries are much easier with a shared database (even if a read replica)
- **Monolith extraction:** Shared database is the *starting point*, not the end state

---

## Data Synchronization Patterns

When you commit to separate databases, you need patterns for keeping data consistent across services.

### Event-Driven Replication

Services publish domain events when data changes. Other services subscribe and maintain local copies of the data they need.

```python
# Order service subscribes to User events
@event_handler("user.profile.updated")
async def sync_user_cache(event: UserProfileUpdated):
    await local_user_cache.upsert({
        "user_id": event.user_id,
        "name": event.name,
        "email": event.email,
        "updated_at": event.timestamp,
    })
```

The Order service now has a local cache of user data. Cross-service joins happen locally. The trade-off: data is eventually consistent and you're duplicating storage.

### CQRS + Read Models

Command-Query Responsibility Segregation separates write models (normalized, single service) from read models (denormalized, potentially cross-service aggregates).

```
Write path: Order → OrderRepository (normalized, PostgreSQL)
            User → UserRepository (normalized, PostgreSQL)

Read path: OrderListView → reads from a pre-built view
           (denormalized table with order + user data, rebuilt via events)
```

The read model is a cache that's always rebuilding. When order or user events arrive, the view updater merges them. Queries against the view are fast, simple, and cross-service.

---

## Practical Decision Framework

Ask these questions in order:

### 1. How many teams are working on this system?

- **1-3 teams:** Shared database with schema conventions. Don't over-engineer.
- **4+ teams:** The coordination cost of shared schemas starts to hurt. Database per service pays off.

### 2. How often do you need cross-service atomicity?

- **Rarely (< 10% of operations):** Sagas are manageable. Database per service is fine.
- **Frequently:** Your service boundaries might be wrong. Consider merging services.

### 3. What's your reporting/analytics story?

- **Separate data warehouse:** Fine — ETL from service databases into a warehouse for analytics.
- **Ad-hoc queries by engineers:** Shared database (read replica) is much more practical.

### 4. What's your team's distributed systems experience?

No judgment — distributed systems are genuinely hard. If your team hasn't operated Kafka, debugged saga compensation failures, or investigated data inconsistencies across services before, the shared database buys you time to learn.

---

## The Anti-Pattern: Distributed Monolith

The worst outcome is adopting database per service without service independence: services have separate databases but synchronous REST calls everywhere, so they're still tightly coupled. You have all the operational overhead with none of the independence.

Symptoms:
- Service A's deploy always requires coordinating with Service B
- Integration tests that spin up 5+ services to test one workflow
- One service being down causes cascading failures across unrelated services

If you see these patterns, your service boundaries are wrong regardless of your database topology.

---

## What Mature Teams Do

After years of microservices experience in the industry, a few patterns have emerged as genuinely stable:

1. **Start shared, extract strategically.** Don't start with database per service. Extract services with their own databases when team ownership and deployment independence actually require it.

2. **Own your data, share events.** A service's database is its private concern. Cross-service communication happens via published events or explicit API contracts — never direct database access.

3. **Separate OLTP from OLAP.** Transactional databases are for services. Analytical queries go to a warehouse (BigQuery, Redshift, Snowflake) fed by an event stream. Never run analytical queries against production databases.

4. **Accept redundancy.** Some duplication of data across service databases is correct and healthy. The alternative (a single source of truth for everything, accessible everywhere) is a monolith.

5. **Use an outbox pattern.** Ensure database writes and event publishing are atomic using the [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html). Write to a local `outbox` table in the same transaction as your business data; a separate process reads and publishes.

---

## Final Word

Neither pattern is universally correct. The "database per service" principle reflects real operational experience at large companies where team independence genuinely required it. But the context matters: Netflix's engineering challenges at 2026 scale are not your challenges at 50 engineers.

Good architecture is the right trade-offs for your actual constraints, not cargo-culted best practices from companies that are orders of magnitude larger than yours.

Start simple. Extract when it hurts. Build distributed systems when the coordination costs of shared infrastructure exceed the complexity costs of separation — and not before.
