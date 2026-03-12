---
layout: post
title: "Database Per Service vs Shared Database: Microservices Data Patterns in 2026"
subtitle: "A pragmatic guide to microservices data architecture — when strict isolation pays off and when it creates more problems than it solves"
date: 2026-03-12 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&auto=format&fit=crop&q=80"
header-mask: 0.3
catalog: true
tags:
  - Microservices
  - Database
  - Architecture
  - Backend
  - Distributed Systems
  - Event Sourcing
  - CQRS
---

## The Microservices Data Problem

You've split your monolith into microservices. The services run independently, scale independently, deploy independently. 

But then comes the hard question: **what do you do about the database?**

The textbook answer is "Database Per Service" — each microservice owns its data, and services communicate only through APIs or events. Beautiful in theory.

In practice, 2026 has given us years of real-world experience. The answer is more nuanced than any architecture book will tell you.

![Database Architecture](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1000&auto=format&fit=crop&q=80)
*Photo by [Taylor Vick](https://unsplash.com/@tvick) on Unsplash*

---

## The Core Patterns

### Pattern 1: Database Per Service (Strict Isolation)

Each service has its own database, potentially a different technology:

```
OrderService     → PostgreSQL (order data)
InventoryService → MongoDB (product catalog)  
UserService      → PostgreSQL (user data)
SearchService    → Elasticsearch (search index)
CacheService     → Redis (session/cache)
```

**Communication:**
```
OrderService needs user data?
→ Call UserService REST API
→ Or listen to user.updated events
→ Never query UserService's DB directly
```

### Pattern 2: Shared Database

Multiple services share one database with schema separation:

```
shared-postgres:
├── orders schema (owned by OrderService)
├── inventory schema (owned by InventoryService)
└── users schema (owned by UserService)
```

Services can technically see each other's schemas, but by convention don't cross boundaries.

### Pattern 3: Shared Nothing (Event Sourcing)

Services share no database, communicate only through events:

```
OrderPlaced event → 
├── InventoryService consumes → updates stock count
├── NotificationService consumes → sends email
├── AnalyticsService consumes → updates metrics
└── Each service stores projection of events it cares about
```

---

## The Reality of "Database Per Service" at Scale

Let me share what teams actually discover after 2–3 years:

### The Good: True Service Independence

```python
# OrderService team can:
class Order(Base):
    __tablename__ = "orders"  # Their own table, their own schema
    
    id: UUID
    user_id: UUID  # Just an ID, not a FK to users table!
    status: OrderStatus
    # ... can change this schema without talking to UserService team

# Deploy without coordination
# Scale database independently (Orders need more IOPS than Users)
# Choose optimal DB tech (Orders → Postgres, Products → MongoDB)
```

### The Bad: Cross-Service Queries

The most painful reality:

```python
# The business wants: "Show order history with user details"
# Database per service means: TWO API calls + data joining in code

class OrderController:
    async def get_orders_with_users(self, page: int) -> list[OrderWithUser]:
        # Step 1: Get orders from OrderDB
        orders = await self.order_repo.get_page(page)
        
        # Step 2: Collect unique user IDs
        user_ids = list({o.user_id for o in orders})
        
        # Step 3: Batch fetch from UserService (HTTP round trip!)
        users = await self.user_client.get_users_by_ids(user_ids)
        user_map = {u.id: u for u in users}
        
        # Step 4: Join in application code
        return [
            OrderWithUser(order=o, user=user_map.get(o.user_id))
            for o in orders
        ]
```

This is slower, more complex, and can fail in more ways. A simple JOIN in SQL becomes an N+1 problem nightmare.

### The Ugly: Distributed Transactions

```python
# Scenario: Place an order (deduct inventory + create order record)
# These are in different services/databases

# Option 1: Two-Phase Commit (2PC)
# Pros: ACID compliance
# Cons: 2PC is slow, complex, and can leave you in limbo

# Option 2: Saga Pattern
async def place_order_saga(order_data: OrderCreate) -> Order:
    # Step 1: Create order (PENDING)
    order = await order_service.create(order_data, status=PENDING)
    
    try:
        # Step 2: Reserve inventory
        reservation = await inventory_service.reserve(order.items)
        
        # Step 3: Process payment
        payment = await payment_service.charge(order.total, order.user_id)
        
        # Step 4: Confirm everything
        await order_service.confirm(order.id)
        await inventory_service.confirm_reservation(reservation.id)
        
        return order
        
    except InventoryError:
        # Compensate
        await order_service.cancel(order.id, reason="out_of_stock")
        raise
    
    except PaymentError:
        # Compensate both
        await inventory_service.release_reservation(reservation.id)
        await order_service.cancel(order.id, reason="payment_failed")
        raise
    
    except Exception:
        # Handle partial failures...
        # This is where it gets really complicated
```

This saga implementation is 10x more complex than a single database transaction, and it still doesn't give you ACID guarantees — you can have inconsistent windows.

---

## The Pragmatic 2026 Approach

Here's what sophisticated teams have converged on:

### Guideline 1: Team Topology Drives Database Boundaries

Don't split databases by domain objects — split by **team ownership**.

```
# Good: Team-aligned services
Team Alpha → All marketing/user acquisition data → shared DB
Team Beta  → All transactional/order data → shared DB  
Team Gamma → All analytics/reporting data → read-optimized DB

# Bad: Dogmatic object-per-service
UserService → users DB
ProfileService → profiles DB (just users without auth fields!)
PreferenceService → preferences DB (just user settings!)
```

### Guideline 2: Use Strangler Fig for Migration

Don't start with perfect microservices. Extract services as needed:

```
Phase 1: Monolith with modular code
─────────────────────────────────
┌─────────────────────────────────┐
│ Monolith                        │
│ ┌────────┐ ┌────────┐ ┌──────┐ │
│ │ Orders │ │Inventory│ │Users│ │
│ └────────┘ └────────┘ └──────┘ │
│         One Database            │
└─────────────────────────────────┘

Phase 2: Extract when pain is real
─────────────────────────────────
┌──────────┐   ┌───────────────────────────┐
│ Search   │   │ Monolith                  │
│ Service  │   │ ┌────────┐ ┌────────────┐ │
│ (ES)     │   │ │ Orders │ │Users+Inv  │ │
└──────────┘   │ └────────┘ └────────────┘ │
               │         One Database      │
               └───────────────────────────┘

Phase 3: Extract more as needed
─────────────────────────────────
Extract only when:
- Clear team ownership boundary
- Independent scaling need
- Genuinely different data technology
```

### Guideline 3: Read Models Bridge the Gap

Use event-driven **read models** (CQRS) to avoid cross-service queries:

```python
# OrderService publishes events
class OrderPlacedEvent(BaseModel):
    order_id: UUID
    user_id: UUID
    user_email: str  # Denormalized for read performance!
    user_name: str   # Denormalized!
    items: list[OrderItem]
    total: Decimal
    timestamp: datetime

# OrderDashboardService maintains a denormalized read model
class OrderDashboardProjection:
    async def on_order_placed(self, event: OrderPlacedEvent):
        # Store denormalized view for fast queries
        await self.db.execute("""
            INSERT INTO order_dashboard 
                (order_id, user_id, user_email, user_name, total, status, created_at)
            VALUES 
                ($1, $2, $3, $4, $5, 'pending', $6)
        """, event.order_id, event.user_id, event.user_email, 
            event.user_name, event.total, event.timestamp)
    
    async def on_user_name_changed(self, event: UserNameChangedEvent):
        # Update denormalized data when source changes
        await self.db.execute("""
            UPDATE order_dashboard SET user_name = $1
            WHERE user_id = $2
        """, event.new_name, event.user_id)
```

This gives you:
- Fast queries (no cross-service calls)
- Service isolation maintained
- Eventual consistency (acceptable for most use cases)

---

## Data Patterns Decision Tree

```
Is this data queried together with other service's data frequently?
├── YES → Consider read models/materialized views
└── NO → Pure DB per service works fine

Does this data need ACID transactions with other service's data?
├── YES → Consider Saga pattern or keeping in same DB
└── NO → DB per service with eventual consistency

Will this service need to scale differently than its neighbors?
├── YES → DB per service strongly recommended
└── NO → Shared DB with schema separation is simpler

Is there a clear team ownership boundary?
├── YES → DB per service matches team autonomy
└── NO → Shared DB until boundaries clarify
```

---

## Event Sourcing: When It Makes Sense

Event sourcing stores **changes** rather than current state:

```python
# Traditional approach
class Order(Base):
    status = "shipped"  # Only current state

# Event sourcing approach  
events = [
    OrderCreated(timestamp="09:00", user_id="u1", items=[...]),
    PaymentProcessed(timestamp="09:01", amount=99.99),
    WarehousePicked(timestamp="10:30", warehouse_id="w1"),
    Shipped(timestamp="14:00", tracking_number="TRACK123"),
]
# Current state is derived by replaying events
```

**Event sourcing is worth the complexity when:**
- You need complete audit trail (financial, healthcare, legal)
- You need to rebuild state at any point in time
- Multiple services need to react to the same changes
- You need temporal queries ("what was the order status yesterday?")

**Event sourcing is NOT worth it when:**
- Simple CRUD with occasional business logic
- Small team without event-driven experience
- No audit/compliance requirements
- Reporting can be done with standard SQL

The dirty secret: most applications don't need event sourcing.

---

## Technology Choices by Pattern

### Database Per Service — Technology Matching

```yaml
# Common tech-to-service matching
OrderService:
  database: PostgreSQL
  reason: ACID transactions, complex queries, financial data

ProductCatalog:
  database: MongoDB
  reason: Flexible schema (attributes vary by product category), document model

SearchService:
  database: Elasticsearch
  reason: Full-text search, faceted filtering

RecommendationService:
  database: Redis + Neo4j
  reason: Fast lookup (Redis) + graph relationships (Neo4j)

AnalyticsService:
  database: ClickHouse
  reason: Column-store for OLAP queries, high-volume event data

SessionService:
  database: Redis
  reason: TTL-based storage, sub-millisecond reads
```

---

## Anti-Patterns to Avoid

### 1. The Database Monolith in Disguise

```python
# This is NOT microservices with DB isolation
class OrderService:
    def get_order_with_details(self, order_id: UUID):
        # Services sharing connection strings to each other's DBs!
        with shared_db.connect() as conn:
            return conn.execute("""
                SELECT o.*, u.name, i.stock_count
                FROM orders_schema.orders o
                JOIN users_schema.users u ON o.user_id = u.id
                JOIN inventory_schema.items i ON o.item_id = i.id
                WHERE o.id = ?
            """, order_id)
# This is a distributed monolith — worst of both worlds
```

### 2. Over-Splitting

```
# Don't do this
UserProfileService → DB
UserPreferencesService → DB  
UserSettingsService → DB
UserAuthService → DB
UserContactService → DB

# These should be: UserService → DB
# The split creates coordination overhead with no benefit
```

### 3. Synchronous Cross-Service Chains

```python
# Never create chains longer than 2 hops
OrderService → UserService → ProfileService → AddressService

# This creates:
# - Cascading failures (one failure brings down orders)
# - High latency (each hop adds ~50ms)
# - Tight coupling through dependency chain
```

---

## Conclusion: The 2026 Pragmatic Stance

The best teams in 2026 are not dogmatic about any pattern. They:

1. **Start with a modular monolith** — clear module boundaries, single DB
2. **Extract services when needed** — scaling, team independence, or technology requirements
3. **Use read models liberally** — denormalize for query performance
4. **Apply Saga only where needed** — most transactions don't need it
5. **Reserve event sourcing** — for true audit-trail requirements

The goal of microservices data architecture is not architectural purity. It's delivering value to users reliably, at scale, with a team that can move fast.

Sometimes that means Database Per Service. Sometimes it means a shared database with good team discipline. Always it means understanding the tradeoffs.

---

## Resources

- [Microservices Patterns — Chris Richardson](https://microservices.io/patterns/)
- [Event Sourcing Pattern — Martin Fowler](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Saga Pattern Explained](https://microservices.io/patterns/data/saga.html)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
- [Database Per Service vs Shared Database](https://microservices.io/patterns/data/database-per-service.html)
