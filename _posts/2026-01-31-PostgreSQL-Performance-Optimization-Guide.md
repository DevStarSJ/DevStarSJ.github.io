---
layout: post
title: "PostgreSQL Performance Optimization: Complete 2026 Guide"
subtitle: Master PostgreSQL tuning, indexing, and query optimization for high-performance databases
categories: development
tags: postgresql database performance sql
comments: true
---

# PostgreSQL Performance Optimization: Complete 2026 Guide

PostgreSQL continues to be the database of choice for modern applications. This guide covers advanced optimization techniques, indexing strategies, and configuration tuning for 2026.

## Why PostgreSQL?

- **ACID compliance** - Reliable transactions
- **Extensibility** - Custom types, functions, operators
- **Advanced features** - JSON, full-text search, GIS
- **Active development** - Continuous improvements
- **Open source** - No licensing costs

## Configuration Tuning

### Memory Settings

```sql
-- postgresql.conf
-- Shared memory (25% of available RAM)
shared_buffers = 4GB

-- Work memory for sorts/hashes (per operation)
work_mem = 256MB

-- Maintenance operations memory
maintenance_work_mem = 1GB

-- Effective cache size (50-75% of RAM)
effective_cache_size = 12GB

-- WAL buffers
wal_buffers = 64MB
```

### Connection Settings

```sql
-- Max connections (be conservative)
max_connections = 200

-- Connection pooling recommended
-- Use PgBouncer or similar

-- Idle transaction timeout
idle_in_transaction_session_timeout = '10min'

-- Statement timeout
statement_timeout = '30s'
```

### Write Performance

```sql
-- Checkpoint settings
checkpoint_timeout = '15min'
checkpoint_completion_target = 0.9
max_wal_size = 4GB
min_wal_size = 1GB

-- Synchronous commit (trade safety for speed)
synchronous_commit = off  -- For non-critical data only

-- Background writer
bgwriter_delay = 200ms
bgwriter_lru_maxpages = 100
```

## Indexing Strategies

### B-tree Indexes

```sql
-- Standard index
CREATE INDEX idx_users_email ON users(email);

-- Unique index
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);

-- Partial index
CREATE INDEX idx_orders_pending ON orders(created_at)
WHERE status = 'pending';

-- Composite index (order matters!)
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at DESC);

-- Covering index (include additional columns)
CREATE INDEX idx_orders_covering ON orders(user_id)
INCLUDE (total_amount, status);
```

### Specialized Indexes

```sql
-- GIN for full-text search
CREATE INDEX idx_articles_search ON articles
USING GIN(to_tsvector('english', title || ' ' || content));

-- GIN for JSONB
CREATE INDEX idx_products_attrs ON products USING GIN(attributes);

-- GiST for geometric/range types
CREATE INDEX idx_locations_geo ON locations USING GiST(coordinates);

-- BRIN for large sequential data
CREATE INDEX idx_logs_time ON logs USING BRIN(created_at);

-- Hash for equality-only queries (PostgreSQL 10+)
CREATE INDEX idx_sessions_token ON sessions USING HASH(token);
```

### Index Maintenance

```sql
-- Analyze table statistics
ANALYZE users;

-- Reindex for fragmented indexes
REINDEX INDEX CONCURRENTLY idx_users_email;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan;

-- Find unused indexes
SELECT 
    schemaname || '.' || tablename AS table,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find missing indexes
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    seq_tup_read / NULLIF(seq_scan, 0) AS avg_seq_rows
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_tup_read DESC;
```

## Query Optimization

### EXPLAIN ANALYZE

```sql
-- Basic explain
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id)
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id;

-- Output analysis:
-- Seq Scan = bad for large tables
-- Index Scan = good
-- Bitmap Index Scan = good for OR conditions
-- Nested Loop = OK for small datasets
-- Hash Join = good for equality joins
-- Merge Join = good for sorted data
```

### Common Optimizations

```sql
-- BAD: Function on indexed column
SELECT * FROM users WHERE LOWER(email) = 'test@example.com';

-- GOOD: Expression index or store normalized
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- BAD: Leading wildcard
SELECT * FROM products WHERE name LIKE '%phone%';

-- GOOD: Full-text search
SELECT * FROM products
WHERE to_tsvector('english', name) @@ to_tsquery('phone');

-- BAD: Multiple OR conditions
SELECT * FROM orders
WHERE status = 'pending' OR status = 'processing' OR status = 'shipped';

-- GOOD: Use IN or ANY
SELECT * FROM orders WHERE status = ANY(ARRAY['pending', 'processing', 'shipped']);

-- BAD: Correlated subquery
SELECT *,
    (SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id) as order_count
FROM users;

-- GOOD: Lateral join or window function
SELECT u.*, COALESCE(o.order_count, 0) as order_count
FROM users u
LEFT JOIN LATERAL (
    SELECT COUNT(*) as order_count
    FROM orders
    WHERE user_id = u.id
) o ON true;
```

### Pagination

```sql
-- BAD: OFFSET for large datasets
SELECT * FROM articles ORDER BY id LIMIT 20 OFFSET 10000;

-- GOOD: Keyset pagination
SELECT * FROM articles
WHERE id > $last_id
ORDER BY id
LIMIT 20;

-- For complex ordering
SELECT * FROM articles
WHERE (published_at, id) < ($last_published_at, $last_id)
ORDER BY published_at DESC, id DESC
LIMIT 20;
```

### CTEs and Subqueries

```sql
-- Materialized CTE (PostgreSQL 12+)
WITH active_users AS MATERIALIZED (
    SELECT id, name FROM users WHERE is_active = true
)
SELECT au.name, COUNT(o.id)
FROM active_users au
JOIN orders o ON o.user_id = au.id
GROUP BY au.id, au.name;

-- Non-materialized (inlined) CTE
WITH recent_orders AS NOT MATERIALIZED (
    SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '7 days'
)
SELECT * FROM recent_orders WHERE total > 100;
```

## Partitioning

### Range Partitioning

```sql
-- Create partitioned table
CREATE TABLE orders (
    id BIGSERIAL,
    user_id BIGINT NOT NULL,
    total_amount DECIMAL(10,2),
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE orders_2024_q1 PARTITION OF orders
FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE orders_2024_q2 PARTITION OF orders
FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

-- Default partition for unmatched values
CREATE TABLE orders_default PARTITION OF orders DEFAULT;

-- Automatic partition management
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    partition_date DATE := DATE_TRUNC('month', NOW() + INTERVAL '1 month');
    partition_name TEXT := 'orders_' || TO_CHAR(partition_date, 'YYYY_MM');
    start_date DATE := partition_date;
    end_date DATE := partition_date + INTERVAL '1 month';
BEGIN
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF orders
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );
END;
$$ LANGUAGE plpgsql;
```

### List Partitioning

```sql
CREATE TABLE sales (
    id BIGSERIAL,
    region TEXT NOT NULL,
    amount DECIMAL(10,2),
    sale_date DATE NOT NULL,
    PRIMARY KEY (id, region)
) PARTITION BY LIST (region);

CREATE TABLE sales_na PARTITION OF sales FOR VALUES IN ('US', 'CA', 'MX');
CREATE TABLE sales_eu PARTITION OF sales FOR VALUES IN ('DE', 'FR', 'UK');
CREATE TABLE sales_apac PARTITION OF sales FOR VALUES IN ('JP', 'KR', 'AU');
```

## JSON Performance

```sql
-- Use JSONB, not JSON
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    attributes JSONB DEFAULT '{}'
);

-- Index specific paths
CREATE INDEX idx_products_brand ON products ((attributes->>'brand'));

-- GIN index for containment queries
CREATE INDEX idx_products_attrs ON products USING GIN(attributes);

-- Efficient queries
-- Contains
SELECT * FROM products WHERE attributes @> '{"color": "red"}';

-- Path exists
SELECT * FROM products WHERE attributes ? 'warranty';

-- Multiple keys exist
SELECT * FROM products WHERE attributes ?& ARRAY['color', 'size'];
```

## Connection Pooling

### PgBouncer Configuration

```ini
; pgbouncer.ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
listen_addr = *
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

; Pool settings
pool_mode = transaction
default_pool_size = 20
max_client_conn = 1000
min_pool_size = 5

; Timeouts
server_idle_timeout = 600
query_timeout = 30
```

## Monitoring

### Essential Queries

```sql
-- Active queries
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- Lock monitoring
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.relation = blocked_locks.relation
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- Cache hit ratio
SELECT 
    sum(heap_blks_read) as heap_read,
    sum(heap_blks_hit)  as heap_hit,
    sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) as ratio
FROM pg_statio_user_tables;

-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
```

### pg_stat_statements

```sql
-- Enable extension
CREATE EXTENSION pg_stat_statements;

-- Top queries by time
SELECT 
    round(total_exec_time::numeric, 2) AS total_time_ms,
    calls,
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- Slow queries
SELECT 
    query,
    calls,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    round(max_exec_time::numeric, 2) AS max_ms
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- > 100ms
ORDER BY mean_exec_time DESC;
```

## Backup and Recovery

```bash
# Logical backup
pg_dump -Fc -f backup.dump mydb

# Parallel backup
pg_dump -Fc -j 4 -f backup.dump mydb

# Restore
pg_restore -d mydb -j 4 backup.dump

# Continuous archiving (WAL)
# postgresql.conf
archive_mode = on
archive_command = 'cp %p /archive/%f'
```

## Conclusion

PostgreSQL performance optimization requires understanding your workload, proper indexing, query tuning, and regular maintenance. The techniques in this guide will help you build high-performance database systems.

Key takeaways:
- Configure memory settings appropriately
- Create indexes strategically
- Use EXPLAIN ANALYZE for query tuning
- Implement partitioning for large tables
- Monitor performance continuously

## Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Use The Index, Luke](https://use-the-index-luke.com/)
- [PostgreSQL Wiki](https://wiki.postgresql.org/)
