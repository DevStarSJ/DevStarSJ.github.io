---
layout: post
title: "Vector Databases Explained: Powering the Next Generation of AI Applications"
subtitle: "Understanding embeddings, similarity search, and choosing the right vector database for your AI workloads"
date: 2026-02-15
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200"
tags: [Vector Database, AI, Machine Learning, Embeddings, Pinecone, Weaviate, ChromaDB, RAG]
categories: ai
---

# Vector Databases Explained: Powering the Next Generation of AI Applications

As AI applications explode in complexity, traditional databases struggle with semantic search, similarity matching, and high-dimensional data. Vector databases have emerged as the critical infrastructure layer for modern AI systems, enabling everything from RAG pipelines to recommendation engines.

![Data Visualization](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800)
*Photo by [Luke Chesser](https://unsplash.com/@lukechesser) on Unsplash*

## What Are Vector Databases?

Vector databases store and query high-dimensional vectors—numerical representations of data. Unlike traditional databases that match exact values, vector databases find *similar* items based on mathematical distance.

### Traditional vs Vector Search

```
Traditional Database:
Query: WHERE name = 'iPhone 15'
Result: Exact match or nothing

Vector Database:
Query: "smartphone with great camera"
Result: Similar products ranked by relevance
```

## Understanding Embeddings

Embeddings convert data into dense vectors that capture semantic meaning:

```python
from openai import OpenAI

client = OpenAI()

def get_embedding(text: str, model="text-embedding-3-small") -> list[float]:
    response = client.embeddings.create(
        input=text,
        model=model
    )
    return response.data[0].embedding

# Example
text1 = "The cat sat on the mat"
text2 = "A feline rested on the rug"
text3 = "Stock prices rose sharply"

# text1 and text2 will have similar vectors
# text3 will be distant from both
```

### Embedding Dimensions

| Model | Dimensions | Use Case |
|-------|------------|----------|
| text-embedding-3-small | 1536 | General purpose |
| text-embedding-3-large | 3072 | High accuracy |
| Cohere embed-v3 | 1024 | Multilingual |
| BGE-large | 1024 | Open source |
| all-MiniLM-L6-v2 | 384 | Fast, lightweight |

## Similarity Metrics

### Cosine Similarity

```python
import numpy as np

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# Ranges from -1 to 1 (1 = identical direction)
```

### Euclidean Distance

```python
def euclidean_distance(a: np.ndarray, b: np.ndarray) -> float:
    return np.linalg.norm(a - b)

# Ranges from 0 to infinity (0 = identical)
```

### Dot Product

```python
def dot_product(a: np.ndarray, b: np.ndarray) -> float:
    return np.dot(a, b)

# Requires normalized vectors for meaningful comparison
```

## Popular Vector Databases

### Pinecone (Managed)

```python
from pinecone import Pinecone

pc = Pinecone(api_key="your-api-key")
index = pc.Index("my-index")

# Upsert vectors
index.upsert(vectors=[
    {
        "id": "doc1",
        "values": embedding,
        "metadata": {"title": "Document 1", "category": "tech"}
    }
])

# Query
results = index.query(
    vector=query_embedding,
    top_k=10,
    include_metadata=True,
    filter={"category": {"$eq": "tech"}}
)
```

### Weaviate (Self-hosted or Managed)

```python
import weaviate
from weaviate.classes.config import Property, DataType, Configure

client = weaviate.connect_to_local()

# Create collection
collection = client.collections.create(
    name="Article",
    vectorizer_config=Configure.Vectorizer.text2vec_openai(),
    properties=[
        Property(name="title", data_type=DataType.TEXT),
        Property(name="content", data_type=DataType.TEXT),
        Property(name="category", data_type=DataType.TEXT),
    ]
)

# Add objects (auto-vectorized)
collection.data.insert({
    "title": "Introduction to AI",
    "content": "Artificial intelligence is...",
    "category": "tech"
})

# Semantic search
results = collection.query.near_text(
    query="machine learning basics",
    limit=5,
    filters=weaviate.classes.query.Filter.by_property("category").equal("tech")
)
```

### ChromaDB (Lightweight, Local)

```python
import chromadb

client = chromadb.Client()
collection = client.create_collection("documents")

# Add documents (auto-embedded with default model)
collection.add(
    documents=["Doc about AI", "Doc about cooking", "Doc about ML"],
    ids=["id1", "id2", "id3"],
    metadatas=[{"topic": "tech"}, {"topic": "food"}, {"topic": "tech"}]
)

# Query
results = collection.query(
    query_texts=["artificial intelligence"],
    n_results=2,
    where={"topic": "tech"}
)
```

![Technology Abstract](https://images.unsplash.com/photo-1518770660439-4636190af475?w=800)
*Photo by [Alexandre Debiève](https://unsplash.com/@alexkixa) on Unsplash*

### Qdrant (High Performance)

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

client = QdrantClient(host="localhost", port=6333)

# Create collection
client.create_collection(
    collection_name="documents",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
)

# Insert vectors
client.upsert(
    collection_name="documents",
    points=[
        PointStruct(
            id=1,
            vector=embedding,
            payload={"title": "AI Guide", "category": "tech"}
        )
    ]
)

# Search with filtering
results = client.search(
    collection_name="documents",
    query_vector=query_embedding,
    limit=10,
    query_filter={
        "must": [{"key": "category", "match": {"value": "tech"}}]
    }
)
```

### pgvector (PostgreSQL Extension)

```sql
-- Enable extension
CREATE EXTENSION vector;

-- Create table with vector column
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title TEXT,
    content TEXT,
    embedding vector(1536)
);

-- Create index for fast similarity search
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Insert document
INSERT INTO documents (title, content, embedding)
VALUES ('AI Guide', 'Content...', '[0.1, 0.2, ...]'::vector);

-- Similarity search
SELECT title, 1 - (embedding <=> query_vector) AS similarity
FROM documents
ORDER BY embedding <=> query_vector
LIMIT 10;
```

## Indexing Algorithms

### HNSW (Hierarchical Navigable Small World)

The most popular algorithm for approximate nearest neighbor search:

```
        Level 2:  [A]-------[B]
                   |         |
        Level 1:  [A]--[C]--[B]--[D]
                   |    |    |    |
        Level 0:  [A][E][C][F][B][G][D][H]
```

**Pros**: Fast queries, good recall
**Cons**: High memory usage, slow inserts

### IVF (Inverted File Index)

Partitions vectors into clusters:

```python
# Conceptual example
clusters = {
    "cluster_1": [vec1, vec5, vec9],
    "cluster_2": [vec2, vec6, vec10],
    "cluster_3": [vec3, vec4, vec7, vec8]
}

# Query: find cluster first, then search within
nearest_cluster = find_nearest_cluster(query_vector)
results = search_within_cluster(nearest_cluster, query_vector)
```

**Pros**: Lower memory, faster builds
**Cons**: Lower recall than HNSW

## Building a RAG Pipeline

```python
from openai import OpenAI
import chromadb

class RAGPipeline:
    def __init__(self):
        self.client = OpenAI()
        self.chroma = chromadb.Client()
        self.collection = self.chroma.create_collection("knowledge_base")
    
    def ingest_documents(self, documents: list[dict]):
        """Add documents to the knowledge base."""
        texts = [doc["content"] for doc in documents]
        ids = [doc["id"] for doc in documents]
        metadatas = [{"source": doc.get("source", "")} for doc in documents]
        
        self.collection.add(
            documents=texts,
            ids=ids,
            metadatas=metadatas
        )
    
    def retrieve(self, query: str, n_results: int = 5) -> list[str]:
        """Retrieve relevant documents."""
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results
        )
        return results["documents"][0]
    
    def generate(self, query: str) -> str:
        """Generate answer using retrieved context."""
        # Retrieve relevant documents
        context_docs = self.retrieve(query)
        context = "\n\n".join(context_docs)
        
        # Generate response
        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": f"Answer based on this context:\n\n{context}"
                },
                {"role": "user", "content": query}
            ]
        )
        
        return response.choices[0].message.content

# Usage
rag = RAGPipeline()
rag.ingest_documents([
    {"id": "1", "content": "Python is a programming language...", "source": "wiki"},
    {"id": "2", "content": "Machine learning uses algorithms...", "source": "book"},
])

answer = rag.generate("What is Python used for?")
```

## Chunking Strategies

### Fixed-Size Chunking

```python
def fixed_chunks(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks
```

### Semantic Chunking

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""]
)

chunks = splitter.split_text(document)
```

### Sentence-Based Chunking

```python
import nltk
nltk.download('punkt')

def sentence_chunks(text: str, sentences_per_chunk: int = 5) -> list[str]:
    sentences = nltk.sent_tokenize(text)
    chunks = []
    
    for i in range(0, len(sentences), sentences_per_chunk):
        chunk = " ".join(sentences[i:i + sentences_per_chunk])
        chunks.append(chunk)
    
    return chunks
```

## Performance Optimization

### Batch Operations

```python
# Bad: Individual inserts
for doc in documents:
    collection.add(documents=[doc], ids=[doc_id])

# Good: Batch insert
collection.add(
    documents=documents,
    ids=ids,
    batch_size=100
)
```

### Hybrid Search

Combine vector and keyword search:

```python
# Weaviate hybrid search
results = collection.query.hybrid(
    query="machine learning basics",
    alpha=0.5,  # 0 = pure keyword, 1 = pure vector
    limit=10
)
```

### Filtering Before Search

```python
# More efficient: filter then search
results = index.query(
    vector=query_embedding,
    filter={"category": "tech"},  # Applied before similarity search
    top_k=10
)
```

## Choosing a Vector Database

| Database | Best For | Hosting | Scaling |
|----------|----------|---------|---------|
| Pinecone | Production, managed | Cloud only | Automatic |
| Weaviate | Hybrid search, GraphQL | Both | Manual/Managed |
| ChromaDB | Prototyping, local dev | Local | Limited |
| Qdrant | High performance | Both | Manual |
| pgvector | PostgreSQL users | Self-hosted | With PG |
| Milvus | Enterprise, large scale | Both | Manual |

## Conclusion

Vector databases are essential infrastructure for modern AI applications:

- **Semantic Search**: Find meaning, not just keywords
- **RAG Pipelines**: Ground LLMs in your data
- **Recommendations**: Similar items, users, content
- **Deduplication**: Find near-duplicates at scale

Start with ChromaDB for prototyping, then graduate to Pinecone or Qdrant for production. The choice depends on your scale, hosting preferences, and feature requirements.

---

*Ready to power your AI applications with vector search?*
