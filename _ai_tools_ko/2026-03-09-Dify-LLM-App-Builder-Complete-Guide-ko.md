---
layout: subsite-post
title: "Dify: 코드 없이 LLM 앱 만들기 — 2026년 완벽 가이드"
category: automation
lang: ko
header-img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200"
tags: [dify, llm 앱 빌더, 노코드 ai, 오픈소스 ai, ai 워크플로우, 랭체인 대안, ai 에이전트, rag]
---

# Dify: 코드 없이 LLM 앱 만들기 — 2026년 완벽 가이드

![AI 워크플로우 다이어그램](https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800)
*Photo by [Andrew Neel](https://unsplash.com/@andrewneel) on Unsplash*

AI 기반 애플리케이션을 만들려면 LangChain, 벡터 데이터베이스, 프롬프트 엔지니어링, 백엔드 개발에 대한 깊은 지식이 필요했습니다. **Dify**가 그것을 바꿨습니다. 시각적 인터페이스를 통해 LLM 기반 애플리케이션을 빌드, 배포, 반복 개선할 수 있는 오픈소스 플랫폼입니다 — 깊은 AI 전문 지식 없이도요.

## Dify란?

**Dify** (Define + Modify)는 오픈소스 LLM 애플리케이션 개발 플랫폼입니다. 시각적 워크플로우 빌더, 내장 RAG 파이프라인, 에이전트 기능, 모델 관리 레이어를 하나의 통합 도구로 제공합니다.

**주요 수치:**
- GitHub 스타 50,000개 이상
- 전 세계 100,000명 이상의 개발자가 사용
- 50개 이상의 LLM 모델 지원 (OpenAI, Anthropic, Google, 로컬 모델)
- 클라우드 SaaS 또는 자체 호스팅 가능

## 핵심 개념

Dify의 4가지 주요 구성 요소를 이해해보세요:

### 1. 챗봇
간단한 대화형 AI입니다. LLM을 연결하고, 시스템 프롬프트를 작성하고, 게시하면 됩니다. 고객 지원, Q&A 봇, 개인 비서에 적합합니다.

### 2. 텍스트 생성기
입력을 받아 구조화된 출력을 생성하는 단일 턴 애플리케이션입니다. 콘텐츠 생성, 이메일 초안 작성, 문서 요약에 적합합니다.

### 3. 에이전트
도구(웹 검색, 코드 실행, API 호출)를 사용하고 여러 단계에 걸쳐 추론하여 복잡한 작업을 완료할 수 있는 AI입니다.

### 4. 워크플로우
여러 AI 단계, 조건, 루프, 도구를 연결하는 시각적 파이프라인입니다. Dify의 가장 강력한 기능 — 사실상 노코드 LangChain입니다.

## 설치 옵션

### 클라우드 (가장 쉬운 방법)
[dify.ai](https://dify.ai)에서 가입 — 무료 티어 제공.

### Docker 자체 호스팅 (개발자 권장)

```bash
# 레포지토리 클론
git clone https://github.com/langgenius/dify.git

# Docker Compose로 시작
cd dify/docker
cp .env.example .env
docker compose up -d
```

몇 분 후 `http://localhost/`에서 Dify에 접근합니다.

### 환경 설정 (.env)

설정해야 할 주요 변수:
```bash
# LLM API 키
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# 시크릿 키 (반드시 변경!)
SECRET_KEY=your-secret-key-here
```

## 첫 번째 애플리케이션 만들기

![노트북으로 작업 중인 개발자](https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800)
*Photo by [Ilya Pavlov](https://unsplash.com/@ilyapavlov) on Unsplash*

### 튜토리얼: RAG 기반 고객 지원 챗봇

문서를 기반으로 질문에 답변하는 챗봇을 만들어 봅시다.

**1단계: 지식 베이스 생성**

1. 왼쪽 사이드바에서 **Knowledge** 클릭
2. **Create Knowledge** 클릭
3. 문서 업로드 (PDF, Word, Markdown, 웹사이트 URL)
4. 청킹 설정: `청크 크기: 500, 오버랩: 50`
5. 임베딩 모델 선택 (text-embedding-3-small 비용 효율적)
6. **Save and Process** 클릭

**2단계: 챗봇 생성**

1. **Create New App** → **Chatbot** 클릭
2. "Support Bot"으로 이름 지정
3. LLM 선택 (지원 목적에는 Claude 3.5 Sonnet 권장)

**3단계: 시스템 프롬프트 설정**

```
You are a helpful customer support agent for [회사명].
Use the provided knowledge base to answer questions accurately.
If you don't find the answer in the knowledge base, say so honestly 
and offer to escalate to a human agent.
```

**4단계: 지식 베이스 연결**

1. 컨텍스트 섹션에서 **+** 클릭
2. 생성한 지식 베이스 선택
3. 검색 설정: `Top-K: 5, 점수 임계값: 0.5`

**5단계: 게시**

**Publish** 클릭으로 받는 것들:
- 공유 가능한 공개 URL
- 임베드 가능한 웹 위젯
- 통합을 위한 API 엔드포인트

## 워크플로우 빌더 — 핵심 기능

### 주요 노드 유형

**LLM 노드:** `{{variable_name}}`으로 이전 노드 출력을 참조하는 프롬프트 템플릿으로 LLM 호출

**코드 노드:** 데이터 변환을 위한 Python 또는 JavaScript 실행:
```python
def main(inputs: dict) -> dict:
    text = inputs.get("text", "")
    word_count = len(text.split())
    return {"word_count": word_count, "needs_summary": word_count > 500}
```

**조건부 노드:** 조건에 따라 워크플로우 분기:
- `{{word_count}} > 500` → 먼저 요약
- 그렇지 않으면 → 직접 처리

**HTTP 요청 노드:** 서버 코드 없이 외부 API 호출

## 실제 활용 사례

### 1. 자동화된 리서치 어시스턴트
- 입력: 주제 또는 질문
- 1단계: 웹 검색 (Tavily 또는 Bing Search 도구)
- 2단계: LLM이 검색 결과 종합
- 3단계: 구조화된 보고서 형식으로 포매팅
- 출력: 출처가 있는 마크다운 보고서

### 2. 문서 처리 파이프라인
- 입력: 업로드된 PDF/Word 문서
- 1단계: LLM으로 핵심 정보 추출
- 2단계: 문서 유형 분류
- 3단계: 유형에 따라 다른 처리 경로로 라우팅
- 출력: HTTP를 통해 CRM으로 전송되는 구조화된 JSON

### 3. 다국어 지원 봇
- 입력: 고객 메시지 (모든 언어)
- 1단계: 언어 감지
- 2단계: 지식 검색을 위해 영어로 번역
- 3단계: 관련 KB 문서 검색
- 4단계: 원래 언어로 응답 생성

## Dify vs. 경쟁 도구

| 기능 | Dify | FlowiseAI | LangFlow | n8n + AI |
|------|------|-----------|----------|----------|
| 오픈소스 | ✅ | ✅ | ✅ | ✅ |
| 자체 호스팅 | ✅ | ✅ | ✅ | ✅ |
| 내장 RAG | ✅ | 제한적 | 제한적 | ❌ |
| 시각적 워크플로우 | ✅ | ✅ | ✅ | ✅ |
| 프롬프트 관리 | ✅ | ❌ | ❌ | ❌ |
| 사용 편의성 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

## 요금제

| 플랜 | 가격 | 포함 내용 |
|------|------|----------|
| Sandbox | 무료 | 200 메시지 콜/일 |
| Professional | $59/월 | 무제한 앱, 5K 메시지/일 |
| Team | $159/월 | 팀 협업, 10K 메시지/일 |
| 자체 호스팅 | 무료 | 무제한 (인프라 비용만 부담) |

대부분의 개발자와 소규모 팀에게 **자체 호스팅이 명백한 선택**입니다 — 완전한 제어권과 무제한 사용을 VPS에서 월 $5-20 정도의 비용으로 얻을 수 있습니다.

## 결론

Dify는 가장 완벽한 LLM 애플리케이션 개발 플랫폼 중 하나입니다. 시각적 워크플로우 빌더, 내장 RAG, 광범위한 모델 지원 덕분에 비엔지니어도 접근할 수 있으면서 프로덕션 배포에 충분히 강력합니다.

AI 기반 애플리케이션을 구축하고 있다면 — 챗봇이든, 문서 처리기든, 복잡한 다단계 에이전트든 — Dify를 시작점으로 삼으세요.

**평점: 9.5/10** — 현재 이용 가능한 최고의 오픈소스 LLM 앱 빌더입니다.

---

*[dify.ai](https://dify.ai)에서 시작하거나 [GitHub 레포](https://github.com/langgenius/dify)에서 자체 호스팅하세요. 문서가 훌륭하고 Discord 커뮤니티도 매우 활성화되어 있습니다.*
