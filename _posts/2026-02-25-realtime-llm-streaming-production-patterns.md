---
layout: post
title: "Real-Time LLM Streaming in Production: Patterns for Responsive AI Applications"
subtitle: "Stop waiting for complete responses — stream tokens from LLMs to users in milliseconds with these battle-tested architecture patterns"
date: 2026-02-25
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200"
catalog: true
tags:
  - LLM
  - Streaming
  - AI
  - Backend
  - Real-Time
  - Server-Sent Events
  - WebSockets
categories: ai
---

# Real-Time LLM Streaming in Production: Patterns for Responsive AI Applications

The single most impactful UX improvement you can make to any LLM-powered application isn't a better model — it's streaming. A response that appears word-by-word in 300ms feels dramatically better than the same response delivered all at once after 8 seconds. The user can start reading, start processing, and start trusting that something is happening.

But streaming LLM responses in production comes with a set of engineering challenges that aren't obvious until you're debugging them at 3 AM. This post covers the patterns that work.

![Abstract flowing light streams representing real-time data streaming and AI token generation](https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800)
*Photo by [Possessed Photography](https://unsplash.com/@possessedphotography) on Unsplash*

---

## Why Streaming Feels So Much Better

The neuroscience is simple: humans have a pain threshold around 1 second for "did anything happen?" and around 3 seconds for "is this broken?" Streaming first-token latency under 500ms with progressive content delivery keeps users in the "engaged" state, not the "worried" state.

Compare the experience:

| Approach | Time to first byte | Time to complete | Perceived experience |
|---|---|---|---|
| Wait-then-return | 8s | 8s | "Is it frozen?" |
| Stream | 400ms | 8s | "It's working!" |

Same underlying latency. Completely different perception.

---

## Transport Layer Options

### Server-Sent Events (SSE) — The Right Default

SSE is unidirectional (server → client) over HTTP/1.1. It's the right choice for most LLM streaming because:
- Works through proxies and CDNs (unlike WebSockets)
- Automatic reconnection built into the browser
- No special protocol handling
- Works with HTTP/2 multiplexing

```
GET /api/chat/stream
Accept: text/event-stream

Response headers:
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

Response body (streamed):
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"The"}}

data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" answer"}}

data: {"type":"message_stop"}

data: [DONE]
```

### WebSockets — When You Need Bidirectional

Use WebSockets when you need to send messages *to* the LLM while it's generating (voice interruption, follow-up questions mid-stream, tool call confirmations):

```
WS /api/chat/ws

Client → Server: {"type": "message", "content": "Explain quantum computing"}
Server → Client: {"type": "token", "content": "Quantum"}
Server → Client: {"type": "token", "content": " computing"}
Client → Server: {"type": "interrupt"}  ← Can interrupt mid-stream
Server → Client: {"type": "stream_end", "interrupted": true}
```

---

## Backend: Streaming Endpoint Implementation

### Node.js with Fastify (SSE)

```typescript
// server/routes/chat.ts
import Fastify from "fastify";
import Anthropic from "@anthropic-ai/sdk";

const app = Fastify();
const client = new Anthropic();

app.post("/api/chat/stream", async (request, reply) => {
  const { messages, systemPrompt } = request.body as ChatRequest;
  
  // Set SSE headers
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "X-Accel-Buffering": "no",  // CRITICAL: Tells nginx NOT to buffer SSE
  });
  
  const sendEvent = (data: object) => {
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  try {
    // Create streaming request to Anthropic
    const stream = client.messages.stream({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    });
    
    // Track usage for billing
    let inputTokens = 0;
    let outputTokens = 0;
    
    // Stream tokens as they arrive
    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          sendEvent({ type: "token", content: event.delta.text });
        }
      } else if (event.type === "message_start") {
        inputTokens = event.message.usage?.input_tokens ?? 0;
        sendEvent({ 
          type: "start", 
          messageId: event.message.id 
        });
      } else if (event.type === "message_delta") {
        outputTokens = event.usage?.output_tokens ?? 0;
      } else if (event.type === "message_stop") {
        sendEvent({ 
          type: "done",
          usage: { inputTokens, outputTokens }
        });
      }
    }
    
  } catch (error) {
    sendEvent({ 
      type: "error", 
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  } finally {
    reply.raw.write("data: [DONE]\n\n");
    reply.raw.end();
  }
});
```

### Handling Client Disconnection

Client disconnection is the #1 missed edge case. If you don't detect it, you'll burn tokens generating responses nobody will read:

```typescript
app.post("/api/chat/stream", async (request, reply) => {
  let clientConnected = true;
  
  // Detect client disconnect
  request.raw.on("close", () => {
    clientConnected = false;
    console.log("Client disconnected, aborting LLM stream");
  });
  
  const controller = new AbortController();
  
  // Also abort when client disconnects
  request.raw.on("close", () => controller.abort());
  
  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      messages,
    }, { signal: controller.signal });  // Pass AbortSignal
    
    for await (const event of stream) {
      if (!clientConnected) break;  // Double-check before each write
      // ... handle events
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("Stream aborted due to client disconnect");
      return;  // Expected — don't log as error
    }
    // Handle actual errors
  }
});
```

---

## Frontend: Consuming Streams

### React Hook for SSE Streaming

```typescript
// hooks/useStreamingChat.ts
import { useState, useCallback, useRef } from "react";

interface StreamingState {
  content: string;
  isStreaming: boolean;
  error: string | null;
  usage: { inputTokens: number; outputTokens: number } | null;
}

export function useStreamingChat() {
  const [state, setState] = useState<StreamingState>({
    content: "",
    isStreaming: false,
    error: null,
    usage: null,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const sendMessage = useCallback(async (messages: Message[], systemPrompt?: string) => {
    // Cancel any in-progress stream
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setState({ content: "", isStreaming: true, error: null, usage: null });
    
    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, systemPrompt }),
        signal: controller.signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE lines
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";  // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          
          try {
            const event = JSON.parse(data);
            
            if (event.type === "token") {
              setState(prev => ({ 
                ...prev, 
                content: prev.content + event.content 
              }));
            } else if (event.type === "done") {
              setState(prev => ({ 
                ...prev, 
                isStreaming: false,
                usage: event.usage 
              }));
            } else if (event.type === "error") {
              setState(prev => ({ 
                ...prev, 
                isStreaming: false, 
                error: event.message 
              }));
            }
          } catch {
            // Malformed JSON — skip
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setState(prev => ({ ...prev, isStreaming: false }));
        return;  // User-initiated cancel — not an error
      }
      setState(prev => ({ 
        ...prev, 
        isStreaming: false, 
        error: error instanceof Error ? error.message : "Stream failed" 
      }));
    }
  }, []);
  
  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);
  
  return { ...state, sendMessage, cancel };
}
```

### Streaming Chat Component

```tsx
// components/StreamingChat.tsx
import { useStreamingChat } from "../hooks/useStreamingChat";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

export function StreamingChat() {
  const { content, isStreaming, error, sendMessage, cancel } = useStreamingChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [content, isStreaming]);
  
  return (
    <div className="chat-container">
      <div className="response">
        {/* Render markdown progressively — works well even mid-stream */}
        <ReactMarkdown>{content}</ReactMarkdown>
        
        {/* Blinking cursor during streaming */}
        {isStreaming && <span className="cursor">▊</span>}
        
        {error && <div className="error">{error}</div>}
        
        <div ref={bottomRef} />
      </div>
      
      <div className="controls">
        {isStreaming ? (
          <button onClick={cancel} className="btn-stop">
            ⏹ Stop
          </button>
        ) : (
          <button 
            onClick={() => sendMessage([{ role: "user", content: "Hello!" }])}
            className="btn-send"
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## Streaming Tool Use / Function Calling

Streaming gets more complex with tool use. The pattern is: stream → detect tool call → execute tool → continue streaming with result.

```typescript
// Streaming with tool call detection
for await (const event of stream) {
  if (event.type === "content_block_start") {
    if (event.content_block.type === "tool_use") {
      // Tool call starting — don't stream to user yet
      currentToolCall = {
        id: event.content_block.id,
        name: event.content_block.name,
        input: "",
      };
      sendEvent({ type: "tool_start", name: currentToolCall.name });
    }
  }
  
  if (event.type === "content_block_delta") {
    if (event.delta.type === "text_delta") {
      // Regular text — stream immediately
      sendEvent({ type: "token", content: event.delta.text });
    } else if (event.delta.type === "input_json_delta") {
      // Tool input accumulating — buffer it
      currentToolCall!.input += event.delta.partial_json;
    }
  }
  
  if (event.type === "content_block_stop" && currentToolCall) {
    // Tool call complete — execute it
    const toolInput = JSON.parse(currentToolCall.input);
    sendEvent({ type: "tool_executing", name: currentToolCall.name });
    
    const toolResult = await executeTool(currentToolCall.name, toolInput);
    
    sendEvent({ 
      type: "tool_result", 
      name: currentToolCall.name,
      result: toolResult 
    });
    
    // Continue the conversation with the tool result
    // (recursive stream handling)
    await continueWithToolResult(messages, currentToolCall, toolResult, sendEvent);
    
    currentToolCall = null;
  }
}
```

---

## Infrastructure: Making Streaming Work Through Your Stack

Streaming is fragile. Every proxy, load balancer, and CDN between your server and client can buffer your stream. Check each layer:

### Nginx Configuration

```nginx
location /api/chat/stream {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    
    # CRITICAL: Disable buffering for SSE
    proxy_buffering off;
    proxy_cache off;
    
    # Keep connection alive for long streams
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
    
    # Headers for SSE
    proxy_set_header Connection '';
    chunked_transfer_encoding on;
}
```

### AWS ALB / API Gateway

AWS API Gateway has a 29-second timeout that kills long LLM responses. Options:
1. Use ALB instead of API Gateway for streaming endpoints
2. Use Lambda Response Streaming (now GA)
3. Use WebSockets via API Gateway WebSocket API

```typescript
// Lambda Response Streaming
import { streamifyResponse, ResponseStream } from "@aws-sdk/client-lambda";

export const handler = streamifyResponse(async (event, responseStream) => {
  const metadata = {
    statusCode: 200,
    headers: { "Content-Type": "text/event-stream" }
  };
  
  responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);
  
  const stream = client.messages.stream({ /* ... */ });
  
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      responseStream.write(`data: ${JSON.stringify({ type: "token", content: event.delta.text })}\n\n`);
    }
  }
  
  responseStream.end();
});
```

### Cloudflare Workers

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    
    // Start streaming in background
    (async () => {
      const stream = client.messages.stream({ /* ... */ });
      
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          writer.write(encoder.encode(
            `data: ${JSON.stringify({ type: "token", content: event.delta.text })}\n\n`
          ));
        }
      }
      
      writer.write(encoder.encode("data: [DONE]\n\n"));
      writer.close();
    })();
    
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      }
    });
  }
};
```

---

## Resumable Streams: Handling Reconnection

Networks drop. Users close tabs. For long-running generations, implement resumable streams:

```typescript
// Server: Store partial responses in Redis
import { Redis } from "ioredis";
const redis = new Redis();

app.post("/api/chat/stream", async (request, reply) => {
  const { sessionId, resumeFrom = 0 } = request.body;
  
  const cacheKey = `stream:${sessionId}`;
  const cachedTokens = await redis.lrange(cacheKey, resumeFrom, -1);
  
  // Replay cached tokens immediately
  for (const token of cachedTokens) {
    reply.raw.write(`data: ${token}\n\n`);
  }
  
  // Continue streaming new tokens
  let tokenIndex = resumeFrom + cachedTokens.length;
  
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      const tokenData = JSON.stringify({ 
        type: "token", 
        content: event.delta.text,
        index: tokenIndex++
      });
      
      // Store in Redis with expiry
      await redis.rpush(cacheKey, tokenData);
      await redis.expire(cacheKey, 3600);  // 1 hour
      
      reply.raw.write(`data: ${tokenData}\n\n`);
    }
  }
});
```

---

![Chat application interface showing streaming AI responses with typing indicators](https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800)
*Photo by [Google DeepMind](https://unsplash.com/@googledeepmind) on Unsplash*

## Key Takeaways

- **SSE is the right default** for LLM streaming — simpler than WebSockets, better infrastructure support
- **Client disconnect detection is not optional** — abort LLM calls when the client leaves
- **`X-Accel-Buffering: no`** is the nginx header that prevents buffering; don't forget it
- **AWS API Gateway 29s timeout** kills long streams — use ALB or Lambda streaming
- **Tool use streaming** requires buffering tool inputs while streaming text outputs
- **DataLoader pattern applies to streaming** — batch tool calls when possible
- **Resumable streams** are worth the Redis complexity for long document generation

The engineering investment in proper streaming pays off in every user interaction. It's one of those rare performance improvements where the perceived speedup is larger than the actual one.
