---
layout: post
title: "SQLite Is Having a Renaissance: Edge Databases, Libsql, and the Return of the Embedded DB"
subtitle: "How the world's most deployed database is powering a new generation of cloud-edge applications"
date: 2026-06-15 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - Database
  - SQLite
  - Edge
  - Turso
  - Cloudflare
---

# SQLite Is Having a Renaissance: Edge Databases, Libsql, and the Return of the Embedded DB

SQLite is 25 years old, powers billions of devices, and was famously described as "not suitable for production web apps." In 2026, that last part is no longer true. A new generation of platforms — **Turso**, **Cloudflare D1**, **Fly.io LiteFS**, **PlanetScale Beam** — has taken SQLite's core and extended it for distributed, edge-native workloads. The result is reshaping what "choose your database" means for modern applications.

![Database storage concept](https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=1000&auto=format&fit=crop)
*Photo by [Markus Spiske](https://unsplash.com/@markusspiske) on Unsplash*

---

## Why SQLite Is Winning at the Edge

The edge computing model requires databases co-located with compute — ideally on the same machine, with microsecond latency, no network hop. Traditional client/server databases (Postgres, MySQL) don't fit this model. SQLite does.

**SQLite's advantages at the edge:**
- Single binary, zero-configuration
- Reads are in-process (no network roundtrip)
- ACID transactions without a server
- 35 years of battle-tested reliability
- The entire DB is a single file — trivially replicable

The limitation has always been **writes**: SQLite has one writer at a time (database-level write lock). At the edge, this means write conflicts when multiple regions try to update the same data.

The new platforms solve this in different ways.

---

## The Key Players

### Turso (libsql)

Turso forked SQLite into **libsql**, an open-source, open-contribution SQLite dialect that adds:

- **HTTP-based wire protocol** (SQLite normally needs a file path)
- **Embedded replicas**: full SQLite database on the application server, synced from a primary
- **Multi-tenancy**: each tenant gets their own database (not just schema isolation)

```typescript
import { createClient } from "@libsql/client";

// Connect to Turso cloud
const client = createClient({
  url: "libsql://my-db.turso.io",
  authToken: process.env.TURSO_TOKEN,
});

// Or use embedded replica (reads from local file, writes sync to cloud)
const client = createClient({
  url: "file:local.db",
  syncUrl: "libsql://my-db.turso.io",
  authToken: process.env.TURSO_TOKEN,
  syncInterval: 60, // sync every 60 seconds
});

const result = await client.execute("SELECT * FROM users WHERE id = ?", [userId]);
```

**The database-per-tenant model** is Turso's killer feature. Instead of one Postgres database with a `tenant_id` column, each customer gets their own isolated SQLite database. You can have 10,000 databases on a starter plan.

This matters for:
- SaaS apps where tenant isolation is a compliance requirement
- Reducing "noisy neighbor" problems
- Easy tenant deletion (drop the file)

### Cloudflare D1

D1 is SQLite running on Cloudflare Workers, globally distributed. Every D1 database has a primary region and automatically creates read replicas near your workers.

```typescript
// Workers with D1 binding
export default {
  async fetch(request: Request, env: Env) {
    const { results } = await env.DB.prepare(
      "SELECT * FROM products WHERE category = ? LIMIT 20"
    ).bind("electronics").all();
    
    return Response.json(results);
  }
};

// wrangler.toml
// [[d1_databases]]
// binding = "DB"
// database_name = "my-app"
// database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

D1 automatically routes reads to the nearest replica, making global read latency typically under 10ms. Writes go to the primary and replicate asynchronously.

D1's vector extension (released 2025) adds `VECTOR` column type and cosine similarity search — RAG applications without a separate vector database.

### LiteFS (Fly.io)

LiteFS is a FUSE filesystem that intercepts SQLite writes and replicates the SQLite write-ahead log (WAL) to other nodes. Any process that writes to a SQLite file transparently gets replication.

```yaml
# LiteFS config
fuse:
  dir: "/litefs"

data:
  dir: "/var/lib/litefs"

lease:
  type: "consul"
  advertise-url: "http://${HOSTNAME}.flycast:20202"
  
  consul:
    url: "http://consul.internal:8500"
    key: "litefs/my-app"

upstream:
  url: "http://litefs-primary.internal:20202"
```

LiteFS works at the FUSE level, meaning any SQLite-compatible library automatically gets replication — no code changes required.

---

## When to Choose SQLite-Based Edge DB

### Perfect fit ✅

**Low-to-medium write rates**: If you're doing < 1000 writes/second globally, SQLite's single-writer model is fine. Most apps don't need more.

**Read-heavy workloads**: SQLite reads are blazing fast (in-process). If your app is 95% reads, you'll outperform a networked Postgres by 10x on read latency.

**Database-per-tenant SaaS**: The killer use case. Turso lets you create a database per user/tenant cheaply.

**Edge/serverless compute**: D1 with Cloudflare Workers, Turso with Deno Deploy, LiteFS on Fly.io.

**Simple deployments**: No connection pooling, no replication config, no standby replicas. SQLite just works.

### Poor fit ❌

**High write throughput**: Financial systems, IoT ingestion, anything over ~1k writes/sec. Use Postgres or a distributed NewSQL database.

**Complex concurrent writes**: If multiple processes need to write simultaneously and conflict resolution is complex.

**Huge datasets**: SQLite is tested to 281 TB, but practically it gets unwieldy above a few GB per database. For database-per-tenant, this isn't usually a problem.

**Heavy JOIN workloads**: SQLite's query planner is good but not Postgres-level for complex analytical queries.

---

## Performance Benchmarks (2026)

Typical latency on Cloudflare D1 (global workers):

| Operation | Local (same region) | Edge read replica | Primary |
|---|---|---|---|
| Point read (index) | 1-3ms | 5-15ms | 20-50ms |
| Range scan (1k rows) | 5-20ms | 15-40ms | 40-100ms |
| Simple write | — | — | 50-150ms |
| Complex query | 20-100ms | 30-120ms | 60-200ms |

Compare to a Postgres instance in us-east-1 accessed from Asia: 150-250ms per query. Edge SQLite wins for read-heavy global apps.

---

## Practical: Building a Global Blog with Turso + Next.js

{% raw %}
```typescript
// lib/db.ts
import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!,
});

// Use embedded replica for optimal read performance
export const localDb = createClient({
  url: "file:./local.db",
  syncUrl: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!,
});

// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const { rows } = await localDb.execute("SELECT slug FROM posts WHERE published = 1");
  return rows.map(row => ({ slug: row.slug as string }));
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  // Reads from local replica — sub-millisecond
  const { rows } = await localDb.execute(
    "SELECT title, content, published_at FROM posts WHERE slug = ?",
    [params.slug]
  );
  
  if (!rows.length) notFound();
  const post = rows[0];
  
  return (
    <article>
      <h1>{post.title as string}</h1>
      <time>{post.published_at as string}</time>
      <div dangerouslySetInnerHTML={{ __html: post.content as string }} />
    </article>
  );
}
```
{% endraw %}

Reads are served from the local SQLite file — no network call. The embedded replica syncs from Turso Cloud every 60 seconds.

---

## Multi-tenant Pattern with Turso

```typescript
// Tenant-per-database pattern
async function getTenantDb(tenantId: string) {
  const url = `libsql://${tenantId}.turso.io`;
  
  return createClient({
    url,
    authToken: await getTenantToken(tenantId), // per-tenant JWT
  });
}

// Per-tenant isolation — no shared schema namespace
async function getUserData(tenantId: string, userId: string) {
  const db = await getTenantDb(tenantId);
  const { rows } = await db.execute(
    "SELECT * FROM users WHERE id = ?",
    [userId]
  );
  return rows[0];
}
```

Each tenant's data is completely isolated at the database level. Deleting a tenant: drop the database.

---

## Migration Tooling

Both Drizzle ORM and Prisma now support libsql natively:

```typescript
// Drizzle with libsql
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const client = createClient({ url: process.env.TURSO_URL! });
export const db = drizzle(client);

// Standard Drizzle queries
const posts = await db.select().from(schema.posts)
  .where(eq(schema.posts.published, true))
  .orderBy(desc(schema.posts.createdAt))
  .limit(10);
```

---

## Conclusion

SQLite's renaissance is a reminder that "simple" isn't the same as "limited." The database that's been quietly powering mobile apps, browsers, and appliances for decades is now the foundation for a new generation of edge-native cloud applications.

For developers building read-heavy global apps, SaaS platforms with strong tenant isolation needs, or anything running on Cloudflare Workers or Fly.io — SQLite-based databases deserve serious consideration in 2026.

The joke that SQLite isn't for production is officially retired.

---

*References:*
- [libsql GitHub](https://github.com/tursodatabase/libsql)
- [Turso documentation](https://docs.turso.tech)
- [Cloudflare D1 documentation](https://developers.cloudflare.com/d1/)
- [LiteFS documentation](https://fly.io/docs/litefs/)
- [Drizzle ORM with libsql](https://orm.drizzle.team/docs/get-started-sqlite)
