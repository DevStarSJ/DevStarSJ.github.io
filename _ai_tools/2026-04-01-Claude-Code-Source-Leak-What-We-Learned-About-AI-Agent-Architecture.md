---
layout: subsite-post
title: "Claude Code Source Leak: What We Learned About AI Agent Architecture"
date: 2026-04-01 00:00:00
category: coding
tags: [claude-code, anthropic, security, ai-tools, source-code]
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop"
description: "Claude Code's source was accidentally exposed via NPM source map files. Here's what the leaked architecture reveals — and what developers can learn from it to build better AI agents."
---

In late March 2026, a bug in the Bun JavaScript bundler caused the `@anthropic-ai/claude-code` NPM package to ship with `.map` (source map) files that were never meant to be public. These files contained the full original TypeScript source of Claude Code — Anthropic's flagship AI coding agent. Within hours, the developer community had extracted, analyzed, and published detailed findings about Claude Code's internal architecture.

For developers building AI tools and agents, this unplanned transparency is genuinely valuable. The architectural patterns that emerged from the leak represent production-grade, battle-tested decisions made by an experienced team at Anthropic. Let's dig into what was revealed and what you can take away for your own projects.

![Architecture diagram of a modern AI coding agent](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop)
*Photo by [Luke Chesser](https://unsplash.com/@lukechesser) on Unsplash*

## How the Leak Happened

The `@anthropic-ai/claude-code` package is built using Bun, a fast all-in-one JavaScript runtime and bundler. A bug in Bun's build pipeline caused source map files (`.map` files) to be included in the package output even when the configuration specified they should be excluded.

Source maps contain a mapping from minified production code back to the original source — including original file names, variable names, and optionally the full source code itself (via the `sourcesContent` field). When the package was published to the NPM registry with these maps intact, the full internal architecture of Claude Code became publicly accessible.

The incident prompted community reverse-engineering of Claude Code's internals, including a detailed analysis of `cch` — a custom request signing mechanism used in Claude Code's API calls to Anthropic.

---

## Key Architectural Insight #1: The Agent Loop

The foundation of Claude Code is a clean **ReAct-style agent loop** — a while loop that alternates between calling the Claude API and executing tools until the task is complete.

```typescript
async function runAgentLoop(session: AgentSession): Promise<AgentResult> {
  const messages: Message[] = session.messages;
  
  while (true) {
    const response = await callClaude({
      model: session.model,
      messages,
      tools: getAvailableTools(session.permissions),
      system: buildSystemPrompt(session),
    });

    if (response.stop_reason === 'end_turn') {
      return { result: response.content, session };
    }

    const toolResults = await executeTools(response.tool_use_blocks, session);
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });
    
    session.costTracker.add(response.usage);
    if (session.costTracker.exceeded()) throw new CostLimitExceededError();
  }
}
```

### Takeaway for Your Agent Builds

This loop structure is elegant in its simplicity. Notice a few key design decisions:

1. **Cost tracking is built in, not bolted on** — every iteration tracks spend and enforces a configurable limit. For any production AI tool, this is table stakes.

2. **Permissions gate tool availability** — `getAvailableTools(session.permissions)` means the tool set the agent can call varies by session context. This prevents privilege escalation.

3. **Tool results are appended as user messages** — this is the standard Anthropic tool use pattern, but seeing it in a production loop reinforces that it's the right approach.

4. **There's no complex retry logic in the loop itself** — retries, timeouts, and error handling are delegated to the individual tool implementations. Clean separation of concerns.

---

## Key Architectural Insight #2: Tool Design Philosophy

Claude Code's tools follow a consistent pattern. Each tool has:

- A **name** (snake_case, verb_noun format)
- A **description** written for the model, not for humans
- A strict **JSON Schema** for inputs
- A **handler function** that returns structured results

```typescript
const editFileTool: ToolDefinition = {
  name: 'edit_file',
  description: `Replace exact text in a file. The oldText must match exactly 
                (including whitespace and indentation). Use for precise, 
                surgical edits rather than full rewrites.`,
  input_schema: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: 'Path to the file to edit' },
      old_string: { type: 'string', description: 'Exact text to find and replace' },
      new_string: { type: 'string', description: 'New text to replace the old text with' },
    },
    required: ['file_path', 'old_string', 'new_string'],
  },
};
```

### The Tool Suite

The leaked code revealed the full set of tools Claude Code provides:

| Category | Tools |
|----------|-------|
| File System | `read_file`, `write_file`, `edit_file`, `list_directory` |
| Search | `search_files`, `grep_search` |
| Execution | `bash`, `run_tests` |
| Navigation | `find_definition` |

### Takeaway for Your Agent Builds

**Tool descriptions are prompts.** The quality of your tool descriptions directly determines how well the model uses them. Notice how `edit_file`'s description explains the contract ("must match exactly including whitespace") — this constraints the model's behavior without runtime validation.

**Prefer surgical tools over broad ones.** Claude Code has both `write_file` (full overwrite) and `edit_file` (precise replacement). The model naturally gravitates toward the less destructive option when both are available. Giving your agent targeted tools leads to more precise, safer behavior.

**Keep tools focused.** Each tool does exactly one thing. The `bash` tool is powerful but its description, schema, and permission requirements communicate its risk level. Don't try to build one mega-tool — lean on the model's judgment to compose multiple focused tools.

---

## Key Architectural Insight #3: The Permission Model

One of the most sophisticated aspects of the leaked architecture is the permission system. Claude Code doesn't operate with a flat "allowed/denied" model — it uses a tiered permission system:

```typescript
enum PermissionLevel {
  READ_ONLY = 'read_only',    // read files, run safe read-only commands
  READ_WRITE = 'read_write',  // modify files
  FULL = 'full',              // execute arbitrary commands
  DANGEROUS = 'dangerous',    // network access, system-level operations
}
```

Each tool is tagged with a required permission level. When the agent calls a tool, the call is intercepted by the permission layer:

```typescript
async function executeTools(
  toolCalls: ToolUseBlock[],
  session: AgentSession
): Promise<ToolResult[]> {
  return Promise.all(toolCalls.map(async (call) => {
    const tool = toolRegistry.get(call.name);
    
    // Check permission level
    if (!session.permissions.allows(tool.requiredPermission)) {
      return {
        tool_use_id: call.id,
        content: `Error: Insufficient permissions for ${call.name}. Required: ${tool.requiredPermission}`,
        is_error: true,
      };
    }

    // "Ask first" mode for destructive ops
    if (tool.isDestructive && session.permissions.askFirst) {
      const approved = await promptUser(`Allow ${call.name}?`, call.input);
      if (!approved) return createDeniedResult(call);
    }

    return tool.handler(call.input, session);
  }));
}
```

### Takeaway for Your Agent Builds

**Build permissions in from day one.** Adding a permission system after the fact is much harder than designing around it from the start. Define permission levels before you write your first tool.

**"Ask first" mode is a killer feature.** The interactive approval flow for destructive operations gives users confidence to deploy AI agents more broadly. Users who trust the agent to ask when needed will grant broader base permissions.

**Return rich error messages on permission failure.** Telling the model *why* a tool call failed (not just that it failed) allows it to adapt its approach — perhaps by asking the user to elevate permissions, or by finding an alternative approach that doesn't require elevated access.

**Permission levels should map to real risk.** `READ_ONLY` → `READ_WRITE` → `FULL` → `DANGEROUS` is intuitive and composable. Avoid binary permission models.

---

## Key Architectural Insight #4: MCP Integration

Claude Code is built as an **MCP (Model Context Protocol) client**, not a closed system. The leaked code shows a well-designed MCP client that dynamically extends the agent's tool set by connecting to external servers:

```typescript
class MCPClient {
  private servers: Map<string, MCPServerConnection> = new Map();

  async connectServer(config: MCPServerConfig): Promise<void> {
    const connection = await createMCPConnection(config);
    await connection.initialize();
    
    // Dynamically register tools from this MCP server
    const tools = await connection.listTools();
    for (const tool of tools) {
      toolRegistry.register({
        ...tool,
        source: `mcp:${config.name}`,
        requiredPermission: inferPermissionLevel(tool),
      });
    }
    
    this.servers.set(config.name, connection);
  }
}
```

This means a Claude Code user can connect it to:
- A database MCP server (for reading/writing structured data)
- A GitHub MCP server (for PR management)
- A custom internal server (for company-specific tooling)

### Takeaway for Your Agent Builds

**MCP is worth adopting.** The protocol is gaining traction rapidly, and building your agent as an MCP client means you can leverage the growing ecosystem of MCP servers rather than building every integration yourself.

**Permission inference for external tools.** Notice `inferPermissionLevel(tool)` — when dynamically registering tools from external sources, Claude Code infers a default permission level based on the tool's description. This is smart defensive design.

**Tool namespacing.** Tagging tools with `source: 'mcp:serverName'` prevents naming conflicts and gives the model context about where a capability comes from. Good practice for any plugin/extension architecture.

---

## Key Architectural Insight #5: Session Management and Cost Awareness

The session layer in Claude Code handles more than just conversation history. It's the operational backbone:

```typescript
interface AgentSession {
  id: string;
  model: string;
  messages: Message[];
  permissions: PermissionSet;
  costTracker: CostTracker;
  fileModifications: FileModification[];
  workingDirectory: string;
  mcpConnections: MCPClient;
  startTime: number;
}
```

The `CostTracker` deserves special attention:

```typescript
class CostTracker {
  private breakdown: { input: number; output: number; cacheRead: number } = 
    { input: 0, output: 0, cacheRead: 0 };
  private readonly limit: number;

  add(usage: APIUsage): void {
    this.breakdown.input += calculateInputCost(usage.input_tokens, this.model);
    this.breakdown.output += calculateOutputCost(usage.output_tokens, this.model);
    this.breakdown.cacheRead += calculateCacheReadCost(usage.cache_read_input_tokens, this.model);
  }

  get total(): number {
    return this.breakdown.input + this.breakdown.output + this.breakdown.cacheRead;
  }

  exceeded(): boolean {
    return this.limit > 0 && this.total > this.limit;
  }
}
```

Note that cache reads (prompt caching hits) are tracked separately from regular input tokens — important because cache reads are significantly cheaper.

### Takeaway for Your Agent Builds

**Track cost at the session level, not just per-call.** Cumulative session cost tells you if a task is running away. Per-call cost doesn't. Set configurable limits and fail gracefully when they're exceeded.

**Separate input, output, and cache costs.** They have different prices, and you want the breakdown for optimization. If you're spending a lot on input tokens, prompt caching might help. If output is dominating, you might need to constrain response length.

**Track file modifications.** Knowing what files were changed during a session enables clean undo operations, better diffs, and rollback capabilities. This feature significantly improves user trust in autonomous agents.

---

## What the `cch` Signing Reveals About Production API Security

The community reverse-engineering of `cch` (Claude Code's custom request signing mechanism) reveals an important design pattern: **layered authentication**.

Even though Claude Code uses standard API keys for authentication, Anthropic added a secondary signing layer (`cch`) that:

1. **Binds requests to sessions** — preventing API key reuse outside of Claude Code
2. **Adds request integrity** — a HMAC signature over the request body detects tampering
3. **Enables richer analytics** — Anthropic can distinguish Claude Code traffic from direct API usage

The lesson isn't to copy this exact mechanism — the leak means it needs to be redesigned. The lesson is that for production AI tools, thinking about **how your API client authenticates beyond just "I have a key"** is worth the engineering investment.

---

## Practical Checklist: Building a Production AI Agent

Based on everything revealed in the Claude Code source:

### Architecture
- [ ] Implement a clean ReAct agent loop (call model → execute tools → repeat)
- [ ] Separate tool definitions (schema + description) from tool handlers
- [ ] Build a tool registry with metadata (permission level, is_destructive, source)
- [ ] Design permission levels before writing any tools

### Cost Management
- [ ] Track cumulative session cost (input, output, cache read separately)
- [ ] Implement configurable cost limits with graceful failure
- [ ] Log cost breakdown per session for analysis

### Safety
- [ ] Gate tools behind permission levels
- [ ] Implement "ask first" for destructive operations
- [ ] Track all file modifications made during a session
- [ ] Return rich error messages on permission denial

### Extensibility
- [ ] Consider MCP client support for ecosystem integration
- [ ] Namespace external tools to avoid conflicts
- [ ] Infer safe permission defaults for dynamically loaded tools

### Security
- [ ] Use `package.json` `files` allowlist to control what ships in your NPM package
- [ ] Explicitly configure `sourcemap: 'none'` in your bundler for production builds
- [ ] Audit `npm pack --dry-run` output before every release

---

## Conclusion

The accidental exposure of Claude Code's architecture turned out to be an education in how production AI agents should be built. The patterns revealed — tiered permissions, cost-aware agent loops, clean tool design, MCP extensibility — aren't proprietary secrets. They're good engineering.

If you're building AI coding tools or agents, treat this leaked architecture as a reference design. The lesson isn't "copy Claude Code" — it's that these architectural choices (permission models, session tracking, extensible tool registries) are load-bearing. Skip them in a prototype; pay for it in production.

The other lesson, of course, is to always explicitly configure source map exclusion in your bundler. `npm pack --dry-run` before you publish. Every time.

---

*Sources: Reddit community analysis threads, NPM package inspection, Bun documentation*
