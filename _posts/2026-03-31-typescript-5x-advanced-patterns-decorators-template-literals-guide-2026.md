---
layout: post
title: "TypeScript 5.x Advanced Patterns: Decorators, Template Literals, and Type-Safe APIs"
subtitle: "Master the TypeScript 5.x features that senior engineers actually use in production codebases"
date: 2026-03-31 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&auto=format&fit=crop&q=80"
header-mask: 0.4
catalog: true
tags:
  - TypeScript
  - JavaScript
  - Programming
  - Type System
  - Web Development
---

## TypeScript in 2026: Beyond the Basics

TypeScript 5.x has introduced a wave of features that make the type system dramatically more expressive. If you're still writing `any` casts, or your generic functions return `unknown` when they should return something precise, this guide is for you.

We'll cover the patterns that senior TypeScript engineers use daily but rarely document explicitly.

![TypeScript code on screen](https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=900&auto=format&fit=crop&q=80)

*Photo by Florian Olivo on Unsplash*

---

## 1. Decorators (Stage 3 — Now Stable)

TypeScript 5.0 shipped standard ECMAScript decorators, finally replacing the legacy experimentalDecorators approach.

### Class Decorators

```typescript
// Dependency injection decorator
function injectable<T extends new (...args: any[]) => {}>(
  target: T,
  context: ClassDecoratorContext
) {
  context.addInitializer(function (this: InstanceType<T>) {
    container.register(target.name, this);
  });
  return target;
}

@injectable
class UserService {
  constructor(private db: Database) {}
  
  async findById(id: string): Promise<User> {
    return this.db.users.findOne({ id });
  }
}
```

### Method Decorators with Metadata

```typescript
// Retry decorator
function retry(attempts: number, delay = 100) {
  return function <T>(
    target: (this: T, ...args: any[]) => Promise<any>,
    context: ClassMethodDecoratorContext
  ) {
    return async function (this: T, ...args: any[]) {
      let lastError: Error;
      
      for (let i = 0; i < attempts; i++) {
        try {
          return await target.apply(this, args);
        } catch (error) {
          lastError = error as Error;
          if (i < attempts - 1) {
            await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
          }
        }
      }
      
      throw lastError!;
    };
  };
}

// Memoize decorator with type safety
function memoize<T, R>(
  target: (this: T, arg: string) => R,
  context: ClassMethodDecoratorContext
) {
  const cache = new Map<string, R>();
  
  return function (this: T, arg: string): R {
    if (cache.has(arg)) return cache.get(arg)!;
    const result = target.call(this, arg);
    cache.set(arg, result);
    return result;
  };
}

class ApiClient {
  @retry(3, 200)
  async fetchUser(id: string): Promise<User> {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
  
  @memoize
  formatUserId(id: string): string {
    return `USER_${id.toUpperCase().padStart(8, "0")}`;
  }
}
```

---

## 2. Template Literal Types: Type-Safe Routing

```typescript
// Type-safe URL builder
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type ApiVersion = "v1" | "v2";

// Extract route params from a path string
type RouteParams<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof RouteParams<Rest>]: string }
    : Path extends `${string}:${infer Param}`
    ? { [K in Param]: string }
    : Record<never, never>;

// Test it
type UserRouteParams = RouteParams<"/users/:userId/posts/:postId">;
// → { userId: string; postId: string }

// Type-safe route definition
type Route<
  Method extends HttpMethod,
  Path extends string,
  Body = undefined,
  Response = unknown
> = {
  method: Method;
  path: Path;
  handler: (
    params: RouteParams<Path>,
    body: Body,
    ctx: RequestContext
  ) => Promise<Response>;
};

function defineRoute<
  Method extends HttpMethod,
  Path extends string,
  Body = undefined,
  Response = unknown
>(route: Route<Method, Path, Body, Response>): Route<Method, Path, Body, Response> {
  return route;
}

// Usage — fully type-safe
const getUserPosts = defineRoute({
  method: "GET",
  path: "/users/:userId/posts/:postId",
  handler: async (params, body, ctx) => {
    // params.userId and params.postId are inferred as string ✅
    // params.unknownParam → TypeScript error ✅
    return db.posts.findOne({
      userId: params.userId,
      id: params.postId,
    });
  },
});
```

---

## 3. Const Type Parameters and Inference

TypeScript 5.0 introduced `const` type parameter modifier:

```typescript
// Without const — loses literal types
function createConfig<T extends object>(config: T): T {
  return config;
}

const config1 = createConfig({ env: "production", port: 3000 });
// Type: { env: string; port: number } — too broad!

// With const — preserves literals
function createConfig<const T extends object>(config: T): T {
  return config;
}

const config2 = createConfig({ env: "production", port: 3000 });
// Type: { readonly env: "production"; readonly port: 3000 } ✅

// Extremely useful for event systems
type EventMap<const T extends Record<string, unknown>> = {
  [K in keyof T]: {
    type: K;
    payload: T[K];
  };
}[keyof T];

const eventConfig = {
  USER_LOGIN: { userId: "", timestamp: 0 },
  USER_LOGOUT: { userId: "", reason: "" },
  PAGE_VIEW: { path: "", duration: 0 },
} as const;

type AppEvent = EventMap<typeof eventConfig>;
// AppEvent = 
//   | { type: "USER_LOGIN"; payload: { userId: string; timestamp: number } }
//   | { type: "USER_LOGOUT"; payload: { userId: string; reason: string } }
//   | { type: "PAGE_VIEW"; payload: { path: string; duration: number } }

function dispatch(event: AppEvent): void {
  // exhaustive type checking ✅
  switch (event.type) {
    case "USER_LOGIN":
      analytics.track("login", event.payload.userId);
      break;
    case "USER_LOGOUT":
      session.invalidate(event.payload.userId);
      break;
    case "PAGE_VIEW":
      analytics.pageview(event.payload.path);
      break;
  }
}
```

---

## 4. Variadic Tuple Types for Builder Patterns

```typescript
// Type-safe pipeline builder
type PipelineStep<Input, Output> = (input: Input) => Output | Promise<Output>;

type Pipeline<Steps extends readonly PipelineStep<any, any>[]> =
  Steps extends readonly [
    PipelineStep<infer Input, any>,
    ...infer Rest extends readonly PipelineStep<any, any>[]
  ]
    ? Steps extends readonly [...any[], PipelineStep<any, infer Output>]
      ? { run(input: Input): Promise<Output> }
      : never
    : never;

function buildPipeline<
  const Steps extends readonly PipelineStep<any, any>[]
>(...steps: Steps): Pipeline<Steps> {
  return {
    async run(input: any) {
      let value = input;
      for (const step of steps) {
        value = await step(value);
      }
      return value;
    },
  } as Pipeline<Steps>;
}

// Usage
const imageProcessor = buildPipeline(
  (url: string) => fetch(url).then(r => r.arrayBuffer()),
  (buffer: ArrayBuffer) => sharp(buffer).resize(800),
  (image: sharp.Sharp) => image.jpeg({ quality: 80 }).toBuffer(),
  (buffer: Buffer) => uploadToS3(buffer)
);

// imageProcessor.run inferred as: (input: string) => Promise<string>
const s3Url = await imageProcessor.run("https://example.com/photo.jpg");
```

---

## 5. `satisfies` Operator: Validation Without Widening

```typescript
type ColorConfig = {
  primary: string | [number, number, number];
  secondary: string | [number, number, number];
  accent: string | [number, number, number];
};

// WITHOUT satisfies — loses specific types
const colors1: ColorConfig = {
  primary: "#ff6b6b",
  secondary: [100, 149, 237],
  accent: "#ffd93d",
};
// colors1.secondary is (string | [number, number, number]) — can't call .map() ❌

// WITH satisfies — validates AND preserves literals
const colors2 = {
  primary: "#ff6b6b",
  secondary: [100, 149, 237],
  accent: "#ffd93d",
} satisfies ColorConfig;
// colors2.secondary is [number, number, number] — can call .map() ✅

const [r, g, b] = colors2.secondary; // TypeScript knows it's a tuple ✅
```

---

## 6. Type-Safe Environment Variables

```typescript
// env.ts — type-safe environment variable access
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]),
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  CORS_ORIGINS: z.string().transform(s => s.split(",")),
});

type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    const errors = result.error.issues
      .map(i => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    
    throw new Error(`Invalid environment variables:\n${errors}`);
  }
  
  return result.data;
}

// Singleton — fails fast at startup
export const env = loadEnv();

// Usage — fully typed, no process.env.X casting
const server = createServer({ port: env.PORT }); // number ✅
if (env.NODE_ENV === "production") {             // literal union ✅
  enableSecureHeaders();
}
```

---

## 7. Discriminated Unions with Exhaustive Checks

```typescript
type ApiResult<T> =
  | { status: "success"; data: T; requestId: string }
  | { status: "error"; error: string; code: number; requestId: string }
  | { status: "loading" }
  | { status: "idle" };

// Exhaustive switch with never check
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

function renderResult<T>(result: ApiResult<T>, render: (data: T) => string): string {
  switch (result.status) {
    case "success":
      return render(result.data);
    case "error":
      return `Error ${result.code}: ${result.error}`;
    case "loading":
      return "Loading...";
    case "idle":
      return "";
    default:
      // TypeScript error if a case is missed — never reached at runtime
      return assertNever(result);
  }
}

// Type narrowing in React
function UserProfile({ result }: { result: ApiResult<User> }) {
  if (result.status === "loading") return <Spinner />;
  if (result.status === "idle") return null;
  if (result.status === "error") {
    return <ErrorBanner code={result.code} message={result.error} />;
  }
  // TypeScript knows result.status === "success" here
  return <div>{result.data.name}</div>; // result.data is User ✅
}
```

---

## TypeScript Config for 2026

The strictest, most productive `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    
    // Strictness
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    
    // Quality
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    
    // Modern
    "experimentalDecorators": false,
    "useDefineForClassFields": true,
    "verbatimModuleSyntax": true
  }
}
```

Enable `noUncheckedIndexedAccess` — it will catch dozens of bugs in existing code.

---

## Conclusion

TypeScript 5.x's advanced features aren't academic exercises — they solve real problems:

- **Decorators** → DI, caching, retries without boilerplate
- **Template literals** → Type-safe routing, SQL, CSS-in-TS
- **`const` type params** → Preserve literals through generic functions
- **Variadic tuples** → Type-safe pipelines and function composition
- **`satisfies`** → Validate without losing specificity
- **Discriminated unions** → Exhaustive error handling

The goal isn't to write the cleverest types — it's to catch bugs at compile time that would otherwise cause production incidents. Use these patterns judiciously, and your codebase will be both safer and more expressive.

---

*Photo by [Florian Olivo](https://unsplash.com/@florianolivo) on Unsplash*
