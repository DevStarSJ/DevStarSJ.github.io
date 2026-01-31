---
layout: post
title: "LangChain Tutorial: Complete Beginner's Guide to Building LLM Applications"
subtitle: Master LangChain framework for building powerful AI applications
categories: development
tags: python ai
comments: true
---

# LangChain Tutorial: Complete Beginner's Guide to Building LLM Applications

LangChain has become the go-to framework for building applications powered by Large Language Models (LLMs). In this comprehensive tutorial, you'll learn everything from basic concepts to advanced techniques for creating sophisticated AI applications.

## What is LangChain?

LangChain is a framework designed to simplify the development of applications using LLMs. It provides:

- **Unified Interface**: Work with multiple LLM providers using the same code
- **Chains**: Connect multiple components together
- **Agents**: Create autonomous AI systems that can use tools
- **Memory**: Maintain conversation context
- **Retrieval**: Integrate external knowledge bases

## Installation and Setup

### Install LangChain

```bash
pip install langchain langchain-openai langchain-community
pip install chromadb faiss-cpu  # For vector stores
pip install python-dotenv
```

### Environment Setup

```python
# .env file
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

```python
from dotenv import load_dotenv
load_dotenv()
```

## Core Concepts

### 1. Language Models

```python
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

# OpenAI
llm_openai = ChatOpenAI(
    model="gpt-4-turbo-preview",
    temperature=0.7
)

# Anthropic
llm_claude = ChatAnthropic(
    model="claude-3-5-sonnet-20241022",
    temperature=0.7
)

# Simple invocation
response = llm_openai.invoke("What is LangChain?")
print(response.content)
```

### 2. Prompt Templates

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# Simple template
simple_template = ChatPromptTemplate.from_template(
    "You are an expert in {topic}. Answer: {question}"
)

# Chat template with system message
chat_template = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant specialized in {specialty}."),
    ("human", "{user_input}")
])

# With message history
template_with_history = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}")
])
```

### 3. Output Parsers

```python
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_core.pydantic_v1 import BaseModel, Field

# String parser
str_parser = StrOutputParser()

# JSON parser with schema
class MovieReview(BaseModel):
    title: str = Field(description="Movie title")
    rating: int = Field(description="Rating from 1-10")
    summary: str = Field(description="Brief summary")

json_parser = JsonOutputParser(pydantic_object=MovieReview)
```

## Building Chains

### Simple Chain (LCEL)

LangChain Expression Language (LCEL) makes chain building intuitive:

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Create components
prompt = ChatPromptTemplate.from_template(
    "Tell me a short joke about {topic}"
)
llm = ChatOpenAI(model="gpt-4")
parser = StrOutputParser()

# Build chain using pipe operator
chain = prompt | llm | parser

# Invoke
result = chain.invoke({"topic": "programming"})
print(result)
```

### Chain with Multiple Steps

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

llm = ChatOpenAI()

# Step 1: Generate outline
outline_prompt = ChatPromptTemplate.from_template(
    "Create an outline for a blog post about {topic}"
)

# Step 2: Write content based on outline
content_prompt = ChatPromptTemplate.from_template(
    "Write a blog post based on this outline:\n{outline}"
)

# Combined chain
chain = (
    {"topic": RunnablePassthrough()}
    | outline_prompt
    | llm
    | StrOutputParser()
    | {"outline": RunnablePassthrough()}
    | content_prompt
    | llm
    | StrOutputParser()
)

result = chain.invoke("AI in healthcare")
```

### Parallel Chains

```python
from langchain_core.runnables import RunnableParallel

# Create parallel analysis
analysis_chain = RunnableParallel(
    summary=summary_chain,
    sentiment=sentiment_chain,
    keywords=keyword_chain
)

result = analysis_chain.invoke({"text": "Your input text here"})
# result = {"summary": "...", "sentiment": "...", "keywords": [...]}
```

## Working with Documents

### Document Loaders

```python
from langchain_community.document_loaders import (
    TextLoader,
    PyPDFLoader,
    WebBaseLoader,
    DirectoryLoader
)

# Load text file
text_loader = TextLoader("document.txt")
docs = text_loader.load()

# Load PDF
pdf_loader = PyPDFLoader("document.pdf")
pdf_docs = pdf_loader.load()

# Load from web
web_loader = WebBaseLoader("https://example.com/article")
web_docs = web_loader.load()

# Load directory of files
dir_loader = DirectoryLoader("./documents", glob="**/*.txt")
all_docs = dir_loader.load()
```

### Text Splitters

```python
from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
    CharacterTextSplitter
)

# Recursive splitter (recommended)
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""]
)

chunks = splitter.split_documents(docs)
```

## Vector Stores and Retrieval

### Creating a Vector Store

```python
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma, FAISS

# Initialize embeddings
embeddings = OpenAIEmbeddings()

# Create Chroma vector store
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db"
)

# Or use FAISS
faiss_store = FAISS.from_documents(chunks, embeddings)
```

### Retrieval

```python
# Create retriever
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 4}
)

# Search
relevant_docs = retriever.get_relevant_documents("What is machine learning?")
```

## RAG (Retrieval Augmented Generation)

### Basic RAG Chain

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

# Setup
embeddings = OpenAIEmbeddings()
vectorstore = Chroma.from_documents(documents, embeddings)
retriever = vectorstore.as_retriever()
llm = ChatOpenAI()

# RAG prompt
template = """Answer the question based only on the following context:

{context}

Question: {question}

Answer:"""

prompt = ChatPromptTemplate.from_template(template)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

# RAG chain
rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# Use it
answer = rag_chain.invoke("What is the main topic?")
```

## Memory and Conversation

### Conversation Buffer Memory

```python
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain

memory = ConversationBufferMemory()

conversation = ConversationChain(
    llm=ChatOpenAI(),
    memory=memory,
    verbose=True
)

# Chat
response1 = conversation.predict(input="Hi, my name is John")
response2 = conversation.predict(input="What's my name?")  # Remembers "John"
```

### Memory with LCEL

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

# Setup
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}")
])

chain = prompt | llm | StrOutputParser()

# Message history store
store = {}

def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]

# Chain with history
chain_with_history = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history"
)

# Use with session
config = {"configurable": {"session_id": "user123"}}
response = chain_with_history.invoke({"input": "Hi!"}, config=config)
```

## Agents and Tools

### Creating Tools

```python
from langchain.tools import tool
from langchain_community.tools import DuckDuckGoSearchRun

# Custom tool
@tool
def calculate(expression: str) -> str:
    """Calculate a mathematical expression."""
    try:
        return str(eval(expression))
    except:
        return "Error: Invalid expression"

# Built-in tools
search = DuckDuckGoSearchRun()
```

### Creating an Agent

```python
from langchain.agents import create_openai_functions_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# Tools
tools = [calculate, search]

# Prompt
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant with access to tools."),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

# Create agent
llm = ChatOpenAI(model="gpt-4")
agent = create_openai_functions_agent(llm, tools, prompt)

# Create executor
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# Run
result = agent_executor.invoke({
    "input": "What is 25 * 48, and who invented calculus?"
})
```

## Advanced Patterns

### Self-Query Retriever

```python
from langchain.retrievers.self_query.base import SelfQueryRetriever
from langchain.chains.query_constructor.base import AttributeInfo

metadata_field_info = [
    AttributeInfo(
        name="category",
        description="The category of the document",
        type="string"
    ),
    AttributeInfo(
        name="date",
        description="The publication date",
        type="string"
    )
]

self_query_retriever = SelfQueryRetriever.from_llm(
    llm=ChatOpenAI(),
    vectorstore=vectorstore,
    document_contents="Technical documentation",
    metadata_field_info=metadata_field_info
)

# Natural language query with filtering
docs = self_query_retriever.get_relevant_documents(
    "Show me Python tutorials from 2024"
)
```

### Conversation Retrieval Chain

```python
from langchain.chains import ConversationalRetrievalChain

qa_chain = ConversationalRetrievalChain.from_llm(
    llm=ChatOpenAI(),
    retriever=vectorstore.as_retriever(),
    memory=ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True
    )
)

# Chat with documents
result = qa_chain({"question": "What does this document say about X?"})
```

## Best Practices

### 1. Error Handling

```python
from langchain_core.runnables import RunnableLambda

def safe_invoke(chain, input_data):
    try:
        return chain.invoke(input_data)
    except Exception as e:
        return f"Error: {str(e)}"

# Or with fallbacks
chain_with_fallback = main_chain.with_fallbacks([backup_chain])
```

### 2. Caching

```python
from langchain.cache import InMemoryCache
from langchain.globals import set_llm_cache

set_llm_cache(InMemoryCache())
```

### 3. Streaming

```python
for chunk in chain.stream({"input": "Tell me a story"}):
    print(chunk, end="", flush=True)
```

## Complete Example: Q&A Bot

```python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# Load and process documents
loader = PyPDFLoader("knowledge_base.pdf")
docs = loader.load()

splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
chunks = splitter.split_documents(docs)

# Create vector store
embeddings = OpenAIEmbeddings()
vectorstore = Chroma.from_documents(chunks, embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

# Create chain
template = """You are an expert assistant. Answer based on this context:

{context}

Question: {question}

Provide a detailed, helpful answer:"""

prompt = ChatPromptTemplate.from_template(template)
llm = ChatOpenAI(model="gpt-4", temperature=0)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# Use
answer = rag_chain.invoke("How do I configure the system?")
print(answer)
```

## Conclusion

LangChain provides powerful abstractions for building LLM applications. Key takeaways:

- Use LCEL for clean, composable chains
- Implement RAG for knowledge-augmented responses
- Leverage agents for autonomous task completion
- Always handle errors and implement caching

Start building your AI applications today!

---

*LangChain version: 0.1.x | Last updated: January 2025*
