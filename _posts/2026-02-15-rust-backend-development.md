---
layout: post
title: "Rust for Backend Development: Building Fast, Safe Web Services"
subtitle: "A comprehensive guide to building production-ready APIs with Rust, Axum, and SQLx"
date: 2026-02-15
author: "Dev Star"
header-img: "https://images.unsplash.com/photo-1619410283995-43d9134e7656?w=1200"
tags: [Rust, Backend, Axum, SQLx, Web Development, API, Performance]
---

# Rust for Backend Development: Building Fast, Safe Web Services

Rust has emerged as a compelling choice for backend development. With its memory safety guarantees, zero-cost abstractions, and excellent performance, Rust delivers the reliability of managed languages with the speed of C++. Let's build a production-ready API from scratch.

![Code on Screen](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800)
*Photo by [Arnold Francisca](https://unsplash.com/@clark_fransa) on Unsplash*

## Why Rust for Backend?

| Benefit | Impact |
|---------|--------|
| Memory Safety | No null pointers, no data races |
| Performance | Comparable to C/C++ |
| Reliability | If it compiles, it likely works |
| Concurrency | Fearless concurrent programming |
| Ecosystem | Growing web framework options |

## Project Setup

```bash
# Create new project
cargo new rust-api
cd rust-api

# Add dependencies
cargo add axum tokio -F tokio/full
cargo add serde -F derive
cargo add serde_json
cargo add sqlx -F runtime-tokio,postgres,uuid,chrono
cargo add tower-http -F cors,trace
cargo add tracing tracing-subscriber
cargo add uuid -F v4,serde
cargo add chrono -F serde
cargo add thiserror anyhow
cargo add dotenvy
```

## Project Structure

```
rust-api/
├── src/
│   ├── main.rs
│   ├── lib.rs
│   ├── config.rs
│   ├── error.rs
│   ├── routes/
│   │   ├── mod.rs
│   │   ├── users.rs
│   │   └── health.rs
│   ├── models/
│   │   ├── mod.rs
│   │   └── user.rs
│   ├── handlers/
│   │   ├── mod.rs
│   │   └── users.rs
│   └── db/
│       ├── mod.rs
│       └── users.rs
├── migrations/
├── Cargo.toml
└── .env
```

## Configuration

```rust
// src/config.rs
use std::env;

#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub host: String,
    pub port: u16,
}

impl Config {
    pub fn from_env() -> Result<Self, env::VarError> {
        dotenvy::dotenv().ok();
        
        Ok(Config {
            database_url: env::var("DATABASE_URL")?,
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "3000".into())
                .parse()
                .expect("PORT must be a number"),
        })
    }
    
    pub fn addr(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}
```

## Error Handling

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
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("Internal server error")]
    Internal(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::Validation(_) => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::Database(e) => {
                tracing::error!("Database error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error".into())
            }
            AppError::Internal(e) => {
                tracing::error!("Internal error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal error".into())
            }
        };

        let body = Json(json!({
            "error": {
                "message": message,
                "code": status.as_u16()
            }
        }));

        (status, body).into_response()
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
```

## Models

```rust
// src/models/user.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateUser {
    pub email: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUser {
    pub email: Option<String>,
    pub name: Option<String>,
}

impl CreateUser {
    pub fn validate(&self) -> crate::error::Result<()> {
        if self.email.is_empty() || !self.email.contains('@') {
            return Err(crate::error::AppError::Validation(
                "Invalid email address".into()
            ));
        }
        if self.name.trim().is_empty() {
            return Err(crate::error::AppError::Validation(
                "Name cannot be empty".into()
            ));
        }
        Ok(())
    }
}
```

## Database Layer

```rust
// src/db/users.rs
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::models::user::{CreateUser, UpdateUser, User};

pub async fn create_user(pool: &PgPool, input: &CreateUser) -> Result<User> {
    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (id, email, name, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING *
        "#
    )
    .bind(Uuid::new_v4())
    .bind(&input.email)
    .bind(&input.name)
    .fetch_one(pool)
    .await?;

    Ok(user)
}

pub async fn get_user(pool: &PgPool, id: Uuid) -> Result<User> {
    sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::NotFound)
}

pub async fn list_users(pool: &PgPool, limit: i64, offset: i64) -> Result<Vec<User>> {
    let users = sqlx::query_as::<_, User>(
        "SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2"
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(users)
}

pub async fn update_user(pool: &PgPool, id: Uuid, input: &UpdateUser) -> Result<User> {
    let user = sqlx::query_as::<_, User>(
        r#"
        UPDATE users
        SET
            email = COALESCE($2, email),
            name = COALESCE($3, name),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#
    )
    .bind(id)
    .bind(&input.email)
    .bind(&input.name)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(user)
}

pub async fn delete_user(pool: &PgPool, id: Uuid) -> Result<()> {
    let result = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(())
}
```

## Handlers

```rust
// src/handlers/users.rs
use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::db::users as db;
use crate::error::Result;
use crate::models::user::{CreateUser, UpdateUser, User};
use crate::AppState;

#[derive(Deserialize)]
pub struct ListParams {
    #[serde(default = "default_limit")]
    limit: i64,
    #[serde(default)]
    offset: i64,
}

fn default_limit() -> i64 { 20 }

pub async fn create(
    State(state): State<AppState>,
    Json(input): Json<CreateUser>,
) -> Result<Json<User>> {
    input.validate()?;
    let user = db::create_user(&state.pool, &input).await?;
    Ok(Json(user))
}

pub async fn get(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<User>> {
    let user = db::get_user(&state.pool, id).await?;
    Ok(Json(user))
}

pub async fn list(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Result<Json<Vec<User>>> {
    let users = db::list_users(&state.pool, params.limit, params.offset).await?;
    Ok(Json(users))
}

pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(input): Json<UpdateUser>,
) -> Result<Json<User>> {
    let user = db::update_user(&state.pool, id, &input).await?;
    Ok(Json(user))
}

pub async fn delete(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<()> {
    db::delete_user(&state.pool, id).await?;
    Ok(())
}
```

![Developer Working](https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800)
*Photo by [Christopher Gower](https://unsplash.com/@cgower) on Unsplash*

## Routes

```rust
// src/routes/mod.rs
use axum::{
    routing::{get, post},
    Router,
};

use crate::handlers;
use crate::AppState;

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .nest("/api/v1", api_routes())
        .with_state(state)
}

fn api_routes() -> Router<AppState> {
    Router::new()
        .route("/users", get(handlers::users::list).post(handlers::users::create))
        .route(
            "/users/:id",
            get(handlers::users::get)
                .put(handlers::users::update)
                .delete(handlers::users::delete),
        )
}

async fn health() -> &'static str {
    "OK"
}
```

## Main Application

```rust
// src/main.rs
use axum::http::{header, Method};
use sqlx::postgres::PgPoolOptions;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod db;
mod error;
mod handlers;
mod models;
mod routes;

#[derive(Clone)]
pub struct AppState {
    pub pool: sqlx::PgPool,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    // Load configuration
    let config = config::Config::from_env()?;

    // Create database pool
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&config.database_url)
        .await?;

    // Run migrations
    sqlx::migrate!("./migrations").run(&pool).await?;

    // Create app state
    let state = AppState { pool };

    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    // Build router
    let app = routes::create_router(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    // Start server
    let listener = tokio::net::TcpListener::bind(&config.addr()).await?;
    tracing::info!("Server listening on {}", config.addr());
    
    axum::serve(listener, app).await?;

    Ok(())
}
```

## Database Migration

```sql
-- migrations/001_create_users.sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

## Testing

```rust
// tests/integration_test.rs
use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use tower::ServiceExt;
use serde_json::json;

#[tokio::test]
async fn test_create_user() {
    let app = create_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/users")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "email": "test@example.com",
                        "name": "Test User"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_get_user_not_found() {
    let app = create_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/users/00000000-0000-0000-0000-000000000000")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
```

## Middleware

### Authentication Middleware

```rust
use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};

pub async fn auth_middleware(request: Request, next: Next) -> Result<Response, StatusCode> {
    let auth_header = request
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok());

    match auth_header {
        Some(token) if validate_token(token) => Ok(next.run(request).await),
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}

fn validate_token(token: &str) -> bool {
    // Implement JWT validation
    token.starts_with("Bearer ")
}
```

### Request Logging

```rust
use axum::{extract::Request, middleware::Next, response::Response};
use std::time::Instant;

pub async fn logging_middleware(request: Request, next: Next) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let start = Instant::now();

    let response = next.run(request).await;

    let duration = start.elapsed();
    tracing::info!(
        method = %method,
        uri = %uri,
        status = %response.status(),
        duration_ms = %duration.as_millis(),
        "Request completed"
    );

    response
}
```

## Performance Tips

1. **Use Connection Pooling**: Always use `PgPoolOptions` with appropriate limits
2. **Compile with Release**: `cargo build --release` for 10-100x performance improvement
3. **Use Prepared Statements**: SQLx compiles queries at build time
4. **Enable Compression**: Use `tower-http`'s `CompressionLayer`
5. **Profile Your Code**: Use `cargo flamegraph` to identify bottlenecks

## Conclusion

Rust provides an excellent foundation for building backend services:

- **Type Safety**: Catch errors at compile time
- **Performance**: Near-zero overhead abstractions
- **Reliability**: Memory safety without garbage collection
- **Ecosystem**: Axum, SQLx, and Tokio form a powerful stack

The learning curve is real, but the payoff in reliability and performance is substantial. Start with small services and expand as you gain confidence.

---

*Ready to build blazingly fast, rock-solid backend services?*
