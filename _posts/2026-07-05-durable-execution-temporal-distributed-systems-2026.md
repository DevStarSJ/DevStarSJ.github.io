---
layout: post
title: "Durable Execution: The Pattern That Fixes Distributed Systems"
subtitle: "Why Temporal, Restate, and Hatchet are solving the hardest problem in backend engineering"
date: 2026-07-05 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80"
catalog: true
tags:
  - DistributedSystems
  - Architecture
  - Temporal
  - Backend
  - Reliability
---

# Durable Execution: The Pattern That Fixes Distributed Systems

Here's a scenario every backend engineer has faced:

You write a function that charges a credit card, creates an order, sends a confirmation email, and updates inventory. Halfway through, the server crashes. Now you have a charged card but no order. Or an order but no email. Or some combination of partial state across four systems that doesn't correspond to anything valid in your business model.

You add retry logic. Now sometimes the card gets charged twice. You add idempotency keys. Now the code is 3x longer and still has edge cases. You read about sagas and two-phase commits. You spend a week, ship something that mostly works, and live with the lingering anxiety that some failure mode you didn't think of is silently creating bad data in production.

**Durable execution** is the pattern that makes this problem tractable. Temporal is its most prominent implementation, and in 2026 the ecosystem has expanded significantly.

![Workflow execution diagram](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&q=80)

*Photo by Luke Chesser on Unsplash*

---

## What Durable Execution Means

The core guarantee: **your code executes to completion, exactly once, regardless of failures.**

Process crashes, network partitions, timeouts — the execution engine records progress and resumes from where it left off. From the developer's perspective, you write straight-line code. The platform provides the durability.

This is not the same as:
- **Message queues** — queues deliver messages; they don't track multi-step execution state
- **Saga orchestrators** — sagas handle compensation; durable execution prevents the need for compensation
- **Workflow engines (Airflow/Prefect)** — data pipeline schedulers, not general-purpose application logic frameworks

---

## Temporal: The Canonical Implementation

[Temporal](https://temporal.io) is the most mature durable execution platform. Originally Cadence at Uber, open-sourced and productized. Its model:

- **Workflows:** Ordinary code that runs durably. Can sleep for days, wait for external events, execute arbitrary business logic.
- **Activities:** Individual units of work that interact with the outside world (API calls, database writes). Retried automatically on failure.
- **Workers:** Your application code that hosts and executes workflows and activities.
- **Temporal Server:** Records execution history; coordinates workers.

```typescript
// Temporal workflow — looks like normal TypeScript
import { workflow, activity, proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from './activities';

const { chargePayment, createOrder, sendConfirmationEmail, updateInventory } = 
  proxyActivities<typeof activities>({
    startToCloseTimeout: '30 seconds',
    retry: {
      maximumAttempts: 3,
      backoffCoefficient: 2,
    }
  });

export async function processOrderWorkflow(input: OrderInput): Promise<OrderResult> {
  // Each activity is automatically retried if it fails
  // If the process crashes after chargePayment but before createOrder,
  // execution resumes from createOrder — chargePayment is NOT re-executed
  
  const paymentId = await chargePayment({
    userId: input.userId,
    amount: input.amount,
    currency: input.currency,
  });

  const orderId = await createOrder({
    userId: input.userId,
    items: input.items,
    paymentId,
  });

  // Send email async — if this fails, the workflow retries just the email step
  await sendConfirmationEmail({
    email: input.userEmail,
    orderId,
  });

  await updateInventory(input.items);

  return { orderId, paymentId };
}
```

```typescript
// activities.ts — the actual I/O operations
export async function chargePayment(params: ChargeParams): Promise<string> {
  const result = await stripeClient.charges.create({
    amount: params.amount,
    currency: params.currency,
    customer: params.userId,
    idempotencyKey: `charge-${workflow.workflowInfo().workflowId}`, // ← Safe!
  });
  return result.id;
}
```

The workflow function is recorded step-by-step. Temporal replays the history when resuming, skipping already-completed steps. This is the event sourcing pattern applied to code execution.

---

## The Execution Model: Event Sourcing for Code

Under the hood, Temporal maintains an **event history** for each workflow:

```
WorkflowExecutionStarted
ActivityTaskScheduled (chargePayment)
ActivityTaskCompleted (paymentId: "ch_xxx")
ActivityTaskScheduled (createOrder)
ActivityTaskCompleted (orderId: "ord_123")
[CRASH HERE]
```

On recovery, Temporal replays the history. When the replay reaches `chargePayment`, it sees the recorded completion and returns `"ch_xxx"` without re-executing. When it reaches `createOrder`, same thing. When it reaches `sendConfirmationEmail` (which never completed), it executes for real.

This explains the **determinism requirement**: workflow code must be deterministic. No `Math.random()`, no `Date.now()`, no non-deterministic library calls. Use workflow-provided utilities (`workflow.sleep()`, `workflow.now()`) instead of their native equivalents.

---

## Long-Running Workflows

The killer feature is time. Workflows can span days, months, or years:

```python
# Python workflow — subscription lifecycle management
@workflow.defn
class SubscriptionWorkflow:
    @workflow.run
    async def run(self, user_id: str) -> None:
        # Trial period: 14 days
        await workflow.sleep(timedelta(days=14))
        
        # Check if user converted
        is_paying = await workflow.execute_activity(
            check_subscription_status,
            user_id,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        if not is_paying:
            await workflow.execute_activity(
                send_trial_expiry_email,
                user_id,
                start_to_close_timeout=timedelta(minutes=5),
            )
            return
        
        # Monthly billing cycle — runs indefinitely
        while True:
            await workflow.sleep(timedelta(days=30))
            
            result = await workflow.execute_activity(
                process_monthly_billing,
                user_id,
                start_to_close_timeout=timedelta(minutes=5),
                retry_policy=RetryPolicy(maximum_attempts=10),
            )
            
            if result.subscription_cancelled:
                break
```

This workflow handles a complete subscription lifecycle: trial, conversion check, recurring billing. It runs for the lifetime of the subscription. No cron jobs, no database polling, no state machines to manage manually.

The server process running this workflow can restart 50 times over two years. The workflow continues from exactly where it left off each time.

---

## Signals and Queries: External Interaction

Workflows aren't isolated. They can receive **signals** (external events that trigger code) and respond to **queries** (read-only state inspection):

```go
// Temporal Go workflow with signals
func ApprovalWorkflow(ctx workflow.Context, request ApprovalRequest) error {
    // Create a channel to receive the approval signal
    approvalCh := workflow.GetSignalChannel(ctx, "approval-decision")
    
    // Notify approver
    workflow.ExecuteActivity(ctx, SendApprovalRequestEmail, request)
    
    // Wait up to 7 days for approval
    ctx, cancel := workflow.WithTimeout(ctx, 7*24*time.Hour)
    defer cancel()
    
    var decision ApprovalDecision
    if !approvalCh.Receive(ctx, &decision) {
        // Timeout: auto-reject
        workflow.ExecuteActivity(ctx, NotifyRejection, request, "timeout")
        return nil
    }
    
    if decision.Approved {
        workflow.ExecuteActivity(ctx, ProcessApprovedRequest, request)
    } else {
        workflow.ExecuteActivity(ctx, NotifyRejection, request, decision.Reason)
    }
    
    return nil
}
```

```go
// Send a signal from your HTTP handler
err := temporalClient.SignalWorkflow(ctx, workflowID, "", "approval-decision", ApprovalDecision{
    Approved: true,
    ReviewerID: reviewerID,
})
```

The workflow blocks on `approvalCh.Receive` — not polling, not querying a database — and resumes when the signal arrives. If the process crashes while waiting, it resumes waiting after recovery.

---

## Alternatives to Temporal

### Restate

[Restate](https://restate.dev) takes a different approach: durable execution embedded in your HTTP service. Instead of separate workers connecting to a Temporal server, Restate's server calls your HTTP endpoints and provides durability transparently.

```typescript
// Restate — runs as a regular HTTP service
const orderService = restate.service({
  name: "OrderService",
  handlers: {
    processOrder: async (ctx: restate.Context, order: Order) => {
      // ctx.run() makes this block durable — won't re-execute after a crash
      const paymentId = await ctx.run("charge-payment", () =>
        chargePayment(order)
      );

      const orderId = await ctx.run("create-order", () =>
        createOrder(order, paymentId)
      );

      // Sleep durably — process can crash, resumes after interval
      await ctx.sleep(5000);

      await ctx.run("send-email", () =>
        sendConfirmationEmail(order.email, orderId)
      );

      return { orderId, paymentId };
    }
  }
});
```

Restate's appeal: lower operational overhead than Temporal (one server vs. Temporal's cluster), and simpler mental model (HTTP in, HTTP out).

### Hatchet

[Hatchet](https://hatchet.run) is the newcomer — a modern, developer-friendly durable task queue with a clean Python/TypeScript SDK and good observability out of the box. Less powerful than Temporal but faster to get started.

```python
@hatchet.workflow(on_events=["order:create"])
class OrderWorkflow:
    @hatchet.step()
    async def charge_payment(self, context: Context) -> dict:
        order = context.workflow_input()
        payment_id = await charge_stripe(order)
        return {"payment_id": payment_id}
    
    @hatchet.step(parents=["charge_payment"])
    async def create_order(self, context: Context) -> dict:
        payment = context.step_output("charge_payment")
        order_id = await create_db_order(payment["payment_id"])
        return {"order_id": order_id}
```

---

## When to Use Durable Execution

**Strong fit:**
- Multi-step processes with external I/O at each step
- Business processes that span hours/days (approvals, onboarding, billing cycles)
- Any workflow where partial completion creates invalid state
- High-value transactions where exactly-once semantics matter

**Weak fit:**
- Simple request-response APIs with no multi-step orchestration
- Pure compute (no external I/O)
- Real-time low-latency paths (Temporal adds ~5-50ms overhead per activity)

**Anti-pattern:** Don't use durable execution as a general-purpose job queue for simple tasks. Its power is in orchestrating complex multi-step processes.

---

## Operational Reality

Temporal's self-hosted setup requires Cassandra or PostgreSQL for persistence and Elasticsearch for visibility. It's not trivial to operate. Temporal Cloud (managed) eliminates this at the cost of vendor dependency and per-workflow pricing.

For teams new to Temporal, start with Temporal Cloud's developer tier. Understand the programming model before committing to self-hosted operations.

The mental shift is significant: thinking in workflows and activities rather than functions and services. Budget time for your team to internalize the determinism constraints and replay semantics before deploying to production.

The payoff is real. Systems that would have required elaborate error handling, compensating transactions, and dead-letter queue monitoring become straightforward sequential code. The reliability improvement is genuine, and the debugging experience (Temporal's Web UI shows the complete execution history of every workflow) is better than anything available for queue-based systems.

Durable execution is one of those patterns that, once you've used it for a real problem, makes you unwilling to go back.
