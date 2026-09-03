---
layout: post
title: "Claude Code Channels: Control Your AI Agent from Telegram and Discord"
subtitle: "How to use Claude Code's new Channels feature to push messages into your running session from anywhere"
date: 2026-03-23 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&auto=format&fit=crop&q=80"
header-mask: 0.4
catalog: true
tags:
  - Claude Code
  - AI Tools
  - Telegram
  - Discord
  - Developer Tools
  - MCP
  - Anthropic
categories: ai
---

# Claude Code Channels: Control Your AI Agent from Telegram and Discord

Imagine you kick off a long refactor session with Claude Code, step away from your desk, and then want to check in — or steer the work — from your phone. That's exactly what **Claude Code Channels** enables.

Announced as a research preview (requires Claude Code v2.1.80+), Channels is a new feature that lets you **push events and messages into your running Claude Code session** from external platforms like Telegram or Discord. It's a two-way bridge: you send a message, Claude reads it, does the work on your machine, and replies back to your phone.

![Claude Code Channels](https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=900&auto=format&fit=crop&q=80)
*Photo by [Alexander Shatov](https://unsplash.com/@alexbemore) on Unsplash*

---

## What Are Claude Code Channels?

A **channel** is an MCP server that pushes events into your running Claude Code session. Unlike traditional integrations that spawn a fresh session or poll on a timer, channels work with **the session you already have open** — with all your file context and conversation history intact.

Key characteristics:
- **Push-based**: Events arrive when they happen, not when Claude polls for them
- **Two-way**: Claude can read your message *and* reply back through the same channel
- **Context-preserving**: Your existing session state, files, and tool context remain intact
- **Session-scoped**: Events only arrive while the session window is open

Currently supported channels in the research preview:
- **Telegram** (via `telegram@claude-plugins-official`)
- **Discord** (via `discord@claude-plugins-official`)
- **Fakechat** (localhost demo, no credentials needed)

---

## How It Compares to Other Claude Code Features

| Feature | How it works | Best for |
|---|---|---|
| **Channels** | Push events into your running local session | Chat-driven control, CI webhooks, remote steering |
| **Remote Control** | Drive your local session from claude.ai or mobile app | Visual steering while away from desk |
| **Claude Code on the Web** | Fresh cloud sandbox cloned from GitHub | Delegating self-contained async tasks |
| **Claude in Slack** | Spawns a web session from `@Claude` mention | Starting tasks from team chat context |
| **Standard MCP** | Claude queries it during a task (pull-based) | On-demand read/query access to systems |

Channels are uniquely suited for scenarios where **you want to stay in the loop** on a long-running task without being at your terminal.

---

## Setting Up Claude Code Channels with Telegram

Here's the complete setup process:

### Prerequisites

- Claude Code v2.1.80 or later
- [Bun](https://bun.sh) installed (`bun --version` to check)
- A claude.ai account (API key auth is not supported for Channels)
- **Team/Enterprise users**: admin must enable Channels in organization settings

### Step 1: Create a Telegram Bot

Open [BotFather](https://t.me/BotFather) in Telegram and send `/newbot`. Choose a display name and a unique username ending in `bot`. Copy the token BotFather returns — you'll need it shortly.

### Step 2: Install the Plugin

Inside a Claude Code session, run:

```bash
/plugin install telegram@claude-plugins-official
```

If you get "plugin not found in any marketplace", refresh first:

```bash
/plugin marketplace add anthropics/claude-plugins-official
# or, if already added:
/plugin marketplace update claude-plugins-official
```

Then retry the install and reload:

```bash
/reload-plugins
```

### Step 3: Configure Your Token

```bash
/telegram:configure <your-bot-token>
```

This saves the token to `~/.claude/channels/telegram/.env`. Alternatively, set `TELEGRAM_BOT_TOKEN` in your shell environment before launching Claude Code.

### Step 4: Launch with the Channel Enabled

Exit Claude Code and restart with the `--channels` flag:

```bash
claude --channels plugin:telegram@claude-plugins-official
```

This starts the Telegram plugin, which begins polling your bot for incoming messages.

### Step 5: Pair Your Account

Open Telegram, find your bot, and send it any message. The bot will reply with a pairing code.

Back in Claude Code, approve the pairing:

```bash
/telegram:access pair <pairing-code>
```

Then lock it down so only you can send commands:

```bash
/telegram:access policy allowlist
```

That's it. Now you can message your bot from anywhere and Claude Code will receive and act on your messages.

---

## Setting Up with Discord

The Discord setup follows a similar flow:

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications), create a new application, and get your bot token from the **Bot** section
2. Enable **Message Content Intent** in the bot's Privileged Gateway Intents
3. Generate an invite URL via **OAuth2 → URL Generator** with `bot` scope + message/channel permissions
4. Install the plugin: `/plugin install discord@claude-plugins-official`
5. Configure: `/discord:configure <token>`
6. Restart: `claude --channels plugin:discord@claude-plugins-official`
7. DM your bot to get a pairing code, then `/discord:access pair <code>`

---

## Practical Use Cases

### 1. Remote Code Review

You're in a meeting and your colleague asks about a function. From your phone:
> "Hey, what does the `processPayment` function in `billing/index.ts` do?"

Claude reads the file, understands the context, and replies back to Telegram — all while your session runs on your development machine.

### 2. Background Task Monitoring

Start a long-running migration or test suite, then step out. Set up Claude to notify you via Telegram when it finishes or hits an error. You can even ask follow-up questions from your phone.

### 3. CI/CD Webhook Integration

Build a custom channel that receives webhook events from your CI pipeline. When a build fails, the event arrives in your Claude Code session and Claude can immediately investigate the logs, suggest fixes, and even apply them.

### 4. Always-On AI Assistant

Run Claude in a persistent `tmux` or `screen` session on a server. Keep it connected to your Telegram bot. Now you have an AI assistant that has access to your codebase and files, reachable from your phone 24/7.

---

## Security Considerations

Channels use a **sender allowlist** for security:

- Only IDs you've explicitly paired can push messages into your session
- Messages from unknown senders are silently dropped
- You control which channel plugins are active per session with `--channels`
- The allowlist also gates **permission relay** — anyone who can send messages can approve or deny tool-use prompts remotely, so only pair accounts you trust completely

For unattended use, you can use `--dangerously-skip-permissions` to bypass tool-use prompts, but only in trusted, controlled environments.

---

## Enterprise Controls

For **Team and Enterprise** Claude Code users, channels are **disabled by default** and must be explicitly enabled by an organization admin:

> Claude.ai → Admin Settings → Claude Code → Channels → Enable

Individual users can then opt in per session with `--channels`.

---

## Research Preview Limitations

Channels are currently in **research preview** and have some limitations:

- Requires `--channels` flag to activate per session (not persistent)
- Only accepts plugins from Anthropic's official allowlist during the preview
- The flag syntax and protocol may change based on feedback
- Events only arrive while the session window is open — no background daemon mode yet

To test a custom channel you're building, use `--dangerously-load-development-channels`.

---

## Quick Demo: Fakechat

Before connecting a real chat platform, try the built-in demo:

```bash
/plugin install fakechat@claude-plugins-official
claude --channels plugin:fakechat@claude-plugins-official
```

Then open [http://localhost:8787](http://localhost:8787) in your browser. Type a message and watch it arrive in your Claude Code session in real time.

---

## What's Next

Channels open up a new paradigm for working with Claude Code: instead of being tethered to your terminal, you can **stay connected to your AI coding session from anywhere**. As the research preview evolves, expect:

- More platform plugins (Slack, SMS, etc.)
- Persistent background session support
- Richer webhook receiver templates
- Tighter permission controls

For now, if you're regularly running long Claude Code sessions and want to stay in the loop from your phone, Channels + Telegram is worth setting up today.

---

**Resources**
- [Claude Code Channels Documentation](https://docs.anthropic.com/en/docs/claude-code/channels)
- [Official Plugin Repository](https://github.com/anthropics/claude-plugins-official)
- [Channels Reference (build your own)](https://docs.anthropic.com/en/channels-reference)
- [Claude Code GitHub Issues](https://github.com/anthropics/claude-code/issues)
