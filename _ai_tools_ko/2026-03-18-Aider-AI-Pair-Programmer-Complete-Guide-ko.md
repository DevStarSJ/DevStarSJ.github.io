---
layout: subsite-post
title: "Aider: 터미널에서 만나는 AI 페어 프로그래머 완벽 가이드"
subtitle: "모든 LLM을 지원하는 터미널 기반 AI 코딩 도구"
date: 2026-03-18 15:00:00
author: "AI Tools Guide"
header-img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80"
category: coding
lang: ko
tags: [Aider, AI 코딩, 터미널, 페어 프로그래밍, 오픈소스]
---

# Aider: 터미널에서 만나는 AI 페어 프로그래머 완벽 가이드

브라우저 기반 AI 편집기는 잊으세요. Aider는 AI 페어 프로그래밍을 터미널로 직접 가져와 기존 편집기, 코드베이스, Git 워크플로와 완벽하게 통합됩니다. 2026년 AI 지원 개발을 위한 파워 유저의 선택입니다.

![터미널 코딩 환경](https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=900&auto=format&fit=crop&q=80)
*Photo by [Ilya Pavlov](https://unsplash.com/@ilyapavlov) on Unsplash*

---

## Aider란 무엇인가?

Aider는 대형 언어 모델과 대화하며 로컬 저장소의 코드를 편집할 수 있는 오픈소스 CLI 도구입니다. Cursor나 Windsurf와 달리 편집기를 대체하지 않고, 실제 파일을 변경하면서 IDE에서 검토할 수 있게 해줍니다.

**개발자들이 좋아하는 이유:**
- **모든 LLM 지원**: GPT-4o, Claude 3.7, DeepSeek R2, 로컬 Ollama 모델
- **Git 네이티브**: 모든 변경사항이 설명적인 메시지와 함께 자동 커밋
- **전체 코드베이스 인식**: 컨텍스트를 위한 전체 저장소 구조 매핑
- **모든 편집기**: VSCode, Vim, Emacs, JetBrains — Aider는 상관하지 않음
- **100% 로컬 파일**: 클라우드 동기화 없음, 독점 형식 없음

---

## 설치 및 설정

### pip으로 설치
```bash
pip install aider-chat
```

### LLM 설정
```bash
# Claude 3.7 사용 (권장)
export ANTHROPIC_API_KEY=your_key
aider --model claude-3-7-sonnet-20250219

# GPT-4o 사용
export OPENAI_API_KEY=your_key
aider --model gpt-4o

# DeepSeek R2 사용 (가장 저렴)
export DEEPSEEK_API_KEY=your_key
aider --model deepseek/deepseek-reasoner

# 로컬 Ollama 모델 사용 (무료, 프라이빗)
aider --model ollama/codellama:34b
```

### 세션 시작
```bash
cd your-project/
aider app.py utils.py  # 특정 파일 추가
# 또는
aider --map-tokens 4096  # 전체 저장소 매핑
```

---

## 핵심 기능

### 🗂️ 저장소 맵
Aider는 **tree-sitter 기반 맵**으로 전체 코드베이스를 구성합니다. 클래스, 함수, 임포트, 관계를 파악해 모든 파일을 수동으로 추가하지 않아도 프로젝트 구조를 이해합니다.

### 🔄 Git 자동 커밋
Aider가 만드는 모든 변경사항이 자동으로 커밋됩니다:
```
aider: Add input validation to user registration endpoint
```

변경사항 검토, 메시지 수정, 즉시 되돌리기:
```bash
/undo  # 마지막 AI 변경 취소
```

### 🧪 자동화 테스트 루프
각 변경 후 테스트 스위트를 실행하고 테스트가 통과할 때까지 반복:
```bash
aider --test-cmd "pytest tests/" --auto-test
```

실패하는 테스트 작성 → Aider 코드 작성 → 테스트 통과 → 커밋의 빠른 피드백 루프!

### 🌐 웹 컨텍스트
```bash
/web https://docs.fastapi.tiangolo.com/tutorial/body/
```
Aider가 문서를 가져와 컨텍스트에 직접 통합합니다.

---

## Aider vs Cursor vs Windsurf 비교

| 기능 | Aider | Cursor | Windsurf |
|---|---|---|---|
| 편집기 | 모든 편집기 | 내장 (VSCode 포크) | 내장 (VSCode 포크) |
| LLM 유연성 | ✅ 모든 LLM | 제한적 | 제한적 |
| Git 통합 | ✅ 자동 커밋 | 수동 | 수동 |
| 가격 | 무료 + API 비용 | $20/월 | $15/월 |
| 로컬/오프라인 | ✅ Ollama | ❌ | ❌ |
| 코드베이스 인식 | ✅ 저장소 맵 | ✅ | ✅ |
| GUI | ❌ 터미널만 | ✅ 전체 IDE | ✅ 전체 IDE |

**Aider가 유리한 경우:** LLM 유연성 극대화, Git 네이티브 워크플로, 구독료 없음 원할 때.
**Cursor/Windsurf가 유리한 경우:** 자동완성 포함 세련된 IDE 경험 원할 때.

---

## 실전 워크플로

### 워크플로 1: 기능 개발
```bash
aider src/api/users.py src/models/user.py tests/test_users.py

> 사용자 등록 플로우에 이메일 인증을 추가해.
> 가입 시 인증 이메일을 보내고 인증 전까지 로그인을 차단해.
```

### 워크플로 2: 스택 트레이스로 버그 수정
```bash
aider app.py

> 이 오류가 발생해:
> TypeError: 'NoneType' object is not subscriptable at line 47 in get_user_profile
> 스택 트레이스: [트레이스 붙여넣기]
> 수정해줘.
```

### 워크플로 3: 리팩토링
```bash
aider --map-tokens 8192  # 전체 저장소 컨텍스트 제공

> 서비스 레이어의 모든 데이터베이스 호출을 
> 저장소 패턴을 사용하도록 리팩토링해. repositories/ 디렉토리를 새로 만들어.
```

### 워크플로 4: 테스트 생성
```bash
aider src/payment.py tests/test_payment.py

> payment.py 모듈에 대한 포괄적인 pytest 테스트를 작성해.
> 실패한 결제, 환불, 통화 변환에 대한 엣지 케이스를 포함해.
```

---

## 고급 설정

### `.aider.conf.yml` (프로젝트 레벨 설정)
```yaml
model: claude-3-7-sonnet-20250219
map-tokens: 4096
auto-commits: true
test-cmd: pytest
dirty-commits: false
```

### 멀티 모델 설정
```bash
aider --model claude-3-7-sonnet-20250219 \
      --weak-model claude-3-5-haiku-20241022
```
"약한 모델"은 커밋 메시지, 요약 등 더 간단한 작업을 처리해 비용 절감.

---

## 팁 & 모범 사례

**1. 범위를 명확하게 지정하기**
```
# 모호함 (나쁨):
> 인증 수정해

# 구체적 (좋음):
> auth/middleware.py의 JWT 토큰 만료 확인 수정해 — 
> 토큰이 만료됐을 때 401을 반환하지 않고 조용히 실패하는 문제야
```

**2. `/add`와 `/drop`으로 컨텍스트 관리**
```bash
/add src/new_feature.py  # 파일을 컨텍스트에 추가
/drop src/old_legacy.py  # 관련 없는 파일 제거
/files                    # 컨텍스트 내용 확인
```

**3. 편집 없이 탐색에는 `/ask` 활용**
```bash
/ask 사용자 인증이 확인되는 모든 위치는 어디야?
```

---

## 비용 추정

Claude 3.7 Sonnet (~$3/M 토큰)으로:
- 간단한 버그 수정: ~$0.01–0.05
- 새 기능 (중간 규모): ~$0.10–0.50
- 대규모 리팩토링: ~$1–5

DeepSeek R2 (~$0.14/M 토큰)으로:
- 같은 작업을 약 20배 저렴하게

---

## 결론

Aider는 특정 편집기나 AI 제공업체에 종속되지 않고 **제어, 유연성, Git 통합**을 원하는 개발자를 위한 최고의 AI 코딩 도구입니다. Cursor보다 학습 곡선이 가파르지만, 기존 개발 설정에 완벽하게 맞는 워크플로를 제공합니다.

**평점: 9/10** — 터미널 네이티브 개발자에게 필수.

---

## 빠른 시작 체크리스트

- [ ] `pip install aider-chat`
- [ ] LLM API 키 설정
- [ ] 프로젝트 디렉토리에서 `aider` 실행
- [ ] 무료 로컬 코딩을 위해 `aider --model ollama/llama3` 시도
- [ ] 프로젝트 레벨 기본값을 위한 `.aider.conf.yml` 생성

---

*태그: #Aider #AI코딩 #터미널도구 #페어프로그래밍 #오픈소스*
