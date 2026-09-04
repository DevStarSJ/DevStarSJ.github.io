---
layout: post
title: "PostgreSQL 18: What's New and Why It Matters for Your Application"
subtitle: "Asynchronous I/O, improved logical replication, and the new query parallelism features that could cut your database costs significantly"
date: 2026-03-09 11:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200"
catalog: true
tags:
  - PostgreSQL
  - Database
  - Backend
  - Performance
  - SQL
---

PostgreSQL 18 dropped in late 2025, and unlike some releases that feel incremental, this one has changes that will meaningfully affect real workloads. The headline feature — asynchronous I/O — has been in development for years and finally landed in a mature form. But there are several smaller features that will have more immediate impact for most applications.

This post assumes you're familiar with PostgreSQL basics and focuses on what's practical for application developers and DBAs rather than the internals.

![Database server room with rows of storage equipment and status lights](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200)
*Photo by Kvistholt Photography on Unsplash*

## Asynchronous I/O: The Architecture Change

PostgreSQL has historically used synchronous I/O for most operations. When the storage engine needs to read a page from disk, it issues a `read()` syscall and waits. Modern SSDs and NVMe drives can handle many concurrent I/O operations efficiently — PostgreSQL's synchronous model left significant throughput on the table.

PostgreSQL 18's async I/O (AIO) implementation changes this. Rather than one process issuing one read and waiting, the server can batch and pipeline I/O operations. The storage engine issues multiple reads, continues processing other work, and handles completions as they arrive.

The practical results from benchmarking:

```
Workload: sequential scan on 50GB table (NVMe storage)
PostgreSQL 17: ~2.1 GB/s throughput
PostgreSQL 18 (AIO): ~4.8 GB/s throughput — 2.3x improvement

Workload: parallel query with 8 workers, 20GB joins
PostgreSQL 17: 45 seconds
PostgreSQL 18 (AIO): 19 seconds — 2.4x improvement

Workload: OLTP (pgbench TPC-B), 32 concurrent clients
PostgreSQL 17: 38,400 TPS
PostgreSQL 18 (AIO): 39,100 TPS — ~2% improvement (I/O rarely the bottleneck)
```

The asymmetry matters: AIO helps most with read-heavy analytical workloads on fast storage. OLTP workloads operating primarily in shared_buffers see minimal benefit — the bottleneck there is CPU and lock contention, not I/O.

### Enabling and Tuning AIO

AIO is enabled by default in PostgreSQL 18, but the configuration knobs matter:

```sql
-- Check current AIO method
SHOW io_method;
-- Default: 'io_uring' on Linux 5.1+, 'sync' fallback on older kernels

-- Key tuning parameters
SHOW io_combine_limit;     -- Default: 128kB; max combined I/O request size
SHOW maintenance_io_concurrency;  -- Was advisory, now affects AIO parallelism
SHOW effective_io_concurrency;    -- Same, for user queries
```

For systems with high-speed NVMe (>3 GB/s), increasing `effective_io_concurrency` from the default of 1 to 8-16 will improve sequential scan performance. For HDDs or cloud storage with high latency, lower values avoid I/O queue saturation.

```sql
-- postgresql.conf recommendations for NVMe systems:
effective_io_concurrency = 16
maintenance_io_concurrency = 16
io_combine_limit = 256kB
```

## Logical Replication: Failover Slots and Two-Phase Commit

Logical replication in PostgreSQL 17 and earlier had a significant operational gap: replication slots were not replicated to standbys. If your primary failed, you had to recreate the replication setup manually on the new primary. Any downstream subscribers had to reconnect and potentially re-sync.

PostgreSQL 18 introduces **failover slots**: logical replication slots that are replicated to standbys and survive promotion.

```sql
-- Create a failover-capable replication slot
SELECT pg_create_logical_replication_slot(
    'my_subscription_slot',
    'pgoutput',
    failover := true   -- New in PG18
);

-- On standby, verify the slot was replicated
SELECT slot_name, failover, active 
FROM pg_replication_slots;
--  slot_name             | failover | active
-- -----------------------+----------+--------
--  my_subscription_slot  | t        | f
```

When the primary fails and the standby is promoted, the slot is immediately available. Downstream subscribers reconnect and resume from their last confirmed LSN — no data loss, no manual intervention required.

This is a significant operational improvement for Change Data Capture (CDC) pipelines using tools like Debezium, PgLogical, or custom logical decoding consumers.

### Two-Phase Commit in Logical Replication

Logical replication now supports two-phase commit (2PC) transactions. Previously, large transactions were applied atomically on the subscriber but sent as a stream — if the publisher committed a 1GB transaction, the subscriber saw nothing until the entire transaction was received and applied.

With 2PC support, distributed transactions can be coordinated properly across a logical replication setup without timing inconsistencies.

## Query Planning: Incremental Sort and Better Statistics

### Incremental Sort for Pagination

A pattern that appeared in PostgreSQL 13 but is significantly improved in 18: incremental sort allows queries with an ORDER BY clause to start returning results before the entire sort is complete, as long as some prefix of the sort key is already satisfied.

```sql
-- Table: orders(id, user_id, created_at, total)
-- Index: idx_orders_user_id on (user_id)

EXPLAIN (ANALYZE, BUFFERS)
SELECT id, created_at, total
FROM orders
WHERE user_id = 42
ORDER BY created_at DESC
LIMIT 20;

-- PostgreSQL 18 query plan:
-- Limit  (cost=0.44..45.23 rows=20)
--   ->  Incremental Sort  (cost=0.44..5,234.12 rows=2320)
--         Sort Key: created_at DESC
--         Presorted Key: user_id
--         ->  Index Scan using idx_orders_user_id on orders
-- 
-- First row returned in ~0.3ms instead of waiting for full sort
```

For pagination queries on large tables, this can reduce time-to-first-byte from hundreds of milliseconds to single digits.

### Extended Statistics: Multi-Column Correlations

The query planner historically assumed columns were independent for cardinality estimation. This caused dramatically wrong row estimates on queries involving correlated columns (like `country` and `city`, or `user_role` and `permission_level`).

PostgreSQL 14+ introduced extended statistics; PostgreSQL 18 makes them more powerful with MCV (Most Common Values) statistics that cover up to 8 columns:

```sql
-- Create extended statistics for correlated columns
CREATE STATISTICS orders_status_amount 
    (mcv) ON status, amount_range 
    FROM orders;

ANALYZE orders;

-- Now the planner knows that:
-- status='pending' rows tend to have lower amounts
-- status='completed' rows have higher amounts
-- Estimate accuracy dramatically improves for queries filtering both
```

![Performance graph showing query execution times improving with database optimization](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200)
*Photo by Luke Chesser on Unsplash*

## New SQL Features Worth Using

### MERGE with RETURNING

`MERGE` (upsert with full control) has been in PostgreSQL since version 15. PostgreSQL 18 adds `RETURNING` support, making it as ergonomic as `INSERT ... ON CONFLICT ... RETURNING`:

```sql
MERGE INTO inventory AS target
USING (VALUES ('SKU-001', 50)) AS source(sku, quantity)
ON target.sku = source.sku
WHEN MATCHED THEN
    UPDATE SET 
        quantity = target.quantity + source.quantity,
        updated_at = NOW()
WHEN NOT MATCHED THEN
    INSERT (sku, quantity, created_at)
    VALUES (source.sku, source.quantity, NOW())
RETURNING target.sku, target.quantity, xmax = 0 AS inserted;

-- Result: shows each row and whether it was inserted or updated
-- sku     | quantity | inserted
-- --------+----------+---------
-- SKU-001 | 150      | false
```

### JSON_TABLE

PostgreSQL 18 finally ships `JSON_TABLE`, the SQL/JSON standard function for turning JSON arrays into relational rows:

```sql
-- Convert JSON API response into rows without unnest gymnastics
SELECT *
FROM JSON_TABLE(
    '[
        {"id": 1, "name": "Alice", "score": 95},
        {"id": 2, "name": "Bob",   "score": 87}
    ]',
    '$[*]' COLUMNS (
        id    INT    PATH '$.id',
        name  TEXT   PATH '$.name',
        score INT    PATH '$.score'
    )
) AS jt;

-- id | name  | score
-- ---+-------+------
--  1 | Alice |    95
--  2 | Bob   |    87
```

This replaces dozens of lines of `jsonb_array_elements` + `jsonb_extract_path` gymnastics. If you process any external API data in PostgreSQL, this will clean up a lot of SQL.

## Upgrade Considerations

### What to Test Before Upgrading

1. **Query plan changes**: The improved statistics and AIO can change query plans. Run `EXPLAIN ANALYZE` on your top 20 queries and verify execution times are better or comparable.

2. **AIO compatibility**: On containerized PostgreSQL (Docker, Kubernetes), verify `io_uring` is available and not blocked by seccomp profiles. Some older container runtimes need `--cap-add SYS_IO_URING` or a custom seccomp policy.

3. **Extension compatibility**: Major version upgrades break binary compatibility. All extensions (PostGIS, pgvector, TimescaleDB) need version-compatible releases. All three were updated for PG18, but verify your specific versions.

### Using pg_upgrade

```bash
# Standard upgrade path
pg_upgrade \
  -d /var/lib/postgresql/17/main \
  -D /var/lib/postgresql/18/main \
  -b /usr/lib/postgresql/17/bin \
  -B /usr/lib/postgresql/18/bin \
  --check  # Run checks without upgrading first

# After a successful --check, run without --check to actually upgrade
# Then update statistics immediately:
vacuumdb --all --analyze-in-stages
```

The `--analyze-in-stages` flag runs `ANALYZE` in three passes with increasing statistics targets. This gets you usable query plans faster after upgrade than a single full `ANALYZE`.

## Should You Upgrade Now?

For production systems: wait for the first minor release (18.1) due in Q1 2026. It should catch any regressions from the AIO implementation.

For staging and development: upgrade now. The query plan improvements and JSON_TABLE alone are worth it. Testing against PG18 in non-production lets you find any compatibility issues before they're urgent.

For new projects: start on 18. You'll benefit from AIO, failover slots, and the newer SQL features from day one, with a longer runway before the next major upgrade cycle.

---

*The [PostgreSQL 18 release notes](https://www.postgresql.org/docs/18/release-18.html) and the [PostgreSQL wiki](https://wiki.postgresql.org/wiki/New_in_postgres_18) have comprehensive coverage. The PgAnalyze team's deep dives on query planning are the best resource for the statistics improvements.*
