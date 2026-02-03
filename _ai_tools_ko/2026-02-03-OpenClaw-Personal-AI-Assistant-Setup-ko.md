---
layout: ai-tools-post-ko
title: "OpenClaw: WhatsApp, Telegram, Discord에서 나만의 AI 비서 만들기"
description: "OpenClaw 설치부터 설정까지 완벽 가이드. WhatsApp, Telegram, Discord에서 동작하는 개인 AI 비서를 직접 만들어보세요."
category: automation
tags: [openclaw, ai-비서, whatsapp, telegram, discord, 챗봇, 오픈소스]
date: 2026-02-03
read_time: 15
header-img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200"
---

# OpenClaw: WhatsApp, Telegram, Discord에서 나만의 AI 비서 만들기

평소 쓰는 **WhatsApp, Telegram, Discord에서 AI 비서와 대화**할 수 있다면 어떨까요? 제한적인 챗봇이 아니라, 코드 실행, 웹 검색, 파일 관리, 대화 기억까지 가능한 풀 파워 AI 에이전트를요.

[OpenClaw](https://github.com/openclaw/openclaw)이 바로 그걸 가능하게 해줍니다. AI 모델(Claude, GPT 등)을 여러분의 메신저에 연결해주는 오픈소스 게이트웨이입니다.

![AI Assistant](https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800)
*Photo by [Google DeepMind](https://unsplash.com/@googledeepmind) on Unsplash*

---

## OpenClaw이란?

OpenClaw은 **개인용 AI 비서 게이트웨이**입니다:

```
내 폰 (WhatsApp/Telegram/Discord)
        │
        ▼
  ┌─────────────────────┐
  │     OpenClaw         │
  │     Gateway          │  ← 하나의 프로세스가 모든 채널 관리
  └─────────┬───────────┘
            │
            ▼
      AI Agent (Pi)       ← Claude, GPT, Gemini 등
```

### 주요 기능

- 📱 **WhatsApp** — WhatsApp Web 프로토콜로 완전 통합
- ✈️ **Telegram** — Bot API로 DM + 그룹 지원
- 🎮 **Discord** — DM + 서버 채널 지원
- 💬 **iMessage** — macOS 네이티브 연동
- 🧩 **플러그인** — Mattermost, Slack, Signal 등
- 🔐 **보안** — DM 페어링, 허용 목록, 인증 토큰
- 🧠 **멀티 에이전트** — 여러 AI 에이전트 동시 운용
- ⏰ **크론 작업** — 예약 작업과 알림
- 📎 **미디어** — 이미지, 음성, 문서 송수신
- 🖥️ **대시보드** — 웹 기반 관리 UI

> **링크:** [공식 문서](https://docs.openclaw.ai) · [GitHub](https://github.com/openclaw/openclaw) · [Discord 커뮤니티](https://discord.gg/clawd)

---

## 사전 준비

- **OS:** macOS, Linux, Windows (WSL2 필수)
- **Node.js:** 22 버전 이상
- **AI API 키:** Anthropic (추천), OpenAI 등

### Node.js 설치

```bash
# macOS (Homebrew)
brew install node

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 버전 확인
node -v   # v22.x.x 이상이면 OK
```

---

## 설치하기

### 방법 1: 원클릭 설치 (추천)

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

npm으로 전역 설치 후 온보딩 위자드를 자동 실행합니다.

**Windows:**
```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

### 방법 2: npm 수동 설치

```bash
npm install -g openclaw@latest
```

### 방법 3: 소스에서 빌드 (개발자)

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build
pnpm build
```

---

## 설정: 온보딩 위자드

모든 설정을 안내하는 위자드를 실행합니다:

```bash
openclaw onboard --install-daemon
```

### 위자드가 설정하는 것들

1. **모드** — Local (내 컴퓨터) vs Remote (원격 서버)
2. **AI 모델 인증** — API 키 또는 OAuth
3. **게이트웨이** — 포트, 바인딩, 인증 토큰
4. **채널** — WhatsApp, Telegram, Discord 등
5. **데몬** — 백그라운드 서비스 설치
6. **스킬** — 추가 기능 설치

### AI 모델 선택

| 제공자 | 인증 방식 | 추천 모델 |
|--------|----------|-----------|
| **Anthropic** | API 키 (추천) | Claude Opus 4.5 |
| **OpenAI** | API 키/OAuth | GPT-5.2 |
| **Gemini** | API 키 | Gemini |
| **Moonshot** | API 키 | Kimi K2 |

> 💡 **추천:** Anthropic API 키 + Claude Opus 4.5가 장문 맥락 이해와 보안에 가장 강력합니다.

---

## Gateway 시작

온보딩 후 데몬이 자동으로 실행됩니다:

```bash
# 상태 확인
openclaw gateway status

# 수동 실행
openclaw gateway --port 18789 --verbose
```

### 대시보드 열기

브라우저에서 접속:
```
http://127.0.0.1:18789/
```

또는:
```bash
openclaw dashboard
```

대시보드에서 채팅, 세션 관리, 크론 작업, 시스템 모니터링을 할 수 있습니다.

---

## 채널 연결

### WhatsApp 연결

```bash
openclaw channels login
```

1. 터미널에 QR 코드 표시
2. 보조 폰의 WhatsApp → 설정 → 연결된 기기 → 기기 연결
3. QR 코드 스캔
4. 완료!

> ⚠️ **중요:** 별도의 전화번호(서브폰)를 사용하세요. 개인 번호를 연결하면 모든 메시지가 AI 입력이 됩니다.

```json
{
  "channels": {
    "whatsapp": {
      "dmPolicy": "allowlist",
      "allowFrom": ["+821012345678"]
    }
  }
}
```

### Telegram 봇 연결

1. [@BotFather](https://t.me/BotFather)에게 `/newbot` 전송
2. 봇 이름/username 설정
3. 토큰을 설정에 입력

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "YOUR_TOKEN",
      "dmPolicy": "pairing"
    }
  }
}
```

### Discord 봇 연결

1. [Discord Developer Portal](https://discord.com/developers/applications) → New Application
2. Bot → Add Bot → 토큰 복사
3. Message Content Intent 활성화
4. 서버에 봇 초대

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "YOUR_TOKEN"
    }
  }
}
```

---

## DM 보안

OpenClaw은 기본적으로 모르는 사람의 DM을 차단합니다:

```bash
# 대기 중인 요청 확인
openclaw pairing list whatsapp

# 승인
openclaw pairing approve whatsapp <code>
```

---

## 워크스페이스: AI의 뇌

```
~/.openclaw/workspace/
├── AGENTS.md       # 행동 규칙
├── SOUL.md         # 성격과 말투
├── USER.md         # 사용자 정보
├── IDENTITY.md     # 에이전트 정체성
├── TOOLS.md        # 도구 설정
├── HEARTBEAT.md    # 주기적 작업
└── memory/         # 기억 저장소
```

이 파일들을 편집해서 AI의 성격, 지식, 행동을 커스터마이즈할 수 있습니다.

---

## 완성된 설정 예시

```json
{
  "logging": { "level": "info" },
  "agent": {
    "model": "anthropic/claude-opus-4-5",
    "workspace": "~/.openclaw/workspace",
    "thinkingDefault": "high",
    "timeoutSeconds": 1800,
    "heartbeat": { "every": "30m" }
  },
  "channels": {
    "whatsapp": {
      "allowFrom": ["+821012345678"],
      "groups": { "*": { "requireMention": true } }
    },
    "telegram": {
      "enabled": true,
      "botToken": "YOUR_TOKEN",
      "dmPolicy": "pairing"
    },
    "discord": {
      "enabled": true,
      "token": "YOUR_TOKEN"
    }
  },
  "session": {
    "scope": "per-sender",
    "resetTriggers": ["/new", "/reset"]
  }
}
```

---

## Heartbeat: 자동 작업

AI가 30분마다 자동으로 작업을 실행할 수 있습니다:

- 📧 이메일 확인
- 📅 캘린더 알림
- 🌤️ 날씨 체크
- 📈 주식/공시 모니터링

`HEARTBEAT.md`에 원하는 작업을 적어두면 됩니다.

---

## 확인 및 문제 해결

```bash
openclaw status --all    # 전체 상태
openclaw health          # 건강 체크
openclaw doctor          # 문제 진단
```

### 자주 발생하는 문제

| 문제 | 해결 |
|------|------|
| `openclaw` 명령어 없음 | PATH에 `$(npm prefix -g)/bin` 추가 |
| WhatsApp 연결 끊김 | `openclaw channels login` 재실행 |
| Gateway 미시작 | `openclaw doctor` 실행 |
| AI 응답 없음 | `openclaw health`로 인증 확인 |

---

## 다음 단계

- 🖥️ [macOS 앱](https://docs.openclaw.ai/platforms/macos) — 메뉴바 + 음성 호출
- 📱 [iOS/Android](https://docs.openclaw.ai/nodes) — 카메라, 위치 연동
- ⏰ [크론 작업](https://docs.openclaw.ai/automation/cron-jobs) — 예약 자동화
- 🔧 [스킬 시스템](https://docs.openclaw.ai/tools/skills) — 기능 확장
- 🌐 [원격 접속](https://docs.openclaw.ai/gateway/remote) — SSH, Tailscale

---

## 마무리

OpenClaw은 AI 비서를 **내 기기에서, 내가 쓰는 메신저로** 운용할 수 있게 해줍니다. 오픈소스라 자유롭게 커스터마이즈 가능하고, 셀프호스팅으로 프라이버시도 보장됩니다.

**시작하기:**
- 📖 [공식 문서](https://docs.openclaw.ai)
- 💻 [GitHub](https://github.com/openclaw/openclaw)
- 💬 [Discord 커뮤니티](https://discord.gg/clawd)
- 🚀 [시작 가이드](https://docs.openclaw.ai/start/getting-started)
