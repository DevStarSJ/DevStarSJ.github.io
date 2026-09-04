---
layout: post
title: "Observability in the Age of AI: How OpenTelemetry is Evolving for LLM Applications"
subtitle: "Tracing, metrics, and logging patterns for AI-powered services — and why the old observability playbook doesn't fully apply"
date: 2026-05-23 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - Observability
  - OpenTelemetry
  - LLM
  - AI Engineering
  - Monitoring
  - DevOps
categories: ai
---

# Observability in the Age of AI: How OpenTelemetry is Evolving for LLM Applications

Traditional observability was built on a simple contract: deterministic systems produce predictable outputs from defined inputs, and deviations from expectations indicate bugs. Your p99 latency spiked? Find the slow query. Your error rate went up? Find the exception.

AI-powered applications break this contract. The same prompt, called twice, produces different outputs. "Correctness" is fuzzy. A response can be technically successful (200 OK, valid JSON, no exception) and still be wrong — the model hallucinated, gave outdated information, or misunderstood the intent.

Observability for AI requires new primitives. This post covers what's changed and how to instrument your LLM applications effectively.

![Observability Monitoring Dashboard](https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1000&auto=format&fit=crop)
*Photo by Carlos Muza on Unsplash*

---

## OpenTelemetry Semantic Conventions for LLMs

The OpenTelemetry project has shipped stable semantic conventions for GenAI (LLM) instrumentation as of the `gen_ai` semantic convention group in OTel 1.26+. If you're adding tracing to AI calls, use these conventions rather than inventing your own — it enables ecosystem tooling to understand your telemetry.

### Key Span Attributes

```python
from opentelemetry import trace
from opentelemetry.semconv._incubating.attributes import gen_ai_attributes

tracer = trace.get_tracer("my-ai-service")

with tracer.start_as_current_span("llm.chat") as span:
    # Standard GenAI attributes
    span.set_attribute(gen_ai_attributes.GEN_AI_SYSTEM, "openai")
    span.set_attribute(gen_ai_attributes.GEN_AI_REQUEST_MODEL, "gpt-5")
    span.set_attribute(gen_ai_attributes.GEN_AI_REQUEST_MAX_TOKENS, 2000)
    span.set_attribute(gen_ai_attributes.GEN_AI_REQUEST_TEMPERATURE, 0.7)
    
    response = call_llm(prompt)
    
    span.set_attribute(gen_ai_attributes.GEN_AI_RESPONSE_MODEL, response.model)
    span.set_attribute(gen_ai_attributes.GEN_AI_USAGE_INPUT_TOKENS, response.usage.prompt_tokens)
    span.set_attribute(gen_ai_attributes.GEN_AI_USAGE_OUTPUT_TOKENS, response.usage.completion_tokens)
    span.set_attribute(gen_ai_attributes.GEN_AI_RESPONSE_FINISH_REASONS, ["stop"])
```

### Auto-Instrumentation

For Python with the OpenAI SDK, the `opentelemetry-instrumentation-openai` package handles most of this automatically:

```bash
pip install opentelemetry-instrumentation-openai
```

```python
from opentelemetry.instrumentation.openai import OpenAIInstrumentor

OpenAIInstrumentor().instrument(
    # Optional: capture prompt/completion content (can be sensitive)
    enrich_assistant=True,
    enrich_token_usage=True
)

# All OpenAI SDK calls are now automatically traced
```

Auto-instrumentation hooks cover OpenAI, Anthropic, Google Vertex, Cohere, and Bedrock via separate packages.

---

## What to Instrument Beyond Basic Tracing

### 1. Token Usage as a First-Class Metric

Token costs are your primary AI cost driver. Treat them like memory or CPU — track them as metrics, not just trace attributes.

```python
from opentelemetry import metrics

meter = metrics.get_meter("ai-service")

token_counter = meter.create_counter(
    name="gen_ai.client.token.usage",
    description="Token usage for GenAI API calls",
    unit="tokens"
)

cost_histogram = meter.create_histogram(
    name="gen_ai.client.operation.cost",
    description="Estimated cost per GenAI API call",
    unit="usd"
)

def tracked_llm_call(model: str, messages: list, **kwargs):
    response = openai_client.chat.completions.create(
        model=model,
        messages=messages,
        **kwargs
    )
    
    usage = response.usage
    labels = {"gen_ai.system": "openai", "gen_ai.request.model": model}
    
    token_counter.add(usage.prompt_tokens, {**labels, "gen_ai.token.type": "input"})
    token_counter.add(usage.completion_tokens, {**labels, "gen_ai.token.type": "output"})
    
    # Model-specific pricing
    estimated_cost = calculate_cost(model, usage.prompt_tokens, usage.completion_tokens)
    cost_histogram.record(estimated_cost, labels)
    
    return response
```

This gives you dashboards like:
- Token usage by model/endpoint/user over time
- Cost per feature (by adding feature labels)
- Token budget alerts before month-end surprise bills

### 2. Latency Distribution by Reasoning Effort

With models that expose reasoning controls (GPT-5, Claude 3.7+), latency distributions shift dramatically based on `reasoning_effort` or `thinking` parameters. Track them separately.

```python
latency_histogram = meter.create_histogram(
    name="gen_ai.client.operation.duration",
    description="End-to-end latency for GenAI API calls",
    unit="ms"
)

# Include reasoning_effort as a label
latency_histogram.record(
    elapsed_ms,
    {
        "gen_ai.request.model": model,
        "reasoning_effort": reasoning_effort,  # "low", "medium", "high"
        "endpoint": endpoint_name
    }
)
```

You'll often find that `high` reasoning effort is 3-5x slower at p50 but has fat tails — the p99 can be 10x median. This matters for timeout configuration.

### 3. Quality Signals as Metrics

This is the new frontier — instrumenting correctness, not just performance.

```python
quality_gauge = meter.create_observable_gauge(
    name="gen_ai.response.quality",
    description="AI response quality scores from evaluation",
    unit="score"
)

faithfulness_histogram = meter.create_histogram(
    name="gen_ai.response.faithfulness",
    description="Faithfulness score for RAG responses (0-1)",
    unit="score"
)

# After LLM-as-judge evaluation of a response
faithfulness_histogram.record(
    faithfulness_score,
    {
        "endpoint": "product-qa",
        "retrieval_strategy": "hybrid",
        "model": "gpt-5"
    }
)
```

Tracking quality metrics over time lets you detect when a model change, prompt update, or retrieval change degraded response quality — even if latency and error rates look fine.

---

## Distributed Tracing for Agent Pipelines

Multi-step agent systems are where tracing becomes critical. Without it, debugging a failed 8-step agent run is guesswork.

```python
from opentelemetry import trace, context
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

tracer = trace.get_tracer("agent-pipeline")

async def run_agent_pipeline(user_query: str) -> str:
    with tracer.start_as_current_span(
        "agent.pipeline",
        attributes={
            "agent.type": "react",
            "user.query": user_query[:200]  # Truncate for privacy
        }
    ) as pipeline_span:
        
        result = None
        step = 0
        
        while step < MAX_STEPS:
            step += 1
            
            with tracer.start_as_current_span(
                f"agent.step",
                attributes={"agent.step.number": step}
            ) as step_span:
                
                # LLM call to decide next action
                with tracer.start_as_current_span("agent.think") as think_span:
                    action = await llm_decide_action(
                        query=user_query,
                        history=history,
                        tools=available_tools
                    )
                    think_span.set_attribute("agent.action.type", action.type)
                
                if action.type == "final_answer":
                    result = action.answer
                    pipeline_span.set_attribute("agent.steps.total", step)
                    break
                
                # Tool execution
                with tracer.start_as_current_span(
                    "agent.tool_call",
                    attributes={
                        "agent.tool.name": action.tool,
                        "agent.tool.input": str(action.input)[:500]
                    }
                ) as tool_span:
                    tool_result = await execute_tool(action)
                    tool_span.set_attribute("agent.tool.success", tool_result.success)
        
        return result
```

This trace structure gives you a waterfall view of every step — which tools were called, how long each LLM call took, where the agent got stuck or looped.

---

## Logging: What to Capture and What to Skip

### Capture

```python
import logging
from opentelemetry.sdk._logs import LoggingHandler

# Correlate logs with traces automatically
handler = LoggingHandler()
logging.getLogger().addHandler(handler)

# Include trace context in structured logs
logger = logging.getLogger(__name__)
logger.info("LLM call completed", extra={
    "model": model,
    "prompt_tokens": usage.prompt_tokens,
    "completion_tokens": usage.completion_tokens,
    "finish_reason": finish_reason,
    "latency_ms": latency_ms,
    "cache_hit": was_cached
})
```

**Always log:**
- Model, tokens, latency, finish reason
- Request ID / trace ID for correlation
- Cache hit/miss status
- Tool calls and their outcomes

### Skip (or Gate on Debug Level)

**Never log in production:**
- Full prompt text (may contain PII, user queries)
- Full response text (volume is enormous, cost is high)
- API keys, auth tokens

**Log only on error or with explicit opt-in:**
- Truncated prompt (first 200 chars max)
- Truncated response
- User IDs (anonymized/hashed)

```python
# Privacy-safe prompt logging
def safe_log_prompt(prompt: str, max_chars: int = 200) -> str:
    if len(prompt) > max_chars:
        return prompt[:max_chars] + f"... [truncated, total {len(prompt)} chars]"
    return prompt
```

---

## Dashboards: The Essential Views

![Dashboard Monitoring](https://images.unsplash.com/photo-1543286386-713bdd548da4?w=1000&auto=format&fit=crop)
*Photo by Lukas Blazek on Unsplash*

Your Grafana/Datadog setup should have these views as a baseline:

**Operational Dashboard:**
- Request rate, error rate, latency (p50/p95/p99) — per endpoint
- Token usage rate (input/output) — per model
- Estimated cost (hourly/daily) — per model, per feature
- Cache hit rate

**Quality Dashboard:**
- Faithfulness scores over time (for RAG)
- LLM-as-judge quality scores by endpoint
- User feedback signals (thumbs up/down rates)
- Retry rates (implicit quality signal)

**Cost Optimization Dashboard:**
- Cost per successful request by endpoint
- Token efficiency (output tokens / input tokens ratio — low ratios may mean verbose prompts)
- Model cost comparison (GPT-5 vs GPT-4o vs local model)
- Top token-consuming endpoints/users

---

## Alert Thresholds for AI Services

Unlike traditional services, AI service SLOs need to account for quality:

```yaml
# Example Prometheus alerting rules
groups:
  - name: ai_service_alerts
    rules:
      - alert: HighLLMErrorRate
        expr: rate(gen_ai_client_errors_total[5m]) / rate(gen_ai_client_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: warning
        
      - alert: LLMLatencyHigh
        expr: histogram_quantile(0.95, rate(gen_ai_client_operation_duration_ms_bucket[5m])) > 10000
        for: 5m
        labels:
          severity: warning
          
      - alert: TokenCostSpike
        expr: rate(gen_ai_client_token_cost_usd_total[1h]) > 50  # $50/hour
        for: 5m
        labels:
          severity: critical
          
      - alert: LowRAGFaithfulness
        expr: histogram_quantile(0.5, rate(gen_ai_response_faithfulness_score_bucket[30m])) < 0.7
        for: 10m
        labels:
          severity: warning
```

---

## Summary

The shift to AI-powered services doesn't eliminate the need for observability — it deepens it. The standard stack (OTel traces, Prometheus metrics, structured logs) is still the right foundation. But you need to extend it:

1. **Adopt OTel GenAI semantic conventions** — use standard attribute names, enable ecosystem tooling
2. **Track tokens as a first-class metric** — it's your primary cost signal
3. **Instrument quality, not just performance** — LLM-as-judge scores tell you what error rates can't
4. **Trace agent pipelines step-by-step** — black-box AI calls are debuggable if you instrument them
5. **Build cost dashboards proactively** — token costs surprise teams that don't watch them

The teams shipping reliable AI products in 2026 all have one thing in common: they can answer "what exactly did my system do, and how well did it do it?" Observability is how you build that answer.
