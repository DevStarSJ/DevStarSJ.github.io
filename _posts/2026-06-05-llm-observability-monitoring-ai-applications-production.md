---
layout: post
title: "LLM Observability: How to Monitor AI Applications in Production"
subtitle: "Traces, evals, and cost tracking for language model-powered systems"
date: 2026-06-05 12:00:00
author: "Groot"
header-img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop"
header-mask: 0.4
catalog: true
tags:
  - LLM
  - Observability
  - MLOps
  - AI
  - Monitoring
---

## Why LLM Observability Is Different

Traditional application monitoring is deterministic: a function takes inputs, produces outputs, and you measure latency, error rate, and throughput. LLMs break every assumption:

- **Non-deterministic** — the same prompt can produce different outputs
- **Quality is subjective** — a "correct" response is hard to define programmatically  
- **Cost scales with usage** — token consumption directly drives your bill
- **Failure modes are subtle** — an LLM might return a plausible-sounding wrong answer

This demands a new observability discipline. In 2026, **LLM observability** is as important as application performance monitoring was in 2016.

![Monitoring Dashboard](https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&auto=format&fit=crop)
*Photo by Carlos Muza on Unsplash*

## The Four Pillars of LLM Observability

### 1. Traces

LLM traces capture the full execution context of a request: every prompt, every model call, every tool invocation, and every response — in a hierarchical span structure.

A typical agentic trace looks like:

```
user_request [2.3s]
├── retrieve_context [0.4s]
│   └── vector_search: "customer refund policy"
├── llm_call [1.6s]
│   ├── model: gpt-4o
│   ├── input_tokens: 1842
│   ├── output_tokens: 312
│   └── latency_p50: 1.2s
└── format_response [0.1s]
```

Tools like **LangSmith**, **Langfuse**, **Helicone**, **Arize Phoenix**, and **OpenTelemetry LLM conventions** all provide tracing with varying levels of LLM-specific semantics.

```python
# OpenTelemetry with semantic conventions for LLMs
from opentelemetry import trace
from opentelemetry.semconv.ai import SpanAttributes

tracer = trace.get_tracer("my-llm-app")

with tracer.start_as_current_span("llm.chat") as span:
    span.set_attribute(SpanAttributes.LLM_SYSTEM, "openai")
    span.set_attribute(SpanAttributes.LLM_REQUEST_MODEL, "gpt-4o")
    span.set_attribute(SpanAttributes.LLM_REQUEST_MAX_TOKENS, 1024)
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=1024
    )
    
    span.set_attribute(
        SpanAttributes.LLM_USAGE_PROMPT_TOKENS,
        response.usage.prompt_tokens
    )
    span.set_attribute(
        SpanAttributes.LLM_USAGE_COMPLETION_TOKENS,
        response.usage.completion_tokens
    )
```

### 2. Evaluations (Evals)

Evals are the unit tests of LLM systems. Instead of checking exact output equality, they assess quality dimensions:

| Eval Type | What It Checks | Method |
|---|---|---|
| **Correctness** | Is the answer factually right? | LLM-as-judge or human labels |
| **Groundedness** | Is the answer supported by context? | Entailment model |
| **Relevance** | Does it answer the actual question? | Embedding similarity |
| **Toxicity** | Is content harmful? | Classifier |
| **Latency** | Is it fast enough? | Percentile metrics |

```python
# Using LangSmith evaluators
from langsmith import evaluate
from langsmith.evaluation import LangChainStringEvaluator

results = evaluate(
    my_rag_pipeline,
    data="my-test-dataset",
    evaluators=[
        LangChainStringEvaluator("correctness"),
        LangChainStringEvaluator("conciseness"),
        LangChainStringEvaluator("relevance"),
    ],
    experiment_prefix="rag-v2-test",
)
```

Run evals:
1. **During CI/CD** — regression-test before shipping prompt changes
2. **Continuously in production** — sample ~1% of live traffic for ongoing quality
3. **After incidents** — diagnose why quality degraded

### 3. Cost Tracking

Token costs accumulate fast. A 10M token/day system at $15/1M input tokens = **$150/day = $54K/year**. Observability must track cost by:

- **Model** — GPT-4o vs Claude 3.5 Haiku pricing varies 10x
- **Feature** — which product features are expensive?
- **User cohort** — are power users disproportionately costly?
- **Prompt template** — which prompt uses the most tokens?

```python
# Cost tracking middleware
def track_llm_cost(response, model: str):
    COST_PER_1K = {
        "gpt-4o": {"input": 0.0025, "output": 0.01},
        "claude-3-5-haiku": {"input": 0.0008, "output": 0.004},
    }
    
    pricing = COST_PER_1K.get(model, {"input": 0, "output": 0})
    cost = (
        response.usage.prompt_tokens / 1000 * pricing["input"] +
        response.usage.completion_tokens / 1000 * pricing["output"]
    )
    
    metrics.increment("llm.cost.usd", cost, tags={"model": model})
    return cost
```

### 4. User Feedback Loops

Ground truth is rare and precious. Capture it wherever possible:

- **Thumbs up/down** — simple signal, easy to add
- **Edit distance** — did the user significantly rewrite the output? (negative signal)
- **Copy events** — did the user copy the response? (positive signal)
- **Task completion** — did they achieve their goal after the AI response?

Feed this data back into your eval datasets to continuously improve.

## The LLM Observability Stack in 2026

```
┌─────────────────────────────────────────────┐
│           LLM Application                   │
│  (LangChain / LlamaIndex / custom)          │
└──────────────┬──────────────────────────────┘
               │ OpenTelemetry traces + metrics
               ▼
┌─────────────────────────────────────────────┐
│         Observability Platform              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Langfuse │  │  Arize   │  │ Datadog  │  │
│  │(open src)│  │ Phoenix  │  │ LLM Obs  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└──────────────┬──────────────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
Evaluation              Alerting
(offline + online)   (quality regression,
                      cost spikes, latency)
```

## Key Metrics to Alert On

| Metric | Alert Threshold Example |
|---|---|
| P95 latency | > 5 seconds |
| Error rate | > 1% of requests |
| Groundedness score | < 0.8 rolling 1h avg |
| Cost per request | > $0.05 (2x baseline) |
| Token refusal rate | > 0.5% |

## Practical Quick Wins

1. **Add a request ID to every LLM call** — you'll thank yourself at 2am during an incident
2. **Log the full prompt, not just the response** — most quality issues live in the prompt
3. **Track prompt version** — treat prompts like code, version them
4. **Set spend alerts** — cloud LLM bills can spike unexpectedly
5. **Sample 1% for manual review** — nothing beats a human reading actual outputs

## Conclusion

LLM observability is not optional for production AI systems. The unique failure modes of language models demand specialized tooling beyond what traditional APM provides. Start with tracing, add evals for your key quality dimensions, and watch your costs. The platforms are mature in 2026 — there's no excuse for flying blind.

**Resources:**
- [Langfuse (open source)](https://langfuse.com)
- [OpenTelemetry GenAI Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [RAGAS - RAG Evaluation Framework](https://docs.ragas.io)
