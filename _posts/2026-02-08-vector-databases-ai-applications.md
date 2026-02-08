---
layout: post
title: "Vector Databases Explained: Powering AI Search and RAG Applications"
subtitle: "A practical guide to choosing, deploying, and optimizing vector databases"
date: 2026-02-08
author: "Dev Star"
header-img: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1920&q=80"
tags: [Vector Database, AI, RAG, Embeddings, Pinecone, Weaviate, Machine Learning]
---

Every AI application needs a memory. When you ask an LLM about your documents, how does it find relevant information? The answer is vector databases—specialized systems that store and search high-dimensional embeddings at scale.

![AI abstract](https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80)
*Photo by [DeepMind](https://unsplash.com/@deepmind) on Unsplash*

## What Are Vector Databases?

Traditional databases search by exact matches or ranges. Vector databases search by *similarity*. They store numerical representations (embeddings) of data and find the most similar items to a query.

```python
# Traditional SQL: exact match
SELECT * FROM products WHERE category = 'electronics'

# Vector search: semantic similarity
# "Find products similar to 'wireless noise-canceling headphones'"
results = vector_db.search(
    query_embedding=embed("wireless noise-canceling headphones"),
    top_k=10
)
```

## How Embeddings Work

Text, images, and other data are converted to dense vectors using embedding models:

```python
from openai import OpenAI

client = OpenAI()

def embed(text: str) -> list[float]:
    response = client.embeddings.create(
        model="text-embedding-3-large",
        input=text
    )
    return response.data[0].embedding  # 3072 dimensions

# Similar concepts have similar vectors
doc1 = embed("The cat sat on the mat")
doc2 = embed("A feline rested on the rug")
doc3 = embed("Stock prices rose sharply")

# cosine_similarity(doc1, doc2) ≈ 0.85  (high - similar meaning)
# cosine_similarity(doc1, doc3) ≈ 0.12  (low - different topics)
```

## Choosing a Vector Database

### Pinecone (Managed)
Best for: Teams wanting zero ops overhead

```python
from pinecone import Pinecone

pc = Pinecone(api_key="your-key")
index = pc.Index("documents")

# Upsert vectors
index.upsert(vectors=[
    {"id": "doc1", "values": embed("Hello world"), "metadata": {"source": "web"}},
    {"id": "doc2", "values": embed("Goodbye world"), "metadata": {"source": "api"}},
])

# Query
results = index.query(
    vector=embed("greeting"),
    top_k=5,
    include_metadata=True,
    filter={"source": {"$eq": "web"}}
)
```

### Weaviate (Self-hosted or Cloud)
Best for: Multi-modal search, GraphQL fans

```python
import weaviate

client = weaviate.Client("http://localhost:8080")

# Define schema with built-in vectorization
client.schema.create_class({
    "class": "Document",
    "vectorizer": "text2vec-openai",
    "properties": [
        {"name": "content", "dataType": ["text"]},
        {"name": "source", "dataType": ["string"]},
    ]
})

# Weaviate auto-generates embeddings
client.data_object.create({
    "content": "Vector databases store embeddings",
    "source": "tutorial"
}, class_name="Document")

# Semantic search
result = client.query.get("Document", ["content", "source"])\
    .with_near_text({"concepts": ["similarity search"]})\
    .with_limit(5)\
    .do()
```

### Qdrant (Self-hosted)
Best for: Performance-critical, self-hosted deployments

```python
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct

client = QdrantClient("localhost", port=6333)

# Create collection
client.create_collection(
    collection_name="documents",
    vectors_config=VectorParams(size=3072, distance=Distance.COSINE)
)

# Insert points
client.upsert(
    collection_name="documents",
    points=[
        PointStruct(id=1, vector=embed("doc 1 content"), payload={"source": "web"}),
        PointStruct(id=2, vector=embed("doc 2 content"), payload={"source": "api"}),
    ]
)

# Search with filter
results = client.search(
    collection_name="documents",
    query_vector=embed("search query"),
    limit=10,
    query_filter={"must": [{"key": "source", "match": {"value": "web"}}]}
)
```

### pgvector (PostgreSQL Extension)
Best for: Teams already on PostgreSQL who want simplicity

```sql
-- Enable extension
CREATE EXTENSION vector;

-- Create table with vector column
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding vector(3072)
);

-- Create index for fast search
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Insert
INSERT INTO documents (content, embedding) 
VALUES ('Hello world', '[0.1, 0.2, ...]');

-- Search
SELECT content, 1 - (embedding <=> query_embedding) AS similarity
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'
LIMIT 10;
```

![Database visualization](https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=80)
*Photo by [Jan Antonin Kolar](https://unsplash.com/@jankolar) on Unsplash*

## Building a RAG Pipeline

Retrieval-Augmented Generation (RAG) combines vector search with LLMs:

```python
from openai import OpenAI
from qdrant_client import QdrantClient

openai_client = OpenAI()
vector_db = QdrantClient("localhost", port=6333)

def answer_question(question: str) -> str:
    # 1. Embed the question
    query_vector = embed(question)
    
    # 2. Search for relevant documents
    search_results = vector_db.search(
        collection_name="knowledge_base",
        query_vector=query_vector,
        limit=5
    )
    
    # 3. Build context from retrieved documents
    context = "\n\n".join([
        f"Document {i+1}:\n{result.payload['content']}"
        for i, result in enumerate(search_results)
    ])
    
    # 4. Generate answer with context
    response = openai_client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": """Answer questions based on the provided context. 
             If the context doesn't contain relevant information, say so."""},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
        ]
    )
    
    return response.choices[0].message.content
```

## Optimizing Performance

### Chunking Strategy

How you split documents affects retrieval quality:

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Bad: Fixed-size chunks break sentences
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    separators=["\n\n", "\n", ". ", " ", ""]  # Prefer natural breaks
)

# Better: Semantic chunking
from semantic_chunker import SemanticChunker

chunker = SemanticChunker(
    embedding_model="text-embedding-3-small",
    breakpoint_threshold=0.3  # Split when similarity drops
)
chunks = chunker.split(document)
```

### Hybrid Search

Combine vector and keyword search for better results:

```python
# Weaviate hybrid search
result = client.query.get("Document", ["content"])\
    .with_hybrid(
        query="kubernetes deployment",
        alpha=0.5  # 0 = keyword only, 1 = vector only
    )\
    .with_limit(10)\
    .do()

# Manual hybrid with reciprocal rank fusion
def hybrid_search(query: str, k: int = 10):
    vector_results = vector_search(query, k=k*2)
    keyword_results = bm25_search(query, k=k*2)
    
    scores = {}
    for rank, doc in enumerate(vector_results):
        scores[doc.id] = scores.get(doc.id, 0) + 1 / (rank + 60)
    for rank, doc in enumerate(keyword_results):
        scores[doc.id] = scores.get(doc.id, 0) + 1 / (rank + 60)
    
    return sorted(scores.items(), key=lambda x: -x[1])[:k]
```

### Metadata Filtering

Pre-filter by metadata before vector search:

```python
# Filter by date range and category
results = index.query(
    vector=query_embedding,
    top_k=10,
    filter={
        "$and": [
            {"category": {"$in": ["engineering", "product"]}},
            {"date": {"$gte": "2026-01-01"}},
            {"status": {"$eq": "published"}}
        ]
    }
)
```

## Scaling Considerations

| Database | Max Vectors | Latency (p99) | Managed Option |
|----------|-------------|---------------|----------------|
| Pinecone | Billions | <50ms | Yes |
| Weaviate | Billions | <100ms | Yes |
| Qdrant | Billions | <50ms | Yes |
| pgvector | ~10M | <200ms | Via cloud PG |

### Sharding Strategies

For billions of vectors:
- **By tenant**: Each customer gets their own namespace/collection
- **By time**: Recent data in hot storage, old in cold
- **By category**: Partition by document type

## Common Pitfalls

1. **Wrong embedding model**: Match your model to your domain (code → code embeddings)
2. **Ignoring chunking**: Garbage in, garbage out
3. **No hybrid search**: Vector-only misses exact matches
4. **Stale indexes**: Update indexes as data changes
5. **Over-filtering**: Too many filters reduce recall

## Conclusion

Vector databases are the memory layer for AI applications. Choose based on your operational preferences:
- **Pinecone** for zero-ops managed service
- **Weaviate** for multi-modal and built-in ML
- **Qdrant** for self-hosted performance
- **pgvector** for PostgreSQL simplicity

Start with simple RAG, measure retrieval quality, then optimize chunking and hybrid search. The vector database is just plumbing—focus on the data quality and retrieval strategy.
