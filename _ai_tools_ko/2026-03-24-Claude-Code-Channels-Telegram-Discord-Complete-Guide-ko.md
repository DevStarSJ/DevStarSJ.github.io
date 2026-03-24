---
layout: subsite-post
title: "Claude Code 채널: 텔레그램과 디스코드로 AI 에이전트 원격 제어하기"
description: "Claude Code Channels 완전 가이드 — 텔레그램·디스코드에서 실행 중인 Claude Code 세션으로 메시지를 푸시하는 방법, 설정 절차, 활용 사례, 보안 설명."
date: 2026-03-24 14:00:00
category: coding
lang: ko
tags: [claude-code, channels, telegram, discord, mcp, anthropic, ai-agent]
header-img: https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&auto=format&fit=crop&q=80
---

# Claude Code 채널: 텔레그램과 디스코드로 AI 에이전트 원격 제어하기

Claude Code로 긴 코딩 세션을 시작하고 자리를 비워도, 스마트폰으로 완전히 제어할 수 있다면? 그게 바로 **Claude Code Channels**의 핵심입니다. 실행 중인 Claude Code 세션에 텔레그램, 디스코드, 또는 커스텀 플랫폼에서 메시지를 푸시할 수 있는 리서치 프리뷰 기능입니다.

![Claude Code Channels](https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=900&auto=format&fit=crop&q=80)
*Photo by [Alexander Shatov](https://unsplash.com/@alexbemore) on Unsplash*

---

## Claude Code Channels란?

**채널(Channel)**은 이미 실행 중인 Claude Code 세션으로 이벤트를 푸시하는 MCP 서버입니다. 다른 원격 접근 방식과 근본적으로 다릅니다:

- **새 세션이 아님**: Claude가 기존 파일 컨텍스트와 대화 히스토리를 유지합니다
- **푸시 기반**: 폴링 스케줄 없이 메시지를 보내는 즉시 도달합니다
- **양방향**: Claude가 메시지를 읽고, 내 컴퓨터에서 작업하고, 채팅 앱으로 결과를 답장합니다

리서치 프리뷰에서 현재 지원하는 채널:
- **텔레그램**
- **디스코드**
- **Fakechat** (로컬호스트 데모)

> **요구사항**: claude.ai 로그인 필수 (API 키 인증 불가), [Bun](https://bun.sh) 설치, Claude Code v2.1.80 이상

---

## 텔레그램 설정: 단계별 가이드

### 1단계: 텔레그램 봇 만들기

텔레그램에서 [BotFather](https://t.me/BotFather)를 열고 `/newbot`을 전송합니다. 봇 이름과 사용자명(반드시 `bot`으로 끝나야 함)을 정하면 토큰을 받습니다. 이 토큰을 복사해 두세요.

### 2단계: 플러그인 설치

Claude Code 세션 안에서:

```bash
/plugin install telegram@claude-plugins-official
/reload-plugins
```

"플러그인을 찾을 수 없음" 오류가 나면:
```bash
/plugin marketplace add anthropics/claude-plugins-official
# 이후 재시도
```

### 3단계: 토큰 설정

```bash
/telegram:configure 발급받은_봇_토큰
```

### 4단계: 채널 활성화 상태로 실행

```bash
claude --channels plugin:telegram@claude-plugins-official
```

### 5단계: 계정 페어링

텔레그램에서 내 봇에게 아무 메시지나 전송 → 봇이 페어링 코드로 응답 → Claude Code에서:

```bash
/telegram:access pair <코드>
/telegram:access policy allowlist
```

완료! 이제 텔레그램 봇에 보내는 메시지가 Claude Code 세션으로 바로 전달됩니다.

---

## 디스코드 설정

1. [Discord 개발자 포털](https://discord.com/developers/applications)에서 새 애플리케이션 생성 후 봇 토큰 발급
2. **Message Content Intent** 활성화 (Privileged Gateway Intents)
3. OAuth2 → URL Generator로 서버 초대 URL 생성 (`bot` 스코프, 메시지 권한)
4. Claude Code에서: `/plugin install discord@claude-plugins-official`
5. 설정: `/discord:configure <토큰>`
6. 재시작: `claude --channels plugin:discord@claude-plugins-official`
7. 봇에게 DM → 페어링 코드 수신 → `/discord:access pair <코드>`

---

## 어떻게 활용할 수 있나요?

### 코드베이스 원격 질의

```
나 → 텔레그램: "src/middleware/auth.ts의 인증 미들웨어가 어떻게 동작해?"
Claude → 텔레그램: "JWT 토큰 검증 후 역할 권한을 확인하는 구조입니다..."
```

### 장시간 작업 모니터링

데이터베이스 마이그레이션이나 테스트 스위트를 시작하고 회의에 들어가도 됩니다. 스마트폰으로 진행 상황을 확인하고 추가 질문을 할 수 있습니다.

### CI/CD 알림 수신

GitHub Actions 빌드 실패 이벤트를 Claude Code 세션으로 전달하는 커스텀 채널을 만들 수 있습니다. Claude가 즉시 에러를 분석하고 수정 방법을 제안합니다.

### tmux로 상시 연결 AI 어시스턴트

```bash
# 지속적인 터미널 세션에서 Claude 실행
tmux new-session -d -s claude-session
tmux send-keys -t claude-session \
  "claude --channels plugin:telegram@claude-plugins-official" Enter
```

tmux 세션이 유지되는 동안 텔레그램 봇이 살아 있어 — 실제 로컬 파일에 접근 가능한 AI 코딩 어시스턴트를 어디서든 사용할 수 있습니다.

---

## 다른 Claude Code 기능과 비교

| 기능 | 채널(Channels) | Remote Control | Claude.ai Web |
|---|---|---|---|
| 세션 유형 | 기존 로컬 세션 | 기존 로컬 세션 | 새 클라우드 세션 |
| 트리거 | 외부 푸시 (텔레그램, 디스코드) | claude.ai에서 직접 제어 | claude.ai에서 직접 제어 |
| 파일 접근 | 로컬 파일 ✅ | 로컬 파일 ✅ | GitHub 클론만 |
| 최적 용도 | 원격 제어, 웹훅, 채팅 | 모바일에서 시각적 제어 | 비동기 위임 작업 |

---

## 보안

- **발신자 허용 목록(allowlist)**: 페어링된 계정만 메시지를 푸시할 수 있음
- 모르는 발신자는 자동으로 무시됨
- `--channels` 플래그로 세션마다 채널을 선택적 활성화
- 허용 목록은 **권한 중계(permission relay)**도 제어 — 페어링된 사용자가 Claude의 도구 사용 허가/거부를 원격으로 할 수 있으므로 신뢰하는 계정만 등록

완전 무인 자동화 시: `--dangerously-skip-permissions` 사용 가능 (신뢰할 수 있는 환경에서만)

---

## 팀·엔터프라이즈 사용자

팀·엔터프라이즈 조직에서는 채널이 **기본적으로 비활성화**되어 있습니다. 관리자가 먼저 활성화해야 합니다:

> Claude.ai → 관리자 설정 → Claude Code → Channels → 활성화

---

## Fakechat 데모로 먼저 체험하기

자격 증명 없이 바로 체험:

```bash
/plugin install fakechat@claude-plugins-official
claude --channels plugin:fakechat@claude-plugins-official
# 브라우저에서 http://localhost:8787 열기
```

브라우저에서 메시지 입력 → Claude Code 터미널에 도착 → 브라우저에 Claude 답장 표시. 텔레그램이나 디스코드 연결 전에 동작 방식을 확인하기 좋습니다.

---

## 현재 제한사항 (리서치 프리뷰)

- 매 세션마다 `--channels` 플래그 필요 (백그라운드 데몬 없음)
- Anthropic 공식 허용 목록의 플러그인만 사용 가능
- 세션 창이 열려 있는 동안만 이벤트 수신
- API 키 인증 불가 — claude.ai 로그인 필수

---

## 정리

Claude Code Channels는 긴 AI 코딩 세션을 진행하는 개발자에게 실질적으로 유용한 기능입니다. 스마트폰에서 질문하고 작업을 조종하면서, Claude가 실제 로컬 파일을 기반으로 동작한다는 점이 클라우드 기반 접근 방식과 결정적으로 다릅니다.

텔레그램 설정은 10분, Fakechat 데모는 2분이면 충분합니다. Claude Code를 자주 사용한다면 지금 당장 설정해볼 가치가 있습니다.

**참고 링크**
- [공식 문서](https://docs.anthropic.com/en/docs/claude-code/channels)
- [플러그인 소스 코드](https://github.com/anthropics/claude-plugins-official)
- [커스텀 채널 만들기](https://docs.anthropic.com/en/channels-reference)
