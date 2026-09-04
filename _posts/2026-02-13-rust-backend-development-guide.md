---
layout: post
title: "Rust for Backend Development: A Practical Guide to High-Performance Services"
subtitle: "Build blazingly fast, memory-safe backend services with Rust - from basics to production deployment"
date: 2026-02-13
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=1200"
tags: [Rust, Backend Development, Performance, Web Services, Axum, Tokio]
---

# Rust for Backend Development: A Practical Guide to High-Performance Services

Rust has emerged as a compelling choice for backend development, offering memory safety without garbage collection, fearless concurrency, and performance that rivals C++. This guide walks through building production-ready backend services with Rust.

![Code on Screen](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800)
*Photo by [Arnold Francisca](https://unsplash.com/@clark_fransa) on Unsplash*

## Why Rust for Backend?

**Performance**: Zero-cost abstractions and no garbage collector mean predictable, low-latency responses.

**Safety**: The borrow checker eliminates entire classes of bugs—no null pointers, no data races.

**Ecosystem**: Mature frameworks like Axum, Actix, and libraries for every need.

## Project Setup

Start with a well-structured project:

```bash
cargo new backend-service
cd backend-service
```

Essential dependencies in `Cargo.toml`:

```toml
[package]
name = "backend-service"
version = "0.1.0"
edition = "2024"

[dependencies]
# Web framework
axum = { version = "0.7", features = ["macros"] }
tokio = { version = "1.36", features = ["full"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace", "compression-gzip"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Database
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres", "uuid", "chrono"] }

# Observability
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }

# Configuration
config = "0.14"
dotenvy = "0.15"

# Error handling
thiserror = "1.0"
anyhow = "1.0"

# Validation
validator = { version = "0.17", features = ["derive"] }

[dev-dependencies]
tokio-test = "0.4"
```

## Application Architecture

### Clean Architecture with Rust

```
src/
├── main.rs
├── config.rs
├── error.rs
├── domain/
│   ├── mod.rs
│   ├── user.rs
│   └── order.rs
├── repository/
│   ├── mod.rs
│   └── user_repo.rs
├── service/
│   ├── mod.rs
│   └── user_service.rs
├── api/
│   ├── mod.rs
│   ├── routes.rs
│   └── handlers/
│       ├── mod.rs
│       └── user_handler.rs
└── middleware/
    ├── mod.rs
    └── auth.rs
```

### Domain Models

```rust
// src/domain/user.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateUserRequest {
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
    
    #[validate(length(min = 2, max = 100, message = "Name must be 2-100 characters"))]
    pub name: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateUserRequest {
    #[validate(length(min = 2, max = 100))]
    pub name: Option<String>,
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
    #[error("Resource not found: {0}")]
    NotFound(String),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Unauthorized")]
    Unauthorized,
    
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("Internal error: {0}")]
    Internal(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            AppError::Validation(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".into()),
            AppError::Database(e) => {
                tracing::error!("Database error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".into())
            }
            AppError::Internal(e) => {
                tracing::error!("Internal error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".into())
            }
        };
        
        (status, Json(json!({ "error": message }))).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;
```

### Repository Layer

```rust
// src/repository/user_repo.rs
use crate::domain::user::{CreateUserRequest, User};
use crate::error::{AppError, AppResult};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct UserRepository {
    pool: PgPool,
}

impl UserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
    
    pub async fn find_by_id(&self, id: Uuid) -> AppResult<User> {
        sqlx::query_as::<_, User>(
            "SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("User {} not found", id)))
    }
    
    pub async fn find_all(&self, limit: i64, offset: i64) -> AppResult<Vec<User>> {
        let users = sqlx::query_as::<_, User>(
            "SELECT id, email, name, created_at, updated_at 
             FROM users 
             ORDER BY created_at DESC 
             LIMIT $1 OFFSET $2"
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;
        
        Ok(users)
    }
    
    pub async fn create(&self, req: &CreateUserRequest) -> AppResult<User> {
        let user = sqlx::query_as::<_, User>(
            "INSERT INTO users (id, email, name, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())
             RETURNING id, email, name, created_at, updated_at"
        )
        .bind(Uuid::new_v4())
        .bind(&req.email)
        .bind(&req.name)
        .fetch_one(&self.pool)
        .await?;
        
        Ok(user)
    }
    
    pub async fn delete(&self, id: Uuid) -> AppResult<()> {
        let result = sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        
        if result.rows_affected() == 0 {
            return Err(AppError::NotFound(format!("User {} not found", id)));
        }
        
        Ok(())
    }
}
```

![Server Room](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800)
*Photo by [Taylor Vick](https://unsplash.com/@tvick) on Unsplash*

### API Handlers

```rust
// src/api/handlers/user_handler.rs
use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::domain::user::{CreateUserRequest, User};
use crate::error::{AppError, AppResult};
use crate::repository::user_repo::UserRepository;

#[derive(Deserialize)]
pub struct Pagination {
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

fn default_limit() -> i64 { 20 }

pub async fn list_users(
    State(repo): State<UserRepository>,
    Query(pagination): Query<Pagination>,
) -> AppResult<Json<Vec<User>>> {
    let users = repo.find_all(pagination.limit, pagination.offset).await?;
    Ok(Json(users))
}

pub async fn get_user(
    State(repo): State<UserRepository>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<User>> {
    let user = repo.find_by_id(id).await?;
    Ok(Json(user))
}

pub async fn create_user(
    State(repo): State<UserRepository>,
    Json(payload): Json<CreateUserRequest>,
) -> AppResult<Json<User>> {
    payload.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;
    
    let user = repo.create(&payload).await?;
    Ok(Json(user))
}

pub async fn delete_user(
    State(repo): State<UserRepository>,
    Path(id): Path<Uuid>,
) -> AppResult<()> {
    repo.delete(id).await?;
    Ok(())
}
```

### Router Setup

```rust
// src/api/routes.rs
use axum::{
    routing::{get, post, delete},
    Router,
};
use tower_http::{
    compression::CompressionLayer,
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};

use crate::api::handlers::user_handler;
use crate::repository::user_repo::UserRepository;

pub fn create_router(user_repo: UserRepository) -> Router {
    let api_routes = Router::new()
        .route("/users", get(user_handler::list_users))
        .route("/users", post(user_handler::create_user))
        .route("/users/:id", get(user_handler::get_user))
        .route("/users/:id", delete(user_handler::delete_user))
        .with_state(user_repo);
    
    Router::new()
        .nest("/api/v1", api_routes)
        .route("/health", get(|| async { "OK" }))
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any)
        )
}
```

### Main Entry Point

```rust
// src/main.rs
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
mod config;
mod domain;
mod error;
mod repository;

use api::routes::create_router;
use repository::user_repo::UserRepository;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer().json())
        .init();
    
    // Load configuration
    dotenvy::dotenv().ok();
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    
    // Create database pool
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;
    
    // Run migrations
    sqlx::migrate!("./migrations").run(&pool).await?;
    
    // Create repositories
    let user_repo = UserRepository::new(pool.clone());
    
    // Create router
    let app = create_router(user_repo);
    
    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!("Starting server on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    
    Ok(())
}
```

## Performance Optimization Tips

### Connection Pooling

```rust
let pool = PgPoolOptions::new()
    .max_connections(50)
    .min_connections(5)
    .acquire_timeout(Duration::from_secs(3))
    .idle_timeout(Duration::from_secs(60))
    .connect(&database_url)
    .await?;
```

### Async Streaming for Large Responses

```rust
use axum::response::sse::{Event, Sse};
use futures::stream::{self, Stream};

pub async fn stream_events() -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let stream = stream::repeat_with(|| {
        Event::default().data("heartbeat")
    })
    .map(Ok)
    .throttle(Duration::from_secs(1));
    
    Sse::new(stream)
}
```

## Benchmarks

Typical performance on a modest 4-core server:

| Metric | Value |
|--------|-------|
| Requests/sec | 150,000+ |
| p50 latency | 0.3ms |
| p99 latency | 2ms |
| Memory usage | ~20MB |

## Conclusion

Rust delivers exceptional performance and safety for backend services. The initial learning curve pays dividends in reliability and efficiency. Start with Axum for a batteries-included experience, and gradually adopt more advanced patterns as your needs grow.

---

*Building something in Rust? Share your experience in the comments!*
