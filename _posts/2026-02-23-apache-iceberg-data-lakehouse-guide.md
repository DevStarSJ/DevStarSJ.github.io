---
layout: post
title: "Apache Iceberg and the Data Lakehouse Revolution: A Complete Guide"
subtitle: "How open table formats are killing data warehouses, unifying analytics, and giving you ACID transactions on S3 for pennies on the dollar"
date: 2026-02-23
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200"
catalog: true
tags:
  - Apache Iceberg
  - Data Lakehouse
  - Data Engineering
  - Big Data
  - Analytics
  - Cloud Storage
---

# Apache Iceberg and the Data Lakehouse Revolution: A Complete Guide

For two decades, enterprises chose between two worlds: **data lakes** (cheap, flexible, no reliability) or **data warehouses** (expensive, reliable, no flexibility). The lakehouse concept promised to merge them — and in 2026, **Apache Iceberg** is delivering on that promise at scale.

Iceberg is now the default table format for production data at Netflix, Apple, LinkedIn, Airbnb, and thousands of other companies. If you're building or running a modern data platform, you need to understand it.

![Abstract data visualization representing data engineering and analytics pipelines](https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800)
*Photo by [Luke Chesser](https://unsplash.com/@lukechesser) on Unsplash*

---

## The Problem with Traditional Data Lakes

A data lake stores files (Parquet, ORC, CSV) in object storage like S3. It's cheap and scalable, but it has critical limitations:

- **No ACID transactions**: Concurrent writes corrupt data; partial failures leave inconsistent state
- **No schema evolution**: Changing a column type means rewriting every file
- **Slow queries on small files**: Hundreds of thousands of small Parquet files kill query performance
- **No time travel**: You can't query data as it existed yesterday
- **Hidden data quality issues**: No way to enforce constraints or catch bad writes

These limitations pushed companies toward data warehouses (Snowflake, BigQuery, Redshift) — but at 10–50× the storage cost.

---

## What is Apache Iceberg?

Iceberg is an **open table format** for huge analytic datasets. It adds a metadata layer on top of regular file storage (S3, GCS, ADLS) that provides:

- ✅ **ACID transactions** — safe concurrent reads and writes
- ✅ **Schema evolution** — add/rename/drop columns without rewriting data
- ✅ **Hidden partitioning** — partition pruning without partition columns in queries
- ✅ **Time travel** — query any historical snapshot with `AS OF TIMESTAMP`
- ✅ **Partition evolution** — change partition strategy without rewriting data
- ✅ **Row-level deletes** — efficient MERGE/UPDATE/DELETE at petabyte scale

Iceberg isn't a query engine or a storage system. It's a specification for how to organize and track table metadata, implemented as a library that any engine can use.

---

## Iceberg's Architecture

### Three Layers

```
Query Engine (Spark, Trino, Flink, DuckDB, Snowflake, BigQuery...)
        ↓
Iceberg Catalog (Glue, Hive Metastore, Nessie, REST Catalog)
        ↓
Iceberg Metadata Files → Data Files (Parquet on S3)
```

### Metadata Structure

```
s3://my-bucket/warehouse/
└── orders/
    ├── metadata/
    │   ├── v1.metadata.json       ← table schema, partition spec
    │   ├── v2.metadata.json       ← schema evolution
    │   ├── snap-001.avro          ← snapshot 1 manifest list
    │   └── snap-002.avro          ← snapshot 2 manifest list
    └── data/
        ├── year=2025/month=01/    ← partition directories
        │   └── 00001.parquet
        └── year=2025/month=02/
            └── 00002.parquet
```

Each **snapshot** points to a **manifest list**, which points to **manifest files**, which list the actual **data files**. This chain enables:
- Time travel (each snapshot is preserved)
- Concurrent writes (optimistic concurrency with atomic metadata commits)
- Partition pruning (manifests contain column-level statistics)

---

## Getting Started: Spark + Iceberg + S3

### 1. Setup

```python
# PySpark with Iceberg
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("IcebergDemo") \
    .config("spark.jars.packages", 
            "org.apache.iceberg:iceberg-spark-runtime-3.5_2.12:1.5.0") \
    .config("spark.sql.extensions", 
            "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.local", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.local.type", "hadoop") \
    .config("spark.sql.catalog.local.warehouse", "s3://my-bucket/warehouse") \
    .getOrCreate()
```

### 2. Create an Iceberg Table

```sql
-- Create table with hidden partitioning
CREATE TABLE local.db.orders (
    order_id     BIGINT,
    customer_id  BIGINT,
    amount       DECIMAL(10, 2),
    status       STRING,
    created_at   TIMESTAMP
) USING iceberg
PARTITIONED BY (days(created_at))   -- hidden: no partition column in schema
TBLPROPERTIES (
    'write.format.default' = 'parquet',
    'write.target-file-size-bytes' = '134217728'  -- 128MB files
);
```

### 3. ACID Writes

```python
# Safe concurrent writes — Iceberg handles conflicts
df = spark.createDataFrame([
    (1001, 42, 99.99, "pending", "2025-01-15 10:00:00"),
    (1002, 43, 149.50, "completed", "2025-01-15 11:00:00"),
], ["order_id", "customer_id", "amount", "status", "created_at"])

df.writeTo("local.db.orders").append()
```

### 4. Time Travel

```sql
-- Query data as of a specific time
SELECT * FROM local.db.orders
TIMESTAMP AS OF '2025-01-01 00:00:00';

-- Query a specific snapshot
SELECT * FROM local.db.orders VERSION AS OF 1234567890;

-- List all snapshots
SELECT * FROM local.db.orders.snapshots;
```

### 5. Schema Evolution

```sql
-- Add a column — no data rewriting needed
ALTER TABLE local.db.orders ADD COLUMN discount DECIMAL(5,2);

-- Rename a column — backward compatible
ALTER TABLE local.db.orders RENAME COLUMN status TO order_status;

-- Change column type (widening only without full rewrite)
ALTER TABLE local.db.orders ALTER COLUMN amount TYPE DECIMAL(15, 2);
```

---

## Row-Level Operations: MERGE, UPDATE, DELETE

One of Iceberg's killer features is efficient row-level mutations — something traditional Parquet lakes can't do without rewriting entire partitions.

```sql
-- UPSERT (MERGE INTO)
MERGE INTO local.db.orders t
USING staging.new_orders s
ON t.order_id = s.order_id
WHEN MATCHED AND s.status != t.order_status THEN
    UPDATE SET order_status = s.status, updated_at = current_timestamp()
WHEN NOT MATCHED THEN
    INSERT (order_id, customer_id, amount, order_status, created_at)
    VALUES (s.order_id, s.customer_id, s.amount, s.status, s.created_at);

-- Targeted delete (GDPR compliance)
DELETE FROM local.db.orders WHERE customer_id = 12345;

-- Update
UPDATE local.db.orders
SET order_status = 'cancelled'
WHERE order_id = 1001 AND order_status = 'pending';
```

Iceberg implements these using **delete files** (position deletes or equality deletes) that are merged at read time, avoiding full partition rewrites for small updates.

---

## Table Maintenance

Iceberg tables accumulate metadata and small files over time. Regular maintenance is essential:

```python
from pyspark.sql import SparkSession

# Compact small files into larger ones
spark.sql("""
    CALL local.system.rewrite_data_files(
        table => 'db.orders',
        strategy => 'binpack',
        options => map('target-file-size-bytes', '134217728')
    )
""")

# Expire old snapshots (keep last 7 days)
spark.sql("""
    CALL local.system.expire_snapshots(
        table => 'db.orders',
        older_than => TIMESTAMP '2025-12-01 00:00:00',
        retain_last => 5
    )
""")

# Remove orphaned files
spark.sql("""
    CALL local.system.remove_orphan_files(table => 'db.orders')
""")
```

---

## Query Engines That Support Iceberg

In 2026, virtually every major query engine supports Iceberg natively:

| Engine | Support Level | Notes |
|---|---|---|
| **Apache Spark** | Full (read/write/DDL) | Reference implementation |
| **Trino** | Full | Best for ad-hoc queries |
| **Apache Flink** | Full (streaming) | Native streaming ingestion |
| **DuckDB** | Read (+ write via extension) | Local analytics, fast |
| **Snowflake** | Full via Iceberg Tables | Native catalog integration |
| **BigQuery** | Full via BigLake | Managed open table format |
| **AWS Athena** | Full | Serverless S3 queries |
| **Databricks** | Full | + Delta Lake interop via UniForm |
| **StarRocks** | Full | High-performance OLAP |

---

## Catalogs: The Missing Piece

A catalog tracks which tables exist and where their current metadata pointer is. Without a catalog, you'd need to pass the metadata path to every query.

| Catalog | Type | Best For |
|---|---|---|
| **AWS Glue** | Managed | AWS-native workloads |
| **Hive Metastore** | Self-hosted | Legacy Hadoop environments |
| **Project Nessie** | Git-like | Multi-branch data development |
| **Polaris / Unity** | Managed open | Multi-engine, vendor-neutral |
| **REST Catalog** | Standard interface | Any implementation |

**Project Nessie** deserves special mention: it gives Iceberg tables **Git-like branching**. You can create a branch, run transformations, and merge the changes back — data version control like code version control.

```bash
# Create a data branch
nessie branch dev main

# All writes on the dev branch don't affect main
spark.sql("USE REFERENCE dev IN nessie")
spark.sql("INSERT INTO db.orders VALUES ...")

# Merge when ready
nessie merge dev --into main
```

---

## Iceberg vs Delta Lake vs Apache Hudi

| Feature | Iceberg | Delta Lake | Hudi |
|---|---|---|---|
| ACID | ✅ | ✅ | ✅ |
| Time Travel | ✅ | ✅ | ✅ |
| Schema Evolution | ✅ Full | ✅ | ✅ |
| Partition Evolution | ✅ | ❌ | ❌ |
| Hidden Partitioning | ✅ | ❌ | ❌ |
| Engine Support | Broadest | Databricks-centric | Spark/Flink focus |
| Governance | Open (Apache) | Linux Foundation | Apache |

Iceberg's **partition evolution** and **hidden partitioning** are its strongest differentiators. Delta Lake has the strongest Databricks integration. Hudi excels in streaming upsert workloads.

In 2026, **Iceberg has the broadest multi-engine support** and is the de facto standard for new greenfield data platforms.

---

## Real-World Architecture: Modern Data Platform

```
┌─────────────────────────────────────────────┐
│  Data Sources                                │
│  (Kafka, CDC, APIs, batch files)            │
└──────────────────────┬──────────────────────┘
                       │
            Apache Flink (streaming)
            Apache Spark (batch)
                       │ write
                       ▼
┌─────────────────────────────────────────────┐
│  Iceberg Lakehouse on S3                     │
│  ├── raw/        (landing zone)              │
│  ├── curated/    (cleaned, typed)            │
│  └── serving/    (aggregated marts)          │
│                                              │
│  Catalog: AWS Glue / Polaris                 │
└──────────────┬──────────────────────────────┘
               │ query
      ┌────────┼────────┐
      ▼        ▼        ▼
   Trino   BigQuery  DuckDB
   (adhoc) (BI tools) (local)
```

---

## Conclusion

Apache Iceberg is the connective tissue of the modern data stack. It gives you warehouse-grade reliability (ACID, schema evolution, time travel) at lake economics (S3 storage, any query engine). The lakehouse isn't a buzzword anymore — it's running at petabyte scale in production.

If you're building a new data platform in 2026 and you're not using Iceberg (or Delta Lake/Hudi), you're taking on technical debt from day one. The tools are mature, the ecosystem is broad, and the operational overhead is manageable.

Start with Iceberg + AWS Glue + Trino for ad-hoc queries. Add Spark for heavy ETL. Add Flink when you need streaming. Your data platform will thank you in five years.

![Data center infrastructure representing cloud data storage and processing](https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800)
*Photo by [NASA](https://unsplash.com/@nasa) on Unsplash*
