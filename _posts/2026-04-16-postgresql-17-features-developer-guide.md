---
layout: post
title: "PostgreSQL 17 Features Every Developer Should Know"
subtitle: "From incremental backup to MERGE improvements and JSON_TABLE — what's new in PostgreSQL 17 and how it changes your queries"
date: 2026-04-16 12:00:00
author: "Groot"
header-img: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - PostgreSQL
  - Database
  - SQL
  - Backend
  - Performance
---

# PostgreSQL 17 Features Every Developer Should Know

PostgreSQL 17 landed with a batch of features that meaningfully improve developer experience. Some are flashy (hello, `JSON_TABLE`), others are subtle performance improvements that will silently make your queries faster.

This post covers the most impactful changes with practical examples.

![Database visualization](https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1000&auto=format&fit=crop)
*Photo by [Jan Antonin Kolar](https://unsplash.com/@jankolar) on Unsplash*

---

## JSON_TABLE: SQL-Standard JSON Querying

PostgreSQL has had JSON support for years, but querying nested JSON always required a mix of `jsonb_array_elements`, `jsonb_each`, and lateral joins that was painful to read and write.

`JSON_TABLE` (SQL:2016 standard) changes this dramatically:

### Before JSON_TABLE (PostgreSQL 16)

```sql
-- Extract orders from a JSON column
WITH order_data AS (
  SELECT 
    id,
    jsonb_array_elements(data->'orders') AS order_item
  FROM customers
  WHERE id = 1
)
SELECT
  id,
  order_item->>'order_id' AS order_id,
  (order_item->>'amount')::numeric AS amount,
  order_item->>'status' AS status
FROM order_data;
```

### After JSON_TABLE (PostgreSQL 17)

```sql
SELECT c.id, jt.*
FROM customers c,
JSON_TABLE(
  c.data,
  '$.orders[*]'
  COLUMNS (
    order_id    TEXT     PATH '$.order_id',
    amount      NUMERIC  PATH '$.amount',
    status      TEXT     PATH '$.status',
    created_at  DATE     PATH '$.created_at'
      DEFAULT '1970-01-01' ON EMPTY
  )
) AS jt
WHERE c.id = 1;
```

Much cleaner, and it handles type coercion and defaults natively.

### Nested JSON_TABLE

```sql
-- Flatten a deeply nested JSON structure
SELECT 
  customer_id,
  order_id,
  item_name,
  quantity
FROM customers,
JSON_TABLE(
  data,
  '$.orders[*]'
  COLUMNS (
    order_id    TEXT PATH '$.order_id',
    NESTED PATH '$.items[*]'
      COLUMNS (
        item_name  TEXT    PATH '$.name',
        quantity   INTEGER PATH '$.qty'
      )
  )
) jt;
```

This handles the parent-child relationship that previously required multiple CTEs and lateral joins.

---

## MERGE Improvements

PostgreSQL 15 introduced `MERGE` (the SQL standard upsert). PostgreSQL 17 extends it with:

### MERGE with RETURNING

```sql
-- Upsert and get back what changed
MERGE INTO inventory AS target
USING incoming_shipment AS source
  ON target.product_id = source.product_id
WHEN MATCHED THEN
  UPDATE SET 
    quantity = target.quantity + source.quantity,
    last_updated = NOW()
WHEN NOT MATCHED THEN
  INSERT (product_id, quantity, last_updated)
  VALUES (source.product_id, source.quantity, NOW())
RETURNING 
  target.product_id,
  target.quantity,
  CASE WHEN xmax = 0 THEN 'inserted' ELSE 'updated' END AS action;
```

### MERGE with DO NOTHING

```sql
-- Insert or skip (no update) - previously required INSERT ON CONFLICT
MERGE INTO audit_log AS target
USING new_events AS source ON target.event_id = source.event_id
WHEN NOT MATCHED THEN
  INSERT (event_id, event_data, created_at)
  VALUES (source.event_id, source.event_data, NOW())
WHEN MATCHED THEN
  DO NOTHING;  -- New in PostgreSQL 17
```

---

## Incremental Backup

This is a game-changer for large databases. PostgreSQL 17 introduces `pg_basebackup` with incremental backup support.

### Traditional Full Backup

```bash
# Old way: always full backup (could be 100GB+)
pg_basebackup -h localhost -U postgres -D /backup/full -Ft -z

# For a 500GB database, this takes 30+ minutes and uses 500GB of space
```

### Incremental Backup (PostgreSQL 17)

```bash
# Step 1: Take initial full backup
pg_basebackup \
  --checkpoint=fast \
  --format=tar \
  --gzip \
  --target=server:/backup/full-20260416 \
  --no-manifest  # Actually: use manifests

# Step 2: Take incremental backups (only changed blocks)
pg_basebackup \
  --incremental=/backup/full-20260416/backup_manifest \
  --format=tar \
  --gzip \
  --target=server:/backup/incr-20260417

# Incremental backup for a 500GB database with 2% change = ~10GB, ~2 minutes
```

### Restoring from Incremental Backup

```bash
# Combine full + incrementals for restore
pg_combinebackup \
  /backup/full-20260416 \
  /backup/incr-20260417 \
  /backup/incr-20260418 \
  --output=/restore/point-in-time
```

This brings PostgreSQL backup practices closer to enterprise databases — finally.

---

## Performance: Vacuum and Index Improvements

### Faster Vacuum with TIDStore

The internal structure for tracking dead tuples during VACUUM has been replaced with a more efficient radix tree (`TIDStore`). The practical impact:

- Vacuum uses significantly less memory for large tables
- Vacuum completes faster on tables with many dead tuples
- Less risk of hitting `maintenance_work_mem` limits

```sql
-- You'll see vacuum complete faster for large tables
-- No config change needed; it's automatic

-- Monitor vacuum progress
SELECT 
  schemaname,
  tablename,
  heap_blks_scanned,
  heap_blks_vacuumed,
  index_vacuum_count,
  num_dead_item_ids
FROM pg_stat_progress_vacuum;
```

### Improved EXPLAIN Output

PostgreSQL 17 adds `EXPLAIN` improvements that make query plans easier to read:

```sql
EXPLAIN (ANALYZE, BUFFERS, SERIALIZE TEXT)
SELECT u.name, COUNT(o.id) 
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;

-- New: SERIALIZE option shows time spent serializing results
-- Useful for identifying bottlenecks in data transfer vs. computation
```

---

## Logical Replication Enhancements

### Replication Slots with Failover

A long-standing pain point: logical replication slots were lost during failover. PostgreSQL 17 introduces **failover slots**:

```sql
-- Create a replication slot that survives failover
SELECT pg_create_logical_replication_slot(
  'my_subscription',
  'pgoutput',
  false,           -- not temporary
  false,           -- not two-phase
  true             -- failover = true (NEW in PG17)
);
```

This means downstream subscribers (like Debezium or custom consumers) no longer need to be reconfigured after a primary failover.

### Replication Slot Synchronization

```sql
-- On standby: sync slots from primary
-- postgresql.conf
sync_replication_slots = on

-- pg_subscription now supports slot synchronization
CREATE SUBSCRIPTION my_sub
  CONNECTION 'host=primary port=5432 dbname=mydb'
  PUBLICATION my_pub
  WITH (failover = true);  -- Enable failover support
```

---

## Developer Quality-of-Life Improvements

### COPY with TEXT Format Improvements

```sql
-- New: COPY with DEFAULT keyword support
COPY products (id, name, price, category)
FROM '/data/products.csv'
WITH (FORMAT CSV, HEADER, DEFAULT 'General');
-- Empty category fields will be set to 'General'
```

### New Functions

```sql
-- pg_column_compression: see what compression is used per column
SELECT attname, pg_column_compression(heap_tuple) 
FROM pg_attribute 
WHERE attrelid = 'large_table'::regclass;

-- array_sample: randomly sample from an array
SELECT array_sample(ARRAY[1,2,3,4,5,6,7,8,9,10], 3);
-- Returns something like: {3, 7, 1}

-- string_to_table: split string into rows (replaces regexp_split_to_table for simple cases)  
SELECT * FROM string_to_table('apple,banana,cherry', ',');
--  string_to_table
-- -----------------
--  apple
--  banana
--  cherry
```

### Improved Error Messages

PostgreSQL 17 continues the work on better error messages:

```sql
-- Old error for missing column
SELECT naem FROM users;
-- ERROR: column "naem" does not exist

-- New error (with suggestion)  
-- ERROR: column "naem" does not exist
-- HINT: Did you mean "name"?
```

---

## Upgrading to PostgreSQL 17

### Using pg_upgrade

```bash
# Stop the old cluster
pg_ctlcluster 16 main stop

# Run pg_upgrade
/usr/lib/postgresql/17/bin/pg_upgrade \
  -b /usr/lib/postgresql/16/bin \
  -B /usr/lib/postgresql/17/bin \
  -d /var/lib/postgresql/16/main \
  -D /var/lib/postgresql/17/main \
  --check  # Dry run first!

# If check passes, run for real
/usr/lib/postgresql/17/bin/pg_upgrade \
  -b /usr/lib/postgresql/16/bin \
  -B /usr/lib/postgresql/17/bin \
  -d /var/lib/postgresql/16/main \
  -D /var/lib/postgresql/17/main

# Start new cluster
pg_ctlcluster 17 main start

# Rebuild statistics (important!)
vacuumdb --all --analyze-in-stages
```

### Docker

```bash
docker pull postgres:17

# docker-compose.yml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
    volumes:
    - pgdata:/var/lib/postgresql/data
```

![Server infrastructure](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1000&auto=format&fit=crop)
*Photo by [Taylor Vick](https://unsplash.com/@tvick) on Unsplash*

---

## Summary

PostgreSQL 17's most impactful features:

1. **`JSON_TABLE`** — Finally a readable way to query complex JSON structures
2. **`MERGE` with RETURNING** — Complete upsert workflows in one statement
3. **Incremental Backup** — Dramatically reduces backup time and storage for large databases
4. **Vacuum improvements** — Faster, less memory-hungry maintenance
5. **Failover replication slots** — Logical replication that survives primary failovers

The incremental backup feature alone justifies an upgrade for any team running large PostgreSQL databases. Combined with the JSON improvements and MERGE enhancements, PostgreSQL 17 is a solid release worth upgrading to.

---

*References:*
- [PostgreSQL 17 Release Notes](https://www.postgresql.org/docs/17/release-17.html)
- [PostgreSQL 17 JSON_TABLE Documentation](https://www.postgresql.org/docs/17/functions-json.html)
- [Incremental Backup in PostgreSQL 17](https://www.postgresql.org/docs/17/app-pgbasebackup.html)
