---
layout: subsite-post
title: "Claude Code 소스 유출 사건: AI 에이전트 아키텍처에서 배운 것들"
date: 2026-04-01 12:00:00
category: coding
tags: [claude-code, anthropic, 보안, ai-tools, 소스코드]
lang: ko
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop"
description: "Bun 번들러 버그로 인해 Claude Code의 소스 코드가 NPM 소스맵 파일을 통해 유출되었습니다. 유출된 아키텍처에서 AI 에이전트 개발자가 배울 수 있는 핵심 인사이트를 정리했습니다."
---

2026년 3월 말, Bun JavaScript 번들러의 버그로 인해 `@anthropic-ai/claude-code` NPM 패키지에 공개되어선 안 될 `.map`(소스맵) 파일이 포함된 채 배포되었습니다. 이 파일들에는 Claude Code의 전체 TypeScript 원본 소스가 담겨 있었습니다. 개발자 커뮤니티는 몇 시간 만에 이를 추출·분석하여 Claude Code의 내부 아키텍처를 상세히 공개했습니다.

AI 도구와 에이전트를 개발하는 개발자에게 이번 의도치 않은 공개는 진정한 가치가 있습니다. 유출된 아키텍처 패턴은 Anthropic 팀이 실제 프로덕션 환경에서 검증한 설계 결정들을 담고 있기 때문입니다. 무엇이 드러났는지, 그리고 여러분의 프로젝트에 어떻게 적용할 수 있는지 살펴보겠습니다.

![현대적인 AI 코딩 에이전트 아키텍처](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop)
*Photo by [Luke Chesser](https://unsplash.com/@lukechesser) on Unsplash*

## 유출이 발생한 경위

`@anthropic-ai/claude-code` 패키지는 빠른 JavaScript 런타임이자 번들러인 Bun으로 빌드됩니다. Bun의 빌드 파이프라인 버그로 인해, 설정상 제외되어야 할 소스맵 파일이 패키지 출력 디렉토리에 포함되었습니다.

소스맵은 최소화된 프로덕션 코드를 원본 소스로 역추적하는 매핑 정보를 담고 있습니다. 원본 파일명, 변수명은 물론, `sourcesContent` 필드가 활성화된 경우 전체 소스 코드까지 포함될 수 있습니다. 이 맵 파일이 그대로 NPM 레지스트리에 배포되면서 Claude Code의 전체 내부 아키텍처가 공개된 것입니다.

이 사건을 계기로 커뮤니티는 Claude Code의 내부를 역공학(reverse engineering)하기 시작했고, Claude Code의 API 요청에 사용되는 커스텀 서명 메커니즘인 `cch`에 대한 상세한 분석도 이루어졌습니다.

---

## 핵심 인사이트 #1: 에이전트 루프

Claude Code의 핵심은 깔끔한 **ReAct 스타일 에이전트 루프**입니다. 작업이 완료될 때까지 Claude API 호출과 도구 실행을 번갈아 반복하는 while 루프 구조입니다.

```typescript
async function runAgentLoop(session: AgentSession): Promise<AgentResult> {
  const messages: Message[] = session.messages;
  
  while (true) {
    const response = await callClaude({
      model: session.model,
      messages,
      tools: getAvailableTools(session.permissions),
      system: buildSystemPrompt(session),
    });

    if (response.stop_reason === 'end_turn') {
      return { result: response.content, session };
    }

    const toolResults = await executeTools(response.tool_use_blocks, session);
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });
    
    session.costTracker.add(response.usage);
    if (session.costTracker.exceeded()) throw new CostLimitExceededError();
  }
}
```

### 에이전트 개발에 적용할 교훈

이 루프 구조에는 몇 가지 중요한 설계 결정이 담겨 있습니다:

1. **비용 추적은 나중에 추가하는 게 아니라 처음부터 내장되어 있습니다** — 매 반복마다 지출을 추적하고 설정 가능한 한도를 강제합니다. 프로덕션 AI 도구라면 기본 중의 기본입니다.

2. **권한이 사용 가능한 도구를 제어합니다** — `getAvailableTools(session.permissions)`는 세션 컨텍스트에 따라 에이전트가 호출할 수 있는 도구 집합이 달라진다는 의미입니다. 권한 상승을 방지합니다.

3. **도구 실행 결과는 사용자 메시지로 추가됩니다** — Anthropic의 표준 도구 사용 패턴입니다. 프로덕션 루프에서 이 패턴이 사용된다는 것이 확인된 셈입니다.

4. **루프 자체에는 복잡한 재시도 로직이 없습니다** — 재시도, 타임아웃, 에러 처리는 개별 도구 구현에 위임됩니다. 관심사의 명확한 분리입니다.

---

## 핵심 인사이트 #2: 도구 설계 철학

Claude Code의 도구들은 일관된 패턴을 따릅니다. 각 도구는:

- **이름** (snake_case, 동사_명사 형식)
- 사람이 아닌 **모델을 위해 작성된 설명**
- 입력에 대한 엄격한 **JSON 스키마**
- 구조화된 결과를 반환하는 **핸들러 함수**

로 구성됩니다.

```typescript
const editFileTool: ToolDefinition = {
  name: 'edit_file',
  description: `파일의 정확한 텍스트를 교체합니다. oldText는 공백과 들여쓰기를 
                포함하여 정확히 일치해야 합니다. 전체 재작성보다는 정밀하고 
                외과적인 편집에 사용하세요.`,
  input_schema: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '편집할 파일 경로' },
      old_string: { type: 'string', description: '찾아서 교체할 정확한 텍스트' },
      new_string: { type: 'string', description: '이전 텍스트를 교체할 새 텍스트' },
    },
    required: ['file_path', 'old_string', 'new_string'],
  },
};
```

### 도구 목록

유출된 코드는 Claude Code가 제공하는 전체 도구 세트를 드러냈습니다:

| 카테고리 | 도구 |
|---------|------|
| 파일 시스템 | `read_file`, `write_file`, `edit_file`, `list_directory` |
| 검색 | `search_files`, `grep_search` |
| 실행 | `bash`, `run_tests` |
| 탐색 | `find_definition` |

### 에이전트 개발에 적용할 교훈

**도구 설명은 곧 프롬프트입니다.** 도구 설명의 품질이 모델이 도구를 얼마나 잘 사용하는지를 직접적으로 결정합니다. `edit_file`의 설명이 어떻게 계약을 설명하는지("공백 포함 정확히 일치해야 함")에 주목하세요 — 런타임 검증 없이 모델의 행동을 제약합니다.

**넓은 도구보다 외과적인 도구를 선호하세요.** Claude Code에는 `write_file`(전체 덮어쓰기)과 `edit_file`(정밀 교체)이 모두 있습니다. 두 가지 모두 사용 가능할 때 모델은 자연스럽게 덜 파괴적인 옵션을 선택합니다. 에이전트에게 타겟팅된 도구를 제공하면 더 정밀하고 안전한 동작으로 이어집니다.

**도구는 집중적으로 유지하세요.** 각 도구는 정확히 하나의 일을 합니다. 하나의 만능 도구를 만들려 하지 말고, 여러 집중적인 도구를 조합하는 모델의 판단력을 활용하세요.

---

## 핵심 인사이트 #3: 권한 모델

유출된 아키텍처에서 가장 정교한 측면 중 하나는 권한 시스템입니다. Claude Code는 단순한 "허용/거부" 모델이 아닌 계층형 권한 시스템을 사용합니다:

```typescript
enum PermissionLevel {
  READ_ONLY = 'read_only',    // 파일 읽기, 안전한 읽기 전용 명령 실행
  READ_WRITE = 'read_write',  // 파일 수정
  FULL = 'full',              // 임의의 명령 실행
  DANGEROUS = 'dangerous',    // 네트워크 접근, 시스템 수준 작업
}
```

각 도구에는 필요한 권한 레벨이 태그로 달려 있습니다. 에이전트가 도구를 호출하면 권한 레이어가 이를 가로채 확인합니다:

```typescript
async function executeTools(
  toolCalls: ToolUseBlock[],
  session: AgentSession
): Promise<ToolResult[]> {
  return Promise.all(toolCalls.map(async (call) => {
    const tool = toolRegistry.get(call.name);
    
    // 권한 레벨 확인
    if (!session.permissions.allows(tool.requiredPermission)) {
      return {
        tool_use_id: call.id,
        content: `오류: ${call.name}에 대한 권한이 부족합니다. 필요 권한: ${tool.requiredPermission}`,
        is_error: true,
      };
    }

    // 파괴적 작업에 대한 "먼저 물어보기" 모드
    if (tool.isDestructive && session.permissions.askFirst) {
      const approved = await promptUser(`${call.name} 허용?`, call.input);
      if (!approved) return createDeniedResult(call);
    }

    return tool.handler(call.input, session);
  }));
}
```

### 에이전트 개발에 적용할 교훈

**처음부터 권한을 설계에 포함하세요.** 나중에 권한 시스템을 추가하는 것은 처음부터 설계하는 것보다 훨씬 어렵습니다. 첫 번째 도구를 작성하기 전에 권한 레벨을 정의하세요.

**"먼저 물어보기" 모드는 킬러 기능입니다.** 파괴적인 작업에 대한 대화형 승인 흐름은 사용자가 AI 에이전트를 더 폭넓게 배포할 수 있는 자신감을 줍니다. 필요할 때 물어보는 에이전트를 신뢰하는 사용자는 더 넓은 기본 권한을 부여할 것입니다.

**권한 거부 시 풍부한 오류 메시지를 반환하세요.** 도구 호출이 실패한 *이유*를 모델에게 알려주면(단순히 실패했다는 것만 알려주는 것이 아니라) 모델이 적응할 수 있습니다. 사용자에게 권한 상승을 요청하거나, 더 낮은 권한이 필요한 대안적 접근 방식을 찾을 수 있습니다.

**권한 레벨은 실제 위험도에 매핑되어야 합니다.** `READ_ONLY` → `READ_WRITE` → `FULL` → `DANGEROUS`는 직관적이고 조합 가능합니다. 이진 권한 모델은 피하세요.

---

## 핵심 인사이트 #4: MCP 통합

Claude Code는 폐쇄적인 시스템이 아닌 **MCP(Model Context Protocol) 클라이언트**로 구축되어 있습니다. 유출된 코드는 외부 서버에 연결하여 에이전트의 도구 세트를 동적으로 확장하는 잘 설계된 MCP 클라이언트를 보여줍니다:

```typescript
class MCPClient {
  private servers: Map<string, MCPServerConnection> = new Map();

  async connectServer(config: MCPServerConfig): Promise<void> {
    const connection = await createMCPConnection(config);
    await connection.initialize();
    
    // 이 MCP 서버에서 도구를 동적으로 등록
    const tools = await connection.listTools();
    for (const tool of tools) {
      toolRegistry.register({
        ...tool,
        source: `mcp:${config.name}`,
        requiredPermission: inferPermissionLevel(tool),
      });
    }
    
    this.servers.set(config.name, connection);
  }
}
```

이 설계 덕분에 Claude Code 사용자는 다음과 같은 서버를 연결할 수 있습니다:
- 데이터베이스 MCP 서버 (구조화된 데이터 읽기/쓰기)
- GitHub MCP 서버 (PR 관리)
- 사내 커스텀 서버 (회사 특화 도구)

### 에이전트 개발에 적용할 교훈

**MCP는 채택할 가치가 있습니다.** 프로토콜이 빠르게 확산되고 있으며, 에이전트를 MCP 클라이언트로 구축하면 모든 통합을 직접 구현하는 대신 성장하는 MCP 서버 생태계를 활용할 수 있습니다.

**외부 도구에 대한 권한 추론.** `inferPermissionLevel(tool)`에 주목하세요 — 외부 소스에서 도구를 동적으로 등록할 때, Claude Code는 도구의 설명을 기반으로 기본 권한 레벨을 추론합니다. 이는 현명한 방어적 설계입니다.

**도구 네임스페이싱.** 도구에 `source: 'mcp:serverName'`을 태그하면 이름 충돌을 방지하고 모델에게 기능이 어디서 오는지에 대한 컨텍스트를 제공합니다. 플러그인/확장 아키텍처에 좋은 관행입니다.

---

## 핵심 인사이트 #5: 세션 관리와 비용 인식

Claude Code의 세션 레이어는 단순한 대화 기록 그 이상입니다. 운영의 중추 역할을 합니다:

```typescript
interface AgentSession {
  id: string;
  model: string;
  messages: Message[];
  permissions: PermissionSet;
  costTracker: CostTracker;
  fileModifications: FileModification[];
  workingDirectory: string;
  mcpConnections: MCPClient;
  startTime: number;
}
```

`CostTracker`는 특별히 주목할 만합니다:

```typescript
class CostTracker {
  private breakdown: { input: number; output: number; cacheRead: number } = 
    { input: 0, output: 0, cacheRead: 0 };
  private readonly limit: number;

  add(usage: APIUsage): void {
    this.breakdown.input += calculateInputCost(usage.input_tokens, this.model);
    this.breakdown.output += calculateOutputCost(usage.output_tokens, this.model);
    this.breakdown.cacheRead += calculateCacheReadCost(usage.cache_read_input_tokens, this.model);
  }

  get total(): number {
    return this.breakdown.input + this.breakdown.output + this.breakdown.cacheRead;
  }

  exceeded(): boolean {
    return this.limit > 0 && this.total > this.limit;
  }
}
```

캐시 읽기(프롬프트 캐싱 히트)가 일반 입력 토큰과 별도로 추적되는 점에 주목하세요 — 캐시 읽기가 훨씬 저렴하기 때문에 중요합니다.

### 에이전트 개발에 적용할 교훈

**호출별이 아닌 세션 레벨에서 비용을 추적하세요.** 세션 누적 비용은 작업이 통제를 벗어나고 있는지 알려줍니다. 호출별 비용으로는 알 수 없습니다. 설정 가능한 한도를 설정하고 한도 초과 시 우아하게 실패하세요.

**입력, 출력, 캐시 비용을 분리하세요.** 각각 다른 가격이며, 최적화를 위해 세분화된 내역이 필요합니다. 입력 토큰에 많은 비용이 든다면 프롬프트 캐싱이 도움이 될 수 있습니다. 출력이 지배적이라면 응답 길이를 제한해야 할 수 있습니다.

**파일 수정을 추적하세요.** 세션 중 변경된 파일을 파악하면 깔끔한 실행 취소 작업, 더 나은 diff, 롤백 기능이 가능해집니다. 이 기능은 자율 에이전트에 대한 사용자 신뢰를 크게 향상시킵니다.

---

## `cch` 서명이 프로덕션 API 보안에 대해 드러낸 것

커뮤니티의 `cch` 역공학(Claude Code의 커스텀 요청 서명 메커니즘)은 중요한 설계 패턴을 드러냅니다: **계층형 인증**.

Claude Code는 인증을 위해 표준 API 키를 사용하지만, Anthropic은 다음을 위한 보조 서명 레이어(`cch`)를 추가했습니다:

1. **요청을 세션에 바인딩** — Claude Code 외부에서의 API 키 재사용 방지
2. **요청 무결성 추가** — 요청 본문에 대한 HMAC 서명으로 변조 감지
3. **더 풍부한 분석 활성화** — Anthropic이 Claude Code 트래픽과 직접 API 사용을 구분할 수 있음

교훈은 이 정확한 메커니즘을 복사하는 것이 아닙니다 — 유출로 인해 재설계가 필요합니다. 교훈은 프로덕션 AI 도구의 경우, API 클라이언트가 **단순히 "키를 가지고 있다"는 것 이상으로 어떻게 인증하는지**에 대해 생각하는 것이 엔지니어링 투자할 가치가 있다는 것입니다.

---

## 실용적인 체크리스트: 프로덕션 AI 에이전트 구축

Claude Code 소스에서 드러난 모든 것을 기반으로 한 체크리스트:

### 아키텍처
- [ ] 깔끔한 ReAct 에이전트 루프 구현 (모델 호출 → 도구 실행 → 반복)
- [ ] 도구 정의(스키마 + 설명)와 도구 핸들러 분리
- [ ] 메타데이터가 있는 도구 레지스트리 구축 (권한 레벨, 파괴적 여부, 소스)
- [ ] 도구 작성 전에 권한 레벨 설계

### 비용 관리
- [ ] 세션 누적 비용 추적 (입력, 출력, 캐시 읽기 별도)
- [ ] 우아한 실패가 있는 설정 가능한 비용 한도 구현
- [ ] 분석을 위한 세션별 비용 내역 로깅

### 안전성
- [ ] 권한 레벨 뒤에 도구 게이팅
- [ ] 파괴적인 작업에 "먼저 물어보기" 구현
- [ ] 세션 중 이루어진 모든 파일 수정 추적
- [ ] 권한 거부 시 풍부한 오류 메시지 반환

### 확장성
- [ ] 생태계 통합을 위한 MCP 클라이언트 지원 고려
- [ ] 충돌 방지를 위한 외부 도구 네임스페이싱
- [ ] 동적으로 로드된 도구에 대한 안전한 권한 기본값 추론

### 보안
- [ ] NPM 패키지에 포함되는 것을 제어하기 위해 `package.json`의 `files` 허용 목록 사용
- [ ] 프로덕션 빌드에서 번들러에 `sourcemap: 'none'`을 명시적으로 설정
- [ ] 모든 릴리스 전에 `npm pack --dry-run` 출력 감사

---

## 결론

Claude Code 아키텍처의 우발적 공개는 프로덕션 AI 에이전트를 어떻게 구축해야 하는지에 대한 교육으로 이어졌습니다. 드러난 패턴들 — 계층형 권한, 비용 인식 에이전트 루프, 깔끔한 도구 설계, MCP 확장성 — 은 독점 비밀이 아닙니다. 이것들은 좋은 엔지니어링입니다.

AI 코딩 도구나 에이전트를 구축하고 있다면, 이 유출된 아키텍처를 참조 설계로 활용하세요. 교훈은 "Claude Code를 복사하라"가 아니라, 이러한 아키텍처 선택들(권한 모델, 세션 추적, 확장 가능한 도구 레지스트리)이 핵심 구조를 이룬다는 것입니다. 프로토타입에서는 생략할 수 있지만, 프로덕션에서는 대가를 치르게 됩니다.

또 다른 교훈은 물론, 항상 번들러에서 소스맵 제외를 명시적으로 설정하는 것입니다. 배포 전에 `npm pack --dry-run`을 실행하세요. 매번.

---

*참고: Reddit 커뮤니티 분석 스레드, NPM 패키지 검사, Bun 문서*
