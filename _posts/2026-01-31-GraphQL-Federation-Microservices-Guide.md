---
layout: post
title: "GraphQL Federation: Complete Guide to Unified Microservices APIs"
subtitle: Build scalable, distributed GraphQL APIs with Apollo Federation 2.0
categories: development
tags: graphql federation microservices api apollo
comments: true
---

# GraphQL Federation: Complete Guide to Unified Microservices APIs

GraphQL Federation solves one of the biggest challenges in microservices architecture: providing a unified API layer across multiple services. This comprehensive guide covers Apollo Federation 2.0 and best practices for building distributed GraphQL systems.

## What is GraphQL Federation?

Federation allows you to compose multiple GraphQL services (subgraphs) into a single unified API (supergraph). Each team owns their domain while clients get one consistent API.

```
┌─────────────────────────────────────────────┐
│              Apollo Gateway                  │
│           (Unified Supergraph)              │
└─────────────────┬───────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
┌───────┐    ┌───────┐    ┌───────┐
│Users  │    │Orders │    │Products│
│Subgraph│   │Subgraph│   │Subgraph│
└───────┘    └───────┘    └───────┘
```

## Setting Up Apollo Federation 2.0

### The Gateway (Router)

```bash
# Download Apollo Router
curl -sSL https://router.apollo.dev/download/nix/latest | sh

# Or use npm
npm install @apollo/gateway @apollo/server
```

```typescript
// gateway.ts
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'users', url: 'http://localhost:4001/graphql' },
      { name: 'orders', url: 'http://localhost:4002/graphql' },
      { name: 'products', url: 'http://localhost:4003/graphql' },
    ],
  }),
});

const server = new ApolloServer({ gateway });

startStandaloneServer(server, { listen: { port: 4000 } })
  .then(({ url }) => console.log(`🚀 Gateway ready at ${url}`));
```

### Users Subgraph

```typescript
// users-subgraph.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key", "@shareable"])

  type Query {
    me: User
    user(id: ID!): User
    users: [User!]!
  }

  type User @key(fields: "id") {
    id: ID!
    email: String!
    name: String!
    createdAt: String!
  }
`;

const users = [
  { id: '1', email: 'alice@example.com', name: 'Alice', createdAt: '2024-01-01' },
  { id: '2', email: 'bob@example.com', name: 'Bob', createdAt: '2024-02-01' },
];

const resolvers = {
  Query: {
    me: () => users[0],
    user: (_: any, { id }: { id: string }) => users.find(u => u.id === id),
    users: () => users,
  },
  User: {
    __resolveReference: (ref: { id: string }) => users.find(u => u.id === ref.id),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

startStandaloneServer(server, { listen: { port: 4001 } });
```

### Products Subgraph

```typescript
// products-subgraph.ts
const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key", "@shareable"])

  type Query {
    product(id: ID!): Product
    products(category: String): [Product!]!
    topProducts(limit: Int = 5): [Product!]!
  }

  type Product @key(fields: "id") {
    id: ID!
    name: String!
    price: Float!
    category: String!
    inventory: Int!
    description: String
  }
`;

const products = [
  { id: 'p1', name: 'Laptop', price: 999.99, category: 'Electronics', inventory: 50 },
  { id: 'p2', name: 'Headphones', price: 199.99, category: 'Electronics', inventory: 100 },
  { id: 'p3', name: 'Coffee Maker', price: 79.99, category: 'Kitchen', inventory: 30 },
];

const resolvers = {
  Query: {
    product: (_: any, { id }: { id: string }) => products.find(p => p.id === id),
    products: (_: any, { category }: { category?: string }) => 
      category ? products.filter(p => p.category === category) : products,
    topProducts: (_: any, { limit }: { limit: number }) => products.slice(0, limit),
  },
  Product: {
    __resolveReference: (ref: { id: string }) => products.find(p => p.id === ref.id),
  },
};
```

### Orders Subgraph (Extending Types)

```typescript
// orders-subgraph.ts
const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key", "@external", "@requires"])

  type Query {
    order(id: ID!): Order
    orders: [Order!]!
  }

  type Order @key(fields: "id") {
    id: ID!
    status: OrderStatus!
    totalPrice: Float!
    createdAt: String!
    items: [OrderItem!]!
    user: User!
  }

  type OrderItem {
    product: Product!
    quantity: Int!
    unitPrice: Float!
  }

  enum OrderStatus {
    PENDING
    PROCESSING
    SHIPPED
    DELIVERED
    CANCELLED
  }

  # Extend User from users subgraph
  type User @key(fields: "id") {
    id: ID!
    orders: [Order!]!
  }

  # Extend Product from products subgraph
  type Product @key(fields: "id") {
    id: ID!
  }
`;

const orders = [
  {
    id: 'o1',
    userId: '1',
    status: 'DELIVERED',
    totalPrice: 1199.98,
    createdAt: '2024-03-01',
    items: [
      { productId: 'p1', quantity: 1, unitPrice: 999.99 },
      { productId: 'p2', quantity: 1, unitPrice: 199.99 },
    ],
  },
];

const resolvers = {
  Query: {
    order: (_: any, { id }: { id: string }) => orders.find(o => o.id === id),
    orders: () => orders,
  },
  Order: {
    __resolveReference: (ref: { id: string }) => orders.find(o => o.id === ref.id),
    user: (order: any) => ({ __typename: 'User', id: order.userId }),
    items: (order: any) => order.items.map((item: any) => ({
      product: { __typename: 'Product', id: item.productId },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  },
  User: {
    orders: (user: { id: string }) => orders.filter(o => o.userId === user.id),
  },
};
```

## Key Federation Directives

### @key - Entity Definition

```graphql
# Single key
type User @key(fields: "id") {
  id: ID!
  email: String!
}

# Multiple keys
type Product @key(fields: "id") @key(fields: "sku") {
  id: ID!
  sku: String!
  name: String!
}

# Compound key
type Review @key(fields: "userId productId") {
  userId: ID!
  productId: ID!
  rating: Int!
  comment: String
}
```

### @external and @requires

```graphql
type Product @key(fields: "id") {
  id: ID!
  price: Float! @external
  weight: Float! @external
  shippingCost: Float! @requires(fields: "price weight")
}
```

```typescript
const resolvers = {
  Product: {
    shippingCost: (product: { price: number; weight: number }) => {
      // price and weight are fetched from products subgraph
      const baseRate = product.weight * 0.5;
      const insuranceRate = product.price * 0.01;
      return baseRate + insuranceRate;
    },
  },
};
```

### @provides - Optimization Hint

```graphql
type Review @key(fields: "id") {
  id: ID!
  body: String!
  author: User! @provides(fields: "name")
}

type User @key(fields: "id") {
  id: ID!
  name: String! @external
}
```

### @shareable - Multiple Subgraphs

```graphql
# Both subgraphs can resolve this field
type Product @key(fields: "id") {
  id: ID!
  name: String! @shareable
  price: Float! @shareable
}
```

## Advanced Patterns

### Interface Entities

```graphql
interface Media @key(fields: "id") {
  id: ID!
  title: String!
  duration: Int!
}

type Movie implements Media @key(fields: "id") {
  id: ID!
  title: String!
  duration: Int!
  director: String!
}

type TVShow implements Media @key(fields: "id") {
  id: ID!
  title: String!
  duration: Int!
  seasons: Int!
}
```

### Custom Scalars Across Subgraphs

```graphql
# shared-types.graphql (imported by all subgraphs)
scalar DateTime
scalar JSON
scalar UUID

type Query {
  _service: _Service!
}
```

### Error Handling

```typescript
// Custom error with extensions
import { GraphQLError } from 'graphql';

const resolvers = {
  Query: {
    order: async (_: any, { id }: { id: string }) => {
      const order = await db.orders.findById(id);
      
      if (!order) {
        throw new GraphQLError('Order not found', {
          extensions: {
            code: 'ORDER_NOT_FOUND',
            orderId: id,
          },
        });
      }
      
      return order;
    },
  },
};
```

### Authentication & Authorization

```typescript
// Gateway with auth
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';

class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }: any) {
    // Forward auth headers to subgraphs
    request.http.headers.set('authorization', context.token);
    request.http.headers.set('x-user-id', context.userId);
  }
}

const gateway = new ApolloGateway({
  buildService({ url }) {
    return new AuthenticatedDataSource({ url });
  },
});

// In subgraph
const resolvers = {
  Query: {
    me: (_: any, __: any, context: { userId: string }) => {
      if (!context.userId) {
        throw new GraphQLError('Not authenticated');
      }
      return users.find(u => u.id === context.userId);
    },
  },
};
```

## Schema Composition with Rover CLI

```bash
# Install Rover
npm install -g @apollo/rover

# Compose supergraph locally
rover supergraph compose --config ./supergraph.yaml > supergraph.graphql

# Publish to Apollo Studio
rover subgraph publish my-graph@production \
  --name users \
  --schema ./users/schema.graphql \
  --routing-url http://users-service:4001/graphql
```

```yaml
# supergraph.yaml
federation_version: =2.0.0
subgraphs:
  users:
    routing_url: http://localhost:4001/graphql
    schema:
      file: ./users/schema.graphql
  products:
    routing_url: http://localhost:4002/graphql
    schema:
      file: ./products/schema.graphql
  orders:
    routing_url: http://localhost:4003/graphql
    schema:
      file: ./orders/schema.graphql
```

## Performance Optimization

### DataLoader for N+1 Prevention

```typescript
import DataLoader from 'dataloader';

const createLoaders = () => ({
  userLoader: new DataLoader(async (ids: readonly string[]) => {
    const users = await db.users.findByIds([...ids]);
    return ids.map(id => users.find(u => u.id === id));
  }),
  
  productLoader: new DataLoader(async (ids: readonly string[]) => {
    const products = await db.products.findByIds([...ids]);
    return ids.map(id => products.find(p => p.id === id));
  }),
});

// Use in context
const server = new ApolloServer({
  schema,
  context: () => ({
    loaders: createLoaders(),
  }),
});

// In resolver
const resolvers = {
  Order: {
    user: (order: any, _: any, { loaders }: any) => 
      loaders.userLoader.load(order.userId),
  },
};
```

### Query Planning Optimization

```graphql
# Apollo Router configuration (router.yaml)
supergraph:
  introspection: true
  
traffic_shaping:
  all:
    timeout: 30s
    
query_planning:
  experimental_parallelizable_root_fields_under_mutation: true
  
execution:
  experimental_introspection_mode: new
```

### Caching

```typescript
// Response cache
const typeDefs = gql`
  type Query {
    products: [Product!]! @cacheControl(maxAge: 300)
  }
  
  type Product @key(fields: "id") @cacheControl(maxAge: 300) {
    id: ID!
    name: String!
    price: Float! @cacheControl(maxAge: 60)
  }
`;
```

## Testing Federation

```typescript
import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import assert from 'assert';

describe('Users Subgraph', () => {
  let server: ApolloServer;
  
  beforeAll(() => {
    server = new ApolloServer({
      schema: buildSubgraphSchema({ typeDefs, resolvers }),
    });
  });
  
  it('resolves user by reference', async () => {
    const response = await server.executeOperation({
      query: `
        query ($representations: [_Any!]!) {
          _entities(representations: $representations) {
            ... on User {
              id
              name
              email
            }
          }
        }
      `,
      variables: {
        representations: [{ __typename: 'User', id: '1' }],
      },
    });
    
    assert(response.body.kind === 'single');
    expect(response.body.singleResult.data?._entities[0]).toEqual({
      id: '1',
      name: 'Alice',
      email: 'alice@example.com',
    });
  });
});
```

## Monitoring & Observability

```typescript
// Apollo Studio integration
const gateway = new ApolloGateway({
  // ...
});

const server = new ApolloServer({
  gateway,
  plugins: [
    ApolloServerPluginUsageReporting({
      sendVariableValues: { all: true },
      sendHeaders: { all: true },
    }),
    ApolloServerPluginSchemaReporting(),
  ],
});
```

## Best Practices

1. **Domain-Driven Design**: Each subgraph owns its domain entities
2. **Minimize Cross-Subgraph Calls**: Use @provides when possible
3. **Version Your Schema**: Use Apollo Studio for schema checks
4. **Implement Circuit Breakers**: Handle subgraph failures gracefully
5. **Use DataLoader**: Prevent N+1 query problems
6. **Cache Aggressively**: Use @cacheControl directives
7. **Monitor Everything**: Track query latency per subgraph

## Conclusion

GraphQL Federation enables teams to build scalable, distributed APIs while maintaining a unified developer experience. Start with a simple two-subgraph setup and expand as your microservices architecture grows.

Key benefits:
- **Team autonomy**: Each team owns their subgraph
- **Single API**: Clients see one unified schema
- **Incremental adoption**: Add subgraphs as needed
- **Type safety**: Full GraphQL type checking across services
