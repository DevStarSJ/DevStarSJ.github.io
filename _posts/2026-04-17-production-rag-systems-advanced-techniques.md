---
layout: post
title: "Building Production-Ready RAG Systems: Beyond the Basics"
subtitle: "Chunking strategies, reranking, hybrid search, and evaluation frameworks for enterprise-grade Retrieval-Augmented Generation"
date: 2026-04-17 12:00:00
author: "Seokjun Lee"
header-img: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80"
catalog: true
tags:
  - AI
  - RAG
  - Vector Search
  - LLM
  - NLP
  - Python
---

# Building Production-Ready RAG Systems: Beyond the Basics

Every developer has built a basic RAG system. You chunk some documents, embed them, shove them in a vector store, and retrieve the top-k nearest neighbors. It works fine in demos. Then you put it in production and watch it fail in creative ways.

This post covers the techniques that separate toy RAG implementations from systems that actually work reliably at scale.

![Machine Learning and AI Systems](https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1000&q=80)
*Photo by [Lautaro Andreani](https://unsplash.com/@lautaroandreani) on Unsplash*

---

## The Problem with Naive RAG

Naive RAG fails in predictable ways:

1. **Chunking too coarsely** → context is diluted, irrelevant content retrieved
2. **Chunking too finely** → context is fragmented, answers lack coherence
3. **Pure semantic search** → misses exact keyword matches (product names, error codes)
4. **Top-k retrieval** → irrelevant chunks often score higher than relevant ones
5. **No evaluation** → you don't know when quality degrades

Let's solve each one.

---

## 1. Advanced Chunking Strategies

### Semantic Chunking

Instead of fixed-size chunks, split where topic changes — not at arbitrary character counts.

```python
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

text_splitter = SemanticChunker(
    OpenAIEmbeddings(),
    breakpoint_threshold_type="percentile",
    breakpoint_threshold_amount=90
)

chunks = text_splitter.split_text(document_text)
```

### Hierarchical Chunking (Parent-Child)

Store both large parent chunks and small child chunks. Retrieve small chunks for precision, but return the parent for context.

```python
from langchain.retrievers import ParentDocumentRetriever
from langchain.storage import InMemoryStore
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Parent splitter: large context windows
parent_splitter = RecursiveCharacterTextSplitter(chunk_size=2000)

# Child splitter: small, precise chunks for retrieval
child_splitter = RecursiveCharacterTextSplitter(chunk_size=400)

vectorstore = Chroma(
    collection_name="full_documents",
    embedding_function=embeddings
)
store = InMemoryStore()

retriever = ParentDocumentRetriever(
    vectorstore=vectorstore,
    docstore=store,
    child_splitter=child_splitter,
    parent_splitter=parent_splitter,
)

retriever.add_documents(docs)
```

### Proposition-Based Chunking

Convert documents into atomic, self-contained propositions. Each chunk is a single verifiable fact.

```python
proposition_prompt = """
Decompose the following passage into a list of simple, factual propositions.
Each proposition should:
- Be a single, complete statement
- Be understandable without additional context
- Not contain pronouns that reference other propositions

Passage: {text}

Return as a JSON array of strings.
"""

def extract_propositions(text: str) -> list[str]:
    response = llm.invoke(proposition_prompt.format(text=text))
    return json.loads(response.content)
```

---

## 2. Hybrid Search: Combining Dense and Sparse Retrieval

Pure vector search misses exact matches. Pure BM25 misses semantic similarity. Combine them.

### Reciprocal Rank Fusion (RRF)

```python
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever

# Sparse retriever (keyword search)
bm25_retriever = BM25Retriever.from_documents(documents)
bm25_retriever.k = 10

# Dense retriever (semantic search)
faiss_retriever = vectorstore.as_retriever(search_kwargs={"k": 10})

# Hybrid with RRF fusion
ensemble_retriever = EnsembleRetriever(
    retrievers=[bm25_retriever, faiss_retriever],
    weights=[0.4, 0.6]  # Tune based on your data
)

results = ensemble_retriever.invoke("What is the refund policy?")
```

### When to Weight Toward BM25

- Queries with specific model numbers, error codes, or product names
- Legal/medical documents with precise terminology
- Code documentation (function names, API endpoints)

### When to Weight Toward Dense

- Conceptual questions ("How does X work?")
- Multi-language retrieval
- Paraphrase-heavy queries

---

## 3. Reranking: The Second Stage That Changes Everything

Retrieval gets you 20-50 candidates. Reranking selects the best 3-5.

### Cross-Encoder Reranking

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

def rerank_documents(query: str, documents: list, top_k: int = 5) -> list:
    """Rerank documents using a cross-encoder."""
    
    pairs = [(query, doc.page_content) for doc in documents]
    scores = reranker.predict(pairs)
    
    ranked = sorted(
        zip(documents, scores),
        key=lambda x: x[1],
        reverse=True
    )
    
    return [doc for doc, score in ranked[:top_k]]
```

### LLM-as-Judge Reranking (for high-stakes scenarios)

```python
def llm_rerank(query: str, documents: list, top_k: int = 3) -> list:
    """Use LLM to select most relevant documents."""
    
    doc_list = "\n\n".join([
        f"[{i+1}] {doc.page_content[:500]}"
        for i, doc in enumerate(documents)
    ])
    
    response = llm.invoke(f"""
    Query: {query}
    
    Documents:
    {doc_list}
    
    Select the {top_k} most relevant document indices for answering the query.
    Return ONLY a JSON array of indices, e.g.: [2, 5, 1]
    """)
    
    indices = json.loads(response.content)
    return [documents[i-1] for i in indices if 1 <= i <= len(documents)]
```

---

## 4. Query Transformation

Don't send the raw user query to the retriever. Transform it first.

### HyDE (Hypothetical Document Embeddings)

Generate a hypothetical answer and embed that instead of the question.

```python
def hyde_retrieve(query: str, retriever) -> list:
    """HyDE: generate a hypothetical answer for better retrieval."""
    
    hypothesis = llm.invoke(f"""
    Write a detailed, factual paragraph that would directly answer this question.
    Write as if you're certain of the answer.
    
    Question: {query}
    
    Answer:
    """).content
    
    # Embed the hypothesis, not the query
    return retriever.invoke(hypothesis)
```

### Query Decomposition

Break complex queries into sub-queries, retrieve for each, then synthesize.

```python
def decompose_and_retrieve(query: str, retriever) -> list:
    """Decompose complex queries into sub-queries."""
    
    sub_queries = llm.invoke(f"""
    Break this complex question into 2-3 simpler sub-questions.
    Return as a JSON array of strings.
    
    Question: {query}
    """).content
    
    sub_queries = json.loads(sub_queries)
    
    all_docs = []
    for sub_query in sub_queries:
        docs = retriever.invoke(sub_query)
        all_docs.extend(docs)
    
    # Deduplicate
    seen = set()
    unique_docs = []
    for doc in all_docs:
        if doc.page_content not in seen:
            seen.add(doc.page_content)
            unique_docs.append(doc)
    
    return unique_docs
```

---

## 5. RAG Evaluation: Know When Your System Breaks

Without evaluation, you're flying blind. Use RAGAS for automated evaluation.

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from datasets import Dataset

def evaluate_rag_pipeline(
    questions: list[str],
    answers: list[str],
    contexts: list[list[str]],
    ground_truths: list[str]
) -> dict:
    
    data = {
        "question": questions,
        "answer": answers,
        "contexts": contexts,
        "ground_truth": ground_truths,
    }
    
    dataset = Dataset.from_dict(data)
    
    result = evaluate(
        dataset=dataset,
        metrics=[
            faithfulness,       # Does answer stay true to context?
            answer_relevancy,   # Is answer relevant to question?
            context_precision,  # Are retrieved docs relevant?
            context_recall,     # Did we retrieve all necessary info?
        ],
    )
    
    return result
```

### Setting Up Continuous Evaluation

```python
import mlflow

def log_rag_metrics(metrics: dict, run_name: str):
    """Log RAG quality metrics to MLflow."""
    
    with mlflow.start_run(run_name=run_name):
        mlflow.log_metrics({
            "faithfulness": metrics["faithfulness"],
            "answer_relevancy": metrics["answer_relevancy"],
            "context_precision": metrics["context_precision"],
            "context_recall": metrics["context_recall"],
        })
```

---

![Data Processing Pipeline](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&q=80)
*Photo by [Luke Chesser](https://unsplash.com/@lukechesser) on Unsplash*

## 6. Production Architecture

Here's a battle-tested architecture for production RAG:

```
User Query
    ↓
Query Preprocessing
  ├── Intent Classification
  ├── Query Expansion
  └── HyDE Generation
    ↓
Hybrid Retrieval (BM25 + Dense)
    ↓
Reranking (Cross-Encoder)
    ↓
Context Assembly
  ├── Deduplication
  ├── Context Windowing
  └── Metadata Enrichment
    ↓
Generation (LLM)
    ↓
Post-Processing
  ├── Citation Extraction
  ├── Hallucination Check
  └── Response Formatting
    ↓
User Response + Sources
```

### Key Infrastructure Components

| Component | Tool Options |
|-----------|-------------|
| Vector Store | Qdrant, Weaviate, pgvector |
| Sparse Search | Elasticsearch, Typesense |
| Reranker | Cohere Rerank, cross-encoder |
| Evaluation | RAGAS, DeepEval, TruLens |
| Observability | LangSmith, Arize Phoenix |

---

## Common Pitfalls and How to Avoid Them

### 1. Embedding Model Mismatch

Always use the same embedding model for indexing and querying. Changing models requires re-indexing.

### 2. Missing Metadata Filtering

Add metadata to chunks and filter before semantic search:

```python
results = vectorstore.similarity_search(
    query,
    k=20,
    filter={"document_type": "policy", "year": {"$gte": 2024}}
)
```

### 3. No Fallback for Low-Confidence Retrievals

```python
def retrieve_with_confidence(query: str, threshold: float = 0.7) -> tuple:
    results = vectorstore.similarity_search_with_score(query, k=5)
    
    high_confidence = [(doc, score) for doc, score in results if score >= threshold]
    
    if not high_confidence:
        return [], "I don't have reliable information to answer this question."
    
    return [doc for doc, _ in high_confidence], None
```

---

## Conclusion

Production RAG is an engineering discipline, not just a few API calls. The difference between a demo and a reliable system comes down to:

1. **Smart chunking** — hierarchical and semantic
2. **Hybrid search** — dense + sparse, fused intelligently
3. **Reranking** — don't trust retrieval ordering
4. **Query transformation** — HyDE and decomposition
5. **Continuous evaluation** — measure faithfulness and relevancy

Start with these techniques and you'll save yourself weeks of debugging strange retrieval failures in production.
