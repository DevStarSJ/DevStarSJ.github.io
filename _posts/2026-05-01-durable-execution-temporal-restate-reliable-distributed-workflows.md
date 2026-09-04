---
layout: post
title: "Durable Execution: The Pattern That Makes Distributed Systems Reliable by Default"
subtitle: "Why Temporal, Restate, and their peers are rewriting how we think about distributed workflows — and why you should care"
date: 2026-05-01 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1545987796-200677ee1011?w=1600&auto=format&fit=crop"
catalog: true
categories:
  - Architecture
  - Distributed Systems
tags:
  - Durable Execution
  - Temporal
  - Restate
  - Distributed Systems
  - Workflows
  - Reliability
---

Here's a scenario every backend engineer has lived through: you write a workflow that calls three external services, processes some data, and updates a database. It works great in staging. In production, it fails on the second service call at 2 AM, leaves the system in a half-finished state, your on-call engineer spends two hours figuring out what happened, and you spend the next week writing idempotency logic, retry handlers, and compensating transactions you should never have needed.

Durable execution exists to make this problem disappear.

![Distributed Systems Architecture](https://images.unsplash.com/photo-1545987796-200677ee1011?w=1200&auto=format&fit=crop)
*Photo by Umberto on Unsplash*

## What Is Durable Execution?

Durable execution is a programming model where your code's execution state is automatically persisted to durable storage. If your process crashes, is killed by a scheduler, or the network drops, the execution resumes from exactly where it left off — not from the beginning.

The key insight: **treat workflow execution history as the source of truth**, not application state.

Think of it as if every `await` in your async function automatically checkpointed its state to a database. Your code looks normal, but the runtime makes it crash-proof.

## The Core Problem It Solves

Traditional approaches to distributed reliability are painful:

```python
# The naive approach — don't do this
def process_order(order_id: str):
    payment = charge_customer(order_id)      # What if this crashes?
    inventory = reserve_inventory(order_id)  # Or this?
    notification = send_confirmation(order_id)  # Or this?
    return {"payment": payment, "inventory": inventory}
```

When this fails mid-way, you have partial state. To fix it you need:
- Idempotency keys on every external call
- A state machine in a database tracking progress
- Retry logic with exponential backoff
- Compensating transactions for rollback
- Dead letter queues for failures
- Monitoring and alerting for stuck workflows

That's an enormous amount of plumbing for what should be simple business logic.

## The Durable Execution Model

With a durable execution runtime (let's use Temporal as an example):

```python
# Temporal workflow — looks almost identical, behaves very differently
@workflow.defn
class ProcessOrderWorkflow:
    @workflow.run
    async def run(self, order_id: str):
        payment = await workflow.execute_activity(
            charge_customer,
            order_id,
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=RetryPolicy(maximum_attempts=3)
        )
        
        inventory = await workflow.execute_activity(
            reserve_inventory,
            order_id,
            start_to_close_timeout=timedelta(seconds=30)
        )
        
        await workflow.execute_activity(
            send_confirmation,
            order_id
        )
        
        return {"payment": payment, "inventory": inventory}
```

The difference: if the process crashes after `charge_customer` succeeds but before `reserve_inventory` starts, the workflow **resumes from that exact point** when the worker restarts. `charge_customer` is not called again. No duplicate charges. No corruption.

## How It Works Under the Hood

The magic is **event sourcing + deterministic replay**:

```
Workflow execution history (stored in Temporal server):
[
  { type: "WORKFLOW_STARTED", input: { order_id: "123" } },
  { type: "ACTIVITY_SCHEDULED", activity: "charge_customer" },
  { type: "ACTIVITY_COMPLETED", result: { charge_id: "ch_abc" } },
  // <- Crash happened here
]
```

When a worker restarts:
1. It fetches the history from the Temporal server
2. It **replays** your code, but **short-circuits** completed steps using the history
3. Execution continues from the first unrecorded point

Your code executes "as if" it never crashed. The replay is deterministic because the runtime intercepts all non-deterministic operations (time, random, external calls) and replays them from history.

This means you must write **deterministic workflow code**:
```python
# ❌ Bad — uses real time, non-deterministic
import datetime
current_time = datetime.datetime.now()

# ✅ Good — uses workflow time (replayed from history)
current_time = workflow.now()
```

## The Landscape in 2026

### Temporal

The pioneer and still the leader in enterprise adoption. Originally created by ex-Uber engineers who built Cadence (Uber's internal workflow engine). Strong Go and Java SDKs, growing Python and TypeScript support.

**Strengths:** Battle-tested at massive scale, rich ecosystem, strong community
**Tradeoffs:** Operational complexity of running the Temporal server, learning curve

### Restate

The newcomer making waves with a radically simpler developer experience. Restate uses HTTP and gRPC rather than a custom protocol, and its SDKs feel more like writing normal code:

```typescript
// Restate — feels very natural
const orderWorkflow = restate.workflow({
  name: "OrderWorkflow",
  handlers: {
    run: async (ctx: restate.WorkflowContext, orderId: string) => {
      const payment = await ctx.run(() => chargeCustomer(orderId));
      const inventory = await ctx.run(() => reserveInventory(orderId));
      await ctx.run(() => sendConfirmation(orderId));
      return { payment, inventory };
    }
  }
});
```

**Strengths:** Simpler mental model, lighter operational footprint, cloud-native from day one
**Tradeoffs:** Younger ecosystem, smaller community

### AWS Step Functions

The managed cloud option. No infrastructure to run, deep AWS integration, but locked into AWS and the visual/YAML workflow definition style feels limiting compared to code-first alternatives.

### Inngest

Targeting the serverless/edge use case specifically. Deploys as background functions on Vercel, Cloudflare Workers, etc. No infrastructure needed — events flow through Inngest's cloud.

![Workflow Engine Comparison](https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=1200&auto=format&fit=crop)
*Photo by Christopher Burns on Unsplash*

## When to Use Durable Execution

Durable execution shines when you have **long-running**, **multi-step** operations that cross service boundaries:

**Perfect use cases:**
- Order fulfillment pipelines
- Payment processing workflows
- Document processing pipelines (ingest → parse → analyze → notify)
- User onboarding flows
- CI/CD pipeline orchestration
- ML training job management
- Scheduled/recurring business processes

**Less appropriate for:**
- Simple CRUD with no multi-step logic
- Real-time low-latency operations (< 100ms)
- Pure data streaming (use Kafka/Flink instead)

## Real-World Impact

Teams that adopt durable execution consistently report:

- **Massive reduction in reliability incidents** — the "stuck workflow" class of bugs essentially disappears
- **Simpler code** — business logic is no longer tangled with retry/error handling boilerplate  
- **Better observability** — execution history is inspectable, searchable, and replayable for debugging
- **Faster incident response** — you can see exactly what happened and where a workflow stalled

One team I know of replaced a 3,000-line saga implementation (with its own state machine, retry logic, and compensating transactions) with 300 lines of Temporal workflow code. Bugs that had been in production for months were eliminated.

## Getting Started: Temporal in 5 Minutes

```bash
# Start Temporal development server
brew install temporal
temporal server start-dev

# In another terminal, run your first workflow
git clone https://github.com/temporalio/samples-python
cd samples-python
pip install temporalio
python hello_activity/run_workflow.py
```

Visit http://localhost:8233 to see your workflow execution in the Temporal UI — complete with timeline, input/output, and replay capability.

## The Bigger Picture

Durable execution is the distributed systems equivalent of garbage collection: it takes a hard, manual problem and makes it automatic. Just as GC didn't make memory *unlimited* but made memory *management* invisible, durable execution doesn't make distributed systems *simple* but makes distributed *reliability* automatic.

As more applications run across multiple services, clouds, and environments, the complexity of coordination failures grows superlinearly. Durable execution is one of the clearest architectural responses to this problem that's emerged in recent years.

If you're building workflows today without it, you're probably writing infrastructure code that belongs in a library. Worth rethinking.

---

*Building with Temporal or Restate? I'd love to hear about your experience — especially the pain points. Hit me up in the comments.*
