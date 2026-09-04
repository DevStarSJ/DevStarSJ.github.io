---
layout: post
title: "Claude Code Complete Architecture Analysis: 7 Execution Modes, 45+ Tools, Coordinator Multi-Agent, and 8 Design Patterns"
subtitle: "An in-depth technical breakdown of Claude Code's internals — from startup sequence to multi-agent coordination"
date: 2026-04-01 00:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - Claude
  - Claude Code
  - AI
  - Architecture
  - Multi-Agent
  - TypeScript
  - React
  - MCP
  - Developer Tools
categories: ai
---

# Claude Code Complete Architecture Analysis: 7 Execution Modes, 45+ Tools, Coordinator Multi-Agent, and 8 Design Patterns

Claude Code is Anthropic's AI-powered terminal coding assistant — and beneath its conversational surface lies a remarkably sophisticated engineering system. A source code analysis of the 2026-03-31 release reveals approximately **1,884 TypeScript + React files** composing a full-featured agentic platform. This post is a complete technical deep-dive into every major subsystem: execution modes, startup sequence, query loop, tool system, permission architecture, coordinator multi-agent, bridge system, hook system, memory system, UI layer, service layer, and the eight core design patterns that hold it all together.

---

## The Three Core Principles

Every architectural decision in Claude Code traces back to three guiding principles:

1. **Safety** — Dangerous operations are identified, blocked, or explicitly confirmed by the user. An AI classifier (not just regex) evaluates bash commands for risk.
2. **Performance** — Streaming responses, parallel tool execution, memoized context, lazy imports, and frame-throttled terminal rendering keep the experience fast.
3. **Extensibility** — Tools, skills, plugins, and the Model Context Protocol (MCP) allow Claude Code to be extended without modifying the core.

---

## The 4-Phase Execution Flow

At the highest level, Claude Code operates in four phases:

```
Startup  →  Query Loop  →  Tool Execution  →  Display
```

Every interaction—from typing a question to seeing a diff rendered in the terminal—passes through these phases. The subsystems described below implement each phase in depth.

---

## Phase 1: Startup Sequence (6 Steps)

The entire application is compiled into a **~800KB monolithic bundle** (`main.tsx`). This deliberate choice eliminates Node.js module resolution overhead at startup — a classic performance-over-modularity trade-off.

### Step 1: Parse CLI Arguments → Determine Execution Mode

The very first thing Claude Code does is parse `argv`. The result determines which of the 7 execution modes to enter (detailed in the next section). Flags like `-p` (headless), `--coordinator`, `--bridge`, and `--daemon` route to completely different code paths.

### Step 2: Load Configuration (Settings Hierarchy)

Configuration is loaded from four levels, each overriding the previous:

```
system defaults
  → ~/.claude/settings.json          (global user config)
    → .claude/settings.json          (project config)
      → session overrides            (runtime flags)
```

This layered approach means a team can enforce project-level settings (e.g., disallowing `--dangerously-skip-permissions`) while individual developers keep personal preferences in their global config.

### Step 3: Parallel I/O Prefetch

Rather than fetching context serially, Claude Code launches three async operations simultaneously:

- Reading `CLAUDE.md` (project instructions)
- Running `git status` to understand the repository state
- Collecting environment info (OS, shell, working directory, Node version)

This parallelism shaves hundreds of milliseconds from time-to-first-prompt.

### Step 4: Initialize Services

The service layer is instantiated: API client (with auth, retry logic, and streaming), MCP server connections, and the cost tracker (real-time token counting with per-model pricing).

### Step 5: Setup React/Ink UI or Headless Renderer

For interactive modes, Claude Code initializes a **React + Ink** terminal UI. For headless mode (`-p` flag), it skips the UI entirely and uses a lightweight stream renderer. This clean separation means headless mode has no UI overhead.

### Step 6: Enter Execution Mode

Finally, the chosen execution mode takes over. The startup sequence is complete.

---

## The 7 Execution Modes

One of Claude Code's most distinctive architectural features is its support for seven fundamentally different execution modes — each designed for a specific usage context.

### 1. REPL (Interactive Terminal)
The default mode. Presents a terminal REPL where users type natural language requests. The query loop runs continuously until the user exits. This is what most developers experience day-to-day.

### 2. Headless (Non-Interactive / Pipe Mode)
Activated with the `-p` flag. Accepts a single prompt, executes it, prints the result, and exits. Designed for scripting and automation:

```bash
# Pipe Claude Code into a CI pipeline
echo "Review this diff for security issues" | claude -p
```

No UI is initialized. Output goes directly to stdout/stderr, making it composable with other Unix tools.

### 3. Coordinator (Multi-Agent Orchestration)
The most architecturally complex mode. When activated, Claude Code spawns a **Leader agent** that receives the overall task, decomposes it into subtasks, and assigns each subtask to independent **Worker agents**. Workers are full Claude Code instances with their own isolated contexts.

Communication between Leader and Workers uses structured JSON messages via the `Task` tool. This mode is used for large-scale refactors, multi-file parallel tasks, and anything that benefits from concurrent AI execution.

### 4. Bridge (CCR Cloud Connection)
Connects a local Claude Code terminal session to **CCR (Claude Code Remote)** — Anthropic's cloud infrastructure. The protocol is WebSocket-based and supports up to **32 parallel sessions**. This enables:
- Remote control of a local session from a mobile device or web browser
- Seamless handoff between devices (start on laptop, continue on phone)
- Shared sessions for pair programming scenarios

### 5. Kairos (Scheduled Task Execution)
A specialized mode for running Claude Code tasks on a schedule. Think cron-but-AI-aware: Kairos can be configured to run specific tasks at specific times, useful for nightly code reviews, automated documentation updates, or periodic refactoring passes.

### 6. Daemon (Background Service)
Runs Claude Code as a persistent background service. Rather than starting a new process per invocation, Daemon mode keeps the service alive and accepts requests over a local socket or IPC channel. This amortizes startup costs across many requests — critical for editor integrations where latency matters.

### 7. Viewer (Read-Only Session)
A read-only mode for observing an active Claude Code session without the ability to send commands. Useful for debugging, auditing, or demo scenarios where you want to watch a session without interfering.

---

## Phase 2: The Query Loop (5 Steps)

The query loop is the beating heart of Claude Code, implemented in `query.ts` (~68KB). Every turn — every time you send a message and Claude Code responds — goes through these five steps:

### Step 1: Build System Prompt

A rich system prompt is assembled from multiple sources:
- **Identity block**: Claude's role, personality, and behavioral guidelines
- **Environment info**: OS, shell, working directory, git status, active MCP tools
- **Tool definitions**: JSON schemas for all available tools
- **CLAUDE.md content**: Project-specific and user-specific instructions
- **Memory**: Relevant saved learnings from previous sessions

The system prompt is rebuilt on every turn to reflect the current state of the environment.

### Step 2: Stream API Response (Async Generator)

The request is sent to the Claude API. The response is consumed via an **async generator** pattern — tokens stream in as they are produced, rather than waiting for the full response. This is what makes Claude Code feel responsive even for long completions.

```typescript
// Simplified pseudocode
async function* streamResponse(prompt: SystemPrompt): AsyncGenerator<ContentBlock> {
  const stream = await anthropicClient.messages.stream({ ... });
  for await (const chunk of stream) {
    yield parseChunk(chunk);
  }
}
```

### Step 3: Parse Content Blocks

The stream produces two types of content blocks:
- **`text`** blocks: prose responses to display to the user
- **`tool_use`** blocks: structured requests to invoke a specific tool with specific parameters

The parser handles interleaved text and tool calls gracefully.

### Step 4: Execute Tools (Parallel Where Safe)

Tool calls are executed. Claude Code intelligently groups tools that can run concurrently (e.g., multiple file reads) while serializing those that cannot (e.g., writes that depend on previous reads). The 10-step tool execution pipeline (described below) handles each individual tool call.

### Step 5: Build `tool_result` Blocks → Loop

Each tool's output is formatted into a `tool_result` block and appended to the conversation. The loop then returns to Step 1 to build a new system prompt and continue the turn.

### Auto-Compact Trigger

When the conversation context exceeds **95% of the model's context window**, the auto-compact service activates: it summarizes older turns into a compact representation, discards the originals, and continues. This allows Claude Code sessions to run indefinitely without hitting context limits.

---

## Phase 3: Tool Execution Pipeline (10 Steps)

Each tool invocation follows a rigorous 10-step pipeline:

```
1.  Parse tool_use block from API response
2.  Look up tool definition in registry
3.  Run PreToolUse hooks
4.  Permission check (Default / Auto / Plan / Bypass)
5.  User confirmation if needed
6.  Concurrency control
7.  Execute tool function
8.  Run PostToolUse hooks
9.  Format tool_result
10. Add to conversation → continue loop
```

**Step 3 (PreToolUse hooks)** and **Step 8 (PostToolUse hooks)** are user-extensible injection points. A PreToolUse hook can abort the tool call entirely — for example, a hook that prevents any `git push` without a ticket number in the commit message.

**Step 4 (Permission check)** is where the safety architecture lives. The AI classifier evaluates whether the operation is dangerous. If it is, and the mode requires user confirmation, the UI presents a `PermissionPrompt` component.

**Step 6 (Concurrency control)** uses a token-based semaphore. Some tools (Bash) are inherently sequential; others (Read, WebFetch) can safely run in parallel up to a configured concurrency limit.

---

## The Tool System: 45+ Built-In Tools

Claude Code ships with a rich built-in toolset organized into categories:

### File Operations
| Tool | Description |
|------|-------------|
| `Read` | Read file contents |
| `Write` | Create or overwrite a file |
| `Edit` | Make precise edits (find/replace) |
| `MultiEdit` | Multiple edits in one operation |
| `LS` | List directory contents |
| `Glob` | Find files by pattern |
| `Grep` | Search file contents |

### Execution
| Tool | Description |
|------|-------------|
| `Bash` | Persistent shell session |
| `Computer` | GUI automation (screenshots, clicks) |

The **Bash tool** deserves special attention: it runs in a **persistent shell process**. Unlike running `bash -c "..."` per call, Claude Code's Bash tool maintains the same shell session across calls. This means:
- `cd /some/dir` in one call persists for the next call
- Environment variable assignments persist
- Shell state (aliases, functions defined in the session) persists

Security is enforced via **Tree-sitter AST analysis** — Claude Code parses the bash command into an abstract syntax tree and identifies dangerous patterns (pipe to `sudo`, `rm -rf /`, etc.) before the AI classifier even sees it.

### AI / Agent Tools
| Tool | Description |
|------|-------------|
| `Task` | Spawn a sub-agent for a subtask |
| `Agent` | Coordinator agent management |

### Web Tools
| Tool | Description |
|------|-------------|
| `WebFetch` | Fetch and parse a URL |
| `WebSearch` | Search the web |

### Notebook Tools
| Tool | Description |
|------|-------------|
| `NotebookRead` | Read Jupyter notebook cells |
| `NotebookEdit` | Edit notebook cells |

### Memory Tools
| Tool | Description |
|------|-------------|
| `MemoryRead` | Read from memory store |
| `MemoryWrite` | Write to memory store |

### MCP Tools
Tools dynamically injected from connected MCP (Model Context Protocol) servers at startup. The registry is populated at runtime, so Claude Code can be extended with domain-specific tools without any code changes.

---

## The Permission System

Claude Code's permission system has four modes that control how aggressively it confirms actions:

### Default Mode
Normal operation. Dangerous operations (file deletion, running unknown scripts, network requests to sensitive endpoints) require explicit user confirmation. Safe operations (file reads, listing directories) proceed automatically.

### Auto Mode
Safe operations are auto-approved. Dangerous operations still ask. Useful for developers who trust Claude's judgment but want a safety net for truly risky ops.

### Plan Mode
No execution at all — Claude Code only plans what it *would* do. The user reviews the plan and then either approves it (switching to another mode) or refines the request. Ideal for complex multi-step operations where you want to review before committing.

### Bypass Mode (`--dangerously-skip-permissions`)
All permission checks are skipped. This flag is intentionally named to be alarming — it is designed for fully trusted automation environments (CI/CD, sandboxed containers) where the overhead of confirmation is unacceptable.

### The AI Classifier

What distinguishes Claude Code's safety system from simple allow/deny lists is the use of Claude itself as a classifier. When a Bash command is submitted, Claude Code sends it to a fast Claude inference call asking: "Is this command dangerous?" The response informs the permission check. This catches novel dangerous patterns that regex could never anticipate.

---

## The Hook System

Hooks are Claude Code's extensibility mechanism for wrapping tool execution and session lifecycle events. There are four hook types:

### `PreToolUse`
Runs a shell command **before** a tool executes. Can abort the tool call by returning a non-zero exit code. Use cases:
- Logging all tool calls to an audit trail
- Blocking certain operations based on custom business rules
- Validating input parameters beyond what the AI classifier checks

### `PostToolUse`
Runs after a tool completes. Can inspect the tool's output. Use cases:
- Sending notifications when specific files are modified
- Triggering external CI/CD webhooks after a write operation
- Accumulating tool call statistics

### `UserPromptSubmit`
Runs before a user's message is sent to the AI. Can modify or augment the message. Use cases:
- Automatically appending project context to every message
- Sanitizing sensitive data from prompts before they reach the API
- Injecting current ticket/issue numbers for traceability

### `Stop`
Runs when the Claude Code session ends (graceful exit or timeout). Use cases:
- Saving session summaries
- Cleaning up temporary resources
- Sending end-of-session analytics

Hooks are defined as shell commands in `CLAUDE.md` or `settings.json`:

```json
{
  "hooks": {
    "PreToolUse": "echo 'Tool: $TOOL_NAME' >> ~/.claude/audit.log",
    "Stop": "~/.claude/scripts/session-cleanup.sh"
  }
}
```

---

## Coordinator Mode: Multi-Agent Architecture in Depth

The Coordinator execution mode implements a **Leader/Worker multi-agent pattern** that allows Claude Code to tackle tasks too large or complex for a single context window.

### Architecture

```
User Request
     ↓
  Leader Agent
  (task decomposition)
     ↓
  ┌──────────────────────────────┐
  │  Worker 1   Worker 2  ...N   │
  │  (context)  (context)        │
  └──────────────────────────────┘
     ↓
  Leader Agent
  (result synthesis)
     ↓
  User Response
```

### Leader Agent Responsibilities

1. Receives the full user request
2. Analyzes the codebase or task scope
3. Decomposes the task into independent (or ordered) subtasks
4. Assigns subtasks to Worker agents via the `Task` tool
5. Collects results and synthesizes a coherent response

### Worker Agent Characteristics

- Each Worker is a **full, independent Claude Code instance**
- Each has its own context window (not shared with Leader or other Workers)
- Workers communicate results back to the Leader via structured JSON
- Workers can use the full tool system (Bash, Read, Write, etc.)
- Workers can be created and destroyed dynamically as the task evolves

### Communication Protocol

The `Task` tool sends a structured JSON payload:

```json
{
  "task_id": "refactor-auth-module",
  "description": "Refactor the authentication module to use JWT",
  "context": {
    "files": ["src/auth/index.ts", "src/auth/middleware.ts"],
    "constraints": ["maintain backward compatibility", "add unit tests"]
  }
}
```

Workers return results in a matching structured format, which the Leader uses to track progress and synthesize the final output.

### When to Use Coordinator Mode

- **Large refactors** spanning dozens of files (each file can be a separate Worker task)
- **Parallel test generation** (one Worker per module)
- **Multi-language documentation** (one Worker per target language)
- **Codebase analysis** where different modules can be analyzed independently

---

## The Bridge System

The Bridge execution mode is Claude Code's answer to multi-device workflows. It establishes a **WebSocket-based connection** between a local Claude Code terminal session and CCR (Claude Code Remote) cloud infrastructure.

### Technical Details

- Protocol: WebSocket (bidirectional, low-latency)
- Maximum parallel sessions: **32**
- Authentication: uses the same Anthropic API credentials as the main client
- Session persistence: sessions can be suspended and resumed

### Use Cases

**Remote Control**: Start a coding session on your laptop, then continue it from your phone via a web interface. The local terminal remains the execution environment; the remote interface provides the UI.

**Device Handoff**: Complete a debugging session on a desktop workstation, hand it off to a colleague who picks it up on their own device — full session state preserved.

**Mobile Oversight**: Monitor a long-running refactor from a mobile device. You can intervene, ask questions, or redirect the session without being physically at your computer.

**CI/CD Integration**: A CI pipeline can connect to a running Claude Code Bridge session to inspect progress or inject additional context mid-run.

---

## The Memory System

Claude Code implements a sophisticated 4-tier memory architecture:

### Tier 1: User Memory (`~/.claude/CLAUDE.md`)
Global instructions that apply to every Claude Code session for this user, regardless of project. Examples:
- Preferred code style ("always use semicolons in TypeScript")
- Personal workflow preferences ("always run tests before committing")
- Identity context ("I am a senior backend engineer at Acme Corp")

### Tier 2: Project Memory (`./CLAUDE.md`)
Project-specific instructions committed alongside the code. Every team member using Claude Code on this project gets these instructions automatically. Examples:
- Project architecture documentation
- Build and test commands
- Coding standards specific to this codebase
- Known gotchas and footguns

### Tier 3: Feedback Memory
Auto-generated memory. When Claude Code learns something useful during a session — the correct build command, a debugging technique that worked, a non-obvious project convention — it automatically saves this to `~/.claude/projects/<hash>/memory.md`. This creates a persistent knowledge base that improves over time.

### Tier 4: Reference Files
Additional context files that can be attached to a session. These can be specification documents, API schemas, architecture diagrams (as text), or any other reference material that Claude should have access to.

---

## The UI Layer: React + Ink

The interactive terminal UI is built on **React + Ink** — a framework that renders React components as terminal output. This gives Claude Code the full power of React's component model in a terminal context.

### Key UI Optimizations

**Double-buffering**: A custom double-buffer implementation prevents visual tearing during rapid updates (streaming output).

**Dirty Tracking**: Only components whose data has changed are re-rendered. This is critical for performance when streaming long outputs — updating the cost display shouldn't re-render the diff viewer.

**Frame Throttling**: The renderer is capped at **30 frames per second**. This prevents excessive CPU usage during rapid streaming while maintaining smooth visual responsiveness.

### Key UI Components

- **`PermissionPrompt`**: The interactive confirmation dialog shown when a risky operation requires user approval. Shows the exact command/operation, risk level, and yes/no/explain options.
- **`DiffViewer`**: A colored unified diff renderer for file modifications.
- **`CostDisplay`**: Real-time token count and USD cost for the current session.
- **`ToolOutput`**: Structured display for tool execution results (collapsible, syntax-highlighted).

---

## The Service Layer

Four major services back Claude Code's operation:

### API Client
Handles the full lifecycle of API communication:
- Authentication (API key management, CCH request signing)
- Retry logic with exponential backoff
- Streaming response consumption
- Rate limit handling

### Auto-Compact Service
Continuously monitors the size of the conversation context relative to the model's context limit. When it crosses the 95% threshold, it:
1. Takes the oldest N turns
2. Sends them to Claude for summarization into a compact representation
3. Replaces the original turns with the compact summary
4. Continues the session

This runs transparently — users see a brief "compacting..." indicator and the session continues without interruption.

### MCP Client
Connects to configured MCP (Model Context Protocol) servers at startup. Each MCP server can provide:
- New tools (injected into the tool registry)
- Resource access (files, databases, APIs)
- Prompt templates

The MCP client handles connection management, tool schema injection, and proxying tool calls to the appropriate server.

### Cost Tracker
Maintains real-time token counts broken down by:
- Input tokens (system prompt + conversation)
- Output tokens (Claude's responses)
- Cache hits (for repeated context — significant discount)
- Per-model pricing (Claude 3.5 Sonnet, Claude 3 Opus, etc.)
- Cumulative session cost in USD

---

## Slash Commands (80+)

Claude Code supports 80+ slash commands divided into two categories:

### Prompt-Type Commands
Inject text or context into the conversation:
- `/help` — Show available commands and usage
- `/context` — Show current context size and memory usage
- `/memory` — Show and edit memory contents
- `/mcp` — Show connected MCP servers and their tools

### UI-Type Commands
Directly control the terminal UI:
- `/clear` — Clear conversation history (new session)
- `/compact` — Manually trigger context compaction
- `/settings` — Open interactive settings editor
- `/plan` — Switch to Plan mode (review-before-execute)

---

## The 8 Core Design Patterns

The Claude Code codebase applies eight recurring design patterns across its implementation. Understanding these patterns is key to understanding why the system behaves as it does.

### Pattern 1: Generator Streaming
**What**: Async generators (`async function*`) are used throughout for streaming data — API responses, tool outputs, progress updates.
**Why**: Generators enable lazy consumption. The UI can start rendering output the moment the first token arrives, without waiting for the complete response. Memory usage stays flat regardless of response length.

```typescript
async function* streamApiResponse(): AsyncGenerator<Token> {
  for await (const chunk of apiStream) {
    yield parseToken(chunk);
  }
}
// Consumer starts processing immediately
for await (const token of streamApiResponse()) {
  renderToken(token);
}
```

### Pattern 2: Feature Gates
**What**: A runtime feature flag system that enables/disables features without code changes.
**Why**: Allows Anthropic to roll out new capabilities gradually, run A/B tests, and disable features in specific environments (e.g., disable the Bridge system in air-gapped environments).

```typescript
if (featureGate('coordinator_mode')) {
  // Coordinator-specific initialization
}
```

### Pattern 3: Memoized Context
**What**: React's `useMemo` hook is used extensively to cache expensive computed values (e.g., the assembled system prompt, tool schemas).
**Why**: The system prompt is assembled from many sources on every turn. Without memoization, this would be recomputed even when the inputs haven't changed. Memoization ensures the prompt is only rebuilt when CLAUDE.md, tools, or environment actually change.

### Pattern 4: Withhold & Recover
**What**: When a tool produces a partial result before failing, the partial result is preserved and returned rather than discarded.
**Why**: In long-running tool operations (large file reads, bash commands with substantial output), a mid-stream error would otherwise lose all accumulated output. Withhold & Recover saves the partial output and adds an error annotation, letting Claude decide whether to retry or use what's available.

### Pattern 5: Lazy Import
**What**: Heavy modules are imported dynamically (`import()` rather than `require()`) and only when needed.
**Why**: The startup monolith is ~800KB, but many capabilities (the Coordinator system, the Bridge WebSocket stack, notebook support) are only needed in specific execution modes. Lazy imports keep the initial parse-and-execute time minimal.

```typescript
// Heavy module loaded only when coordinator mode is activated
const { CoordinatorOrchestrator } = await import('./coordinator/orchestrator');
```

### Pattern 6: Immutable State
**What**: All application state is wrapped in `DeepImmutable<T>` and managed via Zustand stores.
**Why**: Immutable state makes concurrency reasoning trivial. When multiple async operations (streaming API response + parallel tool executions) are modifying state simultaneously, immutability ensures each operation sees a consistent snapshot. Zustand's Redux-like update model means state transitions are explicit and auditable.

### Pattern 7: Interruption Resilience
**What**: Claude Code gracefully handles `Ctrl+C` (SIGINT) at any point in the execution pipeline.
**Why**: Users frequently want to stop a long-running tool or redirect the AI mid-stream. Rather than crashing or leaving state corrupted, Claude Code:
1. Captures the SIGINT signal
2. Completes any in-flight tool writes (to avoid partial file corruption)
3. Returns control to the user with a clean state
4. Optionally shows what was accomplished before the interruption

### Pattern 8: Dependency Injection
**What**: Services (API client, MCP client, cost tracker, etc.) are instantiated once at startup and injected into components/tools that need them, rather than being accessed as global singletons.
**Why**: Dependency injection makes testing trivial (inject a mock API client), enables multiple instances (e.g., two MCP clients for two different servers), and makes the dependency graph explicit. It also enables the Coordinator mode to give each Worker agent its own isolated service instances.

---

## Putting It All Together

The elegance of Claude Code's architecture lies in how these systems compose. Consider a complex user request like "Refactor the authentication module to use OAuth2 instead of session cookies, update all callers, and add integration tests":

1. **Startup** has already loaded CLAUDE.md, git status, and env info in parallel.
2. The user's request enters the **Query Loop**. The system prompt includes the project context from CLAUDE.md.
3. Claude responds with a `tool_use` block for the `Task` tool (activating **Coordinator mode**).
4. The **Coordinator** spawns a Leader agent that decomposes the task into: (a) refactor auth module, (b) update callers in module A, (c) update callers in module B, (d) write integration tests.
5. Four **Worker agents** execute in parallel. Each uses the **Bash** and **Edit** tools. Each tool invocation passes through the **10-step execution pipeline**, including **PreToolUse hooks** that log changes to an audit trail.
6. The **Permission system** in Auto mode auto-approves file reads and edits, presenting a confirmation only for a `git commit` operation.
7. Workers return results via structured JSON. The Leader synthesizes them and presents a summary.
8. The **Cost tracker** shows the total token usage. The **auto-compact service** has been quietly compacting early turns to keep the context window healthy.
9. The **DiffViewer** renders all modified files as a colored unified diff.

All of this, from a single natural language request.

---

## Conclusion

Claude Code is not a thin wrapper around the Claude API. It is a fully realized agentic platform with:
- **7 execution modes** covering interactive, headless, multi-agent, remote, scheduled, daemon, and viewer use cases
- **45+ tools** covering files, execution, web, notebooks, memory, and MCP extensions
- A **10-step tool execution pipeline** with hooks, permissions, and concurrency control
- A **4-tier memory system** that persists knowledge across sessions
- **8 design patterns** that make the system safe, fast, and extensible
- A **terminal UI** built on React + Ink with double-buffering, dirty tracking, and frame throttling

For developers building on top of Claude Code — or just trying to use it more effectively — understanding this architecture is the difference between treating it as a chatbot and treating it as the sophisticated agentic platform it actually is.

---

*Analysis based on Claude Code source code as of 2026-03-31. Source: wikidocs.net/338204 — "별첨 91. 클로드 코드 소스 코드 분석서".*

![Claude Code Architecture Diagram](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop)
*Photo by [Luca Bravo](https://unsplash.com/@lucabravo) on Unsplash*
