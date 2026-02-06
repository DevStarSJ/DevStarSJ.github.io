---
layout: subsite-post
title: "Claude Code Agent Teams: 복잡한 코딩 작업을 위한 멀티 에이전트 협업"
date: 2026-02-06
category: coding
tags: [Claude Code, Agent Teams, 멀티 에이전트, AI 코딩, Anthropic, 개발자 도구, 페어 프로그래밍]
lang: ko
header-img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200"
---

# Claude Code Agent Teams: 복잡한 코딩 작업을 위한 멀티 에이전트 협업

Claude Code v2.1.32에서 획기적인 실험 기능이 추가되었습니다: **Agent Teams**. 여러 Claude Code 인스턴스가 팀으로 협업하며, 각자 독립적인 컨텍스트 윈도우를 가지고 직접 소통하며 복잡한 문제를 해결합니다.

![팀 협업](https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800)
*Photo by [Brooke Cagle](https://unsplash.com/@brookecagle) on Unsplash*

## Agent Teams란?

Agent Teams는 여러 Claude Code 인스턴스를 조율하는 기능입니다:

- **팀 리드**: 하나의 세션이 조율자로서 작업을 할당하고 결과를 종합
- **팀원들**: 각자 독립적인 컨텍스트 윈도우에서 작업하는 별도의 Claude 인스턴스
- **직접 소통**: 팀원들끼리 직접 메시지를 주고받을 수 있음 (리드에게만 보고하는 게 아님)
- **공유 태스크 리스트**: 모든 에이전트가 작업 상태를 보고 가져갈 수 있음

이것은 하나의 AI가 모든 것을 순차적으로 처리하는 전통적인 단일 에이전트 워크플로우와 근본적으로 다릅니다.

## Agent Teams vs Subagents

Claude Code에는 이미 subagent가 있는데, 무엇이 다를까요?

| 특징 | Subagents | Agent Teams |
|------|-----------|-------------|
| 컨텍스트 | 자체 윈도우; 결과를 호출자에게 반환 | 자체 윈도우; 완전 독립적 |
| 소통 | 메인 에이전트에게만 보고 | 팀원끼리 직접 대화 |
| 조율 | 메인 에이전트가 모든 작업 관리 | 공유 태스크 리스트로 자율 조율 |
| 적합한 경우 | 결과만 중요한 집중 작업 | 토론과 협업이 필요한 복잡한 작업 |
| 토큰 비용 | 낮음: 결과가 요약되어 반환 | 높음: 각각 별도 인스턴스 |

**Subagent 사용**: 빠르고 집중적인 작업자가 결과를 보고할 때
**Agent Teams 사용**: 팀원들이 발견한 것을 공유하고, 서로 도전하며, 스스로 조율해야 할 때

## 시작하기

### Agent Teams 활성화

Agent Teams는 기본적으로 비활성화되어 있습니다. 환경변수나 설정에서 활성화하세요:

**방법 1: 환경 변수**
```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

**방법 2: settings.json**
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

설정 파일 위치:
- 사용자: `~/.claude/settings.json`
- 프로젝트: `.claude/settings.json`
- 로컬: `.claude/settings.local.json`

### 첫 번째 팀 시작하기

활성화 후, Claude에게 팀을 만들라고 하면 됩니다:

```
코드베이스 전체에서 TODO 주석을 추적하는 CLI 도구를 설계하려고 해.
다양한 관점에서 탐색할 agent team을 만들어줘:
- UX 담당 팀원 1명
- 기술 아키텍처 담당 1명
- 악마의 변호인 역할 1명
```

Claude가 할 일:
1. 공유 태스크 리스트로 팀 생성
2. 각 관점별로 팀원 생성
3. 문제 탐색 진행
4. 발견 사항 종합
5. 완료 후 팀 정리

## 디스플레이 모드

### In-Process 모드 (기본)

모든 팀원이 메인 터미널 안에서 실행:

- `Shift+Up/Down`: 팀원 선택
- 선택 후 타이핑: 해당 팀원에게 직접 메시지 전송
- `Enter`: 팀원 세션 보기
- `Escape`: 현재 턴 중단
- `Ctrl+T`: 태스크 리스트 토글

아무 터미널에서나 작동, 추가 설정 불필요.

### Split-Pane 모드

각 팀원이 별도 패널에서 동시에 보임:

```json
{
  "teammateMode": "tmux"
}
```

또는 단일 세션에서:
```bash
claude --teammate-mode tmux
```

**요구사항:**
- [tmux](https://github.com/tmux/tmux/wiki) 또는
- iTerm2 + [it2 CLI](https://github.com/mkusaka/it2)

**참고:** VS Code 통합 터미널, Windows Terminal, Ghostty에서는 Split-pane 모드가 지원되지 않습니다.

## 팀 작업하기

### 팀원과 모델 지정

```
4명의 팀원으로 팀을 만들어서 이 모듈들을 병렬로 리팩토링해줘.
각 팀원은 Sonnet 사용해.
```

### 계획 승인 요구

복잡하거나 위험한 작업의 경우:

```
인증 모듈을 리팩토링할 아키텍트 팀원을 생성해.
변경하기 전에 계획 승인을 받도록 해.
```

팀원은 리드가 계획을 승인할 때까지 읽기 전용 계획 모드로 작업합니다.

### Delegate 모드

리드를 조율 전용으로 제한 (코딩 안 함):

팀 시작 후 `Shift+Tab`을 눌러 delegate 모드로 전환.

리드가 오케스트레이션에만 집중하게 할 때 유용합니다.

### 팀원에게 직접 메시지

어떤 팀원에게든 직접 메시지를 보낼 수 있습니다:

- **In-process 모드**: `Shift+Up/Down`으로 선택 후 타이핑
- **Split-pane 모드**: 팀원 패널 클릭

### 태스크 관리

태스크는 세 가지 상태: 대기, 진행 중, 완료.

- **리드가 할당**: 리드에게 어떤 태스크를 어떤 팀원에게 줄지 지시
- **자체 청구**: 팀원이 끝나면 다음 미할당 태스크를 스스로 가져감

태스크는 의존성을 가질 수 있습니다—미해결 의존성이 있는 대기 태스크는 의존성이 완료될 때까지 청구할 수 없습니다.

### 종료 및 정리

**팀원 종료:**
```
researcher 팀원에게 종료하라고 해
```

**팀 정리:**
```
팀 정리해줘
```

리드는 활성 팀원이 있는지 확인하고 있으면 실패합니다.

## 최적의 사용 사례

### 1. 병렬 코드 리뷰

```
PR #142를 리뷰할 agent team을 만들어. 리뷰어 3명 생성:
- 보안 영향에 집중하는 1명
- 성능 영향 체크하는 1명
- 테스트 커버리지 검증하는 1명
각자 리뷰하고 결과 보고하도록 해.
```

각 리뷰어가 다른 렌즈를 적용하고, 리드가 결과를 종합합니다.

### 2. 경쟁 가설 조사

```
사용자들이 앱이 하나의 메시지 후 연결이 끊긴다고 보고해.
5명의 agent 팀원을 생성해서 다른 가설들을 조사하게 해.
과학적 토론처럼 서로의 이론을 반증하려고 대화하게 해.
합의가 나오면 findings 문서 업데이트해.
```

여러 조사자가 서로를 적극적으로 반증하려고 하면 순차 조사보다 실제 원인을 더 빨리 찾습니다.

### 3. 교차 레이어 기능 개발

```
새 사용자 프로필 기능을 위한 agent team 만들어:
- 프론트엔드 팀원: React 컴포넌트와 스타일링
- 백엔드 팀원: API 엔드포인트와 데이터베이스
- 테스팅 팀원: 유닛 및 통합 테스트
인터페이스에 대해 조율하게 해.
```

각 팀원이 다른 레이어를 담당하여 서로 충돌하지 않습니다.

### 4. 리서치 및 문서화

```
마이크로서비스 아키텍처를 문서화할 팀 만들어:
- 서비스 의존성 매핑하는 팀원 1명
- API 계약 문서화하는 팀원 1명
- 문서화되지 않은 동작 식별하는 팀원 1명
종합해서 포괄적인 아키텍처 문서로 만들어.
```

## 아키텍처 상세

### 팀 구성요소

| 구성요소 | 역할 |
|----------|------|
| Team Lead | 팀 생성, 팀원 생성, 작업 조율 |
| Teammates | 할당된 작업을 수행하는 별도의 Claude 인스턴스 |
| Task List | 팀원들이 청구하고 완료하는 공유 작업 목록 |
| Mailbox | 에이전트 간 통신을 위한 메시징 시스템 |

### 저장 위치

- 팀 설정: `~/.claude/teams/{team-name}/config.json`
- 태스크 리스트: `~/.claude/tasks/{team-name}/`

### 컨텍스트와 소통

각 팀원은 자체 컨텍스트 윈도우를 가집니다. 생성 시:
- 프로젝트 컨텍스트 로드 (CLAUDE.md, MCP 서버, 스킬)
- 리드로부터 생성 프롬프트 수신
- 리드의 대화 기록은 상속하지 **않음**

소통 방법:
- **message**: 특정 팀원 한 명에게 전송
- **broadcast**: 모든 팀원에게 전송 (비용이 팀 크기에 비례하므로 절약해서 사용)

### 권한

팀원들은 리드의 권한 설정을 상속합니다. 리드가 `--dangerously-skip-permissions`로 실행하면 모든 팀원도 마찬가지입니다.

## 토큰 사용량 고려사항

Agent teams는 단일 세션보다 훨씬 많은 토큰을 사용합니다:

- 각 팀원이 자체 컨텍스트 윈도우를 가짐
- 토큰 사용량은 활성 팀원 수에 비례
- 계획 모드에서 Agent teams는 표준 세션보다 약 **7배 더 많은 토큰** 사용

### 비용 관리 팁

1. **팀원에게 Sonnet 사용**: 성능과 비용의 균형
2. **팀을 작게 유지**: 각 팀원이 별도의 Claude 인스턴스
3. **생성 프롬프트를 집중적으로**: 프롬프트의 모든 내용이 컨텍스트에 추가됨
4. **완료 후 팀 정리**: 활성 팀원은 유휴 상태에서도 토큰을 계속 소비

## 현재 제한사항

| 제한사항 | 상세 |
|----------|------|
| 세션 재개 불가 | `/resume`과 `/rewind`가 in-process 팀원을 복원하지 못함 |
| 태스크 상태 지연 가능 | 팀원이 태스크 완료를 표시하지 못하는 경우 있음 |
| 종료가 느릴 수 있음 | 팀원이 현재 작업을 마친 후 종료 |
| 세션당 하나의 팀 | 새 팀 시작 전 현재 팀 정리 필요 |
| 중첩 팀 불가 | 팀원이 자체 팀을 생성할 수 없음 |
| 리드 고정 | 팀원을 리드로 승격할 수 없음 |
| 생성 시 권한 설정 | 생성 후 개별 모드 변경 가능, 생성 시점에는 불가 |
| Split panes는 tmux/iTerm2 필요 | VS Code 터미널, Windows Terminal, Ghostty 지원 안 함 |

## 실전 팁 (Pro Tips) 💡

### tmux 설치 및 실행

Split-pane 모드를 사용하려면 tmux가 필수입니다:

**macOS:**
```bash
brew install tmux
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install tmux
```

**실행 방법:**
```bash
# 1. 먼저 tmux 세션 시작
tmux

# 2. tmux 안에서 Claude Code 실행
claude --dangerously-skip-permissions --teammate-mode tmux
```

tmux를 실행하면 터미널 하단에 초록색 상태 바가 나타납니다. 이 상태에서 Claude Code를 실행해야 Split-pane이 제대로 작동합니다.

### settings.json이 안 될 때

아직 experimental 기능이라 settings.json에 설정해도 적용이 안 될 때가 있습니다. 이럴 때는 **실행 시 플래그를 같이 넣어주세요**:

```bash
# settings.json 설정 + 실행 플래그 둘 다 사용 (권장)
claude --teammate-mode tmux
```

### 팀 생성 트리거 팁 ⭐

단순히 "팀으로 작업해줘"라고 하면 서브에이전트를 만드는 경우가 많습니다. **Agent Teams를 확실히 트리거하는 방법:**

```
개발자 블로그를 만들 거야. 기술은 Next.js + Tailwind CSS 사용할 거고,
어떤 작업들을 병렬로 실행할 수 있는지,
그리고 팀메이트는 어떻게 구성해야 하는지 계획해줘.

다음 링크에서 Agent Teams 문서 확인하고 적합하게 계획해줘:
https://code.claude.com/docs/en/agent-teams
```

**핵심 포인트:**
1. "병렬로 실행"이라는 키워드 사용
2. "팀메이트 구성" 명시적 요청
3. **공식 문서 링크 함께 제공** → 확률 대폭 상승!

새로운 기능이라 Claude가 제대로 못 쓰는 경우가 있는데, 문서 링크를 넣어주면 적합하게 구성할 확률이 훨씬 높아집니다.

### 팀 이름의 중요성

팀 이름을 지정하면 정보가 파일로 저장되어 **나중에 다시 불러올 수 있습니다**:

```
팀 이름은 "blog-creator"로 해주고, 계획대로 팀메이트들을 만들어서 구현해줘.
```

**저장 위치:**
- 팀 설정: `~/.claude/teams/blog-creator/config.json`
- 태스크: `~/.claude/tasks/blog-creator/`

작업이 끝나면 팀원들은 자동으로 dispose되지만, 팀 이름으로 저장된 정보는 남아있어서 나중에 같은 팀 구조로 다시 작업할 수 있습니다.

### 태스크 ID로 독립 인스턴스 연결

팀 기능 없이도 여러 Claude Code 인스턴스가 통신할 수 있습니다! 태스크 리스트가 글로벌하게 설정되어 있기 때문에:

1. 한 Claude Code에서 태스크 리스트 생성
2. 태스크 ID를 다른 Claude Code 인스턴스에 주입
3. 자동으로 서로 오케스트레이션 및 통신

이것은 Anthropic이 처음부터 멀티 에이전트 협업을 염두에 두고 설계했다는 것을 보여줍니다. Agent Teams는 이 기능을 메인 Claude Code에서 한 번에 오케스트레이션하는 UI를 추가한 것입니다.

### 권장 실행 명령어

모든 옵션을 포함한 권장 실행 방법:

```bash
# tmux 세션 시작
tmux

# Claude Code 실행 (모든 권장 옵션 포함)
claude --dangerously-skip-permissions --teammate-mode tmux

# 기존 세션 이어서 하려면
claude --dangerously-skip-permissions --teammate-mode tmux -r
```

## 문제 해결

### 팀원이 나타나지 않음

1. In-process 모드에서 `Shift+Down`을 눌러 팀원 순환
2. 작업이 팀을 필요로 하는지 확인—Claude가 복잡도에 따라 결정
3. Split panes의 경우 tmux 설치 확인: `which tmux`

### 권한 프롬프트가 너무 많음

팀원 생성 전에 권한 설정에서 일반 작업을 미리 승인하세요.

### 리드가 일찍 종료

리드에게 진행하기 전에 팀원들이 완료할 때까지 기다리라고 하세요.

### 고아 tmux 세션

```bash
tmux ls
tmux kill-session -t <session-name>
```

## 요약

Claude Code Agent Teams는 AI 지원 개발의 패러다임 전환을 나타냅니다:

- 순차 조사 대신 **병렬 탐색**
- 허브-스포크 대신 **직접 팀 소통**
- 공유 태스크 리스트를 통한 **자율 조율 작업**
- 같은 문제에 대한 **전문화된 관점**

아직 실험적이고 토큰 집약적이지만, agent teams가 뛰어난 경우:
- 복잡한 코드 리뷰
- 다중 가설 디버깅
- 교차 레이어 기능 개발
- 리서치 및 문서화

`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`로 활성화하고 실험을 시작하세요!

## 참고 자료

- [공식 문서](https://code.claude.com/docs/en/agent-teams)
- [Subagents 문서](https://code.claude.com/docs/en/sub-agents)
- [Claude Code GitHub](https://github.com/anthropics/claude-code)
- [Claude Code 비용 가이드](https://code.claude.com/docs/en/costs)
