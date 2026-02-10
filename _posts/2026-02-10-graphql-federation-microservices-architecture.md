---
layout: post
title: "GraphQL Federation 2.0: Scaling Microservices with Unified APIs"
subtitle: "Build a supergraph from independent services using Apollo Federation"
date: 2026-02-10
author: "Dev Star"
header-img: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1920&q=80"
tags: [GraphQL, Federation, Apollo, Microservices, API Gateway, Supergraph, TypeScript]
---

REST APIs served us well, but they don't compose. GraphQL Federation changes that—each team owns their subgraph, and the router stitches them into one unified API.

![Code on screen](https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80)
*Photo by [Luca Bravo](https://unsplash.com/@lucabravo) on Unsplash*

## Why Federation?

The problem with microservices + GraphQL:

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │ Multiple queries to different services?
       ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Users API    │  │ Orders API   │  │ Products API │
│ /graphql     │  │ /graphql     │  │ /graphql     │
└──────────────┘  └──────────────┘  └──────────────┘
```

With Federation:

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │ Single query
       ▼
┌──────────────────────────────────────────────────┐
│              Apollo Router (Supergraph)          │
└────────┬─────────────────┬───────────────┬───────┘
         ▼                 ▼               ▼
    ┌─────────┐      ┌──────────┐    ┌──────────┐
    │ Users   │      │ Orders   │    │ Products │
    │ Subgraph│      │ Subgraph │    │ Subgraph │
    └─────────┘      └──────────┘    └──────────┘
```

## Setting Up Federation 2.0

### Users Subgraph

```typescript
// users-subgraph/src/schema.ts
import { gql } from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key", "@shareable"])

  type Query {
    me: User
    user(id: ID!): User
  }

  type User @key(fields: "id") {
    id: ID!
    email: String!
    name: String!
    createdAt: DateTime!
  }

  scalar DateTime
`;

const resolvers = {
  Query: {
    me: (_, __, { userId }) => getUserById(userId),
    user: (_, { id }) => getUserById(id),
  },
  User: {
    __resolveReference: (ref) => getUserById(ref.id),
  },
};

export const schema = buildSubgraphSchema({ typeDefs, resolvers });
```

### Orders Subgraph

```typescript
// orders-subgraph/src/schema.ts
import { gql } from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key", "@external", "@requires"])

  type Query {
    order(id: ID!): Order
    myOrders: [Order!]!
  }

  type Order @key(fields: "id") {
    id: ID!
    status: OrderStatus!
    total: Float!
    items: [OrderItem!]!
    user: User!
    createdAt: DateTime!
  }

  type OrderItem {
    product: Product!
    quantity: Int!
    price: Float!
  }

  # Extend User from users subgraph
  type User @key(fields: "id") {
    id: ID!
    orders: [Order!]!
  }

  # Reference Product from products subgraph
  type Product @key(fields: "id", resolvable: false) {
    id: ID!
  }

  enum OrderStatus {
    PENDING
    CONFIRMED
    SHIPPED
    DELIVERED
  }

  scalar DateTime
`;

const resolvers = {
  Query: {
    order: (_, { id }) => getOrderById(id),
    myOrders: (_, __, { userId }) => getOrdersByUser(userId),
  },
  Order: {
    __resolveReference: (ref) => getOrderById(ref.id),
    user: (order) => ({ __typename: 'User', id: order.userId }),
    items: (order) => order.items.map(item => ({
      ...item,
      product: { __typename: 'Product', id: item.productId },
    })),
  },
  User: {
    orders: (user) => getOrdersByUser(user.id),
  },
};

export const schema = buildSubgraphSchema({ typeDefs, resolvers });
```

![Server room](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80)
*Photo by [Jordan Harrison](https://unsplash.com/@jordanharrison) on Unsplash*

### Products Subgraph

```typescript
// products-subgraph/src/schema.ts
import { gql } from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key", "@shareable"])

  type Query {
    product(id: ID!): Product
    products(category: String, limit: Int): [Product!]!
    searchProducts(query: String!): [Product!]!
  }

  type Product @key(fields: "id") {
    id: ID!
    name: String!
    description: String
    price: Float!
    category: String!
    inventory: Int!
    images: [String!]!
  }
`;

const resolvers = {
  Query: {
    product: (_, { id }) => getProductById(id),
    products: (_, { category, limit }) => getProducts({ category, limit }),
    searchProducts: (_, { query }) => searchProducts(query),
  },
  Product: {
    __resolveReference: (ref) => getProductById(ref.id),
  },
};

export const schema = buildSubgraphSchema({ typeDefs, resolvers });
```

## Router Configuration

```yaml
# router.yaml
supergraph:
  listen: 0.0.0.0:4000
  
subgraphs:
  users:
    routing_url: http://users-service:4001/graphql
  orders:
    routing_url: http://orders-service:4002/graphql
  products:
    routing_url: http://products-service:4003/graphql

cors:
  origins:
    - https://myapp.com
  
headers:
  all:
    request:
      - propagate:
          named: authorization
          
telemetry:
  tracing:
    otlp:
      endpoint: http://jaeger:4317

limits:
  max_depth: 15
  max_height: 200
```

## Composing the Supergraph

```bash
# Install rover CLI
npm install -g @apollo/rover

# Compose supergraph schema
rover supergraph compose --config supergraph.yaml > supergraph.graphql

# Start router with composed schema
./router --supergraph supergraph.graphql --config router.yaml
```

## Query Planning

The magic happens in query planning. This query:

```graphql
query GetMyOrdersWithProducts {
  myOrders {
    id
    status
    total
    items {
      quantity
      product {
        name
        price
      }
    }
    user {
      name
      email
    }
  }
}
```

Becomes this execution plan:

```
1. Fetch from orders subgraph:
   - myOrders { id, status, total, items { quantity, productId } }
   
2. Parallel fetches:
   a. Products subgraph: Product entities by IDs
   b. Users subgraph: User entity by ID
   
3. Merge results
```

## Advanced Patterns

### Entity Resolution with Context

```typescript
// Pass context between subgraphs
const typeDefs = gql`
  type Product @key(fields: "id") {
    id: ID!
    name: String!
    # Price varies by user's region
    localizedPrice(currency: String!): Float! 
      @requires(fields: "basePrice")
    basePrice: Float! @external
  }
`;
```

### Shared Types with @shareable

```typescript
// Multiple subgraphs can define PageInfo
const typeDefs = gql`
  type PageInfo @shareable {
    hasNextPage: Boolean!
    endCursor: String
  }
`;
```

### Interface Entities

```typescript
const typeDefs = gql`
  interface Node @key(fields: "id") {
    id: ID!
  }
  
  type Product implements Node @key(fields: "id") {
    id: ID!
    name: String!
  }
`;
```

## Performance Optimization

### Batching with DataLoader

```typescript
// Prevent N+1 queries in entity resolution
import DataLoader from 'dataloader';

const createLoaders = () => ({
  products: new DataLoader(async (ids: string[]) => {
    const products = await db.products.findMany({
      where: { id: { in: ids } },
    });
    // Return in same order as requested IDs
    return ids.map(id => products.find(p => p.id === id));
  }),
});

// In resolver
Product: {
  __resolveReference: (ref, { loaders }) => 
    loaders.products.load(ref.id),
}
```

### Query Deduplication

```yaml
# router.yaml
traffic_shaping:
  deduplicate_query: true
  
  subgraphs:
    products:
      timeout: 5s
      
  all:
    compression: gzip
```

## Monitoring Federation

```typescript
// Custom router plugin for metrics
import { ApolloServerPlugin } from '@apollo/server';

const metricsPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    const start = Date.now();
    
    return {
      async willSendResponse({ response }) {
        const duration = Date.now() - start;
        
        metrics.histogram('graphql.query.duration', duration, {
          operation: response.body.operationName,
        });
      },
      
      async didEncounterSubgraphErrors({ errors, subgraphName }) {
        errors.forEach(error => {
          metrics.increment('graphql.subgraph.error', {
            subgraph: subgraphName,
            code: error.extensions?.code,
          });
        });
      },
    };
  },
};
```

## Schema Governance

### Schema Checks in CI

```yaml
# .github/workflows/schema-check.yml
name: Schema Check

on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check schema changes
        run: |
          rover subgraph check my-graph@prod \
            --name users \
            --schema ./users-subgraph/schema.graphql
        env:
          APOLLO_KEY: ${{ secrets.APOLLO_KEY }}
```

## Migration from Monolith

1. **Start with one subgraph** - Your existing GraphQL server
2. **Extract entities gradually** - Move types to new subgraphs
3. **Use @override** - Migrate fields without breaking clients
4. **Deprecate old fields** - Give clients time to migrate

```typescript
// During migration: new subgraph takes over a field
type Product @key(fields: "id") {
  id: ID!
  # This subgraph now owns inventory
  inventory: Int! @override(from: "legacy")
}
```

---

*GraphQL Federation shines when teams own their domain. The supergraph is an API product—treat it like one.*
