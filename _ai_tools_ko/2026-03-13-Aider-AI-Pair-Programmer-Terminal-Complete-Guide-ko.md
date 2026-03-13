---
layout: subsite-post
title: "Aider 완벽 가이드: 터미널 기반 오픈소스 AI 페어 프로그래머"
date: 2026-03-13 15:00:00
category: coding
tags: [aider, ai코딩, 페어프로그래밍, 오픈소스, 터미널, llm]
header-img: https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop
lang: ko
---

# Aider 완벽 가이드: 터미널 기반 오픈소스 AI 페어 프로그래머

화려한 AI 코딩 IDE들이 헤드라인을 장식하는 동안, **Aider**는 기존 워크플로우를 선호하는 전문 개발자들의 비밀 무기로 조용히 자리잡았습니다. 로컬 파일과 Git 저장소에서 직접 동작하는 커맨드라인 AI 코딩 어시스턴트로 — 클라우드 동기화도, 독점 IDE도, 벤더 종속성도 없습니다.

![터미널에서 코딩하는 개발자](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop)
*Photo by Lukas on Unsplash*

---

## Aider란 무엇인가?

Aider는 **오픈소스 터미널 기반 AI 코딩 어시스턴트**로, 강력한 언어 모델(Claude, GPT-4o, Gemini, 로컬 모델)에 연결하여 기존 프로젝트에서 코드를 작성, 편집, 리팩터링, 디버깅하도록 도와줍니다. 로컬 파일시스템에서 동작하고, Git으로 변경사항을 추적하며, 이미 사용 중인 어떤 에디터나 IDE와도 함께 작동합니다.

**주요 지표:**
- ⭐ GitHub 스타 25,000+
- 🆓 완전 무료 오픈소스 (Apache 2.0)
- 🤖 100+ LLM 지원 (OpenAI, Anthropic, Gemini, Ollama 등)
- 🐙 네이티브 Git 통합
- 💻 모든 언어, 모든 프로젝트에서 동작

---

## 개발자들이 Aider를 사랑하는 이유

### 기존 워크플로우와 함께 동작
Aider는 에디터 전환을 강요하지 않습니다. VS Code, Neovim, Emacs 등 무엇이든 사용하세요. Aider는 에디터 옆에서 터미널로 실행됩니다 — 요청하면 파일을 수정하고 diff를 보여주며 수락 여부를 결정하게 합니다.

### Git 우선 접근 방식
Aider가 만드는 모든 변경사항은 의미 있는 커밋 메시지와 함께 Git에 커밋됩니다. 이는 다음을 의미합니다:
- `git revert`로 쉬운 롤백
- AI 지원 변경사항의 전체 이력
- 원활한 코드 리뷰
- "마법의 블랙박스" 없음 — 모든 변경이 투명

### 진정한 멀티파일 편집
Aider는 현재 보고 있는 파일만 편집하는 것이 아닙니다. **전체 코드베이스**를 이해하여 컴포넌트 간 조정이 필요한 변경 시 여러 파일을 동시에 편집할 수 있습니다.

### 모델 유연성
당신이 두뇌를 선택합니다. 최상의 결과를 위해 Claude 3.7 Sonnet을 사용하거나, 비용 효율성을 위해 GPT-4o를, 또는 완전한 프라이버시를 위해 Ollama를 통한 로컬 모델을 실행하세요.

---

## 설치 및 설정

### 빠른 설치
```bash
pip install aider-chat
```

또는 uv 사용 (격리를 위해 권장):
```bash
uv tool install aider-chat
```

### API 키 설정
```bash
# Anthropic Claude용 (권장)
export ANTHROPIC_API_KEY=your_key_here

# OpenAI용
export OPENAI_API_KEY=your_key_here

# 또는 ~/.aider.conf.yml에 추가
```

### 프로젝트에서 Aider 시작
```bash
cd your-project
aider
```

끝입니다. Aider가 자동으로 저장소를 매핑하고 도움 준비를 합니다.

---

## 핵심 명령어

### 컨텍스트에 파일 추가
```bash
# 시작 시 파일 추가
aider src/main.py src/utils.py

# 세션 중 파일 추가
/add src/new_feature.py

# 패턴으로 파일 추가
/add src/**/*.py
```

### 주요 세션 내 명령어

| 명령어 | 설명 |
|--------|------|
| `/add <파일>` | AI 컨텍스트에 파일 추가 |
| `/drop <파일>` | 컨텍스트에서 파일 제거 |
| `/undo` | 마지막 AI 커밋 취소 |
| `/diff` | 마지막 변경 diff 표시 |
| `/git <명령>` | 임의 git 명령 실행 |
| `/run <명령>` | 셸 명령 실행, 출력을 AI와 공유 |
| `/voice` | 음성 입력 사용 (마이크 필요) |
| `/ask <질문>` | 변경 없이 질문 |
| `/help` | 모든 명령어 표시 |

---

## 실제 사용 예시

### 코드 리팩터링
```
> 인증 모듈을 세션 쿠키 대신 JWT 토큰을 사용하도록 리팩터링해주세요.
  관련된 모든 테스트도 업데이트해주세요.
```
Aider가 `auth.py`, `tests/test_auth.py` 및 관련 파일들을 분석하고 모든 파일에서 조율된 변경사항을 만듭니다.

### 버그 수정
```
> 사용자 ID가 존재하지 않을 때 API가 500 오류를 반환합니다.
  404 응답으로 적절한 에러 처리를 추가해주세요.
```
Aider가 스택 트레이스를 읽고 (직접 붙여넣기 가능), 원인을 파악하고, 문제를 수정합니다.

### 테스트 작성
```
> UserService 클래스에 대한 포괄적인 pytest 테스트를 작성해주세요.
  엣지 케이스를 포함하고 데이터베이스 호출을 모킹해주세요.
```

### 코드 설명
```
/ask process_payment 함수가 무엇을 하는지, 
     잠재적인 실패 지점은 무엇인지 설명해주세요.
```
(`/ask` 사용 시 변경 없이 설명합니다.)

---

## Aider 모드

### 기본 모드
표준 대화형 채팅. 원하는 것을 설명하면 Aider가 실행합니다.

### 아키텍트 모드 (`--architect`)
두 모델 접근 방식: "아키텍트" 모델(예: o1)이 변경을 계획하고, "에디터" 모델(예: Claude Sonnet)이 구현합니다.

```bash
aider --architect --model o1 --editor-model claude-sonnet-4-5
```

### 자동 커밋 모드
Aider가 묻지 않고 각 변경사항을 자동으로 커밋:
```bash
aider --auto-commits
```

### 감시 모드 (`--watch-files`)
Aider가 코드의 AI 주석을 감시하고 처리:
```python
# ai: 리스트 컴프리헨션을 사용하도록 리팩터링해주세요
result = []
for item in items:
    result.append(transform(item))
```
Aider가 주석을 보고 자동으로 리팩터링합니다.

---

## 지원 모델

| 모델 | 최적 용도 | 비용 |
|------|----------|------|
| **Claude 3.7 Sonnet** | 전반적으로 최상 품질 | ~$3/M 토큰 |
| **GPT-4o** | 좋은 균형 | ~$2.50/M 토큰 |
| **o3-mini** | 복잡한 추론 | ~$1.10/M 토큰 |
| **Gemini 2.0 Flash** | 속도 + 비용 | ~$0.10/M 토큰 |
| **Ollama (로컬)** | 프라이버시, 무비용 | 무료 |

### 로컬 모델 사용 (Ollama)
```bash
# Ollama 설치 및 실행
ollama pull qwen2.5-coder:32b

# Aider와 함께 사용
aider --model ollama/qwen2.5-coder:32b
```

---

## Aider vs. 다른 AI 코딩 도구 비교

| 기능 | Aider | Cursor | GitHub Copilot | Cline |
|------|-------|--------|---------------|-------|
| 오픈소스 | ✅ | ❌ | ❌ | ✅ |
| 모든 에디터 지원 | ✅ | ❌ | ✅ | ❌ |
| 로컬 모델 지원 | ✅ | 제한적 | ❌ | ✅ |
| Git 통합 | ✅ 네이티브 | 수동 | 수동 | 수동 |
| 멀티파일 편집 | ✅ | ✅ | 제한적 | ✅ |
| 가격 | 무료 | $20/월 | $10-19/월 | 무료 |

---

## 최적의 결과를 위한 팁

### `.aider.conf.yml` 설정
```yaml
# ~/.aider.conf.yml
model: claude-sonnet-4-5-20251101
auto-commits: true
dark-mode: true
```

### `.aiderignore` 사용
Aider가 건드리지 않았으면 하는 파일 제외:
```
node_modules/
*.env
secrets/
```

### `CONVENTIONS.md` 작성
프로젝트 규칙을 Aider에게 알려주세요:
```markdown
# 코드 규칙
- TypeScript 엄격 모드 사용
- 모든 함수에 JSDoc 주석 필수
- Promise보다 async/await 선호
- 테스트 파일은 tests/ 디렉터리에
```
추가 방법: `aider --read CONVENTIONS.md`

---

## 총평

**평점: ⭐⭐⭐⭐⭐ (5/5)**

Aider는 자신이 무엇을 하는지 아는 개발자를 위한 AI 코딩 어시스턴트입니다. 강력하고, 투명하고, 유연하며, 기존 워크플로우를 존중합니다. Git 우선 접근 방식은 항상 제어권을 유지하게 하고, 오픈소스 모델은 벤더 종속성이 없음을 보장합니다.

AI 도구가 IDE를 대체하려는 것에 지쳤다면, Aider는 신선한 바람입니다.

**추천 대상:** 백엔드 개발자, 오픈소스 기여자, DevOps 엔지니어, 터미널에서 살아가는 모든 분

**시작하기:** `pip install aider-chat` 후 [aider.chat](https://aider.chat) 확인

---

*Aider를 워크플로우에 사용하고 계신가요? 어떤 모델 조합을 선호하시나요? 댓글로 공유해주세요!*
