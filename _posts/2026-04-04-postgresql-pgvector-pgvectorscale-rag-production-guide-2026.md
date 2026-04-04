---
layout: post
title: "PostgreSQL Vector Search in 2026: pgvector vs pgvectorscale — Building Production RAG Systems"
subtitle: "A practical guide to running high-performance vector search directly in PostgreSQL without a dedicated vector database"
date: 2026-04-04 12:00:00
author: "Dev.StarSJ"
header-img: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - PostgreSQL
  - Vector Database
  - pgvector
  - RAG
  - AI
  - Machine Learning
  - Database
  - Embeddings
---

# PostgreSQL Vector Search in 2026: pgvector vs pgvectorscale — Building Production RAG Systems

In 2024, everyone was spinning up Pinecone, Weaviate, or Chroma for their RAG (Retrieval-Augmented Generation) applications. In 2026, a surprising number of those teams have migrated back to **PostgreSQL** with `pgvector` and `pgvectorscale`. Why? Because managing yet another database is expensive, complex, and often unnecessary.

This guide covers everything you need to know to run production-grade vector search in PostgreSQL in 2026.

![Database architecture diagram](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop)
*Photo by [Lars Kienle](https://unsplash.com/@larskienle) on Unsplash*

## Why PostgreSQL for Vectors?

Before diving in, let's address the "why":

**The case for a dedicated vector DB:**
- Billion-scale vectors with sub-10ms latency
- Native support for hybrid search (vector + full-text)
- Purpose-built for vector workloads

**The case for PostgreSQL:**
- **Operational simplicity**: One database to manage, back up, and monitor
- **ACID transactions**: Vector search + metadata updates in a single transaction
- **Rich query language**: JOIN vector search results with your existing data
- **pgvectorscale**: Closes much of the performance gap with dedicated solutions
- **Cost**: Avoiding another managed service ($$$)

For most production RAG applications with <100M vectors, PostgreSQL is now a very strong choice.

## pgvector vs pgvectorscale

### pgvector (the standard)
The original PostgreSQL vector extension. Supports:
- Exact nearest neighbor search
- Approximate search via IVFFlat and HNSW indexes
- Distance metrics: L2, inner product, cosine, L1, Hamming, Jaccard

```sql
-- Install pgvector
CREATE EXTENSION vector;

-- Create a table with a vector column
CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI text-embedding-3-small dimensions
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an HNSW index (better for high-recall queries)
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### pgvectorscale (Timescale's extension)
pgvectorscale builds on pgvector with a new index type: **StreamingDiskANN**. This is a disk-aware implementation of DiskANN that:
- Stores most of the index on disk (drastically reduces memory requirements)
- Outperforms HNSW on large datasets with constrained memory
- Achieves better recall/latency tradeoffs at scale

```sql
-- pgvectorscale requires pgvector
CREATE EXTENSION vectorscale CASCADE;

-- StreamingDiskANN index
CREATE INDEX ON documents USING diskann (embedding vector_cosine_ops);

-- That's it! Much simpler configuration than HNSW tuning
```

### Performance Comparison (2026 benchmarks)

| Scenario | pgvector HNSW | pgvectorscale DiskANN | Pinecone |
|----------|--------------|----------------------|---------|
| 1M vectors, 1GB RAM | 8ms p99 | 12ms p99 | 5ms p99 |
| 10M vectors, 8GB RAM | 45ms p99 | 15ms p99 | 6ms p99 |
| 10M vectors, 32GB RAM | 18ms p99 | 10ms p99 | 5ms p99 |
| Index build time (10M) | 8 min | 12 min | N/A |
| Memory usage (10M) | 12GB | 3GB | N/A |

**Key insight**: pgvectorscale's DiskANN dramatically reduces memory requirements while maintaining good latency. For 10M+ vectors, it's the clear choice.

## Building a Production RAG Pipeline

Let's build a complete RAG system with PostgreSQL.

### Schema Design

```sql
-- Main documents table
CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,
    source_url TEXT,
    title TEXT,
    content TEXT NOT NULL,
    content_hash TEXT UNIQUE NOT NULL,  -- dedup
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chunks table (for chunked documents)
CREATE TABLE document_chunks (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    token_count INT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, chunk_index)
);

-- Indexes
CREATE INDEX ON document_chunks USING diskann (embedding vector_cosine_ops);
CREATE INDEX ON document_chunks (document_id);
CREATE INDEX ON document_chunks USING gin (metadata);

-- Full text search index for hybrid search
CREATE INDEX ON document_chunks USING gin (to_tsvector('english', content));
```

### Chunking and Embedding Pipeline

```python
import asyncio
import hashlib
from typing import AsyncGenerator
import asyncpg
from openai import AsyncOpenAI

client = AsyncOpenAI()

async def chunk_text(text: str, chunk_size: int = 512, overlap: int = 50) -> list[str]:
    """Simple overlapping chunk strategy."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = ' '.join(words[i:i + chunk_size])
        if chunk:
            chunks.append(chunk)
    return chunks

async def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts in one API call."""
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
        dimensions=1536
    )
    return [item.embedding for item in response.data]

async def ingest_document(
    pool: asyncpg.Pool,
    url: str,
    title: str,
    content: str,
    metadata: dict = None
) -> int:
    """Ingest a document into the vector store."""
    content_hash = hashlib.sha256(content.encode()).hexdigest()
    
    async with pool.acquire() as conn:
        # Upsert document
        doc_id = await conn.fetchval("""
            INSERT INTO documents (source_url, title, content, content_hash, metadata)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (content_hash) DO UPDATE SET
                updated_at = NOW(),
                metadata = EXCLUDED.metadata
            RETURNING id
        """, url, title, content, content_hash, metadata or {})
        
        # Check if chunks already exist
        existing = await conn.fetchval(
            "SELECT COUNT(*) FROM document_chunks WHERE document_id = $1", doc_id
        )
        if existing > 0:
            return doc_id
        
        # Chunk the content
        chunks = await chunk_text(content)
        
        # Embed in batches of 100
        batch_size = 100
        all_embeddings = []
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            embeddings = await embed_batch(batch)
            all_embeddings.extend(embeddings)
        
        # Insert chunks
        await conn.executemany("""
            INSERT INTO document_chunks 
                (document_id, chunk_index, content, embedding, token_count)
            VALUES ($1, $2, $3, $4, $5)
        """, [
            (doc_id, i, chunk, embedding, len(chunk.split()))
            for i, (chunk, embedding) in enumerate(zip(chunks, all_embeddings))
        ])
        
        return doc_id
```

### Hybrid Search: Vector + Full-Text

The real power of using PostgreSQL for RAG is **hybrid search** — combining semantic (vector) search with traditional full-text search using Reciprocal Rank Fusion (RRF):

```sql
-- Hybrid search with RRF (Reciprocal Rank Fusion)
CREATE OR REPLACE FUNCTION hybrid_search(
    query_text TEXT,
    query_embedding vector(1536),
    match_count INT DEFAULT 10,
    full_text_weight FLOAT DEFAULT 1.0,
    vector_weight FLOAT DEFAULT 1.0,
    rrf_k INT DEFAULT 60
)
RETURNS TABLE (
    id BIGINT,
    document_id BIGINT,
    content TEXT,
    metadata JSONB,
    rrf_score FLOAT
)
LANGUAGE SQL
AS $$
WITH 
-- Full text search results
full_text AS (
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        dc.metadata,
        ROW_NUMBER() OVER (ORDER BY ts_rank_cd(
            to_tsvector('english', dc.content),
            plainto_tsquery('english', query_text)
        ) DESC) AS rank
    FROM document_chunks dc
    WHERE to_tsvector('english', dc.content) @@ plainto_tsquery('english', query_text)
    LIMIT match_count * 2
),
-- Vector similarity search results  
vector AS (
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        dc.metadata,
        ROW_NUMBER() OVER (ORDER BY dc.embedding <=> query_embedding) AS rank
    FROM document_chunks dc
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count * 2
)
-- Reciprocal Rank Fusion
SELECT
    COALESCE(ft.id, v.id) AS id,
    COALESCE(ft.document_id, v.document_id) AS document_id,
    COALESCE(ft.content, v.content) AS content,
    COALESCE(ft.metadata, v.metadata) AS metadata,
    (
        COALESCE(full_text_weight * 1.0 / (rrf_k + ft.rank), 0) +
        COALESCE(vector_weight * 1.0 / (rrf_k + v.rank), 0)
    ) AS rrf_score
FROM full_text ft
FULL OUTER JOIN vector v ON ft.id = v.id
ORDER BY rrf_score DESC
LIMIT match_count;
$$;
```

Usage:

```python
async def search(
    pool: asyncpg.Pool,
    query: str,
    limit: int = 10,
    metadata_filter: dict = None
) -> list[dict]:
    """Hybrid search with optional metadata filtering."""
    # Get query embedding
    embedding_response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=query,
        dimensions=1536
    )
    query_embedding = embedding_response.data[0].embedding
    embedding_str = f"[{','.join(map(str, query_embedding))}]"
    
    async with pool.acquire() as conn:
        results = await conn.fetch("""
            SELECT id, document_id, content, metadata, rrf_score
            FROM hybrid_search($1, $2::vector, $3)
            WHERE ($4::jsonb IS NULL OR metadata @> $4::jsonb)
            ORDER BY rrf_score DESC
        """, query, embedding_str, limit, 
            json.dumps(metadata_filter) if metadata_filter else None)
        
        return [dict(r) for r in results]
```

## Production Considerations

### 1. Index Tuning for HNSW

If you stick with pgvector's HNSW (for smaller datasets that fit in RAM):

```sql
-- Tune for high recall
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops)
WITH (
    m = 16,           -- connections per node (higher = better recall, more memory)
    ef_construction = 128  -- candidate list size during build (higher = better, slower build)
);

-- For searches, tune ef_search per query
SET hnsw.ef_search = 100;  -- higher = better recall, slower query
```

### 2. Partitioning for Scale

For large document stores, partition by time or category:

```sql
CREATE TABLE document_chunks (
    id BIGSERIAL,
    document_id BIGINT NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE document_chunks_2026_q1
PARTITION OF document_chunks
FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');

CREATE TABLE document_chunks_2026_q2
PARTITION OF document_chunks
FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

-- Each partition gets its own index
CREATE INDEX ON document_chunks_2026_q2 
USING diskann (embedding vector_cosine_ops);
```

### 3. Connection Pooling with pgBouncer

Vector search queries can be CPU-intensive. Ensure proper connection pooling:

```ini
# pgbouncer.ini
[databases]
rag_db = host=postgres port=5432 dbname=rag_db

[pgbouncer]
pool_mode = transaction  # transaction mode for stateless queries
max_client_conn = 1000
default_pool_size = 20
reserve_pool_size = 5
```

### 4. Monitoring Vector Search Performance

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE tablename = 'document_chunks'
ORDER BY idx_scan DESC;

-- Check slow vector queries
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%<=>%'
ORDER BY mean_exec_time DESC
LIMIT 20;
```

## When to Use a Dedicated Vector Database

PostgreSQL + pgvectorscale handles most production RAG workloads, but you should consider a dedicated solution when:

- **Billion+ vectors**: Pinecone or Weaviate at this scale
- **Sub-5ms latency requirements**: Dedicated solutions still win on raw speed
- **Real-time vector updates at high throughput**: Dedicated DBs handle concurrent writes better
- **Multi-modal vectors** (image + text + audio): Some dedicated DBs have better native support

## Conclusion

For the vast majority of production RAG applications in 2026, PostgreSQL with pgvector or pgvectorscale is the pragmatic choice. You get good performance, ACID guarantees, the full power of SQL for filtering and joining, and you avoid operational overhead of another system.

Start with pgvector's HNSW index for datasets under 5M vectors. Switch to pgvectorscale's DiskANN when memory becomes a constraint or you scale beyond 10M vectors. Only reach for a dedicated vector database when you hit the limits of what PostgreSQL can do.

The "right tool for the job" in vector search often turns out to be the database you're already running.

---

*Building a RAG system? Share your architecture in the comments — I'd love to hear what's working at scale.*
