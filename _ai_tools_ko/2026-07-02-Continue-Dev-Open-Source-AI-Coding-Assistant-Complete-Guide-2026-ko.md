---
layout: subsite-post
title: "Continue.dev: 오픈소스 AI 코딩 어시스턴트 완벽 가이드 2026"
category: coding
tags: [continue.dev, ai 코딩, vs code, 오픈소스, 코드 어시스턴트]
date: 2026-07-02 15:00:00
lang: ko
header-img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop"
---

# Continue.dev: 오픈소스 AI 코딩 어시스턴트 완벽 가이드 2026

![코드 화면](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop)
*Photo by [Negative Space](https://unsplash.com/@negativespace) on Unsplash*

GitHub Copilot과 Cursor가 대부분의 주목을 받지만, 개방성·프라이버시·모델 유연성을 중시하는 개발자들은 점점 **Continue.dev**로 눈을 돌리고 있습니다. 완전한 오픈소스 AI 코딩 어시스턴트인 Continue는 2026년에 VS Code와 JetBrains에서 실질적으로 모든 AI 모델을 지원하는 강력하고 확장 가능한 플랫폼으로 성장했습니다.

## Continue.dev란?

Continue는 IDE에 직접 통합되는 **오픈소스 AI 코드 어시스턴트**입니다. 독점 도구와 달리:

- 완전한 오픈소스 (Apache 2.0 라이선스)
- **모든 AI 모델** 연결 가능 — 로컬 또는 클라우드
- 기본적으로 외부 서버에 코드를 저장하지 않음
- 커스텀 컨텍스트 제공자, 슬래시 명령어, 프롬프트 지원
- VS Code 및 모든 JetBrains IDE에서 작동

### 주요 차별점

| 기능 | GitHub Copilot | Cursor | Continue.dev |
|---|---|---|---|
| 오픈소스 | ❌ | ❌ | ✅ |
| 자체 호스팅 | ❌ | ❌ | ✅ |
| 모델 선택 | 제한적 | GPT-4/Claude | 모든 모델 |
| 프라이버시 | 클라우드 | 클라우드 | 로컬 옵션 |
| 비용 | 월 $10-$19 | 월 $20 | 무료 (모델 비용 별도) |

---

## 설치

### VS Code

1. VS Code 확장 프로그램 패널 열기 (`Ctrl+Shift+X`)
2. **"Continue"** 검색
3. 설치 클릭
4. 왼쪽 사이드바에 Continue 아이콘 표시

### JetBrains

1. 설정 → 플러그인 → 마켓플레이스
2. **"Continue"** 검색
3. 설치 후 IDE 재시작

### 첫 번째 모델 연결

설치 후 Continue가 모델 설정을 안내합니다. 가장 간단한 시작점:

```json
// ~/.continue/config.json
{
  "models": [
    {
      "title": "Claude 3.5 Sonnet",
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "apiKey": "your-anthropic-api-key"
    }
  ]
}
```

---

## 핵심 기능

### 1. 사이드바 채팅
Continue 패널을 열고 컨텍스트와 함께 AI 모델과 대화하세요. 에디터에서 코드를 하이라이트하고 `Cmd+L` (Mac) 또는 `Ctrl+L` (Windows)을 누르면 자동으로 채팅 컨텍스트에 추가됩니다.

### 2. 인라인 편집 (`Cmd+I` / `Ctrl+I`)
코드 블록을 하이라이트하고 `Cmd+I`를 누른 후 원하는 내용을 설명하세요. Continue가 diff를 생성하고 수락/거절할 수 있습니다 — Cursor의 인라인 편집과 유사합니다.

### 3. 탭 자동완성
Continue는 설정된 모델로 다중 줄 탭 완성을 제공합니다. 자동완성 최적 성능을 위해 Ollama를 통한 **Qwen2.5-Coder** 같은 빠른 로컬 모델 사용을 권장합니다.

### 4. 커스텀 컨텍스트 제공자
컨텍스트 제공자는 Continue가 답변할 때 "아는 것"을 확장합니다:

- **`@file`** — 특정 파일을 컨텍스트에 추가
- **`@folder`** — 전체 폴더 추가
- **`@git-diff`** — 현재 스테이징된 diff 추가
- **`@terminal`** — 최근 터미널 출력 추가
- **`@docs`** — 프로젝트 문서 인덱싱 및 쿼리
- **`@web`** — 실시간 웹 검색 결과

### 5. 슬래시 명령어
반복 작업을 위한 커스텀 슬래시 명령어 생성:

```json
{
  "slashCommands": [
    {
      "name": "tests",
      "description": "하이라이트된 코드의 단위 테스트 생성",
      "prompt": "프로젝트의 테스트 프레임워크를 사용하여 다음 코드에 대한 포괄적인 단위 테스트를 작성하세요: {{{ input }}}"
    }
  ]
}
```

---

## 로컬 모델 사용 (프라이버시 모드)

Continue의 가장 큰 장점 중 하나는 **Ollama**, **LM Studio**, **llama.cpp**를 통한 로컬 모델 지원입니다. 코드가 절대 기기 밖으로 나가지 않습니다.

### Ollama로 설정

```bash
# Ollama 설치
brew install ollama  # macOS

# 코딩 모델 다운로드
ollama pull qwen2.5-coder:7b

# Ollama 서버 시작
ollama serve
```

Continue 설정:

```json
{
  "models": [
    {
      "title": "Qwen2.5-Coder 7B (로컬)",
      "provider": "ollama",
      "model": "qwen2.5-coder:7b"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Qwen2.5-Coder 7B",
    "provider": "ollama",
    "model": "qwen2.5-coder:7b"
  }
}
```

### 권장 로컬 모델 (2026)

| 모델 | 크기 | 최적 용도 |
|---|---|---|
| Qwen2.5-Coder 7B | 4.7 GB | 자동완성, 빠른 편집 |
| Qwen2.5-Coder 32B | 19 GB | 복잡한 추론 |
| DeepSeek-Coder-V2 | 8.9 GB | 다중 언어 코딩 |
| CodeGemma 7B | 5.0 GB | 경량 완성 |

![로컬 개발 환경](https://images.unsplash.com/photo-1537432376769-00f5c2f4c8d2?w=800&auto=format&fit=crop)
*Photo by [Yancy Min](https://unsplash.com/@yancymin) on Unsplash*

---

## 고급 설정

### 다중 모델 설정
작업별로 다른 모델 사용:

```json
{
  "models": [
    {
      "title": "Claude 3.5 Sonnet (채팅)",
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "apiKey": "..."
    },
    {
      "title": "GPT-4o (채팅)",
      "provider": "openai",
      "model": "gpt-4o",
      "apiKey": "..."
    }
  ],
  "tabAutocompleteModel": {
    "title": "Qwen 로컬",
    "provider": "ollama",
    "model": "qwen2.5-coder:7b"
  }
}
```

---

## 워크플로우 & 팁

### 효율적인 코드 리뷰
1. 터미널에서 `git diff --staged` 실행
2. `@terminal` 컨텍스트로 diff를 Continue에 가져오기
3. "버그, 성능 문제, 스타일 일관성을 검토해 줘" 요청

### 모듈 리팩토링
1. `@file`로 모듈 파일 선택
2. 리팩토링 목표 설명
3. Continue가 계획을 생성 — 적용 전에 검토

### 코드베이스 파악
1. `@folder src/`로 소스 트리 추가
2. "이 프로젝트의 아키텍처를 설명해 줘" 요청
3. 특정 부분에 대해 추가 질문

---

## Continue vs. GitHub Copilot vs. Cursor

**Continue를 선택할 때:**
- 보안 요구사항으로 클라우드 모델 사용이 제한될 때
- 다양한 모델을 자유롭게 실험하고 싶을 때
- 이미 API 접근 비용을 지불하고 있어 비용을 절약하고 싶을 때
- 오픈소스 및 커뮤니티 주도 도구를 선호할 때

**GitHub Copilot을 선택할 때:**
- GitHub 워크플로우와 최대 통합이 필요할 때
- 팀이 이미 GitHub Enterprise를 사용할 때

**Cursor를 선택할 때:**
- 목적 특화된 AI 우선 IDE 경험을 원할 때
- 세련된 올인원 솔루션에 비용을 지불할 의향이 있을 때

---

## 결론

Continue.dev는 AI 코딩 어시스턴트에 대한 완전한 제어권을 원하는 개발자에게 최선의 선택입니다. 오픈소스 모델, 자체 호스팅 옵션, 무제한 모델 유연성은 특히 엄격한 데이터 거주 요구사항을 가진 팀에게 독보적으로 강력합니다. Copilot이나 Cursor보다 설정에 약간 더 노력이 필요하지만, 유연성과 프라이버시 측면의 보상은 충분한 가치가 있습니다.

**평점: 8.5/10** — 2026년 최고의 오픈소스 AI 코딩 어시스턴트

---

*Continue.dev를 워크플로우에 활용 중인가요? 설정 팁을 댓글로 공유해 주세요!*
