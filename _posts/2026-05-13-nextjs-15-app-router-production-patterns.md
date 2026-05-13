---
layout: post
title: "Next.js 15 App Router in Production: Patterns, Pitfalls, and Performance"
subtitle: "Practical lessons from deploying Next.js 15 at scale — caching strategies, Server Components, and the rendering model demystified"
date: 2026-05-13 12:00:00
author: "Seokjun Lee"
header-img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1600&q=80"
header-mask: 0.4
catalog: true
tags:
  - Next.js
  - React
  - Frontend
  - Performance
  - Web Development
---

Next.js 15 has been in production for over a year now, and the dust has settled on the App Router patterns that actually work. What started as a confusing paradigm shift — "where did getServerSideProps go?" — has matured into a powerful model for building fast, scalable web applications. But the learning curve is real, and the pitfalls are subtle. Here's what I've learned from deploying it at scale.

![Code on screen](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80)
*Photo by [Lukas](https://unsplash.com/@hauntedeyes) on Unsplash*

## The Rendering Model (Finally Explained Clearly)

The biggest source of confusion in the App Router is understanding where and when code executes. There are now four rendering contexts:

| Context | Runs On | When |
|---|---|---|
| Server Component | Server | Request time (or build time) |
| Client Component | Browser | Hydration + interactions |
| Route Handler | Server | API requests |
| Server Action | Server | Form submissions, mutations |

The golden rule: **components are Server Components by default**. You opt into client-side behavior with `"use client"`.

```tsx
// app/products/page.tsx — Server Component (default)
// This runs on the server. You can:
// - await database queries directly
// - access environment variables
// - use Node.js APIs
// You CANNOT:
// - use useState, useEffect
// - attach event handlers
// - access browser APIs

import { db } from "@/lib/db";
import { ProductCard } from "./product-card";

export default async function ProductsPage() {
  // Direct DB call — no API needed!
  const products = await db.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {products.map(p => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
```

```tsx
// app/products/product-card.tsx — Client Component
"use client";  // opt-in to client-side features

import { useState } from "react";
import { addToCart } from "@/actions/cart";

export function ProductCard({ product }) {
  const [loading, setLoading] = useState(false);
  
  return (
    <div>
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button 
        onClick={async () => {
          setLoading(true);
          await addToCart(product.id);
          setLoading(false);
        }}
        disabled={loading}
      >
        {loading ? "Adding..." : "Add to Cart"}
      </button>
    </div>
  );
}
```

## The Caching Hierarchy: Next.js 15's Biggest Change

Next.js 15 overhauled the caching model from version 14. Understanding it is critical for correct behavior.

### The Four Cache Layers

```
Request
  ↓
Router Cache (in-memory, client-side, 30s-5min)
  ↓
Full Route Cache (disk, server-side, static pages)
  ↓  
Data Cache (persistent, per fetch(), opt-in)
  ↓
Request Memoization (per-request deduplication)
```

**The critical change in Next.js 15**: `fetch()` requests are **no longer cached by default**. You must opt-in:

```typescript
// Next.js 14: cached by default (surprised everyone)
const data = await fetch('https://api.example.com/data');

// Next.js 15: NOT cached by default (fixed the surprise)
const data = await fetch('https://api.example.com/data');
// Equivalent to: { cache: 'no-store' }

// To cache, opt-in explicitly:
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 3600 }  // revalidate every hour
});

// Or cache indefinitely (until manually invalidated):
const data = await fetch('https://api.example.com/data', {
  cache: 'force-cache'
});
```

### Route Segment Config

Control caching at the route level:

```typescript
// app/dashboard/page.tsx

// Dynamic page — no caching
export const dynamic = 'force-dynamic';

// Static page — full cache
export const dynamic = 'force-static';

// Revalidate every 60 seconds
export const revalidate = 60;

// Dynamic page that streams
export const dynamic = 'force-dynamic';
export const runtime = 'edge';  // runs at the edge
```

### On-Demand Revalidation

```typescript
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { path, tag, secret } = await request.json();
  
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }
  
  if (path) {
    revalidatePath(path);
  }
  
  if (tag) {
    revalidateTag(tag);
  }
  
  return NextResponse.json({ revalidated: true });
}
```

Tag your fetches, then invalidate by tag from your CMS webhook:

```typescript
const posts = await fetch('https://cms.example.com/posts', {
  next: { 
    tags: ['posts'],
    revalidate: 3600
  }
});

// When a post is published: POST /api/revalidate with { tag: 'posts' }
```

## Streaming and Suspense: The Right Pattern

Streaming is Next.js 15's killer feature for perceived performance. Instead of waiting for all data, stream the page progressively:

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';
import { UserStats } from './user-stats';
import { RecentOrders } from './recent-orders';
import { RevenueChart } from './revenue-chart';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Each Suspense boundary streams independently */}
      <Suspense fallback={<Skeleton className="h-32" />}>
        <UserStats />
      </Suspense>
      
      <Suspense fallback={<Skeleton className="h-32" />}>
        <RevenueChart />
      </Suspense>
      
      <Suspense fallback={<Skeleton className="h-64 col-span-2" />}>
        <RecentOrders />
      </Suspense>
    </div>
  );
}
```

Each component fetches its own data in parallel. The browser renders what's ready immediately, and the rest streams in as it becomes available.

**The anti-pattern**: waterfall fetches in a parent component:

```tsx
// ❌ WRONG: Sequential waterfall
export default async function Dashboard() {
  const user = await getUser();           // Wait 50ms
  const orders = await getOrders(user.id); // Wait 80ms (sequential!)
  const stats = await getStats(user.id);   // Wait 120ms (sequential!)
  // Total: 250ms — bad!
  
  return <div>...</div>;
}

// ✅ CORRECT: Parallel fetches
export default async function Dashboard() {
  const [user, orders, stats] = await Promise.all([
    getUser(),    // These all start at once
    getOrders(),  // Total: ~120ms (slowest one)
    getStats(),
  ]);
  
  return <div>...</div>;
}
```

## Server Actions: Mutations Without APIs

Server Actions let you call server-side functions directly from Client Components without building a REST or GraphQL API:

```typescript
// app/actions/cart.ts
'use server';

import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function addToCart(productId: string) {
  const session = await auth();
  if (!session) throw new Error('Not authenticated');
  
  await db.cartItem.upsert({
    where: {
      userId_productId: {
        userId: session.user.id,
        productId,
      }
    },
    update: { quantity: { increment: 1 } },
    create: { userId: session.user.id, productId, quantity: 1 },
  });
  
  revalidatePath('/cart');
}
```

```tsx
// app/products/[id]/page.tsx
import { addToCart } from '@/actions/cart';

export default function ProductPage({ params }) {
  return (
    <form action={addToCart.bind(null, params.id)}>
      <button type="submit">Add to Cart</button>
    </form>
  );
}
```

This works even with JavaScript disabled — it degrades gracefully to a standard form POST.

## Production Performance Checklist

Things to verify before going to production:

```typescript
// 1. Image optimization — always use next/image
import Image from 'next/image';

// ❌ Don't
<img src="/hero.jpg" width={1200} height={600} />

// ✅ Do
<Image 
  src="/hero.jpg" 
  width={1200} 
  height={600}
  priority  // for above-the-fold images
  alt="Hero image"
/>
```

```typescript
// 2. Font optimization — use next/font
import { Inter } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});
```

```typescript
// 3. Bundle analysis — check your client bundle
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // your config
});

// Run: ANALYZE=true npm run build
```

```typescript
// 4. Parallel route prefetching
// Prefetching happens automatically for <Link> in viewport
// For programmatic navigation:
import { useRouter } from 'next/navigation';

const router = useRouter();
router.prefetch('/dashboard'); // preload on hover/focus
```

## The Edge Runtime: When to Use It

```typescript
// Route that runs at Vercel Edge (low latency, limited APIs)
export const runtime = 'edge';

export async function GET(request: Request) {
  // Cannot use: Node.js APIs, most npm packages
  // Can use: fetch, Response, Request, Crypto, TextEncoder
  
  const geo = request.geo; // Vercel-specific: user's location
  const country = geo?.country ?? 'US';
  
  return Response.json({ country });
}
```

Use edge for: A/B testing, geo-routing, authentication middleware, feature flags. Avoid for: database queries, file I/O, heavy computation.

## Common Pitfalls

```typescript
// ❌ Pitfall 1: Importing server-only code in client components
// This will error at runtime, not build time (without 'server-only' package)
import { db } from '@/lib/db'; // Only works in Server Components

// Fix: Add 'server-only' to prevent accidental imports
// lib/db.ts:
import 'server-only';
export const db = ...;
```

```typescript
// ❌ Pitfall 2: Using cookies/headers in static components
import { cookies } from 'next/headers';

// This makes the route dynamic (can't be statically generated)
const token = cookies().get('token');

// Fix: Move to a Server Action or Route Handler if static is desired
```

```typescript
// ❌ Pitfall 3: Not handling loading states in Server Actions
async function handleSubmit(formData: FormData) {
  'use server';
  // This can take time — the client needs visual feedback
}

// Fix: Use useFormStatus in the Client Component
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  );
}
```

## Conclusion

Next.js 15's App Router rewards teams who take time to understand the rendering model. The initial cognitive load — Server vs Client, caching layers, streaming — pays dividends in applications that are genuinely fast and pleasant to build.

The key mental shift: **data lives with the component that needs it**. No more prop drilling data down from `getServerSideProps`, no more complex server state management. Each component fetches its own data; the framework handles deduplication, caching, and streaming.

Once that clicks, the rest follows naturally.

![Web development](https://images.unsplash.com/photo-1547658719-da2b51169166?w=1200&q=80)
*Photo by [Christopher Gower](https://unsplash.com/@cgower) on Unsplash*

---

*Related: [LLM Fine-Tuning: A Practical Guide](/2026/05/10/llm-fine-tuning-practical-guide-2026/)*
