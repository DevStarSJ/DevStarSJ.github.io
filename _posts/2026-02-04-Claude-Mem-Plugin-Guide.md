---
layout: post
title: "Claude-Mem: Claude Code 세션 간 메모리를 유지하는 플러그인"
description: "Claude Code 세션이 끝나면 사라지는 컨텍스트 문제를 해결하는 Claude-Mem 플러그인. 자동 캡처, AI 압축, Progressive Disclosure를 활용한 ~10배 토큰 효율 달성. 설치부터 아키텍처 분석까지."
category: Dev
tags: [claude-code, claude-mem, ai-memory, context-engineering, plugin, developer-tools]
date: 2026-02-04
header-img: "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=1200"
---

# Claude-Mem: Claude Code 세션 간 메모리를 유지하는 플러그인

Claude Code를 본격적으로 쓰기 시작하면 반드시 부딪히는 문제가 있습니다. **세션이 끝나면 모든 컨텍스트가 사라진다는 것.**

몇 시간 동안 프로젝트 아키텍처를 설명하고, 버그를 같이 잡고, 리팩토링 방향을 논의했는데 — 새 세션을 열면 Claude는 백지상태입니다. 다시 처음부터.

[Claude-Mem](https://github.com/thedotmack/claude-mem)은 이 문제를 정면으로 해결합니다.

![AI Memory](https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800)
*Photo by [Shubham Dhage](https://unsplash.com/@theshubhamdhage) on Unsplash*

---

## TL;DR

```bash
# Claude Code 세션에서 실행
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem
```

- 모든 도구 사용을 자동 캡처
- Claude Agent SDK로 AI 압축
- 다음 세션에 관련 컨텍스트 자동 주입
- Progressive Disclosure로 ~10배 토큰 효율
- 웹 뷰어 UI (`localhost:37777`)

---

## 왜 필요한가?

### CLAUDE.md의 한계

많은 개발자가 프로젝트 루트에 `CLAUDE.md`를 만들어 컨텍스트를 수동 관리합니다. 하지만 근본적 한계가 있습니다:

1. **수동 유지보수** — 직접 업데이트해야 합니다
2. **정적** — 작업 흐름의 뉘앙스를 담지 못합니다
3. **토큰 비효율** — 매 세션마다 전체를 로드합니다
4. **검색 불가** — 과거 결정이나 버그 수정을 찾기 어렵습니다

### Claude-Mem의 접근

Claude-Mem은 이 모든 것을 **자동화**합니다:

| 특성 | CLAUDE.md | Claude-Mem |
|------|-----------|------------|
| 캡처 | 수동 | 자동 (모든 도구 사용) |
| 압축 | 없음 | AI 기반 (Claude Agent SDK) |
| 검색 | grep/find | 시맨틱 + FTS5 |
| 토큰 효율 | 낮음 | ~10배 향상 |
| 유지보수 | 개발자 몫 | 자동 |

---

## 아키텍처 분석

Claude-Mem의 구조를 개발자 관점에서 들여다봅시다.

### 기술 스택

```
Language:     TypeScript (ES2022, ESNext modules)
Runtime:      Node.js 18+ / Bun
Database:     SQLite 3 (bun:sqlite) + FTS5
Vector Store: ChromaDB (optional, semantic search)
HTTP:         Express.js 4.18
Real-time:    Server-Sent Events (SSE)
UI:           React + TypeScript
AI:           @anthropic-ai/claude-agent-sdk
Build:        esbuild
```

### 핵심 컴포넌트

시스템은 5개의 핵심 컴포넌트로 구성됩니다:

```
Plugin Hooks → Database → Worker Service → SDK Processor → Database → Next Session
```

#### 1. Plugin Hooks (6개)

Claude Code의 라이프사이클 이벤트에 연결되는 훅 스크립트:

```
SessionStart     → context-hook.ts    (이전 세션 컨텍스트 주입)
UserPromptSubmit → new-hook.ts        (세션 생성, 프롬프트 저장)
PostToolUse      → save-hook.ts       (도구 실행 캡처, 100회+)
Stop             → summary-hook.ts    (세션 요약 생성)
SessionEnd       → cleanup-hook.ts    (세션 완료 표시)
```

별도로 `smart-install.js`가 pre-hook으로 동작하여 의존성을 관리합니다. 버전 변경 시에만 실행되어 오버헤드를 최소화합니다.

#### 2. Worker Service

Express.js 기반 HTTP 서버로 포트 37777에서 동작:

- **10개 검색 API 엔드포인트**
- **8개 뷰어 UI HTTP/SSE 엔드포인트**
- Claude Agent SDK를 통한 비동기 관찰 처리
- SSE 기반 실시간 업데이트
- Bun으로 프로세스 관리

#### 3. Database Layer

SQLite3 + FTS5 (Full-Text Search):

```sql
-- 주요 테이블
sdk_sessions     -- 세션 정보
observations     -- 개별 관찰 (도구 사용 기록)
session_summaries -- 세션 요약
```

데이터 위치: `~/.claude-mem/claude-mem.db`

선택적으로 ChromaDB를 사용하면 시맨틱 벡터 검색도 가능합니다.

#### 4. mem-search Skill

v5.4.0부터 MCP 도구 대신 Skill 기반 검색을 지원합니다:

- MCP 대비 **~2,250 토큰 절약** (세션당)
- Skill frontmatter: ~250 토큰 (세션 시작 시 로드)
- Full instructions: ~2,500 토큰 (호출 시에만 로드)
- 10개 검색 연산 지원

---

## 데이터 파이프라인 상세

### 캡처 → 저장 → 처리 → 주입

```
Hook (stdin) → Database → Worker Service → SDK Processor → Database → Next Session Hook
```

**1단계: 캡처**
`PostToolUse` 훅이 Claude Code의 모든 도구 실행을 stdin으로 받습니다.

**2단계: 저장**
훅이 관찰(observation)을 SQLite에 기록합니다.

**3단계: AI 처리**
워커 서비스가 Claude Agent SDK를 사용해 각 관찰에서 구조화된 정보를 추출합니다:

```typescript
interface ProcessedObservation {
  title: string;       // 간단 설명
  subtitle: string;    // 추가 컨텍스트
  narrative: string;   // 상세 설명
  facts: string[];     // 핵심 학습 포인트
  concepts: string[];  // 태그 & 카테고리
  type: ObservationType; // decision, bugfix, feature, ...
  files: string[];     // 관련 파일
}
```

**4단계: 주입**
다음 세션의 `SessionStart` 훅이 최근 관찰을 데이터베이스에서 읽어 Claude의 초기 컨텍스트에 주입합니다 (기본값: 50개 관찰, 10개 세션).

---

## Progressive Disclosure 심화

이것이 Claude-Mem의 가장 중요한 설계 원칙입니다.

### 문제: Context Pollution

기존 RAG 방식은 모든 것을 한 번에 주입합니다:

```
기존 방식:
┌─────────────────────────────────────┐
│ [15,000 tokens 과거 세션]           │
│ [8,000 tokens 관찰]                │
│ [12,000 tokens 파일 요약]          │
│                                     │
│ Total: 35,000 tokens               │
│ 실제 관련: ~2,000 tokens (6%)      │
└─────────────────────────────────────┘
```

94%의 토큰이 낭비됩니다.

### 해결: 3단계 접근

```
Claude-Mem 방식:
┌─────────────────────────────────────┐
│ 인덱스 50개 관찰: ~800 tokens       │
│ ↓                                   │
│ Agent 판단: "이거 관련 있다!"       │
│ ↓                                   │
│ 관찰 #2543 조회: ~120 tokens       │
│                                     │
│ Total: 920 tokens                  │
│ 실제 관련: 920 tokens (100%)       │
└─────────────────────────────────────┘
```

#### Layer 1: Index (~800 tokens)

세션 시작 시 경량 인덱스가 주입됩니다:

```
| ID    | Time    | T  | Title                          | Tokens |
|-------|---------|----|--------------------------------|--------|
| #2586 | 2:15 PM | 🟡 | Fixed auth middleware timeout   | ~105   |
| #2587 | 2:30 PM | 🟢 | Added rate limiting to API      | ~155   |
| #2589 | 3:00 PM | 🔴 | CORS gotcha with credentials    | ~80    |
```

각 관찰이 **무엇인지**(제목), **얼마나 비용이 드는지**(토큰 수)를 보여줍니다. Claude가 필요에 따라 선택적으로 조회합니다.

#### Layer 2: On-Demand Detail

MCP 도구나 mem-search 스킬로 특정 관찰의 상세 내용을 가져옵니다:

```javascript
// 3-layer workflow
search(query="auth bug", type="bugfix", limit=10)  // 인덱스 검색
timeline(observationId=2586)                         // 시간대 컨텍스트
get_observations(ids=[2586, 2589])                   // 상세 조회
```

#### Layer 3: Source Access

필요하면 원본 소스 파일을 직접 읽습니다.

### 관찰 유형 시스템

시각적 분류로 빠른 스캐닝을 지원합니다:

```
🎯 session-request  — 사용자의 원래 요청
🔴 gotcha           — 치명적 엣지케이스/함정
🟡 problem-solution — 버그 수정/우회법
🔵 how-it-works     — 기술적 설명
🟢 what-changed     — 코드 변경
🟣 discovery        — 학습/통찰
🟠 why-it-exists    — 설계 근거
🟤 decision         — 아키텍처 결정
⚖️ trade-off        — 의도적 타협
```

권장: 🔴 gotcha, 🟤 decision, ⚖️ trade-off는 즉시 조회할 가치가 있는 타입입니다.

---

## 설정 가이드

### 기본 설정

`~/.claude-mem/settings.json` (첫 실행 시 자동 생성):

```json
{
  "CLAUDE_MEM_MODEL": "sonnet",
  "CLAUDE_MEM_PROVIDER": "claude",
  "CLAUDE_MEM_CONTEXT_OBSERVATIONS": 50,
  "CLAUDE_MEM_WORKER_PORT": 37777,
  "CLAUDE_MEM_LOG_LEVEL": "INFO"
}
```

### 모델 선택

| 모델 | 특성 | 용도 |
|------|------|------|
| `haiku` | 빠르고 저렴 | 대량 관찰 처리 |
| `sonnet` | 균형 (기본값) | 대부분의 경우 |
| `opus` | 최고 성능 | 복잡한 프로젝트 |

### 비용 절감: 대체 프로바이더

Claude API가 부담되면 다른 프로바이더를 사용할 수 있습니다:

**Gemini (무료 티어 있음!):**

```json
{
  "CLAUDE_MEM_PROVIDER": "gemini",
  "CLAUDE_MEM_GEMINI_API_KEY": "your-key",
  "CLAUDE_MEM_GEMINI_MODEL": "gemini-2.5-flash-lite"
}
```

**OpenRouter (100+ 모델):**

```json
{
  "CLAUDE_MEM_PROVIDER": "openrouter",
  "CLAUDE_MEM_OPENROUTER_API_KEY": "your-key",
  "CLAUDE_MEM_OPENROUTER_MODEL": "xiaomi/mimo-v2-flash:free"
}
```

### 컨텍스트 주입 튜닝

웹 뷰어(`localhost:37777`)의 설정 패널에서 세밀하게 조정 가능합니다:

| 설정 | 기본값 | 범위 | 설명 |
|------|--------|------|------|
| Observations | 50 | 1-200 | 주입할 관찰 수 |
| Sessions | 10 | 1-50 | 관찰을 가져올 세션 수 |

값이 클수록 더 많은 히스토리를 보지만 세션 시작이 느려지고 토큰을 더 사용합니다.

**필터링 옵션:**
- 관찰 유형별 (bugfix, feature, refactor, discovery, decision, change)
- 컨셉별 (how-it-works, architecture, debugging, configuration, ...)

---

## /clear와의 상호작용

Claude Code에서 `/clear`를 사용하면:

- ✅ 컨텍스트가 재주입됩니다 (`SessionStart` 훅이 `source: "clear"`로 재실행)
- ✅ 관찰은 계속 캡처됩니다
- ✅ 응답 완료 시 요약이 생성됩니다
- ⚠️ 세션 자체는 종료되지 않고 새 프롬프트 번호가 부여됩니다

즉, `/clear`는 Claude의 대화 컨텍스트를 리셋하면서 Claude-Mem의 최신 컨텍스트를 다시 주입하는 효과입니다.

---

## 웹 뷰어 UI

`http://localhost:37777`에서 접근 가능한 React 기반 뷰어:

- **실시간 메모리 스트림** (SSE 기반)
- **무한 스크롤** + 자동 중복 제거
- **프로젝트별 필터링**
- **설정 패널** (터미널 프리뷰 포함)
- **버전 채널 전환** (stable ↔ beta)
- **관찰 상세 보기** (`/api/observation/{id}`)

특히 **Terminal Preview** 기능은 다음 세션에 실제로 주입될 컨텍스트를 미리 확인할 수 있어 유용합니다.

---

## 프라이버시 & 보안

- 모든 데이터는 **로컬** (`~/.claude-mem/`)에 저장
- **프라이버시 태그**로 민감 콘텐츠 캡처 제외
- `CLAUDE_MEM_SKIP_TOOLS`로 특정 도구 유형 제외
- 외부 서버 전송 없음

---

## Beta: Endless Mode

베타 채널에서 사용 가능한 **Endless Mode**는 장시간 세션을 위한 바이오미메틱(생체모방) 메모리 아키텍처입니다.

웹 뷰어 Settings → Version Channel에서 전환 가능합니다.

---

## 디렉토리 구조

```
~/.claude-mem/
├── claude-mem.db          # SQLite 데이터베이스
├── settings.json          # 설정 파일
├── .install-version       # 스마트 인스톨러 캐시
├── worker.port            # 워커 포트 파일
└── logs/
    ├── worker-out.log     # stdout
    └── worker-error.log   # stderr
```

---

## 실전 팁

### 1. 설치 후 잊어버리기
Claude-Mem은 완전 자동입니다. 별도 관리가 필요 없습니다.

### 2. 관찰 수 조정하기
시작이 느리면 `CLAUDE_MEM_CONTEXT_OBSERVATIONS`을 25로 줄이세요. 히스토리가 더 필요하면 100~200으로.

### 3. 자연어로 검색하기
```
"지난 세션에서 뭘 했었지?"
"auth 관련 버그 어떻게 고쳤어?"
"이 파일 최근에 어떤 변경을 했어?"
```

### 4. 프로바이더 비용 최적화
관찰 처리에 opus가 필요하진 않습니다. 기본 sonnet이면 충분하고, 비용이 부담되면 Gemini 무료 티어를 사용하세요.

### 5. 워커 로그 확인
문제가 있으면 `~/.claude-mem/logs/`를 확인하세요.

---

## 결론

Claude-Mem은 Claude Code의 가장 큰 약점 — 세션 간 메모리 부재 — 을 우아하게 해결합니다. 설치는 2줄, 설정은 불필요, 동작은 자동. Progressive Disclosure를 통해 토큰 효율까지 챙겼습니다.

Claude Code를 같은 프로젝트에 지속적으로 사용하는 개발자라면, 한번 설치해볼 가치가 충분합니다.

```bash
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem
```

---

**참고 링크:**
- [GitHub](https://github.com/thedotmack/claude-mem)
- [Documentation](https://docs.claude-mem.ai)
- [Discord](https://discord.com/invite/J4wttp9vDu)
- [X/Twitter](https://x.com/Claude_Memory)
- 라이선스: AGPL-3.0
