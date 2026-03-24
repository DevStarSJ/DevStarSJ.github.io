---
layout: subsite-post
title: "Claude Code Channels: Control Your AI Agent from Telegram and Discord"
description: "Complete guide to Claude Code Channels — how to push messages into your running Claude Code session from Telegram or Discord, setup steps, use cases, and security."
date: 2026-03-23 15:00:00
category: coding
tags: [claude-code, channels, telegram, discord, mcp, anthropic, ai-agent]
header-img: https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&auto=format&fit=crop&q=80
---

# Claude Code Channels: Control Your AI Agent from Telegram and Discord

Kick off a long coding session with Claude Code, step away from your desk, and stay in full control from your phone. That's the promise of **Claude Code Channels** — a research preview feature that lets you push messages into your running Claude Code session from Telegram, Discord, or any custom platform.

![Claude Code Channels](https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=900&auto=format&fit=crop&q=80)
*Photo by [Alexander Shatov](https://unsplash.com/@alexbemore) on Unsplash*

---

## What Is Claude Code Channels?

A **channel** is an MCP server that pushes events into your already-running Claude Code session. It's fundamentally different from other remote access patterns:

- **Not a fresh session**: Claude keeps your full file context and conversation history
- **Push-based**: Messages arrive the moment you send them, not on a polling schedule
- **Two-way**: Claude reads your message, does the work on your machine, and replies back to your chat app

Currently available in the research preview (Claude Code v2.1.80+):
- **Telegram**
- **Discord**
- **Fakechat** (localhost demo)

> **Requirements**: claude.ai login (not API key), [Bun](https://bun.sh) installed, Claude Code v2.1.80+

---

## Telegram Setup: Step by Step

### 1. Create a Telegram Bot

Open [BotFather](https://t.me/BotFather), send `/newbot`, choose a name and username (must end in `bot`), and copy the token.

### 2. Install the Plugin

Inside Claude Code:

```bash
/plugin install telegram@claude-plugins-official
/reload-plugins
```

If "plugin not found":
```bash
/plugin marketplace add anthropics/claude-plugins-official
# then retry install
```

### 3. Configure Your Token

```bash
/telegram:configure YOUR_BOT_TOKEN
```

### 4. Launch with Channel Enabled

```bash
claude --channels plugin:telegram@claude-plugins-official
```

### 5. Pair Your Account

Send any message to your bot on Telegram → bot replies with a pairing code → back in Claude Code:

```bash
/telegram:access pair <code>
/telegram:access policy allowlist
```

Done! Now messages you send to your Telegram bot will arrive directly in your Claude Code session.

---

## Discord Setup

1. Create a bot at [Discord Developer Portal](https://discord.com/developers/applications)
2. Enable **Message Content Intent**
3. Invite the bot to your server (OAuth2 → URL Generator, `bot` scope)
4. In Claude Code: `/plugin install discord@claude-plugins-official`
5. Configure: `/discord:configure <token>`
6. Restart: `claude --channels plugin:discord@claude-plugins-official`
7. DM your bot → get pairing code → `/discord:access pair <code>`

---

## What Can You Do with Channels?

### Ask questions about your codebase remotely

```
You → Telegram: "What does the auth middleware do in src/middleware/auth.ts?"
Claude → Telegram: "The auth middleware validates JWT tokens and checks role permissions..."
```

### Monitor long-running tasks

Start a database migration or test suite, go to a meeting, check results on your phone. Ask Claude follow-up questions without returning to your desk.

### Receive CI/CD alerts

Build a custom webhook channel that forwards GitHub Actions failures directly into your Claude Code session. Claude can immediately inspect the error and suggest fixes.

### Always-on assistant via tmux

```bash
# Run Claude in a persistent terminal session
tmux new-session -d -s claude-session
tmux send-keys -t claude-session "claude --channels plugin:telegram@claude-plugins-official" Enter
```

Your Telegram bot stays active as long as the tmux session runs — giving you an AI coding assistant accessible from anywhere.

---

## Comparing Channel Options

| Feature | Channels | Remote Control | Claude.ai Web |
|---|---|---|---|
| Session type | Your existing local session | Your existing local session | Fresh cloud session |
| Trigger | External push (Telegram, Discord) | You drive from claude.ai | You drive from claude.ai |
| File access | Your local files ✅ | Your local files ✅ | GitHub clone only |
| Best for | Remote steering, webhooks, chat | Visual control while mobile | Async delegated tasks |

---

## Security

- **Sender allowlist**: Only paired accounts can push messages
- Unknown senders are silently dropped
- You activate channels per-session with `--channels` (not always-on)
- The allowlist also controls **permission relay** — paired users can approve/deny Claude's tool-use prompts remotely

For fully unattended use: `--dangerously-skip-permissions` (only in trusted environments)

---

## Team and Enterprise

Channels are **disabled by default** for Team/Enterprise organizations. Admins must enable them at:

> Claude.ai → Admin Settings → Claude Code → Channels

---

## Try It First: Fakechat Demo

No credentials needed:

```bash
/plugin install fakechat@claude-plugins-official
claude --channels plugin:fakechat@claude-plugins-official
# Open http://localhost:8787 in your browser
```

Type a message in the browser → watch it appear in your Claude Code terminal → see Claude's reply back in the browser. Great way to understand the flow before connecting Telegram or Discord.

---

## Current Limitations (Research Preview)

- Requires `--channels` flag every session (no persistent background daemon)
- Only plugins from Anthropic's official allowlist accepted
- Events only arrive while session is open
- API key auth not supported — requires claude.ai login

---

## Summary

Claude Code Channels is a genuinely useful feature for developers who run long AI coding sessions. The ability to check in, ask questions, and steer work from your phone — while Claude operates on your actual local files — is a meaningful upgrade over spawning fresh cloud sessions.

Setting up Telegram takes about 10 minutes. The Fakechat demo takes 2. Both are worth trying if you regularly work with Claude Code.

**Useful Links**
- [Official Documentation](https://docs.anthropic.com/en/docs/claude-code/channels)
- [Plugin Source Code](https://github.com/anthropics/claude-plugins-official)
- [Build Your Own Channel](https://docs.anthropic.com/en/channels-reference)
