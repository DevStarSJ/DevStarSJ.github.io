---
layout: post
title: "Claude API Python Tutorial: Complete Anthropic Integration Guide"
subtitle: Build powerful applications with Anthropic's Claude AI
categories: development
tags: python ai
comments: true
---

# Claude API Python Tutorial: Complete Anthropic Integration Guide

Claude by Anthropic is known for its exceptional reasoning, writing quality, and safety features. This tutorial covers everything you need to integrate Claude into your Python applications.

## Getting Started

### Installation

```bash
pip install anthropic python-dotenv
```

### Setup

```python
import os
from dotenv import load_dotenv
import anthropic

load_dotenv()
client = anthropic.Anthropic()  # Uses ANTHROPIC_API_KEY env var
```

## Basic Messages

### Simple Request

```python
message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Explain machine learning in simple terms"}
    ]
)

print(message.content[0].text)
```

### With System Prompt

```python
message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    system="You are a senior Python developer. Provide clean, well-documented code.",
    messages=[
        {"role": "user", "content": "Write a function to validate email addresses"}
    ]
)
```

### Temperature and Parameters

```python
message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=2048,
    temperature=0.7,  # 0-1, higher = more creative
    messages=[
        {"role": "user", "content": "Write a creative short story"}
    ]
)
```

## Available Models

| Model | Best For | Context | Price (Input/Output per 1M) |
|-------|----------|---------|----------------------------|
| claude-3-5-sonnet-20241022 | Best all-around | 200K | $3 / $15 |
| claude-3-opus-20240229 | Complex tasks | 200K | $15 / $75 |
| claude-3-haiku-20240307 | Fast, simple tasks | 200K | $0.25 / $1.25 |

## Conversation History

```python
class ClaudeChat:
    def __init__(self, system_prompt="You are a helpful assistant."):
        self.client = anthropic.Anthropic()
        self.system = system_prompt
        self.history = []
    
    def chat(self, user_message):
        self.history.append({"role": "user", "content": user_message})
        
        message = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            system=self.system,
            messages=self.history
        )
        
        response = message.content[0].text
        self.history.append({"role": "assistant", "content": response})
        
        return response
    
    def clear(self):
        self.history = []

# Usage
chat = ClaudeChat("You are a Python expert.")
print(chat.chat("What's a decorator?"))
print(chat.chat("Can you show me an example?"))
```

## Streaming Responses

```python
with client.messages.stream(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Tell me a story about AI"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

### Streaming with Events

```python
with client.messages.stream(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Explain quantum physics"}]
) as stream:
    for event in stream:
        if event.type == "content_block_delta":
            print(event.delta.text, end="", flush=True)
        elif event.type == "message_stop":
            print("\n--- Complete ---")
```

## Vision (Image Analysis)

### Image from URL

```python
import httpx

# Download image
image_url = "https://example.com/image.jpg"
image_data = httpx.get(image_url).content
import base64
base64_image = base64.b64encode(image_data).decode("utf-8")

message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": base64_image
                    }
                },
                {
                    "type": "text",
                    "text": "What's in this image?"
                }
            ]
        }
    ]
)
```

### Local Image

```python
import base64

def analyze_image(image_path, question="Describe this image"):
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")
    
    # Determine media type
    ext = image_path.split(".")[-1].lower()
    media_type = f"image/{ext}" if ext != "jpg" else "image/jpeg"
    
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
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
                            "data": image_data
                        }
                    },
                    {"type": "text", "text": question}
                ]
            }
        ]
    )
    return message.content[0].text

result = analyze_image("photo.jpg", "What objects are in this photo?")
```

## Tool Use (Function Calling)

### Define Tools

```python
tools = [
    {
        "name": "get_weather",
        "description": "Get the current weather for a location",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "City and state, e.g., San Francisco, CA"
                },
                "unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "Temperature unit"
                }
            },
            "required": ["location"]
        }
    },
    {
        "name": "calculator",
        "description": "Perform mathematical calculations",
        "input_schema": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Math expression to evaluate"
                }
            },
            "required": ["expression"]
        }
    }
]
```

### Process Tool Calls

```python
import json

def get_weather(location, unit="celsius"):
    # Mock implementation
    return {"temperature": 22, "condition": "sunny", "location": location}

def calculator(expression):
    try:
        return {"result": eval(expression)}
    except:
        return {"error": "Invalid expression"}

tool_functions = {
    "get_weather": get_weather,
    "calculator": calculator
}

def process_with_tools(user_message):
    messages = [{"role": "user", "content": user_message}]
    
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        tools=tools,
        messages=messages
    )
    
    # Check if Claude wants to use tools
    if response.stop_reason == "tool_use":
        tool_results = []
        
        for content in response.content:
            if content.type == "tool_use":
                tool_name = content.name
                tool_input = content.input
                
                # Execute the tool
                result = tool_functions[tool_name](**tool_input)
                
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": content.id,
                    "content": json.dumps(result)
                })
        
        # Send results back to Claude
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})
        
        final_response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            tools=tools,
            messages=messages
        )
        
        return final_response.content[0].text
    
    return response.content[0].text

# Test
print(process_with_tools("What's the weather in Tokyo?"))
print(process_with_tools("What's 125 * 48?"))
```

## Extended Thinking (Claude 3.5)

For complex reasoning tasks:

```python
message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=8192,
    messages=[
        {
            "role": "user",
            "content": """Solve this step by step:
            
A company has 3 departments with the following data:
- Sales: 50 employees, avg salary $60,000
- Engineering: 80 employees, avg salary $90,000
- Marketing: 30 employees, avg salary $55,000

Calculate:
1. Total payroll
2. Company average salary
3. What % of payroll goes to Engineering?"""
        }
    ]
)
```

## PDF and Document Analysis

```python
import base64

def analyze_pdf(pdf_path, question="Summarize this document"):
    with open(pdf_path, "rb") as f:
        pdf_data = base64.b64encode(f.read()).decode("utf-8")
    
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": pdf_data
                        }
                    },
                    {"type": "text", "text": question}
                ]
            }
        ]
    )
    return message.content[0].text
```

## Error Handling

```python
from anthropic import APIError, RateLimitError, APIConnectionError
import time

def robust_message(messages, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=messages
            )
            return response.content[0].text
            
        except RateLimitError:
            wait = 2 ** attempt
            print(f"Rate limited, waiting {wait}s...")
            time.sleep(wait)
            
        except APIConnectionError:
            print("Connection error, retrying...")
            time.sleep(1)
            
        except APIError as e:
            print(f"API error: {e}")
            raise
    
    raise Exception("Max retries exceeded")
```

## Async Usage

```python
import asyncio
from anthropic import AsyncAnthropic

async_client = AsyncAnthropic()

async def async_message(prompt):
    message = await async_client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text

async def main():
    prompts = [
        "What is Python?",
        "What is JavaScript?",
        "What is Rust?"
    ]
    
    tasks = [async_message(p) for p in prompts]
    results = await asyncio.gather(*tasks)
    
    for p, r in zip(prompts, results):
        print(f"Q: {p}\nA: {r[:100]}...\n")

asyncio.run(main())
```

## Best Practices

### 1. Use Appropriate Model

```python
# Fast, simple tasks
model = "claude-3-haiku-20240307"

# General purpose (recommended)
model = "claude-3-5-sonnet-20241022"

# Complex reasoning
model = "claude-3-opus-20240229"
```

### 2. Optimize Token Usage

```python
# Be concise in prompts
# Use system prompts for instructions
# Set appropriate max_tokens
```

### 3. Handle Long Conversations

```python
def trim_history(history, max_messages=20):
    """Keep conversation manageable."""
    if len(history) > max_messages:
        # Keep system context but trim old messages
        return history[-max_messages:]
    return history
```

## Complete Application

```python
import anthropic
from typing import Optional

class ClaudeAssistant:
    def __init__(
        self,
        system: str = "You are a helpful assistant.",
        model: str = "claude-3-5-sonnet-20241022"
    ):
        self.client = anthropic.Anthropic()
        self.system = system
        self.model = model
        self.history = []
    
    def chat(
        self,
        message: str,
        temperature: float = 0.7,
        max_tokens: int = 1024
    ) -> str:
        self.history.append({"role": "user", "content": message})
        
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=self.system,
            messages=self.history
        )
        
        reply = response.content[0].text
        self.history.append({"role": "assistant", "content": reply})
        
        return reply
    
    def stream_chat(self, message: str):
        self.history.append({"role": "user", "content": message})
        
        full_response = ""
        with self.client.messages.stream(
            model=self.model,
            max_tokens=1024,
            system=self.system,
            messages=self.history
        ) as stream:
            for text in stream.text_stream:
                full_response += text
                yield text
        
        self.history.append({"role": "assistant", "content": full_response})
    
    def clear_history(self):
        self.history = []

# Usage
assistant = ClaudeAssistant("You are a Python coding expert.")

# Regular chat
response = assistant.chat("How do I read a JSON file?")
print(response)

# Streaming
for chunk in assistant.stream_chat("Show me an example"):
    print(chunk, end="", flush=True)
```

## Conclusion

Claude's API offers:
- Exceptional writing and reasoning
- Vision capabilities
- Tool use for complex workflows
- Long context windows (200K tokens)

Start with Sonnet for most use cases—it offers the best balance of quality and cost!

---

*Build amazing things with Claude!*
