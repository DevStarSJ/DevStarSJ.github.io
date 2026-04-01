---
layout: subsite-post
title: "Claude Code's 7 Execution Modes and Coordinator Multi-Agent System: The Complete Developer Guide"
date: 2026-04-01 14:00:00
category: coding
tags: [claude, claude-code, ai, multi-agent, coordinator, automation, developer-tools, mcp]
header-img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop"
description: "A practical developer guide to Claude Code's 7 execution modes — when to use each, how Coordinator multi-agent mode enables parallel work, hook system automation, and Bridge for remote sessions."
---

**Claude Code** isn't just an AI chatbot in your terminal. It's a multi-mode agentic platform that can run interactively, headlessly in scripts, as a multi-agent coordinator, as a background daemon, or as a cloud-connected remote session. Understanding which mode to reach for — and how to configure each — is what separates power users from people just typing questions.

This guide focuses on the practical developer angle: when to use each execution mode, how Coordinator mode enables parallel AI work, how hooks let you automate around Claude Code, and how Bridge mode enables remote and multi-device workflows.

![Claude Code terminal in action](https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800&auto=format&fit=crop)
*Photo by [Gabriel Heinzer](https://unsplash.com/@6heinz3r) on Unsplash*

---

## Why Execution Modes Matter

Claude Code is compiled as a single ~800KB monolith (`main.tsx`) that parses your CLI arguments at startup and routes into completely different code paths. The mode you choose determines:

- Whether a UI is initialized at all
- Whether AI responses stream interactively or batch silently
- Whether one AI agent or many are working simultaneously
- Whether the session lives locally or connects to the cloud

The wrong mode for the job costs you performance, interactivity, or automation capability. The right mode makes Claude Code feel native to whatever you're doing.

---

## The 7 Execution Modes

### 1. REPL — The Default Interactive Mode

**When to use**: Day-to-day coding assistance, exploring a codebase, iterative debugging.

This is what you get when you just type `claude` in your terminal. It drops you into a read-eval-print loop where you can ask questions, request edits, run commands, and have a full conversation with persistent context.

The REPL maintains a persistent Bash shell underneath — meaning `cd` commands persist between calls, environment variables you set stay set, and the shell's working directory follows your navigation. This is intentional design, not a quirk.

**Key features in REPL mode**:
- Full React + Ink terminal UI with DiffViewer and PermissionPrompts
- All 80+ slash commands available (`/clear`, `/compact`, `/plan`, `/mcp`, etc.)
- Real-time cost display (tokens + USD)
- Auto-compact when context hits 95% of window

**Pro tip**: Use `/plan` to switch to planning mode before a risky refactor. Claude will lay out exactly what it intends to do — you review, then approve or redirect.

---

### 2. Headless — Pipe It Into Everything

**When to use**: CI/CD pipelines, cron jobs, shell scripts, automated code review.

Activate with the `-p` flag:

```bash
# Security review a diff
git diff HEAD~1 | claude -p "Review this diff for security vulnerabilities"

# Auto-generate a changelog entry
git log --oneline -20 | claude -p "Write a changelog entry from these commits"

# Pipe into another tool
claude -p "List all files with TODO comments and their line numbers" | tee todos.txt
```

No UI is initialized. Output goes directly to stdout/stderr. Exit code reflects success/failure. It's a proper Unix citizen.

**Key differences from REPL**:
- Single prompt in, result out — no interactive loop
- No React/Ink UI (lower overhead)
- Output is clean text, suitable for piping
- Permissions are auto-approved by default in headless mode (be careful with destructive ops)

**In CI/CD**: Combine with the hook system (below) to enforce that every automated Claude Code run logs its actions to an audit trail.

---

### 3. Coordinator — Parallel Multi-Agent Execution

**When to use**: Large refactors across many files, parallel task execution, anything that would exceed a single context window.

Coordinator mode is Claude Code's most powerful and architecturally complex feature. It implements a **Leader/Worker pattern**:

```
Your Request
    ↓
Leader Agent (task decomposition)
    ↓
┌─────────────────────────────┐
│ Worker 1 │ Worker 2 │ ...N  │
│ (auth)   │ (routes) │ (api) │
└─────────────────────────────┘
    ↓
Leader Agent (synthesis)
    ↓
Your Result
```

The Leader receives your task, analyzes it, and breaks it into independent subtasks. Each subtask goes to a dedicated Worker — a full, isolated Claude Code instance with its own context window. Workers run in parallel, each with access to the complete tool system (Bash, file ops, web fetch, etc.). The Leader collects results and synthesizes the final output.

**Communication is structured**: Workers receive JSON task definitions and return JSON results. No free-form text between agents — structured data only. This prevents the "telephone game" degradation that plagues naive multi-agent systems.

**Real-world use cases**:

*Large-scale refactor*: "Migrate all API calls from v1 to v2 endpoints across this 50-file codebase." The Leader assigns groups of files to Workers. Each Worker handles its files independently. Total time: roughly the time for one file, not 50.

*Parallel test generation*: "Write unit tests for every module in `src/`." Workers are assigned one module each. Run concurrently.

*Multi-language documentation*: "Translate all API docs into Spanish, French, and German." Three Workers, three languages, simultaneous execution.

**Configuration**: Set the maximum worker count in your settings. More workers = more API calls in parallel = higher throughput but also higher cost per minute.

---

### 4. Bridge — Local Terminal, Remote Control

**When to use**: Multi-device workflows, mobile oversight, shared pair programming sessions.

Bridge mode establishes a **WebSocket connection** between your local Claude Code terminal and Anthropic's CCR (Claude Code Remote) cloud infrastructure. The local machine remains the execution environment; the cloud provides the connectivity layer.

```bash
claude --bridge  # Starts Bridge mode, prints a session URL
```

**Up to 32 parallel sessions** can be bridged simultaneously — useful for teams where multiple people need to oversee or interact with running Claude Code sessions.

**Practical scenarios**:

*Mobile oversight*: You've kicked off a large refactor on your laptop before a meeting. Open the session URL on your phone. You can watch progress, answer Claude's questions, or redirect it — all from your phone while in the meeting.

*Device handoff*: Start debugging at the office, hand off the URL to yourself for a continued session at home — full context preserved.

*Pair programming*: Share the session URL with a colleague. You both see the same session. Either person can interact.

**Note**: Bridge mode requires a CCR-enabled Anthropic account. Standard API keys work for local execution, but Bridge requires the additional CCR entitlement.

---

### 5. Kairos — Scheduled AI Tasks

**When to use**: Recurring code maintenance tasks, nightly reviews, automated housekeeping.

Kairos mode is Claude Code's answer to cron-but-smarter. Rather than scheduling a static shell script, you schedule a Claude Code task — a natural language description of what you want done.

```bash
claude --kairos "Every Monday at 9am: review any TODO comments added this week and create GitHub issues"
```

Kairos runs the task at the scheduled time with full Claude Code capabilities — it can read files, run tests, make commits, create issues, whatever the task requires.

**Use cases**:
- Weekly "dependency audit" — check for outdated packages, create update PRs
- Nightly "documentation drift" — compare code to docs, flag discrepancies
- Daily "test health" — run the full test suite, summarize failures in a Slack message (via PostToolUse hook)

---

### 6. Daemon — Background Service for Editor Integrations

**When to use**: Editor plugin integrations, IDE extensions, scenarios where you're making many rapid requests.

Daemon mode runs Claude Code as a persistent background service that accepts requests over a local socket or IPC channel. The key benefit: the startup cost (loading the monolith, initializing MCP connections, fetching context) is paid once, amortized across many requests.

For an editor extension making 50 requests per coding session, the difference between "start a new process per request" and "send to persistent daemon" is substantial — both in latency and resource usage.

---

### 7. Viewer — Read-Only Session Observer

**When to use**: Debugging a running session, auditing AI actions, demos.

Viewer mode connects to an active Claude Code session and displays what's happening — tool calls, AI responses, permission prompts — but cannot send commands or interact. Think of it as `tail -f` for a Claude Code session.

**Use cases**:
- Auditing: security team watching what Claude Code is doing in a sensitive environment
- Debugging: understanding why a coordinator session isn't behaving as expected
- Demos: showing Claude Code in action without risking accidental commands

---

## The Hook System: Automation Superpowers

Hooks are the overlooked power feature of Claude Code. They let you inject shell commands at key points in the execution lifecycle — automating around Claude without modifying any Claude Code code.

**4 hook types**:

### `PreToolUse`
Runs before any tool executes. Can abort the tool by returning non-zero exit code.

```json
{
  "hooks": {
    "PreToolUse": "echo '{\"tool\": \"$TOOL_NAME\", \"time\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}' >> ~/.claude/audit.log"
  }
}
```

This logs every single tool call to an audit trail. Useful for compliance environments.

**Abort example**: Block any `git push` from Claude Code unless a JIRA ticket is referenced:

```bash
#!/bin/bash
# pre-push-check.sh
if [ "$TOOL_NAME" = "Bash" ] && echo "$TOOL_INPUT" | grep -q "git push"; then
  if ! echo "$TOOL_INPUT" | grep -qE "PROJ-[0-9]+"; then
    echo "ERROR: git push requires a JIRA ticket reference"
    exit 1
  fi
fi
```

### `PostToolUse`
Runs after tool completion. Inspect results and trigger external actions.

```json
{
  "hooks": {
    "PostToolUse": "~/.claude/scripts/notify-on-write.sh"
  }
}
```

### `UserPromptSubmit`
Runs before your message reaches the AI. Can add context automatically.

```bash
#!/bin/bash
# Automatically append current git branch to every prompt
echo "Current branch: $(git rev-parse --abbrev-ref HEAD)"
```

### `Stop`
Runs when the session ends. Clean up, save summaries, send notifications.

```json
{
  "hooks": {
    "Stop": "~/.claude/scripts/session-summary.sh | mail -s 'Claude Code Session Summary' you@company.com"
  }
}
```

Hooks are defined in `~/.claude/settings.json` (global) or `.claude/settings.json` (project-level). Project hooks are committed with the code, so your whole team gets them.

---

## Permission Modes: Matching Trust to Context

One setting that pairs closely with your execution mode choice is the **permission mode**:

| Mode | Interactive? | Auto-approves safe ops? | Requires confirmation for dangerous ops? |
|------|-------------|------------------------|------------------------------------------|
| Default | Yes | No | Yes |
| Auto | Yes | Yes | Yes |
| Plan | Yes | N/A | N/A (no execution) |
| Bypass (`--dangerously-skip-permissions`) | No | Yes | No |

For **headless CI/CD**: use Bypass mode only inside a properly sandboxed container. The flag name is deliberately alarming — heed the warning.

For **interactive REPL**: Default or Auto depending on your comfort level. Auto is great for "I trust Claude with reads/writes but want to see any shell execution."

For **code review before a big refactor**: Plan mode. Review the plan, then re-run with Auto or Default to execute.

---

## Quick Reference: Choosing Your Mode

| Scenario | Mode | Key Flag |
|----------|------|----------|
| Daily coding assistance | REPL | (none) |
| CI/CD automation | Headless | `-p` |
| Large multi-file refactor | Coordinator | `--coordinator` |
| Remote/mobile oversight | Bridge | `--bridge` |
| Recurring maintenance | Kairos | `--kairos` |
| Editor plugin backend | Daemon | `--daemon` |
| Auditing a session | Viewer | `--viewer` |

---

## Conclusion

Claude Code's 7 execution modes aren't arbitrary — they're a carefully designed solution space covering every major developer workflow: interactive, automated, parallel, remote, scheduled, persistent, and read-only. Combining the right mode with hooks and the appropriate permission level turns Claude Code from a chatbot into an automated engineering collaborator.

The Coordinator mode in particular represents a step-change in what AI coding assistants can do: instead of one AI in one context window, you get a fleet of AIs working in parallel, each specialized, their outputs synthesized by a Leader. For large codebases and complex tasks, this is the difference between "AI-assisted" and "AI-accelerated."

---

*Analysis based on Claude Code source code as of 2026-03-31. Source: wikidocs.net/338204 — "별첨 91. 클로드 코드 소스 코드 분석서".*
