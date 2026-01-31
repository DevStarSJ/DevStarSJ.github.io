---
layout: post
title: "OpenAI API Python Tutorial: Complete Guide to GPT-4 Integration"
subtitle: Master OpenAI's API with practical Python examples
categories: development
tags: python ai
comments: true
---

# OpenAI API Python Tutorial: Complete Guide to GPT-4 Integration

Learn how to integrate OpenAI's powerful GPT-4 and other models into your Python applications. This comprehensive tutorial covers everything from basic setup to advanced features.

## Getting Started

### Installation

```bash
pip install openai python-dotenv
```

### API Key Setup

```python
# .env file
OPENAI_API_KEY=sk-your-api-key-here
```

```python
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI()  # Automatically uses OPENAI_API_KEY
```

## Basic Chat Completion

### Simple Request

```python
response = client.chat.completions.create(
    model="gpt-4-turbo-preview",
    messages=[
        {"role": "user", "content": "Explain quantum computing in simple terms"}
    ]
)

print(response.choices[0].message.content)
```

### With System Prompt

```python
response = client.chat.completions.create(
    model="gpt-4-turbo-preview",
    messages=[
        {"role": "system", "content": "You are a helpful coding assistant."},
        {"role": "user", "content": "Write a Python function to sort a list"}
    ],
    temperature=0.7,
    max_tokens=1000
)
```

### Conversation History

```python
messages = [
    {"role": "system", "content": "You are a helpful assistant."}
]

def chat(user_message):
    messages.append({"role": "user", "content": user_message})
    
    response = client.chat.completions.create(
        model="gpt-4-turbo-preview",
        messages=messages
    )
    
    assistant_message = response.choices[0].message.content
    messages.append({"role": "assistant", "content": assistant_message})
    
    return assistant_message

# Example conversation
print(chat("My name is Alice"))
print(chat("What's my name?"))  # Remembers: Alice
```

## Streaming Responses

```python
stream = client.chat.completions.create(
    model="gpt-4-turbo-preview",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

## Function Calling (Tools)

### Define Functions

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name, e.g., 'San Francisco, CA'"
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "Temperature unit"
                    }
                },
                "required": ["location"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "Search for products in the database",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "max_price": {"type": "number"},
                    "category": {"type": "string"}
                },
                "required": ["query"]
            }
        }
    }
]
```

### Use Functions

```python
import json

def get_weather(location, unit="celsius"):
    # Actual implementation would call weather API
    return {"temperature": 22, "condition": "sunny", "location": location}

def search_products(query, max_price=None, category=None):
    # Actual implementation would query database
    return [{"name": f"Product matching '{query}'", "price": 29.99}]

# Map function names to actual functions
available_functions = {
    "get_weather": get_weather,
    "search_products": search_products
}

def process_with_tools(user_message):
    messages = [{"role": "user", "content": user_message}]
    
    response = client.chat.completions.create(
        model="gpt-4-turbo-preview",
        messages=messages,
        tools=tools,
        tool_choice="auto"
    )
    
    response_message = response.choices[0].message
    
    # Check if model wants to call a function
    if response_message.tool_calls:
        messages.append(response_message)
        
        for tool_call in response_message.tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)
            
            # Call the function
            function_response = available_functions[function_name](**function_args)
            
            # Add function result to messages
            messages.append({
                "tool_call_id": tool_call.id,
                "role": "tool",
                "name": function_name,
                "content": json.dumps(function_response)
            })
        
        # Get final response
        final_response = client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=messages
        )
        return final_response.choices[0].message.content
    
    return response_message.content

# Test
print(process_with_tools("What's the weather in Tokyo?"))
```

## Vision (GPT-4 Vision)

### Analyze Image from URL

```python
response = client.chat.completions.create(
    model="gpt-4-vision-preview",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "What's in this image?"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://example.com/image.jpg"
                    }
                }
            ]
        }
    ],
    max_tokens=500
)
print(response.choices[0].message.content)
```

### Analyze Local Image

```python
import base64

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")

base64_image = encode_image("local_image.jpg")

response = client.chat.completions.create(
    model="gpt-4-vision-preview",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Describe this image in detail"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_image}"
                    }
                }
            ]
        }
    ]
)
```

## Embeddings

### Create Embeddings

```python
response = client.embeddings.create(
    model="text-embedding-3-small",
    input="The quick brown fox jumps over the lazy dog"
)

embedding = response.data[0].embedding
print(f"Embedding dimension: {len(embedding)}")
```

### Batch Embeddings

```python
texts = [
    "Machine learning is fascinating",
    "Deep learning uses neural networks",
    "Natural language processing is AI"
]

response = client.embeddings.create(
    model="text-embedding-3-small",
    input=texts
)

embeddings = [item.embedding for item in response.data]
```

### Semantic Search Example

```python
import numpy as np

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# Create document embeddings
documents = [
    "Python is a programming language",
    "Machine learning uses algorithms",
    "Cats are popular pets"
]

doc_embeddings = client.embeddings.create(
    model="text-embedding-3-small",
    input=documents
).data

# Search
query = "What is Python?"
query_embedding = client.embeddings.create(
    model="text-embedding-3-small",
    input=query
).data[0].embedding

# Find most similar
similarities = [
    cosine_similarity(query_embedding, doc.embedding)
    for doc in doc_embeddings
]

best_match_idx = np.argmax(similarities)
print(f"Best match: {documents[best_match_idx]}")
```

## Image Generation (DALL-E 3)

```python
response = client.images.generate(
    model="dall-e-3",
    prompt="A futuristic city with flying cars at sunset",
    size="1024x1024",
    quality="standard",
    n=1
)

image_url = response.data[0].url
print(f"Image URL: {image_url}")
```

## Audio (Whisper & TTS)

### Speech to Text

```python
audio_file = open("speech.mp3", "rb")
transcript = client.audio.transcriptions.create(
    model="whisper-1",
    file=audio_file
)
print(transcript.text)
```

### Text to Speech

```python
response = client.audio.speech.create(
    model="tts-1",
    voice="alloy",  # alloy, echo, fable, onyx, nova, shimmer
    input="Hello! This is AI-generated speech."
)

response.stream_to_file("output.mp3")
```

## JSON Mode

```python
response = client.chat.completions.create(
    model="gpt-4-turbo-preview",
    messages=[
        {"role": "system", "content": "Output valid JSON only"},
        {"role": "user", "content": "List 3 programming languages with their uses"}
    ],
    response_format={"type": "json_object"}
)

import json
data = json.loads(response.choices[0].message.content)
print(data)
```

## Error Handling

```python
from openai import OpenAI, APIError, RateLimitError, APIConnectionError
import time

client = OpenAI()

def robust_completion(messages, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=messages
            )
            return response.choices[0].message.content
            
        except RateLimitError:
            wait_time = 2 ** attempt
            print(f"Rate limited. Waiting {wait_time}s...")
            time.sleep(wait_time)
            
        except APIConnectionError:
            print("Connection error. Retrying...")
            time.sleep(1)
            
        except APIError as e:
            print(f"API error: {e}")
            raise
    
    raise Exception("Max retries exceeded")
```

## Token Counting

```python
import tiktoken

def count_tokens(text, model="gpt-4"):
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

# Example
text = "Hello, how are you doing today?"
tokens = count_tokens(text)
print(f"Token count: {tokens}")

# Estimate cost (GPT-4 Turbo: $10/1M input, $30/1M output)
cost_input = (tokens / 1_000_000) * 10
print(f"Estimated input cost: ${cost_input:.6f}")
```

## Async Usage

```python
import asyncio
from openai import AsyncOpenAI

async_client = AsyncOpenAI()

async def async_completion(prompt):
    response = await async_client.chat.completions.create(
        model="gpt-4-turbo-preview",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

async def main():
    prompts = [
        "What is Python?",
        "What is JavaScript?",
        "What is Rust?"
    ]
    
    tasks = [async_completion(p) for p in prompts]
    results = await asyncio.gather(*tasks)
    
    for prompt, result in zip(prompts, results):
        print(f"Q: {prompt}\nA: {result[:100]}...\n")

asyncio.run(main())
```

## Complete Application Example

```python
from openai import OpenAI
import json

class AIAssistant:
    def __init__(self, system_prompt="You are a helpful assistant."):
        self.client = OpenAI()
        self.system_prompt = system_prompt
        self.history = []
        
    def chat(self, message, temperature=0.7):
        self.history.append({"role": "user", "content": message})
        
        messages = [
            {"role": "system", "content": self.system_prompt},
            *self.history
        ]
        
        response = self.client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=messages,
            temperature=temperature
        )
        
        reply = response.choices[0].message.content
        self.history.append({"role": "assistant", "content": reply})
        
        return reply
    
    def clear_history(self):
        self.history = []
        
    def analyze_image(self, image_url, question="What's in this image?"):
        response = self.client.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": question},
                    {"type": "image_url", "image_url": {"url": image_url}}
                ]
            }]
        )
        return response.choices[0].message.content

# Usage
assistant = AIAssistant("You are a Python expert.")
print(assistant.chat("How do I read a CSV file?"))
print(assistant.chat("Can you show me an example?"))
```

## Conclusion

OpenAI's API provides powerful capabilities:

- **Chat**: Conversational AI with GPT-4
- **Vision**: Image understanding
- **Functions**: Tool use and API integration
- **Embeddings**: Semantic search and similarity
- **Audio**: Speech recognition and synthesis

Start with simple completions and gradually explore advanced features!

---

*Happy coding with OpenAI!*
