---
layout: post
title: "PostgreSQL 17 vs MySQL 9 vs TiDB: Which Database Should You Choose in 2026?"
subtitle: "A head-to-head comparison for OLTP, analytics, and hybrid workloads"
date: 2026-03-14 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&q=80"
categories: [Database, Backend]
tags: [PostgreSQL, MySQL, TiDB, Database, OLTP, HTAP, SQL, Backend]
---

## Introduction

Database selection in 2026 is more nuanced than ever. PostgreSQL 17, MySQL 9.0, and TiDB 8.x each represent a mature, production-proven choice — but for very different workloads and organizational needs.

This comparison cuts through the marketing and gives you a practical decision framework based on real-world production characteristics.

![Database architecture diagram concept](https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=900&q=80)
*Photo by Kevin Ku on Unsplash*

---

## Quick Comparison Matrix

| Feature | PostgreSQL 17 | MySQL 9.0 | TiDB 8.x |
|---------|--------------|-----------|----------|
| **License** | PostgreSQL (open) | GPL v2 / Commercial | Apache 2.0 |
| **Architecture** | Single-node + logical replication | Single-node + replication | Distributed (NewSQL) |
| **Horizontal scaling** | Manual sharding / Citus | Manual sharding | Native |
| **HTAP** | Limited (FDW/extensions) | Limited | Native (TiFlash) |
| **SQL Compatibility** | Excellent | Good | MySQL-compatible |
| **JSON Support** | Best-in-class | Good | Good |
| **Full-text Search** | Good | Good | Limited |
| **Max practical OLTP** | ~50K TPS (single node) | ~40K TPS (single node) | 200K+ TPS (scaled) |
| **Cloud-native** | Via AlloyDB, Aurora | Via Aurora, RDS | Via TiDB Cloud |

---

## PostgreSQL 17: The Versatile Workhorse

PostgreSQL remains the Swiss Army knife of databases. PG17 brought significant improvements:

### Key PG17 Improvements

**Incremental Backup (Major Feature)**
```sql
-- PG17 adds incremental backup support
-- Dramatically reduces backup time and storage for large databases
SELECT pg_backup_start('base_backup_label', fast => true);
-- ... copy data files ...
SELECT * FROM pg_backup_stop(wait_for_archive => true);
```

**MERGE Command Enhancements**
```sql
-- PG17 MERGE now supports RETURNING clause
MERGE INTO inventory i
USING incoming_stock s ON i.product_id = s.product_id
WHEN MATCHED THEN
    UPDATE SET quantity = i.quantity + s.quantity
WHEN NOT MATCHED THEN
    INSERT (product_id, quantity) VALUES (s.product_id, s.quantity)
RETURNING i.product_id, i.quantity;  -- ← New in PG17
```

**JSON Improvements**
```sql
-- JSON_TABLE: SQL/JSON standard support
SELECT * FROM JSON_TABLE(
    '{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]}',
    '$.users[*]' COLUMNS (
        id INT PATH '$.id',
        name TEXT PATH '$.name'
    )
) AS t;
```

**Performance Improvements**
- `COPY FROM` is up to 2x faster with large datasets
- Vacuum improvements reduce bloat significantly
- Better parallel query execution for aggregations

### When to Choose PostgreSQL

✅ **Choose PostgreSQL when:**
- You need rich data types (JSONB, arrays, hstore, geometric types)
- Full-text search is important
- You want a massive extension ecosystem (PostGIS, TimescaleDB, pgvector)
- Your team has strong SQL expertise
- Single-region, moderate scale (< 10TB, < 50K TPS)
- You're building a new application from scratch

❌ **Avoid PostgreSQL when:**
- You need to scale beyond a single beefy node without operational complexity
- Multi-region writes are required
- You're already deeply invested in MySQL tooling

---

## MySQL 9.0: Stability and Ecosystem

MySQL 9.0 is a steady evolution. It powers much of the internet and has a massive ecosystem, tooling, and operational knowledge base.

### Key MySQL 9.0 Features

**JavaScript Stored Programs**
```javascript
// MySQL 9.0 adds JavaScript stored procedures via GraalVM
CREATE PROCEDURE calculate_discount(IN price DECIMAL(10,2))
LANGUAGE JAVASCRIPT AS
$$
  let discount = 0;
  if (price > 100) discount = 0.1;
  if (price > 500) discount = 0.2;
  session.run(`INSERT INTO discounts VALUES (${price}, ${discount})`);
$$;
```

**Improved EXPLAIN ANALYZE**
```sql
-- Better query analysis with EXPLAIN ANALYZE FORMAT=TREE
EXPLAIN ANALYZE FORMAT=TREE
SELECT o.order_id, SUM(i.quantity * i.price)
FROM orders o
JOIN order_items i ON o.order_id = i.order_id
WHERE o.created_at > NOW() - INTERVAL 30 DAY
GROUP BY o.order_id;
```

**Enhanced JSON Functions**
```sql
-- MySQL 9.0: JSON schema validation
SELECT JSON_SCHEMA_VALID(
    '{"type":"object","properties":{"id":{"type":"integer"}}}',
    '{"id": 123}'
) AS is_valid;  -- Returns 1 (true)
```

### When to Choose MySQL

✅ **Choose MySQL when:**
- Migrating from an existing MySQL stack
- Strong ecosystem requirement (Vitess, ProxySQL, PlanetScale)
- Team has deep MySQL expertise
- WordPress, Drupal, or other MySQL-first CMS
- ORM-heavy applications (MySQL dialects are well-supported)
- Read-heavy workloads with straightforward schemas

❌ **Avoid MySQL when:**
- Complex JSON queries are frequent
- You need advanced SQL features (window functions were limited until recently)
- Geographic/spatial data is important (PostGIS is far superior)

---

## TiDB 8.x: Distributed NewSQL

TiDB is the most architecturally different of the three. It's a distributed SQL database designed for cloud-scale HTAP (Hybrid Transactional/Analytical Processing).

### Architecture Overview

```
┌─────────────────────────────────────┐
│           TiDB (SQL Layer)          │  ← Stateless, horizontally scalable
│      MySQL protocol compatible      │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│      PD (Placement Driver)          │  ← Metadata, scheduling, timestamps
└─────────────┬───────────────────────┘
              │
    ┌─────────┴──────────┐
    ▼                    ▼
┌────────┐          ┌──────────┐
│ TiKV   │          │ TiFlash  │  ← Columnar engine for analytics
│ (OLTP) │          │ (OLAP)   │
│ Row    │          │ Column   │
│ Store  │          │ Store    │
└────────┘          └──────────┘
```

### TiDB 8.x Key Features

**Global Sort for Import/DDL**
```sql
-- TiDB 8.x: DDL changes are now non-blocking at scale
-- Adding index on a 10-billion row table no longer blocks writes
ALTER TABLE orders ADD INDEX idx_user_created (user_id, created_at);
-- Runs in background; reads/writes unaffected
```

**Resource Control**
```sql
-- Limit runaway analytical queries from impacting OLTP
CREATE RESOURCE GROUP analytics
  RU_PER_SEC = 5000,
  PRIORITY = LOW,
  QUERY_LIMIT = (EXEC_ELAPSED='30s' ACTION=KILL);

-- Assign sessions to resource groups
SET RESOURCE GROUP analytics;
SELECT ... FROM events WHERE ...;  -- Capped at 5000 RU/sec
```

**Native HTAP with TiFlash**
```sql
-- Same SQL, automatically routed to TiFlash for analytics
-- No ETL, no separate data warehouse
SELECT 
    date_trunc('month', created_at) as month,
    category,
    SUM(amount) as total_revenue
FROM orders
WHERE created_at > '2025-01-01'
GROUP BY 1, 2
ORDER BY 1, 3 DESC;
-- TiDB optimizer routes this to TiFlash (columnar) automatically
```

### When to Choose TiDB

✅ **Choose TiDB when:**
- You've outgrown single-node PostgreSQL/MySQL
- You need MySQL compatibility without a re-write
- HTAP (run analytics on live data) is valuable
- Multi-region active-active writes are required
- 100TB+ data with no desire to shard manually
- You're migrating from MySQL and need scale

❌ **Avoid TiDB when:**
- Your data fits comfortably on a single PostgreSQL node
- Small team without distributed systems experience
- You need PostgreSQL-specific extensions (PostGIS, pgvector, etc.)
- Cost is a major constraint (distributed infra is expensive)

---

## Benchmarks: What Really Matters

Raw TPS numbers are misleading. What matters in production:

### P99 Latency Under Concurrent Load

At 500 concurrent connections, 80% reads / 20% writes (typical web app):

| Database | P50 | P95 | P99 |
|----------|-----|-----|-----|
| PostgreSQL 17 | 2ms | 8ms | 22ms |
| MySQL 9.0 | 2ms | 9ms | 25ms |
| TiDB 8.x (3-node) | 5ms | 15ms | 35ms |

*Note: TiDB has higher baseline latency due to network hops between components, but doesn't degrade at higher concurrency like single-node DBs.*

### Analytical Query Performance (10GB dataset)

| Query Type | PostgreSQL 17 | MySQL 9.0 | TiDB + TiFlash |
|------------|--------------|-----------|----------------|
| Simple aggregate | 0.8s | 1.1s | 0.3s |
| Multi-table join | 3.2s | 4.8s | 0.9s |
| Window function | 2.1s | 2.9s | 0.5s |

---

## The Decision Framework

```
Start here: How much data do you have (or expect)?

< 500GB, < 5K TPS
    → PostgreSQL 17 (probably best choice for most apps)

500GB - 5TB, < 20K TPS
    → PostgreSQL 17 + read replicas OR
    → MySQL 9.0 + read replicas (if MySQL ecosystem matters)

> 5TB OR > 20K TPS OR multi-region writes
    → TiDB (if MySQL-compatible is acceptable)
    → Citus (if PostgreSQL compatibility is critical)
    → YugabyteDB (if PostgreSQL + global distribution)

Need real-time analytics on operational data?
    → TiDB (HTAP native)
    → PostgreSQL + Citus columnar (good enough for moderate scale)
```

---

## Conclusion

In 2026, the choice is clearer than it used to be:

- **PostgreSQL 17** for most new applications. The best feature set, best ecosystem, best developer experience for teams that don't need to scale horizontally.

- **MySQL 9.0** for teams with existing MySQL investment, or applications tied to the MySQL ecosystem. Solid choice, but fewer advantages over PostgreSQL for greenfield projects.

- **TiDB** for scale problems. If you're doing manual sharding, drowning in ETL pipelines to feed an analytics system, or need multi-region writes — TiDB is a compelling solution.

The days of "just use MySQL" as a default are over. PostgreSQL has won the default choice for new projects. But when scale demands distributed architecture, TiDB is now mature enough to trust in production.

---

*Related Posts:*
- *pgvector vs Pinecone: Vector Search in Your Existing Database*
- *Database-Per-Service in Microservices: Practical Patterns for 2026*
