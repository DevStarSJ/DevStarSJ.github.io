---
layout: post
title: "How to Run Local LLM with Ollama: Complete Setup Guide"
subtitle: Run powerful AI models on your own computer for free
categories: development
tags: python ai
comments: true
---

# How to Run Local LLM with Ollama: Complete Setup Guide

Running Large Language Models locally gives you privacy, no API costs, and offline access. Ollama makes this incredibly simple. This guide covers everything from installation to running advanced models on your machine.

## Why Run LLMs Locally?

- **Privacy**: Your data never leaves your machine
- **No API Costs**: Free unlimited usage
- **Offline Access**: Works without internet
- **Speed**: No network latency
- **Customization**: Fine-tune and modify models

## System Requirements

### Minimum Requirements
- 8GB RAM (for 7B models)
- Modern CPU (Intel/AMD)
- 10GB disk space

### Recommended for Best Performance
- 16GB+ RAM (for larger models)
- NVIDIA GPU with 8GB+ VRAM
- SSD storage

## Installing Ollama

### macOS

```bash
# Using Homebrew
brew install ollama

# Or download directly
curl -fsSL https://ollama.com/install.sh | sh
```

### Linux

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Windows

Download the installer from [ollama.com/download](https://ollama.com/download)

### Docker

```bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

## Starting Ollama

```bash
# Start the Ollama service
ollama serve
```

The service runs on `http://localhost:11434`

## Downloading and Running Models

### Popular Models

```bash
# Llama 3.2 (Latest from Meta)
ollama pull llama3.2

# Mistral (Fast and efficient)
ollama pull mistral

# CodeLlama (Optimized for coding)
ollama pull codellama

# Phi-2 (Microsoft's small but powerful model)
ollama pull phi

# Gemma (Google's open model)
ollama pull gemma
```

### Model Sizes

| Model | Size | RAM Required | Best For |
|-------|------|--------------|----------|
| phi | 2.7B | 4GB | Quick tasks, low resources |
| mistral | 7B | 8GB | General purpose |
| llama3.2 | 8B | 10GB | Balanced performance |
| llama3.2:70b | 70B | 48GB+ | Maximum quality |
| codellama | 7B | 8GB | Code generation |

### Running a Model

```bash
# Interactive chat
ollama run llama3.2

# Run with a prompt
ollama run mistral "Explain quantum computing in simple terms"

# List downloaded models
ollama list

# Remove a model
ollama rm modelname
```

## Using Ollama API

### Basic API Call

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "What is machine learning?",
  "stream": false
}'
```

### Streaming Response

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "Write a poem about coding",
  "stream": true
}'
```

### Chat API

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ]
}'
```

## Python Integration

### Using Official Ollama Library

```python
import ollama

# Simple generation
response = ollama.generate(
    model='llama3.2',
    prompt='Explain Python decorators'
)
print(response['response'])

# Chat
response = ollama.chat(
    model='llama3.2',
    messages=[
        {'role': 'user', 'content': 'Why is the sky blue?'}
    ]
)
print(response['message']['content'])

# Streaming
for chunk in ollama.chat(
    model='llama3.2',
    messages=[{'role': 'user', 'content': 'Tell me a story'}],
    stream=True
):
    print(chunk['message']['content'], end='', flush=True)
```

### Using LangChain with Ollama

```python
from langchain_community.llms import Ollama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Initialize
llm = Ollama(model="llama3.2")

# Simple chain
prompt = ChatPromptTemplate.from_template("Explain {topic} simply.")
chain = prompt | llm | StrOutputParser()

result = chain.invoke({"topic": "neural networks"})
print(result)
```

### OpenAI-Compatible API

Ollama provides an OpenAI-compatible endpoint:

```python
from openai import OpenAI

client = OpenAI(
    base_url='http://localhost:11434/v1',
    api_key='ollama'  # Required but unused
)

response = client.chat.completions.create(
    model="llama3.2",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)

print(response.choices[0].message.content)
```

## Creating Custom Models

### Modelfile Basics

```dockerfile
# Modelfile
FROM llama3.2

# Set parameters
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER num_ctx 4096

# Set system prompt
SYSTEM """You are a helpful coding assistant. You provide clear, 
well-commented code examples and explain your reasoning."""
```

### Create and Run Custom Model

```bash
# Create the model
ollama create codingassistant -f Modelfile

# Run it
ollama run codingassistant
```

### Advanced Modelfile

```dockerfile
FROM llama3.2

# Custom parameters
PARAMETER temperature 0.8
PARAMETER repeat_penalty 1.1
PARAMETER num_ctx 8192

# System prompt
SYSTEM """You are an expert Python developer. Follow these rules:
1. Always write clean, PEP 8 compliant code
2. Include docstrings and type hints
3. Add comments for complex logic
4. Suggest optimizations when relevant"""

# Template customization
TEMPLATE """{{ if .System }}<|system|>
{{ .System }}<|end|>
{{ end }}{{ if .Prompt }}<|user|>
{{ .Prompt }}<|end|>
<|assistant|>
{{ end }}{{ .Response }}"""
```

## GPU Acceleration

### NVIDIA GPU Setup

```bash
# Check if GPU is detected
nvidia-smi

# Ollama automatically uses GPU if available
ollama run llama3.2
```

### Specify GPU Layers

```bash
# Use all GPU layers
OLLAMA_NUM_GPU=999 ollama run llama3.2

# Use CPU only
OLLAMA_NUM_GPU=0 ollama run llama3.2
```

### AMD GPU (ROCm)

```bash
# Install ROCm version
docker run -d --device /dev/kfd --device /dev/dri \
  -v ollama:/root/.ollama -p 11434:11434 \
  --name ollama ollama/ollama:rocm
```

## Web UI Options

### Open WebUI (Recommended)

```bash
docker run -d -p 3000:8080 \
  --add-host=host.docker.internal:host-gateway \
  -v open-webui:/app/backend/data \
  --name open-webui \
  ghcr.io/open-webui/open-webui:main
```

Access at `http://localhost:3000`

### Text Generation WebUI

```bash
git clone https://github.com/oobabooga/text-generation-webui
cd text-generation-webui
pip install -r requirements.txt
python server.py
```

## Performance Optimization

### Memory Management

```bash
# Set context size (affects memory)
ollama run llama3.2 --num-ctx 2048

# In Modelfile
PARAMETER num_ctx 4096
```

### Quantization

Ollama automatically uses quantized models. Choose quantization level:

```bash
# Default (Q4_0) - Good balance
ollama pull llama3.2

# Higher quality (Q5_K_M)
ollama pull llama3.2:q5_k_m

# Lower memory (Q2_K)
ollama pull llama3.2:q2_k
```

## Building an Application

### Simple Chatbot

```python
import ollama

class LocalChatbot:
    def __init__(self, model="llama3.2"):
        self.model = model
        self.history = []
        
    def chat(self, message):
        self.history.append({"role": "user", "content": message})
        
        response = ollama.chat(
            model=self.model,
            messages=self.history
        )
        
        assistant_message = response['message']['content']
        self.history.append({"role": "assistant", "content": assistant_message})
        
        return assistant_message
    
    def clear_history(self):
        self.history = []

# Usage
bot = LocalChatbot()
print(bot.chat("Hello! What can you help me with?"))
print(bot.chat("Can you write some Python code?"))
```

### RAG with Local LLM

```python
from langchain_community.llms import Ollama
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough

# Setup components
llm = Ollama(model="llama3.2")
embeddings = OllamaEmbeddings(model="llama3.2")

# Create vector store (assume docs are loaded)
vectorstore = Chroma.from_documents(docs, embeddings)
retriever = vectorstore.as_retriever()

# RAG chain
template = """Answer based on context:
{context}

Question: {question}"""

prompt = ChatPromptTemplate.from_template(template)

chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt
    | llm
)

answer = chain.invoke("What is the main topic?")
```

## Troubleshooting

### Model Won't Load

```bash
# Check available memory
free -h

# Try smaller model
ollama run phi

# Reduce context size
ollama run llama3.2 --num-ctx 1024
```

### Slow Performance

1. Use GPU if available
2. Choose quantized models
3. Reduce context window
4. Close other applications

### Connection Errors

```bash
# Restart Ollama
ollama serve

# Check if running
curl http://localhost:11434/api/tags
```

## Comparison: Local vs Cloud

| Aspect | Local (Ollama) | Cloud (OpenAI) |
|--------|----------------|----------------|
| Cost | Free | Pay per token |
| Privacy | Complete | Data sent to servers |
| Speed | Depends on hardware | Consistent |
| Quality | Good (varies by model) | Best available |
| Offline | Yes | No |

## Conclusion

Ollama makes running powerful LLMs locally accessible to everyone. Whether you need privacy, want to avoid API costs, or just want to experiment, local LLMs are now a viable option.

Start with smaller models like Phi or Mistral 7B, then scale up as you understand your hardware's capabilities.

---

*Last updated: January 2025*
