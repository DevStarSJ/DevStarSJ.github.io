---
layout: ai-tools-post
title: "OpenClaw: Build Your Own AI Assistant on WhatsApp, Telegram & Discord"
description: "Complete guide to installing OpenClaw - the open-source personal AI assistant that works on WhatsApp, Telegram, Discord, and iMessage. Step-by-step setup with configuration examples."
category: automation
tags: [openclaw, ai-assistant, whatsapp, telegram, discord, chatbot, open-source]
date: 2026-02-03
read_time: 15
header-img: "https://openclaw.ai/og-image.png"
---

# OpenClaw: Build Your Own AI Assistant on WhatsApp, Telegram & Discord

What if you could chat with an AI assistant **right inside your favorite messenger** — WhatsApp, Telegram, Discord, or iMessage? Not a limited chatbot, but a full-powered AI agent that can run code, search the web, manage files, and remember your conversations?

[OpenClaw](https://github.com/openclaw/openclaw) makes this possible. It's an open-source gateway that connects AI models (Claude, GPT, etc.) to your messaging apps.

![AI Assistant](https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800)
*Photo by [Google DeepMind](https://unsplash.com/@googledeepmind) on Unsplash*

---

## What is OpenClaw?

OpenClaw is a **personal AI assistant gateway**. It sits between your messaging apps and AI models:

```
Your Phone (WhatsApp/Telegram/Discord)
        │
        ▼
  ┌─────────────────────┐
  │     OpenClaw         │
  │     Gateway          │  ← Single process manages all channels
  └─────────┬───────────┘
            │
            ▼
      AI Agent (Pi)       ← Claude, GPT, Gemini, etc.
```

### Key Features

| Feature | Description |
|---------|-------------|
| 📱 WhatsApp | Full integration via WhatsApp Web (Baileys) |
| ✈️ Telegram | Bot API with group support (grammY) |
| 🎮 Discord | DMs + guild channels (discord.js) |
| 💬 iMessage | macOS native integration |
| 🧩 Plugins | Mattermost, Slack, Signal, and more |
| 🔐 Security | DM pairing, allowlists, auth tokens |
| 🧠 Multi-Agent | Run multiple AI agents simultaneously |
| ⏰ Cron Jobs | Scheduled tasks and reminders |
| 📎 Media | Send/receive images, audio, documents |
| 🖥️ Dashboard | Web-based Control UI at localhost:18789 |

> **Links:** [Official Docs](https://docs.openclaw.ai) · [GitHub](https://github.com/openclaw/openclaw) · [Discord Community](https://discord.gg/clawd)

---

## Prerequisites

- **OS:** macOS, Linux, or Windows (via WSL2)
- **Node.js:** Version 22 or higher
- **AI API Key:** Anthropic (recommended), OpenAI, or others

### Install Node.js

```bash
# macOS (Homebrew)
brew install node

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node -v   # Should show v22.x.x or higher
```

---

## Installation

### Option 1: One-Line Installer (Recommended)

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

This installs OpenClaw globally and launches the onboarding wizard.

**Windows (PowerShell):**
```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

### Option 2: Manual npm Install

```bash
npm install -g openclaw@latest
```

### Option 3: From Source (Developers)

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build
pnpm build
```

---

## Setup: The Onboarding Wizard

The wizard walks you through everything:

```bash
openclaw onboard --install-daemon
```

### What the Wizard Configures

1. **Mode** — Local (your machine) or Remote (server)
2. **AI Model Auth** — API keys or OAuth
3. **Gateway** — Port, binding, auth token
4. **Channels** — WhatsApp, Telegram, Discord, etc.
5. **Daemon** — Background service (launchd on macOS, systemd on Linux)
6. **Skills** — Additional capabilities

### Model Authentication

The wizard supports multiple AI providers:

| Provider | Auth Method | Recommended Model |
|----------|------------|-------------------|
| **Anthropic** | API key (recommended) | Claude Opus 4.5 |
| **OpenAI** | API key or OAuth | GPT-5.2 |
| **Gemini** | API key | Gemini models |
| **Moonshot** | API key | Kimi K2 |
| **MiniMax** | Auto-configured | M2.1 |

> 💡 **Recommendation:** Anthropic API key + Claude Opus 4.5 offers the best long-context understanding and security against prompt injection.

---

## Starting the Gateway

After onboarding, the daemon should be running:

```bash
# Check status
openclaw gateway status

# Manual start (foreground mode)
openclaw gateway --port 18789 --verbose
```

### Access the Dashboard

Open your browser to:
```
http://127.0.0.1:18789/
```

Or use the CLI shortcut:
```bash
openclaw dashboard
```

The Dashboard (Control UI) lets you:
- Chat with the AI directly
- Manage sessions and channels
- Configure cron jobs
- Monitor system health
- Edit configuration

---

## Connecting Channels

### WhatsApp Setup

1. Run the login command:
```bash
openclaw channels login
```

2. A QR code appears in the terminal
3. On your phone: WhatsApp → Settings → Linked Devices → Link a Device
4. Scan the QR code
5. Done!

**Recommended:** Use a **separate phone number** for the assistant. If you link your personal WhatsApp, every message to you becomes AI input.

Configuration (`~/.openclaw/openclaw.json`):
```json
{
  "channels": {
    "whatsapp": {
      "dmPolicy": "allowlist",
      "allowFrom": ["+1234567890"]
    }
  }
}
```

### Telegram Setup

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "YOUR_BOT_TOKEN",
      "dmPolicy": "pairing",
      "groups": { "*": { "requireMention": true } }
    }
  }
}
```

### Discord Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create New Application → Bot → Add Bot
3. Enable **Message Content Intent** under Privileged Gateway Intents
4. Copy the bot token
5. Invite the bot to your server

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

## DM Security (Pairing)

OpenClaw blocks unknown senders by default. When someone DMs your bot for the first time, they receive a pairing code:

```bash
# List pending pairing requests
openclaw pairing list whatsapp

# Approve a request
openclaw pairing approve whatsapp <code>
```

---

## The Workspace: Your AI's Brain

The AI assistant operates from a workspace directory:

```
~/.openclaw/workspace/
├── AGENTS.md       # Behavioral rules
├── SOUL.md         # Personality & tone
├── USER.md         # Info about you
├── IDENTITY.md     # Agent identity
├── TOOLS.md        # Tool configurations
├── HEARTBEAT.md    # Periodic tasks
└── memory/         # Persistent memory
    └── 2026-02-03.md
```

Edit these files to customize your AI's personality, knowledge, and behavior.

---

## Full Configuration Example

Here's a complete personal assistant setup:

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
      "allowFrom": ["+1234567890"],
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

## Heartbeats: Proactive AI

OpenClaw can run periodic tasks automatically (default: every 30 minutes). Define tasks in `HEARTBEAT.md`:

- 📧 Check emails
- 📅 Calendar reminders
- 🌤️ Weather updates
- 📈 Stock monitoring
- 🔔 Custom notifications

---

## Verification & Troubleshooting

```bash
# Full status report
openclaw status --all

# Health check
openclaw health

# Security audit
openclaw security audit --deep

# Diagnose issues
openclaw doctor
```

### Common Issues

| Problem | Solution |
|---------|----------|
| `openclaw` not found | Add `$(npm prefix -g)/bin` to PATH |
| WhatsApp disconnects | Run `openclaw channels login` again |
| Gateway won't start | Run `openclaw doctor` |
| No AI response | Check auth: `openclaw health` |

---

## Next Steps

- 🖥️ [macOS Menu Bar App](https://docs.openclaw.ai/platforms/macos) — Voice activation
- 📱 [iOS/Android Nodes](https://docs.openclaw.ai/nodes) — Camera, location integration
- ⏰ [Cron Jobs](https://docs.openclaw.ai/automation/cron-jobs) — Scheduled automation
- 🔧 [Skills System](https://docs.openclaw.ai/tools/skills) — Extend capabilities
- 🌐 [Remote Access](https://docs.openclaw.ai/gateway/remote) — SSH tunnel, Tailscale
- 🐳 [Docker Setup](https://docs.openclaw.ai/install/docker) — Containerized deployment

---

## Conclusion

OpenClaw puts a full-powered AI assistant in your pocket — through the messaging apps you already use. It's open-source, self-hosted, and privacy-friendly. Whether you want a coding helper, a personal organizer, or a creative companion, OpenClaw gives you the foundation to build it.

**Get started now:**
- 📖 [Official Documentation](https://docs.openclaw.ai)
- 💻 [GitHub Repository](https://github.com/openclaw/openclaw)
- 💬 [Discord Community](https://discord.gg/clawd)
- 🚀 [Quick Start Guide](https://docs.openclaw.ai/start/getting-started)
