---
layout: post
title: "Building Reliable RAG Systems: From Prototype to Production"
subtitle: "Chunking strategies, retrieval quality, reranking, and everything else that makes or breaks your Retrieval-Augmented Generation pipeline"
date: 2026-03-06 10:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200"
catalog: true
tags:
  - RAG
  - LLM
  - AI Engineering
  - Vector Database
  - Information Retrieval
categories: ai
---

Retrieval-Augmented Generation (RAG) is the backbone of most production AI applications. Knowledge bases, document Q&A, code search, customer support — if your application needs to answer questions about specific content, RAG is usually how you do it.

The gap between "RAG prototype that works on your demo" and "RAG system that works reliably in production" is significant. This post covers the failure modes and how to address them.

![Library with rows of books — knowledge retrieval](https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800)
*Photo by Susan Yin on Unsplash*

---

## The Basic RAG Pipeline

First, the fundamentals. A RAG system has two phases:

**Indexing (offline):**
1. Load documents
2. Split into chunks
3. Embed each chunk (convert text → vector)
4. Store in a vector database

**Retrieval + Generation (online):**
1. User submits a query
2. Embed the query
3. Search the vector database for similar chunks (approximate nearest neighbor)
4. Stuff the retrieved chunks into an LLM prompt as context
5. LLM generates an answer grounded in the retrieved content

This is conceptually simple. The devil is in every implementation detail.

---

## Failure Mode 1: Bad Chunking

Chunking is where most RAG prototypes fail silently. The way you split documents determines what can be retrieved — and therefore what the LLM can answer.

### The naive approach and why it fails

```python
# Bad: split by character count, ignore semantics
chunks = [text[i:i+500] for i in range(0, len(text), 500)]
```

This cuts sentences mid-thought, separates context that belongs together, and creates chunks with no meaningful coherent meaning.

### Better chunking strategies

**Recursive text splitting (the standard baseline):**
```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50,
    separators=["\n\n", "\n", ". ", " ", ""],
)
chunks = splitter.split_text(document)
```

The overlap matters: without it, relevant context split across a boundary disappears.

**Semantic chunking:**
Instead of splitting on character count or separators, split on semantic boundaries — where the topic actually changes. Embed each sentence, and split when consecutive sentence embeddings diverge beyond a threshold.

```python
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai.embeddings import OpenAIEmbeddings

splitter = SemanticChunker(
    OpenAIEmbeddings(),
    breakpoint_threshold_type="percentile",
    breakpoint_threshold_amount=90,
)
chunks = splitter.split_text(document)
```

**Document-structure-aware chunking:**
For structured documents (Markdown, HTML, PDFs with headers), respect the document structure:

```python
# Split Markdown at header boundaries
from langchain.text_splitter import MarkdownHeaderTextSplitter

headers_to_split_on = [("#", "H1"), ("##", "H2"), ("###", "H3")]
splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on)
chunks = splitter.split_text(markdown_document)
```

Each chunk retains its header context, which dramatically improves retrieval relevance.

**Parent-child chunking:**
Store small chunks for retrieval precision, but return the larger parent context to the LLM:
- Small chunks (128 tokens) are indexed for fine-grained retrieval
- When a small chunk is retrieved, return its parent section (512 tokens) to the LLM

This gets you the best of both: precise retrieval, sufficient context.

---

## Failure Mode 2: Embedding Model Mismatch

Your embeddings are only as good as your embedding model. Common mistakes:

**Using a generic model for specialized content.** An embedding model trained on web text performs poorly on code, legal documents, or scientific papers. Match the model to your domain.

**Mixing embedding models.** If you re-index a portion of your documents with a new model, the vectors are not comparable. Old chunks from model A and new chunks from model B will have incorrect similarity scores. **Re-embed everything when you change models.**

**Ignoring embedding dimensions.** Larger embedding dimensions (1536 vs 384) capture more nuance but cost more. For most production use cases, `text-embedding-3-small` (1536 dims, reduced to 512 works fine) is a good default.

### Model Recommendations (2026)

| Use Case | Model |
|----------|-------|
| General text | `text-embedding-3-small` (OpenAI) or `nomic-embed-text` (open source) |
| Code | `voyage-code-3` (Voyage AI) |
| Multilingual | `multilingual-e5-large` or `paraphrase-multilingual-mpnet-base-v2` |
| Domain-specific | Fine-tune on your domain data |

---

## Failure Mode 3: Poor Retrieval Recall

The retriever doesn't find the relevant chunk. Common causes and fixes:

### Semantic search alone isn't enough

Vector similarity search finds semantically similar content but misses exact term matches. A user asking about "RFC 7519" needs keyword search, not semantic search.

**Hybrid search** (semantic + keyword) is now the production standard:

```python
from pinecone_text.sparse import BM25Encoder

# Sparse (BM25 keyword) + dense (embedding) search
sparse_encoder = BM25Encoder().default()
sparse_vector = sparse_encoder.encode_queries(query)
dense_vector = embed_query(query)

# Query with both vectors (Pinecone supports this natively)
results = index.query(
    vector=dense_vector,
    sparse_vector=sparse_vector,
    top_k=20,
)
```

Most production vector databases (Pinecone, Weaviate, Elasticsearch with vector support) support hybrid search.

### Retrieve more, then rerank

Instead of retrieving top-5 and using them directly, retrieve top-20 and use a reranking model to select the best 5:

```python
from cohere import Client

co = Client(api_key)
results = vector_db.query(query_vector, top_k=20)

# Rerank using Cohere's reranker
reranked = co.rerank(
    query=user_query,
    documents=[r.text for r in results],
    model="rerank-v3.5",
    top_n=5,
)
```

Reranking models (Cohere Rerank, BGE-reranker, Jina Reranker) are cross-encoders that evaluate (query, document) pairs together — much more accurate than embedding similarity alone. Adding reranking is consistently one of the highest-ROI improvements to RAG quality.

---

## Failure Mode 4: Context Window Stuffing

You retrieved 20 chunks, you put them all in the prompt. Problems:
- LLMs lose track of information in long contexts ("lost in the middle" effect)
- Cost grows linearly with retrieved context
- Irrelevant chunks actively harm answer quality

**Best practices:**
- **Retrieve top-20, rerank, use top-3 to 5**
- **Measure context relevance** — if retrieved chunks have similarity below 0.7, don't include them (no context is better than bad context)
- **Order matters** — put the most relevant chunk first or last, not buried in the middle

---

## Failure Mode 5: No Grounding Verification

The LLM generates a confident answer that's not actually supported by the retrieved context. This is silent hallucination.

**Add a grounding check:**

{% raw %}
```python
GROUNDING_PROMPT = """
Given the following retrieved context and the AI's answer:

Context: {context}

Answer: {answer}

Question: Is every factual claim in the answer supported by the context?
Respond: {{"grounded": true/false, "unsupported_claims": [...]}}
"""

def check_grounding(context, answer) -> dict:
    result = llm.complete(GROUNDING_PROMPT.format(context=context, answer=answer))
    return json.loads(result)
```
{% endraw %}

For high-stakes applications, fail or flag answers that aren't fully grounded. For others, include a confidence score.

---

## Production Architecture

A mature RAG system in 2026 looks like this:

```
User Query
    ↓
[Query Transformation] ← rewrite query for retrieval, expand synonyms
    ↓
[Hybrid Retrieval] ← dense + sparse, top-20
    ↓
[Reranking] ← cross-encoder, select top-5
    ↓
[Context Assembly] ← format, truncate, order
    ↓
[LLM Generation] ← with grounded context
    ↓
[Grounding Check] ← verify factual support
    ↓
[Response] → User
```

Each step is instrumented with traces (LangSmith, Langfuse, or Phoenix) so you can debug when answers go wrong.

![Abstract data flow and architecture diagram](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800)
*Photo by Taylor Vick on Unsplash*

---

## Evaluation Framework for RAG

Use RAGAS metrics to measure quality:

| Metric | Measures | Target |
|--------|----------|--------|
| Faithfulness | Is the answer grounded in context? | > 0.85 |
| Answer Relevancy | Does the answer address the question? | > 0.80 |
| Context Precision | Are the retrieved chunks relevant? | > 0.75 |
| Context Recall | Were relevant chunks found? | > 0.70 |

```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision

result = evaluate(
    dataset=eval_dataset,
    metrics=[faithfulness, answer_relevancy, context_precision],
)
print(result)
```

Run this against a golden dataset on every RAG pipeline change.

---

## Vector Database Selection

For 2026 production use:

**Pinecone** — managed, scalable, hybrid search, minimal operational burden. Good default for teams that don't want to self-manage.

**Weaviate** — open source, self-hostable, excellent hybrid search, object storage. Good for teams that want control.

**pgvector (PostgreSQL)** — if you're already on Postgres and scale requirements are moderate (<10M vectors), staying in-database simplifies architecture enormously. [pgvector 0.8+](https://github.com/pgvector/pgvector) with HNSW indexing is competitive.

**Qdrant** — high-performance, written in Rust, great for self-hosting. Strong payload filtering support.

Don't choose a vector database based on benchmarks alone. Operational maturity, filtering capabilities, and hybrid search support matter more for most production use cases.

---

## Quick Wins

If you have an existing RAG system and want to improve it fast:

1. **Add reranking** — Cohere Rerank or BGE-reranker. Biggest bang for effort.
2. **Switch to hybrid search** — add BM25 alongside embeddings.
3. **Add chunk overlap** — if your current overlap is 0, add 50-100 tokens.
4. **Add a grounding check** — detect and flag hallucinations.
5. **Instrument with traces** — you can't debug what you can't see.

---

## Resources

- [RAGAS — RAG Evaluation Framework](https://docs.ragas.io/)
- [LangChain Text Splitters](https://python.langchain.com/docs/modules/data_connection/document_transformers/)
- [Pinecone Hybrid Search Guide](https://docs.pinecone.io/guides/data/understanding-hybrid-search)
- [Cohere Rerank Documentation](https://docs.cohere.com/docs/reranking)
- [pgvector — Vector Search for PostgreSQL](https://github.com/pgvector/pgvector)
- [Langfuse — Open Source LLM Engineering Platform](https://langfuse.com)
