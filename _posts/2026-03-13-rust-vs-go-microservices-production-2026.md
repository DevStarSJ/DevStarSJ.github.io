---
layout: post
title: "Rust in Production 2026: Lessons from 3 Years of Migrating Microservices from Go"
subtitle: "When Rust is worth the investment, and when Go is still the better answer"
date: 2026-03-13 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1200&q=80"
catalog: true
tags:
  - Rust
  - Go
  - Microservices
  - Performance
  - Systems Programming
  - Production
  - Engineering
---

## Introduction

Three years ago our team started an experiment: migrate select high-traffic Go microservices to Rust. Not because Rust is fashionable (it is), but because we had specific, measurable problems—memory spikes, GC pauses at p99, and CPU costs that were eating into margins.

In 2026, Rust has a mature ecosystem for backend services. **Axum**, **Tokio**, and **Sqlx** are stable and battle-tested. The borrow checker is well-understood. The hiring pool—while still smaller than Go's—has grown substantially.

This post is a candid retrospective: what worked, what surprised us, what we'd do differently, and the honest answer to when you should (and shouldn't) choose Rust over Go for services.

![Rust programming](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1000&q=80)

*Photo by Arnold Francisca on Unsplash*

---

## Our Starting Point

**The team:** 8 Go developers, 0 Rust experience at project start.

**The services:** 3 high-traffic microservices
1. **Event ingestion service** — 500K events/second peak, proto deserialization, Kafka publishing
2. **Session cache service** — In-memory LRU cache, ~4GB working set, high read/write ratio
3. **Notification fan-out service** — Fan-out to ~50K WebSocket connections per server

**The problems in Go:**
- Event ingestion: GC pauses causing p99 spikes (~80ms) under peak load
- Session cache: Memory fragmentation over multi-day runs, gradual memory growth
- Notification fan-out: Per-goroutine overhead becoming significant at 50K+ connections

---

## The Migration Journey

### Phase 1: Learning Rust (Months 1–3)

We were honest with ourselves: **Rust has a steep learning curve**. The borrow checker is not intuitive for developers coming from GC languages. We budgeted 3 months before any production code.

Learning resources that actually worked:
- [The Rust Book](https://doc.rust-lang.org/book/) — mandatory, comprehensive
- [Rustlings](https://github.com/rust-lang/rustlings) — exercises that build intuition
- [Jon Gjengset's YouTube channel](https://www.youtube.com/@jonhoo) — deep dives that explain *why*

The mental model shift that unlocked everything: **stop fighting the borrow checker, start listening to it**. Most borrow checker errors are pointing at real concurrency or lifetime issues you would have found in production.

### Phase 2: Service 1 — Event Ingestion (Months 4–8)

We chose the event ingestion service first because:
- It was stateless (no complex ownership semantics)
- The bottleneck was clear (GC pauses, serialization CPU)
- We could run both versions in parallel behind a load balancer

**Tech stack:**
```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
axum = "0.7"
rdkafka = "0.36"
prost = "0.12"       # protobuf
serde = { version = "1", features = ["derive"] }
tracing = "0.1"
tracing-subscriber = "0.3"
```

**Key implementation pattern — zero-copy deserialization:**

```rust
// Go version: allocates per message
func ProcessEvent(data []byte) (*Event, error) {
    event := &Event{}
    return event, proto.Unmarshal(data, event)
}

// Rust version: processes in-place where possible
async fn process_event(data: Bytes) -> Result<(), AppError> {
    // prost decodes directly from bytes without intermediate allocations
    let event = EventProto::decode(data)?;
    producer.send(&event).await?;
    Ok(())
}
```

**Results after 6 months in production:**

| Metric | Go | Rust | Delta |
|---|---|---|---|
| p50 latency | 2ms | 1.8ms | -10% |
| p99 latency | 82ms | 4ms | **-95%** |
| CPU usage | 32 cores | 22 cores | -31% |
| Memory | 8GB | 3.2GB | -60% |

The p99 improvement was transformational. The GC pauses were gone entirely. CPU reduction was a bonus—better cache utilization in Rust translated to meaningful efficiency gains.

### Phase 3: Session Cache Service (Months 9–14)

This was harder. The session cache required:
- Complex concurrent access patterns
- Custom LRU eviction
- Fine-grained memory control

The borrow checker fought us hard here. Our first three attempts at the LRU cache used `Arc<Mutex<...>>` everywhere and performed *worse* than Go due to lock contention. 

The breakthrough was understanding **sharding**:

```rust
use std::sync::Arc;
use parking_lot::RwLock;
use ahash::AHashMap;

const SHARD_COUNT: usize = 256;

pub struct ShardedCache {
    shards: Vec<Arc<RwLock<AHashMap<String, CacheEntry>>>>,
}

impl ShardedCache {
    pub fn new() -> Self {
        Self {
            shards: (0..SHARD_COUNT)
                .map(|_| Arc::new(RwLock::new(AHashMap::new())))
                .collect(),
        }
    }
    
    fn shard_for(&self, key: &str) -> &Arc<RwLock<AHashMap<String, CacheEntry>>> {
        let hash = ahash::RandomState::new().hash_one(key);
        &self.shards[(hash as usize) % SHARD_COUNT]
    }
    
    pub fn get(&self, key: &str) -> Option<CacheEntry> {
        self.shard_for(key).read().get(key).cloned()
    }
    
    pub fn set(&self, key: String, value: CacheEntry) {
        self.shard_for(&key).write().insert(key, value);
    }
}
```

`parking_lot::RwLock` (not `std::sync::RwLock`) and `ahash` (faster than `std::hash`) were critical for performance.

**Results:**
- Memory usage: steady at 4GB (was growing 200MB/day in Go due to fragmentation)
- p99 latency: reduced from 45ms to 8ms
- GC pauses: eliminated entirely

### Phase 4: WebSocket Fan-Out (Months 15–20)

This was our most challenging migration and our biggest learning.

Go's goroutines are *extremely* lightweight (~2KB stack). Rust's async tasks are also lightweight, but the *model is different*. In Go, you write synchronous code and the runtime handles concurrency transparently. In Rust, `async/await` requires you to understand the executor model.

```rust
use axum::extract::ws::{WebSocket, WebSocketUpgrade};
use tokio::sync::broadcast;

// Each connection gets a receiver for the broadcast channel
async fn ws_handler(
    ws: WebSocketUpgrade,
    State(tx): State<broadcast::Sender<Arc<Notification>>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, tx.subscribe()))
}

async fn handle_socket(
    mut socket: WebSocket,
    mut rx: broadcast::Receiver<Arc<Notification>>,
) {
    loop {
        tokio::select! {
            // Receive notification to broadcast
            Ok(notification) = rx.recv() => {
                if socket.send(Message::Text(
                    serde_json::to_string(&notification).unwrap()
                )).await.is_err() {
                    break; // Client disconnected
                }
            }
            // Receive message from client (ping/pong/disconnect)
            Some(msg) = socket.recv() => {
                match msg {
                    Ok(Message::Close(_)) => break,
                    Err(_) => break,
                    _ => {}
                }
            }
        }
    }
}
```

The `tokio::select!` pattern for multiplexing inbound and outbound on a WebSocket connection is clean and efficient.

**Results:**
- 50K connections: 1.8GB → 0.9GB memory (Rust tasks are smaller than goroutines for this workload)
- CPU: -28%
- Zero GC-related connection drops

---

## What We'd Do Differently

### 1. Start with Rust for New Services, Not Migrations

Migrations are expensive. You're solving two problems simultaneously: the technical migration and learning Rust. New services let you learn Rust without the risk of breaking existing users.

### 2. Invest in Shared Infrastructure Earlier

We reinvented wheels across services—tracing setup, error handling patterns, Kafka client wrappers. A shared `internal-common` crate would have saved months.

```
internal-common/
├── src/
│   ├── error.rs      # AppError enum, From impls
│   ├── tracing.rs    # Standard tracing setup
│   ├── kafka.rs      # Shared producer/consumer patterns
│   └── health.rs     # Standard health check handler
```

### 3. Use `thiserror` and `anyhow` from Day One

Error handling in Rust is excellent but verbose without libraries. `thiserror` for library errors, `anyhow` for application errors.

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("Kafka error: {0}")]
    Kafka(#[from] rdkafka::error::KafkaError),
    
    #[error("Not found: {resource} with id {id}")]
    NotFound { resource: String, id: String },
    
    #[error("Validation failed: {0}")]
    Validation(String),
}
```

---

## When to Choose Rust vs Go in 2026

### Choose Rust when:
- ✅ p99 latency under GC pauses is unacceptable
- ✅ Memory efficiency is critical (constrained environments, cost optimization)
- ✅ You need fine-grained control over allocation patterns
- ✅ You're building a library/SDK that will be used by many services
- ✅ The service is long-running (days/weeks) where GC drift matters
- ✅ High connection count services (WebSocket, TCP, game servers)

### Choose Go when:
- ✅ Team is more productive in Go (hiring, velocity)
- ✅ p99 latency requirements are >10ms (GC pauses won't matter)
- ✅ Rapid iteration on business logic is the priority
- ✅ The service isn't on the critical performance path
- ✅ You need rich tooling (Go's stdlib is more batteries-included)

### The honest answer:
**Go is still the better default for most backend services.** Rust's advantages are real but only matter in specific scenarios. Don't use Rust to feel clever—use it when the performance profile genuinely demands it.

---

## Team Impact

After 3 years:
- **8 Go developers → 6 proficient in both Go and Rust**
- **2 developers never got comfortable** with Rust and remained Go-only (we respected this)
- **Onboarding new Rust developers** is now 4–6 weeks (down from 3+ months at project start)
- **We would do it again**, but only for the 3 services it made sense for

---

## Conclusion

Rust in production is real, mature, and worth it—for the right services. The Tokio/Axum ecosystem is excellent. The performance wins are genuine. The learning curve is real but surmountable.

The key is honesty about *why* you're choosing Rust. If the answer is "because it's cool," pick Go and ship faster. If the answer is "because GC pauses are costing us SLA violations and $200K/year in compute," then Rust is the right investment.

---

*What's your experience migrating services to Rust? We'd love to hear from other teams in the comments.*

---

*References:*
- [The Rust Programming Language Book](https://doc.rust-lang.org/book/)
- [Tokio Async Runtime](https://tokio.rs)
- [Axum Web Framework](https://github.com/tokio-rs/axum)
- [Are we web yet? (Rust web ecosystem tracker)](https://www.arewewebyet.org)
