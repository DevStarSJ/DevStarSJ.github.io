---
layout: post
title: "OpenClaw 설치 가이드: 나만의 AI 개인 비서 만들기"
description: "OpenClaw을 설치하고 WhatsApp, Telegram, Discord에서 AI 비서와 대화하는 방법을 단계별로 알아봅니다. Node.js 설치부터 채널 연결까지 완벽 가이드."
category: Dev
tags: [openclaw, ai-assistant, whatsapp, telegram, discord, nodejs, setup-guide]
date: 2026-02-03
header-img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200"
---

# OpenClaw 설치 가이드: 나만의 AI 개인 비서 만들기

WhatsApp, Telegram, Discord 등 **일상에서 쓰는 메신저로 AI 비서와 대화**할 수 있다면 어떨까요? [OpenClaw](https://github.com/openclaw/openclaw)은 바로 그것을 가능하게 하는 오픈소스 프로젝트입니다.

이 글에서는 OpenClaw을 처음부터 설치하고, 실제로 메신저에서 AI 비서와 대화하는 것까지 단계별로 안내합니다.

![AI Assistant](https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800)
*Photo by [Google DeepMind](https://unsplash.com/@googledeepmind) on Unsplash*

---

## OpenClaw이란?

OpenClaw은 **개인용 AI 비서 게이트웨이**입니다. 핵심 아이디어는 간단합니다:

```
메신저 (WhatsApp/Telegram/Discord/iMessage)
        │
        ▼
  ┌─────────────────────┐
  │     Gateway         │  ← 하나의 프로세스가 모든 채널 관리
  │  (openclaw gateway) │
  └─────────┬───────────┘
            │
            ▼
      AI Agent (Pi)    ← Claude, GPT 등 AI 모델 연결
```

**주요 특징:**
- 📱 **WhatsApp** — WhatsApp Web 프로토콜 (Baileys)
- ✈️ **Telegram** — Bot API (grammY)
- 🎮 **Discord** — Bot API (discord.js)
- 💬 **iMessage** — macOS 전용 (imsg CLI)
- 🧩 **Mattermost** — 플러그인 지원
- 🔐 **보안** — DM 페어링 기본, 허용 목록 관리
- 🧠 **멀티 에이전트** — 여러 AI 에이전트 동시 운용

> 공식 문서: [docs.openclaw.ai](https://docs.openclaw.ai)
> GitHub: [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)

---

## 사전 준비

### 시스템 요구사항

| 항목 | 요구사항 |
|------|----------|
| **OS** | macOS, Linux, Windows (WSL2) |
| **Node.js** | 22 이상 |
| **pnpm** | 소스 빌드 시에만 필요 |

### Node.js 설치

아직 Node.js가 없다면:

```bash
# macOS (Homebrew)
brew install node

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows
# WSL2 설치 후 Ubuntu에서 위 명령 실행
```

버전 확인:
```bash
node -v   # v22.x.x 이상이면 OK
npm -v
```

---

## Step 1: OpenClaw 설치

### 방법 A: 원클릭 설치 (추천)

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Windows (PowerShell):
```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

이 스크립트가 npm으로 전역 설치 후 온보딩 위자드를 실행합니다.

### 방법 B: npm 수동 설치

```bash
npm install -g openclaw@latest
```

pnpm 사용자:
```bash
pnpm add -g openclaw@latest
pnpm approve-builds -g   # 빌드 스크립트 승인
pnpm add -g openclaw@latest   # 재실행으로 postinstall 완료
```

### 방법 C: 소스에서 빌드 (개발자용)

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build   # UI 빌드 (첫 실행 시 자동으로 의존성 설치)
pnpm build
```

설치 확인:
```bash
openclaw --version
```

---

## Step 2: 온보딩 위자드 실행

온보딩 위자드가 모든 설정을 안내합니다:

```bash
openclaw onboard --install-daemon
```

위자드에서 설정할 것들:
1. **모드 선택** — Local (내 컴퓨터) vs Remote (원격 서버)
2. **AI 모델/인증** — Anthropic API 키, OpenAI, Claude Code 등
3. **게이트웨이 설정** — 포트, 바인딩, 인증 토큰
4. **채널 설정** — WhatsApp, Telegram, Discord 등
5. **데몬 설치** — 백그라운드 서비스 (launchd/systemd)
6. **스킬 설치** — 추가 기능들

### QuickStart vs Advanced

- **QuickStart** — 기본값으로 빠르게 시작 (초보자 추천)
- **Advanced** — 모든 옵션을 세밀하게 조정

### AI 모델 인증 (중요!)

추천 순서:
1. **Anthropic API 키** (추천) — Claude Opus 4.5 사용 가능
2. **OpenAI Code (Codex)** — GPT-5.2 사용 가능
3. **기타** — Gemini, Moonshot, MiniMax 등

```bash
# Anthropic API 키 설정 예시
# 위자드에서 "Anthropic API key" 선택 후 키 입력
```

> 💡 **팁:** Anthropic Pro/Max 구독 + Claude Opus 4.5가 장문 맥락 처리와 프롬프트 인젝션 방어에 가장 강력합니다.

---

## Step 3: Gateway 시작

온보딩에서 데몬을 설치했다면 이미 실행 중입니다:

```bash
# 상태 확인
openclaw gateway status

# 수동 실행 (포그라운드)
openclaw gateway --port 18789 --verbose
```

### Dashboard (Control UI) 열기

게이트웨이가 실행 중이면 브라우저에서:

```
http://127.0.0.1:18789/
```

또는:
```bash
openclaw dashboard
```

이 Control UI에서 채팅, 설정, 세션 관리, 크론 작업 등을 모두 할 수 있습니다.

---

## Step 4: 채널 연결

### WhatsApp 연결

```bash
openclaw channels login
```

1. 터미널에 QR 코드가 표시됨
2. **보조 폰**의 WhatsApp → 설정 → 연결된 기기 → 기기 연결
3. QR 코드 스캔
4. 연결 완료!

> ⚠️ **추천:** 별도의 전화번호(서브폰)를 사용하세요. 개인 번호를 연결하면 모든 메시지가 AI 입력이 됩니다.

설정 예시 (`~/.openclaw/openclaw.json`):
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

1. Telegram에서 [@BotFather](https://t.me/BotFather)에게 `/newbot` 전송
2. 봇 이름과 username 설정
3. 발급받은 토큰을 설정에 입력

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "123456:ABC-your-token-here",
      "dmPolicy": "pairing"
    }
  }
}
```

### Discord 봇 연결

1. [Discord Developer Portal](https://discord.com/developers/applications) → New Application
2. Bot → Add Bot → 토큰 복사
3. **Privileged Gateway Intents**에서 Message Content Intent 활성화
4. 서버에 봇 초대

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN"
    }
  }
}
```

---

## Step 5: DM 보안 (페어링)

OpenClaw은 기본적으로 **모르는 사람의 DM을 차단**합니다.

첫 DM을 보내면 페어링 코드가 발급되고, 이를 승인해야 합니다:

```bash
# 대기 중인 페어링 요청 확인
openclaw pairing list whatsapp

# 승인
openclaw pairing approve whatsapp <code>
```

또는 허용 목록으로 사전 설정:
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

---

## Step 6: 워크스페이스 설정

OpenClaw의 AI 비서는 **워크스페이스**에서 동작합니다:

```
~/.openclaw/workspace/
├── AGENTS.md       # 에이전트 행동 규칙
├── SOUL.md         # 성격과 말투
├── USER.md         # 사용자 정보
├── IDENTITY.md     # 에이전트 정체성
├── TOOLS.md        # 도구 설정
├── HEARTBEAT.md    # 주기적 작업 정의
└── memory/         # 기억 저장소
    └── 2026-02-03.md
```

이 파일들을 편집해서 AI 비서의 성격과 동작을 커스터마이즈할 수 있습니다.

---

## Step 7: 동작 확인

```bash
# 전체 상태 확인
openclaw status

# 건강 체크
openclaw health

# 보안 감사
openclaw security audit --deep

# 테스트 메시지 보내기
openclaw message send --target +821012345678 --message "Hello from OpenClaw!"
```

---

## 설정 예시: 개인 비서 모드

완벽한 개인 비서 설정 예시:

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
      "groups": {
        "*": { "requireMention": true }
      }
    }
  },
  "session": {
    "scope": "per-sender",
    "resetTriggers": ["/new", "/reset"],
    "reset": {
      "mode": "daily",
      "atHour": 4,
      "idleMinutes": 10080
    }
  }
}
```

---

## Heartbeat: 주기적 자동 작업

AI 비서가 주기적으로 (기본 30분) 자동 작업을 실행할 수 있습니다:

```json
{
  "agent": {
    "heartbeat": { "every": "30m" }
  }
}
```

`HEARTBEAT.md`에 작업을 정의하면 자동으로 실행:
- 📧 이메일 확인
- 📅 캘린더 알림
- 🌤️ 날씨 체크
- 📈 주식/공시 모니터링

---

## 트러블슈팅

### `openclaw` 명령어를 찾을 수 없을 때

```bash
# PATH 확인
echo "$PATH"
npm prefix -g

# ~/.zshrc에 추가
export PATH="$(npm prefix -g)/bin:$PATH"
```

### WhatsApp 연결이 끊어질 때

```bash
# 재연결
openclaw channels login

# 인증 파일 위치
ls ~/.openclaw/credentials/whatsapp/
```

### Gateway가 시작되지 않을 때

```bash
# 진단
openclaw doctor
openclaw status --all
```

---

## 다음 단계

OpenClaw 설치가 완료되면 더 많은 기능을 탐색해보세요:

- 🖥️ **[macOS 메뉴바 앱](https://docs.openclaw.ai/platforms/macos)** — 음성 호출 지원
- 📱 **[iOS/Android 앱](https://docs.openclaw.ai/nodes)** — 카메라, 위치 연동
- ⏰ **[Cron 작업](https://docs.openclaw.ai/automation/cron-jobs)** — 정해진 시간에 자동 실행
- 🔧 **[스킬 시스템](https://docs.openclaw.ai/tools/skills)** — 기능 확장
- 🌐 **[원격 접속](https://docs.openclaw.ai/gateway/remote)** — SSH 터널, Tailscale

---

## 마무리

OpenClaw은 AI 비서를 **내 기기에서, 내가 쓰는 메신저로** 운용할 수 있게 해주는 강력한 도구입니다. 오픈소스이기 때문에 원하는 대로 커스터마이즈할 수 있고, 프라이버시도 보장됩니다.

**유용한 링크:**
- 📖 [공식 문서](https://docs.openclaw.ai)
- 💻 [GitHub](https://github.com/openclaw/openclaw)
- 💬 [Discord 커뮤니티](https://discord.gg/clawd)
- 🚀 [Getting Started](https://docs.openclaw.ai/start/getting-started)
- 🧙 [온보딩 위자드 상세](https://docs.openclaw.ai/start/wizard)
