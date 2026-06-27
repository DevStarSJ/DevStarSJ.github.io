---
layout: post
title: "Structured Outputs and JSON Mode: Getting Reliable Data from LLMs in Production"
subtitle: "How to use structured output APIs, schema validation, and retry strategies to build LLM pipelines that don't randomly break"
date: 2026-06-27 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - AI
  - LLM
  - StructuredOutputs
  - Pydantic
  - OpenAI
  - Anthropic
  - ProductionAI
---

## The Problem with Free-Form LLM Outputs

You've built an LLM pipeline. You ask the model to extract information and return it as JSON. It works 95% of the time. The other 5%? The model adds a preamble ("Here's the JSON you requested:"), wraps code in markdown fences, returns invalid JSON, or decides to be helpful by adding fields you didn't ask for.

In production, 95% reliability is not reliability. It's a source of incidents.

Structured outputs — the ability to constrain LLM responses to a specific schema — have become one of the most important reliability features in production LLM systems. In 2026, every major provider offers some form of this, and the tooling around it has matured significantly.

![Data Structure](https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1000&auto=format&fit=crop)
*Photo by Markus Spiske on Unsplash*

---

## Provider Support: Where Things Stand in 2026

| Provider | Method | Schema Type | Reliability |
|----------|--------|-------------|-------------|
| **OpenAI** | `response_format: json_schema` | JSON Schema | ~100% (constrained decoding) |
| **Anthropic** | Tool use / `betas: ["structured-json"]` | JSON Schema | ~99.9% |
| **Google Gemini** | `response_mime_type`, `response_schema` | OpenAPI subset | ~99.9% |
| **AWS Bedrock** | Provider-specific | Varies | Varies |
| **Ollama (local)** | `format: json` or schema | JSON Schema | Model-dependent |

The key distinction: **constrained decoding** (OpenAI's approach) vs. **instruction-based** (earlier approaches). Constrained decoding modifies the token sampling process to only allow tokens that would produce valid schema-conforming output. It's mechanically guaranteed, not probabilistic.

---

## OpenAI Structured Outputs: The Reference Implementation

```python
from openai import OpenAI
from pydantic import BaseModel
from typing import Optional

client = OpenAI()

class ExtractedCompany(BaseModel):
    name: str
    industry: str
    founded_year: Optional[int]
    headquarters: str
    employee_count_range: str  # e.g., "100-500", "1000+"
    is_public: bool
    notable_products: list[str]

def extract_company_info(text: str) -> ExtractedCompany:
    response = client.beta.chat.completions.parse(
        model="gpt-4o-2024-11-20",
        messages=[
            {
                "role": "system",
                "content": "Extract company information from the provided text. "
                          "Be precise; use null for fields where information is not present."
            },
            {
                "role": "user",
                "content": text
            }
        ],
        response_format=ExtractedCompany
    )
    
    # If structured outputs worked, this is guaranteed valid
    return response.choices[0].message.parsed

# Usage
company = extract_company_info("""
Stripe was founded in 2010 by Patrick and John Collison. 
The fintech company is headquartered in South San Francisco 
and has over 7,000 employees. Products include Stripe Payments, 
Stripe Connect, and Stripe Billing.
""")

print(company.name)              # "Stripe"
print(company.founded_year)      # 2010
print(company.is_public)         # False
print(company.notable_products)  # ["Stripe Payments", "Stripe Connect", "Stripe Billing"]
```

The `.parse()` method on the beta client handles schema generation from the Pydantic model and deserializes the response automatically. No manual JSON parsing, no try/except for parse errors.

---

## Anthropic: Tool Use Pattern

Anthropic doesn't have native structured outputs in the same way, but tool use with a schema is functionally equivalent:

```python
import anthropic
from pydantic import BaseModel
import json

client = anthropic.Anthropic()

class SentimentAnalysis(BaseModel):
    sentiment: str  # positive, negative, neutral
    confidence: float  # 0.0 to 1.0
    key_phrases: list[str]
    summary: str

def analyze_sentiment(text: str) -> SentimentAnalysis:
    tool_schema = SentimentAnalysis.model_json_schema()
    
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        tools=[{
            "name": "report_sentiment",
            "description": "Report the sentiment analysis results",
            "input_schema": tool_schema
        }],
        tool_choice={"type": "tool", "name": "report_sentiment"},
        messages=[{
            "role": "user",
            "content": f"Analyze the sentiment of this text:\n\n{text}"
        }]
    )
    
    # Extract tool use result
    tool_use = next(
        block for block in response.content 
        if block.type == "tool_use"
    )
    
    return SentimentAnalysis(**tool_use.input)
```

By using `tool_choice={"type": "tool", "name": "..."}`, we force the model to always call our tool — which means it always returns structured data in our schema.

---

## Building a Provider-Agnostic Structured Output Layer

In production, you often want to swap models without rewriting business logic. Here's a clean abstraction:

```python
from abc import ABC, abstractmethod
from typing import TypeVar, Type
from pydantic import BaseModel
import anthropic
import openai

T = TypeVar('T', bound=BaseModel)

class StructuredLLM(ABC):
    @abstractmethod
    def extract(self, prompt: str, schema: Type[T], system: str = "") -> T:
        pass

class OpenAIStructured(StructuredLLM):
    def __init__(self, model: str = "gpt-4o-2024-11-20"):
        self.client = openai.OpenAI()
        self.model = model
    
    def extract(self, prompt: str, schema: Type[T], system: str = "") -> T:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        response = self.client.beta.chat.completions.parse(
            model=self.model,
            messages=messages,
            response_format=schema
        )
        return response.choices[0].message.parsed

class AnthropicStructured(StructuredLLM):
    def __init__(self, model: str = "claude-sonnet-4-5"):
        self.client = anthropic.Anthropic()
        self.model = model
    
    def extract(self, prompt: str, schema: Type[T], system: str = "") -> T:
        tool_name = f"extract_{schema.__name__.lower()}"
        
        kwargs = {
            "model": self.model,
            "max_tokens": 2048,
            "tools": [{
                "name": tool_name,
                "description": f"Extract and return {schema.__name__} data",
                "input_schema": schema.model_json_schema()
            }],
            "tool_choice": {"type": "tool", "name": tool_name},
            "messages": [{"role": "user", "content": prompt}]
        }
        if system:
            kwargs["system"] = system
        
        response = self.client.messages.create(**kwargs)
        tool_use = next(b for b in response.content if b.type == "tool_use")
        return schema(**tool_use.input)

# Usage — same code regardless of provider
def process_document(text: str, llm: StructuredLLM) -> DocumentSummary:
    return llm.extract(
        prompt=f"Summarize this document:\n\n{text}",
        schema=DocumentSummary,
        system="You are a precise document analyzer."
    )

# Swap providers trivially
llm = OpenAIStructured()  # or AnthropicStructured()
summary = process_document(document_text, llm)
```

---

## Schema Design Patterns

### 1. Use Enums for Constrained Values

```python
from enum import Enum

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class IssueClassification(BaseModel):
    priority: Priority  # LLM can only return valid enum values
    category: str
    affected_users: int
```

### 2. Use Optional for Uncertain Fields

```python
from typing import Optional

class PersonInfo(BaseModel):
    name: str                      # Required — fail if not present
    email: Optional[str] = None    # Optional — null if not found
    age: Optional[int] = None      # Optional — null if not mentioned
    company: Optional[str] = None
```

### 3. Nested Schemas for Complex Data

```python
class Address(BaseModel):
    street: str
    city: str
    country: str
    postal_code: str

class ContactInfo(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[Address] = None  # Nested object

class BusinessCard(BaseModel):
    contacts: list[ContactInfo]    # Array of nested objects
    notes: str
```

### 4. Field Descriptions for Better Extraction

```python
from pydantic import Field

class FinancialMetrics(BaseModel):
    revenue: float = Field(description="Annual revenue in USD millions")
    growth_rate: float = Field(description="Year-over-year growth rate as percentage, e.g., 23.5 for 23.5%")
    profit_margin: float = Field(description="Net profit margin as percentage")
    fiscal_year: int = Field(description="Fiscal year this data refers to, e.g., 2025")
```

Field descriptions are included in the schema sent to the model and significantly improve extraction accuracy for ambiguous fields.

---

## Error Handling and Retry Strategy

Even with structured outputs, production code needs defensive handling:

```python
import time
from typing import Optional

class StructuredExtractionError(Exception):
    pass

def extract_with_retry(
    llm: StructuredLLM,
    prompt: str,
    schema: Type[T],
    max_attempts: int = 3,
    fallback_value: Optional[T] = None
) -> T:
    last_error = None
    
    for attempt in range(max_attempts):
        try:
            result = llm.extract(prompt, schema)
            
            # Additional validation beyond schema
            validate_business_rules(result)
            
            return result
            
        except ValidationError as e:
            # Pydantic validation failed — schema conformant but invalid values
            last_error = e
            if attempt < max_attempts - 1:
                # Add error context to prompt and retry
                error_context = f"\n\nPrevious attempt failed validation: {str(e)}\nPlease ensure values meet the constraints."
                prompt = prompt + error_context
                time.sleep(0.5 * (attempt + 1))  # exponential backoff
        
        except Exception as e:
            last_error = e
            if attempt < max_attempts - 1:
                time.sleep(1.0 * (attempt + 1))
    
    if fallback_value is not None:
        return fallback_value
    
    raise StructuredExtractionError(
        f"Failed after {max_attempts} attempts"
    ) from last_error

def validate_business_rules(result: BaseModel):
    """Additional validation beyond Pydantic schema."""
    if hasattr(result, 'confidence') and not (0 <= result.confidence <= 1):
        raise ValidationError("confidence must be between 0 and 1")
    if hasattr(result, 'email') and result.email and '@' not in result.email:
        raise ValidationError(f"Invalid email format: {result.email}")
```

---

## Performance Considerations

Structured outputs have overhead:
- Schema is included in the prompt (token cost)
- Constrained decoding can be slightly slower per token
- Tool use adds a round-trip overhead in some providers

Optimization strategies:

```python
# 1. Keep schemas lean — only extract what you need
class MinimalExtraction(BaseModel):
    key_fact: str       # Don't add 10 optional fields "just in case"
    confidence: float

# 2. Batch when possible
def batch_extract(texts: list[str], schema: Type[T]) -> list[T]:
    # Some providers support batch APIs
    # Or use asyncio for parallel requests
    import asyncio
    
    async def extract_one(text: str) -> T:
        return await async_llm.extract(text, schema)
    
    return asyncio.run(
        asyncio.gather(*[extract_one(t) for t in texts])
    )

# 3. Cache schema compilation
from functools import lru_cache

@lru_cache(maxsize=128)
def get_compiled_schema(model_class: Type[BaseModel]) -> dict:
    return model_class.model_json_schema()
```

---

## Conclusion

Structured outputs have transformed LLM pipeline reliability in production. The combination of:

1. **Provider-level schema enforcement** (OpenAI's constrained decoding, Anthropic's tool forcing)
2. **Pydantic models** for Python-native type safety
3. **Field descriptions** for extraction accuracy
4. **Retry strategies** for the edge cases that still slip through
5. **Provider abstraction** for flexibility

...gives you the reliability needed to ship LLM features to production with confidence.

The 5% failure rate that plagued prompt-engineering-only approaches drops to under 0.1% with properly implemented structured outputs. For pipelines processing thousands of documents per day, that difference is the gap between a reliable product and an ops nightmare.

---

*Are you using structured outputs in your LLM pipelines? What's been your experience with schema design for complex nested extractions? I'd love to hear what patterns have worked for your team.*
