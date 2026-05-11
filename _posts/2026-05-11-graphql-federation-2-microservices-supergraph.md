---
layout: post
title: "GraphQL Federation 2.0: Building a Unified Supergraph Across Microservices"
subtitle: "A deep dive into Apollo Federation's declarative composition, entity resolvers, and the shift-left approach to API governance"
date: 2026-05-11 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80"
catalog: true
tags:
  - GraphQL
  - Federation
  - Microservices
  - API
  - Apollo
---

## The Problem: Your GraphQL Schema Is a Monolith

You started with a single GraphQL server. It was great. One schema, one endpoint, one team. Then the org grew. Different teams own different domains — users, products, orders, inventory. Each wants to evolve their schema independently.

The naive solution: one massive GraphQL server that every team pushes to. The problems arrive quickly: merge conflicts, accidental breaking changes, deployment coupling, and a codebase that no team truly owns.

**GraphQL Federation** solves this by letting each team own a **subgraph** — their own GraphQL service with their own schema. A **router** (the supergraph) composes them into a single unified API for clients.

![API architecture](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&auto=format&fit=crop&q=80)

*Photo by Luke Chesser on Unsplash*

---

## Federation 2.0: What Changed

Federation 1.x had sharp edges: `@key` directives scattered everywhere, confusing ownership semantics, and fragile composition. Federation 2.0 (now broadly the industry standard) introduced:

- **Explicit `@shareable` fields** — by default, object types are not shared across subgraphs; you opt in
- **`@override`** — cleanly migrate a field from one subgraph to another
- **`@interfaceObject`** — reference interface types across subgraphs
- **Better error messages** — composition errors now point to the exact schema line
- **Progressive adoption** — easier to migrate from Federation 1 incrementally

---

## Core Concepts

### Entities and the `@key` Directive

Entities are types that can be referenced across subgraphs. You define them with `@key`:

```graphql
# users subgraph
type User @key(fields: "id") {
  id: ID!
  email: String!
  name: String!
}

type Query {
  me: User
  userById(id: ID!): User
}
```

```graphql
# orders subgraph
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}

type Order {
  id: ID!
  totalAmount: Float!
  status: OrderStatus!
}

enum OrderStatus {
  PENDING
  SHIPPED
  DELIVERED
}

type Query {
  order(id: ID!): Order
}
```

The orders subgraph **extends** the `User` type to add the `orders` field. When a client queries:

```graphql
query {
  me {
    name
    email
    orders {
      id
      totalAmount
      status
    }
  }
}
```

The router automatically plans and fans out the query: fetch `User` from the users subgraph, then use the returned `id` to fetch `orders` from the orders subgraph. The client sees one seamless response.

---

## Implementing a Reference Resolver

Each subgraph needs a **reference resolver** to handle cross-subgraph entity lookups:

```javascript
// orders subgraph (Apollo Server 4)
const resolvers = {
  User: {
    // Called when the router asks "fetch orders for this user id"
    __resolveReference: async ({ id }, { dataSources }) => {
      return { id }; // We only need the id to fetch orders
    },
    orders: async ({ id }, _, { dataSources }) => {
      return dataSources.ordersDB.getOrdersByUserId(id);
    }
  },
  Query: {
    order: (_, { id }, { dataSources }) => {
      return dataSources.ordersDB.getOrderById(id);
    }
  }
};
```

The router calls `__resolveReference` in bulk (batching entity lookups via DataLoader is strongly recommended for performance).

---

## Schema Composition with Rover CLI

Apollo Rover is the CLI for managing supergraphs:

```bash
# Install Rover
curl -sSL https://rover.apollo.dev/nix/latest | sh

# Check a subgraph schema
rover subgraph introspect http://localhost:4001/graphql

# Compose locally (requires a supergraph.yaml)
rover supergraph compose --config supergraph.yaml

# Validate a subgraph against the published supergraph
rover subgraph check my-graph \
  --schema ./users.graphql \
  --name users \
  --routing-url http://users-service/graphql
```

Your `supergraph.yaml` defines the composition:

```yaml
federation_version: =2.5.0
subgraphs:
  users:
    routing_url: http://users-service/graphql
    schema:
      subgraph_url: http://users-service/graphql
  orders:
    routing_url: http://orders-service/graphql
    schema:
      subgraph_url: http://orders-service/graphql
  products:
    routing_url: http://products-service/graphql
    schema:
      subgraph_url: http://products-service/graphql
```

---

## The Router: Apollo Router vs. Apollo Gateway

**Apollo Router** (the Rust-based router) has replaced Apollo Gateway for most production use cases:

| Feature | Apollo Gateway (Node.js) | Apollo Router (Rust) |
|---|---|---|
| Performance | Moderate | High (10x+ throughput) |
| Latency overhead | ~5ms per request | <1ms per request |
| Memory | Higher | Much lower |
| Plugin support | JavaScript | Rhai scripts + native Rust |
| Observability | OpenTelemetry optional | OpenTelemetry built-in |

```yaml
# router.yaml - basic Apollo Router config
cors:
  origins:
    - https://app.example.com

telemetry:
  exporters:
    tracing:
      otlp:
        endpoint: http://otel-collector:4317

supergraph:
  listen: 0.0.0.0:4000
  
traffic_shaping:
  all:
    deduplicate_variables: true
```

---

## Shift-Left Schema Governance

Federation 2.0 enables **schema governance as code**. The key pattern: check schema changes in CI before merging.

```yaml
# .github/workflows/schema-check.yml
name: Schema Check
on: [pull_request]
jobs:
  schema-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Rover
        run: curl -sSL https://rover.apollo.dev/nix/latest | sh
      - name: Check Schema
        run: |
          ~/.rover/bin/rover subgraph check ${{ env.APOLLO_GRAPH_REF }} \
            --name ${{ env.SUBGRAPH_NAME }} \
            --schema ./schema.graphql
        env:
          APOLLO_KEY: ${{ secrets.APOLLO_KEY }}
          APOLLO_GRAPH_REF: my-org/my-graph@main
          SUBGRAPH_NAME: users
```

This check against Apollo Studio (or any compatible schema registry) will:

- Detect breaking changes that would affect client operations
- Catch composition errors before they reach production
- Link schema changes to client impact data

---

## Advanced: Directives for Cross-Cutting Concerns

Federation 2.0 lets you define custom directives that apply across the supergraph:

```graphql
# Defined in one subgraph, imported by others
directive @authenticated on FIELD_DEFINITION
directive @requiresRole(role: String!) on FIELD_DEFINITION

type User @key(fields: "id") {
  id: ID!
  email: String! @authenticated
  adminData: AdminData @requiresRole(role: "ADMIN")
}
```

The router can intercept and enforce these via **coprocessors** — external HTTP services that the router calls before/after field resolution.

---

## Observability Out of the Box

Apollo Router ships with OpenTelemetry integration:

```yaml
telemetry:
  instrumentation:
    spans:
      router:
        attributes:
          "operation.name": true
          "graphql.operation.type": true
      supergraph:
        attributes:
          "graphql.document": true
      subgraph:
        attributes:
          "subgraph.name": true
          http.response.status_code: true
```

Every request generates spans that trace the full query plan execution — which subgraphs were called, in what order, with what latency. Correlates directly with your Tempo/Jaeger traces.

---

## When to Use Federation

**Good fit:**
- Multiple teams each owning a GraphQL domain
- Existing REST/GraphQL services you want to unify
- Need for independent deployability of API components
- Large schema that's painful to maintain as a monolith

**Poor fit:**
- Single-team, single-service GraphQL server (unnecessary complexity)
- Need for real-time subscriptions heavily across subgraphs (challenging in Federation)
- Teams that don't have clear domain ownership

GraphQL Federation 2.0 has matured to the point where it's the default recommendation for any org running GraphQL at scale. The router performance improvements, cleaner composition semantics, and robust tooling make it significantly less painful than its first iteration. If you deferred Federation because v1 was rough, it's time to revisit.
