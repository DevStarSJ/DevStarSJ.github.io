---
layout: post
title: "RAG with LangChain: Production 2026 Guide"
subtitle: Build production-ready Retrieval-Augmented Generation systems with LangChain
categories: development
tags: ai llm langchain rag python
comments: true
---

# RAG with LangChain: Production 2026 Guide

Retrieval-Augmented Generation (RAG) has become the standard pattern for building LLM applications with custom knowledge. This guide covers production-grade RAG implementation with LangChain.

## Why RAG?

- **Up-to-date information** - Access current data beyond training cutoff
- **Domain expertise** - Inject specialized knowledge
- **Reduced hallucination** - Ground responses in factual data
- **Cost efficiency** - Avoid fine-tuning costs
- **Privacy** - Keep sensitive data in your control

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Documents  │────▶│   Chunking   │────▶│  Embeddings  │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Response   │◀────│     LLM      │◀────│ Vector Store │
└──────────────┘     └──────────────┘     └──────────────┘
                           ▲
                           │
                     ┌─────┴─────┐
                     │   Query   │
                     └───────────┘
```

## Project Setup

```bash
pip install langchain langchain-openai langchain-community
pip install chromadb pgvector pinecone-client
pip install unstructured pdf2image pdfminer.six
pip install tiktoken
```

### Project Structure

```
rag_app/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── embeddings.py
│   ├── vectorstore.py
│   ├── retriever.py
│   ├── chain.py
│   └── api.py
├── ingestion/
│   ├── __init__.py
│   ├── loader.py
│   ├── chunker.py
│   └── pipeline.py
├── tests/
└── pyproject.toml
```

## Document Ingestion

### Document Loading

```python
# ingestion/loader.py
from langchain_community.document_loaders import (
    PyPDFLoader,
    UnstructuredHTMLLoader,
    TextLoader,
    CSVLoader,
    DirectoryLoader,
)
from langchain_core.documents import Document
from pathlib import Path
from typing import List

class DocumentLoader:
    """Load documents from various sources"""
    
    LOADER_MAP = {
        '.pdf': PyPDFLoader,
        '.html': UnstructuredHTMLLoader,
        '.txt': TextLoader,
        '.csv': CSVLoader,
        '.md': TextLoader,
    }
    
    def load_file(self, file_path: str) -> List[Document]:
        path = Path(file_path)
        loader_class = self.LOADER_MAP.get(path.suffix.lower())
        
        if not loader_class:
            raise ValueError(f"Unsupported file type: {path.suffix}")
        
        loader = loader_class(str(path))
        documents = loader.load()
        
        # Add metadata
        for doc in documents:
            doc.metadata['source'] = str(path)
            doc.metadata['file_type'] = path.suffix
        
        return documents
    
    def load_directory(
        self,
        directory: str,
        glob: str = "**/*.*"
    ) -> List[Document]:
        documents = []
        path = Path(directory)
        
        for file_path in path.glob(glob):
            if file_path.suffix.lower() in self.LOADER_MAP:
                try:
                    docs = self.load_file(str(file_path))
                    documents.extend(docs)
                except Exception as e:
                    print(f"Error loading {file_path}: {e}")
        
        return documents
```

### Chunking Strategies

```python
# ingestion/chunker.py
from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
    TokenTextSplitter,
    MarkdownHeaderTextSplitter,
)
from langchain_core.documents import Document
from typing import List

class DocumentChunker:
    """Split documents into chunks with different strategies"""
    
    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        strategy: str = "recursive"
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.strategy = strategy
        self._init_splitter()
    
    def _init_splitter(self):
        if self.strategy == "recursive":
            self.splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                separators=["\n\n", "\n", ". ", " ", ""],
                length_function=len,
            )
        elif self.strategy == "token":
            self.splitter = TokenTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
            )
        elif self.strategy == "markdown":
            self.splitter = MarkdownHeaderTextSplitter(
                headers_to_split_on=[
                    ("#", "Header 1"),
                    ("##", "Header 2"),
                    ("###", "Header 3"),
                ]
            )
    
    def chunk_documents(self, documents: List[Document]) -> List[Document]:
        chunks = self.splitter.split_documents(documents)
        
        # Add chunk metadata
        for i, chunk in enumerate(chunks):
            chunk.metadata['chunk_index'] = i
            chunk.metadata['chunk_size'] = len(chunk.page_content)
        
        return chunks

class SemanticChunker:
    """Semantic-based chunking using embeddings"""
    
    def __init__(self, embeddings, threshold: float = 0.5):
        from langchain_experimental.text_splitter import SemanticChunker
        self.splitter = SemanticChunker(
            embeddings,
            breakpoint_threshold_type="percentile",
            breakpoint_threshold_amount=threshold,
        )
    
    def chunk_documents(self, documents: List[Document]) -> List[Document]:
        return self.splitter.split_documents(documents)
```

### Ingestion Pipeline

```python
# ingestion/pipeline.py
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma, PGVector
import hashlib
from typing import List, Optional

class IngestionPipeline:
    """Complete document ingestion pipeline"""
    
    def __init__(
        self,
        vectorstore,
        loader: DocumentLoader,
        chunker: DocumentChunker,
    ):
        self.vectorstore = vectorstore
        self.loader = loader
        self.chunker = chunker
    
    def _generate_doc_id(self, doc: Document) -> str:
        content = doc.page_content + str(doc.metadata)
        return hashlib.md5(content.encode()).hexdigest()
    
    def process_file(self, file_path: str) -> int:
        # Load
        documents = self.loader.load_file(file_path)
        
        # Chunk
        chunks = self.chunker.chunk_documents(documents)
        
        # Generate IDs for deduplication
        ids = [self._generate_doc_id(chunk) for chunk in chunks]
        
        # Add to vectorstore
        self.vectorstore.add_documents(chunks, ids=ids)
        
        return len(chunks)
    
    def process_directory(
        self,
        directory: str,
        batch_size: int = 100
    ) -> int:
        documents = self.loader.load_directory(directory)
        chunks = self.chunker.chunk_documents(documents)
        
        total = 0
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            ids = [self._generate_doc_id(chunk) for chunk in batch]
            self.vectorstore.add_documents(batch, ids=ids)
            total += len(batch)
            print(f"Processed {total}/{len(chunks)} chunks")
        
        return total
```

## Vector Store

### Chroma (Local Development)

```python
# app/vectorstore.py
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from chromadb.config import Settings

def create_chroma_vectorstore(
    collection_name: str = "documents",
    persist_directory: str = "./chroma_db"
):
    embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
    
    vectorstore = Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=persist_directory,
        collection_metadata={"hnsw:space": "cosine"},
    )
    
    return vectorstore
```

### PGVector (Production)

```python
# app/vectorstore.py
from langchain_community.vectorstores import PGVector
from langchain_openai import OpenAIEmbeddings

def create_pgvector_store(
    collection_name: str = "documents",
    connection_string: str = None,
):
    embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
    
    vectorstore = PGVector(
        collection_name=collection_name,
        connection_string=connection_string,
        embedding_function=embeddings,
        use_jsonb=True,
    )
    
    return vectorstore

# With connection pooling
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

def create_pgvector_with_pool(connection_string: str):
    engine = create_engine(
        connection_string,
        poolclass=QueuePool,
        pool_size=10,
        max_overflow=20,
    )
    return engine
```

## Retrieval

### Advanced Retriever

```python
# app/retriever.py
from langchain.retrievers import (
    ContextualCompressionRetriever,
    MultiQueryRetriever,
    EnsembleRetriever,
)
from langchain.retrievers.document_compressors import (
    LLMChainExtractor,
    EmbeddingsFilter,
)
from langchain_community.retrievers import BM25Retriever
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

class HybridRetriever:
    """Combine vector search with BM25 for better retrieval"""
    
    def __init__(
        self,
        vectorstore,
        documents,
        k: int = 4,
        weights: tuple = (0.5, 0.5)
    ):
        # Vector retriever
        self.vector_retriever = vectorstore.as_retriever(
            search_type="mmr",
            search_kwargs={
                "k": k,
                "fetch_k": k * 3,
                "lambda_mult": 0.7,
            }
        )
        
        # BM25 retriever
        self.bm25_retriever = BM25Retriever.from_documents(documents)
        self.bm25_retriever.k = k
        
        # Ensemble
        self.retriever = EnsembleRetriever(
            retrievers=[self.bm25_retriever, self.vector_retriever],
            weights=list(weights),
        )
    
    def get_retriever(self):
        return self.retriever

class MultiQueryRAG:
    """Generate multiple queries for better retrieval"""
    
    def __init__(self, vectorstore, llm=None):
        self.llm = llm or ChatOpenAI(model="gpt-4o-mini", temperature=0)
        self.base_retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
        
        self.retriever = MultiQueryRetriever.from_llm(
            retriever=self.base_retriever,
            llm=self.llm,
        )
    
    def get_retriever(self):
        return self.retriever

class RerankedRetriever:
    """Compress and rerank retrieved documents"""
    
    def __init__(self, vectorstore, llm=None):
        self.llm = llm or ChatOpenAI(model="gpt-4o-mini", temperature=0)
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
        
        base_retriever = vectorstore.as_retriever(search_kwargs={"k": 10})
        
        # Embeddings filter
        embeddings_filter = EmbeddingsFilter(
            embeddings=self.embeddings,
            similarity_threshold=0.76
        )
        
        # LLM compressor
        compressor = LLMChainExtractor.from_llm(self.llm)
        
        self.retriever = ContextualCompressionRetriever(
            base_compressor=compressor,
            base_retriever=base_retriever,
        )
    
    def get_retriever(self):
        return self.retriever
```

## RAG Chain

### Basic Chain

```python
# app/chain.py
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableParallel
from langchain.chains import create_history_aware_retriever
from operator import itemgetter

RAG_PROMPT = """You are an assistant for question-answering tasks. 
Use the following pieces of retrieved context to answer the question. 
If you don't know the answer, just say that you don't know.

Context:
{context}

Question: {question}

Answer:"""

class RAGChain:
    """Production RAG chain with streaming support"""
    
    def __init__(
        self,
        retriever,
        llm=None,
        prompt: str = RAG_PROMPT
    ):
        self.llm = llm or ChatOpenAI(model="gpt-4o", temperature=0)
        self.retriever = retriever
        self.prompt = ChatPromptTemplate.from_template(prompt)
        self._build_chain()
    
    def _format_docs(self, docs):
        return "\n\n---\n\n".join(
            f"Source: {doc.metadata.get('source', 'Unknown')}\n{doc.page_content}"
            for doc in docs
        )
    
    def _build_chain(self):
        self.chain = (
            RunnableParallel(
                context=self.retriever | self._format_docs,
                question=RunnablePassthrough()
            )
            | self.prompt
            | self.llm
            | StrOutputParser()
        )
    
    def invoke(self, question: str) -> str:
        return self.chain.invoke(question)
    
    async def ainvoke(self, question: str) -> str:
        return await self.chain.ainvoke(question)
    
    def stream(self, question: str):
        for chunk in self.chain.stream(question):
            yield chunk
    
    async def astream(self, question: str):
        async for chunk in self.chain.astream(question):
            yield chunk
```

### Conversational RAG

```python
# app/chain.py
from langchain_core.messages import HumanMessage, AIMessage

CONDENSE_PROMPT = """Given a chat history and the latest user question 
which might reference context in the chat history, formulate a standalone question 
which can be understood without the chat history.

Chat History:
{chat_history}

Follow Up Input: {question}
Standalone question:"""

class ConversationalRAG:
    """RAG with conversation history"""
    
    def __init__(self, retriever, llm=None):
        self.llm = llm or ChatOpenAI(model="gpt-4o", temperature=0)
        self.retriever = retriever
        self._build_chain()
    
    def _build_chain(self):
        # Condense question prompt
        condense_prompt = ChatPromptTemplate.from_template(CONDENSE_PROMPT)
        
        # History-aware retriever
        self.history_retriever = create_history_aware_retriever(
            self.llm,
            self.retriever,
            condense_prompt
        )
        
        # Answer prompt
        answer_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful assistant. Answer based on the context.
            
Context: {context}"""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{question}"),
        ])
        
        # Full chain
        self.chain = (
            RunnablePassthrough.assign(
                context=self.history_retriever | self._format_docs
            )
            | answer_prompt
            | self.llm
            | StrOutputParser()
        )
    
    def _format_docs(self, docs):
        return "\n\n".join(doc.page_content for doc in docs)
    
    def invoke(
        self,
        question: str,
        chat_history: list = None
    ) -> str:
        chat_history = chat_history or []
        return self.chain.invoke({
            "question": question,
            "chat_history": chat_history
        })
```

### RAG with Sources

```python
from langchain_core.runnables import RunnableLambda
from typing import TypedDict, List

class RAGResponse(TypedDict):
    answer: str
    sources: List[dict]

class RAGWithSources:
    """RAG that returns sources with answers"""
    
    def __init__(self, retriever, llm=None):
        self.llm = llm or ChatOpenAI(model="gpt-4o", temperature=0)
        self.retriever = retriever
        self._build_chain()
    
    def _build_chain(self):
        prompt = ChatPromptTemplate.from_template(RAG_PROMPT)
        
        def get_sources(docs):
            return [
                {
                    "source": doc.metadata.get("source", "Unknown"),
                    "page": doc.metadata.get("page", None),
                    "content": doc.page_content[:200] + "..."
                }
                for doc in docs
            ]
        
        retrieve_and_format = RunnableParallel(
            context=self.retriever | self._format_docs,
            sources=self.retriever | get_sources,
            question=RunnablePassthrough()
        )
        
        def combine_output(input_dict):
            return RAGResponse(
                answer=input_dict["answer"],
                sources=input_dict["sources"]
            )
        
        self.chain = (
            retrieve_and_format
            | RunnablePassthrough.assign(
                answer=prompt | self.llm | StrOutputParser()
            )
            | RunnableLambda(combine_output)
        )
    
    def _format_docs(self, docs):
        return "\n\n".join(doc.page_content for doc in docs)
    
    def invoke(self, question: str) -> RAGResponse:
        return self.chain.invoke(question)
```

## API Server

```python
# app/api.py
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import asyncio

app = FastAPI(title="RAG API")

class Query(BaseModel):
    question: str
    chat_history: Optional[List[dict]] = None

class Response(BaseModel):
    answer: str
    sources: Optional[List[dict]] = None

# Initialize on startup
@app.on_event("startup")
async def startup():
    global rag_chain
    vectorstore = create_chroma_vectorstore()
    retriever = vectorstore.as_retriever()
    rag_chain = RAGWithSources(retriever)

@app.post("/query", response_model=Response)
async def query(request: Query):
    try:
        result = await asyncio.to_thread(
            rag_chain.invoke,
            request.question
        )
        return Response(
            answer=result["answer"],
            sources=result["sources"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query/stream")
async def query_stream(request: Query):
    async def generate():
        async for chunk in rag_chain.astream(request.question):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )
```

## Evaluation

```python
# evaluation.py
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from datasets import Dataset

def evaluate_rag(qa_pairs: list, rag_chain):
    """Evaluate RAG pipeline with RAGAS"""
    
    questions = [pair["question"] for pair in qa_pairs]
    ground_truths = [pair["ground_truth"] for pair in qa_pairs]
    
    # Generate answers
    answers = []
    contexts = []
    for q in questions:
        result = rag_chain.invoke(q)
        answers.append(result["answer"])
        contexts.append([s["content"] for s in result["sources"]])
    
    # Create dataset
    dataset = Dataset.from_dict({
        "question": questions,
        "answer": answers,
        "contexts": contexts,
        "ground_truth": ground_truths,
    })
    
    # Evaluate
    results = evaluate(
        dataset,
        metrics=[
            faithfulness,
            answer_relevancy,
            context_precision,
            context_recall,
        ]
    )
    
    return results
```

## Conclusion

Building production RAG systems requires careful attention to document processing, retrieval quality, and evaluation. LangChain provides the building blocks, but success depends on proper chunking, hybrid retrieval, and continuous evaluation.

Key takeaways:
- Use semantic chunking for better context
- Implement hybrid retrieval (vector + BM25)
- Add reranking for precision
- Stream responses for better UX
- Evaluate with RAGAS metrics

## Resources

- [LangChain Documentation](https://python.langchain.com/)
- [RAGAS Evaluation](https://docs.ragas.io/)
- [LlamaIndex](https://docs.llamaindex.ai/)
