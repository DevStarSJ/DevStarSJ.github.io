---
layout: post
title: "LLM Observability in Production: Tracing, Monitoring, and Debugging AI Applications"
subtitle: "How to Build a Comprehensive Observability Stack for LLM-Powered Systems in 2026"
date: 2026-03-27 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80"
catalog: true
tags:
  - LLM
  - Observability
  - AI
  - Monitoring
  - OpenTelemetry
  - MLOps
categories: ai
---

# LLM Observability in Production: Tracing, Monitoring, and Debugging AI Applications

Deploying an LLM is easy. **Understanding what it's doing in production is hard.** Unlike traditional APIs where you can trace a database query or cache miss, LLM failures are subtle: hallucinations, token budget overruns, prompt injection attacks, latency spikes, and quality regressions that users notice before your metrics do.

This guide covers the full observability stack for production LLM applications in 2026.

![Monitoring Dashboard](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&auto=format&fit=crop&q=80)
*Photo by [Luke Chesser](https://unsplash.com/@lukechesser) on Unsplash*

---

## The LLM Observability Problem

Traditional observability (logs + metrics + traces) covers infrastructure well. But LLM applications add new dimensions:

| Traditional | LLM-Specific |
|-------------|-------------|
| Response time | Time-to-first-token (TTFT) |
| Error rate | Hallucination rate |
| Throughput | Token consumption |
| Cache hit rate | Context window utilization |
| CPU/Memory | Cost per request |
| N/A | Prompt quality score |
| N/A | Output safety violations |

You need **both** layers working together.

---

## The Four Pillars of LLM Observability

### 1. Traces — The Full Request Journey

Every LLM request spans multiple steps: retrieval, prompt construction, model call, response parsing, tool use. Distributed tracing connects them all.

**OpenLLMetry** (the de facto standard in 2026) instruments LLM calls automatically:

```bash
pip install opentelemetry-sdk openllmetry-sdk
pip install opentelemetry-exporter-otlp
```

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from traceloop.sdk import Traceloop

# Initialize with automatic instrumentation
Traceloop.init(
    app_name="my-ai-app",
    api_endpoint="https://otel-collector:4317",
    headers={"Authorization": "Bearer YOUR_TOKEN"},
)

# Now all LLM calls are automatically traced
from anthropic import Anthropic

client = Anthropic()

@trace.get_tracer(__name__).start_as_current_span("chat_handler")
def handle_chat(user_message: str, user_id: str) -> str:
    span = trace.get_current_span()
    span.set_attribute("user.id", user_id)
    span.set_attribute("user.message.length", len(user_message))
    
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        messages=[{"role": "user", "content": user_message}]
    )
    
    # Automatically captured by OpenLLMetry:
    # - model name, prompt tokens, completion tokens
    # - latency, TTFT
    # - full prompt + response (if enabled)
    
    return response.content[0].text
```

### 2. Metrics — Aggregate Health Signals

Track these core LLM metrics:

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
import time

meter = metrics.get_meter("llm-app")

# Core counters
request_counter = meter.create_counter(
    "llm.requests.total",
    description="Total LLM requests"
)

token_counter = meter.create_counter(
    "llm.tokens.total",
    description="Total tokens consumed"
)

# Histograms for latency
latency_histogram = meter.create_histogram(
    "llm.request.duration",
    description="LLM request duration in seconds",
    unit="s"
)

ttft_histogram = meter.create_histogram(
    "llm.time_to_first_token",
    description="Time to first token",
    unit="s"
)

# Cost tracking
cost_counter = meter.create_counter(
    "llm.cost.usd",
    description="Estimated cost in USD"
)

def tracked_llm_call(messages: list, model: str = "claude-sonnet-4-5"):
    start = time.time()
    
    request_counter.add(1, {"model": model, "env": "production"})
    
    response = client.messages.create(
        model=model,
        max_tokens=2048,
        messages=messages
    )
    
    duration = time.time() - start
    
    # Track metrics
    latency_histogram.record(duration, {"model": model})
    
    token_counter.add(
        response.usage.input_tokens + response.usage.output_tokens,
        {"model": model, "type": "total"}
    )
    
    # Estimate cost (claude-sonnet-4-5 pricing)
    cost = (response.usage.input_tokens * 0.000003 + 
            response.usage.output_tokens * 0.000015)
    cost_counter.add(cost, {"model": model})
    
    return response
```

### 3. Logs — Structured LLM Events

Structured logging with full context for debugging:

```python
import structlog
import json

logger = structlog.get_logger()

def log_llm_interaction(
    request_id: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    latency_ms: float,
    finish_reason: str,
    user_id: str = None,
    session_id: str = None,
    # Enable prompt/response logging only in debug mode
    log_content: bool = False,
    prompt: str = None,
    response: str = None,
):
    log_data = {
        "event": "llm_call",
        "request_id": request_id,
        "model": model,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": prompt_tokens + completion_tokens,
        "latency_ms": round(latency_ms, 2),
        "finish_reason": finish_reason,
        "estimated_cost_usd": round(
            prompt_tokens * 0.000003 + completion_tokens * 0.000015, 6
        ),
    }
    
    if user_id:
        log_data["user_id"] = user_id
    if session_id:
        log_data["session_id"] = session_id
    
    # ⚠️ IMPORTANT: Be careful about PII in prompts
    if log_content and prompt:
        # Truncate and sanitize before logging
        log_data["prompt_preview"] = prompt[:200]
        log_data["response_preview"] = response[:200] if response else None
    
    logger.info("llm_interaction", **log_data)
```

### 4. Evals — Quality Measurement

This is the LLM-specific layer most teams skip. Big mistake.

{% raw %}
```python
from anthropic import Anthropic
from dataclasses import dataclass
from enum import Enum

class EvalResult(Enum):
    PASS = "pass"
    FAIL = "fail"
    UNCLEAR = "unclear"

@dataclass
class QualityScore:
    result: EvalResult
    score: float  # 0-1
    reasoning: str
    flags: list[str]

class LLMEvaluator:
    """Use a secondary LLM to evaluate primary LLM outputs."""
    
    def __init__(self):
        self.client = Anthropic()
    
    def evaluate_response(
        self,
        user_query: str,
        llm_response: str,
        expected_properties: list[str] = None
    ) -> QualityScore:
        
        eval_prompt = f"""You are a quality evaluator for an AI assistant. 
Evaluate the following AI response for quality issues.

USER QUERY:
{user_query}

AI RESPONSE:
{llm_response}

Check for:
1. Factual accuracy and hallucinations
2. Relevance to the query
3. Completeness
4. Safety (harmful content, PII exposure)
5. Helpfulness

Return a JSON object:
{{
    "result": "pass" | "fail" | "unclear",
    "score": 0.0-1.0,
    "reasoning": "brief explanation",
    "flags": ["list", "of", "issues"]
}}"""
        
        eval_response = self.client.messages.create(
            model="claude-haiku-3-5",  # Use cheaper model for evals
            max_tokens=512,
            messages=[{"role": "user", "content": eval_prompt}]
        )
        
        result = json.loads(eval_response.content[0].text)
        return QualityScore(**result)
    
    def check_hallucination(
        self, 
        response: str, 
        source_documents: list[str]
    ) -> float:
        """Returns hallucination score: 0 = grounded, 1 = hallucinated."""
        
        sources_text = "\n\n---\n\n".join(source_documents[:5])
        
        prompt = f"""Given these source documents and an AI response, 
determine what fraction of the response's factual claims are NOT supported by the sources.

SOURCES:
{sources_text}

AI RESPONSE:
{response}

Return only a number between 0.0 (fully grounded) and 1.0 (fully hallucinated)."""
        
        result = self.client.messages.create(
            model="claude-haiku-3-5",
            max_tokens=10,
            messages=[{"role": "user", "content": prompt}]
        )
        
        try:
            return float(result.content[0].text.strip())
        except ValueError:
            return 0.5  # Unknown
```
{% endraw %}

---

## The Full Observability Stack

Here's the complete infrastructure setup using open-source tools:

```yaml
# docker-compose.yml — LLM Observability Stack
version: '3.8'

services:
  # OTel Collector — receives all telemetry
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.96.0
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "8888:8888"   # Prometheus metrics
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml

  # Jaeger — distributed tracing
  jaeger:
    image: jaegertracing/all-in-one:1.55
    ports:
      - "16686:16686"  # Jaeger UI
      - "14250:14250"  # gRPC

  # Prometheus — metrics
  prometheus:
    image: prom/prometheus:v2.50.0
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  # Grafana — dashboards
  grafana:
    image: grafana/grafana:10.3.0
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards

volumes:
  grafana-data:
```

```yaml
# otel-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  
  # Filter sensitive data from spans
  attributes/redact:
    actions:
      - key: llm.prompts
        action: delete  # Don't store raw prompts in traces by default

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true
  
  prometheus:
    endpoint: "0.0.0.0:8888"
  
  # Also send to Langfuse for LLM-specific analytics
  otlphttp/langfuse:
    endpoint: "https://cloud.langfuse.com/api/public/otel"
    headers:
      Authorization: "Basic ${LANGFUSE_API_KEY}"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, attributes/redact]
      exporters: [jaeger, otlphttp/langfuse]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

---

## Grafana Dashboard: Key Panels

### LLM Overview Dashboard

```json
{
  "panels": [
    {
      "title": "Requests/minute",
      "type": "stat",
      "targets": [{
        "expr": "sum(rate(llm_requests_total[1m]))"
      }]
    },
    {
      "title": "P95 Latency",
      "type": "gauge",
      "targets": [{
        "expr": "histogram_quantile(0.95, sum(rate(llm_request_duration_bucket[5m])) by (le))"
      }]
    },
    {
      "title": "Token Cost (24h)",
      "type": "stat",
      "targets": [{
        "expr": "sum(increase(llm_cost_usd_total[24h]))"
      }]
    },
    {
      "title": "Error Rate",
      "type": "timeseries",
      "targets": [{
        "expr": "sum(rate(llm_requests_total{status='error'}[5m])) / sum(rate(llm_requests_total[5m]))"
      }]
    }
  ]
}
```

---

## Alerting: What to Alert On

{% raw %}
```yaml
# prometheus-alerts.yaml
groups:
- name: llm-alerts
  rules:
  
  # High latency
  - alert: LLMHighLatency
    expr: histogram_quantile(0.95, sum(rate(llm_request_duration_bucket[5m])) by (le, model)) > 10
    for: 2m
    annotations:
      summary: "LLM P95 latency above 10s for {{ $labels.model }}"
  
  # Unexpected cost spike
  - alert: LLMCostSpike
    expr: sum(rate(llm_cost_usd_total[5m])) * 3600 > 50  # $50/hour
    for: 5m
    annotations:
      summary: "LLM spending above $50/hour — possible runaway calls"
  
  # High error rate
  - alert: LLMHighErrorRate
    expr: sum(rate(llm_requests_total{status="error"}[5m])) / sum(rate(llm_requests_total[5m])) > 0.05
    for: 2m
    annotations:
      summary: "LLM error rate above 5%"
  
  # Quality degradation (from eval pipeline)
  - alert: LLMQualityDrop
    expr: avg(llm_eval_score) < 0.7
    for: 10m
    annotations:
      summary: "Average LLM response quality below 70%"
```
{% endraw %}

---

## Prompt Debugging: Finding Bad Prompts

The hardest part of LLM debugging is identifying *which* prompts cause failures. Here's a systematic approach:

```python
import hashlib
from collections import defaultdict
from typing import Optional

class PromptAnalytics:
    """Track performance by prompt template."""
    
    def __init__(self, db_client):
        self.db = db_client
    
    def get_prompt_hash(self, template: str) -> str:
        """Create stable hash for a prompt template (before variable substitution)."""
        return hashlib.md5(template.encode()).hexdigest()[:8]
    
    async def record_interaction(
        self,
        prompt_template: str,
        variables: dict,
        response: str,
        latency_ms: float,
        tokens: int,
        eval_score: Optional[float] = None,
        error: Optional[str] = None
    ):
        template_hash = self.get_prompt_hash(prompt_template)
        
        await self.db.insert("llm_interactions", {
            "template_hash": template_hash,
            "variables_json": json.dumps(variables),
            "response_preview": response[:500],
            "latency_ms": latency_ms,
            "tokens": tokens,
            "eval_score": eval_score,
            "error": error,
            "timestamp": datetime.utcnow()
        })
    
    async def get_worst_performing_templates(self, hours: int = 24):
        """Find prompt templates with lowest quality scores."""
        return await self.db.query("""
            SELECT 
                template_hash,
                COUNT(*) as call_count,
                AVG(eval_score) as avg_quality,
                AVG(latency_ms) as avg_latency,
                SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as error_count
            FROM llm_interactions
            WHERE timestamp > NOW() - INTERVAL '%s hours'
            GROUP BY template_hash
            ORDER BY avg_quality ASC
            LIMIT 10
        """, hours)
```

---

## LLM Observability Tools Comparison (2026)

| Tool | Traces | Metrics | Evals | Cost | Self-host |
|------|--------|---------|-------|------|-----------|
| **Langfuse** | ✅ | ✅ | ✅ | Free tier | ✅ |
| **Helicone** | ✅ | ✅ | ✅ | $20/mo | ✅ |
| **Phoenix (Arize)** | ✅ | ✅ | ✅ | Free | ✅ |
| **LangSmith** | ✅ | ✅ | ✅ | $39/mo | ❌ |
| **Braintrust** | ✅ | ✅ | ✅ | Free tier | ❌ |
| **Custom OTel stack** | ✅ | ✅ | ⚠️ | Infrastructure only | ✅ |

**Recommendation in 2026:** Start with **Langfuse** (open-source, self-hostable, excellent UI) and add custom metrics to Prometheus for infrastructure-level alerting.

---

## Quick Start: 5-Minute Setup

```bash
# 1. Start Langfuse locally
git clone https://github.com/langfuse/langfuse
cd langfuse
docker compose up -d

# 2. Install Python SDK
pip install langfuse opentelemetry-sdk openllmetry-sdk

# 3. Instrument your app
cat > observability_setup.py << 'EOF'
from langfuse import Langfuse
from traceloop.sdk import Traceloop

# Initialize Langfuse
langfuse = Langfuse(
    public_key="pk-lf-...",
    secret_key="sk-lf-...",
    host="http://localhost:3000"
)

# Auto-instrument all LLM calls
Traceloop.init(app_name="my-app")

print("✅ LLM observability initialized")
EOF

python observability_setup.py
```

Open `http://localhost:3000` — you'll see traces from your first LLM call.

---

## Conclusion

LLM observability is not optional in production. The teams winning in 2026 are those who can answer:
- Which prompts are causing quality issues?
- Which users are experiencing degraded responses?
- How much is each feature actually costing us in tokens?
- Are we approaching context window limits?

The good news: the tooling is mature. OpenLLMetry + Langfuse + Prometheus/Grafana gives you a complete stack for free. The investment in instrumentation pays off the first time you need to debug a hallucination at 2 AM.

**Measure everything. Trust the data, not your gut.**

---

*References:*
- [OpenLLMetry GitHub](https://github.com/traceloop/openllmetry)
- [Langfuse Documentation](https://langfuse.com/docs)
- [OpenTelemetry Semantic Conventions for LLMs](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
