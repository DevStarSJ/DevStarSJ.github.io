---
layout: post
title: "Durable Execution: How Temporal and Restate Are Changing Distributed Systems"
subtitle: "Escaping the complexity of sagas, compensations, and retry logic with durable execution engines"
date: 2026-05-13 12:00:00
author: "Seokjun Lee"
header-img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80"
header-mask: 0.4
catalog: true
tags:
  - Distributed Systems
  - Temporal
  - Restate
  - Workflow
  - Backend
---

Distributed systems have a dirty secret: most of the code isn't business logic. It's glue. Retry loops, idempotency keys, saga compensations, distributed locks, timeout handling — the machinery that makes workflows *reliable* dwarfs the code that makes them *useful*. **Durable execution** is a paradigm that promises to make this machinery invisible.

![Distributed Systems](https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80)
*Photo by [Alexandre Debiève](https://unsplash.com/@alexkixa) on Unsplash*

## The Problem: Everything Fails

Consider a simple e-commerce checkout:

1. Reserve inventory
2. Charge the customer
3. Send confirmation email
4. Update fulfillment system

What happens if step 3 fails after step 2 succeeds? What if the pod dies mid-execution? What if step 2 is called twice due to a network timeout and the customer gets charged twice?

The naive approach is a transaction, but these steps span multiple services, external APIs, and I/O boundaries — traditional ACID transactions don't apply. The standard solution is the **Saga pattern**: define compensating transactions for each step and roll back on failure.

```python
# Traditional saga implementation — just the skeleton
class CheckoutSaga:
    def execute(self, order_id: str):
        inventory_reserved = False
        payment_charged = False
        
        try:
            # Step 1
            self.inventory_service.reserve(order_id)
            inventory_reserved = True
            
            # Step 2
            payment_id = self.payment_service.charge(order_id)
            payment_charged = True
            
            # Step 3
            self.email_service.send_confirmation(order_id)
            
            # Step 4
            self.fulfillment_service.update(order_id)
            
        except Exception as e:
            # Compensations
            if payment_charged:
                self.payment_service.refund(payment_id)
            if inventory_reserved:
                self.inventory_service.release(order_id)
            raise
```

This is the *happy path* skeleton. The real implementation needs:
- Retry logic for transient failures
- Idempotency to avoid double-charges on retries
- Durable state so crashes don't lose progress
- Timeout handling for slow services
- Visibility into what's running

You end up with hundreds of lines of infrastructure code per workflow. And it still has bugs.

## Durable Execution: Write Normal Code, Get Reliability for Free

Durable execution engines like **Temporal** and **Restate** take a different approach: they intercept your function calls and make them durable automatically. Your code looks like sequential Python (or Go, TypeScript, Java), but under the hood, every step is checkpointed.

Here's the same checkout flow in Temporal:

```python
from temporalio import activity, workflow
from temporalio.client import Client
from temporalio.worker import Worker
from datetime import timedelta

@activity.defn
async def reserve_inventory(order_id: str) -> str:
    # Your normal service call here
    return await inventory_service.reserve(order_id)

@activity.defn
async def charge_payment(order_id: str) -> str:
    return await payment_service.charge(order_id)

@activity.defn
async def send_confirmation(order_id: str) -> None:
    await email_service.send(order_id)

@activity.defn
async def update_fulfillment(order_id: str) -> None:
    await fulfillment_service.update(order_id)

@workflow.defn
class CheckoutWorkflow:
    @workflow.run
    async def run(self, order_id: str) -> str:
        # Each activity is automatically:
        # - Retried on failure (with backoff)
        # - Idempotent (won't run twice)
        # - Checkpointed (crash-safe)
        reservation_id = await workflow.execute_activity(
            reserve_inventory,
            order_id,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        payment_id = await workflow.execute_activity(
            charge_payment,
            order_id,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        await workflow.execute_activity(
            send_confirmation,
            order_id,
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=RetryPolicy(maximum_attempts=5),
        )
        
        await workflow.execute_activity(
            update_fulfillment,
            order_id,
            start_to_close_timeout=timedelta(minutes=2),
        )
        
        return payment_id
```

If the worker pod crashes after `charge_payment` succeeds, Temporal will restart the workflow from `send_confirmation` — not from the beginning. The payment won't be charged twice. This is **event sourcing under the hood**: Temporal records every event, and replays the history to restore workflow state on recovery.

## Restate: The New Challenger

**Restate** (released 2024, matured through 2025) takes a similar approach but with some key differences:

1. **HTTP-native**: Workflows are just HTTP handlers with a special SDK. No separate worker process.
2. **Deterministic execution**: Uses a virtual thread model, not coroutines.
3. **Built-in key-value storage**: Each workflow/service gets durable, strongly-consistent K/V storage.
4. **Lower operational overhead**: Deploy as a sidecar or standalone server.

```typescript
// Restate example: same checkout flow
import * as restate from "@restatedev/restate-sdk";

const checkoutService = restate.workflow({
  name: "CheckoutWorkflow",
  handlers: {
    run: async (ctx: restate.WorkflowContext, orderId: string) => {
      // ctx.run() wraps any action as a durable step
      const reservationId = await ctx.run("reserve_inventory", async () => {
        return await inventoryClient.reserve(orderId);
      });

      const paymentId = await ctx.run("charge_payment", async () => {
        return await paymentClient.charge(orderId);
      });

      // Save intermediate state — durable, survives crashes
      await ctx.set("payment_id", paymentId);

      await ctx.run("send_confirmation", async () => {
        await emailClient.send(orderId, paymentId);
      });

      await ctx.run("update_fulfillment", async () => {
        await fulfillmentClient.update(orderId, reservationId);
      });

      return { paymentId, reservationId };
    },
    
    // Workflows can receive signals/queries
    getStatus: async (ctx: restate.WorkflowSharedContext, _: void) => {
      return await ctx.get<string>("payment_id") ?? "pending";
    }
  }
});
```

The key insight: `ctx.run()` journals the result of the closure. If the process crashes and restarts, Restate replays the journal — it won't call `paymentClient.charge()` again because the result is already recorded.

## How the Journal Works

Both Temporal and Restate use an **event-sourcing journal** under the hood:

```
Event 1: WorkflowStarted { input: "order-123" }
Event 2: ActivityScheduled { name: "reserve_inventory" }
Event 3: ActivityCompleted { result: "res-456" }
Event 4: ActivityScheduled { name: "charge_payment" }
Event 5: ActivityCompleted { result: "pay-789" }
-- CRASH --
Event 6: ActivityScheduled { name: "send_confirmation" }
-- REPLAY: Replay events 1-5, skip re-executing them, continue from event 6 --
```

On replay, the SDK intercepts your code's calls and returns the recorded results instead of executing them. Your code runs top-to-bottom as if nothing happened.

This is why **workflow code must be deterministic** — no random numbers, no `Date.now()`, no external reads outside of activities/`ctx.run()`. The SDK provides safe alternatives:

```python
# ❌ Wrong — non-deterministic
import random
delay = random.randint(1, 10)

# ✅ Correct — use workflow-safe API
delay = workflow.random().randint(1, 10)

# ❌ Wrong
now = datetime.now()

# ✅ Correct
now = workflow.now()
```

## Temporal vs Restate: Which to Choose?

| Dimension | Temporal | Restate |
|---|---|---|
| Maturity | Production-proven (since 2021) | Newer (2024+) |
| Language support | Go, Java, Python, TypeScript, .NET | TypeScript, Java, Go, Kotlin |
| Operational complexity | High (cluster to manage) | Low (single binary) |
| Temporal Workflows | Months to years supported | Shorter workflows more natural |
| Built-in storage | No (external DB) | Yes (embedded RocksDB) |
| Cloud offering | Temporal Cloud | Restate Cloud |
| Best for | Complex, long-running workflows | HTTP services needing durability |

## When Durable Execution Shines

Perfect use cases:

- **Payment processing** — never double-charge, never lose a transaction
- **Data pipelines** — resume from failure without reprocessing
- **AI agent workflows** — long-running LLM chains with tool calls
- **User onboarding flows** — multi-step processes that can span days
- **Reconciliation jobs** — idempotent, retryable batch operations
- **Distributed transactions** — saga pattern without the saga boilerplate

## Getting Started

```bash
# Temporal — start dev server
brew install temporal
temporal server start-dev

# Install SDK
pip install temporalio

# Restate — start server  
brew install restatedev/tap/restate-server
restate-server

# Install SDK
npm install @restatedev/restate-sdk
```

The developer experience for both is excellent — you get a local dev server with a full UI showing workflow history, state, and failure reasons.

![Temporal UI](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80)
*Photo by [Luke Chesser](https://unsplash.com/@lukechesser) on Unsplash*

## Conclusion

Durable execution is one of those paradigm shifts that, once understood, makes you wonder how you ever built distributed systems without it. The complexity of sagas, compensations, retry loops, and idempotency keys doesn't disappear — it moves into the runtime, where it can be thoroughly tested and maintained by specialists.

For new services handling complex multi-step workflows, the question is no longer *whether* to use durable execution, but *which engine* fits your operational maturity and language preferences. Temporal for complex, long-lived processes in mature organizations; Restate for teams wanting simpler operations with modern HTTP-native ergonomics.

---

*Related: [Multi-Agent Orchestration Frameworks in 2026](/2026/05/09/multi-agent-orchestration-frameworks-2026/)*
