---
layout: subsite-post
title: "Aider: 터미널에서 AI 페어 프로그래밍 완벽 가이드 (2026)"
category: coding
lang: ko
header-img: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=1200&auto=format&fit=crop"
tags: [aider, ai 코딩, 터미널 ai, 페어 프로그래밍, 클로드, gpt-4, 오픈소스]
date: 2026-06-15 15:00:00
---

# Aider: 터미널에서 AI 페어 프로그래밍 완벽 가이드 (2026)

![터미널 코드 화면](https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800&auto=format&fit=crop)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

Cursor, Windsurf 같은 AI IDE가 주목받는 동안, 터미널에서는 조용한 혁명이 진행되고 있습니다. **Aider**는 오픈소스 AI 페어 프로그래밍 도구로, 커맨드라인에서 동작하고 Git과 직접 통합되며, Claude Sonnet, GPT-4o, Gemini 같은 강력한 모델로 프로젝트 전체의 코드를 수정할 수 있습니다 — 에디터를 바꿀 필요 없이.

## Aider란?

Aider는 어떤 LLM이든 유능한 코딩 파트너로 바꿔주는 CLI 도구입니다. 프로젝트 디렉토리에서 실행하고, 작업할 파일을 추가한 뒤 자연어로 AI와 대화해 변경사항을 만듭니다. Aider는:

- **파일을 직접 수정** — 복사-붙여넣기 불필요
- **의미 있는 Git 커밋 메시지와 함께 자동 커밋**
- **100개 이상의 LLM 지원** — Claude, GPT-4o, Gemini, Ollama 로컬 모델
- **리포지토리 맵으로 전체 코드베이스 이해**
- **어떤 에디터와도 호환** — VS Code, Neovim, Emacs 등
- **오픈소스 무료** — API 비용만 지불

## 개발자들이 Aider를 사랑하는 이유

### 1. Git 네이티브 워크플로우
Aider가 만드는 모든 변경사항은 명확한 메시지와 함께 커밋됩니다. AI 변경사항을 일반 커밋처럼 검토하고, 되돌리거나 cherry-pick 할 수 있습니다. 전용 IDE 없이도 완전한 제어권을 유지합니다.

### 2. 리포지토리 맵
Aider는 클래스, 함수, 관계를 이해하는 지능적인 코드베이스 맵을 구축합니다. AI가 고립된 파일 편집이 아닌 프로젝트 구조를 존중하는 변경을 수행합니다.

### 3. 모델 유연성
작업 복잡도에 따라 모델 전환:
- 복잡한 리팩토링 → **Claude Sonnet**
- 빠른 버그 수정 → **GPT-4o mini** (비용 절감)
- 완전 오프라인·프라이빗 코딩 → **로컬 Ollama 모델**

### 4. 음성 모드
`/voice`를 입력해 코딩 요청을 받아쓰게 할 수 있습니다. 손이 바쁘거나 말로 생각을 정리할 때 유용합니다.

## 시작하기

```bash
# 설치
pip install aider-chat

# API 키 설정 (Anthropic 예시)
export ANTHROPIC_API_KEY=your_key_here

# 프로젝트에서 Aider 시작
cd my-project
aider --model claude-sonnet-4-5

# 파일을 컨텍스트에 추가
/add src/app.py src/utils.py

# 코딩 시작!
> 로그인 함수에 입력 유효성 검사 추가해줘
```

![노트북으로 작업하는 개발자](https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop)
*Photo by [Christopher Gower](https://unsplash.com/@cgower) on Unsplash*

## 주요 명령어

| 명령어 | 설명 |
|---|---|
| `/add <파일>` | AI 컨텍스트에 파일 추가 |
| `/drop <파일>` | 컨텍스트에서 파일 제거 |
| `/git` | git 명령어 실행 |
| `/undo` | 마지막 커밋 되돌리기 |
| `/diff` | 변경사항 보기 |
| `/voice` | 음성 입력 활성화 |
| `/ask <질문>` | 변경 없이 질문만 하기 |
| `/architect` | 복잡한 작업용 2-모델 모드 |

## 아키텍트 모드: 두 모델의 협업

Aider의 **아키텍트 모드**는 두 개의 모델을 활용합니다:

1. **아키텍트 모델** (예: Claude Opus) — 변경사항 계획, 아키텍처 추론
2. **에디터 모델** (예: Claude Haiku) — 효율적으로 편집 실행

추론과 실행을 분리해, 하나의 강력한 모델을 사용하는 것보다 더 나은 결과를 낮은 비용으로 얻는 경우가 많습니다.

```bash
aider --architect --model claude-opus-4-5 --editor-model claude-haiku-3-5
```

## Aider vs. Cursor vs. GitHub Copilot

| 기능 | Aider | Cursor | GitHub Copilot |
|---|---|---|---|
| 터미널 기반 | ✅ | ❌ | ❌ |
| Git 통합 | ✅ 자동 커밋 | 수동 | 수동 |
| 모델 선택 | ✅ 모든 LLM | 제한적 | 제한적 |
| 리포지토리 맵 | ✅ | ✅ | 부분적 |
| 비용 | API만 | $20/월 + API | $10-19/월 |
| 오픈소스 | ✅ | ❌ | ❌ |
| IDE 필요 | ❌ | ✅ | ✅ |

## 요금

Aider 자체는 **무료 오픈소스**입니다. 선택한 모델의 API 비용만 지불하면 됩니다:

| 모델 | 코딩 세션당 예상 비용 |
|---|---|
| Claude Haiku | ~$0.02–0.10 |
| GPT-4o mini | ~$0.05–0.15 |
| Claude Sonnet | ~$0.20–1.00 |
| 로컬 (Ollama) | 무료 |

## 잘 쓰는 팁

1. **컨텍스트를 좁게 유지** — 작업에 관련된 파일만 추가; 컨텍스트가 짧을수록 빠르고 저렴하고 집중적인 응답
2. **먼저 `/ask` 사용** — 변경 전 접근 방식을 논의하면 편집 품질이 향상됨
3. **자주 커밋** — Aider가 자동 커밋하지만, `/commit`으로 수동 체크포인트 생성 가능
4. **린터와 함께 사용** — Aider 변경 후 린터/포매터로 코드 스타일 유지
5. **`.aider.conf.yml` 활용** — 프로젝트에 기본 모델, 에디터 설정, 비용 한도 지정

## 총평

Aider는 기존 워크플로우를 포기하지 않고 AI 코딩 도움을 원하는 개발자를 위한 선택입니다. 강력하고 유연하며 자율성을 존중합니다 — 자신의 에디터, 터미널, Git 히스토리 안에 있으면서. 커맨드라인이 편하고 AI 코딩 셋업을 최대한 제어하고 싶다면, 2026년 Aider를 능가하기 어렵습니다.

**평점: 9/10** — 탁월한 파워와 유연성; GUI 대안보다 학습 곡선이 가파름.
