---
layout: subsite-post
title: "LangChain 완전 가이드 2026: AI 앱과 에이전트 구축하기"
date: 2026-03-11
category: automation
tags: [langchain, AI앱, python, 에이전트, 자동화, LLM, 개발자]
lang: ko
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop"
description: "LangChain 완전 가이드 2026. AI 애플리케이션, 자율 에이전트, RAG 시스템, 자동화 워크플로우를 LangChain과 LangGraph로 구축하는 방법을 파이썬 코드 예제와 함께 알아보세요."
---

# LangChain 완전 가이드 2026: AI 앱과 에이전트 구축하기

단순히 API를 호출하는 것을 넘어 복잡한 파이프라인, 자율 에이전트, 프로덕션 수준의 시스템을 만들고 싶다면 — **LangChain**이 바로 당신이 알아야 할 프레임워크입니다.

LangChain은 LLM 기반 애플리케이션 구축을 위해 가장 널리 사용되는 프레임워크입니다. 2026년에는 **2억 회 이상 다운로드**되었으며 챗봇부터 복잡한 멀티 에이전트 연구 시스템까지 모든 것에 사용됩니다.

이 가이드는 LangChain으로 실제 AI 애플리케이션을 구축하는 것까지 단계별로 안내합니다.

![AI 파이프라인을 표현하는 빛나는 케이블이 있는 서버 인프라](https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&auto=format&fit=crop)
*Photo by [John Barkiple](https://unsplash.com/@barkiple) on Unsplash*

---

## LangChain이란?

LangChain은 대규모 언어 모델(LLM)로 구동되는 애플리케이션을 구축하기 위한 **오픈소스 Python(및 JavaScript) 프레임워크**입니다. 다음을 제공합니다:

- **체인(Chains):** 여러 LLM 호출과 도구를 파이프라인으로 연결
- **에이전트(Agents):** AI가 어떤 도구를 어떤 순서로 사용할지 결정
- **RAG:** 지식 기반 응답을 위한 검색 증강 생성
- **메모리:** 지속적인 대화 컨텍스트
- **통합:** 데이터베이스, API, 도구 600개 이상 연동

### LangChain 생태계 (2026)

```
LangChain 생태계:
├── langchain          → 핵심 프레임워크 (체인, 에이전트, 프롬프트)
├── langchain-core     → 핵심 추상화 및 인터페이스
├── langchain-community → 600개 이상의 서드파티 통합
├── langchain-openai   → OpenAI 전용 통합
├── langchain-anthropic → Anthropic/Claude 통합
├── langchain-aws      → AWS Bedrock 통합
├── LangGraph          → 에이전트 워크플로우 오케스트레이션
├── LangSmith          → 관측성 및 평가 플랫폼
└── LangServe          → LangChain 앱을 REST API로 배포
```

---

## 설치 및 설정

```bash
# 핵심 설치
pip install langchain langchain-openai langchain-anthropic

# 일반적인 모든 의존성 포함
pip install langchain[all]

# RAG용 (벡터 데이터베이스)
pip install langchain chromadb faiss-cpu

# 도구가 있는 에이전트용
pip install langchain-community duckduckgo-search
```

### 환경 설정
```python
# .env 파일
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LANGCHAIN_API_KEY=ls-...  # 선택사항: LangSmith 추적

# Python에서 로드
from dotenv import load_dotenv
load_dotenv()
```

---

## 핵심 개념과 코드

### 1. 기본 LLM 호출
```python
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

# Claude 사용
llm = ChatAnthropic(model="claude-3-5-sonnet-20241022")

# GPT-4o 사용
llm = ChatOpenAI(model="gpt-4o")

# 간단한 호출
response = llm.invoke("양자 컴퓨팅이 뭔가요?")
print(response.content)

# 시스템 프롬프트 포함
messages = [
    SystemMessage(content="당신은 Python 전문가입니다. 간결하게 답변하세요."),
    HumanMessage(content="리스트와 튜플의 차이점이 뭔가요?")
]
response = llm.invoke(messages)
```

### 2. 프롬프트 템플릿
```python
from langchain_core.prompts import ChatPromptTemplate

# 재사용 가능한 템플릿 생성
prompt = ChatPromptTemplate.from_messages([
    ("system", "당신은 {company_name}의 도움이 되는 어시스턴트입니다."),
    ("human", "{question}")
])

# LLM과 체이닝
chain = prompt | llm

# 변수와 함께 호출
response = chain.invoke({
    "company_name": "테크코퍼레이션",
    "question": "영업 시간이 어떻게 되나요?"
})
```

### 3. 구조화된 출력 파싱
```python
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.pydantic_v1 import BaseModel
from typing import List

# 구조화된 출력 파싱
class 제품리뷰(BaseModel):
    평점: int
    장점: List[str]
    단점: List[str]
    요약: str

parser = JsonOutputParser(pydantic_object=제품리뷰)

prompt = ChatPromptTemplate.from_template(
    "이 제품 리뷰를 분석하세요: {review}\n\n{format_instructions}"
)

chain = prompt | llm | parser

result = chain.invoke({
    "review": "훌륭한 노트북입니다! 빠른 성능, 좋은 배터리. 키보드가 약간 딱딱함.",
    "format_instructions": parser.get_format_instructions()
})
```

---

## RAG 시스템 구축

RAG(검색 증강 생성)를 사용하면 자신의 문서를 기반으로 AI가 질문에 답변할 수 있습니다.

```python
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.chains import RetrievalQA

# 1단계: 문서 로드
loader = PyPDFLoader("회사_핸드북.pdf")
documents = loader.load()

# 2단계: 청크로 분할
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200
)
chunks = text_splitter.split_documents(documents)

# 3단계: 임베딩 및 벡터 스토어 생성
embeddings = OpenAIEmbeddings()
vectorstore = Chroma.from_documents(chunks, embeddings)

# 4단계: 검색 체인 생성
llm = ChatOpenAI(model="gpt-4o")
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=vectorstore.as_retriever(search_kwargs={"k": 4})
)

# 5단계: 문서에 대한 질문
response = qa_chain.invoke({"query": "연차 정책이 어떻게 되나요?"})
print(response["result"])
```

---

## LangGraph로 AI 에이전트 구축

```python
from langgraph.prebuilt import create_react_agent
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.tools import tool
import requests

# 커스텀 도구 정의
@tool
def 날씨_조회(도시: str) -> str:
    """도시의 현재 날씨를 조회합니다."""
    response = requests.get(f"https://api.weather.com/v1/{도시}")
    return response.json()["description"]

@tool  
def 계산기(수식: str) -> str:
    """수학 수식을 안전하게 계산합니다."""
    try:
        result = eval(수식, {"__builtins__": {}}, {})
        return str(result)
    except Exception as e:
        return f"오류: {e}"

# 내장 도구
검색 = DuckDuckGoSearchRun()

# 도구와 함께 에이전트 생성
tools = [검색, 날씨_조회, 계산기]

agent = create_react_agent(
    model=ChatAnthropic(model="claude-3-5-sonnet-20241022"),
    tools=tools
)

# 에이전트 실행
result = agent.invoke({
    "messages": [{
        "role": "user", 
        "content": "서울 날씨는 어때? 그리고 그 온도의 화씨 값에서 15%는 얼마야?"
    }]
})
```

---

## 실제 활용 예시: 고객 지원 봇

```python
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.prompts import MessagesPlaceholder

# 대화 기록을 위한 메모리
memory = ConversationBufferWindowMemory(
    k=10,  # 마지막 10번의 교환 기억
    memory_key="history",
    return_messages=True
)

# 지원 봇 프롬프트
prompt = ChatPromptTemplate.from_messages([
    ("system", """당신은 AcmeSoft의 친절한 고객 지원 담당자입니다.
    
제품 정보:
- AcmeSoft Pro: 월 99달러, 무제한 사용자, 클라우드 기반
- AcmeSoft Starter: 월 29달러, 최대 5명 사용자
- 무료 체험: 14일, 신용카드 불필요

항상 정중하고 공감하며 필요한 경우 인간 지원으로 에스컬레이션을 제안하세요."""),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}")
])

chain = prompt | llm | StrOutputParser()

class 지원봇:
    def __init__(self):
        self.memory = ConversationBufferWindowMemory(
            k=10, memory_key="history", return_messages=True
        )
    
    def 채팅(self, 사용자_입력: str) -> str:
        history = self.memory.load_memory_variables({})
        response = chain.invoke({
            "input": 사용자_입력,
            "history": history.get("history", [])
        })
        self.memory.save_context(
            {"input": 사용자_입력}, 
            {"output": response}
        )
        return response

# 사용
bot = 지원봇()
print(bot.채팅("Pro와 Starter의 차이가 뭔가요?"))
print(bot.채팅("구매 전에 체험해볼 수 있나요?"))
print(bot.채팅("구독을 취소하려면 어떻게 하나요?"))
```

---

## LangChain 요금제

| 구성 요소 | 비용 |
|---------|------|
| LangChain 프레임워크 | **무료 & 오픈소스** |
| LangSmith (개발자) | **무료** (월 5천 추적) |
| LangSmith (Plus) | 월 $39 (5만 추적) |
| LangSmith (엔터프라이즈) | 맞춤 |
| LangServe | **무료 & 오픈소스** |

*LangChain 자체는 무료입니다 — 사용하는 LLM API 비용만 지불합니다.*

---

## 프로덕션 모범 사례

### 1. 성능을 위한 비동기 사용
```python
import asyncio

async def 배치_처리(질문들: list[str]):
    tasks = [chain.ainvoke({"question": q}) for q in 질문들]
    return await asyncio.gather(*tasks)

# 100개의 질문을 동시에 처리
results = asyncio.run(배치_처리(질문들))
```

### 2. 재시도 로직 추가
```python
# 기본: Claude, 폴백: GPT-4o
chain_with_fallback = (
    prompt | claude_llm | parser
).with_fallbacks([prompt | gpt4_llm | parser])
```

### 3. 비용이 많이 드는 호출 캐싱
```python
from langchain.globals import set_llm_cache
from langchain.cache import SQLiteCache

set_llm_cache(SQLiteCache(database_path=".langchain.db"))
# 동일한 프롬프트는 이제 캐시된 응답 사용
```

---

## 학습 리소스

- **공식 문서:** [python.langchain.com](https://python.langchain.com)
- **LangChain Academy:** 에이전트 구축 무료 강좌
- **GitHub:** [github.com/langchain-ai/langchain](https://github.com/langchain-ai/langchain) — 9만+ 스타
- **LangGraph:** [langchain-ai.github.io/langgraph](https://langchain-ai.github.io/langgraph)
- **커뮤니티:** 7만 5천+ 개발자가 있는 Discord

---

## 결론

**LangChain 평점: 9.0/10**

LangChain은 2026년 진지한 AI 애플리케이션을 구축하는 모든 개발자에게 필수 프레임워크입니다. 광범위한 생태계, 강력한 커뮤니티, 지속적인 개선이 이를 최우선 선택으로 만들어줍니다.

간단한 챗봇이든, 회사 문서 위의 RAG 시스템이든, 복잡한 멀티 에이전트 워크플로우든 LangChain은 올바르게 구축하는 데 필요한 도구를 제공합니다.

**[python.langchain.com](https://python.langchain.com)에서 지금 구축 시작하세요**
