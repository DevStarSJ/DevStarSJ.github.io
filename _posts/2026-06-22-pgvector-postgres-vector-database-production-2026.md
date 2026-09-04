---
layout: post
title: "Postgres as a Vector Database: pgvector in Production 2026"
subtitle: "Why teams are consolidating their vector workloads into PostgreSQL — architecture, tuning, and the real cost comparison with dedicated vector DBs"
date: 2026-06-22 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - PostgreSQL
  - VectorDB
  - AI
  - RAG
  - Database
  - Backend
categories: ai
---

# Postgres as a Vector Database: pgvector in Production 2026

The vector database gold rush of 2023-2024 left many teams with a fragmented data stack: Pinecone for vectors, Redis for caching, PostgreSQL for relational data. In 2026, there's a quiet consolidation happening — teams are asking whether they actually need a dedicated vector database, or whether **pgvector** running inside their existing PostgreSQL instance is good enough. For most workloads, the answer is increasingly: pgvector is enough.

![Database architecture visualization](https://images.unsplash.com/photo-1489875347316-0d6a7b6aa6dd?w=1000&auto=format&fit=crop)
*Photo by Markus Spiske on Unsplash*

## What pgvector Provides Today

pgvector has matured significantly since its early releases. Version 0.8.x (current as of mid-2026) supports:

- **Vector storage** up to 16,000 dimensions
- **Exact nearest-neighbor search** (brute-force)
- **Approximate nearest-neighbor** via HNSW and IVFFlat indexes
- **Filtering**: combine vector search with SQL WHERE clauses
- **Distance metrics**: L2 (`<->`), inner product (`<#>`), cosine (`<=>`), L1 (`<+>`)
- **Half-precision vectors** (`halfvec`) for 2x storage reduction
- **Binary vectors** (`bit`) for ultra-compressed embeddings

## Setup and Basic Operations

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table with vector column
CREATE TABLE documents (
    id          BIGSERIAL PRIMARY KEY,
    content     TEXT NOT NULL,
    embedding   vector(1536),           -- OpenAI text-embedding-3-small
    metadata    JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Insert with embedding
INSERT INTO documents (content, embedding, metadata)
VALUES (
    'pgvector enables vector similarity search in PostgreSQL',
    '[0.023, -0.041, 0.178, ...]'::vector,
    '{"source": "blog", "topic": "database"}'
);

-- Cosine similarity search
SELECT
    id,
    content,
    1 - (embedding <=> '[0.021, -0.038, ...]'::vector) AS similarity
FROM documents
ORDER BY embedding <=> '[0.021, -0.038, ...]'::vector
LIMIT 10;
```

## The Critical Part: HNSW vs IVFFlat

Index choice is the most consequential performance decision.

### HNSW (Hierarchical Navigable Small World)

```sql
CREATE INDEX ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Parameters:**
- `m`: Number of connections per node (8–64, default 16). Higher = better recall, more memory
- `ef_construction`: Quality of graph construction (32–400, default 64). Higher = better quality, slower build

**Characteristics:**
- ✅ Excellent query performance (fast ANN search)
- ✅ No training data required
- ✅ Handles insertions without full rebuild
- ❌ High memory usage (~2x the data size at m=16)
- ❌ Slow to build for large datasets

### IVFFlat (Inverted File Index)

```sql
-- Requires data to exist before building index
CREATE INDEX ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Parameters:**
- `lists`: Number of clusters (~sqrt(num_rows) is a good starting point)

**Characteristics:**
- ✅ Much lower memory footprint
- ✅ Faster to build
- ❌ Lower recall at equivalent speed vs HNSW
- ❌ Requires data present at index creation
- ❌ Bulk inserts require periodic VACUUM/reindex

**Recommendation for 2026**: Default to HNSW for most production workloads. Its query performance and operational simplicity outweigh the memory cost unless you're memory-constrained.

## Filtered Vector Search: Where pgvector Shines

This is where pgvector beats most dedicated vector DBs — seamless hybrid queries:

```sql
-- Find similar documents, only for a specific user, recent ones
SELECT
    id,
    content,
    metadata->>'source' AS source,
    1 - (embedding <=> $1::vector) AS similarity
FROM documents
WHERE
    user_id = $2
    AND created_at > NOW() - INTERVAL '30 days'
    AND metadata->>'status' = 'published'
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

Try doing this in Pinecone. You'll be pulling IDs, then querying your RDBMS separately, then merging — a double round-trip with significant complexity.

### Pre-filter vs Post-filter

pgvector (like most ANN indexes) does approximate search within the full index, then applies SQL filters. For high-selectivity filters (< 5% of rows match), this can hurt recall:

```sql
-- For high-selectivity filters, set probes/ef_search higher
SET hnsw.ef_search = 200;   -- default is 40

-- Or use a partial index if you query a subset frequently
CREATE INDEX ON documents
USING hnsw (embedding vector_cosine_ops)
WHERE status = 'published';
```

## Production Configuration

### PostgreSQL Settings for Vector Workloads

```ini
# postgresql.conf adjustments

# More memory for larger working sets
shared_buffers = 4GB              # 25% of RAM
effective_cache_size = 12GB       # 75% of RAM

# HNSW index build parallelism
max_parallel_maintenance_workers = 4
maintenance_work_mem = 2GB        # Per worker for index builds

# Larger work_mem helps ANN searches
work_mem = 256MB

# Vector-specific
vector.hnsw_ef_search = 40        # Default, tune up for recall
```

### Connection Pooling is Essential

Vector search queries can be CPU-intensive. Use PgBouncer in transaction mode:

```ini
# pgbouncer.ini
[databases]
vector_db = host=localhost dbname=production

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
server_idle_timeout = 600
```

## Scaling Strategies

### Partitioning for Large Datasets

For tens of millions of vectors, partition by a natural dimension:

```sql
CREATE TABLE documents (
    id          BIGSERIAL,
    user_id     BIGINT NOT NULL,
    embedding   vector(1536),
    content     TEXT
) PARTITION BY HASH (user_id);

CREATE TABLE documents_0 PARTITION OF documents
    FOR VALUES WITH (modulus 4, remainder 0);
CREATE TABLE documents_1 PARTITION OF documents
    FOR VALUES WITH (modulus 4, remainder 1);
-- ... etc

-- Partition-aware index on each partition
CREATE INDEX ON documents_0 USING hnsw (embedding vector_cosine_ops);
```

### pgvector with Citus

For massive scale, Citus (PostgreSQL distributed extension, now open-source) allows sharding vector tables across nodes while preserving SQL semantics.

## Real Cost Comparison

For a concrete example: 10 million vectors at 1536 dimensions.

| Option | Monthly Cost | Notes |
|--------|-------------|-------|
| Pinecone (p1.x1) | ~$700 | Managed, s1 pod type |
| Qdrant Cloud | ~$300 | 16GB plan |
| Weaviate Cloud | ~$450 | Standard plan |
| RDS PostgreSQL + pgvector | ~$250 | db.r7g.2xlarge |
| Self-hosted Postgres | ~$100 | EC2 r7g.2xlarge |

Cost advantage is real — but the bigger win is **operational simplicity**: one backup strategy, one monitoring stack, one connection pool, one auth system.

## When to Use a Dedicated Vector DB

pgvector isn't always the answer:

- **>100M vectors** with complex filtering — dedicated DBs optimize for this
- **Multi-tenancy at massive scale** — some vector DBs have better isolation primitives
- **Real-time indexing at high write throughput** — pgvector's HNSW can lag under heavy concurrent writes
- **Sophisticated metadata filtering** — some dedicated DBs have better ANN-with-filter algorithms
- **Managed service without PostgreSQL expertise** — fully managed vector DBs reduce ops burden

## RAG Pattern with pgvector

A complete Python example:

```python
import asyncpg
from openai import AsyncOpenAI

openai = AsyncOpenAI()

async def semantic_search(query: str, user_id: int, top_k: int = 5):
    # Get query embedding
    response = await openai.embeddings.create(
        input=query,
        model="text-embedding-3-small"
    )
    query_vector = response.data[0].embedding
    
    # Search with filter
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        results = await conn.fetch("""
            SELECT
                id,
                content,
                metadata,
                1 - (embedding <=> $1::vector) AS similarity
            FROM documents
            WHERE user_id = $2
            ORDER BY embedding <=> $1::vector
            LIMIT $3
        """, query_vector, user_id, top_k)
        
        return [
            {
                "id": row["id"],
                "content": row["content"],
                "similarity": float(row["similarity"]),
                "metadata": dict(row["metadata"])
            }
            for row in results
        ]
    finally:
        await conn.close()
```

## The Verdict

pgvector in 2026 is production-grade for most RAG and similarity search use cases. If you're already running PostgreSQL, consolidating your vector workload there is probably the right default. The tooling is mature, the performance is competitive up to tens of millions of vectors, and the operational cost of running one database instead of two is real.

Start with pgvector. Migrate to a specialized solution when your data size, query complexity, or SLA requirements genuinely demand it — not because of theoretical future scale.

## References

- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [pgvector HNSW Documentation](https://github.com/pgvector/pgvector#hnsw)
- [Choosing Between pgvector and Dedicated Vector DBs — Neon Blog](https://neon.tech/blog/pgvector-vs-pinecone)
- [PostgreSQL Documentation: Vector Type](https://www.postgresql.org/docs/current/datatype.html)
