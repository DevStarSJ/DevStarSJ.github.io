---
layout: ai-tools-post-ko
title: "Claude-Mem: Claude Code에 영구 메모리를 달아주는 플러그인"
description: "Claude Code 세션 간 컨텍스트 유지 플러그인 Claude-Mem 완전 가이드. 자동 캡처, AI 압축, Progressive Disclosure로 ~10배 토큰 효율. 설치부터 설정까지."
category: coding
tags: [claude-code, claude-mem, AI메모리, 컨텍스트엔지니어링, 개발자도구, 플러그인]
date: 2026-02-04
read_time: 12
lang: ko
header-img: "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=1200"
---

# Claude-Mem: Claude Code에 영구 메모리를 달아주는 플러그인

Claude Code 사용자라면 다 아는 그 고통. 몇 시간 동안 열심히 작업하고 세션 닫았다가 새로 열면 Claude는 **이전 기억이 전혀 없습니다.** 같은 아키텍처를 다시 설명하고, 같은 파일을 다시 가리키고, 같은 컨텍스트를 다시 구축해야 합니다.

**Claude-Mem이 이걸 해결합니다.** Claude가 작업하는 모든 것을 자동으로 캡처하고, AI로 압축하고, 다음 세션에 관련 컨텍스트를 주입하는 플러그인입니다. 수동 작업 불필요. 복사-붙여넣기도 불필요. 그냥 연속성이 유지됩니다.

![AI Memory](https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800)
*Photo by [Shubham Dhage](https://unsplash.com/@theshubhamdhage) on Unsplash*

## 문제: 세션은 휘발성이다

Claude Code는 강력하지만, 모든 세션이 처음부터 시작됩니다:

- 🧠 **이전 세션 기억 없음**
- 📄 프로젝트 구조를 매번 다시 설명
- 🔄 창 닫으면 컨텍스트 사라짐
- 💸 이미 설명한 걸 다시 설명하느라 토큰 낭비

`CLAUDE.md` 같은 컨텍스트 파일로 우회하는 개발자도 있지만, 이건 정적이라 직접 관리해야 하고, 실제 작업 세션의 뉘앙스를 담지 못합니다.

## 해결책: Claude-Mem

[Claude-Mem](https://github.com/thedotmack/claude-mem)은 [Alex Newman](https://github.com/thedotmack)이 만든 오픈소스 플러그인(AGPL-3.0)으로, 자동 캡처와 AI 압축을 통해 Claude Code에 영구 메모리를 제공합니다.

### 핵심 기능

- 🧠 **영구 메모리** — 컨텍스트가 세션을 넘어 유지
- 📊 **Progressive Disclosure** — 필요한 것만 단계적으로 조회
- 🔍 **시맨틱 검색** — 자연어로 프로젝트 히스토리 검색
- 🖥️ **웹 뷰어 UI** — `localhost:37777`에서 실시간 메모리 스트림
- 🔒 **프라이버시 컨트롤** — 태그 기반 민감 정보 제외
- ⚙️ **설정 불필요** — 설치하면 바로 작동
- 🧪 **베타 채널** — Endless Mode 같은 실험적 기능

## 설치 (2줄이면 끝)

Claude Code 세션에서 실행:

```
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem
```

Claude Code 재시작. 끝입니다. 플러그인이 자동으로:

- 사전 빌드된 바이너리 다운로드 (컴파일 불필요)
- SQLite 포함 모든 의존성 설치
- 라이프사이클 훅 구성
- 첫 세션에서 워커 서비스 자동 시작

### 시스템 요구사항

- **Node.js:** 18.0.0 이상
- **Claude Code:** 플러그인 지원 최신 버전
- **Bun:** 없으면 자동 설치
- **SQLite 3:** 번들 포함

## 작동 원리

Claude-Mem은 Claude Code의 라이프사이클 5개 지점에 훅(Hook)을 걸어 동작합니다.

### 세션 라이프사이클

```
┌──────────────────────────────────────────────┐
│ 1. 세션 시작 → Context Hook                  │
│    이전 세션의 컨텍스트 주입                    │
├──────────────────────────────────────────────┤
│ 2. 사용자가 프롬프트 입력 → New Session Hook   │
│    데이터베이스에 세션 생성                      │
├──────────────────────────────────────────────┤
│ 3. Claude가 도구 사용 → PostToolUse Hook      │
│    모든 도구 실행 캡처 (100회 이상)             │
├──────────────────────────────────────────────┤
│ 4. Claude 응답 완료 → Summary Hook            │
│    세션 요약 자동 생성                          │
├──────────────────────────────────────────────┤
│ 5. 세션 종료 → Cleanup Hook                   │
│    세션 완료 표시                               │
└──────────────────────────────────────────────┘
```

### 캡처되는 것들

모든 도구 사용이 기록됩니다:

- **Read** — 파일 읽기
- **Write** — 파일 생성
- **Edit** — 파일 수정
- **Bash** — 명령어 실행
- **Glob** — 파일 패턴 검색
- **Grep** — 내용 검색
- 기타 모든 Claude Code 도구

### AI 처리 과정

워커 서비스(Bun 기반, 포트 37777)가 Claude Agent SDK를 사용해 각 관찰(observation)을 처리합니다:

- **Title** — 무슨 일이 있었는지 간단 설명
- **Narrative** — 상세 설명
- **Facts** — 핵심 학습 내용 (불릿 포인트)
- **Concepts** — 관련 태그 및 카테고리
- **Type** — 분류 (decision, bugfix, feature, refactor, discovery)
- **Files** — 읽거나 수정한 파일 목록

### 세션 요약

Claude가 응답을 완료하면 자동으로 요약이 생성됩니다:

- **Request** — 무엇을 요청했는지
- **Investigated** — 무엇을 탐색했는지
- **Learned** — 핵심 발견
- **Completed** — 무엇을 완료했는지
- **Next Steps** — 다음에 할 일

## Progressive Disclosure: 진짜 똑똑한 부분

기존 방식은 모든 컨텍스트를 한 번에 쏟아붓습니다. 관련 없는 히스토리에 토큰을 낭비하는 거죠. Claude-Mem은 **3단계 Progressive Disclosure** 전략을 사용합니다.

### 1단계: 경량 인덱스 (~800 토큰)

세션 시작 시, Claude는 간략한 인덱스를 봅니다:

```
### 2026년 2월 3일

| ID    | Time    | T  | Title                          | Tokens |
|-------|---------|----|--------------------------------|--------|
| #2586 | 2:15 PM | 🟡 | Fixed auth middleware timeout   | ~105   |
| #2587 | 2:30 PM | 🟢 | Added rate limiting to API      | ~155   |
| #2589 | 3:00 PM | 🔴 | CORS gotcha with credentials    | ~80    |
```

각 관찰의 내용과 조회 비용(토큰)이 보입니다.

### 2단계: 온디맨드 상세 조회 (MCP 도구)

Claude가 더 많은 컨텍스트가 필요하면 특정 관찰만 가져옵니다:

```javascript
// 1단계: 관련 관찰 검색
search(query="인증 버그", type="bugfix", limit=10)

// 2단계: 관련 ID만 상세 조회
get_observations(ids=[2586, 2589])
```

### 3단계: 소스 코드 직접 접근

필요하면 원본 소스 파일을 직접 읽습니다.

### 토큰 효율 비교

| 방식 | 사용 토큰 | 관련성 |
|------|----------|--------|
| **기존 방식 (전부 주입)** | ~35,000 | ~6% |
| **Claude-Mem (단계적)** | ~920 | ~100% |

약 **10배 더 효율적**인 토큰 사용. 컨텍스트 윈도우가 실제 작업을 위해 깨끗하게 유지됩니다.

### 관찰 유형 아이콘

Claude-Mem은 관찰을 시각적 마커로 분류합니다:

| 아이콘 | 유형 | 설명 |
|--------|------|------|
| 🎯 | session-request | 사용자의 원래 목표 |
| 🔴 | gotcha | 치명적 엣지케이스나 함정 |
| 🟡 | problem-solution | 버그 수정이나 우회법 |
| 🔵 | how-it-works | 기술적 설명 |
| 🟢 | what-changed | 코드/아키텍처 변경 |
| 🟣 | discovery | 학습이나 통찰 |
| 🟠 | why-it-exists | 설계 근거 |
| 🟤 | decision | 아키텍처 결정 |
| ⚖️ | trade-off | 의도적 타협 |

## 설정

설정 파일은 `~/.claude-mem/settings.json`에 있습니다 (첫 실행 시 자동 생성):

```json
{
  "CLAUDE_MEM_MODEL": "sonnet",
  "CLAUDE_MEM_PROVIDER": "claude",
  "CLAUDE_MEM_CONTEXT_OBSERVATIONS": 50,
  "CLAUDE_MEM_WORKER_PORT": 37777,
  "CLAUDE_MEM_LOG_LEVEL": "INFO"
}
```

### 주요 설정

- **`CLAUDE_MEM_MODEL`** (기본값: `sonnet`) — 처리에 사용할 AI 모델. haiku(빠름), sonnet(균형), opus(최고 성능)
- **`CLAUDE_MEM_PROVIDER`** (기본값: `claude`) — 프로바이더. claude, gemini, openrouter 지원
- **`CLAUDE_MEM_CONTEXT_OBSERVATIONS`** (기본값: `50`) — 세션당 주입할 관찰 수 (1-200)
- **`CLAUDE_MEM_WORKER_PORT`** (기본값: `37777`) — 워커 서비스 포트
- **`CLAUDE_MEM_SKIP_TOOLS`** — 캡처에서 제외할 도구들

### 대체 프로바이더 사용

API 비용을 절약하고 싶다면? **Gemini** (무료 티어 있음!)이나 **OpenRouter** (100+ 모델)를 사용할 수 있습니다:

```json
{
  "CLAUDE_MEM_PROVIDER": "gemini",
  "CLAUDE_MEM_GEMINI_API_KEY": "your-key-here",
  "CLAUDE_MEM_GEMINI_MODEL": "gemini-2.5-flash-lite"
}
```

## 웹 뷰어 UI

Claude-Mem에는 `http://localhost:37777`에서 접근 가능한 실시간 웹 뷰어가 포함되어 있습니다:

- **라이브 메모리 스트림** — Server-Sent Events 기반
- **무한 스크롤** — 자동 중복 제거
- **프로젝트 필터링** — 여러 레포 간 전환
- **설정 패널** — 터미널 프리뷰와 함께
- **버전 채널 전환** — stable ↔ beta

뷰어에서 다음 세션에 주입될 컨텍스트를 정확히 확인할 수 있습니다.

## 프라이버시

Claude-Mem은 기본적으로 모든 것을 캡처하지만, 민감한 콘텐츠는 제외할 수 있습니다:

- **프라이버시 태그** 사용으로 캡처 방지
- `CLAUDE_MEM_SKIP_TOOLS`로 특정 도구 유형 제외
- 컨텍스트 주입 설정에서 관찰 유형별 필터링
- 모든 데이터는 `~/.claude-mem/claude-mem.db`에 로컬 저장

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 언어 | TypeScript (ES2022) |
| 런타임 | Node.js 18+ / Bun |
| 데이터베이스 | SQLite 3 + FTS5 |
| 벡터 스토어 | ChromaDB (선택, 시맨틱 검색) |
| HTTP 서버 | Express.js |
| 실시간 | Server-Sent Events |
| UI | React + TypeScript |
| AI SDK | @anthropic-ai/claude-agent-sdk |

## 수동 컨텍스트 파일과의 비교

| 기능 | 수동 (CLAUDE.md) | Claude-Mem |
|------|------------------|------------|
| 캡처 | 수동 | 자동 |
| 압축 | 없음 | AI 기반 |
| 검색 | grep/find | 시맨틱 + FTS5 |
| 토큰 효율 | 낮음 (전부 주입) | 높음 (단계적 공개) |
| 유지보수 | 직접 해야 함 | 자동 유지 |
| 세션 간 연동 | 정적 파일 | 동적, 세션 인식 |
| 프라이버시 | 수동 편집 | 태그 기반 제외 |

## 실전 팁

### 1. 그냥 놔두기

Claude-Mem을 관리하려 하지 마세요. 설치하고 잊으세요. 자동화가 핵심입니다.

### 2. 웹 뷰어 확인하기

`localhost:37777`을 가끔 방문해서 뭐가 캡처되고 있는지 확인해보세요. 자신의 작업 패턴을 보는 것도 꽤 흥미롭습니다.

### 3. 관찰 수 조정

Claude Code 시작이 느리다면 `CLAUDE_MEM_CONTEXT_OBSERVATIONS`를 50에서 25로 줄이세요. 더 많은 히스토리가 필요하면 200까지 올릴 수 있습니다.

### 4. 자연어 검색 활용

검색 문법을 외울 필요 없습니다. 그냥 자연스럽게 물어보세요:

> "지난주에 고친 버그가 뭐였지?"
> "인증 미들웨어 어떻게 구현했었어?"
> "worker-service.ts 최근 변경사항 보여줘"

Claude가 자동으로 MCP 검색 도구를 호출합니다.

### 5. 베타 채널 사용해보기

Endless Mode(베타)는 장시간 세션을 위한 바이오미메틱 메모리 아키텍처입니다. 웹 뷰어 설정에서 전환 가능합니다.

## 누가 사용하면 좋을까?

**Claude-Mem이 필요한 사람:**
- Claude Code를 같은 프로젝트에 지속적으로 사용하는 개발자
- 매 세션마다 프로젝트 컨텍스트 재설명이 귀찮은 사람
- 코딩 히스토리를 시맨틱하게 검색하고 싶은 사람
- 토큰 효율을 신경쓰는 사람

**굳이 필요 없는 사람:**
- Claude Code를 가끔만 사용하는 사람
- 서로 연관 없는 일회성 프로젝트만 하는 사람
- 수동 컨텍스트 관리가 편한 사람

## 시작하기

```
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem
```

2줄이면 끝. 다음 Claude Code 세션부터 바로 메모리가 쌓이기 시작합니다.

---

**링크:**
- [GitHub 저장소](https://github.com/thedotmack/claude-mem)
- [공식 문서](https://docs.claude-mem.ai)
- [Discord 커뮤니티](https://discord.com/invite/J4wttp9vDu)
- [Twitter/X](https://x.com/Claude_Memory)
