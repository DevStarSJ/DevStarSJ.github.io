---
layout: post
title: "OpenTelemetry Meets AI: Observability for LLM-Powered Applications in 2026"
subtitle: "Tracing, metrics, and logging patterns for production AI systems using OpenTelemetry Semantic Conventions for GenAI"
date: 2026-06-20 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80"
header-mask: 0.4
catalog: true
tags:
  - OpenTelemetry
  - AI
  - LLM
  - Observability
  - Monitoring
  - GenAI
  - Production
categories: ai
---

## The Observability Gap in AI Systems

Traditional observability was built for deterministic systems: a request comes in, code runs, a response goes out. Latency, error rate, throughput — these tell you most of what you need to know.

LLM-powered applications break these assumptions. A single user query might trigger a chain of model calls, tool invocations, and retrieval operations. The "logic" is probabilistic. Failure modes are subtle — a model that returns an answer is not necessarily returning the *right* answer. Cost is variable and tied to token consumption, not compute time.

In 2026, **OpenTelemetry's GenAI Semantic Conventions** (stabilized in late 2025) have given the industry a common vocabulary for instrumenting AI systems. This post shows you how to use them.

![Observability Dashboard](https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80)
*Photo by [Carlos Muza](https://unsplash.com/@kmuza) on Unsplash*

---

## OpenTelemetry GenAI Semantic Conventions

The OTel GenAI spec defines standardized attribute names for AI/LLM operations:

```python
# Key span attributes from the GenAI semantic conventions
GEN_AI_SYSTEM = "gen_ai.system"          # "openai", "anthropic", "aws.bedrock"
GEN_AI_OPERATION = "gen_ai.operation.name"  # "chat", "text_completion", "embeddings"
GEN_AI_MODEL_REQUEST = "gen_ai.request.model"  # "gpt-4o", "claude-opus-4"
GEN_AI_MODEL_RESPONSE = "gen_ai.response.model"  # Actual model used (may differ)

# Token usage
GEN_AI_USAGE_INPUT_TOKENS = "gen_ai.usage.input_tokens"
GEN_AI_USAGE_OUTPUT_TOKENS = "gen_ai.usage.output_tokens"

# Response metadata
GEN_AI_RESPONSE_FINISH_REASONS = "gen_ai.response.finish_reasons"  # ["stop", "length"]
GEN_AI_RESPONSE_ID = "gen_ai.response.id"

# Request params
GEN_AI_REQUEST_MAX_TOKENS = "gen_ai.request.max_tokens"
GEN_AI_REQUEST_TEMPERATURE = "gen_ai.request.temperature"
GEN_AI_REQUEST_TOP_P = "gen_ai.request.top_p"
```

---

## Instrumenting an OpenAI Application

### Manual Instrumentation

```python
from opentelemetry import trace
from opentelemetry.trace import SpanKind
from openai import OpenAI
import time

tracer = trace.get_tracer("my-ai-app", "1.0.0")
client = OpenAI()

def chat_with_tracing(user_message: str, model: str = "gpt-4o") -> str:
    with tracer.start_as_current_span(
        "chat",
        kind=SpanKind.CLIENT,
        attributes={
            "gen_ai.system": "openai",
            "gen_ai.operation.name": "chat",
            "gen_ai.request.model": model,
            "gen_ai.request.max_tokens": 2048,
            "gen_ai.request.temperature": 0.7,
        }
    ) as span:
        start_time = time.time()
        
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": user_message}],
                max_tokens=2048,
                temperature=0.7,
            )
            
            # Record response attributes
            span.set_attributes({
                "gen_ai.response.id": response.id,
                "gen_ai.response.model": response.model,
                "gen_ai.usage.input_tokens": response.usage.prompt_tokens,
                "gen_ai.usage.output_tokens": response.usage.completion_tokens,
                "gen_ai.response.finish_reasons": [
                    c.finish_reason for c in response.choices
                ],
            })
            
            # Record as events (for prompt/response capture with opt-in)
            span.add_event("gen_ai.user.message", {
                "gen_ai.prompt": user_message[:1000]  # truncate for safety
            })
            span.add_event("gen_ai.choice", {
                "gen_ai.completion": response.choices[0].message.content[:1000]
            })
            
            return response.choices[0].message.content
            
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise
```

### Auto-Instrumentation with opentelemetry-instrumentation-openai

```bash
pip install opentelemetry-instrumentation-openai
```

```python
from opentelemetry.instrumentation.openai import OpenAIInstrumentor

# Zero-code instrumentation — instruments all OpenAI calls automatically
OpenAIInstrumentor().instrument(
    # Optional: capture prompt/completion content (off by default for privacy)
    capture_content=True,
    # Optional: emit token metrics
    emit_metrics=True,
)

# All subsequent OpenAI calls are automatically traced
from openai import OpenAI
client = OpenAI()
response = client.chat.completions.create(...)  # Auto-traced!
```

---

## Tracing AI Agent Chains

For multi-step agent systems, distributed traces become essential:

```python
from opentelemetry import trace
from opentelemetry.baggage import set_baggage
from typing import Any

tracer = trace.get_tracer("ai-agent")

class TracedAgent:
    def __init__(self, name: str):
        self.name = name
    
    def run(self, task: str) -> str:
        with tracer.start_as_current_span(
            f"agent.{self.name}",
            attributes={
                "agent.name": self.name,
                "agent.task": task[:200],
            }
        ) as span:
            # Step 1: Plan
            plan = self._plan(task)
            span.add_event("agent.plan", {"plan": plan})
            
            # Step 2: Tool calls
            results = []
            for tool_call in self._get_tool_calls(plan):
                result = self._execute_tool(tool_call)
                results.append(result)
            
            # Step 3: Synthesize
            final_answer = self._synthesize(task, results)
            
            span.set_attributes({
                "agent.tool_calls": len(results),
                "agent.output_length": len(final_answer),
            })
            
            return final_answer
    
    def _execute_tool(self, tool_call: dict) -> Any:
        with tracer.start_as_current_span(
            f"tool.{tool_call['name']}",
            attributes={
                "tool.name": tool_call['name'],
                "tool.input": str(tool_call.get('input', ''))[:500],
            }
        ) as span:
            # Execute tool...
            result = self._run_tool(tool_call)
            span.set_attribute("tool.output_length", len(str(result)))
            return result
```

This produces traces like:

```
agent.research-agent (1.2s)
├── chat → gpt-4o (planning) (0.4s)
│   ├── gen_ai.usage.input_tokens: 312
│   └── gen_ai.usage.output_tokens: 89
├── tool.web-search (0.3s)
│   └── tool.name: web-search
├── tool.web-fetch (0.2s)
├── chat → gpt-4o (synthesis) (0.3s)
│   ├── gen_ai.usage.input_tokens: 1840
│   └── gen_ai.usage.output_tokens: 412
└── agent.tool_calls: 2
```

---

## Cost Tracking with OpenTelemetry

Token usage is cost. Track it as a first-class metric:

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider

meter = metrics.get_meter("ai-cost-tracker")

# Counters for token tracking
input_token_counter = meter.create_counter(
    "gen_ai.client.token.usage",
    unit="{token}",
    description="Number of tokens used in AI requests"
)

# Cost estimate counter (in millicents for integer precision)
cost_counter = meter.create_counter(
    "gen_ai.client.cost.millicents",
    unit="{millicent}",
    description="Estimated cost of AI requests in millicents"
)

# Pricing table (approximate 2026 pricing)
MODEL_PRICING = {
    "gpt-4o": {"input": 0.0025, "output": 0.01},         # per 1K tokens
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
    "claude-opus-4": {"input": 0.015, "output": 0.075},
    "claude-sonnet-4": {"input": 0.003, "output": 0.015},
}

def record_token_usage(
    model: str,
    input_tokens: int, 
    output_tokens: int,
    service: str,
    operation: str
):
    labels = {
        "gen_ai.system": "openai" if "gpt" in model else "anthropic",
        "gen_ai.request.model": model,
        "gen_ai.operation.name": operation,
        "service.name": service,
    }
    
    input_token_counter.add(input_tokens, {**labels, "gen_ai.token.type": "input"})
    input_token_counter.add(output_tokens, {**labels, "gen_ai.token.type": "output"})
    
    if model in MODEL_PRICING:
        pricing = MODEL_PRICING[model]
        cost_millicents = int(
            (input_tokens / 1000 * pricing["input"] + 
             output_tokens / 1000 * pricing["output"]) * 100_000
        )
        cost_counter.add(cost_millicents, labels)
```

### Grafana Dashboard Queries

```promql
# Daily AI cost by model
sum by (gen_ai_request_model) (
  increase(gen_ai_client_cost_millicents_total[24h])
) / 100000  # Convert to dollars

# P99 LLM latency by operation
histogram_quantile(0.99, 
  sum by (le, gen_ai_request_model) (
    rate(gen_ai_client_operation_duration_seconds_bucket[5m])
  )
)

# Token usage trend (for capacity planning)
sum by (gen_ai_request_model, gen_ai_token_type) (
  increase(gen_ai_client_token_usage_total[1h])
)
```

---

## Detecting LLM Quality Degradation

Beyond latency and errors, AI systems have quality metrics:

```python
from opentelemetry import metrics

meter = metrics.get_meter("ai-quality")

# Track finish reasons (stop=normal, length=truncated)
finish_reason_counter = meter.create_counter(
    "gen_ai.response.finish_reasons",
    description="Count of responses by finish reason"
)

# Track user feedback signals
feedback_histogram = meter.create_histogram(
    "gen_ai.user.feedback.score",
    description="User feedback scores (1-5)",
    unit="{score}"
)

# Track retry rates (high retries = reliability issue)
retry_counter = meter.create_counter(
    "gen_ai.client.retries",
    description="Number of retried LLM requests"
)

# Alert: if >5% of responses are "length" (truncated), increase max_tokens
# Alert: if retry_rate > 10%, check rate limits or model availability
```

---

## Production Setup: Full Stack

```python
# otel_setup.py
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.openai import OpenAIInstrumentor

def setup_telemetry(service_name: str, environment: str):
    resource = Resource.create({
        "service.name": service_name,
        "deployment.environment": environment,
    })
    
    # Traces → Grafana Tempo / Jaeger / Honeycomb
    trace_provider = TracerProvider(resource=resource)
    trace_provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(endpoint="http://otel-collector:4317")
        )
    )
    trace.set_tracer_provider(trace_provider)
    
    # Metrics → Prometheus / Grafana Mimir
    metric_provider = MeterProvider(
        resource=resource,
        metric_readers=[
            PeriodicExportingMetricReader(
                OTLPMetricExporter(endpoint="http://otel-collector:4317"),
                export_interval_millis=30000
            )
        ]
    )
    metrics.set_meter_provider(metric_provider)
    
    # Auto-instrument OpenAI
    OpenAIInstrumentor().instrument(emit_metrics=True)
    
    return trace.get_tracer(service_name)
```

---

## Platforms with Native GenAI Observability (2026)

| Platform | GenAI Support | Strengths |
|----------|--------------|-----------|
| **Honeycomb** | ✅ Excellent | Trace-first, LLM debugging UX |
| **Grafana** | ✅ Good | Full OTel stack, cost-effective |
| **Datadog** | ✅ LLM Observability product | Full APM integration |
| **Langfuse** | ✅ AI-native | Best for LLM-specific workflows |
| **Arize Phoenix** | ✅ AI-native | Evals + tracing combined |
| **OpenLIT** | ✅ Open source | OTel-native, self-hosted |

For pure AI observability, **Langfuse** (open-source) or **Arize Phoenix** are worth evaluating before defaulting to your existing APM vendor.

---

## Conclusion

Observability for AI systems in 2026 requires extending your existing OTel stack with GenAI-specific conventions — token tracking, cost attribution, multi-step agent tracing, and quality signal collection.

The good news: the ecosystem has converged on a common standard (OTel GenAI Semantic Conventions), and auto-instrumentation libraries exist for all major providers. The investment in proper AI observability pays back quickly — token cost surprises and subtle model quality degradations are far more common than outright failures.

Treat your LLM calls like you treat your database queries: instrument everything, set SLOs, alert on drift.

---

*References:*
- *[OpenTelemetry GenAI Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)*
- *[opentelemetry-instrumentation-openai](https://github.com/traceloop/opentelemetry-python-contrib)*
- *[Langfuse Documentation](https://langfuse.com/docs)*
- *[Arize Phoenix](https://phoenix.arize.com)*
