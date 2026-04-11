---
layout: subsite-post
title: "Aider AI 코딩 어시스턴트 완벽 가이드 2026: 터미널에서 AI와 함께 코딩하기"
date: 2026-04-11 15:00:00
category: coding
tags: [aider, ai, 코딩, 터미널, cli, llm]
lang: ko
header-img: https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80
description: "Aider 완벽 가이드 — 터미널에서 어떤 LLM과도 동작하는 오픈소스 AI 코딩 어시스턴트. 설정, 팁, 실제 워크플로우까지."
---

대부분의 AI 코딩 도구는 특정 IDE 안에 가둬 놓습니다. Aider는 다릅니다. 터미널에서 직접 작동하고, 기존 Git 워크플로우에 자연스럽게 녹아들며, GPT-4o, Claude, Gemini, 심지어 로컬 모델과도 함께 페어 프로그래밍할 수 있습니다.

![Aider - 터미널 기반 AI 코딩](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80)
*Photo by [Christopher Gower](https://unsplash.com/@cgower) on Unsplash*

## Aider란?

Aider는 터미널에서 실행되는 오픈소스 AI 페어 프로그래밍 도구입니다. 파일을 세션에 추가하고, 원하는 것을 설명하면, Aider가 코드를 직접 편집합니다 — 변경 사항을 의미 있는 커밋 메시지와 함께 자동으로 Git에 커밋합니다.

**GitHub:** [github.com/paul-gauthier/aider](https://github.com/paul-gauthier/aider)  
**별점:** 25,000+ ⭐  
**라이선스:** Apache 2.0

---

## Aider가 돋보이는 이유

### 모든 LLM과 호환
GPT-4o, Claude Opus/Sonnet, Gemini 1.5 Pro, Mistral, DeepSeek, Ollama 로컬 모델 등 100개 이상 모델 지원. 특정 서비스에 종속되지 않습니다.

### Git 네이티브
Aider가 만드는 모든 변경 사항은 자동으로 의미 있는 커밋 메시지와 함께 저장됩니다. 기록이 깔끔하게 유지되고, `git revert`로 즉시 되돌릴 수 있습니다.

### 터미널 우선
GUI 없음, 확장 프로그램 없음. 터미널이 있는 곳이라면 어디서든 — 로컬 머신, 원격 서버, Docker 컨테이너까지.

### 컨텍스트 인식
추가한 파일들을 읽어 전체 코드베이스 구조를 이해합니다. 현재 파일만이 아닙니다.

---

## 설치

```bash
# pip으로 설치
pip install aider-chat

# 또는 pipx 사용 (격리 환경 추천)
pipx install aider-chat
```

---

## 빠른 시작

```bash
# API 키 설정
export OPENAI_API_KEY="sk-..."

# GPT-4o로 Aider 시작 (기본값)
aider

# Claude Sonnet 사용
export ANTHROPIC_API_KEY="sk-ant-..."
aider --model claude-sonnet-4-5

# Ollama 로컬 모델 사용
aider --model ollama/codellama
```

### 첫 번째 세션

```bash
$ aider app.py utils.py

# 채팅에서:
> app.py의 로그인 함수에 입력 유효성 검사 추가해줘
> validate_email 함수에 대한 유닛 테스트 작성해줘
> 데이터베이스 연결을 컨텍스트 매니저로 리팩토링해줘
```

Aider가 파일을 편집하고, diff를 보여주고, 자동으로 커밋합니다.

---

## 주요 명령어

| 명령어 | 동작 |
|---|---|
| `/add <파일>` | 파일을 컨텍스트에 추가 |
| `/drop <파일>` | 파일을 컨텍스트에서 제거 |
| `/ls` | 컨텍스트의 파일 목록 보기 |
| `/diff` | 최근 변경 사항 보기 |
| `/undo` | 마지막 커밋 취소 |
| `/run <명령>` | 셸 명령 실행 |
| `/ask <질문>` | 파일 편집 없이 질문 |
| `/voice` | 음성 입력 모드 |

---

## 고급 기능

### 아키텍트 모드
복잡한 작업에는 아키텍트 모드를 사용하세요 — 한 모델이 계획을 세우고 다른 모델이 구현합니다:

```bash
aider --architect --model claude-opus-4-5 --editor-model claude-sonnet-4-5
```

### 리포지토리 맵
Aider는 전체 저장소의 맵을 구축해서 현재 세션에 없는 파일들 사이의 관계도 이해합니다.

```bash
aider --map-tokens 2048
```

### 린트 및 테스트 통합
```bash
# 변경 후 자동 린트
aider --lint --lint-cmd "flake8 {files}"

# 자동 테스트 실행
aider --test --test-cmd "pytest"
```

린트나 테스트가 실패하면 Aider가 자동으로 문제를 수정합니다.

---

## 실제 워크플로우 예시

```bash
# 피처 브랜치 생성
git checkout -b feature/user-auth

# 관련 파일로 Aider 시작
aider src/auth.py src/models/user.py tests/test_auth.py

# 기능 설명
> JWT 기반 인증 구현:
> 1. JWT 토큰을 반환하는 로그인 엔드포인트 추가
> 2. 토큰을 검증하는 미들웨어 추가
> 3. 두 기능에 대한 테스트 작성

# diff 검토
/diff

# 문제가 있으면 취소
/undo

# 테스트로 검증
/run pytest tests/test_auth.py -v
```

---

## Aider vs 다른 AI 코딩 도구 비교

| 도구 | 방식 | LLM 유연성 | Git 통합 | 비용 |
|---|---|---|---|---|
| **Aider** | 터미널/CLI | 모든 LLM | ✅ 자동 커밋 | 무료 (LLM 비용 별도) |
| GitHub Copilot | IDE 확장 | GitHub 모델 | 수동 | 월 $10-19 |
| Cursor | IDE (VSCode 포크) | GPT-4o, Claude | 수동 | 월 $20 |
| Windsurf | IDE (VSCode 포크) | 혼합 | 수동 | 월 $15 |
| Claude Code | 터미널/CLI | Claude 전용 | ✅ 자동 커밋 | 사용량 기반 |

Aider의 결정적 장점: **모델 유연성 + 자동 커밋 + 무료 도구**.

---

## 효과적인 사용 팁

1. **관련 파일만 추가** — 전체 프로젝트를 다 넣지 마세요. 작업당 3-5개 파일 권장.
2. **구체적으로 설명** — "코드 고쳐줘"보다 "fetch 함수의 네트워크 타임아웃에 오류 처리 추가해줘"가 훨씬 좋습니다.
3. **먼저 `/ask` 활용** — 복잡한 작업은 편집 전에 계획을 세우도록 질문하세요.
4. **diff 꼭 확인** — 다음으로 넘어가기 전에 변경 사항을 검토하세요.
5. **큰 기능엔 `--architect`** — 계획과 구현을 분리하세요.

---

## 비용 추정

Aider 자체는 무료입니다. LLM API 호출 비용만 지불하면 됩니다.

| 세션 유형 | 토큰 사용량 | 비용 (GPT-4o 기준) |
|---|---|---|
| 소규모 수정 | ~10K 토큰 | ~$0.03 |
| 기능 추가 | ~50K 토큰 | ~$0.15 |
| 대규모 리팩토링 | ~200K 토큰 | ~$0.60 |

Claude Sonnet(더 저렴)이나 DeepSeek을 사용하면 비용을 크게 줄일 수 있습니다.

---

## 총평

Aider는 2026년 **가장 유연한 AI 코딩 도구**입니다. UI가 화려하진 않지만, 터미널에서 생활하는 개발자에게는 타의 추종을 불허합니다. 어떤 LLM이든 지원하는 유연성, 자동 Git 커밋, 강력한 컨텍스트 윈도우의 조합은 생산성을 크게 높여줍니다.

**평점: 8.5/10**

- ✅ 로컬 모델 포함 100개 이상 LLM 지원
- ✅ 자동 Git 통합
- ✅ 무료 오픈소스
- ✅ 터미널이 있는 모든 시스템에서 동작
- ✅ 복잡한 작업을 위한 아키텍트 모드
- ⚠️ 터미널 전용 (GUI 없음)
- ⚠️ 초보자에겐 진입 장벽 있음
- ⚠️ 비용은 선택한 LLM에 따라 달라짐

> **추천 대상:** 최대의 제어권과 유연성을 원하고, 자신의 Git 워크플로우를 그대로 유지하고 싶은 전문 개발자.
