---
layout: post
title: "Claude Code: Keep Claude Models on Your Subscription, Route Everything Else to OpenRouter"
subtitle: "One environment variable decides who pays for every request. Split requests by model name and subscription and pay-as-you-go can coexist"
description: "Setting ANTHROPIC_BASE_URL to a gateway bills Claude model calls to your own pay-as-you-go key too. A 60-line local proxy routes claude-* to your subscription and everything else to OpenRouter, with the reasoning behind each block."
date: 2026-10-21 10:30:00 +0900
author: "Yun SeokJoon"
lang: en
alt_url: "/ai/2026/10/21/claude-code-subscription-payg-split-proxy/"
header-img: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&q=80"
header-mask: 0.4
catalog: true
categories: ai
tags:
  - AI
  - Coding Agent
  - Claude Code
  - OpenRouter
  - LLM
  - DevOps
  - Cost Optimization
keywords: "Claude Code, ANTHROPIC_BASE_URL, OpenRouter, Claude subscription, LLM gateway, pay-as-you-go, local proxy, model routing"
---

## Background: one environment variable decides the billing path

Claude Code reads `ANTHROPIC_BASE_URL` before every API call. Empty means `api.anthropic.com`; set means **every** request goes to that address. The problem is the word "every".

```zsh
# A common setup: send everything to a gateway
export ANTHROPIC_BASE_URL=https://<gateway-host>
export ANTHROPIC_AUTH_TOKEN=<gateway-personal-key>
export ANTHROPIC_MODEL=<cheap-model>
export ANTHROPIC_DEFAULT_OPUS_MODEL=<cheap-model>
export ANTHROPIC_DEFAULT_SONNET_MODEL=<cheap-model>
export ANTHROPIC_DEFAULT_HAIKU_MODEL=<cheap-model>
```

This is fine for everyday work: the default model is cheap, so the bulk of traffic is cheap too. What it misses is the moment you **switch models inside a session** with `/model`.

| What you do | What actually happens |
| --- | --- |
| Start with `ccg`, use the default model | Gateway → pay-as-you-go on your key |
| Pick a Claude model with `/model` | Gateway → **pay-as-you-go on your key** |
| A subagent starts with a Claude model | Gateway → **pay-as-you-go on your key** |
| What you intended | Claude models → **subscription** |

A gateway does not care where a request came from. Whatever key is in the header, whatever model name is in the body, the request is billed at the gateway's rates. Claude models are expensive per token, so one long session billed to a key instead of your subscription is a noticeable difference — the kind you discover from an invoice, not from a dashboard.

## The target: the model name decides the billing path

The rule I want is one line.

| Model name | Destination | Whose money |
| --- | --- | --- |
| `claude-*` (fable, opus, sonnet, haiku) | `api.anthropic.com` | **Subscription** (flat fee) |
| everything else (default `deepseek/...`) | `openrouter.ai` | **Pay-as-you-go** (personal key) |

Claude Code puts the model name in the request body, so reading that one field is enough to pick a destination. Something has to sit between Claude Code and the API to do that. That something is the proxy below.

### Why this shape

Before the setup, the reasoning — copying a config without the reasoning means you cannot re-decide when something changes.

**1. Flat fee and per-token pricing should be mixed deliberately.** A subscription is already paid for, so extra calls cost roughly nothing; pay-as-you-go charges per token. Put the expensive, quality-sensitive model on the flat fee and high-volume repetitive work on the cheaper per-token side. The reverse wastes money in both directions.

**2. Make the mistake structurally impossible.** Instead of remembering "picking a Claude model bills the subscription", split the path itself. Memory leaks; routing rules do not. The [previous post](/ai/2026/09/23/individual-as-a-team-llm-gateway/) argued for moving judgment out of sessions and into systems. On a personal laptop, this proxy is that system.

**3. Defaults belong to the environment.** Choosing `/model` in every session is a judgment that drifts session by session. Baking the default into the `ccg` function means a session started without thinking still starts on the intended billing path.

**4. Credentials belong in the Keychain, not files.** A pay-as-you-go key spends money the moment it leaks. In `~/.zshrc` it travels with every process that reads that file and every backup. In the Keychain it is read only when needed, and never lands in shell history or dotfiles.

### Why a 60-line proxy instead of LiteLLM

The [earlier post](/ai/2026/09/23/individual-as-a-team-llm-gateway/) used LiteLLM as a gateway, which is right at organization scale: multiple people's keys, quotas, audit logs, model catalogs, incident response.

A personal laptop has different requirements. What is needed is an `if`: model name starts with `claude` → A, otherwise → B. There is no reason to run a service, manage config files and install dependencies for that. Sixty lines of standard library is enough, and it is a size you can read and understand. If the requirements grow, move to LiteLLM then.

## Setup: the key goes in the Keychain only

Once, on macOS. Put your real key where `<your OpenRouter API key>` is, and **never write it anywhere else.**

```zsh
# Store in the Keychain (not as plaintext in a file)
security add-generic-password -U -a "$USER" -s openrouter-api-key -w '<your OpenRouter API key>'
```

`-s openrouter-api-key` is the name used to look the item up. `-U` updates an existing item with the same name, so the same command rotates the key. To read the stored value:

```zsh
security find-generic-password -s openrouter-api-key -w   # prints the key to the screen. Be careful.
```

After rotating a key, restart the proxy — it reads the key once at startup.

```zsh
pkill -f ccg-proxy
```

## The whole script

Paste into `~/.zshrc` and reload with `exec zsh`. The function is called `ccg`; rename it if you like.

```zsh
# ccg: default model on OpenRouter (pay-as-you-go), claude-* models on the subscription.
#   Claude Code → 127.0.0.1:8765 proxy → claude* model names go to api.anthropic.com (subscription token untouched),
#   everything else goes to OpenRouter (personal key from Keychain item openrouter-api-key). Log: ~/Library/Logs/ccg-proxy.log
#   Rotate the key: security add-generic-password -U -a "$USER" -s openrouter-api-key -w '<new key>' && pkill -f ccg-proxy
ccg() {
  local port=8765
  local default_model="deepseek/deepseek-v4.1-flash-1017"
  local log="$HOME/Library/Logs/ccg-proxy.log"

  if ! lsof -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; then
    local key
    key=$(security find-generic-password -s openrouter-api-key -w 2>/dev/null) || {
      echo "No openrouter-api-key in the Keychain. Store it first." >&2
      return 1
    }
    CCG_KEY="$key" nohup python3 - ccg-proxy >"$log" 2>&1 <<'PY' &!
import http.client, json, os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

KEY = os.environ.pop("CCG_KEY")
UPSTREAM = {"anthropic": ("api.anthropic.com", ""), "openrouter": ("openrouter.ai", "/api")}
HOP = {"host", "connection", "content-length", "transfer-encoding", "keep-alive"}

class Proxy(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_HEAD(self):  # Claude Code's connectivity check
        self.send_response(200)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _forward(self):
        body = self.rfile.read(int(self.headers.get("Content-Length") or 0))
        try:
            model = json.loads(body or b"{}").get("model") or ""
        except ValueError:
            model = ""

        headers = {k: v for k, v in self.headers.items() if k.lower() not in HOP}
        if model.startswith("claude"):
            host, prefix = UPSTREAM["anthropic"]
        else:
            host, prefix = UPSTREAM["openrouter"]
            for h in ("authorization", "x-api-key", "anthropic-beta",
                      "anthropic-version", "anthropic-dangerous-direct-browser-access"):
                headers.pop(h, None)
            headers["Authorization"] = "Bearer " + KEY
            headers["Content-Type"] = "application/json"

        conn = http.client.HTTPSConnection(host, timeout=600)
        conn.request(self.command, prefix + self.path, body=body or None, headers=headers)
        resp = conn.getresponse()
        self.log_message("%s %s %s -> %s %d", self.command, self.path, model or "-", host, resp.status)

        self.send_response(resp.status)
        for k, v in resp.getheaders():
            if k.lower() not in HOP:
                self.send_header(k, v)
        self.send_header("Transfer-Encoding", "chunked")
        self.end_headers()
        while chunk := resp.read1(65536):  # pass SSE streaming straight through
            self.wfile.write(b"%x\r\n%s\r\n" % (len(chunk), chunk))
            self.wfile.flush()
        self.wfile.write(b"0\r\n\r\n")
        conn.close()

    do_GET = do_POST = do_PUT = do_DELETE = _forward

ThreadingHTTPServer(("127.0.0.1", 8765), Proxy).serve_forever()
PY
    sleep 0.5
  fi

  env -u ANTHROPIC_AUTH_TOKEN -u ANTHROPIC_API_KEY \
    ANTHROPIC_BASE_URL="http://127.0.0.1:$port" \
    ANTHROPIC_MODEL="$default_model" \
    ANTHROPIC_DEFAULT_OPUS_MODEL="$default_model" \
    ANTHROPIC_DEFAULT_SONNET_MODEL="$default_model" \
    ANTHROPIC_DEFAULT_HAIKU_MODEL="$default_model" \
    claude --dangerously-skip-permissions "$@"
}
```

## Reading it block by block

No need for line-by-line; what matters is what each meaningful chunk is doing.

### ① Function header — settings in one place

```zsh
ccg() {
  local port=8765
  local default_model="deepseek/deepseek-v4.1-flash-1017"
  local log="$HOME/Library/Logs/ccg-proxy.log"
```

Port, default model and log path live at the top. Changing the model or hitting a port conflict means looking here only. The model ID must match a string in OpenRouter's catalog exactly. `local` keeps these values out of the global shell scope.

### ② Proxy liveness check — one proxy, many sessions

```zsh
  if ! lsof -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; then
```

If something is already listening on 8765, use it. Several terminals running `ccg` share a single proxy. Starting a fresh process each time causes port collisions and leaves zombie processes; `&!` detaches the background job so it survives the shell, which is exactly why the check has to come first.

### ③ Reading the key — refuse to start without one

```zsh
    local key
    key=$(security find-generic-password -s openrouter-api-key -w 2>/dev/null) || {
      echo "No openrouter-api-key in the Keychain. Store it first." >&2
      return 1
    }
```

Read the key into a local variable. If the lookup fails, print an error and stop. A proxy started without a key turns every request into a 401, and finding that out costs far more than these three lines. The key exists only in `$key`; it never reaches the screen or the log.

### ④ Injecting the proxy body — a heredoc on stdin

```zsh
    CCG_KEY="$key" nohup python3 - ccg-proxy >"$log" 2>&1 <<'PY' &!
```

`python3 -` means "read the script from standard input", and the heredoc right after it is that input — no separate Python file to manage. `nohup` keeps it alive after the shell exits; `&!` in zsh backgrounds the job and detaches it from the job table. The key is passed only as the `CCG_KEY` environment variable, and the Python side pops it immediately so it does not linger in the process environment.

### ⑤ Reading the model name — the only routing signal

```python
        body = self.rfile.read(int(self.headers.get("Content-Length") or 0))
        try:
            model = json.loads(body or b"{}").get("model") or ""
        except ValueError:
            model = ""
```

Read the whole body, pull the `model` field, and treat anything non-JSON or empty as "not claude". Nothing else about the request is interpreted. The moment a proxy starts understanding payloads, its maintenance surface grows fast.

### ⑥ The Claude branch — pass the subscription token through untouched

```python
        if model.startswith("claude"):
            host, prefix = UPSTREAM["anthropic"]
```

Models starting with `claude` go to `api.anthropic.com`. The important part is that **headers are not touched**: the auth header Claude Code sent is the subscription login token, and forwarding it as-is is what charges the subscription. No personal key is involved in this branch.

### ⑦ The other branch — swap the auth header

```python
        else:
            host, prefix = UPSTREAM["openrouter"]
            for h in ("authorization", "x-api-key", "anthropic-beta",
                      "anthropic-version", "anthropic-dangerous-direct-browser-access"):
                headers.pop(h, None)
            headers["Authorization"] = "Bearer " + KEY
            headers["Content-Type"] = "application/json"
```

Drop the subscription auth headers, attach the Keychain key instead. That is literally what "bill it pay-as-you-go" means. Claude-specific headers (`anthropic-beta`, `anthropic-version`) go too: OpenRouter can reject unknown headers with a 400, so keeping only what the destination understands is safer. `prefix` is `/api` because OpenRouter's Anthropic-compatible endpoint is `/api/v1/messages`, while Claude Code sends `/v1/messages`.

### ⑧ Streaming relay — forward, do not buffer

```python
        conn = http.client.HTTPSConnection(host, timeout=600)
        conn.request(self.command, prefix + self.path, body=body or None, headers=headers)
        resp = conn.getresponse()
        self.log_message("%s %s %s -> %s %d", self.command, self.path, model or "-", host, resp.status)
```

Send the request upstream and log status. That log line is the only window into "where did this go". The 600-second timeout is for long reasoning responses.

```python
        self.send_response(resp.status)
        for k, v in resp.getheaders():
            if k.lower() not in HOP:
                self.send_header(k, v)
        self.send_header("Transfer-Encoding", "chunked")
        self.end_headers()
        while chunk := resp.read1(65536):
            self.wfile.write(b"%x\r\n%s\r\n" % (len(chunk), chunk))
            self.wfile.flush()
```

Forward headers, then relay the body in 64KB chunks as they arrive. Claude Code renders responses as SSE, typing them out; a proxy that buffers until the end kills that feel and can time out on long responses. `read1` exists for this — it does not wait for the buffer to fill. Hop-by-hop headers (`Connection`, `Content-Length`, and friends in `HOP`) are filtered out because the proxy manages them itself.

### ⑨ Launching Claude — clean the environment first

```zsh
  env -u ANTHROPIC_AUTH_TOKEN -u ANTHROPIC_API_KEY \
    ANTHROPIC_BASE_URL="http://127.0.0.1:$port" \
    ANTHROPIC_MODEL="$default_model" \
    ...
    claude --dangerously-skip-permissions "$@"
```

`env -u` **removes** a variable before running. If `ANTHROPIC_AUTH_TOKEN` or `ANTHROPIC_API_KEY` is exported in the current shell, Claude Code uses that key instead of the subscription login — which would make branch ⑥ pointless. Remove them, then point `ANTHROPIC_BASE_URL` at the local proxy. All three `ANTHROPIC_DEFAULT_*_MODEL` values are set to the same model because Claude Code uses a different default per role; leaving any one behind leaks that role elsewhere. `"$@"` forwards `ccg --resume`, `ccg -c`, and the rest verbatim.

## Usage

```zsh
ccg                    # start a session on the default model (OpenRouter, pay-as-you-go)
ccg --resume           # arguments are passed through to claude
ccg -p "explain this function"   # one-shot runs follow the same rule
```

When you need a Claude model inside the session, pick it with `/model`. From the next request on, a `claude-*` name is in the body and the proxy sends it to `api.anthropic.com`.

Check where traffic went in the log:

```zsh
tail -f ~/Library/Logs/ccg-proxy.log
# POST /v1/messages deepseek/deepseek-v4.1-flash-1017 -> openrouter.ai 200
# POST /v1/messages claude-sonnet-5-5 -> api.anthropic.com 200
```

## Caveats

- **A subscription login is required.** Claude Code must be logged in with `/login`; otherwise the `claude-*` branch ends in a 401.
- **Exhausting the quota fails loudly.** Claude calls just fail. There is no automatic fallback to the personal key, and that is intentional: a fallback would spend money while hiding the fact that the quota ran out.
- **The function includes `--dangerously-skip-permissions`.** It is there to cut prompt round-trips in a personal environment. Remove just that flag if you do not want it.
- **Restart the proxy after rotating the key.** Forget `pkill -f ccg-proxy` and it keeps using the old key.
- **The proxy binds to 127.0.0.1 only.** Nothing external can reach it, but other processes on the same machine can use the port. That is the accepted scope on a personal laptop.
- **Model IDs follow OpenRouter's catalog.** Keep `default_model` to a string from that catalog; a typo produces a model-not-found error rather than a 404.

## Aside: subscription usage dropping while you do nothing

Separate from this setup: if usage drops while you are not running a session, check `claude-mem`. It spawns **background summarization sessions** to store conversation summaries, and those sessions spend your subscription. With sonnet as the default, one summary is not trivial.

```json
// ~/.claude-mem/settings.json
{ "CLAUDE_MEM_MODEL": "claude-haiku-5-5" }
```

Summary quality rarely needs sonnet, so dropping it to haiku makes a visible difference. Money saved by routing can leak back out through background sessions — same problem, different face.

## Summary

- Sending everything through one gateway bills requests **regardless of the model you chose** at that gateway's rates.
- So split the path: `claude-*` to the subscription, everything else pay-as-you-go.
- At organization scale LiteLLM is right; at personal scale one `if` and 60 lines are enough.
- Defaults live in a shell function; credentials live in the Keychain. Trust neither memory nor dotfiles.
- One log line tells you where every request went. An optimization you cannot observe is not an optimization.

This is the personal-laptop version of the argument in [the earlier post](/ai/2026/09/23/individual-as-a-team-llm-gateway/): move judgment into systems. And it points the same way as [the three things AI made cheap](/ai/2026/10/19/ai-made-three-things-cheap/): model choice should be a rule, not a preference.
