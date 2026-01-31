---
layout: post
title: "RAG Tutorial: Build a Knowledge-Based AI with LangChain and Vector Databases"
subtitle: Complete guide to Retrieval Augmented Generation for accurate AI responses
categories: development
tags: python ai
comments: true
---

# RAG Tutorial: Build a Knowledge-Based AI with LangChain and Vector Databases

Retrieval Augmented Generation (RAG) is the technique that makes AI assistants actually useful for your specific data. Instead of relying only on training data, RAG retrieves relevant information from your documents before generating responses. This guide teaches you everything about building production-ready RAG systems.

## What is RAG?

RAG combines two powerful approaches:

1. **Retrieval**: Find relevant documents from your knowledge base
2. **Generation**: Use an LLM to generate answers based on retrieved context

This solves key LLM limitations:
- Outdated training data
- Hallucinations
- Lack of domain-specific knowledge

## RAG Architecture

```
User Query → Embedding → Vector Search → Retrieved Docs → LLM → Response
                              ↓
                        Vector Database
                        (Your Knowledge)
```

## Setup

```bash
pip install langchain langchain-openai chromadb faiss-cpu
pip install pypdf docx2txt unstructured
pip install python-dotenv tiktoken
```

## Step 1: Document Loading

### Loading Different File Types

```python
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader,
    CSVLoader,
    WebBaseLoader,
    DirectoryLoader
)

# PDF
pdf_loader = PyPDFLoader("document.pdf")
pdf_docs = pdf_loader.load()

# Word Document
docx_loader = Docx2txtLoader("document.docx")
docx_docs = docx_loader.load()

# CSV
csv_loader = CSVLoader("data.csv")
csv_docs = csv_loader.load()

# Web Page
web_loader = WebBaseLoader("https://example.com/article")
web_docs = web_loader.load()

# Entire Directory
dir_loader = DirectoryLoader(
    "./documents",
    glob="**/*.pdf",
    loader_cls=PyPDFLoader
)
all_docs = dir_loader.load()
```

### Custom Document Loader

```python
from langchain.schema import Document

def load_custom_data(data_source):
    """Load data from custom source."""
    documents = []
    for item in data_source:
        doc = Document(
            page_content=item['content'],
            metadata={
                'source': item['source'],
                'date': item['date'],
                'category': item['category']
            }
        )
        documents.append(doc)
    return documents
```

## Step 2: Text Splitting

### Why Split?

- LLMs have context limits
- Smaller chunks = more precise retrieval
- Better embedding quality

### Chunking Strategies

```python
from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
    CharacterTextSplitter,
    TokenTextSplitter,
    MarkdownTextSplitter
)

# Recursive (Recommended for most cases)
recursive_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""]
)

# For code
code_splitter = RecursiveCharacterTextSplitter.from_language(
    language="python",
    chunk_size=1000,
    chunk_overlap=100
)

# Token-based (for precise token control)
token_splitter = TokenTextSplitter(
    chunk_size=500,
    chunk_overlap=50
)

# Split documents
chunks = recursive_splitter.split_documents(pdf_docs)
print(f"Split into {len(chunks)} chunks")
```

### Optimal Chunk Size

| Use Case | Chunk Size | Overlap |
|----------|------------|---------|
| Q&A | 500-1000 | 100-200 |
| Summarization | 1000-2000 | 200-400 |
| Code | 500-1500 | 100-200 |
| Chat | 300-800 | 50-150 |

## Step 3: Embeddings

### Choosing an Embedding Model

```python
from langchain_openai import OpenAIEmbeddings
from langchain_community.embeddings import (
    HuggingFaceEmbeddings,
    OllamaEmbeddings
)

# OpenAI (Best quality, costs money)
openai_embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small"  # or text-embedding-3-large
)

# HuggingFace (Free, runs locally)
hf_embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# Ollama (Local, free)
ollama_embeddings = OllamaEmbeddings(model="llama3.2")
```

### Embedding Comparison

| Model | Quality | Speed | Cost |
|-------|---------|-------|------|
| OpenAI text-embedding-3-large | Excellent | Fast | $0.13/1M tokens |
| OpenAI text-embedding-3-small | Very Good | Fast | $0.02/1M tokens |
| all-MiniLM-L6-v2 | Good | Fast | Free |
| Ollama | Good | Medium | Free |

## Step 4: Vector Store

### Chroma (Simple, Local)

```python
from langchain_community.vectorstores import Chroma

# Create vector store
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=openai_embeddings,
    persist_directory="./chroma_db"
)

# Load existing
vectorstore = Chroma(
    persist_directory="./chroma_db",
    embedding_function=openai_embeddings
)
```

### FAISS (Fast, Local)

```python
from langchain_community.vectorstores import FAISS

# Create
vectorstore = FAISS.from_documents(chunks, openai_embeddings)

# Save
vectorstore.save_local("./faiss_index")

# Load
vectorstore = FAISS.load_local(
    "./faiss_index", 
    openai_embeddings,
    allow_dangerous_deserialization=True
)
```

### Pinecone (Cloud, Scalable)

```python
from langchain_pinecone import PineconeVectorStore
import pinecone

pinecone.init(api_key="your-key", environment="your-env")

vectorstore = PineconeVectorStore.from_documents(
    chunks,
    openai_embeddings,
    index_name="my-index"
)
```

## Step 5: Retrieval

### Basic Retriever

```python
# Create retriever
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 4}
)

# Retrieve
docs = retriever.get_relevant_documents("What is machine learning?")
for doc in docs:
    print(doc.page_content[:200])
    print("---")
```

### Advanced Retrieval

```python
# MMR (Maximal Marginal Relevance) - More diverse results
retriever = vectorstore.as_retriever(
    search_type="mmr",
    search_kwargs={
        "k": 4,
        "fetch_k": 20,  # Fetch more, then diversify
        "lambda_mult": 0.5  # 0 = max diversity, 1 = max relevance
    }
)

# Similarity with score threshold
retriever = vectorstore.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={
        "score_threshold": 0.7,
        "k": 4
    }
)
```

### Multi-Query Retriever

```python
from langchain.retrievers.multi_query import MultiQueryRetriever

multi_retriever = MultiQueryRetriever.from_llm(
    retriever=vectorstore.as_retriever(),
    llm=ChatOpenAI(temperature=0)
)

# Generates multiple query variations for better retrieval
docs = multi_retriever.get_relevant_documents("How does RAG work?")
```

## Step 6: RAG Chain

### Basic RAG

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# Components
llm = ChatOpenAI(model="gpt-4", temperature=0)
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

# Prompt
template = """Answer the question based only on the following context:

{context}

Question: {question}

Provide a comprehensive answer. If the context doesn't contain enough 
information, say "I don't have enough information to answer this."
"""
prompt = ChatPromptTemplate.from_template(template)

# Helper function
def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

# Chain
rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# Use
answer = rag_chain.invoke("What are the main features?")
print(answer)
```

### RAG with Sources

```python
from langchain_core.runnables import RunnableParallel

def format_docs_with_sources(docs):
    formatted = []
    for i, doc in enumerate(docs):
        source = doc.metadata.get('source', 'Unknown')
        formatted.append(f"[{i+1}] {doc.page_content}\nSource: {source}")
    return "\n\n".join(formatted)

rag_chain_with_sources = (
    RunnableParallel({
        "context": retriever | format_docs_with_sources,
        "question": RunnablePassthrough(),
        "sources": retriever | (lambda docs: [d.metadata.get('source') for d in docs])
    })
    | prompt
    | llm
    | StrOutputParser()
)
```

### Conversational RAG

```python
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory

memory = ConversationBufferMemory(
    memory_key="chat_history",
    return_messages=True,
    output_key="answer"
)

conversational_rag = ConversationalRetrievalChain.from_llm(
    llm=ChatOpenAI(model="gpt-4"),
    retriever=vectorstore.as_retriever(),
    memory=memory,
    return_source_documents=True
)

# Chat
result = conversational_rag({"question": "What is the main topic?"})
print(result["answer"])

# Follow-up (remembers context)
result = conversational_rag({"question": "Can you elaborate on that?"})
```

## Complete RAG Application

```python
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

load_dotenv()

class RAGSystem:
    def __init__(self, docs_path: str, db_path: str = "./chroma_db"):
        self.docs_path = docs_path
        self.db_path = db_path
        self.embeddings = OpenAIEmbeddings()
        self.llm = ChatOpenAI(model="gpt-4", temperature=0)
        self.vectorstore = None
        self.chain = None
        
    def load_and_process_documents(self):
        """Load documents and create vector store."""
        # Load
        loader = DirectoryLoader(
            self.docs_path,
            glob="**/*.pdf",
            loader_cls=PyPDFLoader
        )
        documents = loader.load()
        print(f"Loaded {len(documents)} documents")
        
        # Split
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        chunks = splitter.split_documents(documents)
        print(f"Created {len(chunks)} chunks")
        
        # Create vector store
        self.vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=self.embeddings,
            persist_directory=self.db_path
        )
        print("Vector store created")
        
    def load_existing_db(self):
        """Load existing vector store."""
        self.vectorstore = Chroma(
            persist_directory=self.db_path,
            embedding_function=self.embeddings
        )
        
    def setup_chain(self):
        """Setup the RAG chain."""
        retriever = self.vectorstore.as_retriever(
            search_type="mmr",
            search_kwargs={"k": 4}
        )
        
        template = """You are a helpful assistant. Answer based on the context below.

Context:
{context}

Question: {question}

Instructions:
- Answer based only on the provided context
- If unsure, say you don't know
- Be concise but comprehensive
- Cite relevant parts of the context

Answer:"""
        
        prompt = ChatPromptTemplate.from_template(template)
        
        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)
        
        self.chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | self.llm
            | StrOutputParser()
        )
        
    def query(self, question: str) -> str:
        """Query the RAG system."""
        if not self.chain:
            self.setup_chain()
        return self.chain.invoke(question)
    
    def add_documents(self, new_docs_path: str):
        """Add new documents to existing store."""
        loader = DirectoryLoader(new_docs_path, glob="**/*.pdf")
        new_docs = loader.load()
        
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        chunks = splitter.split_documents(new_docs)
        
        self.vectorstore.add_documents(chunks)
        print(f"Added {len(chunks)} new chunks")

# Usage
rag = RAGSystem("./documents")
rag.load_and_process_documents()  # First time
# rag.load_existing_db()  # Subsequent runs

answer = rag.query("What are the key findings?")
print(answer)
```

## Best Practices

### 1. Chunk Wisely
- Test different chunk sizes
- Consider document structure
- Use appropriate overlap

### 2. Optimize Retrieval
- Use MMR for diversity
- Implement reranking
- Consider hybrid search

### 3. Craft Good Prompts
- Be specific about using context
- Handle "I don't know" cases
- Request citations

### 4. Monitor and Improve
- Log queries and responses
- Collect user feedback
- Continuously update knowledge base

## Conclusion

RAG transforms LLMs from general-purpose tools into domain experts. With this guide, you can:

- Load any document type
- Choose optimal chunking strategies
- Select appropriate embeddings and vector stores
- Build production-ready RAG applications

Start simple, measure results, and iterate!

---

*Build smarter AI with RAG!*
