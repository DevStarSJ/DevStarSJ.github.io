---
layout: post
title: "GraphQL Federation: Building Scalable APIs Across Microservices"
subtitle: "Unite your microservices under a single, powerful GraphQL gateway"
date: 2026-02-17
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200"
catalog: true
tags:
  - GraphQL
  - Microservices
  - API
  - Architecture
  - Federation
---

# GraphQL Federation: Building Scalable APIs Across Microservices

As organizations adopt microservices architectures, managing APIs becomes increasingly complex. GraphQL Federation offers an elegant solution by allowing teams to build a unified graph while maintaining service autonomy.

![API Architecture](https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800)
*Photo by [Markus Spiske](https://unsplash.com/@markusspiske) on Unsplash*

## What is GraphQL Federation?

GraphQL Federation is an architecture pattern that allows you to compose multiple GraphQL services into a single, unified API. Each service owns a portion of the schema and can be developed, deployed, and scaled independently.

### Key Concepts

- **Subgraphs**: Individual GraphQL services that own specific types
- **Supergraph**: The composed schema from all subgraphs
- **Router/Gateway**: The entry point that orchestrates queries across subgraphs

## Setting Up Federation 2.0

Let's build a practical example with three services: Users, Products, and Reviews.

### User Service Subgraph

```graphql
# users/schema.graphql
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.0",
        import: ["@key"])

type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
  createdAt: DateTime!
}

type Query {
  user(id: ID!): User
  users: [User!]!
}
```

```typescript
// users/resolvers.ts
const resolvers = {
  Query: {
    user: (_, { id }) => userService.findById(id),
    users: () => userService.findAll(),
  },
  User: {
    __resolveReference: (user) => userService.findById(user.id),
  },
};
```

### Product Service Subgraph

```graphql
# products/schema.graphql
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.0",
        import: ["@key"])

type Product @key(fields: "id") {
  id: ID!
  name: String!
  price: Float!
  description: String
  inStock: Boolean!
}

type Query {
  product(id: ID!): Product
  products(category: String): [Product!]!
}
```

### Reviews Service with Entity Extension

Here's where Federation shines—extending types from other services:

```graphql
# reviews/schema.graphql
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.0",
        import: ["@key", "@external"])

type Review @key(fields: "id") {
  id: ID!
  rating: Int!
  comment: String
  author: User!
  product: Product!
}

extend type User @key(fields: "id") {
  id: ID! @external
  reviews: [Review!]!
}

extend type Product @key(fields: "id") {
  id: ID! @external
  reviews: [Review!]!
  averageRating: Float
}
```

![Microservices Communication](https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800)
*Photo by [NASA](https://unsplash.com/@nasa) on Unsplash*

## Router Configuration

Using Apollo Router for production:

```yaml
# router.yaml
supergraph:
  listen: 0.0.0.0:4000

subgraphs:
  users:
    routing_url: http://users-service:4001/graphql
  products:
    routing_url: http://products-service:4002/graphql
  reviews:
    routing_url: http://reviews-service:4003/graphql

cors:
  origins:
    - https://myapp.com
  
telemetry:
  tracing:
    otlp:
      endpoint: http://jaeger:4317
```

## Query Planning and Execution

When a client sends a query that spans multiple services:

```graphql
query GetProductWithReviews($productId: ID!) {
  product(id: $productId) {
    name
    price
    reviews {
      rating
      comment
      author {
        name
      }
    }
    averageRating
  }
}
```

The router automatically:
1. Fetches the product from the Products service
2. Fetches reviews from the Reviews service
3. Fetches user data from the Users service
4. Combines the results

## Performance Optimization

### Batching with DataLoader

```typescript
// reviews/dataloaders.ts
import DataLoader from 'dataloader';

export const createUserLoader = () =>
  new DataLoader<string, User>(async (userIds) => {
    const users = await userService.findByIds(userIds);
    return userIds.map(id => users.find(u => u.id === id));
  });
```

### Query Deduplication

```yaml
# router.yaml
traffic_shaping:
  all:
    deduplicate_query: true
  subgraphs:
    products:
      timeout: 5s
```

## Error Handling

Implement partial results for resilience:

```graphql
type Query {
  product(id: ID!): ProductResult!
}

union ProductResult = Product | ProductNotFound | ProductError

type ProductNotFound {
  message: String!
}

type ProductError {
  code: String!
  message: String!
}
```

## Schema Evolution and Versioning

Federation enables safe schema evolution:

```graphql
type Product @key(fields: "id") {
  id: ID!
  name: String!
  price: Float! @deprecated(reason: "Use priceInfo instead")
  priceInfo: PriceInfo!
}

type PriceInfo {
  amount: Float!
  currency: String!
  discount: Float
}
```

## Monitoring and Observability

Essential metrics to track:

1. **Query latency by subgraph**
2. **Error rates per service**
3. **Cache hit rates**
4. **Query complexity scores**

```typescript
// Custom plugin for metrics
const metricsPlugin = {
  async requestDidStart() {
    const start = Date.now();
    return {
      async willSendResponse({ response }) {
        const duration = Date.now() - start;
        metrics.histogram('graphql_request_duration', duration);
      },
    };
  },
};
```

## Best Practices

### 1. Design for Independence
Each subgraph should be deployable independently without breaking the supergraph.

### 2. Use Semantic Naming
```graphql
# Good
type Order @key(fields: "id") { ... }
extend type User @key(fields: "id") {
  orders: [Order!]!
}

# Avoid
extend type User @key(fields: "id") {
  userOrders: [Order!]!  # Redundant prefix
}
```

### 3. Implement Health Checks
```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    schema: 'loaded',
    uptime: process.uptime(),
  });
});
```

## Conclusion

GraphQL Federation transforms how we build and maintain APIs in a microservices world. By composing independent subgraphs into a unified supergraph, teams can:

- **Scale independently**: Each team owns their subgraph
- **Evolve safely**: Schema changes are isolated
- **Deliver faster**: Single endpoint for all data needs

Start small with a few services and expand as your federation expertise grows.

---

*Have you implemented GraphQL Federation? What challenges did you face? Share in the comments!*
