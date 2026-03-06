---
layout: post
title: "Connecting OpenClaw to AWS Bedrock: A Real-World Setup Guide"
subtitle: "How to switch from Gemini API to Claude Sonnet 4.6 via AWS Bedrock — including all the gotchas"
date: 2026-03-06 00:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200"
catalog: true
tags:
  - OpenClaw
  - AWS
  - Bedrock
  - Claude
  - AI
---

This guide walks through how to connect OpenClaw to AWS Bedrock and run Claude Sonnet 4.6 as your primary model on macOS. Using Bedrock lets you leverage your AWS account's capacity with stable, reliable inference — and once it's set up, it just works.

The tricky part isn't the AWS side. It's knowing exactly how OpenClaw manages its config, because a few things will silently undo your work if you're not careful.

![AWS Bedrock Console](https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800)
*Photo by NASA on Unsplash*

## Environment

- macOS (gateway running as a launchd LaunchAgent)
- OpenClaw 2026.2.17
- AWS account with Bedrock IAM access
- `~/.aws/credentials` with a `[default]` profile already configured

---

## Prerequisites: Enable AWS Bedrock Model Access

Head to the AWS Console → Bedrock → **Model Access** and enable access for Claude Sonnet 4.6. Also enable the **Cross-region inference profile** while you're there.

Verify it works from the CLI:

```bash
aws bedrock-runtime converse \
  --model-id "global.anthropic.claude-sonnet-4-6" \
  --messages '[{"role":"user","content":[{"text":"hi"}]}]'
```

If you get a valid response, you're ready to proceed.

---

## Step 1: Fully Stop OpenClaw

This is non-negotiable. If OpenClaw's gateway is running when you edit `openclaw.json`, it will detect the change and immediately overwrite your edits with its own in-memory config.

```bash
launchctl bootout gui/$UID/ai.openclaw.gateway
pkill -9 -f "openclaw-gateway"
sleep 2
ps aux | grep openclaw | grep -v grep
```

Make sure no openclaw process is running before you continue.

---

## Step 2: Add AWS Environment Variables to the LaunchAgent plist

Because OpenClaw's gateway runs under macOS launchd, environment variables you `export` in your shell are **not** inherited by the process. You have to inject them directly into the plist file.

Open `~/Library/LaunchAgents/ai.openclaw.gateway.plist` and add the following inside the `<dict>` block under `EnvironmentVariables`:

```xml
<key>AWS_REGION</key>
<string>us-east-1</string>
<key>AWS_DEFAULT_REGION</key>
<string>us-east-1</string>
<key>AWS_ACCESS_KEY_ID</key>
<string>YOUR_ACCESS_KEY_ID</string>
<key>AWS_SECRET_ACCESS_KEY</key>
<string>YOUR_SECRET_ACCESS_KEY</string>
```

> ⚠️ **Do not set both `AWS_PROFILE` and `AWS_ACCESS_KEY_ID`** — they conflict with each other. Use one or the other.

> ⚠️ If `~/.openclaw/.env` contains `AWS_PROFILE=default`, that will conflict too. Remove it.

---

## Step 3: Edit openclaw.json Directly

**Never use the `openclaw config` wizard.** Running the wizard overwrites your entire `openclaw.json` with defaults, wiping everything you've configured.

Open `~/.openclaw/openclaw.json` directly and merge in the following:

```json
{
  "models": {
    "bedrockDiscovery": {
      "enabled": true,
      "region": "us-east-1"
    },
    "providers": {
      "amazon-bedrock": {
        "baseUrl": "https://bedrock-runtime.us-east-1.amazonaws.com",
        "api": "bedrock-converse-stream",
        "auth": "aws-sdk",
        "models": [
          {
            "id": "global.anthropic.claude-sonnet-4-6",
            "name": "Claude Sonnet 4.6 (Bedrock Global)",
            "reasoning": false,
            "input": ["text", "image"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 200000,
            "maxTokens": 8192
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "amazon-bedrock/global.anthropic.claude-sonnet-4-6",
        "fallbacks": ["anthropic/claude-sonnet-4-6", "anthropic/claude-haiku-4-5"]
      },
      "models": {
        "amazon-bedrock/global.anthropic.claude-sonnet-4-6": {},
        "anthropic/claude-sonnet-4-6": {},
        "anthropic/claude-haiku-4-5": {}
      }
    }
  }
}
```

---

## Step 4: Lock the Config File (Critical!)

```bash
chmod 444 ~/.openclaw/openclaw.json
```

If you skip this step, the gateway will overwrite your config on the next restart. The read-only flag prevents this — any attempt by the gateway or UI to save settings will simply fail.

When you need to make changes in the future, follow this sequence:

```
launchctl bootout → pkill → chmod 644 → edit JSON → chmod 444 → launchctl bootstrap
```

---

## Step 5: Restart the Gateway and Verify

```bash
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/ai.openclaw.gateway.plist
sleep 5
openclaw models list
```

A successful output looks like:

```
amazon-bedrock/global.anthropic.claude-sonnet-4-6  text+image  195k  default,configured
```

If you see `default,configured` — you're done.

---

## Common Pitfalls

### 1. Never run `openclaw config` wizard
It will reset your entire `openclaw.json` to factory defaults.

### 2. OpenClaw overwrites config while running
Always fully stop the gateway before making any changes to `openclaw.json`.

### 3. The Control UI also overwrites the config
Locking the file with `chmod 444` causes any UI save attempt to fail gracefully, protecting your config.

### 4. Don't add Bedrock to `auth.profiles`
The `aws-sdk` auth method belongs only in `models.providers.amazon-bedrock.auth`. Don't add it to the top-level auth profiles section.

### 5. Session model overrides take precedence
Check `sessions.json` for any `modelOverride` or `providerOverride` fields. Remove them if they're pointing to a different model.

### 6. `bedrockDiscovery` needs gateway-level environment variables
The discovery feature reads AWS credentials from the process environment — which means they must be in the launchd plist, not just your shell.

---

## Summary Checklist

- [ ] Enable Claude Sonnet 4.6 access in AWS Bedrock (Model Access)
- [ ] Fully stop OpenClaw gateway (`launchctl bootout`)
- [ ] Add AWS credentials to the LaunchAgent plist
- [ ] Merge Bedrock provider config into `openclaw.json`
- [ ] Lock the file: `chmod 444 ~/.openclaw/openclaw.json`
- [ ] Restart gateway: `launchctl bootstrap`
- [ ] Verify: `openclaw models list` shows `default,configured`
- [ ] Remove any session model overrides if present

---

The most common failure mode is the gateway silently overwriting your config. Once you know the pattern — stop → edit → lock → restart — the whole thing is straightforward.
