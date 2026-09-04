---
layout: post
title: "Temporal: Durable Execution Workflows for Microservices — The Complete 2026 Guide"
subtitle: "Replace Fragile Async Code with Reliable, Scalable Workflow Orchestration Using Temporal"
date: 2026-03-24 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80"
header-mask: 0.4
catalog: true
tags:
  - Temporal
  - Microservices
  - Workflow Orchestration
  - Distributed Systems
  - Backend
  - Reliability
---

# Temporal: Durable Execution Workflows for Microservices — The Complete 2026 Guide

Every backend developer has written "async task" code: queues, retry logic, state machines, scheduled jobs. And every backend developer has debugged those systems at 3 AM when they fail in production. **Temporal** offers a fundamentally different approach: durable execution that makes workflow state persistent and failure transparent to the developer.

In 2026, Temporal has become the de facto standard for long-running business processes, sagas, and complex distributed workflows. This guide explains why and shows you how to use it.

![Circuit board representing distributed systems](https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80)
*Photo by [Alexandre Debiève](https://unsplash.com/@alexkixa) on Unsplash*

---

## The Problem Temporal Solves

Consider a typical e-commerce order flow:

```
1. Validate order
2. Charge credit card
3. Reserve inventory  
4. Notify fulfillment
5. Send confirmation email
6. Schedule delivery tracking
```

### The Naive Approach (Fragile)

```python
async def process_order(order_id: str):
    order = await validate_order(order_id)
    
    charge_id = await charge_card(order.payment_info)
    # 💥 Server crashes here!
    # charge_id is lost, order is in limbo
    # Did we charge the card? Did we not?
    
    await reserve_inventory(order.items)
    await notify_fulfillment(order)
    await send_confirmation(order.customer_email)
```

**What goes wrong:**
- Server crash → lost state, partial completion
- Network timeout → did the payment go through?
- Inventory service down → order is stuck
- Manual retries → duplicate charges!

### The Message Queue Approach (Complex)

```
Order Service → SQS → Payment Processor
                    → Inventory Service
                    → Fulfillment Service

Problems:
- Dead letter queues to manage
- Idempotency keys everywhere
- No clear view of overall flow
- Saga compensation logic is complex
- Debugging is a nightmare
```

### The Temporal Approach (Durable)

```python
@workflow.defn
class OrderWorkflow:
    @workflow.run
    async def run(self, order: Order) -> str:
        # This code is DURABLE. Server can crash anywhere,
        # and Temporal will resume from exact checkpoint.
        
        order = await workflow.execute_activity(
            validate_order,
            order,
            start_to_close_timeout=timedelta(seconds=30)
        )
        
        charge_id = await workflow.execute_activity(
            charge_card,
            order.payment_info,
            retry_policy=RetryPolicy(
                maximum_attempts=3,
                non_retryable_error_types=["InvalidCardError"]
            ),
            start_to_close_timeout=timedelta(seconds=30)
        )
        
        # Even if we crash here, Temporal knows charge_id
        # and will resume the workflow with it
        
        await workflow.execute_activity(
            reserve_inventory,
            ReserveRequest(order_id=order.id, items=order.items),
            start_to_close_timeout=timedelta(minutes=5)
        )
        
        # Run in parallel
        await asyncio.gather(
            workflow.execute_activity(
                notify_fulfillment, order,
                start_to_close_timeout=timedelta(minutes=1)
            ),
            workflow.execute_activity(
                send_confirmation, order.customer_email,
                start_to_close_timeout=timedelta(seconds=30)
            )
        )
        
        return charge_id
```

This code **looks like normal async Python** but is completely durable. Temporal persists every state transition, so crashes are transparent.

---

## Temporal Architecture

```
┌──────────────────────────────────────────────┐
│                 Temporal Server                │
│                                                │
│  ┌─────────────┐    ┌────────────────────┐    │
│  │   Frontend  │    │  History Service   │    │
│  │   Service   │    │  (Event Sourcing)  │    │
│  └──────┬──────┘    └────────────────────┘    │
│         │                    │                 │
│  ┌──────┴──────┐    ┌────────┴───────────┐    │
│  │  Matching   │    │    Persistence     │    │
│  │  Service    │    │  (Cassandra/SQL)   │    │
│  └─────────────┘    └────────────────────┘    │
└──────────────────────────────────────────────┘
         │                   │
         ▼                   ▼
┌─────────────────┐  ┌─────────────────┐
│  Worker Process │  │  Worker Process │
│                 │  │                 │
│  - Workflows    │  │  - Workflows    │
│  - Activities   │  │  - Activities   │
└─────────────────┘  └─────────────────┘
```

### How Durable Execution Works

Temporal uses **event sourcing** under the hood:

1. Every workflow state change is written as an **event** to the history
2. If a worker crashes, another worker **replays** the history to reconstruct state
3. Activities that already completed are **not re-executed** — their results are replayed from history
4. The workflow code is a **deterministic state machine**

```
Workflow History (simplified):
1. WorkflowExecutionStarted
2. ActivityTaskScheduled (validate_order)
3. ActivityTaskStarted
4. ActivityTaskCompleted → result: {order_id: "123", items: [...]}
5. ActivityTaskScheduled (charge_card)
6. ActivityTaskStarted
--- WORKER CRASH ---
--- NEW WORKER PICKS UP ---
7. Replay events 1-6 (no re-execution of completed activities)
8. ActivityTaskCompleted → result: charge_id: "ch_xyz"
9. Continue from here...
```

---

## Getting Started with Temporal

### Installation

```bash
# Start Temporal server locally
brew install temporal

temporal server start-dev

# Access Temporal UI: http://localhost:8233
```

### Python SDK

```bash
pip install temporalio
```

### TypeScript SDK

```bash
npm install @temporalio/client @temporalio/worker @temporalio/workflow @temporalio/activity
```

---

## Building a Complete Example: Payment Processing

### Define Activities

Activities are the individual units of work — they can fail, retry, and timeout independently:

```python
# activities.py
from temporalio import activity
from dataclasses import dataclass
import aiohttp
import logging

logger = logging.getLogger(__name__)

@dataclass
class ChargeRequest:
    order_id: str
    amount: int  # cents
    currency: str
    payment_method_id: str

@dataclass
class ChargeResult:
    charge_id: str
    status: str

class InvalidCardError(Exception):
    """Non-retryable: card declined or invalid"""
    pass

class PaymentTimeoutError(Exception):
    """Retryable: payment processor is slow"""
    pass

@activity.defn
async def validate_order(order_id: str) -> dict:
    """Validate order exists and can be processed"""
    activity.logger.info(f"Validating order: {order_id}")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(f"http://order-service/orders/{order_id}") as resp:
            if resp.status == 404:
                raise ValueError(f"Order {order_id} not found")
            return await resp.json()

@activity.defn
async def charge_card(request: ChargeRequest) -> ChargeResult:
    """Charge the customer's card"""
    # Heartbeating for long-running activities
    activity.heartbeat("Starting charge")
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                "http://payment-service/charges",
                json={
                    "amount": request.amount,
                    "currency": request.currency,
                    "payment_method": request.payment_method_id,
                    "idempotency_key": request.order_id  # Prevent duplicates!
                },
                timeout=aiohttp.ClientTimeout(total=25)
            ) as resp:
                data = await resp.json()
                
                if resp.status == 402:
                    raise InvalidCardError(f"Card declined: {data['message']}")
                
                if resp.status != 200:
                    raise PaymentTimeoutError(f"Payment failed: {resp.status}")
                
                activity.heartbeat("Charge completed")
                return ChargeResult(
                    charge_id=data["id"],
                    status=data["status"]
                )
        except aiohttp.ClientTimeoutError:
            raise PaymentTimeoutError("Payment service timeout")

@activity.defn
async def reserve_inventory(order_id: str, items: list[dict]) -> bool:
    """Reserve inventory for the order"""
    activity.logger.info(f"Reserving inventory for order: {order_id}")
    
    async with aiohttp.ClientSession() as session:
        async with session.post(
            "http://inventory-service/reservations",
            json={"order_id": order_id, "items": items}
        ) as resp:
            return resp.status == 201

@activity.defn
async def rollback_charge(charge_id: str, reason: str) -> None:
    """Compensation: refund the charge if workflow fails"""
    logger.info(f"Rolling back charge {charge_id}: {reason}")
    
    async with aiohttp.ClientSession() as session:
        await session.post(
            f"http://payment-service/charges/{charge_id}/refund",
            json={"reason": reason}
        )
```

### Define the Workflow

```python
# workflows.py
from temporalio import workflow
from temporalio.common import RetryPolicy
from datetime import timedelta
import asyncio
from activities import (
    validate_order, charge_card, reserve_inventory,
    rollback_charge, ChargeRequest
)

@workflow.defn
class OrderFulfillmentWorkflow:
    
    def __init__(self):
        self._status = "pending"
        self._charge_id: str | None = None
    
    @workflow.run
    async def run(self, order_id: str) -> dict:
        self._status = "validating"
        
        # Step 1: Validate order
        order = await workflow.execute_activity(
            validate_order,
            order_id,
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=RetryPolicy(maximum_attempts=3)
        )
        
        self._status = "charging"
        
        # Step 2: Charge card (with compensation on failure)
        try:
            charge_request = ChargeRequest(
                order_id=order_id,
                amount=order["total_cents"],
                currency=order["currency"],
                payment_method_id=order["payment_method_id"]
            )
            
            charge_result = await workflow.execute_activity(
                charge_card,
                charge_request,
                start_to_close_timeout=timedelta(seconds=60),
                heartbeat_timeout=timedelta(seconds=10),
                retry_policy=RetryPolicy(
                    initial_interval=timedelta(seconds=1),
                    maximum_interval=timedelta(seconds=30),
                    maximum_attempts=5,
                    non_retryable_error_types=["InvalidCardError"]
                )
            )
            self._charge_id = charge_result.charge_id
            
        except Exception as e:
            self._status = "failed"
            # No charge was made (or it was rejected), just fail
            raise
        
        self._status = "reserving_inventory"
        
        # Step 3: Reserve inventory (with compensation on failure)
        try:
            await workflow.execute_activity(
                reserve_inventory,
                order_id,
                order["items"],
                start_to_close_timeout=timedelta(minutes=5),
                retry_policy=RetryPolicy(maximum_attempts=5)
            )
        except Exception as e:
            self._status = "failed"
            # Compensate: refund the charge
            await workflow.execute_activity(
                rollback_charge,
                self._charge_id,
                f"Inventory reservation failed: {str(e)}",
                start_to_close_timeout=timedelta(seconds=30)
            )
            raise
        
        self._status = "completing"
        
        # Step 4: Send notifications (parallel, non-critical)
        await asyncio.gather(
            workflow.execute_activity(
                send_confirmation_email,
                order["customer_email"],
                start_to_close_timeout=timedelta(minutes=1),
                retry_policy=RetryPolicy(maximum_attempts=10)
            ),
            workflow.execute_activity(
                notify_fulfillment,
                order_id,
                start_to_close_timeout=timedelta(minutes=1),
            ),
            return_exceptions=True  # Don't fail if notifications fail
        )
        
        self._status = "completed"
        
        return {
            "order_id": order_id,
            "charge_id": self._charge_id,
            "status": "completed"
        }
    
    @workflow.query
    def get_status(self) -> str:
        """Query current workflow status without interrupting it"""
        return self._status
    
    @workflow.signal
    async def cancel_order(self) -> None:
        """Signal to cancel the order"""
        # Cancel logic here
        workflow.logger.info("Order cancellation requested")
```

### Start a Workflow

```python
# client.py
import asyncio
from temporalio.client import Client
from workflows import OrderFulfillmentWorkflow

async def main():
    client = await Client.connect("localhost:7233")
    
    # Start workflow
    handle = await client.start_workflow(
        OrderFulfillmentWorkflow.run,
        "order-12345",
        id="order-12345-fulfillment",     # Unique workflow ID (idempotent!)
        task_queue="order-processing",
        execution_timeout=timedelta(hours=24)
    )
    
    print(f"Started workflow: {handle.id}")
    
    # Query status (non-blocking)
    status = await handle.query(OrderFulfillmentWorkflow.get_status)
    print(f"Current status: {status}")
    
    # Wait for result
    result = await handle.result()
    print(f"Completed: {result}")

asyncio.run(main())
```

### Run the Worker

```python
# worker.py
import asyncio
from temporalio.client import Client
from temporalio.worker import Worker
from workflows import OrderFulfillmentWorkflow
from activities import validate_order, charge_card, reserve_inventory, rollback_charge

async def main():
    client = await Client.connect("localhost:7233")
    
    worker = Worker(
        client,
        task_queue="order-processing",
        workflows=[OrderFulfillmentWorkflow],
        activities=[
            validate_order,
            charge_card,
            reserve_inventory,
            rollback_charge,
        ]
    )
    
    print("Worker started")
    await worker.run()

asyncio.run(main())
```

---

## Advanced Patterns

### Scheduled Workflows (Cron Jobs with State)

```python
# Schedule a workflow to run every day at 9 AM UTC
handle = await client.create_schedule(
    "daily-report-schedule",
    Schedule(
        action=ScheduleActionStartWorkflow(
            DailyReportWorkflow.run,
            id="daily-report-{scheduledTime}",
            task_queue="reports",
        ),
        spec=ScheduleSpec(
            cron_expressions=["0 9 * * *"],  # Daily at 9 AM UTC
        ),
    ),
)
```

### Child Workflows

```python
@workflow.defn
class OrderBatchWorkflow:
    @workflow.run
    async def run(self, order_ids: list[str]) -> list[str]:
        # Process orders in parallel, max 10 concurrent
        semaphore = asyncio.Semaphore(10)
        
        async def process_one(order_id: str) -> str:
            async with semaphore:
                return await workflow.execute_child_workflow(
                    OrderFulfillmentWorkflow.run,
                    order_id,
                    id=f"order-{order_id}-fulfillment"
                )
        
        results = await asyncio.gather(
            *[process_one(order_id) for order_id in order_ids],
            return_exceptions=True
        )
        
        successful = [r for r in results if not isinstance(r, Exception)]
        return successful
```

### Human-in-the-Loop Workflows

```python
@workflow.defn
class ExpenseApprovalWorkflow:
    def __init__(self):
        self._approved: bool | None = None
    
    @workflow.run
    async def run(self, expense: Expense) -> str:
        # Notify approver
        await workflow.execute_activity(
            send_approval_request,
            expense,
            start_to_close_timeout=timedelta(seconds=30)
        )
        
        # Wait for human to approve/reject (up to 7 days!)
        try:
            await workflow.wait_condition(
                lambda: self._approved is not None,
                timeout=timedelta(days=7)
            )
        except asyncio.TimeoutError:
            await workflow.execute_activity(
                send_timeout_notification,
                expense.id
            )
            return "timed_out"
        
        if self._approved:
            await workflow.execute_activity(
                process_expense_payment, expense
            )
            return "approved"
        else:
            return "rejected"
    
    @workflow.signal
    async def approve(self) -> None:
        self._approved = True
    
    @workflow.signal
    async def reject(self) -> None:
        self._approved = False
```

---

## Observability

### Workflow UI

The Temporal Web UI at `localhost:8233` provides:
- Full workflow execution history
- Event timeline visualization
- Query execution
- Search by workflow type, status, time range

### Metrics Integration

```yaml
# temporal-config.yaml
metrics:
  prometheus:
    framework:
      listenAddress: "0.0.0.0:9090"
```

Key metrics to monitor:
```
# Workflow metrics
temporal_workflow_active_count          # Active workflows
temporal_workflow_failed_count          # Failed workflows
temporal_workflow_execution_time        # Execution time histogram

# Activity metrics
temporal_activity_succeed_count         # Successful activities
temporal_activity_failed_count          # Failed activities
temporal_activity_schedule_to_start_latency  # Queue wait time
```

---

## When to Use Temporal

✅ **Use Temporal for:**
- Multi-step business processes (orders, subscriptions, onboarding)
- Long-running workflows (days to months)
- Saga patterns for distributed transactions
- Scheduled recurring tasks with state
- Human approval workflows
- Any async workflow where correctness matters

❌ **Don't use Temporal for:**
- Simple one-off async tasks (use a queue)
- High-frequency events (>10K/sec per workflow type)
- Stream processing (use Kafka/Flink)
- Real-time data pipelines (sub-second latency needs)

---

## Temporal Cloud vs Self-Hosted

| | Temporal Cloud | Self-Hosted |
|-|----------------|-------------|
| Setup | Minutes | Days-weeks |
| Operational burden | None | High (Cassandra + Temporal) |
| Cost | Usage-based (~$25/month base) | Infrastructure costs |
| SLA | 99.99% | Your responsibility |
| Data sovereignty | Cloud (SOC2, HIPAA) | Full control |
| Best for | Most teams | Large enterprises, strict compliance |

---

## Conclusion

Temporal fundamentally changes how you think about distributed systems reliability. Instead of designing your code to handle partial failures, crashes, and retries — Temporal handles all of that for you. Your workflow code becomes declarative and readable.

The key principles to take away:
1. **Workflows are durable** — treat them as if they never fail
2. **Activities are where failures happen** — configure retry policies carefully
3. **Idempotency keys** in activities prevent duplicate side effects
4. **Compensation activities** implement saga rollback patterns
5. **Signals and queries** provide real-time workflow control and visibility

Temporal has become essential infrastructure for any team building reliable microservices in 2026. If you're still managing complex async state with queues and database flags, it's time to level up.

---

*Tags: #Temporal #Microservices #WorkflowOrchestration #DistributedSystems #Reliability #Python #TypeScript #SagaPattern*
