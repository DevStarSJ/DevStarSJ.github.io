---
layout: subsite-post
title: "Claude MCP: AI가 컴퓨터를 제어하게 해주는 프로토콜"
description: "Anthropic의 Model Context Protocol(MCP)이 AI와 도구 연결을 표준화한다. MCP 작동 원리, 중요한 이유, 2026년 사용법."
category: automation
tags: [claude, mcp, anthropic, ai-integration, automation, protocol]
date: 2026-02-10
read_time: 12
lang: ko
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200"
---

# Claude MCP: AI가 컴퓨터를 제어하게 해주는 프로토콜

AI를 도구에 연결하려면 각 통합마다 커스텀 코드를 작성해야 했던 때를 기억하는가? Anthropic의 **Model Context Protocol(MCP)**이 그걸 바꾼다. AI와 도구 간 통신을 위한 범용 표준이다. 알아야 할 모든 것을 정리했다.

![AI 연결](https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800)
*Photo by [NASA](https://unsplash.com/@nasa) on Unsplash*

## MCP란?

MCP(Model Context Protocol)는 AI 모델이 외부 도구, 데이터 소스, 서비스와 상호작용하는 방식을 표준화하는 오픈 프로토콜이다. AI를 위한 USB라고 생각하면 된다 - 어디서나 작동하는 하나의 표준.

각 도구마다 커스텀 통합을 구축하는 대신, 개발자가 MCP 호환 서버를 한 번 만들면 어떤 MCP 호환 AI 클라이언트도 사용할 수 있다.

## MCP가 중요한 이유

### MCP 이전

```
Claude → 커스텀 코드 → Slack
Claude → 다른 커스텀 코드 → GitHub  
Claude → 또 다른 코드 → Database
Claude → 더 많은 커스텀 코드 → Calendar
```

각 통합이 일회성. 취약함. 유지보수 어려움.

### MCP 이후

```
Claude ─┬→ MCP → Slack
        ├→ MCP → GitHub
        ├→ MCP → Database
        └→ MCP → Calendar
```

하나의 프로토콜. 표준화. 재사용 가능.

## MCP 작동 방식

### 아키텍처

```
┌─────────────────┐
│  MCP 클라이언트  │  (Claude Desktop, IDE 등)
│  (AI 호스트)     │
└────────┬────────┘
         │ MCP 프로토콜 (JSON-RPC)
         ▼
┌─────────────────┐
│  MCP 서버       │  (로컬 서버)
│  (도구 제공자)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  외부 도구       │  (Slack, DB, API 등)
│  / 데이터 소스   │
└─────────────────┘
```

### 핵심 개념

**MCP 서버**: MCP를 통해 도구/데이터를 노출하는 프로그램
- 로컬 머신에서 실행
- 외부 서비스에 연결
- 사용 가능한 작업 정의

**MCP 클라이언트**: MCP 서버를 소비하는 AI 애플리케이션
- Claude Desktop (네이티브 지원)
- MCP 플러그인이 있는 IDE
- 커스텀 애플리케이션

**기능**:
- **Tools**: AI가 취할 수 있는 액션 (메시지 전송, 파일 생성)
- **Resources**: AI가 읽을 수 있는 데이터 (파일, DB 내용)
- **Prompts**: 미리 정의된 대화 시작점

![네트워크 기술](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800)
*Photo by [Jordan Harrison](https://unsplash.com/@jordanharrison) on Unsplash*

## Claude Desktop으로 MCP 설정하기

### 1단계: Claude Desktop 설치

[claude.ai/download](https://claude.ai/download)에서 다운로드. MCP 지원이 내장되어 있다.

### 2단계: MCP 서버 구성

`~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) 또는 Windows 해당 경로 편집:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/you/Documents"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your-token-here"
      }
    }
  }
}
```

### 3단계: Claude Desktop 재시작

이제 Claude가 파일시스템과 GitHub에 접근할 수 있다!

## 인기 MCP 서버

### 공식 서버 (Anthropic 제공)

| 서버 | 기능 |
|------|------|
| `server-filesystem` | 로컬 파일 읽기/쓰기 |
| `server-github` | GitHub 레포, 이슈, PR |
| `server-gitlab` | GitLab 통합 |
| `server-slack` | Slack 메시지 전송/읽기 |
| `server-postgres` | PostgreSQL DB 쿼리 |
| `server-sqlite` | SQLite DB 접근 |
| `server-puppeteer` | 브라우저 자동화 |
| `server-brave-search` | 웹 검색 |

### 커뮤니티 서버

MCP 생태계가 빠르게 성장 중:
- **Linear**: 프로젝트 관리
- **Notion**: 워크스페이스 접근
- **Google Drive**: 파일 관리
- **Obsidian**: 노트 볼트 접근
- **Home Assistant**: 스마트홈 제어
- **Docker**: 컨테이너 관리

더 많은 서버: [github.com/modelcontextprotocol](https://github.com/modelcontextprotocol)

## 나만의 MCP 서버 만들기

TypeScript로 만드는 최소 MCP 서버:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";

const server = new Server({
  name: "my-mcp-server",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

// 도구 정의
server.setRequestHandler("tools/list", async () => ({
  tools: [{
    name: "get_weather",
    description: "도시의 현재 날씨 가져오기",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "도시 이름" }
      },
      required: ["city"]
    }
  }]
}));

// 도구 호출 처리
server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "get_weather") {
    const city = request.params.arguments.city;
    // 여기에 날씨 API 로직
    return { content: [{ type: "text", text: `${city} 날씨: 맑음, 22°C` }] };
  }
});

// 서버 시작
const transport = new StdioServerTransport();
await server.connect(transport);
```

## 실제 사용 케이스

### 1. 자동화된 개발 워크플로우

MCP로 Claude가 할 수 있는 것:
- 코드베이스 읽기 (filesystem)
- GitHub 이슈 확인 (github)
- 브랜치와 PR 생성 (github)
- 테스트 실행 (shell)
- 프로젝트 보드 업데이트 (linear)

한 대화에서 전부.

### 2. 개인 지식 관리

Claude 연결 대상:
- Obsidian 볼트 (노트)
- 로컬 문서 (filesystem)
- 북마크 (browser)
- 이메일 아카이브 (imap)

모든 지식에 걸쳐 질문하기.

### 3. 스마트홈 어시스턴트

MCP + Home Assistant로 Claude가:
- 기기 상태 확인
- 조명 켜기/끄기
- 온도 조절
- 자동화 생성

"침실 빼고 모든 조명 꺼줘"가 자연스러워진다.

### 4. 데이터베이스 작업

postgres나 sqlite 서버로:
- 대화형 데이터 쿼리
- 보고서 생성
- 레코드 수정 (확인 후)
- 트렌드 분석

## 보안 고려사항

### MCP 서버는 로컬에서 실행

모든 MCP 서버가 당신 머신에서 실행된다. 데이터가 Anthropic 서버로 가지 않는다 - AI의 분석만 간다.

### 권한 모델

각 서버가 할 수 있는 것을 정의한다. 제어 가능:
- 어떤 서버가 활성화되는지
- 어떤 디렉토리/리소스에 접근하는지
- 어떤 API 키를 갖는지

### 베스트 프랙티스

1. **최소 권한 원칙** - 필요한 것만 활성화
2. **서버 코드 검토** - 특히 커뮤니티 서버
3. **환경 변수 사용** - 시크릿 하드코딩 금지
4. **민감 데이터 분리** - 모든 것을 AI에 노출하지 않기

## MCP vs. 대안들

| 기능 | MCP | LangChain Tools | GPT Actions |
|------|-----|-----------------|-------------|
| 오픈 표준 | ✅ | ❌ (프레임워크) | ❌ (독점) |
| 로컬 실행 | ✅ | ✅ | ❌ (클라우드) |
| 멀티 클라이언트 | ✅ | ✅ | ❌ (OpenAI만) |
| 공식 지원 | Anthropic | 커뮤니티 | OpenAI |
| 생태계 | 성장 중 | 큼 | 제한적 |

## MCP의 미래

Anthropic이 MCP에 크게 베팅 중:
- 더 많은 공식 서버 예정
- 더 넓은 IDE 통합
- 엔터프라이즈 기능
- 커뮤니티 생태계 성장

AI 에이전트가 더 능력 있어지면서, 도구와 상호작용하는 표준화된 방식이 필수가 된다. MCP가 그 표준으로 자리매김하고 있다.

## 오늘 시작하기

1. **Claude Desktop 설치** (MCP 지원 포함)
2. **filesystem 서버 활성화** (기본 파일 접근)
3. **github 서버 시도** (코딩한다면)
4. **커뮤니티 서버 탐색** (유스케이스에 맞게)
5. **직접 만들기** (커스텀 니즈에)

MCP는 Claude를 챗봇에서 디지털 세계와 실제로 상호작용할 수 있는 능력 있는 에이전트로 변환한다. 프로토콜은 오픈이고, 생태계는 성장 중이며, 가능성은 매일 확장되고 있다.

---

*어떤 MCP 서버 쓰고 계신가요? 커스텀으로 만드신 게 있나요? 셋업 공유해주세요!*
