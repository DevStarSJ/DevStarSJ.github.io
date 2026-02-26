---
layout: subsite-post
title: "Aider: 터미널에서 살아 숨쉬는 AI 페어 프로그래머"
category: coding
lang: ko
header-img: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=1200"
tags: [에이더, ai 코딩, 터미널, 페어 프로그래밍, claude, gpt-4]
---

# Aider: 터미널에서 살아 숨쉬는 AI 페어 프로그래머

![터미널 코딩](https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

모든 개발자가 IDE 안에서 AI 코딩 어시스턴트를 써봤을 겁니다. 하지만 AI 페어 프로그래머가 **커맨드라인**에서 코드베이스 전체를 인식하고, git 통합과 함께 최고의 프론티어 모델을 지원한다면 어떨까요? 그게 바로 **Aider**가 하는 일이고, 터미널을 선호하는 개발자들 사이에서 가장 강력한 코딩 도구 중 하나로 자리잡았습니다.

## Aider란?

Aider는 터미널에서 실행되는 오픈소스 AI 페어 프로그래밍 도구입니다. AI 모델(Claude, GPT-4, Gemini, Ollama를 통한 로컬 모델)에 연결하여 코드에 대한 대화를 나누고 — 파일 편집, 테스트 실행, 자동 커밋까지 수행합니다.

**주요 기능:**
- **전체 코드베이스**를 컨텍스트로 활용
- 모든 AI 변경사항 자동 **git 커밋**
- **Claude Sonnet/Opus**, GPT-4o, Gemini 2.0, 로컬 모델 지원
- **다중 파일 편집** — 수십 개 파일에 걸친 리팩토링
- **린터/테스트 통합** — 자동으로 실패 수정
- **음성 입력** 지원
- 완전한 **오픈소스** (Apache 2.0)

## Aider vs Cursor/Copilot

| 측면 | Aider | Cursor | GitHub Copilot |
|------|-------|--------|----------------|
| 인터페이스 | 터미널 | IDE (VS Code 포크) | IDE 플러그인 |
| 모델 선택 | 어떤 모델이든 | 제한적 | OpenAI만 |
| Git 통합 | 내장 자동 커밋 | 수동 | 수동 |
| 비용 | API 비용만 | $20/월 | $10/월 |
| 컨텍스트 윈도우 | 전체 레포 맵 | 활성 파일 | 활성 파일 |
| 오픈소스 | ✅ | ❌ | ❌ |
| 오프라인/로컬 모델 | ✅ (Ollama) | ✅ | ❌ |

Aider의 핵심 강점: **모델 유연성과 git 워크플로우 자동화**.

## 설치

```bash
# pip로 설치 (Python 3.10+)
pip install aider-chat

# pipx로 설치 (권장 — 격리된 환경)
pipx install aider-chat

# 버전 확인
aider --version
```

## 설정

API 키 설정:

```bash
# ~/.bashrc 또는 ~/.zshrc에 추가
export ANTHROPIC_API_KEY=your_key_here
export OPENAI_API_KEY=your_key_here

# 또는 ~/.aider.conf.yml 생성
model: claude-sonnet-4-5
auto-commits: true
dark-mode: true
```

## 첫 세션

프로젝트 폴더로 이동하여 실행:

```bash
cd my-project
aider                     # 기본 모델 사용 (Claude Sonnet)
aider --model gpt-4o     # 모델 지정
aider src/main.py app.py  # 특정 파일을 컨텍스트로 열기
```

다음과 같이 표시됩니다:
```
Aider v0.55.0
Model: claude-sonnet-4-5
Git repo: .git
Repo-map: using 4096 tokens
Added src/main.py to the chat.

> █
```

## 핵심 명령어

### 채팅 내 명령어

```
/add <파일>      - 컨텍스트에 파일 추가
/drop <파일>     - 컨텍스트에서 파일 제거
/ls              - 컨텍스트 내 파일 목록 보기
/diff            - 최근 git diff 보기
/undo            - 마지막 커밋 취소
/run <명령어>    - 쉘 명령어 실행
/ask <질문>      - 변경 없이 질문하기
/model <이름>    - 세션 중 AI 모델 전환
/voice           - 음성 입력 토글
/exit            - Aider 종료
```

### Aider 실전 — 프롬프트 예시

**기능 추가:**
```
> FastAPI 앱에 JWT 토큰을 사용한 사용자 인증을 추가해줘.
  로그인, 로그아웃, 보호된 /me 엔드포인트를 포함해줘.
```

**리팩토링:**
```
> database.py 모듈을 async SQLAlchemy를 사용하도록 리팩토링해줘.
  기존 테스트는 모두 통과해야 해.
```

**버그 수정:**
```
> test_api.py의 테스트들이 response 스키마 변경 때문에 실패하고 있어.
  현재 스키마에 맞게 테스트를 업데이트해줘.
```

**설명 및 개선:**
```
> /ask process_payment 함수가 뭘 하는 건지, 
  왜 동기 락을 사용하는 건지 설명해줘?
```

![코드 화면](https://images.unsplash.com/photo-1537884944318-390069bb8665?w=800)
*Photo by [Safar Safarov](https://unsplash.com/@codestorm) on Unsplash*

## 레포 맵 기능

Aider의 가장 강력한 기능 중 하나는 **레포 맵** — 모델의 컨텍스트 윈도우에 맞도록 전체 코드베이스 구조를 압축 표현한 것입니다.

Aider가 분석하는 것들:
- 모든 파일의 함수 및 클래스 시그니처
- 임포트 관계 및 모듈 구조
- 파일 계층 및 명명 패턴

이를 통해 AI는 몇 개의 파일만 활성 컨텍스트에 있어도 프로젝트 아키텍처를 이해할 수 있습니다:

```
> routes/users.py의 기존 엔드포인트와 동일한 패턴으로 
  새 API 엔드포인트를 추가해줘
```

Aider는 레포 맵을 검토하고 패턴을 파악한 뒤 올바르게 적용합니다 — 모든 파일을 다 읽지 않아도요.

## Git 통합

Aider가 만드는 모든 변경사항은 설명적인 메시지와 함께 자동으로 커밋됩니다:

```bash
$ git log --oneline
a8f3c21 feat: JWT 인증에 로그인/로그아웃 엔드포인트 추가
3d912b4 refactor: database.py를 async SQLAlchemy로 변환
8e1f0ab fix: 새 response 스키마에 맞게 테스트 어서션 업데이트
```

장점:
- **완전한 감사 추적** — AI가 무엇을 변경했는지 정확히 확인
- `/undo` 또는 `git revert`로 **쉬운 롤백**
- 코드 리뷰를 위한 **깔끔한 커밋 히스토리**
- 기존 git 워크플로우와 완벽하게 연동

## 지원 모델 및 성능

Aider는 실제 코딩 작업으로 모델을 벤치마크합니다. 현재 상위 모델:

| 모델 | SWE-bench 점수 | 최적 활용 |
|------|--------------|---------|
| Claude Opus 4 | ~55% | 복잡한 아키텍처 작업 |
| Claude Sonnet 4.5 | ~47% | 일상 개발 (최고 가성비) |
| GPT-4o | ~40% | 좋은 올라운더 |
| Gemini 2.0 Pro | ~38% | 긴 컨텍스트 작업 |
| Mistral Large 2 | ~33% | 예산 절약 옵션 |
| Llama 3.1 70B (로컬) | ~25% | 보안이 중요한 코드 |

**대부분의 개발자에게 권장 설정:**
```bash
aider --model claude-sonnet-4-5
```

## 고급 워크플로우

### 자동화된 테스트 주도 개발

```bash
# 테스트 파일로 시작
aider tests/test_new_feature.py

# Aider에게 테스트를 통과하는 코드 작성 요청
> src/feature.py에 test_new_feature.py의 
  모든 테스트를 통과하는 구현을 작성해줘
```

Aider는 반복적으로 코드를 작성하고 테스트를 실행하며 모든 테스트가 통과할 때까지 수정합니다.

### 다중 파일 리팩토링

```bash
aider --model claude-opus-4 \
  src/models/ src/services/ src/api/ tests/

> 'User' 모델을 모든 곳에서 'Account'로 이름 변경해줘.
  모든 임포트, 참조, 데이터베이스 마이그레이션을 업데이트해줘.
```

### 코드 리뷰 모드

```bash
# /ask로 변경 없이 리뷰 받기
> /ask 이 인증 플로우에서 보안 취약점을 리뷰해줘
> /ask 이 데이터베이스 쿼리의 성능 영향은?
> /ask 이 코드가 Python 모범 사례를 따르고 있나요?
```

### CI/CD 통합

Aider를 스크립트에서 비대화형으로 실행:

```bash
aider --yes --message "src/ 내 모든 린팅 오류 수정" \
      --model claude-sonnet-4-5 \
      src/*.py
```

## 비용 예상

Aider는 AI 모델 API를 직접 사용하여 소비한 토큰만 지불합니다:

| 작업 | 예상 비용 |
|------|---------|
| 단일 파일 편집 | $0.01 - $0.05 |
| 다중 파일 리팩토링 | $0.10 - $0.50 |
| 전체 기능 구현 | $0.50 - $2.00 |
| 일일 개발자 사용 | $5 - $20/월 |

비교: 모델 제한이 있는 Cursor Pro ($20/월) 또는 GitHub Copilot ($10/월).

## Aider 효과적으로 사용하는 팁

1. **범위를 명확하게 지정**: 의도치 않은 변경을 피하려면 파일과 함수를 정확히 언급
2. **`/ask` 적극 활용**: 변경을 커밋하기 전에 설명 요청
3. **작게 시작**: 다중 파일 리팩토링 전에 단일 파일 작업으로 자신감 쌓기
4. **diff 검토**: 계속 진행하기 전에 항상 `/diff` 확인
5. **`.aiderignore`**: 이 파일 생성 (`.gitignore`처럼)으로 컨텍스트에서 제외할 파일 설정
6. **음성 입력 사용**: `aider --voice`로 핸즈프리 코딩 세션

## 최종 평가

Aider는 **강력함, 유연성, 투명성**을 원하는 개발자를 위한 AI 코딩 도구입니다. 터미널 우선 접근 방식, 자동 git 커밋, 전체 레포 컨텍스트, 어떤 프론티어 모델이든 지원하는 기능이 독보적인 능력을 만들어냅니다. 클릭형 IDE 도구보다 학습 곡선이 약간 높지만, 특히 복잡한 다중 파일 리팩토링 작업에서 엄청난 보상을 얻습니다.

**Aider 추천 대상:**
- 터미널에 익숙한 숙련된 개발자
- AI 변경사항을 git으로 자동 추적하고 싶은 팀
- IDE에 종속되지 않고 Claude/GPT-4/Gemini를 사용하려는 개발자
- 레포 전체 변경이 필요한 대규모 코드베이스 작업자

**평점: 4.5 / 5** ⭐⭐⭐⭐½

---

*시작하기: `pip install aider-chat` 설치 후 [aider.chat](https://aider.chat)에서 전체 문서 확인.*
