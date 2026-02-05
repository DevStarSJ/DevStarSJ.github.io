---
layout: post
title: "Rust for Backend Developers: A Practical Getting Started Guide"
subtitle: "Why Rust is taking over systems programming—and how to start using it"
date: 2026-02-05
author: "Dev Star"
header-img: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1920&q=80"
tags: [Rust, Backend, Programming, Systems, Performance]
---

Rust has gone from "interesting experiment" to "production-ready choice" for backend systems. Discord rewrote their message storage in Rust. Cloudflare runs Rust at the edge. AWS built Firecracker in Rust.

If you're a backend developer curious about Rust, this guide will get you productive fast.

![Code Editor](https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80)
*Photo by [Ilya Pavlov](https://unsplash.com/@ilyapavlov) on Unsplash*

## Why Rust for Backend?

| Benefit | What It Means |
|---------|---------------|
| **Memory safety** | No null pointers, no data races—at compile time |
| **Performance** | C/C++ speed without the footguns |
| **Concurrency** | Fearless concurrency with ownership model |
| **Tooling** | Cargo is arguably the best package manager |

## Setting Up

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify
rustc --version
cargo --version
```

## Your First HTTP Server with Axum

Axum is the modern choice for Rust web services—built on Tokio, ergonomic, and fast:

```bash
cargo new my-api
cd my-api
```

Add dependencies to `Cargo.toml`:

```toml
[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

```rust
// src/main.rs
use axum::{routing::get, routing::post, Json, Router};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct Health {
    status: String,
}

#[derive(Deserialize)]
struct CreateUser {
    name: String,
    email: String,
}

#[derive(Serialize)]
struct User {
    id: u64,
    name: String,
    email: String,
}

async fn health() -> Json<Health> {
    Json(Health {
        status: "ok".to_string(),
    })
}

async fn create_user(Json(payload): Json<CreateUser>) -> Json<User> {
    Json(User {
        id: 1,
        name: payload.name,
        email: payload.email,
    })
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/health", get(health))
        .route("/users", post(create_user));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Server running on http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}
```

```bash
cargo run
# Test it
curl http://localhost:3000/health
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alex","email":"alex@example.com"}'
```

## Understanding Ownership (The Key Concept)

Rust's ownership system is what makes it special. Here's the gist:

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;  // s1 is MOVED to s2
    
    // println!("{}", s1);  // ❌ Error: s1 is no longer valid
    println!("{}", s2);     // ✅ Works
}
```

For backend work, you'll mostly use:

```rust
// Clone when you need a copy
let s2 = s1.clone();

// References when you just need to read
fn print_len(s: &String) {
    println!("{}", s.len());
}

// Mutable references when you need to modify
fn append_world(s: &mut String) {
    s.push_str(" world");
}
```

![Programming Concept](https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&q=80)
*Photo by [Kevin Ku](https://unsplash.com/@ikukevk) on Unsplash*

## Error Handling Done Right

Rust uses `Result<T, E>` instead of exceptions:

```rust
use std::fs::File;
use std::io::Read;

fn read_config() -> Result<String, std::io::Error> {
    let mut file = File::open("config.toml")?;  // ? propagates errors
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

fn main() {
    match read_config() {
        Ok(config) => println!("Config: {}", config),
        Err(e) => eprintln!("Failed to read config: {}", e),
    }
}
```

For web services, use `anyhow` for application errors and `thiserror` for library errors:

```rust
use anyhow::{Context, Result};

async fn fetch_user(id: u64) -> Result<User> {
    let user = db.get_user(id)
        .await
        .context("Failed to fetch user from database")?;
    Ok(user)
}
```

## Database Access with SQLx

SQLx provides compile-time checked SQL:

```toml
[dependencies]
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres"] }
```

```rust
use sqlx::postgres::PgPoolOptions;

#[derive(sqlx::FromRow)]
struct User {
    id: i64,
    name: String,
    email: String,
}

async fn get_user(pool: &sqlx::PgPool, id: i64) -> Result<User, sqlx::Error> {
    sqlx::query_as!(
        User,
        "SELECT id, name, email FROM users WHERE id = $1",
        id
    )
    .fetch_one(pool)
    .await
}
```

The magic: if your SQL is wrong or types don't match, **it won't compile**.

## Async/Await in Rust

Rust's async is zero-cost—no garbage collector, no runtime overhead:

```rust
async fn fetch_all() -> Vec<Data> {
    let (users, orders, products) = tokio::join!(
        fetch_users(),
        fetch_orders(),
        fetch_products(),
    );
    // All three run concurrently
    combine(users, orders, products)
}
```

## Performance Comparison

Real benchmarks from the TechEmpower Framework Benchmarks:

| Framework | Requests/sec (JSON) |
|-----------|---------------------|
| Axum (Rust) | ~700,000 |
| Actix (Rust) | ~650,000 |
| Go (stdlib) | ~450,000 |
| Node.js (fastify) | ~200,000 |

## Learning Path

1. **Week 1-2**: Ownership, borrowing, lifetimes
2. **Week 3-4**: Structs, enums, pattern matching
3. **Week 5-6**: Error handling, traits
4. **Week 7-8**: Async/await, web frameworks

## Resources

- [The Rust Book](https://doc.rust-lang.org/book/) - Official, excellent
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/) - Learn by doing
- [Zero to Production in Rust](https://www.zero2prod.com/) - Backend-focused book

## Should You Use Rust?

**Yes if:**
- Performance is critical
- You need memory safety guarantees
- You're building infrastructure/systems
- You want to prevent entire classes of bugs

**Maybe not if:**
- Rapid prototyping is priority
- Team has no systems programming experience
- Simple CRUD with no performance requirements

## Conclusion

Rust has a steep learning curve, but the payoff is real. Once you internalize ownership, you'll write faster, safer code than in any garbage-collected language.

The compiler is strict because it cares about you. Trust it.

---

*Start your Rust journey: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`*
