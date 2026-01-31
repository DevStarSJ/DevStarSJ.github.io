---
layout: post
title: "Deno 2.0: Complete Guide to the Modern JavaScript Runtime"
subtitle: Master Deno's new features, Node compatibility, and why it's production-ready
categories: development
tags: deno javascript typescript runtime nodejs
comments: true
---

# Deno 2.0: Complete Guide to the Modern JavaScript Runtime

Deno 2.0 has arrived as a mature, production-ready runtime that's backward compatible with Node.js while offering a superior developer experience. This comprehensive guide covers everything you need to start building with Deno today.

## Why Deno 2.0?

### Key Advantages Over Node.js

| Feature | Deno | Node.js |
|---------|------|---------|
| TypeScript | Native, zero config | Requires setup |
| Security | Secure by default | Full access |
| Package Manager | Built-in (JSR) | npm required |
| Web APIs | Native support | Limited/polyfills |
| Testing | Built-in | External tools |
| Formatting | Built-in | Prettier needed |
| Node Compatibility | Full support | N/A |

## Getting Started

### Installation

```bash
# macOS / Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex

# Homebrew
brew install deno

# Verify installation
deno --version
```

### Hello World

```typescript
// main.ts - No configuration needed!
console.log("Hello from Deno!");

// Run it
// deno run main.ts
```

### TypeScript Out of the Box

```typescript
// types.ts
interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`https://api.example.com/users/${id}`);
  return response.json();
}

const user = await fetchUser(1);
console.log(user.name); // Type-safe!
```

## Security Model

Deno is secure by default. You must explicitly grant permissions:

```bash
# Network access
deno run --allow-net main.ts

# File system read
deno run --allow-read main.ts

# File system write
deno run --allow-write main.ts

# Environment variables
deno run --allow-env main.ts

# Run subprocess
deno run --allow-run main.ts

# All permissions (development only!)
deno run -A main.ts
```

### Granular Permissions

```bash
# Only allow specific hosts
deno run --allow-net=api.example.com,localhost:8080 main.ts

# Only allow reading specific paths
deno run --allow-read=/tmp,./data main.ts

# Only specific env vars
deno run --allow-env=API_KEY,DATABASE_URL main.ts
```

### Permission Prompts

```typescript
// Request permissions at runtime
const status = await Deno.permissions.request({ name: "read", path: "./data" });

if (status.state === "granted") {
  const data = await Deno.readTextFile("./data/config.json");
  console.log(data);
}
```

## Node.js Compatibility

### Using npm Packages

```typescript
// Use npm: specifier
import express from "npm:express@4";
import chalk from "npm:chalk@5";

const app = express();

app.get("/", (req, res) => {
  console.log(chalk.green("Request received!"));
  res.send("Hello from Deno + Express!");
});

app.listen(3000);
```

### Package.json Support

```json
// package.json works in Deno 2.0!
{
  "name": "my-deno-app",
  "dependencies": {
    "express": "^4.18.0",
    "zod": "^3.22.0"
  }
}
```

```typescript
// Import just like Node.js
import express from "express";
import { z } from "zod";
```

### Node Built-in Modules

```typescript
// node: specifier for Node built-ins
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "node:http";

const configPath = join(process.cwd(), "config.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));

createServer((req, res) => {
  res.end("Hello!");
}).listen(3000);
```

## JSR: JavaScript Registry

JSR is Deno's modern package registry:

```typescript
// Import from JSR
import { Hono } from "jsr:@hono/hono";
import { z } from "jsr:@std/zod";

const app = new Hono();

app.get("/", (c) => c.text("Hello Hono!"));

Deno.serve(app.fetch);
```

### Publishing to JSR

```json
// deno.json
{
  "name": "@myorg/mypackage",
  "version": "1.0.0",
  "exports": "./mod.ts"
}
```

```bash
# Publish
deno publish
```

## Web Standard APIs

Deno implements web standards natively:

### Fetch API

```typescript
// Fetch is built-in
const response = await fetch("https://api.github.com/users/denoland");
const user = await response.json();
console.log(user);

// With options
const data = await fetch("https://api.example.com/data", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${Deno.env.get("API_KEY")}`,
  },
  body: JSON.stringify({ name: "Deno" }),
});
```

### Web Streams

```typescript
// Streaming response
async function* generateData() {
  for (let i = 0; i < 100; i++) {
    yield `data: ${i}\n`;
    await new Promise((r) => setTimeout(r, 100));
  }
}

Deno.serve(() => {
  const stream = ReadableStream.from(generateData());
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
});
```

### Web Crypto

```typescript
// Cryptography API
const key = await crypto.subtle.generateKey(
  { name: "AES-GCM", length: 256 },
  true,
  ["encrypt", "decrypt"]
);

const encoder = new TextEncoder();
const data = encoder.encode("Secret message");
const iv = crypto.getRandomValues(new Uint8Array(12));

const encrypted = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv },
  key,
  data
);

console.log("Encrypted:", new Uint8Array(encrypted));
```

## HTTP Server

### Built-in Deno.serve

```typescript
// Simple server
Deno.serve((req) => {
  return new Response("Hello World!");
});

// With options
Deno.serve({
  port: 8000,
  hostname: "0.0.0.0",
  onListen: ({ port }) => console.log(`Listening on port ${port}`),
}, (req) => {
  const url = new URL(req.url);
  
  if (url.pathname === "/api/users") {
    return Response.json([{ id: 1, name: "Alice" }]);
  }
  
  return new Response("Not Found", { status: 404 });
});
```

### Hono Framework

```typescript
import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { logger } from "jsr:@hono/hono/logger";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("/api/*", cors());

// Routes
app.get("/", (c) => c.text("Welcome!"));

app.get("/api/users/:id", (c) => {
  const id = c.req.param("id");
  return c.json({ id, name: "User " + id });
});

app.post("/api/users", async (c) => {
  const body = await c.req.json();
  return c.json({ created: body }, 201);
});

// Error handling
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

Deno.serve(app.fetch);
```

## Testing

### Built-in Test Runner

```typescript
// math.ts
export function add(a: number, b: number): number {
  return a + b;
}

export function divide(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
}
```

```typescript
// math_test.ts
import { assertEquals, assertThrows } from "jsr:@std/assert";
import { add, divide } from "./math.ts";

Deno.test("add - positive numbers", () => {
  assertEquals(add(2, 3), 5);
});

Deno.test("add - negative numbers", () => {
  assertEquals(add(-1, -1), -2);
});

Deno.test("divide - normal division", () => {
  assertEquals(divide(10, 2), 5);
});

Deno.test("divide - division by zero throws", () => {
  assertThrows(
    () => divide(10, 0),
    Error,
    "Division by zero"
  );
});

Deno.test({
  name: "async test example",
  async fn() {
    const response = await fetch("https://httpbin.org/get");
    assertEquals(response.status, 200);
  },
  permissions: { net: true },
});
```

```bash
# Run tests
deno test

# With coverage
deno test --coverage=coverage
deno coverage coverage
```

### BDD Style Testing

```typescript
import { describe, it, expect, beforeEach } from "jsr:@std/testing/bdd";

describe("Calculator", () => {
  let calc: Calculator;
  
  beforeEach(() => {
    calc = new Calculator();
  });
  
  describe("add", () => {
    it("should add two numbers", () => {
      expect(calc.add(2, 3)).toBe(5);
    });
  });
});
```

## Database Access

### PostgreSQL

```typescript
import { Pool } from "npm:pg";

const pool = new Pool({
  connectionString: Deno.env.get("DATABASE_URL"),
});

const client = await pool.connect();

try {
  const result = await client.query("SELECT * FROM users WHERE id = $1", [1]);
  console.log(result.rows[0]);
} finally {
  client.release();
}
```

### SQLite

```typescript
import { Database } from "jsr:@db/sqlite";

const db = new Database("app.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE
  )
`);

const insert = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
insert.run("Alice", "alice@example.com");

const users = db.prepare("SELECT * FROM users").all();
console.log(users);
```

### Deno KV

```typescript
// Built-in key-value store
const kv = await Deno.openKv();

// Set a value
await kv.set(["users", "1"], { name: "Alice", email: "alice@example.com" });

// Get a value
const result = await kv.get(["users", "1"]);
console.log(result.value); // { name: "Alice", email: "alice@example.com" }

// Atomic transactions
await kv.atomic()
  .set(["users", "2"], { name: "Bob" })
  .set(["emails", "bob@example.com"], "2")
  .commit();

// List with prefix
const entries = kv.list({ prefix: ["users"] });
for await (const entry of entries) {
  console.log(entry.key, entry.value);
}
```

## Configuration

### deno.json

```json
{
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  },
  "imports": {
    "@std/": "jsr:@std/",
    "hono": "jsr:@hono/hono@^4",
    "zod": "npm:zod@^3"
  },
  "tasks": {
    "dev": "deno run --watch --allow-net main.ts",
    "start": "deno run --allow-net main.ts",
    "test": "deno test --allow-read",
    "check": "deno check main.ts"
  },
  "fmt": {
    "indentWidth": 2,
    "lineWidth": 100
  },
  "lint": {
    "rules": {
      "tags": ["recommended"]
    }
  }
}
```

### Tasks (Like npm scripts)

```bash
# Run a task
deno task dev

# List all tasks
deno task
```

## Deploying Deno

### Docker

```dockerfile
FROM denoland/deno:2.0.0

WORKDIR /app

# Cache dependencies
COPY deno.json deno.lock ./
RUN deno cache --lock=deno.lock main.ts

# Copy source
COPY . .

# Compile for faster startup (optional)
RUN deno compile --allow-net --output=app main.ts

EXPOSE 8000
CMD ["./app"]
```

### Deno Deploy

```typescript
// Works on Deno Deploy with zero config
Deno.serve((req) => {
  return new Response("Hello from the edge!");
});
```

```bash
# Deploy with deployctl
deployctl deploy --project=my-app main.ts
```

## Migration from Node.js

### Step by Step

1. **Add deno.json** with imports map
2. **Update imports** to use npm: or jsr:
3. **Replace Node globals** (process → Deno.env, etc.)
4. **Run with permissions**

```typescript
// Before (Node.js)
const express = require('express');
const fs = require('fs');
const path = require('path');

// After (Deno)
import express from "npm:express@4";
import * as fs from "node:fs";
import * as path from "node:path";
```

## Conclusion

Deno 2.0 is production-ready with:

- **Full Node.js compatibility** - Use npm packages seamlessly
- **Native TypeScript** - No configuration needed
- **Secure by default** - Explicit permissions
- **Modern tooling** - Built-in formatter, linter, tester
- **Web standards** - Fetch, Streams, Crypto APIs
- **Deno KV** - Built-in database

Start your next project with Deno and experience the future of JavaScript runtimes.

## Resources

- [Deno Documentation](https://docs.deno.com)
- [JSR Registry](https://jsr.io)
- [Deno Deploy](https://deno.com/deploy)
- [Fresh Framework](https://fresh.deno.dev)
