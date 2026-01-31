---
layout: post
title: "TypeScript 5.x New Features: Complete Guide to Modern TypeScript"
subtitle: Master the latest TypeScript features for better type safety and developer experience
categories: development
tags: typescript javascript
comments: true
---

# TypeScript 5.x New Features: Complete Guide to Modern TypeScript

TypeScript 5.x has brought significant improvements to the language, making it more powerful and developer-friendly than ever. This comprehensive guide covers all the major features you need to know in 2026.

## Decorators (Stage 3)

TypeScript 5.0 introduced support for the ECMAScript Stage 3 decorators proposal:

### Class Decorators

```typescript
function logged<T extends new (...args: any[]) => any>(
  target: T,
  context: ClassDecoratorContext
) {
  return class extends target {
    constructor(...args: any[]) {
      console.log(`Creating instance of ${context.name}`);
      super(...args);
    }
  };
}

@logged
class UserService {
  constructor(private userId: string) {}
}

const service = new UserService("123");
// Logs: Creating instance of UserService
```

### Method Decorators

```typescript
function measure<T extends (...args: any[]) => any>(
  target: T,
  context: ClassMethodDecoratorContext
) {
  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const start = performance.now();
    const result = target.apply(this, args);
    const end = performance.now();
    console.log(`${String(context.name)} took ${end - start}ms`);
    return result;
  };
}

class DataProcessor {
  @measure
  processData(data: number[]) {
    return data.map(x => x * 2);
  }
}
```

### Field Decorators

```typescript
function validate(min: number, max: number) {
  return function <T>(
    target: undefined,
    context: ClassFieldDecoratorContext
  ) {
    return function (initialValue: T): T {
      if (typeof initialValue === 'number') {
        if (initialValue < min || initialValue > max) {
          throw new Error(
            `${String(context.name)} must be between ${min} and ${max}`
          );
        }
      }
      return initialValue;
    };
  };
}

class Product {
  @validate(0, 100)
  discount = 10;
}
```

## const Type Parameters

Infer more specific literal types with `const` type parameters:

```typescript
// Without const - infers string[]
function getRoutes<T extends readonly string[]>(routes: T) {
  return routes;
}
const routes1 = getRoutes(["home", "about"]); // string[]

// With const - infers readonly ["home", "about"]
function getRoutesConst<const T extends readonly string[]>(routes: T) {
  return routes;
}
const routes2 = getRoutesConst(["home", "about"]); 
// readonly ["home", "about"]

// Practical example
function createConfig<const T extends Record<string, unknown>>(config: T): T {
  return config;
}

const config = createConfig({
  apiUrl: "https://api.example.com",
  timeout: 5000,
  features: ["auth", "analytics"] as const
});
// Type: { apiUrl: "https://api.example.com"; timeout: 5000; features: readonly ["auth", "analytics"] }
```

## satisfies Operator

Validate types without changing the inferred type:

```typescript
type Colors = "red" | "green" | "blue";
type RGB = [number, number, number];

// Without satisfies - loses specific type info
const palette1: Record<Colors, string | RGB> = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255]
};
// palette1.green is string | RGB

// With satisfies - keeps specific types
const palette2 = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255]
} satisfies Record<Colors, string | RGB>;
// palette2.green is string
// palette2.red is [number, number, number]

// Catches errors at definition time
const palette3 = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255],
  // @ts-error - 'yellow' is not assignable
  yellow: "#ffff00"
} satisfies Record<Colors, string | RGB>;
```

## Improved Enums

### Union Enums

```typescript
enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
  Pending = "PENDING"
}

// TypeScript 5.x treats this as a union
type StatusType = `${Status}`; // "ACTIVE" | "INACTIVE" | "PENDING"

function handleStatus(status: Status) {
  // Exhaustive checking works naturally
  switch (status) {
    case Status.Active:
      return "User is active";
    case Status.Inactive:
      return "User is inactive";
    case Status.Pending:
      return "User is pending";
  }
}
```

## Type-Only Imports and Exports

### Explicit Type Imports

```typescript
// Explicit type-only import
import type { User, Config } from "./types";
import { createUser } from "./utils";

// Mixed import with inline type
import { createUser, type User } from "./module";

// Type-only export
export type { User, Config };
export { createUser };
```

## Template Literal Types Improvements

### Intrinsic String Manipulation

```typescript
type Greeting = "Hello, World!";

type Upper = Uppercase<Greeting>;      // "HELLO, WORLD!"
type Lower = Lowercase<Greeting>;      // "hello, world!"
type Capital = Capitalize<Greeting>;   // "Hello, World!"
type Uncap = Uncapitalize<Greeting>;   // "hello, World!"

// Practical example: API route types
type HttpMethod = "get" | "post" | "put" | "delete";
type Route = "/users" | "/posts" | "/comments";

type ApiEndpoint = `${Uppercase<HttpMethod>} ${Route}`;
// "GET /users" | "GET /posts" | "GET /comments" | "POST /users" | ...
```

### Pattern Matching with Template Literals

```typescript
type ExtractRouteParams<T extends string> = 
  T extends `${infer _Start}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<`/${Rest}`>
    : T extends `${infer _Start}:${infer Param}`
      ? Param
      : never;

type Params = ExtractRouteParams<"/users/:userId/posts/:postId">;
// "userId" | "postId"
```

## Improved Type Inference

### Better Control Flow Analysis

```typescript
function processValue(value: string | number | null) {
  if (value === null) {
    return;
  }
  
  // TypeScript now correctly narrows in more complex scenarios
  const result = typeof value === "string" 
    ? value.toUpperCase() 
    : value.toFixed(2);
    
  return result;
}
```

### Improved Generic Inference

```typescript
// Better inference for generic functions
function merge<T, U>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}

const merged = merge(
  { name: "John", age: 30 },
  { email: "john@example.com" }
);
// Correctly inferred as { name: string; age: number; email: string }
```

## Performance Improvements

### Faster Compilation

TypeScript 5.x includes significant performance improvements:

```json
// tsconfig.json - Enable incremental builds
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

### Project References

```json
// tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true
  },
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/utils" }
  ]
}
```

## New Configuration Options

### verbatimModuleSyntax

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true
  }
}
```

```typescript
// With verbatimModuleSyntax, this import is preserved
import { something } from "./module";

// Type-only imports are always removed
import type { SomeType } from "./types";
```

### allowImportingTsExtensions

```json
{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

```typescript
// Now allowed
import { helper } from "./utils.ts";
```

## Practical Examples

### Type-Safe Event Emitter

```typescript
type EventMap = {
  userCreated: { userId: string; email: string };
  userDeleted: { userId: string };
  orderPlaced: { orderId: string; amount: number };
};

class TypedEventEmitter<T extends Record<string, unknown>> {
  private listeners = new Map<keyof T, Set<(data: any) => void>>();

  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    this.listeners.get(event)?.forEach(listener => listener(data));
  }
}

const emitter = new TypedEventEmitter<EventMap>();

emitter.on("userCreated", (data) => {
  // data is { userId: string; email: string }
  console.log(data.email);
});

emitter.emit("userCreated", { userId: "123", email: "test@example.com" });
```

### Builder Pattern with Types

```typescript
class QueryBuilder<T extends object = {}> {
  private query: T = {} as T;

  select<K extends string>(field: K): QueryBuilder<T & Record<K, true>> {
    return this as any;
  }

  where<K extends string, V>(
    field: K, 
    value: V
  ): QueryBuilder<T & Record<`where_${K}`, V>> {
    return this as any;
  }

  build(): T {
    return this.query;
  }
}

const query = new QueryBuilder()
  .select("name")
  .select("email")
  .where("age", 25)
  .build();

// Type: { name: true; email: true; where_age: number }
```

## Migrating to TypeScript 5.x

### Step-by-Step Migration

1. **Update TypeScript**
```bash
npm install typescript@latest
```

2. **Update tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "verbatimModuleSyntax": true
  }
}
```

3. **Update decorator syntax** (if using experimentalDecorators)
```typescript
// Old (experimental)
function Log(target: any, key: string) { }

// New (Stage 3)
function Log<T>(target: T, context: ClassMethodDecoratorContext) { }
```

## Conclusion

TypeScript 5.x brings powerful new features that improve type safety, developer experience, and performance. Key takeaways:

1. **Use Stage 3 decorators** for cleaner metadata patterns
2. **Leverage `const` type parameters** for literal inference
3. **Apply `satisfies`** for validation without type widening
4. **Enable `verbatimModuleSyntax`** for clearer imports
5. **Take advantage of performance improvements** with incremental builds

## Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [TypeScript 5.0 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html)
- [TypeScript Playground](https://www.typescriptlang.org/play)
