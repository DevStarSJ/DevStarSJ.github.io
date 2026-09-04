---
layout: post
title: "Claude Code Source Code Leak: How a Bun Bug Exposed Anthropic's AI Agent Internals"
subtitle: "A technical deep-dive into the accidental source map leak, what it revealed, and what every developer should learn from it"
date: 2026-04-01 00:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - Claude Code
  - Anthropic
  - Security
  - NPM
  - Source Maps
  - Bun
  - AI Agents
  - Reverse Engineering
categories: ai
---

# Claude Code Source Code Leak: How a Bun Bug Exposed Anthropic's AI Agent Internals

In late March 2026, the AI developer community got an unexpected gift — or nightmare, depending on your perspective. The `@anthropic-ai/claude-code` NPM package was found to contain `.map` (JavaScript source map) files that should never have been shipped. A bug in the Bun JavaScript bundler had inadvertently included detailed source maps alongside the minified production bundle, exposing the full internals of Claude Code to anyone who knew where to look.

What followed was a rapid, community-driven reverse engineering sprint. Researchers dissected the agent loop, the tool calling system, the permission model, the MCP integration layer — and notably, they reverse-engineered `cch`, Claude Code's proprietary request signing mechanism. The incident raises important questions about supply chain security, bundler behavior, and what "proprietary" really means in a world of JavaScript tooling.

![Source map visualization showing minified code mapped back to original source](https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=900&auto=format&fit=crop)
*Photo by [Markus Spiske](https://unsplash.com/@markusspiske) on Unsplash — source maps bridge the gap between minified production code and human-readable originals*

---

## What Are Source Maps, and Why Did They Matter Here?

Before diving into the incident, it's worth understanding the mechanism at play.

### The Purpose of Source Maps

When you ship JavaScript to production, you typically minify and bundle your code. Variable names become single characters, whitespace disappears, and multiple files merge into one. This is great for performance but terrible for debugging.

Source maps solve this problem. A `.map` file sits alongside your bundle and contains a full mapping from the minified output back to the original source code — including original file names, line numbers, variable names, and even comments.

A source map file looks like this:

```json
{
  "version": 3,
  "sources": [
    "src/agent/loop.ts",
    "src/tools/bash.ts",
    "src/tools/file_editor.ts",
    "src/permissions/index.ts",
    "src/mcp/client.ts"
  ],
  "sourcesContent": [
    "// Original TypeScript source for the agent loop\nexport async function runAgentLoop(session: Session) {\n  while (true) {\n    const response = await callClaude(session);\n    ...",
    ...
  ],
  "mappings": "AAAA,SAAS,aAAa..."
}
```

The critical field is `sourcesContent` — when enabled, it embeds the **full original source code** directly inside the map file. Even without `sourcesContent`, the `sources` array reveals the original file paths and structure, which alone can leak architectural information.

### What Claude Code's Leak Included

The `@anthropic-ai/claude-code` package's map files included:

- **Original TypeScript source files** with full path structure
- **Internal module organization**: agent loop, tool definitions, permission system, MCP client
- **Variable and function names** that reveal business logic
- **Comments and documentation** from the development process
- **The `cch` request signing implementation** — a proprietary mechanism for authenticating Claude Code's API calls

For a proprietary product like Claude Code, this was essentially the full source code gift-wrapped for researchers.

---

## The Bun Bundler Bug: How It Happened

The root cause of the leak was a bug in Bun, the fast JavaScript runtime and bundler that Anthropic uses to build Claude Code.

### Normal Bundler Behavior

In a properly configured production build, source maps are either:

1. **Omitted entirely** — no `.map` files are generated
2. **Generated but not referenced** — maps exist for internal debugging but the bundle doesn't point to them
3. **Hidden behind authenticated URLs** — enterprise setups sometimes host maps privately

The standard pattern in a `bun build` configuration would look like:

```typescript
// Expected production build config
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  minify: true,
  sourcemap: 'none', // or 'external' for internal use only
});
```

### The Bug

A bug in Bun's build pipeline caused source maps to be generated and included in the output directory even when the configuration specified they should be excluded or kept internal. The exact mechanism involved how Bun handles the `sourcemap` option during certain bundling configurations.

The result: when Anthropic ran their build pipeline and packaged the NPM artifact, the `.map` files were silently included alongside the production `.js` files. The `package.json` didn't explicitly exclude them, and the maps shipped to the registry.

### The Discovery

A developer downloading the `@anthropic-ai/claude-code` package noticed the `.map` files and realized what they contained. The Reddit post "Claude Code's source leaked via a map file in their NPM registry" spread quickly through the community. The follow-up post "A bug in Bun may have been the root cause of the Claude Code source code leak" connected the dots to the bundler issue.

Within hours, researchers had downloaded the package, extracted the source maps, and begun analyzing the architecture.

---

## What the Leak Revealed: Claude Code's Internal Architecture

This is the technically fascinating part. The leaked source gave the community a rare window into how a production AI coding agent is actually structured.

### The Agent Loop

At the heart of Claude Code is a classic agentic loop pattern. The leaked code revealed a `runAgentLoop` function that drives the entire system:

```typescript
// Reconstructed from source map data (approximate)
async function runAgentLoop(session: AgentSession): Promise<AgentResult> {
  const messages: Message[] = session.messages;
  
  while (true) {
    // Call the Claude API with current message history + tools
    const response = await callClaude({
      model: session.model,
      messages,
      tools: getAvailableTools(session.permissions),
      system: buildSystemPrompt(session),
    });

    // If no tool use, we're done
    if (response.stop_reason === 'end_turn') {
      return { result: response.content, session };
    }

    // Process tool calls
    const toolResults = await executeTools(
      response.tool_use_blocks,
      session
    );

    // Append assistant response and tool results to history
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });
    
    // Cost tracking
    session.costTracker.add(response.usage);
    
    // Check limits
    if (session.costTracker.exceeded()) {
      throw new CostLimitExceededError(session.costTracker.total);
    }
  }
}
```

This is a clean implementation of the standard ReAct (Reason + Act) pattern. Nothing revolutionary here, but seeing the exact implementation details — especially the cost tracking integration — was illuminating.

### The Tool System

Claude Code exposes a rich set of tools to the agent. The leak revealed the full tool registry, including:

**File System Tools:**
- `read_file` — reads file contents with optional line range
- `write_file` — creates or overwrites files
- `edit_file` — precise string replacement (similar to what you're reading this through)
- `list_directory` — directory listing with metadata
- `search_files` — grep-like search with regex support

**Execution Tools:**
- `bash` — executes shell commands with timeout support
- `run_tests` — specialized test runner integration

**Navigation & Analysis:**
- `find_definition` — code navigation via language server
- `grep_search` — fast ripgrep-backed search

Each tool was defined with a schema matching the Anthropic tool use format:

```typescript
const bashTool: ToolDefinition = {
  name: 'bash',
  description: 'Execute a bash command in the current working directory',
  input_schema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The bash command to execute',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000)',
      },
    },
    required: ['command'],
  },
};
```

### The Permission Model

One of the most interesting revelations was Claude Code's permission system. The tool doesn't operate with blanket permissions — it uses a tiered model:

```typescript
enum PermissionLevel {
  READ_ONLY = 'read_only',      // Can read files, run safe commands
  READ_WRITE = 'read_write',    // Can modify files  
  FULL = 'full',                // Can execute arbitrary commands
  DANGEROUS = 'dangerous',      // Elevated ops (network, system changes)
}

interface ToolPermissions {
  [toolName: string]: PermissionLevel;
}
```

Users can configure what level of access Claude Code has in their project. The permission model also includes an "ask first" mode where destructive operations require explicit user confirmation before execution.

### MCP (Model Context Protocol) Integration

The Model Context Protocol integration was particularly well-designed. Claude Code acts as an MCP client, connecting to external MCP servers that extend its capabilities:

```typescript
class MCPClient {
  private servers: Map<string, MCPServerConnection> = new Map();

  async connectServer(config: MCPServerConfig): Promise<void> {
    const connection = await createMCPConnection(config);
    await connection.initialize();
    
    // Discover and register tools from this server
    const tools = await connection.listTools();
    this.registerExternalTools(tools, config.name);
    
    this.servers.set(config.name, connection);
  }

  async callTool(serverName: string, toolName: string, args: unknown): Promise<ToolResult> {
    const server = this.servers.get(serverName);
    if (!server) throw new Error(`MCP server ${serverName} not connected`);
    return server.callTool(toolName, args);
  }
}
```

This design means Claude Code's capabilities can be extended by any MCP-compatible server — databases, APIs, custom tools — without modifying the core agent.

### Session Management and Cost Tracking

The session management layer was comprehensive. Every Claude Code session tracks:

- **Token usage** per API call (input/output/cache tokens)
- **Cumulative cost** with configurable limits
- **Tool call history** for the current session
- **File modifications** made during the session
- **Conversation history** with context window management

The cost tracking implementation showed careful attention to the economics of AI coding:

```typescript
class CostTracker {
  private totalCost: number = 0;
  private readonly limit: number;

  add(usage: APIUsage): void {
    const cost = calculateCost(usage, this.model);
    this.totalCost += cost;
  }

  exceeded(): boolean {
    return this.limit > 0 && this.totalCost > this.limit;
  }

  get total(): number {
    return this.totalCost;
  }
}
```

---

## The `cch` Request Signing Mystery

Perhaps the most intriguing thread to emerge from the leak was the reverse engineering of `cch` — a custom request signing mechanism in Claude Code's HTTP client.

### What Is `cch`?

Every HTTP request Claude Code makes to Anthropic's API includes a custom `X-Cch-*` header set. These headers appeared opaque in network captures, but the source map revealed their construction.

The Reddit post "What's cch? Reverse Engineering Claude Code's Request Signing" documented the full analysis:

```typescript
// Reconstructed cch signing logic
function generateCchHeaders(
  requestBody: string,
  timestamp: number,
  sessionId: string,
  clientSecret: string
): Record<string, string> {
  const payload = `${timestamp}:${sessionId}:${sha256(requestBody)}`;
  const signature = hmacSha256(clientSecret, payload);
  
  return {
    'X-Cch-Timestamp': timestamp.toString(),
    'X-Cch-Session': sessionId,
    'X-Cch-Signature': signature,
    'X-Cch-Version': CCH_VERSION,
  };
}
```

The `cch` signing serves multiple purposes:
1. **Request integrity** — ensures the request body hasn't been tampered with
2. **Session binding** — ties API calls to a specific Claude Code session
3. **Rate limiting** — allows Anthropic to enforce per-session limits beyond standard API keys
4. **Analytics** — enables detailed telemetry on Claude Code usage patterns vs. direct API usage

### Security Implications of the cch Exposure

Knowing the signing algorithm is double-edged. On one hand, it allows researchers to understand Anthropic's security model. On the other hand, with the signing logic exposed, it becomes theoretically possible to:

- Spoof Claude Code requests to Anthropic's endpoints
- Bypass session-level rate limits
- Potentially access Claude Code-specific features from custom clients

Anthropic would need to rotate secrets and potentially redesign the signing mechanism in response.

---

## Security and Privacy Implications

### For Anthropic

The leak was embarrassing at minimum and potentially damaging at maximum. Beyond the PR issue:

- **Competitive exposure**: Architectural decisions, design patterns, and implementation choices are now public knowledge
- **Security vulnerabilities**: If any security-relevant code was in the leaked maps, attackers now know about it
- **Trust**: Users trust Anthropic with sensitive codebases. Knowing their tooling had a supply chain issue doesn't inspire confidence
- **Signing mechanism compromise**: The `cch` system likely needed rapid redesign

### For Users

If you've been using Claude Code with sensitive codebases, the immediate concern isn't the source leak itself — it's a broader reminder about the security posture of AI coding tools:

- Claude Code can read your entire codebase
- Session data, file contents, and commands flow through Anthropic's infrastructure
- The permission model is important: don't grant `FULL` or `DANGEROUS` permissions unless necessary

### For the NPM Ecosystem

This incident highlights a systemic risk in the NPM ecosystem: **packages often contain more than they should**. Source maps are just one example. Packages can unintentionally ship:

- Debug symbols and source maps
- Internal configuration files
- Development credentials (rare but documented)
- Build artifacts with embedded paths revealing infrastructure details
- Test data containing sensitive information

---

## Lessons for Developers: Preventing Accidental Source Map Leaks

This incident provides a clear checklist for any team shipping NPM packages.

### 1. Explicit Source Map Configuration

Never rely on implicit bundler defaults. Always explicitly configure source map behavior:

**Webpack:**
```javascript
// webpack.config.js - production
module.exports = {
  mode: 'production',
  devtool: false, // No source maps in production bundle
  // OR for external maps that don't ship:
  // devtool: 'hidden-source-map',
};
```

**Bun:**
```typescript
// build.ts
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  minify: true,
  sourcemap: 'none', // Explicit: no source maps
});
```

**esbuild:**
```bash
esbuild src/index.ts --bundle --minify --outfile=dist/index.js
# Note: no --sourcemap flag = no source maps generated
```

**Rollup:**
```javascript
// rollup.config.js
export default {
  output: {
    file: 'dist/bundle.js',
    sourcemap: false, // Explicit false
  },
};
```

### 2. Use `.npmignore` or `package.json` `files` Field

The most reliable defense is controlling exactly what goes into your package:

```json
// package.json - explicit allowlist (preferred)
{
  "name": "my-package",
  "files": [
    "dist/",
    "!dist/**/*.map"
  ]
}
```

```
# .npmignore - blocklist approach
**/*.map
**/*.ts
src/
test/
```

The `files` field in `package.json` is an allowlist — only specified files/directories are included. This is the most secure approach because it's opt-in rather than opt-out.

### 3. Audit Your Package Before Publishing

Before every release, inspect what you're about to ship:

```bash
# List all files that will be included in the package
npm pack --dry-run

# Or pack it and inspect
npm pack
tar -tf my-package-1.0.0.tgz | grep -E '\.(map|ts)$'
```

If you see `.map` or `.ts` files in the output and you didn't intend to ship them, stop and fix your configuration.

### 4. CI/CD Checks

Add automated checks to your pipeline:

```bash
#!/bin/bash
# check-package-contents.sh
PACK_OUTPUT=$(npm pack --dry-run 2>&1)

if echo "$PACK_OUTPUT" | grep -qE '\.map$'; then
  echo "ERROR: Source map files detected in package!"
  echo "Remove them before publishing."
  exit 1
fi

echo "Package contents look clean."
```

### 5. Separate Source Maps for Internal Use

If your team needs source maps for production debugging (reasonable!), use a separate mechanism:

```typescript
// Build with hidden source maps (referenced in bundle but not shipped)
await Bun.build({
  sourcemap: 'external', // Generates .map files
  outdir: './dist',
});

// Upload maps to your error tracking service
await uploadMapsToSentry('./dist/**/*.map');

// Delete before packaging
await rm('./dist/**/*.map');
```

Tools like Sentry, Datadog, and Rollbar support uploading source maps to their servers separately, giving you full stack traces in production without shipping the maps publicly.

### 6. Lock Your Bundler Version

The Bun bug that caused this leak is a perfect example of why you should:

```json
// package.json
{
  "engines": {
    "bun": ">=1.1.0 <1.2.0"
  }
}
```

Or use lockfiles consistently and audit bundler changelogs when upgrading.

---

## The Bigger Picture: Transparency in AI Tooling

There's an ironic dimension to this story. Claude Code is a tool that reads your code, understands it deeply, and helps you build software. The fact that its own source was accidentally exposed invites reflection on the nature of proprietary AI tooling.

### What Did We Actually Learn?

The architectural patterns revealed by the leak weren't shocking — they're good software engineering applied to an AI agent problem:

- **Clean agent loops** with proper tool calling and history management
- **Principled permission models** that give users control
- **Extensible architectures** via MCP integration
- **Economic awareness** through cost tracking

These aren't secrets. They're best practices. The real "secrets" — the model weights, the training data, the specific prompt engineering — weren't in the source maps.

### Open Source AI Tooling

The incident prompted renewed discussion about whether AI coding tools should be open source. The counterargument from companies like Anthropic is that the moat isn't the architecture code — it's the model, the training, and the UX refinement. The source code architecture is relatively unimportant to competitive positioning.

If that's true, the most pragmatic response would be to open source Claude Code's architecture. The security concerns (like `cch` signing) would need to be addressed separately, but the agent loop, tool system, and permission model could all be public without compromising Anthropic's competitive position.

---

## Conclusion

The Claude Code source map leak is a case study in three intersecting issues: supply chain security, bundler reliability, and the nature of proprietary AI software.

For developers, the actionable takeaway is clear: **explicitly configure source maps in every build tool you use, use the `files` field in `package.json` as an allowlist, and audit your packages before publishing.** Never rely on bundler defaults for security-sensitive exclusions.

For the AI tooling ecosystem, the incident reveals that the architectural patterns powering production AI agents are neither mysterious nor inaccessible — they're clean, pragmatic software engineering. The real differentiation in AI products lies in model quality, training, and user experience, not in keeping the agent loop structure secret.

The `cch` signing revelation is the part that required real remediation. Security mechanisms that depend on obscurity, rather than cryptographic soundness, are always one source leak away from compromise. Anthropic will need to rethink request signing in a way that remains secure even when the algorithm is publicly known.

As Bun continues to mature and gain adoption in production workflows, incidents like this serve as important reminders: new, fast tooling is exciting, but production supply chains require battle-tested reliability. Lock your versions, test your build outputs, and assume that anything you generate in your build directory might end up in your package — unless you explicitly tell it not to.

---

*References:*
- *Reddit: "Claude Code's source leaked via a map file in their NPM registry"*
- *Reddit: "A bug in Bun may have been the root cause of the Claude Code source code leak"*
- *Reddit: "What's cch? Reverse Engineering Claude Code's Request Signing"*
- *NPM: `@anthropic-ai/claude-code` package*
- *Bun documentation: build.sourcemap configuration*
