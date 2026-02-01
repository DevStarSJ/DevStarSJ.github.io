---
layout: post
title: "Rust for Backend Development: Why Companies Are Making the Switch"
description: "Complete guide to building backend services with Rust. Explore Actix, Axum, SQLx, and production patterns from companies running Rust at scale."
category: backend
tags: [rust, backend, web-development, actix, axum, programming, performance]
date: 2026-02-01
read_time: 15
header-img: "https://images.unsplash.com/photo-1509966756634-9c23dd6e6815?w=1200"
---

# Rust for Backend Development: Why Companies Are Making the Switch

Rust isn't just for systems programming anymore. Discord, Cloudflare, AWS, and Figma run critical backend services in Rust. Here's why — and how to get started.

![Coding Setup](https://images.unsplash.com/photo-1509966756634-9c23dd6e6815?w=800)
*Photo by [Tudor Baciu](https://unsplash.com/@tudorbaciu) on Unsplash*

## Why Rust for Backend?

### The Performance Story

Rust's performance is legendary, but backend doesn't always need maximum speed. So why bother?

**1. Predictable latency**

No garbage collector means no GC pauses:
- Go: 99th percentile spikes during GC
- Node.js: Event loop blocking
- Rust: Consistent latency

Discord famously switched from Go to Rust when GC pauses caused visible lag in their Read States service.

**2. Lower infrastructure costs**

Same work, fewer servers:

| Language | Requests/sec (typical API) | Instances needed |
|----------|---------------------------|------------------|
| Python/Django | 1,000-5,000 | 10 |
| Node.js/Express | 10,000-30,000 | 3 |
| Go/Gin | 30,000-100,000 | 1-2 |
| Rust/Axum | 50,000-200,000 | 1 |

**3. Memory efficiency**

Rust uses 2-10x less memory than garbage-collected languages. At scale, that's millions saved.

### The Safety Story

Rust's compile-time guarantees catch bugs that would be runtime crashes or security vulnerabilities:

- No null pointer exceptions
- No data races
- No buffer overflows
- No use-after-free

For services handling financial data or PII, this matters.

## The Modern Rust Backend Stack

### Web Frameworks

**Axum** (Recommended for new projects)
- Built on Tokio/Hyper (battle-tested)
- Tower middleware ecosystem
- Great ergonomics
- From the Tokio team

**Actix Web**
- Maximum performance
- Slightly more complex
- Large ecosystem
- Mature and stable

### Database Access

**SQLx** (Recommended)
- Compile-time SQL verification
- Pure Rust (no C dependencies)
- Async native
- Works with PostgreSQL, MySQL, SQLite

**Diesel**
- Type-safe ORM
- Sync (requires spawn_blocking for async)
- More opinionated

### Essential Crates

```toml
[dependencies]
# Web framework
axum = "0.7"
tokio = { version = "1", features = ["full"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace"] }

# Database
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres"] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# Error handling
thiserror = "1"
anyhow = "1"

# Observability
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

# Config
config = "0.14"
dotenvy = "0.15"
```

![Server Room](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800)
*Photo by [Taylor Vick](https://unsplash.com/@tvick) on Unsplash*

## Building a Production API

Let's build a real-world API with all the production essentials.

### Project Structure

```
src/
├── main.rs           # Entry point
├── lib.rs            # Library root
├── config.rs         # Configuration
├── routes/
│   ├── mod.rs
│   ├── health.rs
│   └── users.rs
├── models/
│   ├── mod.rs
│   └── user.rs
├── db/
│   ├── mod.rs
│   └── users.rs
├── error.rs          # Error types
└── middleware/
    ├── mod.rs
    └── auth.rs
```

### Main Entry Point

```rust
// src/main.rs
use std::net::SocketAddr;
use axum::Router;
use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod routes;
mod models;
mod db;
mod error;
mod middleware;

use config::Config;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    // Load config
    let config = Config::load()?;

    // Database pool
    let pool = PgPoolOptions::new()
        .max_connections(config.database.max_connections)
        .connect(&config.database.url)
        .await?;

    // Run migrations
    sqlx::migrate!().run(&pool).await?;

    // Build router
    let app = Router::new()
        .merge(routes::health::router())
        .merge(routes::users::router())
        .with_state(AppState { pool, config })
        .layer(tower_http::trace::TraceLayer::new_for_http());

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!("Starting server on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

#[derive(Clone)]
pub struct AppState {
    pub pool: sqlx::PgPool,
    pub config: Config,
}
```

### Error Handling

```rust
// src/error.rs
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Resource not found")]
    NotFound,
    
    #[error("Unauthorized")]
    Unauthorized,
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("Internal error: {0}")]
    Internal(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, self.to_string()),
            AppError::Validation(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Database(e) => {
                tracing::error!("Database error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error".into())
            }
            AppError::Internal(e) => {
                tracing::error!("Internal error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal error".into())
            }
        };

        let body = Json(json!({ "error": message }));
        (status, body).into_response()
    }
}
```

### User Routes

```rust
// src/routes/users.rs
use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{db, error::AppError, AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/users", get(list_users).post(create_user))
        .route("/users/:id", get(get_user).put(update_user).delete(delete_user))
}

#[derive(Serialize)]
pub struct UserResponse {
    id: Uuid,
    email: String,
    name: String,
    created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize)]
pub struct CreateUserRequest {
    email: String,
    name: String,
    password: String,
}

async fn list_users(
    State(state): State<AppState>,
) -> Result<Json<Vec<UserResponse>>, AppError> {
    let users = db::users::list(&state.pool).await?;
    Ok(Json(users.into_iter().map(Into::into).collect()))
}

async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<UserResponse>, AppError> {
    let user = db::users::find_by_id(&state.pool, id)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(user.into()))
}

async fn create_user(
    State(state): State<AppState>,
    Json(req): Json<CreateUserRequest>,
) -> Result<Json<UserResponse>, AppError> {
    // Validate
    if req.email.is_empty() {
        return Err(AppError::Validation("Email required".into()));
    }
    
    // Hash password (use argon2 in production)
    let password_hash = hash_password(&req.password)?;
    
    let user = db::users::create(&state.pool, &req.email, &req.name, &password_hash).await?;
    Ok(Json(user.into()))
}
```

### Database Layer with SQLx

```rust
// src/db/users.rs
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::User;

pub async fn list(pool: &PgPool) -> Result<Vec<User>, sqlx::Error> {
    sqlx::query_as!(
        User,
        r#"
        SELECT id, email, name, password_hash, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 100
        "#
    )
    .fetch_all(pool)
    .await
}

pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as!(
        User,
        r#"
        SELECT id, email, name, password_hash, created_at, updated_at
        FROM users
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(pool)
    .await
}

pub async fn create(
    pool: &PgPool,
    email: &str,
    name: &str,
    password_hash: &str,
) -> Result<User, sqlx::Error> {
    sqlx::query_as!(
        User,
        r#"
        INSERT INTO users (email, name, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, email, name, password_hash, created_at, updated_at
        "#,
        email,
        name,
        password_hash
    )
    .fetch_one(pool)
    .await
}
```

## Common Patterns

### Middleware (Authentication)

```rust
// src/middleware/auth.rs
use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};

use crate::{error::AppError, AppState};

pub async fn auth(
    State(state): State<AppState>,
    TypedHeader(auth): TypedHeader<Authorization<Bearer>>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let token = auth.token();
    
    let claims = verify_jwt(token, &state.config.jwt_secret)
        .map_err(|_| AppError::Unauthorized)?;
    
    // Add user info to request extensions
    req.extensions_mut().insert(claims);
    
    Ok(next.run(req).await)
}
```

### Graceful Shutdown

```rust
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received");
}

// In main:
axum::serve(listener, app)
    .with_graceful_shutdown(shutdown_signal())
    .await?;
```

## Performance Tips

### 1. Use Release Builds

```bash
cargo build --release
```

Debug builds are 10-100x slower.

### 2. Tune Tokio Runtime

```rust
#[tokio::main(flavor = "multi_thread", worker_threads = 4)]
async fn main() { }
```

### 3. Connection Pooling

```rust
let pool = PgPoolOptions::new()
    .max_connections(50)
    .min_connections(5)
    .acquire_timeout(Duration::from_secs(3))
    .idle_timeout(Duration::from_secs(600))
    .connect(&database_url)
    .await?;
```

### 4. Use Streaming for Large Responses

```rust
use futures::stream::StreamExt;

async fn stream_users(State(state): State<AppState>) -> impl IntoResponse {
    let stream = sqlx::query_as!(User, "SELECT * FROM users")
        .fetch(&state.pool)
        .map(|r| r.map(|u| format!("{}\n", serde_json::to_string(&u).unwrap())));
    
    Body::from_stream(stream)
}
```

## Learning Path

1. **Week 1-2**: Rust basics (ownership, borrowing, lifetimes)
2. **Week 3**: Async Rust with Tokio
3. **Week 4**: Build a simple API with Axum
4. **Week 5**: Add database with SQLx
5. **Week 6**: Authentication, middleware, error handling
6. **Week 7+**: Production patterns (observability, testing, deployment)

## When NOT to Use Rust

- Rapid prototyping (Python/Node.js faster to iterate)
- Small CRUD apps (overhead not worth it)
- Team has no Rust experience and tight deadlines
- IO-bound apps where performance doesn't matter

## Conclusion

Rust for backend is a serious option in 2026. The ecosystem is mature, the performance is unmatched, and the safety guarantees are real.

The learning curve is steep — expect 2-3 months to become productive. But once you're there, you'll ship services that are fast, safe, and surprisingly pleasant to maintain.

Start small: rewrite one latency-sensitive service. Measure the results. Then decide if Rust is right for your stack.

---

*Is Rust on your backend roadmap? The compiler is strict, but it's also your best friend.*
