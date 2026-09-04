---
layout: post
title: "Claude Code Internal Architecture Deep Dive: How Anthropic Built a Production AI Coding Agent"
subtitle: "A technical analysis of the agent loop, tool system, permission model, context management, and MCP integration inside Claude Code"
date: 2026-04-01 00:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - Claude Code
  - Anthropic
  - AI Agents
  - Architecture
  - TypeScript
  - Developer Tools
  - LLM
  - MCP
categories: ai
---

# Claude Code Internal Architecture Deep Dive: How Anthropic Built a Production AI Coding Agent

Claude Code has rapidly become one of the most capable AI coding agents available. Unlike simpler AI coding assistants that just autocomplete text in an editor, Claude Code operates as a full autonomous agent: it reads your filesystem, executes shell commands, edits files, searches the web, and spawns sub-agents to parallelize work. The engineering behind it is sophisticated — and understanding that architecture helps developers use it more effectively, and helps engineers building similar systems learn from Anthropic's design decisions.

This post is a deep technical analysis of how Claude Code is built: its core agent loop, tool system, permission model, context window management, system prompt design, MCP integration, and more.

![Claude Code terminal interface showing the agent loop in action](https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800&auto=format&fit=crop)
*Photo by [Mohammad Rahmani](https://unsplash.com/@afgprogrammer) on Unsplash*

---

## 1. The Core Agent Loop: LLM + Loop + Tools

The fundamental architecture of Claude Code — and indeed of most production AI coding agents — can be summarized in six words: **LLM + loop + tools**.

Here's the core pattern in pseudocode:

```typescript
async function runAgentLoop(
  initialMessages: Message[],
  tools: Tool[],
  systemPrompt: string
): Promise<string> {
  const messages = [...initialMessages];

  while (true) {
    const response = await callClaude({
      system: systemPrompt,
      messages,
      tools,
    });

    // Add the assistant's response to the conversation
    messages.push({ role: "assistant", content: response.content });

    // If Claude said it's done, return
    if (response.stop_reason === "end_turn") {
      return extractFinalText(response.content);
    }

    // If Claude wants to use tools, execute them
    if (response.stop_reason === "tool_use") {
      const toolResults = await executeToolCalls(response.content);
      messages.push({ role: "user", content: toolResults });
      // Loop continues — feed results back to Claude
    }
  }
}
```

This loop is the heart of Claude Code. Everything else — permissions, context management, the UI, sub-agents — is scaffolding around this core pattern. The elegance is in how it handles multi-step tasks: Claude doesn't need to know in advance how many steps a task will take. It just keeps calling tools until it decides it's done.

### Why This Pattern Works

The key insight is that the LLM is stateless, but the *conversation* is stateful. Each iteration of the loop sends the entire conversation history (user messages + assistant responses + tool results) back to Claude. Claude can "see" everything that happened and decide what to do next based on the accumulated context.

This is why Claude Code can handle tasks like: "Refactor this entire codebase to use async/await." It reads files, understands the structure, makes changes, runs tests, sees failures, fixes them, and keeps going — all through this simple loop.

---

## 2. The Tool System: 15 Core Capabilities

Claude Code ships with approximately 15 core tools. Each tool follows a standard interface:

```typescript
interface Tool {
  name: string;
  description: string; // Shown to Claude in the system prompt
  input_schema: JSONSchema; // Validated before execution
  execute: (input: unknown) => Promise<ToolResult>;
}
```

The tools fall into several categories:

### File System Tools
- **Read** — Read file contents, with optional line range
- **Write** — Create or overwrite a file
- **Edit** — Replace exact text matches within a file
- **MultiEdit** — Multiple edits to a single file in one operation
- **Glob** — Find files matching a pattern
- **Grep** — Search file contents with regex
- **LS** — List directory contents

### Execution Tools
- **Bash** — Execute shell commands (see Section 7 for details)

### Information Tools
- **WebFetch** — Fetch and extract content from a URL

### Agent Tools
- **Task** — Spawn a sub-agent with its own context (see Section 8)

### Notebook Tools
- **NotebookRead** — Read Jupyter notebook cells
- **NotebookEdit** — Edit notebook cells

### Computer Use Tools
- **Screenshot**, **Click**, **Type** — Screen interaction (when enabled)

### Tool Definition in Practice

Here's what a simplified tool definition looks like for the Edit tool:

```typescript
const editTool: Tool = {
  name: "Edit",
  description: `Edit a file by replacing exact text.
The old_string must match exactly (including whitespace and newlines).
Use this for precise, surgical edits to existing files.
If you need to make multiple edits, prefer MultiEdit.`,
  input_schema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Absolute path to the file to edit",
      },
      old_string: {
        type: "string",
        description: "The exact text to find (must match exactly)",
      },
      new_string: {
        type: "string",
        description: "The replacement text",
      },
    },
    required: ["file_path", "old_string", "new_string"],
  },
  execute: async ({ file_path, old_string, new_string }) => {
    const content = await fs.readFile(file_path, "utf8");
    if (!content.includes(old_string)) {
      return { error: `old_string not found in ${file_path}` };
    }
    const updated = content.replace(old_string, new_string);
    await fs.writeFile(file_path, updated);
    return { success: true };
  },
};
```

Notice how the **description** is as important as the implementation. Claude reads these descriptions and decides which tool to use and how. Good tool descriptions are a form of prompt engineering — they directly affect the quality of Claude's decisions.

---

## 3. The Permission System: Three-Tier Safety Model

Claude Code implements a three-tier permission system that governs what actions the agent can take without asking the user:

### Tier 1: Always Allowed (Read-Only Operations)
- File reads (`Read`, `Glob`, `Grep`, `LS`)
- `WebFetch`
- Directory traversal
- Git status checks (non-destructive)

These operations are safe to perform silently because they don't modify any state.

### Tier 2: Require Confirmation (State-Modifying Operations)
- File writes (`Write`, `Edit`, `MultiEdit`)
- `Bash` command execution
- Notebook edits

Before executing these, Claude Code presents a permission prompt to the user:

```
Claude wants to run:
  Edit: src/utils/auth.ts
  Replace: "function validateToken" → "async function validateToken"

[Allow] [Allow Always] [Deny]
```

The "Allow Always" option adds an entry to `~/.claude/settings.json` so similar operations in that project don't ask again.

### Tier 3: Never Allowed (Dangerous Operations)
Certain operations are blocked regardless of settings:
- Network operations outside of `WebFetch`
- Installing system packages without explicit allowlisting
- Modifying Claude Code's own configuration files
- Accessing files outside the project root (configurable)

### Settings Storage

Permissions are stored in `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Edit(*)",
      "Bash(git *)",
      "Bash(npm test)"
    ],
    "deny": [
      "Bash(rm -rf *)"
    ]
  },
  "projects": {
    "/home/user/myproject": {
      "permissions": {
        "allow": ["Bash(make *)"]
      }
    }
  }
}
```

The permission matching uses glob-style patterns. `Edit(*)` means "allow any Edit operation." `Bash(git *)` means "allow any Bash command starting with git."

### The `--dangerously-skip-permissions` Flag

For CI/CD pipelines and automated environments, Claude Code supports `--dangerously-skip-permissions` which bypasses all confirmation prompts. This is explicitly designed for non-interactive environments where there's no user to ask. The flag name is intentionally intimidating to discourage casual use.

---

## 4. Context Window Management: Smart Compaction

One of the most practically important architectural decisions in Claude Code is how it handles long sessions. LLMs have fixed context windows (measured in tokens). Naive agents simply fail or produce degraded output when the conversation gets too long.

Claude Code solves this with **context compaction**:

```typescript
async function manageContext(messages: Message[], maxTokens: number): Promise<Message[]> {
  const currentTokens = countTokens(messages);
  
  if (currentTokens < maxTokens * 0.8) {
    return messages; // No action needed
  }
  
  // Find a good compaction point (after a completed subtask)
  const compactionPoint = findCompactionPoint(messages);
  const oldMessages = messages.slice(0, compactionPoint);
  const recentMessages = messages.slice(compactionPoint);
  
  // Summarize the old messages
  const summary = await callClaude({
    system: "You are summarizing a coding session. Capture: what was accomplished, what files were modified, key decisions made, and any important context for continuing the task.",
    messages: oldMessages,
    tools: [], // No tools for summarization
  });
  
  // Replace old messages with the compact summary
  return [
    { role: "user", content: `[Previous session summary]\n${summary}` },
    ...recentMessages,
  ];
}
```

This compaction happens transparently mid-session. The user may see a brief "Compacting context..." message, but the agent keeps working. Crucially, the summary preserves:
- What files were modified and how
- What the current task is
- What has been tried and what worked/failed
- Any important code snippets or decisions

This is why Claude Code can handle multi-hour refactoring sessions — the effective "memory" of the session is preserved even as the raw token count would otherwise overflow.

---

## 5. System Prompt Architecture: The Massive Context

Every request to Claude Code sends a carefully constructed system prompt. This prompt is not static — it's built fresh for every request and contains:

### 1. Identity and Behavioral Instructions
Core instructions about how Claude should behave as a coding assistant. This includes instructions about code style, when to ask for clarification, how to handle errors, etc.

### 2. Environment Information
```
Current environment:
- OS: macOS 15.3 (Darwin arm64)
- Shell: /bin/zsh
- Working directory: /Users/alice/myproject
- Git branch: feature/auth-refactor
- Git status: 3 files modified, 1 untracked
- Node version: v22.5.0
```

This context allows Claude to write platform-appropriate commands and be aware of the project state.

### 3. Tool Descriptions
All available tools (including MCP-injected tools) with their full descriptions and schemas. This is substantial — 15+ tools with detailed descriptions adds hundreds of tokens to every request.

### 4. CLAUDE.md Contents
The project-level `CLAUDE.md` and global `~/.claude/CLAUDE.md` are injected here. This is how teams encode project-specific instructions: "Always run `npm test` before committing. Use TypeScript strict mode. Follow the existing error handling patterns in `src/errors/`."

### 5. Auto-Memory Learnings
Claude Code maintains a per-project memory file at `~/.claude/projects/<hash>/memory.md`. Things Claude has learned about your project (preferred coding patterns, common commands, architecture notes) are injected here.

### 6. Current Task Context
The actual user request and any prior conversation.

The total system prompt can easily exceed 10,000 tokens for a complex project. This is a significant cost per request, but the richness of context is what enables Claude to write project-consistent code rather than generic solutions.

---

## 6. Session and Memory Architecture

Claude Code's session and memory system has several layers:

### Session Files
Each session is saved to `~/.claude/projects/<project-hash>/sessions/<session-id>.json`. These contain the full conversation history including tool calls and results. You can resume a session or review what Claude did.

### CLAUDE.md Hierarchy
```
~/.claude/CLAUDE.md          # Global instructions (applies everywhere)
~/myproject/CLAUDE.md        # Project instructions
~/myproject/src/CLAUDE.md    # Directory-specific instructions
```

Claude Code reads all CLAUDE.md files up the directory hierarchy. This allows different instructions at different scopes — global formatting preferences, project-specific conventions, directory-specific rules.

### Auto-Memory
As Claude works on your project, it can write learnings to `~/.claude/projects/<hash>/memory.md`. This persists across sessions. For example, after figuring out your build system's quirks, it might save:
```
The project uses Turborepo. Always run `turbo build` from root, not from packages.
Tests require `docker compose up -d` to be running first.
The auth module uses a custom JWT library at packages/auth, not jsonwebtoken.
```

---

## 7. Bash Tool: The Persistent Shell Session

One architectural detail that significantly affects Claude Code's behavior: the Bash tool does **not** spawn a new shell for each command. Instead, it runs all commands in a single persistent shell session.

This means:
- `cd` commands persist between Bash calls
- Environment variables set in one call are available in the next
- Shell functions defined once can be called later
- The working directory accumulates across calls

```typescript
// Claude does this:
await bash("cd /tmp && mkdir testdir");
await bash("cd testdir && touch file.txt"); // Still in /tmp/testdir!
await bash("ls"); // Shows file.txt
```

This design makes Claude Code much more capable at complex shell workflows, but it also means unexpected state can accumulate. If Claude changes to a directory you didn't expect, subsequent commands may behave differently than you'd expect from looking at each command in isolation.

### Timeout Configuration
Bash commands have a default timeout of 120 seconds. Long-running commands (builds, tests) can be configured with a higher timeout. Claude Code captures stdout and stderr separately, so it can distinguish between normal output and errors.

---

## 8. Sub-Agent Architecture: The Task Tool

Claude Code can spawn sub-agents using the **Task** tool. Each sub-agent is a completely independent Claude Code instance with:
- Its own context window
- Its own tool access
- Its own conversation history
- Results returned to the parent agent

```typescript
// When Claude uses the Task tool:
const taskTool: Tool = {
  name: "Task",
  description: `Spawn a sub-agent to work on a specific, bounded task in parallel.
Use this when you have independent subtasks that don't need to share state.
The sub-agent will return its results to you when done.`,
  execute: async ({ task, context }) => {
    const subAgent = new ClaudeCodeInstance({
      initialPrompt: task,
      additionalContext: context,
      tools: getToolsForSubAgent(),
    });
    return await subAgent.run();
  },
};
```

This enables Claude Code to parallelize work. For example, when writing tests for multiple independent modules, it might spawn separate sub-agents for each module and run them concurrently.

Sub-agents are isolated — they can't directly modify the parent's conversation history. Results flow back as tool output, which the parent Claude then incorporates into its reasoning.

---

## 9. MCP Integration: Extensible Tool System

Claude Code implements the **Model Context Protocol (MCP)** as a client. This means it can connect to any MCP server and dynamically extend its tool set.

### How MCP Tools Are Integrated

```typescript
async function buildToolList(
  coreTool: Tool[],
  mcpConfig: MCPConfig
): Promise<Tool[]> {
  const mcpTools: Tool[] = [];
  
  for (const server of mcpConfig.servers) {
    const client = new MCPClient(server);
    await client.connect();
    
    const serverTools = await client.listTools();
    
    // Wrap each MCP tool in a compatible interface
    for (const mcpTool of serverTools) {
      mcpTools.push({
        name: `mcp_${server.name}_${mcpTool.name}`,
        description: mcpTool.description,
        input_schema: mcpTool.inputSchema,
        execute: (input) => client.callTool(mcpTool.name, input),
      });
    }
  }
  
  return [...coreTool, ...mcpTools];
}
```

MCP servers can provide tools for:
- Database access (query your Postgres/MySQL directly)
- GitHub operations (create PRs, manage issues)
- Slack integration (post notifications)
- Custom internal tools specific to your organization

The MCP tools are injected into both the available tool list and the system prompt descriptions, so Claude sees them as first-class capabilities alongside the built-in tools.

---

## 10. The Streaming UI: Ink + React in the Terminal

Claude Code's terminal interface is built with **Ink**, a React renderer for the terminal. This enables a component-based UI architecture for a CLI application:

```typescript
// Simplified UI components
const AgentOutput: React.FC<{ response: StreamingResponse }> = ({ response }) => {
  return (
    <Box flexDirection="column">
      {response.content.map((block, i) => {
        if (block.type === "text") {
          return <Text key={i}>{block.text}</Text>;
        }
        if (block.type === "tool_use") {
          return <ToolCallDisplay key={i} tool={block} />;
        }
      })}
    </Box>
  );
};

const PermissionPrompt: React.FC<{ action: ToolAction; onDecide: (allow: boolean) => void }> = ({
  action,
  onDecide,
}) => (
  <Box borderStyle="round" padding={1}>
    <Text bold>Claude wants to: </Text>
    <Text color="yellow">{action.description}</Text>
    <Box marginTop={1}>
      <Button label="[Y] Allow" onPress={() => onDecide(true)} />
      <Button label="[N] Deny" onPress={() => onDecide(false)} />
    </Box>
  </Box>
);
```

Streaming responses are rendered token by token in real time. When Claude calls a tool, the tool call is displayed with syntax highlighting. Diffs are shown with colored additions/deletions. Permission prompts block the agent loop until the user responds.

---

## 11. Cost Tracking: Real-Time Token Accounting

Claude Code tracks API costs in real time and displays them in the UI. The implementation is straightforward:

```typescript
interface SessionCost {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalCost: number; // USD
}

function calculateCost(usage: TokenUsage, model: string): number {
  const pricing = MODEL_PRICING[model];
  return (
    (usage.input_tokens * pricing.input) / 1_000_000 +
    (usage.output_tokens * pricing.output) / 1_000_000 +
    (usage.cache_read_input_tokens * pricing.cacheRead) / 1_000_000 +
    (usage.cache_creation_input_tokens * pricing.cacheWrite) / 1_000_000
  );
}
```

Claude Code makes heavy use of **prompt caching** — the large system prompt (which includes tool descriptions, CLAUDE.md contents, etc.) is cached at Anthropic's servers. This dramatically reduces costs for long sessions, since the expensive input prompt only needs to be processed once and subsequent requests read from cache at a much lower per-token cost.

---

## 12. Request Signing: The `cch` Header

One interesting implementation detail: Claude Code signs every API request with a custom HMAC-SHA256 signature. Each request includes a `cch` header containing:
- A timestamp
- A signature derived from the request content and a client-side secret

This mechanism is designed for rate limiting and abuse prevention. It allows Anthropic to verify that requests are coming from a genuine Claude Code client rather than someone scraping the API through Claude Code's credentials. The signature scheme is relatively standard — HMAC-SHA256 with the request body and a timestamp to prevent replay attacks.

---

## Putting It All Together: A Complete Request Flow

Here's what happens when you type a command into Claude Code:

1. **User input** is captured by the Ink UI
2. **System prompt** is built fresh: identity instructions + environment info + tool descriptions + CLAUDE.md + memory
3. **Context check**: if previous conversation is large, compact it
4. **API call**: send messages + tools to Claude API with `cch` signed request
5. **Streaming response**: tokens arrive and are rendered in real time
6. **Tool calls detected**: Claude requests a tool use
7. **Permission check**: is this action in the always-allow list? If not, show permission prompt
8. **Tool execution**: run the tool, capture results
9. **Results injected**: tool results added to conversation as user message
10. **Loop continues**: send updated conversation back to Claude
11. **`stop_reason === "end_turn"`**: Claude signals it's done
12. **Session saved**: full conversation saved to `~/.claude/projects/<hash>/sessions/`
13. **Cost displayed**: token usage and USD cost shown in UI

This flow repeats for every sub-task within a session, with context compaction happening transparently when needed.

---

## Lessons for Building Your Own Agents

If you're building AI agents, here's what Claude Code's architecture teaches us:

**1. The loop is simpler than you think.** The core agent loop is maybe 30 lines of code. The complexity is in the tools, the prompt engineering, and the edge cases.

**2. Tool descriptions are prompt engineering.** Claude decides which tools to use based on their descriptions. Invest time in writing clear, precise tool descriptions.

**3. Persistent shell state is powerful but tricky.** A persistent shell session enables complex workflows but requires careful state management and good error messages when state goes wrong.

**4. Context management is non-negotiable for production.** Any agent that needs to handle multi-step tasks in real codebases needs a solution for long contexts. Compaction/summarization is the standard approach.

**5. Permission systems aren't optional.** Users need to trust their agent. A clear three-tier permission model (always/ask/never) with transparent display of what the agent is about to do is essential for production use.

**6. MCP as the extension mechanism.** Rather than building every possible integration into the core agent, MCP allows infinite extensibility. This is a clean architectural separation.

**7. Prompt caching is essential for cost control.** The system prompt is large and mostly static. Structuring it to be cache-friendly (stable content first, dynamic content last) can cut costs by 50-80% for long sessions.

---

## Conclusion

Claude Code's architecture is a masterclass in production AI agent design. The core "LLM + loop + tools" pattern is simple, but it's surrounded by careful engineering: a principled permission model that builds user trust, smart context compaction that enables long sessions, a rich system prompt that provides deep project context, and MCP integration that allows infinite extensibility.

Understanding this architecture doesn't just help you use Claude Code more effectively — it gives you a blueprint for building production AI agents. The patterns here (the agent loop, tool definitions, permission tiers, context management) are applicable to any domain where you want an LLM to take autonomous action in a complex environment.

---

*Sources synthesized: Amp blog "How to Build an Agent" (Thorsten Ball), Claude Code official documentation, community analysis of Claude Code's architecture, reverse engineering research on request signing.*
