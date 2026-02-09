---
layout: subsite-post
title: "Aider: 터미널에서 하는 AI 페어 프로그래밍"
category: coding
lang: ko
header-img: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800"
---

![AI와 페어 프로그래밍하는 개발자](https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800)
*Photo by [AltumCode](https://unsplash.com/@altumcode) on Unsplash*

## Aider란?

Aider는 터미널에서 실행되는 **오픈소스 AI 페어 프로그래밍 도구**입니다. IDE에 통합된 도구들과 달리, Aider는 git 저장소와 직접 작동하며, 변경사항을 만들고, 커밋을 생성하고, 진짜 페어 프로그래머처럼 협업합니다.

### 개발자들이 Aider를 사랑하는 이유

- **터미널 네이티브**: git이 있는 곳이면 어디서든 작동
- **Git 통합**: 모든 변경에 자동 커밋
- **멀티 모델**: GPT-4, Claude, 로컬 모델 지원
- **컨텍스트 인식**: 전체 코드베이스 이해
- **오픈소스**: 무료이고 커스터마이징 가능

## 주요 기능

### 1. 대화형 코딩

동료에게 말하듯 Aider와 대화하세요. 원하는 것을 설명하면 파일을 수정합니다:

```bash
$ aider app.py utils.py

> 데이터베이스 연결 함수에 에러 처리 추가해줘

Applied edit to app.py
Commit: Add try/except block with retry logic for database connections
```

### 2. 자동 Git 통합

모든 변경이 설명적인 메시지와 함께 깔끔한 커밋이 됩니다:

```bash
$ git log --oneline
a1b2c3d Add try/except block with retry logic for database connections
d4e5f6g Create user authentication middleware
g7h8i9j Initial project setup
```

### 3. 다중 파일 편집

Aider는 여러 파일에 걸친 복잡한 변경을 처리합니다:

```bash
> User 클래스를 dataclass로 리팩토링하고 모든 import 업데이트해줘

Applied edits to:
  - models/user.py
  - services/auth.py
  - tests/test_user.py
Commit: Refactor User to dataclass, update imports across project
```

![터미널 화면의 코드](https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800)
*Photo by [Clement Helardot](https://unsplash.com/@clemhlrdt) on Unsplash*

## 시작하기

### 설치

```bash
# pip 사용
pip install aider-chat

# 또는 pipx 사용 (권장)
pipx install aider-chat
```

### 설정

API 키 설정:

```bash
# OpenAI용
export OPENAI_API_KEY=your-key-here

# Anthropic Claude용
export ANTHROPIC_API_KEY=your-key-here
```

### 첫 세션

```bash
# 프로젝트로 이동
cd my-project

# 특정 파일로 aider 시작
aider src/main.py src/utils.py

# 또는 aider가 관련 파일 알아서 찾게
aider
```

## Aider 명령어

Aider 세션 내에서:

| 명령어 | 동작 |
|--------|------|
| `/add file.py` | 컨텍스트에 파일 추가 |
| `/drop file.py` | 컨텍스트에서 파일 제거 |
| `/clear` | 대화 기록 초기화 |
| `/diff` | 대기 중인 변경사항 보기 |
| `/undo` | 마지막 커밋 취소 |
| `/run command` | 셸 명령 실행 |
| `/help` | 모든 명령어 보기 |

## 모델 선택

Aider는 여러 AI 모델과 작동합니다:

```bash
# GPT-4 사용 (기본)
aider

# Claude 3.5 Sonnet 사용
aider --model claude-3-5-sonnet-20241022

# Ollama를 통한 로컬 모델 사용
aider --model ollama/codellama

# DeepSeek 사용
aider --model deepseek/deepseek-coder
```

## 고급 사용법

### 1. 아키텍트 모드

코딩 전 계획을 위해:

```bash
aider --architect
```

Aider가 먼저 계획을 제안하고, 승인 후 구현합니다.

### 2. 워치 모드

파일 변경에 자동 응답:

```bash
aider --watch
```

### 3. 음성 모드

음성으로 코딩:

```bash
aider --voice
```

### 4. 저장소 맵

더 나은 컨텍스트를 위해 코드베이스 맵 생성:

```bash
aider --map-tokens 2048
```

## Aider vs 다른 AI 코딩 도구

| 기능 | Aider | Cursor | Copilot |
|------|-------|--------|---------|
| **인터페이스** | 터미널 | IDE | IDE 플러그인 |
| **Git 통합** | ✅ 네이티브 | ❌ | ❌ |
| **멀티 모델** | ✅ | ✅ | ❌ |
| **오픈소스** | ✅ | ❌ | ❌ |
| **가격** | 무료* | $20/월 | $10/월 |
| **로컬 모델** | ✅ | ❌ | ❌ |

*API 비용 별도

## 베스트 프랙티스

### 1. 작게 시작하기

전체 코드베이스보다 특정 파일로 시작:

```bash
# 좋음: 집중된 컨텍스트
aider src/auth/login.py src/auth/utils.py

# 부담: 너무 많은 컨텍스트
aider $(find . -name "*.py")
```

### 2. 명확한 프롬프트 작성

```bash
# 모호함
> 버그 고쳐줘

# 명확함
> parse_user_data()에서 input이 None일 때 TypeError 수정해줘 - 빈 dict 반환하도록
```

### 3. 커밋 전 리뷰

`/diff`로 커밋 전 변경사항 검토:

```bash
> 입력 유효성 검사 추가해줘

/diff   # 제안된 변경사항 검토
/undo   # 필요시 되돌리기
```

### 4. .aiderignore 사용

Aider가 건드리지 않을 파일 제외:

```
# .aiderignore
*.env
secrets/
generated/
```

## 실제 워크플로우

```bash
# 1. 피처 브랜치에서 Aider 시작
git checkout -b feature/user-dashboard
aider src/dashboard/*.py

# 2. 피처 설명
> 다음을 보여주는 사용자 대시보드 컴포넌트 만들어줘:
> - 최근 활동 (마지막 10개)
> - 프로필 요약
> - 빠른 액션 버튼

# 3. 구현 반복
> 활동 목록을 페이지당 5개로 페이지네이션 해줘

# 4. 테스트 추가
> 대시보드 컴포넌트용 pytest 테스트 작성해줘

# 5. 리뷰하고 푸시
git push origin feature/user-dashboard
```

## 한계점

- API 키 필요 (클라우드 모델은 비용 발생)
- 큰 코드베이스는 신중한 파일 선택 필요
- Copilot 제안처럼 실시간이 아님
- 터미널 중심 워크플로우에 학습 곡선

## 결론

Aider는 **터미널에서 사는 개발자를 위한 최고의 옵션**입니다. 네이티브 git 통합으로 모든 AI 제안이 깔끔하고 되돌릴 수 있는 커밋이 됩니다. 멀티 모델 지원과 오픈소스 유연성을 결합하면, IDE에 종속된 도구들의 강력한 대안입니다.

### Aider를 사용해야 할 사람

✅ 터미널 우선 개발자
✅ Vim/Neovim/Emacs 사용자
✅ Git으로 추적되는 AI 변경을 원하는 팀
✅ 다양한 AI 모델을 테스트하는 개발자
✅ 오픈소스 애호가

## 리소스

- [공식 웹사이트](https://aider.chat)
- [GitHub 저장소](https://github.com/paul-gauthier/aider)
- [문서](https://aider.chat/docs)
- [Discord 커뮤니티](https://discord.gg/aider)

---

*개발자가 실제로 일하는 방식으로 AI와 페어 프로그래밍하세요 - 터미널에서, git과 함께, 당신의 방식으로.*
