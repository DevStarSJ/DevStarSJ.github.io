---
layout: post
title: "Rust in Production: Lessons from Three Years of Replacing Python and Go Services"
subtitle: "What actually happens when you rewrite performance-critical services in Rust — the wins, the pain, and the team dynamics"
date: 2026-03-07 10:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=1200"
catalog: true
tags:
  - Rust
  - Performance
  - Systems Programming
  - Go
  - Python
---

I've spent the last three years migrating production services from Python and Go to Rust. Some migrations were triumphant. A few were disasters we quietly rolled back. Most were somewhere in between — significant wins that came with real costs.

This post is the honest retrospective I wish I had before starting.

![Close-up of circuit board with amber and gold electronic components](https://images.unsplash.com/photo-1518770660439-4636190af475?w=800)
*Photo by Alexandre Debiève on Unsplash*

---

## Why We Started Rewriting Things in Rust

The origin story isn't glamorous: we had a Python data processing service that was eating 40 cores at peak load, with p99 latencies that made our SLO look aspirational rather than contractual. A Go rewrite improved things. A Rust rewrite made the problem disappear.

The first Rust service processed the same workload on **4 cores** with p99 latency dropping from 340ms to 12ms. Memory usage went from 18GB to 2.1GB.

Those numbers get attention. Executives see lower cloud bills. Engineers see interesting technical work. A program begins.

Three years later, we have about 30 production Rust services across infrastructure tooling, data pipelines, API gateways, and networking code. Here's what we learned.

---

## The Wins: What Rust Actually Delivers

### Performance That Scales Linearly

Rust's zero-cost abstractions mean the performance you see in benchmarks is the performance you get in production, without GC pauses, JIT warm-up, or unpredictable spikes.

Our API gateway, previously in Go, had periodic latency spikes under high concurrency. The profiler consistently showed GC pressure as the culprit. The Rust version — using Tokio async runtime — has flat latency curves under load. No spikes. The p99 is genuinely close to the p50.

For real-time systems, this predictability matters more than raw throughput.

### Memory Safety Without the Tax

Go and Python catch most memory errors, but they do it through runtime checks and GC. Rust catches them at compile time, and the runtime has no GC overhead.

For long-running services, this means:
- No memory leak triage sessions at 2 AM
- No OOM kills from gradual heap growth
- No GC tuning to balance throughput and pause time

The compiler is strict, but it's right. Every time the borrow checker blocks something that "seems fine," reviewing it carefully almost always reveals a legitimate issue.

### Fearless Concurrency (For Real)

Rust's ownership model extends to threading. Data races are compile-time errors. The `Send` and `Sync` traits encode thread safety into the type system.

```rust
// This won't compile — and it shouldn't
let data = vec![1, 2, 3];
let handle = thread::spawn(|| {
    println!("{:?}", data); // data moved into closure
});
println!("{:?}", data); // ERROR: data already moved
handle.join().unwrap();
```

After working in Go (where data races are runtime panics, if you're lucky, or silent corruption if you're not), having the compiler catch these feels like a superpower.

### The Ecosystem Has Matured

Three years ago, the Tokio async ecosystem felt a bit rough. Today, it's excellent:

- **Axum/Actix-web**: Production-grade HTTP frameworks
- **SQLx**: Async, compile-time-checked SQL queries
- **Serde**: JSON/binary serialization that's both fast and ergonomic
- **Tonic**: gRPC with excellent tooling
- **Tracing**: Structured logging and distributed tracing, world-class

The async ecosystem in particular has converged. Most libraries are Tokio-compatible, and `async/await` syntax is natural to write.

---

## The Real Costs: What Nobody Tells You

### The Learning Curve Is a Cliff, Not a Hill

I've onboarded dozens of engineers to Rust. The honest timeline:
- **Week 1-2**: Fighting the borrow checker on every line
- **Week 3-4**: Starting to internalize ownership, still getting blocked regularly
- **Month 2**: Writing code that compiles, still not writing idiomatic Rust
- **Month 3-6**: Becoming productive, appreciating why the rules exist
- **6-12 months**: Writing genuinely good Rust

For engineers coming from Python, the gap is enormous. For Go engineers, it's smaller but still significant. For C++ engineers, it's often surprisingly easy.

The productivity dip during onboarding is real and should be planned for. A Rust migration that doubles the size of a team's codebase while also requiring everyone to learn a new language will blow schedules.

### Compile Times Are a Developer Experience Problem

A mid-size Rust project compiles in 30-60 seconds on first build, 10-20 seconds on incremental builds. Compare to Go's near-instant compilation or Python's none-at-all.

This doesn't sound catastrophic until you're iterating quickly on a complex algorithm, and every test cycle has a 15-second wall. We've invested significantly in:

```toml
# Cargo.toml - Optimization for dev compile speed
[profile.dev]
opt-level = 0
debug = true
incremental = true

[profile.dev.package."*"]
opt-level = 2  # Optimize dependencies but not our code
```

Plus `sccache` for distributed caching, and `mold` as a faster linker. Even with these tools, compile times remain a quality-of-life issue compared to Go.

### Error Handling Is Verbose Until You Find Your Pattern

Rust's `Result<T, E>` type is safer than exceptions and more explicit than Go's `(value, error)` tuple. But idiomatic error handling took our team months to converge on.

```rust
// Before finding our pattern: verbose and inconsistent
fn process_user(id: u64) -> Result<User, Box<dyn std::error::Error>> {
    let user = db.find_user(id)?;
    let permissions = auth.check(user.id)?;
    if !permissions.contains("read") {
        return Err(Box::new(AuthError::Unauthorized));
    }
    Ok(user)
}

// After adopting thiserror + anyhow pattern: clean and consistent
use thiserror::Error;
use anyhow::{Context, Result};

#[derive(Error, Debug)]
enum ServiceError {
    #[error("User {0} not found")]
    NotFound(u64),
    #[error("Insufficient permissions: {0}")]
    Unauthorized(String),
}

fn process_user(id: u64) -> Result<User> {
    let user = db.find_user(id)
        .context("fetching user from database")?;
    let permissions = auth.check(user.id)
        .context("checking user permissions")?;
    if !permissions.contains("read") {
        return Err(ServiceError::Unauthorized("read".into()).into());
    }
    Ok(user)
}
```

Once you settle on `thiserror` for library errors and `anyhow` for application errors, it's actually better than most languages. Getting there takes time.

---

## ![Developer typing code at a laptop with multiple monitors](https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=800)
*Photo by Emile Perron on Unsplash*

## When to Rewrite in Rust (And When Not To)

After three years, here's my decision framework:

### Good Candidates for Rust

**CPU-bound data processing**: If you're processing gigabytes of data, doing heavy computation, or CPU is your bottleneck — Rust delivers.

**Latency-critical services**: API gateways, real-time bidding, trading systems, anything where p99 matters and GC pauses are unacceptable.

**Long-lived, stable services**: Services that change infrequently benefit most from Rust's upfront investment. A core message router that's been stable for 2 years is perfect.

**Infrastructure tooling**: CLI tools, system daemons, build tools — places where startup time, memory footprint, and distribution matter.

**Networking and I/O heavy**: Proxies, protocol implementations, network tools — Rust's async model excels here.

### Poor Candidates for Rust

**Rapid product iteration**: If requirements change weekly and you're adding features constantly, Rust's verbosity slows you down. Python or Go and performance optimization later.

**CRUD APIs with simple business logic**: If you're doing database reads and JSON serialization, Go is 90% of the performance with 30% of the code. The marginal gain from Rust isn't worth it.

**Data science and ML**: Python's ecosystem dominance in this space isn't close to being challenged. Use Python, call Rust via PyO3 for the hot loops if needed.

**Teams new to systems programming**: A team that's never dealt with memory management will have a brutal time and ship slowly for 12+ months.

---

## The Interop Story: Rust Alongside Python and Go

The pragmatic answer for most organizations isn't "rewrite everything in Rust." It's **use Rust for the performance-critical parts and interop with your existing stack**.

### Python ↔ Rust via PyO3

```rust
// A Rust function exposed to Python
use pyo3::prelude::*;

#[pyfunction]
fn process_batch(data: Vec<f64>) -> PyResult<Vec<f64>> {
    Ok(data.iter().map(|x| x * 2.0 + 1.0).collect())
}

#[pymodule]
fn my_rust_module(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(process_batch, m)?)?;
    Ok(())
}
```

```python
# In Python, it's just a module
import my_rust_module
results = my_rust_module.process_batch([1.0, 2.0, 3.0])
# 100x faster than pure Python for compute-heavy ops
```

This pattern — Python for orchestration and API, Rust for the hot computation path — is increasingly common in data engineering and ML serving.

### Go ↔ Rust via gRPC

For microservices, the cleanest interop is standard RPC. Define a protobuf schema, implement in Rust, call from Go (or any other language). No FFI complexity, full type safety, works across machines.

---

## Team Dynamics: The Cultural Layer

Technical excellence doesn't guarantee adoption. Rust migrations that succeed share some cultural traits:

**Champions matter**: One or two engineers who deeply know Rust and actively help their teammates through the hard parts. Without champions, people get stuck and frustrated.

**Pair programming during learning**: The borrow checker fights are much less demoralizing when you have someone to rubber-duck with who knows the patterns.

**Standards from early**: Establish error handling patterns, async patterns, and testing conventions before you have 20 services doing things 20 different ways.

**Don't force it**: Developers who don't want to learn Rust and are told they have to will produce resentful, low-quality code. The migration works best when people opt into it.

---

## The Bottom Line

Rust in production is genuinely worth it — for the right workloads, with the right team, with realistic expectations.

The performance is real. The safety is real. The learning curve is real. The compile times are real.

Three years in, we wouldn't roll back. Our infrastructure Rust is faster, more reliable, and cheaper to run than what it replaced. But we've also learned to be selective — not everything needs to be Rust, and forcing Rust where Go or Python would suffice creates costs without proportional benefits.

The best Rust code is in services that have been stable for years, where the upfront investment in ergonomics and learning has paid off many times over. The worst Rust code is in services that changed requirements five times during the rewrite.

Know your workload. Know your team. Invest in the learning. Reap the rewards.
