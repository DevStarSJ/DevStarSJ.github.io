---
layout: post
title: "Vector Databases in Production: Lessons from Running Embeddings at Scale"
subtitle: "Pinecone, Weaviate, Qdrant, pgvector — after two years of vector search in production, here's what actually matters when your embedding corpus hits 100M+ vectors"
date: 2026-03-10 10:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=1200"
catalog: true
tags:
  - Vector Database
  - AI
  - Machine Learning
  - Database
  - Search
  - RAG
categories: ai
---

Two years ago, "vector database" was a term most engineers learned the week they started building their first RAG pipeline. Today it's a production concern — teams are running hundreds of millions of vectors, managing embedding model upgrades, dealing with stale indexes, and debugging why semantic search returns the wrong results at 2am. This post is about what we've learned.

---

## The Vector Database Landscape in 2026

The market has largely consolidated around a few serious players:

| Database | Best For | Weaknesses |
|---|---|---|
| **Pinecone** | Managed, zero-ops, fast iteration | Cost at scale, vendor lock-in |
| **Weaviate** | Hybrid search, rich schema, self-hosted | Operational complexity |
| **Qdrant** | High performance, Rust-based, flexible | Younger ecosystem |
| **pgvector + PostgreSQL** | Existing Postgres users, < 10M vectors | Doesn't scale to huge corpora well |
| **Chroma** | Local dev, prototyping | Not production-grade for large workloads |
| **Milvus** | Massive scale (1B+ vectors), enterprise | Complex to operate |

The honest advice: **start with pgvector if you already run Postgres and your corpus is under 5M vectors**. The operational simplicity wins over purpose-built systems at that scale.

![Database architecture visualization](https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=900)
*Photo by Jan Antonin Kolar on Unsplash*

---

## Indexing Strategies: HNSW vs IVF

Most vector databases offer HNSW (Hierarchical Navigable Small World) as the default. It's the right choice for most use cases — but understanding the tradeoffs helps when you're tuning.

### HNSW

```python
# Qdrant HNSW config example
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, HnswConfigDiff

client = QdrantClient("localhost", port=6333)

client.create_collection(
    collection_name="documents",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
    hnsw_config=HnswConfigDiff(
        m=16,           # connections per node — higher = better recall, more memory
        ef_construct=200,  # build-time search depth — higher = better recall, slower build
        full_scan_threshold=10000,  # use brute force below this count
    )
)
```

**HNSW characteristics:**
- O(log n) query time
- High recall even at large scales
- Memory-hungry: roughly 4-8 bytes per vector per dimension, plus graph overhead
- Slow to build (especially with high `m`/`ef_construct`)
- Immutable once built (updates require rebuilding or appending with segment merges)

### IVF (Inverted File Index)

```python
# Weaviate IVF-flat via Python client
import weaviate

client = weaviate.Client("http://localhost:8080")

client.schema.create_class({
    "class": "Document",
    "vectorIndexType": "flat",  # Use "hnsw" for large corpora
    "vectorIndexConfig": {
        "distance": "cosine"
    },
    "properties": [
        {"name": "content", "dataType": ["text"]},
        {"name": "source", "dataType": ["text"]}
    ]
})
```

IVF clusters vectors into buckets and searches only the most relevant buckets. It's more memory-efficient but has lower recall for the same query speed.

**Rule of thumb:** Use HNSW for < 50M vectors. Consider IVF variants (IVF-PQ, IVF-HNSW) when memory pressure becomes critical above that.

---

## The Hybrid Search Problem

Pure vector search has a well-known failure mode: it finds *similar* content but not necessarily *relevant* content. Keyword search has the opposite problem: it finds *relevant* terms but misses semantic equivalents.

**Hybrid search combines both.** In 2026, every serious vector database has hybrid search built in.

```python
# Weaviate hybrid search
result = (
    client.query
    .get("Document", ["content", "source", "title"])
    .with_hybrid(
        query="how to deploy kubernetes in production",
        alpha=0.75,  # 0 = pure BM25, 1 = pure vector, 0.75 = mostly vector
        properties=["content", "title"]
    )
    .with_limit(10)
    .do()
)
```

```python
# Qdrant hybrid search (sparse + dense)
from qdrant_client.models import SparseVector, NamedSparseVector

# You need to store sparse vectors at index time too
client.search_batch(
    collection_name="documents",
    requests=[
        # Dense search
        SearchRequest(vector=NamedVector(name="dense", vector=query_embedding), limit=20),
        # Sparse (BM25-style) search  
        SearchRequest(vector=NamedSparseVector(name="sparse", vector=sparse_query), limit=20),
    ]
)
# Then merge results with RRF (Reciprocal Rank Fusion)
```

**Reciprocal Rank Fusion (RRF)** is the standard merging strategy. It's surprisingly robust — simple to implement, works well without tuning:

```python
def rrf_merge(dense_results, sparse_results, k=60):
    scores = {}
    for rank, doc_id in enumerate(dense_results):
        scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)
    for rank, doc_id in enumerate(sparse_results):
        scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)
```

---

## Embedding Model Upgrades Are a Migration Problem

This is the thing nobody talks about at conference talks. You chose `text-embedding-ada-002` in 2023. Now `text-embedding-3-large` is better. You have 50M vectors.

**The naive approach:** Reindex everything, rebuild the index. For 50M vectors at ~$0.00002 per 1K tokens, that's a few hundred dollars and a weekend of compute. Doable once. Not doable quarterly.

**The practical approach:**

1. **Namespace or shard by model version.** Keep old and new embeddings in parallel collections.

```python
# Collection naming convention
collection_v1 = "documents_ada002_v1"    # old embeddings
collection_v2 = "documents_emb3large_v2"  # new embeddings

# During transition: search both, merge results
results_v1 = client.search(collection_v1, query_vector=old_embedding, limit=20)
results_v2 = client.search(collection_v2, query_vector=new_embedding, limit=20)
merged = rrf_merge([r.id for r in results_v1], [r.id for r in results_v2])
```

2. **Shadow index new content only.** Stop adding to the old index; only write to the new one. Old content stays in the old index. New content in the new.

3. **Background migration.** Batch-re-embed old content during off-hours, populating the new index incrementally. Promote the new index when coverage is above a threshold (e.g., 95%).

---

## Metadata Filtering: The Hidden Performance Killer

Vector search + metadata filter sounds simple. In practice, it's one of the most common performance pitfalls.

```python
# This is SLOW at scale — post-filtering
results = client.search(
    collection_name="documents",
    query_vector=query_embedding,
    limit=100,  # Get many, then filter
    with_payload=True
)
# Filter client-side...
filtered = [r for r in results if r.payload["tenant_id"] == "acme" and r.payload["date"] > "2025-01-01"]
```

```python
# This is FAST — pre-filtering with index pushdown
from qdrant_client.models import Filter, FieldCondition, MatchValue, Range

results = client.search(
    collection_name="documents",
    query_vector=query_embedding,
    query_filter=Filter(
        must=[
            FieldCondition(key="tenant_id", match=MatchValue(value="acme")),
            FieldCondition(key="date", range=Range(gte="2025-01-01")),
        ]
    ),
    limit=10
)
```

But even pre-filtering has a gotcha: if your filter is highly selective (e.g., a tenant with 1,000 docs in a 100M vector index), HNSW degrades significantly. The graph search assumes a dense neighborhood; sparse filtered spaces break that assumption.

**Solutions:**
- **Tenant-sharded collections** — separate collection per large tenant, shared collection for small ones
- **Payload-indexed quantization** — some databases (Qdrant, Weaviate) can route searches to specific segments based on payload
- **Brute force fallback** — below a threshold, scan the filtered subset exhaustively

---

## Monitoring Vector Search in Production

Standard APM tools miss vector-specific failure modes. What to track:

```python
# Custom metrics to emit
metrics = {
    "vector_search_recall_at_k": ...,    # Offline eval against labeled queries
    "p99_search_latency_ms": ...,         # Should be < 100ms for interactive use
    "index_size_vectors": ...,            # Watch for unbounded growth
    "segment_count": ...,                 # Too many segments = slow merges
    "ef_query_value": ...,               # If you're tuning this dynamically
    "hybrid_alpha": ...,                 # Log this when you A/B test
}
```

And run **periodic recall evaluation** — not just latency. It's possible for your search to be fast but wrong (embedding model drift, index corruption, or subtle parameter changes).

---

## The pgvector Case in 2026

pgvector `0.7.x` now supports HNSW with parallel index builds and much better `ivfflat` performance. For many teams, this is genuinely good enough:

```sql
-- pgvector HNSW index
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 200);

-- Query
SELECT id, content, 1 - (embedding <=> $1::vector) AS similarity
FROM documents
WHERE tenant_id = 'acme'
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

**When pgvector is enough:** < 5M vectors, Postgres already in your stack, team not ready to operate another service, budget-sensitive.

**When to graduate:** > 10M vectors, multi-tenant at scale, need hybrid search or advanced filtering, sub-50ms p99 latency requirements.

---

Vector search is now a commodity. The technology is solved. The hard part is the same as always: knowing which tool fits your scale, keeping your indexes fresh, and building evaluation pipelines that tell you when semantic search is quietly getting worse.

---

*References: [Qdrant Documentation](https://qdrant.tech/documentation/), [Weaviate Hybrid Search Guide](https://weaviate.io/developers/weaviate/search/hybrid), [pgvector GitHub](https://github.com/pgvector/pgvector)*
