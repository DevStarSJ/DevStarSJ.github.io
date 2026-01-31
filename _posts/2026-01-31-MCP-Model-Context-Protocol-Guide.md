---
layout: post
title: "MCP (Model Context Protocol): The Universal Standard for AI Tool Integration"
subtitle: Build interoperable AI tools with Anthropic's Model Context Protocol
categories: development
tags: ai mcp protocol tools
comments: true
---

# MCP (Model Context Protocol): The Universal Standard for AI Tool Integration

Model Context Protocol (MCP) is revolutionizing how AI applications integrate with external tools and data sources. Created by Anthropic, MCP provides a standardized way to connect LLMs with the world. This guide covers everything from basics to building production MCP servers.

## What is MCP?

MCP is an open protocol that standardizes how AI models interact with:

- **Tools**: Functions the AI can execute
- **Resources**: Data sources the AI can read
- **Prompts**: Pre-defined prompt templates

Think of MCP as "USB for AI" - a universal connector that works across different AI providers and applications.

## Architecture Overview

```
┌─────────────┐     MCP Protocol     ┌─────────────┐
│  AI Client  │◄───────────────────►│  MCP Server │
│  (Claude,   │    JSON-RPC 2.0     │  (Tools &   │
│   GPT, etc) │                     │   Resources)│
└─────────────┘                     └─────────────┘
```

## Setting Up MCP

### Install MCP SDK

```bash
# Python
pip install mcp

# TypeScript
npm install @modelcontextprotocol/sdk
```

### Basic Server Implementation (Python)

```python
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

server = Server("my-tools")

@server.list_tools()
async def list_tools():
    return [
        Tool(
            name="get_weather",
            description="Get current weather for a location",
            inputSchema={
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name"
                    }
                },
                "required": ["location"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "get_weather":
        location = arguments["location"]
        weather = fetch_weather(location)
        return [TextContent(type="text", text=f"Weather in {location}: {weather}")]

async def main():
    async with stdio_server() as (read, write):
        await server.run(read, write, server.create_initialization_options())

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

### TypeScript Server

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "my-tools",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

server.setRequestHandler("tools/list", async () => ({
  tools: [{
    name: "search_docs",
    description: "Search documentation",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" }
      },
      required: ["query"]
    }
  }]
}));

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "search_docs") {
    const results = await searchDocs(args.query);
    return { content: [{ type: "text", text: results }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Resources: Exposing Data to AI

```python
from mcp.types import Resource

@server.list_resources()
async def list_resources():
    return [
        Resource(
            uri="file:///docs/readme.md",
            name="Project README",
            mimeType="text/markdown"
        ),
        Resource(
            uri="db://users/schema",
            name="Users Table Schema",
            mimeType="application/json"
        )
    ]

@server.read_resource()
async def read_resource(uri: str):
    if uri == "file:///docs/readme.md":
        content = read_file("docs/readme.md")
        return content
    elif uri == "db://users/schema":
        schema = get_db_schema("users")
        return json.dumps(schema)
```

## Client Integration

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "my-tools": {
      "command": "python",
      "args": ["/path/to/server.py"],
      "env": {
        "API_KEY": "your-key"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/docs"]
    }
  }
}
```

### Programmatic Client

```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def use_mcp_tools():
    params = StdioServerParameters(
        command="python",
        args=["server.py"]
    )
    
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # List available tools
            tools = await session.list_tools()
            print(f"Available tools: {[t.name for t in tools.tools]}")
            
            # Call a tool
            result = await session.call_tool(
                "get_weather",
                {"location": "Seoul"}
            )
            print(f"Result: {result.content[0].text}")
```

## Advanced Patterns

### Database Integration Server

```python
import asyncpg
from mcp.server import Server

server = Server("postgres-tools")

@server.list_tools()
async def list_tools():
    return [
        Tool(
            name="query_database",
            description="Execute read-only SQL query",
            inputSchema={
                "type": "object",
                "properties": {
                    "sql": {"type": "string", "description": "SELECT query only"}
                },
                "required": ["sql"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "query_database":
        sql = arguments["sql"]
        
        # Safety check
        if not sql.strip().upper().startswith("SELECT"):
            return [TextContent(type="text", text="Error: Only SELECT queries allowed")]
        
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            rows = await conn.fetch(sql)
            return [TextContent(type="text", text=format_results(rows))]
        finally:
            await conn.close()
```

### Streaming Responses

```python
@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "long_running_task":
        async for chunk in process_stream(arguments):
            yield TextContent(type="text", text=chunk)
```

## Security Best Practices

1. **Validate All Inputs**: Never trust tool arguments
2. **Principle of Least Privilege**: Limit what tools can access
3. **Rate Limiting**: Prevent abuse
4. **Audit Logging**: Track all tool invocations
5. **Sandboxing**: Run servers in isolated environments

```python
from pydantic import BaseModel, validator

class QueryInput(BaseModel):
    sql: str
    
    @validator('sql')
    def validate_sql(cls, v):
        forbidden = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER']
        upper_sql = v.upper()
        for word in forbidden:
            if word in upper_sql:
                raise ValueError(f"Forbidden SQL operation: {word}")
        return v
```

## Popular MCP Servers

| Server | Purpose |
|--------|---------|
| `@modelcontextprotocol/server-filesystem` | File system access |
| `@modelcontextprotocol/server-github` | GitHub API integration |
| `@modelcontextprotocol/server-postgres` | PostgreSQL queries |
| `@modelcontextprotocol/server-slack` | Slack integration |
| `@modelcontextprotocol/server-puppeteer` | Browser automation |

## Conclusion

MCP is becoming the standard for AI tool integration. By building MCP-compatible tools, you ensure interoperability across the AI ecosystem. Start with simple tools and gradually add complexity as you understand the protocol better.

## References

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP GitHub Repository](https://github.com/modelcontextprotocol)
- [MCP Servers Collection](https://github.com/modelcontextprotocol/servers)
