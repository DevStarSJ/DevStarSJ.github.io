---
layout: post
title: "Vector Database for AI: Complete Guide to Embeddings and Similarity Search"
subtitle: Master vector databases for building AI-powered search and RAG systems
categories: development
tags: python ai
comments: true
---

# Vector Database for AI: Complete Guide to Embeddings and Similarity Search

Vector databases are the backbone of modern AI applications. They enable semantic search, recommendation systems, and RAG (Retrieval Augmented Generation). This guide covers everything from concepts to implementation.

## What Are Vector Databases?

Traditional databases search by exact matches. Vector databases search by **meaning** using embeddings—numerical representations of data.

**Use Cases:**
- Semantic search
- Image similarity
- Recommendation systems
- RAG for LLMs
- Anomaly detection

## How It Works

```
Text → Embedding Model → Vector [0.1, 0.5, ...] → Store in DB
                                                        ↓
Query → Embedding Model → Vector → Similarity Search → Results
```

## Popular Vector Databases

| Database | Type | Best For | Pricing |
|----------|------|----------|---------|
| Chroma | Local/Cloud | Development, Small scale | Free |
| FAISS | Local | High performance, Research | Free |
| Pinecone | Cloud | Production, Managed | Freemium |
| Weaviate | Both | Full-featured, GraphQL | Open source |
| Qdrant | Both | Performance, Rust-based | Open source |
| Milvus | Both | Enterprise, Large scale | Open source |

## Chroma (Beginner-Friendly)

### Installation

```bash
pip install chromadb
```

### Basic Usage

```python
import chromadb

# Create client
client = chromadb.Client()

# Create collection
collection = client.create_collection(name="my_documents")

# Add documents
collection.add(
    documents=["Machine learning is fascinating", 
               "Deep learning uses neural networks",
               "Python is a programming language"],
    ids=["doc1", "doc2", "doc3"]
)

# Query
results = collection.query(
    query_texts=["What is AI?"],
    n_results=2
)

print(results['documents'])
```

### With Custom Embeddings

```python
from chromadb.utils import embedding_functions

# OpenAI embeddings
openai_ef = embedding_functions.OpenAIEmbeddingFunction(
    api_key="your-key",
    model_name="text-embedding-3-small"
)

collection = client.create_collection(
    name="openai_docs",
    embedding_function=openai_ef
)
```

### Persistent Storage

```python
# Persistent client
client = chromadb.PersistentClient(path="./chroma_db")

# Collection persists across restarts
collection = client.get_or_create_collection("my_docs")
```

### Metadata Filtering

```python
collection.add(
    documents=["Python tutorial", "JavaScript guide"],
    metadatas=[
        {"language": "python", "level": "beginner"},
        {"language": "javascript", "level": "intermediate"}
    ],
    ids=["1", "2"]
)

# Filter by metadata
results = collection.query(
    query_texts=["programming tutorial"],
    where={"language": "python"},
    n_results=5
)
```

## FAISS (High Performance)

### Installation

```bash
pip install faiss-cpu  # or faiss-gpu for GPU support
```

### Basic Usage

```python
import faiss
import numpy as np

# Create embeddings (example: 128-dimensional)
dimension = 128
num_vectors = 10000

# Random vectors for demo
vectors = np.random.random((num_vectors, dimension)).astype('float32')

# Create index
index = faiss.IndexFlatL2(dimension)  # L2 distance
index.add(vectors)

# Search
query = np.random.random((1, dimension)).astype('float32')
distances, indices = index.search(query, k=5)

print(f"Nearest neighbors: {indices}")
print(f"Distances: {distances}")
```

### IVF Index (Faster for Large Datasets)

```python
# IVF index with 100 clusters
nlist = 100
quantizer = faiss.IndexFlatL2(dimension)
index = faiss.IndexIVFFlat(quantizer, dimension, nlist)

# Must train before adding
index.train(vectors)
index.add(vectors)

# Search (set nprobe for accuracy/speed tradeoff)
index.nprobe = 10
distances, indices = index.search(query, k=5)
```

### Save and Load

```python
# Save
faiss.write_index(index, "my_index.faiss")

# Load
index = faiss.read_index("my_index.faiss")
```

## Pinecone (Managed Cloud)

### Setup

```bash
pip install pinecone-client
```

```python
from pinecone import Pinecone

pc = Pinecone(api_key="your-api-key")

# Create index
pc.create_index(
    name="my-index",
    dimension=1536,  # OpenAI embedding dimension
    metric="cosine"
)

index = pc.Index("my-index")
```

### Upsert Vectors

```python
# Upsert with metadata
index.upsert(
    vectors=[
        {
            "id": "vec1",
            "values": [0.1, 0.2, ...],  # 1536 dimensions
            "metadata": {"category": "tech", "year": 2024}
        },
        {
            "id": "vec2",
            "values": [0.3, 0.4, ...],
            "metadata": {"category": "science", "year": 2023}
        }
    ]
)
```

### Query

```python
results = index.query(
    vector=[0.1, 0.2, ...],
    top_k=5,
    include_metadata=True,
    filter={
        "category": {"$eq": "tech"},
        "year": {"$gte": 2023}
    }
)
```

## Weaviate

### Setup

```bash
pip install weaviate-client
```

```python
import weaviate

client = weaviate.Client(
    url="http://localhost:8080",  # Or cloud URL
    additional_headers={
        "X-OpenAI-Api-Key": "your-key"
    }
)
```

### Create Schema

```python
class_obj = {
    "class": "Article",
    "vectorizer": "text2vec-openai",
    "properties": [
        {"name": "title", "dataType": ["text"]},
        {"name": "content", "dataType": ["text"]},
        {"name": "category", "dataType": ["text"]}
    ]
}

client.schema.create_class(class_obj)
```

### Add Data

```python
client.data_object.create(
    data_object={
        "title": "Introduction to AI",
        "content": "Artificial intelligence is...",
        "category": "technology"
    },
    class_name="Article"
)
```

### Semantic Search

```python
result = (
    client.query
    .get("Article", ["title", "content"])
    .with_near_text({"concepts": ["machine learning"]})
    .with_limit(5)
    .do()
)
```

## Creating Embeddings

### OpenAI Embeddings

```python
from openai import OpenAI

client = OpenAI()

def get_embedding(text, model="text-embedding-3-small"):
    response = client.embeddings.create(
        input=text,
        model=model
    )
    return response.data[0].embedding

# Single text
embedding = get_embedding("Hello world")

# Batch
texts = ["Hello", "World", "AI"]
response = client.embeddings.create(input=texts, model="text-embedding-3-small")
embeddings = [item.embedding for item in response.data]
```

### Sentence Transformers (Free, Local)

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

# Single
embedding = model.encode("Hello world")

# Batch
embeddings = model.encode(["Hello", "World", "AI"])
```

## Complete RAG Implementation

```python
import chromadb
from openai import OpenAI

# Setup
chroma_client = chromadb.PersistentClient(path="./rag_db")
openai_client = OpenAI()

# Create collection with OpenAI embeddings
from chromadb.utils import embedding_functions
openai_ef = embedding_functions.OpenAIEmbeddingFunction(
    model_name="text-embedding-3-small"
)

collection = chroma_client.get_or_create_collection(
    name="knowledge_base",
    embedding_function=openai_ef
)

# Add documents
def add_documents(documents, ids):
    collection.add(
        documents=documents,
        ids=ids
    )

# Query and generate
def rag_query(question, n_results=3):
    # Retrieve relevant docs
    results = collection.query(
        query_texts=[question],
        n_results=n_results
    )
    
    context = "\n\n".join(results['documents'][0])
    
    # Generate with context
    response = openai_client.chat.completions.create(
        model="gpt-4-turbo-preview",
        messages=[
            {
                "role": "system",
                "content": f"Answer based on this context:\n{context}"
            },
            {"role": "user", "content": question}
        ]
    )
    
    return response.choices[0].message.content

# Usage
add_documents(
    documents=[
        "Python is a programming language created by Guido van Rossum.",
        "Machine learning is a subset of artificial intelligence.",
        "Vector databases store and search embeddings efficiently."
    ],
    ids=["1", "2", "3"]
)

answer = rag_query("What is Python?")
print(answer)
```

## Similarity Metrics

### Cosine Similarity

```python
import numpy as np

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# Range: -1 to 1 (1 = identical)
```

### Euclidean Distance (L2)

```python
def euclidean_distance(a, b):
    return np.linalg.norm(a - b)

# Range: 0 to infinity (0 = identical)
```

### Dot Product

```python
def dot_product(a, b):
    return np.dot(a, b)

# Higher = more similar (requires normalized vectors)
```

## Best Practices

### 1. Choose the Right Embedding Model

| Use Case | Recommended Model |
|----------|-------------------|
| General text | text-embedding-3-small |
| High quality | text-embedding-3-large |
| Multilingual | multilingual-e5-large |
| Code | code-search-ada-002 |
| Local/Free | all-MiniLM-L6-v2 |

### 2. Chunk Documents Properly

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50
)
chunks = splitter.split_text(document)
```

### 3. Store Metadata

```python
collection.add(
    documents=[chunk],
    metadatas=[{
        "source": "document.pdf",
        "page": 5,
        "date": "2024-01-15"
    }],
    ids=[f"doc_5_{i}"]
)
```

### 4. Use Hybrid Search

Combine vector search with keyword search for better results.

## Conclusion

Vector databases enable semantic understanding in applications:

1. **Start with Chroma** for development
2. **Use FAISS** for high-performance local needs
3. **Choose Pinecone** for managed production
4. **Pick Weaviate/Qdrant** for full-featured self-hosted

The right choice depends on scale, budget, and requirements!

---

*Build smarter search with vectors! 🔍*
