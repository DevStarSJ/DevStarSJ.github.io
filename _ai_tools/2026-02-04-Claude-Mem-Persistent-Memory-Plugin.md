---
layout: ai-tools-post
title: "Claude-Mem: Give Claude Code Permanent Memory Across Sessions"
description: "Complete guide to Claude-Mem, the plugin that gives Claude Code persistent memory. Auto-captures sessions, compresses context with AI, and injects relevant history into future sessions. ~10x token efficiency."
category: coding
tags: [claude-code, claude-mem, ai-memory, context-engineering, developer-tools, plugin]
date: 2026-02-04
read_time: 12
header-img: "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=1200"
---

# Claude-Mem: Give Claude Code Permanent Memory Across Sessions

Every Claude Code user knows the pain. You spend hours building something, close the session, open a new one, and Claude has **zero memory** of what you did. You explain the same architecture, point to the same files, re-establish the same context.

**Claude-Mem fixes this.** It's a plugin that automatically captures everything Claude does, compresses it with AI, and injects relevant context back into future sessions. No manual intervention. No copy-pasting. Just continuity.

![AI Memory](https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800)
*Photo by [Shubham Dhage](https://unsplash.com/@theshubhamdhage) on Unsplash*

## The Problem: Sessions Are Ephemeral

Claude Code is powerful. But every session starts from scratch:

- 🧠 **No memory** of previous sessions
- 📄 You re-explain project structure every time
- 🔄 Context is lost when the window closes
- 💸 Tokens wasted on re-establishing knowledge

Some developers work around this with `CLAUDE.md` files or manual context docs. But these are static — you have to maintain them yourself, and they can't capture the nuances of actual work sessions.

## The Solution: Claude-Mem

[Claude-Mem](https://github.com/thedotmack/claude-mem) is an open-source plugin (AGPL-3.0) by [Alex Newman](https://github.com/thedotmack) that gives Claude Code persistent memory through automatic capture and AI-powered compression.

### Key Features

| Feature | Description |
|---------|-------------|
| 🧠 **Persistent Memory** | Context survives across sessions automatically |
| 📊 **Progressive Disclosure** | Layered memory retrieval — fetch only what's needed |
| 🔍 **Semantic Search** | Query your project history with natural language |
| 🖥️ **Web Viewer UI** | Real-time memory stream at `localhost:37777` |
| 🔒 **Privacy Control** | Tag-based exclusion for sensitive content |
| ⚙️ **Zero Configuration** | Works out of the box after install |
| 🧪 **Beta Channel** | Experimental features like Endless Mode |

## Installation (2 Commands)

Open a Claude Code session and run:

```
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem
```

Restart Claude Code. Done. The plugin automatically:

- Downloads prebuilt binaries (no compilation)
- Installs all dependencies including SQLite
- Configures lifecycle hooks
- Auto-starts the worker service on first session

### System Requirements

- **Node.js:** 18.0.0+
- **Claude Code:** Latest version with plugin support
- **Bun:** Auto-installed if missing
- **SQLite 3:** Bundled

## How It Works

Claude-Mem hooks into Claude Code's lifecycle at 5 key points:

### The Session Lifecycle

```
┌──────────────────────────────────────────────┐
│ 1. Session Starts → Context Hook             │
│    Injects context from previous sessions    │
├──────────────────────────────────────────────┤
│ 2. User Types Prompt → New Session Hook      │
│    Creates session in database               │
├──────────────────────────────────────────────┤
│ 3. Claude Uses Tools → PostToolUse Hook      │
│    Captures every tool execution (100+ times)│
├──────────────────────────────────────────────┤
│ 4. Claude Stops → Summary Hook               │
│    Generates session summary                 │
├──────────────────────────────────────────────┤
│ 5. Session Ends → Cleanup Hook               │
│    Marks session complete                    │
└──────────────────────────────────────────────┘
```

### What Gets Captured

Every tool usage is recorded:

- **Read** — file reads and content access
- **Write** — new file creation
- **Edit** — file modifications
- **Bash** — command executions
- **Glob** — file pattern searches
- **Grep** — content searches
- All other Claude Code tools

### How It's Processed

The worker service (running on Bun at port 37777) processes each observation using the Claude Agent SDK and extracts:

- **Title** — brief description of what happened
- **Narrative** — detailed explanation
- **Facts** — key learnings as bullet points
- **Concepts** — relevant tags and categories
- **Type** — classification (decision, bugfix, feature, refactor, discovery)
- **Files** — which files were read or modified

### Session Summaries

When Claude finishes responding, a summary is automatically generated:

- **Request** — what you asked for
- **Investigated** — what Claude explored
- **Learned** — key discoveries
- **Completed** — what was accomplished
- **Next Steps** — what to do next

## Progressive Disclosure: The Smart Part

This is where Claude-Mem really shines. Traditional approaches dump all context upfront — wasting tokens on irrelevant history. Claude-Mem uses a **3-layer progressive disclosure** strategy:

### Layer 1: Compact Index (~800 tokens)

At session start, Claude sees a lightweight index:

```
### Feb 3, 2026

| ID    | Time    | T  | Title                          | Tokens |
|-------|---------|----|--------------------------------|--------|
| #2586 | 2:15 PM | 🟡 | Fixed auth middleware timeout   | ~105   |
| #2587 | 2:30 PM | 🟢 | Added rate limiting to API      | ~155   |
| #2589 | 3:00 PM | 🔴 | CORS gotcha with credentials    | ~80    |
```

Each observation shows what it is and how much it costs to retrieve.

### Layer 2: On-Demand Details (MCP Tools)

When Claude needs more context, it fetches specific observations:

```javascript
// Step 1: Search for relevant observations
search(query="authentication bug", type="bugfix", limit=10)

// Step 2: Get full details for relevant IDs only
get_observations(ids=[2586, 2589])
```

### Layer 3: Source Code Access

If needed, Claude reads original source files directly.

### The Token Math

| Approach | Tokens Used | Relevant |
|----------|-------------|----------|
| **Traditional (dump everything)** | ~35,000 | ~6% |
| **Claude-Mem (progressive)** | ~920 | ~100% |

That's roughly **~10x more efficient** token usage. Your context window stays clean for actual work.

### Observation Type Icons

Claude-Mem categorizes observations with visual markers:

| Icon | Type | Description |
|------|------|-------------|
| 🎯 | session-request | User's original goal |
| 🔴 | gotcha | Critical edge case or pitfall |
| 🟡 | problem-solution | Bug fix or workaround |
| 🔵 | how-it-works | Technical explanation |
| 🟢 | what-changed | Code/architecture change |
| 🟣 | discovery | Learning or insight |
| 🟠 | why-it-exists | Design rationale |
| 🟤 | decision | Architecture decision |
| ⚖️ | trade-off | Deliberate compromise |

## Configuration

Settings live in `~/.claude-mem/settings.json` (auto-created on first run):

```json
{
  "CLAUDE_MEM_MODEL": "sonnet",
  "CLAUDE_MEM_PROVIDER": "claude",
  "CLAUDE_MEM_CONTEXT_OBSERVATIONS": 50,
  "CLAUDE_MEM_WORKER_PORT": 37777,
  "CLAUDE_MEM_LOG_LEVEL": "INFO"
}
```

### Key Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `CLAUDE_MEM_MODEL` | `sonnet` | AI model for processing (haiku/sonnet/opus) |
| `CLAUDE_MEM_PROVIDER` | `claude` | Provider: claude, gemini, or openrouter |
| `CLAUDE_MEM_CONTEXT_OBSERVATIONS` | `50` | Observations injected per session (1-200) |
| `CLAUDE_MEM_WORKER_PORT` | `37777` | Worker service port |
| `CLAUDE_MEM_SKIP_TOOLS` | (several) | Tools to exclude from capture |

### Using Alternative Providers

Want to save on API costs? Claude-Mem supports **Gemini** (with a free tier!) and **OpenRouter** (100+ models):

```json
{
  "CLAUDE_MEM_PROVIDER": "gemini",
  "CLAUDE_MEM_GEMINI_API_KEY": "your-key-here",
  "CLAUDE_MEM_GEMINI_MODEL": "gemini-2.5-flash-lite"
}
```

## Web Viewer UI

Claude-Mem includes a real-time web viewer at `http://localhost:37777`:

- **Live memory stream** via Server-Sent Events
- **Infinite scroll** with automatic deduplication
- **Project filtering** across multiple repos
- **Settings panel** with live Terminal Preview
- **Version channel switching** (stable ↔ beta)

The viewer shows exactly what context will be injected at the start of your next session.

## Privacy Controls

Claude-Mem captures everything by default, but you can exclude sensitive content:

- Use **privacy tags** in your code/comments to prevent capture
- Configure `CLAUDE_MEM_SKIP_TOOLS` to exclude specific tool types
- Filter by observation type in context injection settings
- All data stays local in `~/.claude-mem/claude-mem.db`

## The Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript (ES2022) |
| Runtime | Node.js 18+ / Bun |
| Database | SQLite 3 + FTS5 |
| Vector Store | ChromaDB (optional, semantic search) |
| HTTP Server | Express.js |
| Real-time | Server-Sent Events |
| UI | React + TypeScript |
| AI SDK | @anthropic-ai/claude-agent-sdk |

## Claude-Mem vs. Manual Context Files

| Feature | Manual (CLAUDE.md) | Claude-Mem |
|---------|-------------------|------------|
| Capture | Manual | Automatic |
| Compression | None | AI-powered |
| Search | grep/find | Semantic + FTS5 |
| Token Efficiency | Low (dumps everything) | High (progressive disclosure) |
| Maintenance | You do it | Self-maintaining |
| Cross-session | Static file | Dynamic, session-aware |
| Privacy | Manual redaction | Tag-based exclusion |

## Practical Tips

### 1. Let It Run

Don't micro-manage Claude-Mem. Install it and forget about it. The magic is in the automation.

### 2. Check the Web Viewer

Visit `localhost:37777` periodically to see what's being captured. It's surprisingly insightful to see your work patterns.

### 3. Tune the Observation Count

If Claude Code feels slow at startup, reduce `CLAUDE_MEM_CONTEXT_OBSERVATIONS` from 50 to 25. If you need more history, increase it up to 200.

### 4. Use Natural Language Search

Don't memorize search syntax. Just ask Claude naturally:

> "What bugs did we fix last week?"
> "How did we implement the auth middleware?"
> "Show me recent changes to worker-service.ts"

Claude automatically invokes the MCP search tools.

### 5. Try the Beta Channel

Endless Mode (available in beta) uses a biomimetic memory architecture for extended sessions. Switch via the web viewer settings.

## Who Should Use This?

**Use Claude-Mem if you:**
- Use Claude Code regularly for the same projects
- Hate re-explaining project context every session
- Want to search your coding history semantically
- Care about token efficiency

**Skip it if you:**
- Only use Claude Code occasionally
- Work on many unrelated one-off projects
- Prefer manual context management

## Getting Started

```
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem
```

Two commands. That's it. Your next Claude Code session will already start building memory.

---

**Links:**
- [GitHub Repository](https://github.com/thedotmack/claude-mem)
- [Documentation](https://docs.claude-mem.ai)
- [Discord Community](https://discord.com/invite/J4wttp9vDu)
- [Twitter/X](https://x.com/Claude_Memory)
