---
layout: subsite-post
title: "Goose AI: Block의 오픈소스 AI 코딩 에이전트 완전 가이드 2026"
category: coding
lang: ko
tags: [goose ai, block, 오픈소스, ai 코딩 에이전트, 개발자 도구, 자율 코딩]
date: 2026-07-03 15:00:00
header-img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop"
---

# Goose AI: Block의 오픈소스 AI 코딩 에이전트 완전 가이드 2026

![컴퓨터 화면의 코드](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop)
*Photo by [Luca Bravo](https://unsplash.com/@lucabravo) on Unsplash*

**Goose**는 Block(구 Square)의 오픈소스 AI 코딩 에이전트입니다. 로컬 머신에서 실행되며 복잡한 소프트웨어 개발 작업을 자율적으로 수행할 수 있는 강력하고 확장 가능한 도구입니다. 클라우드 전용 AI 코딩 어시스턴트와 달리, Goose는 완전히 **자체 호스팅 가능**하고, **모델에 구애받지 않으며**, 기존 개발 환경과 깊게 통합되도록 설계되었습니다.

2026년에 Goose는 가장 인기 있는 오픈소스 AI 개발 도구 중 하나가 되었으며, 수천 명의 개발자들이 자동화 테스트부터 전체 기능 구현까지 다양한 작업에 활용하고 있습니다.

## Goose AI란?

Goose는 컴퓨터에 설치되어 실제 개발 환경과 상호작용하는 **로컬 AI 에이전트**입니다. 다음을 할 수 있습니다:

- 프로젝트의 파일 읽기 및 쓰기
- 셸 명령 실행 및 테스트 실행
- 문서 및 웹 탐색
- 익스텐션 시스템을 통한 도구 및 API 사용
- 복잡한 작업 완료를 위한 여러 작업 자율 연결

GitHub Copilot(에디터에서 코드만 제안)과 달리, Goose는 **직접 행동**합니다 — 테스트 스위트를 실행하고, 실패한 테스트를 수정하고, 오류 메시지를 읽고, 문제를 해결할 때까지 반복합니다.

### Goose가 두드러지는 이유

| 기능 | Goose AI | Cursor | Devin | GitHub Copilot |
|---|---|---|---|---|
| 오픈소스 | ✅ | ❌ | ❌ | ❌ |
| 자체 호스팅 | ✅ | ❌ | ❌ | ❌ |
| 모델 무관 | ✅ | 부분적 | ❌ | ❌ |
| 명령 실행 | ✅ | 제한적 | ✅ | ❌ |
| 무료 사용 | ✅ (BYOK) | 월 $20 | 월 $500 | 월 $10 |
| 익스텐션 | ✅ | 제한적 | ❌ | 제한적 |

---

## 설치

### 사전 요구사항

- Python 3.10+ 또는 Node.js 18+
- Git
- LLM API 키 (Anthropic, OpenAI, 또는 로컬 모델용 Ollama)

### 빠른 설치

```bash
# pip 사용
pip install goose-ai

# 또는 pipx 사용 (권장)
pipx install goose-ai

# 설치 확인
goose --version
```

### LLM 제공자 설정

```bash
# Claude로 설정 (코딩 작업에 권장)
goose configure

# 또는 환경 변수 설정
export ANTHROPIC_API_KEY="your-key-here"

# 또는 OpenAI 사용
export OPENAI_API_KEY="your-key-here"
```

Goose는 Ollama를 통한 로컬 모델을 포함해 모든 OpenAI 호환 API와 작동합니다:

```bash
# Ollama로 로컬 모델 사용
export GOOSE_PROVIDER="ollama"
export GOOSE_MODEL="codellama:70b"
```

---

## 핵심 개념

### 세션

Goose는 **세션** 단위로 운영됩니다 — 수행한 작업, 읽은 파일, 실행한 명령을 기억하는 지속적인 컨텍스트:

```bash
# 새 세션 시작
goose session start

# 마지막 세션 재개
goose session resume

# 모든 세션 목록
goose session list
```

### 툴킷

Goose의 기능은 **툴킷** — 특정 능력을 부여하는 모듈식 익스텐션에서 나옵니다:

| 툴킷 | 기능 |
|---|---|
| `developer` | 파일 읽기/쓰기, 셸 명령 (기본값) |
| `web_search` | 웹 탐색 및 URL 읽기 |
| `github` | GitHub API와 상호작용 |
| `jira` | Jira 티켓 읽기/업데이트 |
| `memory` | 세션 간 지식 유지 |
| `screen` | 스크린샷 촬영 및 UI 분석 |

`~/.config/goose/config.yaml`에서 툴킷 활성화:

```yaml
toolkits:
  - developer
  - web_search
  - github
```

---

## 시작하기: 첫 번째 작업들

### 작업 1: 코드 설명

프로젝트로 이동하고 세션 시작:

```bash
cd ~/my-project
goose session start

# Goose REPL에서:
> 진입점부터 시작해서 이 코드베이스가 무엇을 하는지 설명해주세요
```

Goose가 파일을 읽고 체계적인 설명을 제공할 것입니다.

### 작업 2: 버그 수정

```bash
> 이 오류가 발생합니다: [오류 메시지 붙여넣기]. 버그를 찾아서 수정해주세요.
```

Goose가 다음을 수행합니다:
1. 관련 소스 파일 읽기
2. 오류 원인 추적
3. 수정 사항 작성
4. 검증을 위한 테스트 스위트 실행

### 작업 3: 기능 구현

```bash
> Express.js API에 속도 제한 미들웨어를 추가하세요.
> 기존 인증 미들웨어를 참고로 사용하세요.
> 새 미들웨어를 위한 유닛 테스트를 추가하세요.
```

Goose가 기존 코드를 읽고, 코드 패턴에 맞게 기능을 구현하고, 테스트를 작성할 것입니다.

![개발자 워크스페이스](https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop)
*Photo by [Christopher Gower](https://unsplash.com/@cgower) on Unsplash*

---

## 고급 사용법

### 비대화형 Goose 실행

```bash
# 일회성 작업 실행
goose run "src/의 모든 API 엔드포인트에 입력 유효성 검사 추가"

# 작업 파일에서 실행
goose run --task-file tasks/add-authentication.md

# 특정 툴킷으로 실행
goose run --with-toolkit github "코드베이스의 모든 TODO 주석에 대한 GitHub 이슈 생성"
```

### 커스텀 레시피 만들기

레시피는 마크다운 파일로 저장된 재사용 가능한 작업 템플릿입니다:

{% raw %}
```markdown
# recipe: add-tests.md
---
description: 주어진 모듈에 종합적인 유닛 테스트 추가
params:
  - module_path: 테스트할 모듈 경로
  - test_framework: pytest 또는 jest (기본: 자동 감지)
---

{{ module_path }}에 대한 종합적인 유닛 테스트를 생성하세요.

요구사항:
- {{ test_framework }} 프레임워크 사용
- 정상 경로와 엣지 케이스 커버
- 오류/예외 케이스 포함
- 커버리지 90% 이상 목표
- 프로젝트의 기존 테스트 패턴 따르기
```
{% endraw %}

실행:
```bash
goose recipe add-tests --module_path src/auth/jwt.py
```

---

## 실제 워크플로우

### 자동화된 코드 리뷰

```bash
#!/bin/bash
goose run "현재 git diff의 변경사항을 다음 관점에서 검토하세요:
1. 보안 취약점
2. 성능 이슈
3. 누락된 오류 처리
4. 코드베이스 스타일 불일관성
구체적이고 실행 가능한 피드백을 제공하세요."
```

### 문서 생성

```bash
goose run "src/의 모든 공개 함수 중 현재 문서화가 없는 것에 
포괄적인 JSDoc/독스트링 문서를 생성하세요. 
코드베이스의 기존 문서 스타일을 맞추세요."
```

### 레거시 코드 현대화

```bash
goose run "src/의 모든 콜백 스타일 비동기 코드를 async/await로 마이그레이션하세요.
기존 동작을 정확히 유지하세요. 각 파일 후 테스트를 실행해 확인하세요."
```

---

## 가격

Goose 자체는 **100% 무료 오픈소스**입니다. LLM API 비용만 지불하면 됩니다:

| 제공자 | 일반적인 비용 (사용 시간당) | 비고 |
|---|---|---|
| Claude Sonnet 4 | ~$0.50-2.00 | 최고의 코딩 성능 |
| GPT-4o | ~$0.80-3.00 | 무난한 선택 |
| Ollama (로컬) | $0 | 프라이버시, 느린 속도 |
| Gemini 1.5 Pro | ~$0.30-1.50 | 가성비 좋음 |

---

## 결론

Goose AI는 2026년 최고의 무료 오픈소스 AI 코딩 에이전트라고 할 수 있습니다. 로컬 실행 모델, 확장 가능한 툴킷 시스템, 모델 독립성은 개발자의 프라이버시와 자율성을 존중하는 진정으로 강력한 도구를 만들어냅니다. 반복적인 코딩 작업 자동화, 자율 버그 헌팅, CI 통합 AI 리뷰 파이프라인 구축 — 어느 용도든 Goose는 개발자 도구 키트에 추가할 가치가 있습니다.

**Goose 다운로드:** [github.com/block/goose](https://github.com/block/goose)
