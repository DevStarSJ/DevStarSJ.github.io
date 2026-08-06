---
layout: post
title: "Anthropic Claude 4 API: Complete Developer Guide for 2026"
subtitle: "Build powerful AI applications with Claude 4's extended context, multimodal capabilities, and tool use"
date: 2026-03-20 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&auto=format&fit=crop&q=80"
catalog: true
tags:
  - AI
  - Claude
  - Anthropic
  - LLM
  - API
  - Python
---

# Anthropic Claude 4 API: Complete Developer Guide for 2026

The release of **Claude 4** marks a significant leap in AI capabilities, offering developers unprecedented context windows, enhanced reasoning, and native multimodal support. This guide walks you through everything you need to build production-ready applications with the Claude 4 API.

![Claude 4 API](https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&auto=format&fit=crop&q=80)
*Photo by [Google DeepMind](https://unsplash.com/@googledeepmind) on Unsplash*

---

## Why Claude 4?

Claude 4 brings several game-changing improvements over previous generations:

| Feature | Claude 3.5 | Claude 4 |
|---------|-----------|---------|
| Context Window | 200K tokens | 1M tokens |
| Multimodal | Images only | Images, Video, Audio |
| Tool Use | Basic | Parallel + chained |
| Reasoning | Standard | Extended thinking |
| Latency | ~2s | ~0.8s (cached) |

---

## Getting Started

### Installation

```bash
pip install anthropic>=0.40.0
```

### Basic Setup

```python
import anthropic

client = anthropic.Anthropic(
    api_key="your-api-key-here"
)
```

---

## Core API Usage

### Simple Text Generation

```python
message = client.messages.create(
    model="claude-opus-4-0",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Explain quantum computing in simple terms."}
    ]
)

print(message.content[0].text)
```

### Streaming Responses

For real-time output in user-facing applications:

```python
with client.messages.stream(
    model="claude-opus-4-0",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Write a Python web scraper"}],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

---

## Extended Context: The 1M Token Window

Claude 4's 1 million token context window opens up use cases that were previously impossible.

### Processing Large Codebases

```python
import os
from pathlib import Path

def load_codebase(directory: str) -> str:
    """Load an entire codebase into context."""
    files_content = []
    
    for path in Path(directory).rglob("*.py"):
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            files_content.append(f"# File: {path}\n{content}")
    
    return "\n\n".join(files_content)

codebase = load_codebase("./my_project")

response = client.messages.create(
    model="claude-opus-4-0",
    max_tokens=4096,
    messages=[
        {
            "role": "user",
            "content": f"Here is our entire codebase:\n\n{codebase}\n\nIdentify all security vulnerabilities and suggest fixes."
        }
    ]
)
```

### Document Analysis at Scale

```python
def analyze_legal_documents(pdf_texts: list[str]) -> dict:
    """Analyze multiple legal documents simultaneously."""
    combined = "\n\n---DOCUMENT SEPARATOR---\n\n".join(pdf_texts)
    
    response = client.messages.create(
        model="claude-opus-4-0",
        max_tokens=8192,
        system="You are a legal analyst. Extract key clauses, identify risks, and summarize obligations.",
        messages=[
            {
                "role": "user",
                "content": f"Analyze these {len(pdf_texts)} contracts and provide a comparative summary:\n\n{combined}"
            }
        ]
    )
    
    return {"analysis": response.content[0].text}
```

---

## Tool Use (Function Calling)

Claude 4 supports parallel tool execution, dramatically speeding up agent workflows.

### Defining Tools

```python
tools = [
    {
        "name": "search_web",
        "description": "Search the web for current information",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query"
                },
                "num_results": {
                    "type": "integer",
                    "description": "Number of results to return",
                    "default": 5
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "execute_code",
        "description": "Execute Python code and return results",
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "Python code to execute"
                }
            },
            "required": ["code"]
        }
    }
]
```

### Agentic Loop with Parallel Tools

```python
import json

def run_agent(user_message: str, tools: list, tool_handlers: dict) -> str:
    """Run an agent loop with parallel tool execution."""
    messages = [{"role": "user", "content": user_message}]
    
    while True:
        response = client.messages.create(
            model="claude-opus-4-0",
            max_tokens=4096,
            tools=tools,
            messages=messages
        )
        
        # Check stop reason
        if response.stop_reason == "end_turn":
            # Extract final text
            for block in response.content:
                if block.type == "text":
                    return block.text
        
        elif response.stop_reason == "tool_use":
            # Execute all tool calls in parallel
            tool_results = []
            
            for block in response.content:
                if block.type == "tool_use":
                    tool_name = block.name
                    tool_input = block.input
                    
                    # Execute tool
                    if tool_name in tool_handlers:
                        result = tool_handlers[tool_name](**tool_input)
                    else:
                        result = {"error": f"Unknown tool: {tool_name}"}
                    
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result)
                    })
            
            # Add assistant response and tool results to messages
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
        
        else:
            break
    
    return "Agent completed without final response"
```

---

## Multimodal: Vision Capabilities

### Analyzing Images

```python
import base64

def analyze_image(image_path: str, question: str) -> str:
    """Analyze an image with Claude 4."""
    with open(image_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")
    
    # Detect media type
    ext = image_path.split(".")[-1].lower()
    media_types = {"jpg": "image/jpeg", "jpeg": "image/jpeg", 
                   "png": "image/png", "gif": "image/gif", 
                   "webp": "image/webp"}
    media_type = media_types.get(ext, "image/jpeg")
    
    response = client.messages.create(
        model="claude-opus-4-0",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": question
                    }
                ],
            }
        ],
    )
    
    return response.content[0].text

# Example: UI screenshot analysis
result = analyze_image(
    "screenshot.png", 
    "Identify all UI elements and suggest accessibility improvements"
)
```

---

## Prompt Caching: Slash Your Costs

Claude 4 supports prompt caching for repeated large contexts, reducing costs by up to 90%.

```python
# Cache a large system prompt + context
response = client.messages.create(
    model="claude-opus-4-0",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": "You are an expert software architect with 20 years of experience.",
        },
        {
            "type": "text",
            "text": "<large_documentation>..." + large_doc_content + "</large_documentation>",
            "cache_control": {"type": "ephemeral"}  # Cache this block
        }
    ],
    messages=[{"role": "user", "content": "What are the main architectural patterns used?"}]
)

# Check cache usage
print(f"Cache read tokens: {response.usage.cache_read_input_tokens}")
print(f"Cache write tokens: {response.usage.cache_creation_input_tokens}")
```

---

## Extended Thinking Mode

For complex reasoning tasks, enable extended thinking:

```python
response = client.messages.create(
    model="claude-opus-4-0",
    max_tokens=16000,
    thinking={
        "type": "enabled",
        "budget_tokens": 10000  # Allow up to 10K tokens for thinking
    },
    messages=[{
        "role": "user", 
        "content": "Design a distributed system for handling 1 million concurrent WebSocket connections with sub-10ms latency."
    }]
)

# Access thinking blocks
for block in response.content:
    if block.type == "thinking":
        print("THINKING:", block.thinking[:200] + "...")
    elif block.type == "text":
        print("RESPONSE:", block.text)
```

---

## Production Best Practices

### Rate Limiting & Retry Logic

```python
import time
import anthropic
from anthropic import RateLimitError, APIStatusError

def call_with_retry(client, max_retries=3, **kwargs):
    """Call Claude with exponential backoff retry."""
    for attempt in range(max_retries):
        try:
            return client.messages.create(**kwargs)
        except RateLimitError:
            if attempt < max_retries - 1:
                wait_time = (2 ** attempt) * 1  # 1, 2, 4 seconds
                print(f"Rate limited. Waiting {wait_time}s...")
                time.sleep(wait_time)
            else:
                raise
        except APIStatusError as e:
            if e.status_code >= 500 and attempt < max_retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise
```

### Cost Estimation

```python
# Claude 4 pricing (approximate)
PRICING = {
    "claude-opus-4-0": {
        "input": 15.00 / 1_000_000,   # $15 per 1M input tokens
        "output": 75.00 / 1_000_000,   # $75 per 1M output tokens
        "cache_write": 18.75 / 1_000_000,
        "cache_read": 1.50 / 1_000_000,
    },
    "claude-sonnet-4-5": {
        "input": 3.00 / 1_000_000,
        "output": 15.00 / 1_000_000,
        "cache_write": 3.75 / 1_000_000,
        "cache_read": 0.30 / 1_000_000,
    }
}

def estimate_cost(usage, model="claude-sonnet-4-5"):
    pricing = PRICING[model]
    cost = (
        usage.input_tokens * pricing["input"] +
        usage.output_tokens * pricing["output"] +
        getattr(usage, 'cache_creation_input_tokens', 0) * pricing["cache_write"] +
        getattr(usage, 'cache_read_input_tokens', 0) * pricing["cache_read"]
    )
    return cost
```

---

## Real-World Use Cases

### 1. Automated Code Review System

{% raw %}
```python
def code_review_agent(pr_diff: str) -> dict:
    """Automated PR review with structured output."""
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=4096,
        system="You are a senior engineer. Review code for bugs, security issues, performance problems, and style violations. Return JSON.",
        messages=[{
            "role": "user",
            "content": f"Review this PR:\n\n```diff\n{pr_diff}\n```\n\nReturn JSON with: {{summary, critical_issues, warnings, suggestions, approved}}"
        }]
    )
    
    import json
    return json.loads(response.content[0].text)
```
{% endraw %}

### 2. RAG-Powered Knowledge Base

```python
def rag_answer(question: str, retrieved_docs: list[str]) -> str:
    """Answer questions using retrieved context."""
    context = "\n\n".join([f"[Doc {i+1}]: {doc}" for i, doc in enumerate(retrieved_docs)])
    
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2048,
        system="Answer questions based solely on the provided documents. Cite specific documents.",
        messages=[{
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {question}"
        }]
    )
    
    return response.content[0].text
```

---

## Choosing the Right Model

- **claude-opus-4-0**: Maximum intelligence, complex reasoning, long-context tasks
- **claude-sonnet-4-5**: Best balance of speed and capability (recommended for most apps)
- **claude-haiku-4-0**: Fastest and cheapest, ideal for high-volume, simple tasks

---

## Conclusion

Claude 4's API provides a powerful foundation for building next-generation AI applications. The combination of 1M token context, native multimodal support, parallel tool use, and extended thinking makes it suitable for everything from simple chatbots to complex autonomous agents.

Start with `claude-sonnet-4-5` for most use cases, upgrade to `claude-opus-4-0` for tasks requiring maximum reasoning, and use `claude-haiku-4-0` for high-volume, latency-sensitive applications.

The future of software development is AI-augmented — and Claude 4's API gives you the tools to build it today.
