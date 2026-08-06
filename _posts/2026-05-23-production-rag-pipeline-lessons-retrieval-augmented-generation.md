---
layout: post
title: "Building Reliable RAG Pipelines in Production: Lessons from Real Deployments"
subtitle: "Moving beyond the demo — the indexing strategies, retrieval tuning, and evaluation frameworks that make RAG actually work at scale"
date: 2026-05-23 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1555952517-2e8e729e0b44?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - RAG
  - LLM
  - Vector Database
  - AI Engineering
  - NLP
  - Production ML
---

# Building Reliable RAG Pipelines in Production: Lessons from Real Deployments

Retrieval-Augmented Generation looked straightforward in the tutorial. Embed your docs, store in a vector DB, retrieve top-k at query time, stuff into the prompt, done. Ship it.

Then you hit production. Users ask questions in ways you didn't anticipate. Retrieval returns the wrong chunks. The model confidently answers from outdated context. Latency spikes. Costs balloon.

This post is about making RAG actually work — the patterns that separate demos from production systems.

![RAG Pipeline Architecture](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1000&auto=format&fit=crop)
*Photo by imgix on Unsplash*

---

## The Core Problem: Naive Retrieval Fails on Real Queries

The default RAG setup — embed query, cosine similarity search, take top-5 — works well when:
- Queries closely match the surface language of documents
- Questions are self-contained
- Document corpus is small and homogeneous

It fails when:
- Users ask vague, conversational questions
- Multi-hop questions require combining multiple chunks
- The corpus spans many domains with different terminology
- Query intent doesn't match document vocabulary (lexical gap)

Let's work through the main failure modes and their fixes.

---

## Failure Mode 1: Vocabulary Mismatch

A user asks "how do I cancel my subscription?" Your docs say "terminate your membership" and "account deactivation." Dense vector search should handle this — but doesn't always, especially for domain-specific or product-specific terms.

### Fix: Hybrid Search (Dense + Sparse)

Combine dense vector search with BM25 (sparse, keyword-based) using a reciprocal rank fusion (RRF) merge:

```python
from rank_bm25 import BM25Okapi
import numpy as np

class HybridRetriever:
    def __init__(self, chunks, embeddings, embed_fn, alpha=0.5):
        """
        alpha: weight for dense scores (0 = pure BM25, 1 = pure dense)
        """
        self.chunks = chunks
        self.embeddings = embeddings
        self.embed_fn = embed_fn
        self.alpha = alpha
        
        # BM25 index
        tokenized = [chunk.split() for chunk in chunks]
        self.bm25 = BM25Okapi(tokenized)
    
    def retrieve(self, query: str, top_k: int = 5) -> list[str]:
        # Dense scores
        query_emb = self.embed_fn(query)
        dense_scores = np.dot(self.embeddings, query_emb)
        dense_ranks = np.argsort(-dense_scores)
        
        # Sparse scores
        sparse_scores = self.bm25.get_scores(query.split())
        sparse_ranks = np.argsort(-sparse_scores)
        
        # RRF merge
        rrf_scores = {}
        k = 60  # RRF constant
        
        for rank, idx in enumerate(dense_ranks):
            rrf_scores[idx] = rrf_scores.get(idx, 0) + self.alpha / (k + rank + 1)
        
        for rank, idx in enumerate(sparse_ranks):
            rrf_scores[idx] = rrf_scores.get(idx, 0) + (1 - self.alpha) / (k + rank + 1)
        
        sorted_indices = sorted(rrf_scores, key=rrf_scores.get, reverse=True)
        return [self.chunks[i] for i in sorted_indices[:top_k]]
```

In practice, hybrid search with alpha around 0.6-0.7 (slightly favoring dense) consistently outperforms pure dense or pure sparse search on enterprise corpora.

---

## Failure Mode 2: Conversation Context Lost in Multi-Turn

Query: "What are the pricing tiers?" → retrieval works fine.
Follow-up: "Which one supports SSO?" → retrieval fails because "SSO" doesn't appear in the query context needed to understand it's still about pricing tiers.

### Fix: Query Rewriting for Conversation

Before retrieval, rewrite the query using conversation history to make it self-contained:

```python
async def rewrite_query_for_retrieval(
    conversation_history: list[dict],
    current_query: str,
    llm_client
) -> str:
    """Rewrite current_query into a standalone question with full context."""
    
    if len(conversation_history) < 2:
        return current_query  # No context to add
    
    history_text = "\n".join([
        f"{msg['role'].capitalize()}: {msg['content']}"
        for msg in conversation_history[-4:]  # Last 2 turns
    ])
    
    response = await llm_client.chat.completions.create(
        model="gpt-4o-mini",  # Use cheap model for rewriting
        messages=[
            {
                "role": "system",
                "content": "Rewrite the user's follow-up question as a complete, "
                           "standalone question that includes all necessary context "
                           "from the conversation. Output only the rewritten question."
            },
            {
                "role": "user",
                "content": f"Conversation:\n{history_text}\n\n"
                           f"Follow-up question: {current_query}\n\n"
                           "Standalone question:"
            }
        ],
        max_tokens=150
    )
    
    return response.choices[0].message.content.strip()
```

"Which one supports SSO?" becomes "Which pricing tier of [Product] supports Single Sign-On (SSO)?" — and retrieval works.

---

## Failure Mode 3: Chunk Boundaries Cut Context

A chunk ends mid-explanation. The critical sentence is in the next chunk. Top-k retrieval gets the first chunk but not the second.

### Fix: Sentence-Window Retrieval

Index at sentence level but retrieve at window level:

```python
class SentenceWindowIndex:
    """
    Index individual sentences for precise retrieval,
    but return surrounding context window when a match is found.
    """
    def __init__(self, documents: list[str], window_size: int = 3):
        self.window_size = window_size
        self.sentences = []
        self.doc_sentence_map = []  # (doc_idx, sent_idx) for each stored sentence
        
        for doc_idx, doc in enumerate(documents):
            sents = self._split_sentences(doc)
            for sent_idx, sent in enumerate(sents):
                self.sentences.append(sent)
                self.doc_sentence_map.append((doc_idx, sent_idx, len(sents)))
    
    def retrieve_with_context(self, query_embedding, doc_sentences_by_doc, top_k=5):
        """Returns sentence matches expanded to their surrounding window."""
        # ... vector search to find matching sentence indices
        results = []
        for sent_idx in top_matching_indices:
            doc_idx, s_idx, total_sents = self.doc_sentence_map[sent_idx]
            
            # Expand to window
            start = max(0, s_idx - self.window_size)
            end = min(total_sents, s_idx + self.window_size + 1)
            
            window_sentences = doc_sentences_by_doc[doc_idx][start:end]
            results.append(" ".join(window_sentences))
        
        return results
    
    def _split_sentences(self, text: str) -> list[str]:
        import re
        return re.split(r'(?<=[.!?])\s+', text)
```

Index at sentence level (fine-grained matching), retrieve at paragraph level (full context). Significant quality improvement on long-form documents.

---

## Failure Mode 4: No Hallucination Detection

Your retrieval returned relevant chunks. The model answered using those chunks. But it also added a detail that wasn't in any chunk — and it was wrong.

### Fix: Citation Grounding + Faithfulness Check

Require citations, then verify them:

{% raw %}
```python
GROUNDED_SYSTEM_PROMPT = """
You are a helpful assistant. Answer using ONLY the provided context.
For every claim, cite the source passage in [brackets].
If the context doesn't contain enough information, say so explicitly.
Do not add information from your training data.
"""

async def answer_with_grounding_check(
    query: str,
    context_chunks: list[str],
    llm_client
) -> dict:
    
    context_text = "\n\n".join([
        f"[Source {i+1}]: {chunk}"
        for i, chunk in enumerate(context_chunks)
    ])
    
    # Get grounded answer
    response = await llm_client.chat.completions.create(
        model="gpt-5",
        messages=[
            {"role": "system", "content": GROUNDED_SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\n{context_text}\n\nQuestion: {query}"}
        ]
    )
    
    answer = response.choices[0].message.content
    
    # Faithfulness check: ask the model to verify its own claims
    faithfulness_check = await llm_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": f"Context:\n{context_text}\n\n"
                           f"Answer: {answer}\n\n"
                           "Does every claim in the answer appear in the context? "
                           "Reply with JSON: {{\"faithful\": true/false, "
                           "\"issues\": [\"list of unsupported claims if any\"]}}"
            }
        ],
        response_format={"type": "json_object"}
    )
    
    import json
    check_result = json.loads(faithfulness_check.choices[0].message.content)
    
    return {
        "answer": answer,
        "faithful": check_result["faithful"],
        "issues": check_result.get("issues", [])
    }
```
{% endraw %}

For high-stakes applications (legal, medical, financial), gate answers on faithfulness check. For consumer products, log the issues and use them to improve your pipeline.

---

## Evaluation: You Can't Improve What You Don't Measure

### Build a RAG Evaluation Set

Your eval set should have:
- 50-200 question/answer/source triples
- Coverage of common query patterns
- Adversarial cases (questions where no answer exists, ambiguous queries)

```python
eval_dataset = [
    {
        "question": "What is the refund policy for annual plans?",
        "expected_answer": "30-day money-back guarantee",
        "source_chunk_id": "pricing-faq-chunk-12",
        "difficulty": "easy"
    },
    {
        "question": "Can I downgrade mid-billing cycle?",
        "expected_answer": "Yes, but changes take effect next billing period",
        "source_chunk_id": "billing-chunk-7",
        "difficulty": "medium"
    },
    {
        "question": "What's the best plan for a team of 5?",
        "expected_answer": None,  # Opinion question, no "correct" answer
        "source_chunk_id": None,
        "difficulty": "hard"
    }
]
```

### Key Metrics

| Metric | What It Measures | Tool |
|--------|-----------------|------|
| Retrieval Recall@k | Did the right chunk appear in top-k? | Custom |
| Answer Relevance | Does the answer address the question? | LLM-as-judge |
| Faithfulness | Are claims grounded in context? | LLM-as-judge |
| Context Precision | Are retrieved chunks actually used? | LLM-as-judge |
| Latency (p50/p95) | End-to-end response time | Prometheus |

Use [RAGAS](https://github.com/explodinggradients/ragas) for automated LLM-as-judge evaluation — it operationalizes most of these metrics.

---

## Production Architecture

![Production RAG System](https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1000&auto=format&fit=crop)
*Photo by Marvin Meyer on Unsplash*

```
User Query
    │
    ▼
Query Rewriter (conversation history → standalone query)
    │
    ▼
Hybrid Retriever (dense + sparse → RRF merge)
    │
    ▼
Reranker (cross-encoder for final top-k selection)
    │
    ▼
Context Assembly (sentence-window expansion + dedup)
    │
    ▼
LLM Generation (grounded prompting + citations)
    │
    ▼
Faithfulness Check (async, for monitoring)
    │
    ▼
Response
```

Each stage is independently swappable. The reranker (e.g., Cohere Rerank, BGE-reranker) is often the highest-ROI addition for an existing pipeline — it's a small cross-encoder that re-scores your retrieval candidates and significantly improves precision.

---

## Summary: The RAG Quality Ladder

1. **Level 1:** Basic dense retrieval → get something working
2. **Level 2:** Hybrid search → fix vocabulary mismatch
3. **Level 3:** Query rewriting → fix multi-turn conversations
4. **Level 4:** Sentence-window retrieval → fix chunk boundary issues
5. **Level 5:** Reranking → improve precision before generation
6. **Level 6:** Faithfulness checking + eval suite → know what's breaking

Most production systems live at Level 2-3. Level 4-6 is where the quality gap between "okay demo" and "users trust this thing" gets closed.

Start with Level 1, measure everything, and climb the ladder based on what your metrics tell you is actually failing.
