---
layout: post
title: "AWS Bedrock vs Azure OpenAI vs Google Vertex AI: Enterprise LLM Platform Comparison 2026"
subtitle: "A deep technical comparison of managed AI platforms for building enterprise-grade LLM applications"
date: 2026-03-20 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80"
catalog: true
tags:
  - AWS
  - Azure
  - GCP
  - LLM
  - AI
  - Cloud
  - Enterprise
---

# AWS Bedrock vs Azure OpenAI vs Google Vertex AI: Enterprise LLM Platform Comparison 2026

Choosing a managed LLM platform is one of the most consequential infrastructure decisions engineering teams face today. The three hyperscaler offerings — **AWS Bedrock**, **Azure OpenAI Service**, and **Google Vertex AI** — have each matured significantly, but their approaches, strengths, and limitations remain meaningfully different.

This is a deep technical comparison for engineering leaders and senior developers making this decision in 2026.

![Cloud computing](https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80)
*Photo by [NASA](https://unsplash.com/@nasa) on Unsplash*

---

## Executive Summary

| Dimension | AWS Bedrock | Azure OpenAI | Google Vertex AI |
|-----------|------------|--------------|-----------------|
| **Model Variety** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **OpenAI Access** | ❌ | ⭐⭐⭐⭐⭐ | ❌ |
| **Enterprise Security** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Ecosystem Integration** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Pricing Transparency** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Agentic Capabilities** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Multimodal** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Fine-tuning** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## AWS Bedrock

### Available Models

```python
import boto3

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

# Model catalog (2026)
models = {
    # Anthropic
    "anthropic.claude-opus-4-0": "Best reasoning, 1M context",
    "anthropic.claude-sonnet-4-5": "Balanced performance",
    "anthropic.claude-haiku-4-0": "Fast, cheap",
    
    # Amazon
    "amazon.nova-premier-v1": "Amazon's flagship",
    "amazon.nova-pro-v1": "Multimodal",
    "amazon.nova-lite-v1": "Fast inference",
    
    # Meta
    "meta.llama3-3-70b-instruct-v1": "Open-weight option",
    "meta.llama3-3-8b-instruct-v1": "Edge deployment",
    
    # Mistral
    "mistral.mistral-large-2-v1": "European GDPR-friendly",
    
    # Cohere
    "cohere.command-r-plus-v1": "RAG-optimized",
}
```

### Basic API Usage

```python
import boto3
import json

client = boto3.client('bedrock-runtime', region_name='us-east-1')

def invoke_claude(prompt: str, model_id: str = "anthropic.claude-sonnet-4-5") -> str:
    """Invoke Claude on Bedrock."""
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 2048,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    })
    
    response = client.invoke_model(
        modelId=model_id,
        contentType="application/json",
        accept="application/json",
        body=body
    )
    
    result = json.loads(response['body'].read())
    return result['content'][0]['text']

# Streaming
def invoke_claude_stream(prompt: str) -> None:
    """Stream Claude response."""
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 2048,
        "messages": [{"role": "user", "content": prompt}]
    })
    
    response = client.invoke_model_with_response_stream(
        modelId="anthropic.claude-sonnet-4-5",
        body=body
    )
    
    for event in response['body']:
        chunk = json.loads(event['chunk']['bytes'])
        if chunk['type'] == 'content_block_delta':
            print(chunk['delta'].get('text', ''), end='', flush=True)
```

### Bedrock Knowledge Bases (RAG)

```python
bedrock_agent = boto3.client('bedrock-agent-runtime', region_name='us-east-1')

def rag_query(question: str, knowledge_base_id: str) -> dict:
    """Query a Bedrock Knowledge Base with RAG."""
    response = bedrock_agent.retrieve_and_generate(
        input={'text': question},
        retrieveAndGenerateConfiguration={
            'type': 'KNOWLEDGE_BASE',
            'knowledgeBaseConfiguration': {
                'knowledgeBaseId': knowledge_base_id,
                'modelArn': 'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-5',
                'retrievalConfiguration': {
                    'vectorSearchConfiguration': {
                        'numberOfResults': 5,
                        'overrideSearchType': 'HYBRID'  # Vector + keyword
                    }
                }
            }
        }
    )
    
    return {
        'answer': response['output']['text'],
        'citations': response.get('citations', [])
    }
```

### Bedrock Agents (Agentic Workflows)

```python
def invoke_agent(agent_id: str, agent_alias_id: str, user_input: str) -> str:
    """Invoke a Bedrock Agent with tool use."""
    session_id = "user-session-123"
    
    response = bedrock_agent.invoke_agent(
        agentId=agent_id,
        agentAliasId=agent_alias_id,
        sessionId=session_id,
        inputText=user_input
    )
    
    full_response = ""
    for event in response['completion']:
        if 'chunk' in event:
            chunk = event['chunk']
            full_response += chunk['bytes'].decode('utf-8')
    
    return full_response
```

### Bedrock Strengths

- **Model diversity**: Largest selection of foundation models
- **AWS ecosystem**: Native IAM, VPC, CloudWatch, S3 integration
- **Data privacy**: Your data never trains foundation models
- **Cross-region inference**: Automatic failover across regions
- **Guardrails**: Built-in content filtering with custom policies

---

## Azure OpenAI Service

### The OpenAI Advantage

```python
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint="https://your-resource.openai.azure.com/",
    api_key="your-api-key",
    api_version="2024-12-01"
)

# Available models (2026)
models = {
    "gpt-4o": "GPT-4o with vision, 128K context",
    "gpt-4o-mini": "Fast, cost-effective",
    "o3": "Frontier reasoning model",
    "o3-mini": "Fast reasoning",
    "gpt-4.5-turbo": "Latest GPT-4.5",
    "text-embedding-3-large": "Best embeddings",
    "dall-e-3": "Image generation",
    "whisper-large-v3": "Speech to text",
    "tts-1-hd": "Text to speech"
}

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain transformer architecture."}
    ],
    max_tokens=2048,
    temperature=0.7
)

print(response.choices[0].message.content)
```

### Azure AI Foundry: The Platform Layer

```python
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential

# Azure AI Foundry (rebranded from Azure AI Studio)
project_client = AIProjectClient.from_connection_string(
    credential=DefaultAzureCredential(),
    conn_str="your-connection-string"
)

# Use Azure AI Search as vector store
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery

search_client = SearchClient(
    endpoint="https://your-search.search.windows.net",
    index_name="documents",
    credential=DefaultAzureCredential()
)

def search_documents(query: str, query_vector: list[float]) -> list:
    """Hybrid search with Azure AI Search."""
    vector_query = VectorizedQuery(
        vector=query_vector,
        k_nearest_neighbors=5,
        fields="content_vector"
    )
    
    results = search_client.search(
        search_text=query,
        vector_queries=[vector_query],
        select=["id", "content", "source"],
        top=5
    )
    
    return [doc for doc in results]
```

### Azure OpenAI Fine-tuning

```python
# Fine-tuning with Azure OpenAI
from openai import AzureOpenAI

client = AzureOpenAI(...)

# Upload training file
with open("training_data.jsonl", "rb") as f:
    training_file = client.files.create(file=f, purpose="fine-tune")

# Create fine-tuning job
fine_tune = client.fine_tuning.jobs.create(
    training_file=training_file.id,
    model="gpt-4o-mini",  # Base model
    hyperparameters={
        "n_epochs": 3,
        "batch_size": 4,
        "learning_rate_multiplier": 0.1
    }
)

# Monitor progress
import time
while fine_tune.status not in ["succeeded", "failed"]:
    time.sleep(30)
    fine_tune = client.fine_tuning.jobs.retrieve(fine_tune.id)
    print(f"Status: {fine_tune.status}")

if fine_tune.status == "succeeded":
    print(f"Fine-tuned model: {fine_tune.fine_tuned_model}")
```

### Azure OpenAI Strengths

- **GPT-4 & o3 access**: Only place to get these with enterprise SLAs
- **Microsoft ecosystem**: Azure Active Directory, Microsoft 365, Teams
- **Compliance**: SOC 2, HIPAA, FedRAMP (higher tier than competitors)
- **Private deployment**: Provisioned throughput units (PTU) for guaranteed capacity
- **Responsible AI**: Azure Content Safety integration

---

## Google Vertex AI

### The Gemini Advantage

```python
import vertexai
from vertexai.generative_models import GenerativeModel, Part

vertexai.init(project="your-project", location="us-central1")

# Available models (2026)
model_catalog = {
    "gemini-2.0-ultra": "Google's flagship, 2M context",
    "gemini-2.0-pro": "Balanced",
    "gemini-2.0-flash": "Fast, multimodal",
    "gemini-2.0-flash-lite": "Cheapest",
    "claude-opus-4-0": "Via Model Garden",
    "llama-3.3-70b": "Via Model Garden",
    "mistral-large": "Via Model Garden",
}

model = GenerativeModel("gemini-2.0-pro")

response = model.generate_content(
    "Explain the CAP theorem with practical examples",
    generation_config={
        "max_output_tokens": 2048,
        "temperature": 0.7,
        "top_p": 0.9,
    }
)

print(response.text)
```

### Multimodal (Gemini's Strongest Feature)

```python
import vertexai
from vertexai.generative_models import GenerativeModel, Part

model = GenerativeModel("gemini-2.0-ultra")

# Video + audio analysis
def analyze_video(video_path: str) -> str:
    """Analyze video content with Gemini."""
    with open(video_path, "rb") as f:
        video_data = f.read()
    
    response = model.generate_content([
        Part.from_data(video_data, mime_type="video/mp4"),
        "Describe what happens in this video, identify any technical issues, and summarize the key points."
    ])
    
    return response.text

# Long document processing (2M context)
def process_long_document(pdf_bytes: bytes, questions: list[str]) -> dict:
    """Process a large PDF with 2M context."""
    answers = {}
    
    for question in questions:
        response = model.generate_content([
            Part.from_data(pdf_bytes, mime_type="application/pdf"),
            question
        ])
        answers[question] = response.text
    
    return answers
```

### Vertex AI Agent Builder

```python
from google.cloud import discoveryengine_v1 as discoveryengine

# Create a RAG application with Agent Builder
def create_search_app():
    client = discoveryengine.SearchServiceClient()
    
    # Search with grounding
    request = discoveryengine.SearchRequest(
        serving_config="projects/your-project/locations/global/collections/default_collection/engines/your-engine/servingConfigs/default_config",
        query="What are the Q4 2025 earnings?",
        page_size=5,
        query_expansion_spec=discoveryengine.SearchRequest.QueryExpansionSpec(
            condition=discoveryengine.SearchRequest.QueryExpansionSpec.Condition.AUTO,
        ),
        spell_correction_spec=discoveryengine.SearchRequest.SpellCorrectionSpec(
            mode=discoveryengine.SearchRequest.SpellCorrectionSpec.Mode.AUTO,
        ),
    )
    
    response = client.search(request=request)
    return response
```

### Vertex AI AutoML & Fine-tuning

```python
from vertexai.language_models import TextGenerationModel
from vertexai.tuning import sft

# Supervised fine-tuning
def fine_tune_gemini(dataset_uri: str):
    """Fine-tune Gemini with your data."""
    sft_tuning_job = sft.train(
        source_model="gemini-2.0-flash",
        train_dataset=dataset_uri,  # GCS URI to JSONL file
        validation_dataset=None,
        epochs=3,
        learning_rate_multiplier=1.0,
        tuned_model_display_name="my-fine-tuned-gemini"
    )
    
    # Wait for completion
    sft_tuning_job.wait()
    print(f"Tuned model: {sft_tuning_job.tuned_model_name}")
    
    return sft_tuning_job.tuned_model_name
```

### Vertex AI Strengths

- **2M context window**: Largest available on any managed platform
- **Best multimodal**: Video, audio, images, documents natively
- **Google ecosystem**: BigQuery, Cloud Storage, Pub/Sub integration
- **Grounding**: Search-grounded responses (live web + Google Search)
- **Fine-tuning flexibility**: Most options for custom model training

---

## Head-to-Head: Key Decision Factors

### 1. Pricing (per 1M tokens, as of 2026)

| Model | Input | Output |
|-------|-------|--------|
| Claude Opus 4 (Bedrock) | $15 | $75 |
| Claude Sonnet 4.5 (Bedrock) | $3 | $15 |
| GPT-4o (Azure) | $5 | $15 |
| o3-mini (Azure) | $1.10 | $4.40 |
| Gemini 2.0 Ultra (Vertex) | $10 | $30 |
| Gemini 2.0 Flash (Vertex) | $0.075 | $0.30 |

### 2. Security & Compliance

```
AWS Bedrock:
✅ Data isolation: Your data never trains foundation models
✅ VPC endpoints: Keep traffic off public internet
✅ KMS encryption: Customer-managed keys
✅ IAM: Fine-grained access control
✅ CloudTrail: Complete audit logging

Azure OpenAI:
✅ RBAC: Azure AD integration
✅ Private endpoints: VNet integration
✅ No data training: Microsoft contractual guarantee
✅ FedRAMP High: Best for US government
✅ HIPAA BAA available

Google Vertex AI:
✅ VPC Service Controls: Data perimeter
✅ CMEK: Customer-managed encryption
✅ VPC peering: Private connectivity
⚠️ Some features require allowing Google to access data
✅ SOC 2, ISO 27001 certified
```

### 3. Latency (P50/P99)

| Platform | P50 | P99 |
|----------|-----|-----|
| AWS Bedrock (Claude Sonnet) | 0.9s | 3.2s |
| Azure OpenAI (GPT-4o) | 1.1s | 4.1s |
| Vertex AI (Gemini Flash) | 0.4s | 1.8s |

---

## Migration Guide: Moving Between Platforms

```python
# Universal LLM client with provider abstraction
from abc import ABC, abstractmethod
from typing import Optional

class LLMProvider(ABC):
    @abstractmethod
    def complete(self, prompt: str, system: Optional[str] = None) -> str:
        pass

class BedrockProvider(LLMProvider):
    def __init__(self, model_id: str = "anthropic.claude-sonnet-4-5"):
        import boto3
        self.client = boto3.client('bedrock-runtime', region_name='us-east-1')
        self.model_id = model_id
    
    def complete(self, prompt: str, system: Optional[str] = None) -> str:
        import json
        messages = [{"role": "user", "content": prompt}]
        body = {"anthropic_version": "bedrock-2023-05-31", "max_tokens": 2048, "messages": messages}
        if system:
            body["system"] = system
        
        response = self.client.invoke_model(modelId=self.model_id, body=json.dumps(body))
        return json.loads(response['body'].read())['content'][0]['text']

class AzureOpenAIProvider(LLMProvider):
    def __init__(self, model: str = "gpt-4o"):
        from openai import AzureOpenAI
        import os
        self.client = AzureOpenAI(
            azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
            api_key=os.environ["AZURE_OPENAI_KEY"],
            api_version="2024-12-01"
        )
        self.model = model
    
    def complete(self, prompt: str, system: Optional[str] = None) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        response = self.client.chat.completions.create(model=self.model, messages=messages)
        return response.choices[0].message.content

class VertexProvider(LLMProvider):
    def __init__(self, model: str = "gemini-2.0-pro"):
        import vertexai
        from vertexai.generative_models import GenerativeModel
        vertexai.init()
        self.model = GenerativeModel(model)
    
    def complete(self, prompt: str, system: Optional[str] = None) -> str:
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        return self.model.generate_content(full_prompt).text
```

---

## Recommendations by Use Case

| Use Case | Recommended Platform | Reason |
|----------|---------------------|--------|
| Already on AWS | **Bedrock** | IAM, VPC, zero egress |
| Need GPT-4o / o3 | **Azure OpenAI** | Only option |
| Video/audio analysis | **Vertex AI** | Gemini multimodal |
| Maximum context (2M+) | **Vertex AI** | Gemini 2.0 Ultra |
| Maximum model choice | **Bedrock** | 50+ models |
| US Government/FedRAMP | **Azure OpenAI** | FedRAMP High |
| Lowest cost at scale | **Vertex AI** | Gemini Flash pricing |
| Best reasoning (non-OpenAI) | **Bedrock** | Claude Opus 4 |

---

## Conclusion

There's no universally "best" platform — each hyperscaler brings distinct advantages:

- **AWS Bedrock**: Best for AWS-native teams, maximum model variety, and enterprise security
- **Azure OpenAI**: Essential for GPT-4 and o3 access, best compliance story, Microsoft ecosystem
- **Vertex AI**: Best for multimodal, largest context windows, and Google data ecosystem

The winning strategy in 2026 is **multi-platform**: use the provider abstraction pattern shown above, and route different workloads to the most cost-effective and capable platform for each use case.

Most enterprises are running all three. You probably should be too.
