---
layout: post
title: "AI-Native Development: How to Actually Build Applications with LLMs in the Loop"
subtitle: "Moving beyond demos — production patterns for structured outputs, streaming, fallbacks, and cost control when LLMs are core infrastructure"
date: 2026-05-01 12:00:00
author: "Seokjun Lee"
header-img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1600&auto=format&fit=crop"
catalog: true
categories:
  - AI
  - Software Engineering
tags:
  - LLM
  - AI Engineering
  - Structured Outputs
  - Production AI
  - Prompt Engineering
  - AI Architecture
---

Building an LLM demo takes an afternoon. Building an LLM-powered *product* takes a completely different mindset. The gap between "I got it working in a Jupyter notebook" and "it's running reliably in production serving 10,000 users" is enormous — and most of the difficulty isn't in the AI part. It's in applying software engineering discipline to non-deterministic systems.

This is a practical guide to what that actually looks like.

![AI Development](https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&auto=format&fit=crop)
*Photo by Google DeepMind on Unsplash*

## The Core Mental Shift

LLMs are infrastructure. Treat them like a database or an API call — not like magic, and not like a coworker.

That means:
- **Design for failure.** Models hallucinate, timeout, and produce unexpected formats.
- **Measure everything.** If you can't evaluate quality, you can't improve it.
- **Version your prompts.** They're code. Treat them accordingly.
- **Control costs.** Token usage compounds; a 10x increase in users is a 10x increase in spend.

## Structured Outputs Are Non-Negotiable

The single most impactful change to LLM production reliability in 2025 was the widespread adoption of structured output constraints. Instead of asking a model to "return JSON", you enforce a JSON schema at the API level:

```python
from anthropic import Anthropic
from pydantic import BaseModel
from typing import Optional

client = Anthropic()

class ProductAnalysis(BaseModel):
    sentiment: Literal["positive", "negative", "neutral"]
    score: float  # 0-1
    key_themes: list[str]
    summary: str
    requires_followup: bool
    followup_reason: Optional[str] = None

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": f"Analyze this product review: {review_text}"
    }],
    # Force structured output matching our Pydantic model
    tools=[{
        "name": "product_analysis",
        "description": "Output the structured analysis of the review",
        "input_schema": ProductAnalysis.model_json_schema()
    }],
    tool_choice={"type": "tool", "name": "product_analysis"}
)

# Guaranteed to parse — no try/except needed for format errors
analysis = ProductAnalysis(**response.content[0].input)
```

OpenAI's structured outputs (now GA) and Anthropic's tool use with `tool_choice` both provide this guarantee. The model *cannot* deviate from the schema. This eliminates an entire class of production failures.

For local models via Ollama or vLLM, use [Outlines](https://github.com/outlines-dev/outlines) or [Instructor](https://github.com/jxnl/instructor) which enforce structured output through constrained decoding.

## Prompt Versioning and Management

Prompts are code. They need version control, testing, and deployment pipelines.

The naive approach (strings in Python files) breaks down as teams grow. A better pattern:

```
prompts/
  product-analysis/
    v1.0.txt     # Original
    v1.1.txt     # Improved instructions
    v2.0.txt     # Restructured for new schema
    config.yaml  # Model, temperature, max_tokens per version
```

```yaml
# prompts/product-analysis/config.yaml
current_version: "2.0"
versions:
  "2.0":
    model: "claude-sonnet-4-5"
    temperature: 0
    max_tokens: 1024
    system_prompt_path: "system.txt"
  "1.1":
    model: "claude-3-opus"
    temperature: 0.1
    max_tokens: 2048
```

This lets you:
- A/B test prompt versions against each other
- Roll back when a new prompt regresses quality
- Audit what prompt was active when a particular output was generated

Several managed prompt management tools have emerged (Langfuse, PromptLayer, Braintrust), but a simple file structure is often sufficient and avoids vendor lock-in.

## Streaming: Make It Fast, Make It Feel Fast

Users tolerate long waits much better when they see progress. Stream by default:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Server-Sent Events streaming
export async function GET(req: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const response = await client.messages.stream({
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        messages: [{ role: "user", content: userMessage }]
      });
      
      for await (const chunk of response) {
        if (chunk.type === "content_block_delta" && 
            chunk.delta.type === "text_delta") {
          const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      }
      
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}
```

On the client side, the [Vercel AI SDK](https://sdk.vercel.ai) handles stream parsing and React state management cleanly. For non-React environments, the `EventSource` API is standard.

## Fallback and Circuit Breaker Patterns

LLM providers go down. Models get deprecated. Rate limits get hit. Your application shouldn't fail when any of this happens:

```python
from tenacity import retry, stop_after_attempt, wait_exponential
import anthropic
import openai

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10)
)
async def call_with_fallback(prompt: str, require_fast: bool = False) -> str:
    providers = [
        ("anthropic", "claude-sonnet-4-5"),
        ("openai", "gpt-4o"),
        ("anthropic", "claude-haiku-3-5"),  # Fast/cheap fallback
    ]
    
    last_error = None
    for provider, model in providers:
        try:
            if provider == "anthropic":
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model=model,
                    max_tokens=1024,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            elif provider == "openai":
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
        except Exception as e:
            last_error = e
            logger.warning(f"Provider {provider}/{model} failed: {e}")
            continue
    
    raise RuntimeError(f"All providers failed. Last error: {last_error}")
```

Use [LiteLLM](https://github.com/BerriAI/litellm) to abstract multiple providers behind a single OpenAI-compatible interface — then your fallback logic is just a model name change.

## Caching: The Underrated Cost Reducer

LLM inference is expensive. Caching is your best lever for cost control:

```python
import hashlib
import redis
import json
from functools import wraps

redis_client = redis.Redis(host="localhost", port=6379)

def llm_cache(ttl: int = 3600, temperature_threshold: float = 0.0):
    """Cache LLM responses for deterministic or near-deterministic calls."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Only cache zero-temperature calls (deterministic)
            temperature = kwargs.get("temperature", 0.0)
            if temperature > temperature_threshold:
                return await func(*args, **kwargs)
            
            # Create cache key from prompt + model
            cache_key = hashlib.sha256(
                json.dumps({"args": str(args), "kwargs": str(kwargs)}, 
                          sort_keys=True).encode()
            ).hexdigest()
            
            # Check cache
            cached = redis_client.get(f"llm:{cache_key}")
            if cached:
                return json.loads(cached)
            
            # Call LLM
            result = await func(*args, **kwargs)
            
            # Store in cache
            redis_client.setex(f"llm:{cache_key}", ttl, json.dumps(result))
            return result
        return wrapper
    return decorator

@llm_cache(ttl=86400)  # Cache for 24 hours
async def classify_text(text: str, model: str = "claude-haiku-3-5") -> dict:
    # ...
```

Beyond application-level caching, Anthropic's **prompt caching** feature lets you cache large system prompts server-side (up to 5-minute cache TTL), reducing costs by 90% for cached tokens. Essential if you're injecting large context (RAG documents, codebases, etc.) on every call.

![AI Cost Control](https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&auto=format&fit=crop)
*Photo by Maxim Hopman on Unsplash*

## Evaluation: The Piece Most Teams Skip

You can't improve what you don't measure. LLM quality is subjective, but you can still build systematic evaluation:

```python
# LLM-as-judge pattern — use a strong model to evaluate a weaker one
async def evaluate_response(
    query: str, 
    response: str, 
    rubric: str
) -> dict:
    evaluation = await call_llm(
        system="""You are an evaluator. Rate the response on the given rubric.
        Return JSON with: score (1-5), reasoning (string), 
        passes_minimum (bool).""",
        user=f"""Query: {query}
        
        Response: {response}
        
        Rubric: {rubric}"""
    )
    return json.loads(evaluation)

# Build a test suite
test_cases = [
    {"query": "...", "expected_themes": [...], "should_require_followup": True},
    # ...
]

# Run evaluations on every prompt change
async def regression_test(prompt_version: str):
    results = []
    for case in test_cases:
        output = await run_pipeline(case["query"], prompt_version)
        score = await evaluate_response(
            case["query"], 
            output, 
            rubric=EVALUATION_RUBRIC
        )
        results.append(score)
    
    pass_rate = sum(r["passes_minimum"] for r in results) / len(results)
    return pass_rate
```

Set a minimum pass rate threshold (e.g., 90%) and block prompt deploys that don't meet it. Frameworks like [Braintrust](https://www.braintrust.dev/) and [Langfuse](https://langfuse.com/) provide evaluation infrastructure out of the box.

## Cost Controls in Practice

LLM costs scale with usage in ways that sneak up on you:

1. **Use the smallest model that works.** Claude Haiku is 20x cheaper than Sonnet. For classification, extraction, and simple transformations — use it.

2. **Set max_tokens aggressively.** If you expect 100-word summaries, set max_tokens=200, not 4096.

3. **Log every token.** Track input tokens, output tokens, and cost per request in your application metrics.

4. **Alert on anomalies.** A prompt injection that triggers verbose responses can spike costs 100x before you notice.

5. **Batch when possible.** If you're processing 1000 documents, use batch API endpoints (50% discount on most providers).

Building AI-native applications is real software engineering. The models are powerful but unreliable, expensive, and non-deterministic. The discipline comes from applying the same rigor you'd apply to any other external dependency — circuit breakers, caching, testing, versioning, monitoring.

Get that right, and the model quality almost becomes secondary.

---

*What production AI patterns have you found most valuable? I'm especially curious about evaluation approaches — it feels like the most underserved area. Let me know in the comments.*
