---
layout: post
title: "Distributed Systems Patterns Every Backend Engineer Must Know in 2026"
subtitle: "Saga pattern, outbox, CQRS, circuit breaker, and more — practical patterns for resilient microservices"
date: 2026-03-26 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - DistributedSystems
  - Microservices
  - Backend
  - Architecture
  - Patterns
  - Cloud
---

# Distributed Systems Patterns Every Backend Engineer Must Know in 2026

Distributed systems are notoriously hard. Networks partition, services fail, and clocks drift. Yet in 2026, nearly every significant backend application runs as a distributed system. The difference between engineers who struggle with this complexity and those who manage it confidently is knowing the right patterns. This guide covers the essential ones with production-ready code.

![Distributed Systems](https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&auto=format&fit=crop)
*Photo by Kevin Ku on Unsplash*

## The Fundamental Problems

Before patterns, understand the problems they solve:

1. **Partial failure:** Service A calls B, B crashes mid-operation — was the write committed?
2. **Network partitions:** Two parts of the system can't communicate, both keep running
3. **Eventual consistency:** Changes propagate asynchronously — readers may see stale data
4. **Ordering:** Events from multiple producers arrive out of order
5. **Idempotency:** Retries re-execute operations that shouldn't be repeated

---

## 1. Saga Pattern: Distributed Transactions

The traditional 2-Phase Commit (2PC) is too slow and tightly coupled for microservices. The Saga pattern replaces distributed transactions with a sequence of local transactions and compensating actions.

### Choreography-Based Saga

Services react to events without a central coordinator:

```python
# order-service/events.py
from dataclasses import dataclass
from enum import Enum
import json

class OrderStatus(Enum):
    PENDING = "PENDING"
    PAYMENT_APPROVED = "PAYMENT_APPROVED"
    INVENTORY_RESERVED = "INVENTORY_RESERVED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

@dataclass
class OrderCreatedEvent:
    order_id: str
    user_id: str
    items: list[dict]
    total_amount: float
    
@dataclass
class PaymentApprovedEvent:
    order_id: str
    payment_id: str
    
@dataclass
class PaymentFailedEvent:
    order_id: str
    reason: str
    
@dataclass
class InventoryReservedEvent:
    order_id: str
    reservation_id: str

@dataclass
class InventoryReservationFailedEvent:
    order_id: str
    reason: str
```

```python
# order-service/order_saga.py
import asyncio
from kafka import KafkaProducer, KafkaConsumer
import json

class OrderSaga:
    def __init__(self, kafka_producer: KafkaProducer, db):
        self.producer = kafka_producer
        self.db = db
    
    async def start(self, order_data: dict) -> str:
        """Initiate the order saga"""
        order_id = generate_order_id()
        
        # Create order in PENDING state
        await self.db.execute("""
            INSERT INTO orders (id, user_id, status, items, total)
            VALUES ($1, $2, 'PENDING', $3, $4)
        """, order_id, order_data['user_id'], 
            json.dumps(order_data['items']), order_data['total'])
        
        # Publish OrderCreated event to trigger saga
        self.producer.send('order-events', {
            'type': 'ORDER_CREATED',
            'order_id': order_id,
            'user_id': order_data['user_id'],
            'items': order_data['items'],
            'total_amount': order_data['total'],
        })
        
        return order_id
    
    async def handle_payment_approved(self, event: dict):
        """Payment service approved → reserve inventory"""
        await self.db.execute("""
            UPDATE orders SET status = 'PAYMENT_APPROVED', 
            payment_id = $2 WHERE id = $1
        """, event['order_id'], event['payment_id'])
        
        # Request inventory reservation
        self.producer.send('inventory-commands', {
            'type': 'RESERVE_INVENTORY',
            'order_id': event['order_id'],
            'items': await self.get_order_items(event['order_id']),
        })
    
    async def handle_payment_failed(self, event: dict):
        """Payment failed → cancel order (no compensation needed, nothing changed)"""
        await self.db.execute("""
            UPDATE orders SET status = 'FAILED', 
            failure_reason = $2 WHERE id = $1
        """, event['order_id'], event['reason'])
    
    async def handle_inventory_reserved(self, event: dict):
        """Inventory reserved → complete order"""
        await self.db.execute("""
            UPDATE orders SET status = 'COMPLETED',
            reservation_id = $2 WHERE id = $1
        """, event['order_id'], event['reservation_id'])
        
        self.producer.send('order-events', {
            'type': 'ORDER_COMPLETED',
            'order_id': event['order_id'],
        })
    
    async def handle_inventory_failed(self, event: dict):
        """Inventory failed → compensate payment (refund!)"""
        await self.db.execute("""
            UPDATE orders SET status = 'FAILED' WHERE id = $1
        """, event['order_id'])
        
        order = await self.db.fetchrow("SELECT * FROM orders WHERE id = $1", event['order_id'])
        
        # Trigger compensation: refund the payment
        self.producer.send('payment-commands', {
            'type': 'REFUND_PAYMENT',
            'order_id': event['order_id'],
            'payment_id': order['payment_id'],
            'amount': float(order['total']),
            'reason': 'inventory_unavailable',
        })
```

### Orchestration-Based Saga

A central coordinator (the saga orchestrator) manages the flow:

```python
# order-service/order_orchestrator.py
from enum import Enum
from typing import Optional

class SagaState(Enum):
    STARTED = "STARTED"
    AWAITING_PAYMENT = "AWAITING_PAYMENT"
    AWAITING_INVENTORY = "AWAITING_INVENTORY"
    COMPENSATING_PAYMENT = "COMPENSATING_PAYMENT"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class OrderSagaOrchestrator:
    """
    State machine that coordinates the order saga.
    Persisted to DB for crash recovery.
    """
    
    def __init__(self, saga_id: str, order_id: str, db, message_bus):
        self.saga_id = saga_id
        self.order_id = order_id
        self.db = db
        self.bus = message_bus
        self.state = SagaState.STARTED
    
    async def execute(self):
        """Entry point — runs the saga"""
        try:
            await self._transition(SagaState.AWAITING_PAYMENT)
            
            # Step 1: Process payment
            payment_result = await self.bus.request_reply(
                topic='payment-service',
                message={'type': 'PROCESS_PAYMENT', 'order_id': self.order_id},
                timeout_seconds=30
            )
            
            if not payment_result['success']:
                await self._fail(payment_result['reason'])
                return
            
            self.payment_id = payment_result['payment_id']
            await self._transition(SagaState.AWAITING_INVENTORY)
            
            # Step 2: Reserve inventory
            inventory_result = await self.bus.request_reply(
                topic='inventory-service',
                message={'type': 'RESERVE_INVENTORY', 'order_id': self.order_id},
                timeout_seconds=15
            )
            
            if not inventory_result['success']:
                # Compensation: refund payment
                await self._transition(SagaState.COMPENSATING_PAYMENT)
                await self.bus.request_reply(
                    topic='payment-service',
                    message={
                        'type': 'REFUND_PAYMENT',
                        'payment_id': self.payment_id,
                    },
                    timeout_seconds=30
                )
                await self._fail('inventory_unavailable')
                return
            
            # All steps succeeded
            await self._transition(SagaState.COMPLETED)
            
        except TimeoutError as e:
            await self._fail(f'timeout: {e}')
    
    async def _transition(self, new_state: SagaState):
        self.state = new_state
        await self.db.execute("""
            UPDATE sagas SET state = $2, updated_at = NOW() WHERE id = $1
        """, self.saga_id, new_state.value)
    
    async def _fail(self, reason: str):
        self.state = SagaState.FAILED
        await self.db.execute("""
            UPDATE sagas SET state = 'FAILED', failure_reason = $2 WHERE id = $1
        """, self.saga_id, reason)
```

---

## 2. Transactional Outbox Pattern

The problem: You write to your DB and then publish to Kafka. If the server crashes between the two, events are lost. The outbox pattern solves this.

```sql
-- Create outbox table alongside your domain tables
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    published BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_outbox_unpublished ON outbox_events (published, created_at) 
    WHERE published = FALSE;
```

```python
# Write domain state and event atomically
async def create_order(db, order_data: dict) -> str:
    async with db.transaction():
        # 1. Write domain state
        order_id = await db.fetchval("""
            INSERT INTO orders (user_id, items, total, status)
            VALUES ($1, $2, $3, 'PENDING')
            RETURNING id
        """, order_data['user_id'], json.dumps(order_data['items']), order_data['total'])
        
        # 2. Write to outbox (same transaction — atomic!)
        await db.execute("""
            INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
            VALUES ('order', $1, 'ORDER_CREATED', $2)
        """, str(order_id), json.dumps({
            'order_id': str(order_id),
            'user_id': order_data['user_id'],
            'items': order_data['items'],
            'total': order_data['total'],
        }))
    
    return str(order_id)

# Separate process: poll outbox and publish
async def outbox_relay(db, kafka_producer):
    """Run as a separate service or background task"""
    while True:
        # Fetch unpublished events with lock
        events = await db.fetch("""
            SELECT * FROM outbox_events 
            WHERE published = FALSE
            ORDER BY created_at
            LIMIT 100
            FOR UPDATE SKIP LOCKED
        """)
        
        for event in events:
            # Publish to Kafka
            kafka_producer.send(
                topic=f"{event['aggregate_type']}-events",
                key=event['aggregate_id'],
                value=event['payload']
            )
            
            # Mark as published
            await db.execute("""
                UPDATE outbox_events 
                SET published = TRUE, published_at = NOW()
                WHERE id = $1
            """, event['id'])
        
        if not events:
            await asyncio.sleep(0.1)  # Short poll interval
```

---

## 3. Circuit Breaker Pattern

Prevent cascading failures when a downstream service is degraded:

```python
import time
from enum import Enum
from dataclasses import dataclass, field
from typing import Callable, TypeVar, Generic

T = TypeVar('T')

class CircuitState(Enum):
    CLOSED = "CLOSED"       # Normal operation
    OPEN = "OPEN"           # Failing fast
    HALF_OPEN = "HALF_OPEN" # Testing if service recovered

@dataclass
class CircuitBreakerConfig:
    failure_threshold: int = 5      # Failures before opening
    success_threshold: int = 2      # Successes to close from half-open
    timeout: float = 60.0           # Seconds before trying half-open
    
class CircuitBreaker:
    def __init__(self, name: str, config: CircuitBreakerConfig = None):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = 0.0
    
    async def call(self, func: Callable, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            # Check if timeout has passed
            if time.time() - self.last_failure_time > self.config.timeout:
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
            else:
                raise CircuitOpenError(f"Circuit {self.name} is OPEN")
        
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise
    
    def _on_success(self):
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.config.success_threshold:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
        elif self.state == CircuitState.CLOSED:
            self.failure_count = max(0, self.failure_count - 1)
    
    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.config.failure_threshold:
            self.state = CircuitState.OPEN

# Usage
payment_circuit = CircuitBreaker('payment-service', CircuitBreakerConfig(
    failure_threshold=3,
    timeout=30.0,
))

async def process_payment(order_id: str, amount: float):
    return await payment_circuit.call(
        payment_service_client.charge,
        order_id=order_id,
        amount=amount,
    )
```

---

## 4. Event Sourcing: Store Events, Derive State

Instead of storing current state, store the sequence of events that led to it:

```python
from dataclasses import dataclass
from datetime import datetime
from typing import List

@dataclass
class DomainEvent:
    event_id: str
    aggregate_id: str
    event_type: str
    payload: dict
    timestamp: datetime
    version: int

class OrderAggregate:
    def __init__(self):
        self.order_id: str = None
        self.status: str = None
        self.items: list = []
        self.total: float = 0
        self.version: int = 0
        self._uncommitted_events: List[DomainEvent] = []
    
    @classmethod
    def from_events(cls, events: List[DomainEvent]) -> 'OrderAggregate':
        """Rebuild state by replaying events"""
        order = cls()
        for event in events:
            order._apply(event)
        return order
    
    def _apply(self, event: DomainEvent):
        """Apply event to update state"""
        if event.event_type == 'ORDER_CREATED':
            self.order_id = event.aggregate_id
            self.items = event.payload['items']
            self.total = event.payload['total']
            self.status = 'PENDING'
        elif event.event_type == 'PAYMENT_APPROVED':
            self.status = 'PAYMENT_APPROVED'
        elif event.event_type == 'ORDER_COMPLETED':
            self.status = 'COMPLETED'
        elif event.event_type == 'ORDER_CANCELLED':
            self.status = 'CANCELLED'
        
        self.version = event.version
    
    def create(self, order_id: str, items: list, total: float):
        event = DomainEvent(
            event_id=generate_uuid(),
            aggregate_id=order_id,
            event_type='ORDER_CREATED',
            payload={'items': items, 'total': total},
            timestamp=datetime.utcnow(),
            version=self.version + 1,
        )
        self._raise_event(event)
    
    def _raise_event(self, event: DomainEvent):
        self._apply(event)
        self._uncommitted_events.append(event)
    
    def get_uncommitted_events(self) -> List[DomainEvent]:
        return self._uncommitted_events.copy()
    
    def mark_events_committed(self):
        self._uncommitted_events.clear()
```

---

## 5. CQRS: Command Query Responsibility Segregation

Separate your read models from write models for independent scaling:

```python
# Write side: Command handlers update the event store
class CreateOrderCommandHandler:
    def __init__(self, event_store, event_bus):
        self.event_store = event_store
        self.event_bus = event_bus
    
    async def handle(self, command: CreateOrderCommand):
        order = OrderAggregate()
        order.create(
            order_id=command.order_id,
            items=command.items,
            total=command.total,
        )
        
        # Save to event store
        await self.event_store.append(
            stream_id=f"order-{command.order_id}",
            events=order.get_uncommitted_events(),
            expected_version=0,
        )
        
        # Publish for read model projection
        for event in order.get_uncommitted_events():
            await self.event_bus.publish(event)
        
        order.mark_events_committed()

# Read side: Projections build optimized read models
class OrderSummaryProjection:
    def __init__(self, read_db):
        self.db = read_db
    
    async def on_order_created(self, event: DomainEvent):
        await self.db.execute("""
            INSERT INTO order_summaries 
            (order_id, status, total, item_count, created_at)
            VALUES ($1, 'PENDING', $2, $3, $4)
        """, event.aggregate_id, event.payload['total'],
            len(event.payload['items']), event.timestamp)
    
    async def on_order_completed(self, event: DomainEvent):
        await self.db.execute("""
            UPDATE order_summaries SET status = 'COMPLETED' 
            WHERE order_id = $1
        """, event.aggregate_id)

# Query side: Optimized read queries (different DB if needed!)
class OrderQueryService:
    def __init__(self, read_db):
        self.db = read_db
    
    async def get_user_orders(self, user_id: str, page: int = 1) -> list:
        return await self.db.fetch("""
            SELECT * FROM order_summaries
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 20 OFFSET $2
        """, user_id, (page - 1) * 20)
```

---

## Putting It Together: Production Checklist

When designing a distributed system, validate against these patterns:

| Problem | Pattern to Apply |
|---------|-----------------|
| Multi-service transaction | Saga (choreography or orchestration) |
| DB write + event publish atomically | Transactional Outbox |
| Downstream service instability | Circuit Breaker |
| Complex audit/history requirements | Event Sourcing |
| Read/write performance mismatch | CQRS |
| Duplicate message processing | Idempotency keys |
| Data consistency across services | Eventual consistency + compensation |

---

## Conclusion

These patterns aren't academic exercises — they're solutions to real problems that bite teams in production:

- **Sagas** eliminate the need for 2-phase commit
- **Outbox** ensures events are never lost even if your server crashes
- **Circuit breakers** prevent one slow service from taking down everything
- **Event sourcing + CQRS** give you an audit log and independent scaling

The key insight: in distributed systems, *assume failure*. Design for it. Use these patterns to make failure recoverable rather than catastrophic.

*What distributed systems patterns have you found most valuable? Share your experience in the comments!*
