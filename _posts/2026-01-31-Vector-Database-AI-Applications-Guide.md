---
layout: post
title: "Vector Databases for AI: Complete Guide to Semantic Search and RAG"
subtitle: Master vector databases for building intelligent AI applications with embeddings
categories: development
tags: ai vector-database embeddings rag semantic-search
comments: true
---

# Vector Databases for AI: Complete Guide to Semantic Search and RAG

Vector databases have become essential infrastructure for modern AI applications. From semantic search to Retrieval-Augmented Generation (RAG), understanding vector databases is crucial for any AI developer. This comprehensive guide covers everything you need to know.

## What Are Vector Databases?

### Understanding Embeddings

Embeddings are numerical representations of data (text, images, audio) that capture semantic meaning:

```python
from openai import OpenAI

client = OpenAI()

def get_embedding(text: str) -> list[float]:
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

# Similar concepts have similar vectors
embedding1 = get_embedding("The cat sat on the mat")
embedding2 = get_embedding("A feline rested on the rug")
embedding3 = get_embedding("Stock market crashed today")

# embedding1 and embedding2 will be close
# embedding3 will be far from both
```

### Why Traditional Databases Fall Short

Traditional databases excel at exact matching but struggle with semantic similarity:

```sql
-- This won't find semantically similar documents
SELECT * FROM documents WHERE content = 'machine learning tutorial';

-- Even full-text search has limitations
SELECT * FROM documents WHERE to_tsvector(content) @@ to_tsquery('machine & learning');
```

Vector databases solve this by enabling similarity search in high-dimensional space.

## Popular Vector Databases

### 1. Pinecone (Managed)

```python
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="your-api-key")

# Create index
pc.create_index(
    name="my-index",
    dimension=1536,
    metric="cosine",
    spec=ServerlessSpec(cloud="aws", region="us-east-1")
)

index = pc.Index("my-index")

# Upsert vectors
index.upsert(
    vectors=[
        {"id": "doc1", "values": embedding1, "metadata": {"title": "AI Basics"}},
        {"id": "doc2", "values": embedding2, "metadata": {"title": "ML Guide"}},
    ]
)

# Query
results = index.query(
    vector=query_embedding,
    top_k=5,
    include_metadata=True
)
```

### 2. Weaviate (Open Source)

```python
import weaviate
from weaviate.classes.config import Configure, Property, DataType

client = weaviate.connect_to_local()

# Create collection with vectorizer
client.collections.create(
    name="Document",
    vectorizer_config=Configure.Vectorizer.text2vec_openai(),
    properties=[
        Property(name="title", data_type=DataType.TEXT),
        Property(name="content", data_type=DataType.TEXT),
    ]
)

# Add data (auto-vectorized)
documents = client.collections.get("Document")
documents.data.insert({
    "title": "Introduction to AI",
    "content": "Artificial intelligence is transforming..."
})

# Semantic search
response = documents.query.near_text(
    query="machine learning basics",
    limit=5
)
```

### 3. Qdrant (Open Source)

```python
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct

client = QdrantClient("localhost", port=6333)

# Create collection
client.create_collection(
    collection_name="documents",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
)

# Add vectors
client.upsert(
    collection_name="documents",
    points=[
        PointStruct(
            id=1,
            vector=embedding1,
            payload={"title": "Doc 1", "category": "tech"}
        ),
        PointStruct(
            id=2,
            vector=embedding2,
            payload={"title": "Doc 2", "category": "science"}
        )
    ]
)

# Search with filters
results = client.search(
    collection_name="documents",
    query_vector=query_embedding,
    query_filter={
        "must": [{"key": "category", "match": {"value": "tech"}}]
    },
    limit=5
)
```

### 4. ChromaDB (Lightweight)

```python
import chromadb
from chromadb.utils import embedding_functions

client = chromadb.PersistentClient(path="./chroma_db")

openai_ef = embedding_functions.OpenAIEmbeddingFunction(
    api_key="your-api-key",
    model_name="text-embedding-3-small"
)

collection = client.get_or_create_collection(
    name="documents",
    embedding_function=openai_ef
)

# Add documents (auto-embedded)
collection.add(
    documents=["AI is transforming industries", "Machine learning enables..."],
    metadatas=[{"source": "blog"}, {"source": "paper"}],
    ids=["doc1", "doc2"]
)

# Query
results = collection.query(
    query_texts=["artificial intelligence applications"],
    n_results=5
)
```

### 5. pgvector (PostgreSQL Extension)

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

-- Insert data
INSERT INTO documents (title, content, embedding)
VALUES ('AI Guide', 'Content here...', '[0.1, 0.2, ...]'::vector);

-- Similarity search
SELECT id, title, 1 - (embedding <=> query_embedding) AS similarity
FROM documents
ORDER BY embedding <=> query_embedding
LIMIT 5;
```

## Building a RAG System

### Complete RAG Pipeline

```python
from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
import hashlib

class RAGSystem:
    def __init__(self):
        self.openai = OpenAI()
        self.qdrant = QdrantClient("localhost", port=6333)
        self.collection = "knowledge_base"
    
    def embed(self, text: str) -> list[float]:
        response = self.openai.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
    
    def chunk_document(self, text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
        """Split document into overlapping chunks."""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk:
                chunks.append(chunk)
        
        return chunks
    
    def index_document(self, doc_id: str, title: str, content: str):
        """Index a document with chunking."""
        chunks = self.chunk_document(content)
        points = []
        
        for i, chunk in enumerate(chunks):
            chunk_id = hashlib.md5(f"{doc_id}_{i}".encode()).hexdigest()
            embedding = self.embed(chunk)
            
            points.append(PointStruct(
                id=chunk_id,
                vector=embedding,
                payload={
                    "doc_id": doc_id,
                    "title": title,
                    "chunk": chunk,
                    "chunk_index": i
                }
            ))
        
        self.qdrant.upsert(collection_name=self.collection, points=points)
        return len(chunks)
    
    def retrieve(self, query: str, top_k: int = 5) -> list[dict]:
        """Retrieve relevant chunks for a query."""
        query_embedding = self.embed(query)
        
        results = self.qdrant.search(
            collection_name=self.collection,
            query_vector=query_embedding,
            limit=top_k
        )
        
        return [
            {
                "chunk": hit.payload["chunk"],
                "title": hit.payload["title"],
                "score": hit.score
            }
            for hit in results
        ]
    
    def generate(self, query: str, context: list[dict]) -> str:
        """Generate answer using retrieved context."""
        context_text = "\n\n".join([
            f"[From: {c['title']}]\n{c['chunk']}"
            for c in context
        ])
        
        response = self.openai.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": """You are a helpful assistant. Answer questions based on the provided context.
                    If the context doesn't contain the answer, say so. Cite your sources."""
                },
                {
                    "role": "user",
                    "content": f"""Context:
{context_text}

Question: {query}

Answer:"""
                }
            ]
        )
        
        return response.choices[0].message.content
    
    def query(self, question: str) -> str:
        """Full RAG pipeline."""
        context = self.retrieve(question)
        answer = self.generate(question, context)
        return answer

# Usage
rag = RAGSystem()

# Index documents
rag.index_document("doc1", "AI Fundamentals", "Long document content...")
rag.index_document("doc2", "ML Best Practices", "Another document...")

# Query
answer = rag.query("What are the key principles of machine learning?")
print(answer)
```

## Advanced Techniques

### Hybrid Search (Keyword + Semantic)

```python
from qdrant_client.models import SparseVector

class HybridSearch:
    def __init__(self, qdrant_client):
        self.client = qdrant_client
    
    def bm25_tokenize(self, text: str) -> dict[str, float]:
        """Simple BM25-style sparse encoding."""
        from collections import Counter
        import math
        
        words = text.lower().split()
        tf = Counter(words)
        
        return {
            word: (1 + math.log(count)) * math.log(10000 / (count + 1))
            for word, count in tf.items()
        }
    
    def hybrid_search(self, query: str, dense_vector: list[float], alpha: float = 0.5):
        """Combine dense and sparse search."""
        sparse_query = self.bm25_tokenize(query)
        
        # Search with both vectors
        results = self.client.search(
            collection_name="hybrid_docs",
            query_vector=dense_vector,
            sparse_vector=SparseVector(
                indices=list(range(len(sparse_query))),
                values=list(sparse_query.values())
            ),
            limit=10
        )
        
        return results
```

### Re-ranking for Better Results

```python
from sentence_transformers import CrossEncoder

class Reranker:
    def __init__(self):
        self.model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
    
    def rerank(self, query: str, documents: list[str], top_k: int = 5) -> list[tuple[str, float]]:
        """Re-rank documents using cross-encoder."""
        pairs = [[query, doc] for doc in documents]
        scores = self.model.predict(pairs)
        
        ranked = sorted(zip(documents, scores), key=lambda x: x[1], reverse=True)
        return ranked[:top_k]

# Usage with RAG
def enhanced_retrieve(query: str, initial_k: int = 20, final_k: int = 5):
    # Get more initial results
    initial_results = rag.retrieve(query, top_k=initial_k)
    
    # Re-rank
    reranker = Reranker()
    documents = [r["chunk"] for r in initial_results]
    reranked = reranker.rerank(query, documents, top_k=final_k)
    
    return reranked
```

### Multi-Modal Embeddings

```python
from transformers import CLIPProcessor, CLIPModel
import torch
from PIL import Image

class MultiModalSearch:
    def __init__(self):
        self.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    
    def embed_image(self, image_path: str) -> list[float]:
        image = Image.open(image_path)
        inputs = self.processor(images=image, return_tensors="pt")
        
        with torch.no_grad():
            features = self.model.get_image_features(**inputs)
        
        return features[0].tolist()
    
    def embed_text(self, text: str) -> list[float]:
        inputs = self.processor(text=[text], return_tensors="pt", padding=True)
        
        with torch.no_grad():
            features = self.model.get_text_features(**inputs)
        
        return features[0].tolist()
    
    def search_images_by_text(self, query: str, image_collection):
        """Search images using text query."""
        query_embedding = self.embed_text(query)
        # Search in vector database...
```

## Performance Optimization

### Quantization

```python
from qdrant_client.models import ScalarQuantizationConfig, ScalarType

# Create collection with quantization
client.create_collection(
    collection_name="quantized_docs",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
    quantization_config=ScalarQuantizationConfig(
        type=ScalarType.INT8,
        quantile=0.99,
        always_ram=True
    )
)
```

### Batch Operations

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

async def batch_embed(texts: list[str], batch_size: int = 100) -> list[list[float]]:
    """Embed texts in batches."""
    embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=batch
        )
        embeddings.extend([e.embedding for e in response.data])
    
    return embeddings
```

## Best Practices

### 1. Choose the Right Embedding Model

| Use Case | Recommended Model | Dimensions |
|----------|------------------|------------|
| General text | text-embedding-3-small | 1536 |
| High accuracy | text-embedding-3-large | 3072 |
| Multilingual | multilingual-e5-large | 1024 |
| Code | code-embedding | 1536 |

### 2. Optimize Chunk Size

```python
def optimal_chunk_size(avg_query_length: int) -> int:
    """Chunks should be 2-4x average query length."""
    return avg_query_length * 3
```

### 3. Monitor Performance

```python
import time

def timed_search(query: str):
    start = time.time()
    results = index.query(vector=embed(query), top_k=10)
    latency = (time.time() - start) * 1000
    
    print(f"Search latency: {latency:.2f}ms")
    print(f"Results: {len(results.matches)}")
    
    return results
```

## Conclusion

Vector databases are transforming how we build AI applications. Key takeaways:

- **Choose the right database** for your scale and requirements
- **Optimize chunking** for your specific use case
- **Implement hybrid search** for best results
- **Re-rank** when precision matters
- **Monitor and iterate** on your embeddings

Start simple with ChromaDB or pgvector, then scale to managed solutions like Pinecone as your needs grow.
