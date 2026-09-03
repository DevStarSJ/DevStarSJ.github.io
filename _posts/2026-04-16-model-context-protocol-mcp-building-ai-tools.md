---
layout: post
title: "Model Context Protocol (MCP): Building AI Tools That Actually Integrate"
subtitle: "How Anthropic's MCP standard is solving the fragmentation problem in AI tooling — and how to build your own MCP servers"
date: 2026-04-16 12:00:00
author: "Groot"
header-img: "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - AI
  - MCP
  - Anthropic
  - Claude
  - Tools
  - API
  - Python
  - TypeScript
categories: ai
---

# Model Context Protocol (MCP): Building AI Tools That Actually Integrate

The Model Context Protocol (MCP) is rapidly becoming the standard way to connect AI models to external tools, data sources, and services. What started as Anthropic's solution to their own integration problem has become a de facto standard, with support from OpenAI, Google, and dozens of tool providers.

This guide explains what MCP is, why it matters, and how to build your own MCP server.

![AI Integration Network](https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=1000&auto=format&fit=crop)
*Photo by [Milad Fakurian](https://unsplash.com/@fakurian) on Unsplash*

---

## The Problem MCP Solves

Before MCP, integrating an AI assistant with external services was a mess. Every tool had to be custom-built for each AI platform:

```
Without MCP:
Claude ──custom code──► GitHub integration
Claude ──custom code──► Slack integration  
Claude ──custom code──► Database integration

GPT-4 ──different custom code──► GitHub integration
GPT-4 ──different custom code──► Slack integration

Result: N tools × M models = N×M integration code
```

```
With MCP:
GitHub MCP Server ◄──MCP protocol──► Claude
GitHub MCP Server ◄──MCP protocol──► GPT-4
GitHub MCP Server ◄──MCP protocol──► Any MCP client

Result: N tools + M models = N+M integration code
```

MCP is essentially an "HTTP for AI tools" — a standard protocol that any AI can speak to connect to any tool.

---

## MCP Architecture

MCP has three core concepts:

### 1. Tools
Functions the AI can call (like function calling, but standardized):

```json
{
  "name": "search_codebase",
  "description": "Search for code patterns in the repository",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search query (supports regex)"
      },
      "path": {
        "type": "string",
        "description": "Limit search to this path prefix"
      }
    },
    "required": ["query"]
  }
}
```

### 2. Resources
Data sources the AI can read:

```json
{
  "uri": "file:///project/src/main.py",
  "name": "main.py",
  "description": "Main application entry point",
  "mimeType": "text/x-python"
}
```

### 3. Prompts
Pre-built prompt templates for common workflows.

---

## Building Your First MCP Server (Python)

Let's build an MCP server that provides database access:

```bash
pip install mcp
```

```python
# database_server.py
import asyncio
import sqlite3
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server
import mcp.types as types

# Create the MCP server
app = Server("database-server")

# Connect to SQLite (replace with your actual DB)
DB_PATH = "./data/app.db"

@app.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """List available tools."""
    return [
        types.Tool(
            name="query_database",
            description="Execute a read-only SQL query against the database",
            inputSchema={
                "type": "object",
                "properties": {
                    "sql": {
                        "type": "string",
                        "description": "SQL SELECT query to execute"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum rows to return (default: 100)",
                        "default": 100
                    }
                },
                "required": ["sql"]
            }
        ),
        types.Tool(
            name="list_tables",
            description="List all tables in the database with their schemas",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]


@app.call_tool()
async def handle_call_tool(
    name: str,
    arguments: dict | None
) -> list[types.TextContent]:
    """Handle tool execution."""
    
    if name == "query_database":
        sql = arguments.get("sql", "")
        limit = arguments.get("limit", 100)
        
        # Safety: only allow SELECT
        if not sql.strip().upper().startswith("SELECT"):
            return [types.TextContent(
                type="text",
                text="Error: Only SELECT queries are allowed"
            )]
        
        # Add LIMIT if not present
        if "LIMIT" not in sql.upper():
            sql = f"{sql} LIMIT {limit}"
        
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(sql)
            rows = cursor.fetchall()
            conn.close()
            
            if not rows:
                return [types.TextContent(type="text", text="No results found")]
            
            # Format as markdown table
            headers = rows[0].keys()
            table = "| " + " | ".join(headers) + " |\n"
            table += "| " + " | ".join(["---"] * len(headers)) + " |\n"
            for row in rows:
                table += "| " + " | ".join(str(v) for v in row) + " |\n"
            
            return [types.TextContent(
                type="text",
                text=f"Query returned {len(rows)} rows:\n\n{table}"
            )]
            
        except Exception as e:
            return [types.TextContent(
                type="text", 
                text=f"Query error: {str(e)}"
            )]
    
    elif name == "list_tables":
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.execute(
            "SELECT name, sql FROM sqlite_master WHERE type='table'"
        )
        tables = cursor.fetchall()
        conn.close()
        
        result = ""
        for name, schema in tables:
            result += f"### {name}\n```sql\n{schema}\n```\n\n"
        
        return [types.TextContent(type="text", text=result or "No tables found")]
    
    raise ValueError(f"Unknown tool: {name}")


async def main():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="database-server",
                server_version="1.0.0",
                capabilities=app.get_capabilities(
                    notification_options=None,
                    experimental_capabilities={}
                )
            )
        )

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Building an MCP Server (TypeScript)

TypeScript is also well-supported and often preferred for Node.js tooling:

```bash
npm install @modelcontextprotocol/sdk
```

```typescript
// github-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const server = new Server(
  {
    name: "github-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_issues",
      description: "List open issues for a GitHub repository",
      inputSchema: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          state: {
            type: "string",
            enum: ["open", "closed", "all"],
            default: "open",
          },
          labels: {
            type: "string",
            description: "Comma-separated labels to filter by",
          },
        },
        required: ["owner", "repo"],
      },
    },
    {
      name: "create_issue",
      description: "Create a new GitHub issue",
      inputSchema: {
        type: "object",
        properties: {
          owner: { type: "string" },
          repo: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          labels: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["owner", "repo", "title"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "list_issues") {
    const { owner, repo, state = "open", labels } = args as {
      owner: string;
      repo: string;
      state?: string;
      labels?: string;
    };

    const response = await octokit.issues.listForRepo({
      owner,
      repo,
      state: state as "open" | "closed" | "all",
      labels,
      per_page: 20,
    });

    const issueList = response.data
      .map(
        (issue) =>
          `#${issue.number}: ${issue.title}\n  Labels: ${issue.labels.map((l: any) => l.name).join(", ") || "none"}\n  URL: ${issue.html_url}`
      )
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${response.data.length} issues:\n\n${issueList}`,
        },
      ],
    };
  }

  if (name === "create_issue") {
    const { owner, repo, title, body, labels } = args as {
      owner: string;
      repo: string;
      title: string;
      body?: string;
      labels?: string[];
    };

    const response = await octokit.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
    });

    return {
      content: [
        {
          type: "text",
          text: `Created issue #${response.data.number}: ${response.data.html_url}`,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## Connecting to Claude Desktop

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "database": {
      "command": "python",
      "args": ["/path/to/database_server.py"],
      "env": {
        "DB_PATH": "/path/to/app.db"
      }
    },
    "github": {
      "command": "node",
      "args": ["/path/to/github-server.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

Restart Claude Desktop and your MCP servers are available.

---

## MCP Resources and Prompts

Beyond tools, MCP supports read-only resources and prompt templates:

```python
@app.list_resources()
async def handle_list_resources() -> list[types.Resource]:
    """Expose files as resources."""
    resources = []
    for f in Path("./docs").glob("*.md"):
        resources.append(types.Resource(
            uri=f"file://{f.absolute()}",
            name=f.name,
            mimeType="text/markdown"
        ))
    return resources

@app.read_resource()
async def handle_read_resource(uri: str) -> str:
    """Read a resource by URI."""
    path = uri.replace("file://", "")
    return Path(path).read_text()


@app.list_prompts()
async def handle_list_prompts() -> list[types.Prompt]:
    """Provide reusable prompt templates."""
    return [
        types.Prompt(
            name="analyze-schema",
            description="Analyze database schema and suggest improvements",
            arguments=[
                types.PromptArgument(
                    name="table_name",
                    description="Specific table to analyze (optional)",
                    required=False
                )
            ]
        )
    ]
```

---

## Best Practices

**1. Scope tools narrowly** — One tool per action, not one tool that does everything

**2. Write great descriptions** — The model uses descriptions to decide when to call your tool. Be specific about what the tool does and when to use it.

**3. Return structured, readable output** — Markdown tables and code blocks work well; avoid raw JSON

**4. Handle errors gracefully** — Return error text, don't throw exceptions that crash the server

**5. Add safety limits** — Read-only databases, query limits, rate limiting

**6. Use environment variables for secrets** — Never hardcode tokens in server code

![Technology abstraction](https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1000&auto=format&fit=crop)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

---

## The MCP Ecosystem in 2026

The protocol has exploded. Notable MCP servers available today:

| Category | Popular Servers |
|---|---|
| Version Control | GitHub, GitLab, Bitbucket |
| Databases | PostgreSQL, MySQL, SQLite, MongoDB |
| Cloud | AWS, GCP, Azure |
| Productivity | Google Workspace, Notion, Linear |
| Development | Sentry, Datadog, PagerDuty |
| Web | Browser automation, web search |

The [MCP Registry](https://mcpregistry.io) catalogs hundreds of community servers.

---

## Summary

MCP solves the N×M integration problem by creating a shared protocol layer between AI models and tools. For developers:

- **Build once, use everywhere** — MCP servers work with any MCP-compatible AI
- **Simple to implement** — Python and TypeScript SDKs are mature and well-documented
- **Active ecosystem** — Hundreds of pre-built servers available

If you're building any kind of AI-powered workflow, learning MCP is worth the investment. The days of writing custom tool integrations for each AI platform are numbered.

---

*References:*
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Anthropic MCP Documentation](https://docs.anthropic.com/en/docs/build-with-claude/mcp)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
