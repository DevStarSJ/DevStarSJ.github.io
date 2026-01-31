---
layout: post
title: "React Server Components: Complete Guide to Modern React Architecture"
subtitle: Master RSC for building faster, more efficient React applications
categories: development
tags: react javascript
comments: true
---

# React Server Components: Complete Guide to Modern React Architecture

React Server Components (RSC) represent a paradigm shift in how we build React applications. This comprehensive guide covers everything from basic concepts to advanced patterns for leveraging RSC in production.

## What Are React Server Components?

React Server Components allow you to write components that render on the server, reducing the JavaScript sent to the client while maintaining React's component model.

### Key Benefits

- **Zero client-side JavaScript** for server components
- **Direct database/filesystem access** without APIs
- **Automatic code splitting** at the component level
- **Improved initial page load** performance
- **Better SEO** with server-rendered content

## Server vs Client Components

### Server Components (Default)

```tsx
// app/users/page.tsx (Server Component by default)
import { db } from '@/lib/database';

async function UsersPage() {
  // Direct database access - no API needed
  const users = await db.user.findMany();
  
  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default UsersPage;
```

### Client Components

```tsx
// components/Counter.tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
```

### When to Use Each

| Feature | Server Component | Client Component |
|---------|-----------------|------------------|
| Fetch data | ✅ Direct access | ❌ Needs API |
| Access backend resources | ✅ | ❌ |
| Use hooks (useState, useEffect) | ❌ | ✅ |
| Event handlers | ❌ | ✅ |
| Browser APIs | ❌ | ✅ |
| Reduce bundle size | ✅ | ❌ |

## Data Fetching Patterns

### Async Server Components

```tsx
// app/products/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/products';

interface Props {
  params: { id: string };
}

async function ProductPage({ params }: Props) {
  const product = await getProduct(params.id);
  
  if (!product) {
    notFound();
  }
  
  return (
    <article>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <span>${product.price}</span>
    </article>
  );
}

export default ProductPage;
```

### Parallel Data Fetching

```tsx
// Fetch data in parallel for better performance
async function Dashboard() {
  // Start all fetches simultaneously
  const [user, orders, notifications] = await Promise.all([
    getUser(),
    getOrders(),
    getNotifications()
  ]);
  
  return (
    <div>
      <UserProfile user={user} />
      <OrdersList orders={orders} />
      <NotificationsBadge count={notifications.length} />
    </div>
  );
}
```

### Streaming with Suspense

```tsx
import { Suspense } from 'react';

async function SlowComponent() {
  const data = await fetchSlowData(); // Takes 3 seconds
  return <div>{data}</div>;
}

function Page() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* Fast content renders immediately */}
      <QuickStats />
      
      {/* Slow content streams in when ready */}
      <Suspense fallback={<LoadingSkeleton />}>
        <SlowComponent />
      </Suspense>
    </div>
  );
}
```

## Component Composition Patterns

### Mixing Server and Client Components

```tsx
// Server Component (parent)
// app/page.tsx
import { InteractiveChart } from '@/components/InteractiveChart';
import { getChartData } from '@/lib/analytics';

async function AnalyticsPage() {
  const data = await getChartData();
  
  return (
    <div>
      <h1>Analytics</h1>
      {/* Pass server data to client component */}
      <InteractiveChart data={data} />
    </div>
  );
}
```

```tsx
// Client Component (child)
// components/InteractiveChart.tsx
'use client';

import { useState } from 'react';
import { Chart } from '@/lib/charts';

interface Props {
  data: ChartData[];
}

export function InteractiveChart({ data }: Props) {
  const [selectedRange, setSelectedRange] = useState('7d');
  
  return (
    <div>
      <select 
        value={selectedRange}
        onChange={(e) => setSelectedRange(e.target.value)}
      >
        <option value="7d">7 Days</option>
        <option value="30d">30 Days</option>
        <option value="90d">90 Days</option>
      </select>
      <Chart data={data} range={selectedRange} />
    </div>
  );
}
```

### Children Pattern for Interactivity

```tsx
// Client Component wrapper
// components/Modal.tsx
'use client';

import { useState } from 'react';

export function Modal({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open</button>
      {isOpen && (
        <div className="modal">
          {children} {/* Server component can be passed here */}
          <button onClick={() => setIsOpen(false)}>Close</button>
        </div>
      )}
    </>
  );
}
```

```tsx
// Usage in Server Component
import { Modal } from '@/components/Modal';
import { getProductDetails } from '@/lib/products';

async function ProductPage() {
  const details = await getProductDetails();
  
  return (
    <Modal>
      {/* This is a Server Component rendered inside Client Component */}
      <ProductDetails data={details} />
    </Modal>
  );
}
```

## Server Actions

### Form Handling

```tsx
// app/contact/page.tsx
import { submitContact } from './actions';

function ContactPage() {
  return (
    <form action={submitContact}>
      <input name="email" type="email" required />
      <textarea name="message" required />
      <button type="submit">Send</button>
    </form>
  );
}
```

```tsx
// app/contact/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/database';

export async function submitContact(formData: FormData) {
  const email = formData.get('email') as string;
  const message = formData.get('message') as string;
  
  await db.contact.create({
    data: { email, message }
  });
  
  revalidatePath('/contact');
  redirect('/contact/success');
}
```

### Progressive Enhancement with useFormStatus

```tsx
// components/SubmitButton.tsx
'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  );
}
```

### Optimistic Updates

```tsx
// components/LikeButton.tsx
'use client';

import { useOptimistic } from 'react';
import { likePost } from '@/app/actions';

interface Props {
  postId: string;
  initialLikes: number;
}

export function LikeButton({ postId, initialLikes }: Props) {
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    initialLikes,
    (state, _) => state + 1
  );
  
  async function handleLike() {
    addOptimisticLike(null);
    await likePost(postId);
  }
  
  return (
    <form action={handleLike}>
      <button type="submit">
        ❤️ {optimisticLikes}
      </button>
    </form>
  );
}
```

## Caching Strategies

### Request Memoization

```tsx
// This function is automatically memoized during a request
async function getUser(id: string) {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}

// In a Server Component
async function UserPage() {
  // These calls are deduplicated - only one fetch happens
  const user1 = await getUser('123');
  const user2 = await getUser('123');
  
  return <div>{user1.name}</div>;
}
```

### Data Cache

```tsx
// Cache for 1 hour
async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: { revalidate: 3600 }
  });
  return res.json();
}

// Never cache (always fresh)
async function getCurrentPrice() {
  const res = await fetch('https://api.example.com/price', {
    cache: 'no-store'
  });
  return res.json();
}
```

### Revalidation

```tsx
// app/products/actions.ts
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function updateProduct(id: string, data: ProductData) {
  await db.product.update({ where: { id }, data });
  
  // Revalidate specific path
  revalidatePath(`/products/${id}`);
  
  // Or revalidate by tag
  revalidateTag('products');
}
```

## Error Handling

### Error Boundaries

```tsx
// app/products/error.tsx
'use client';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Not Found Handling

```tsx
// app/products/[id]/page.tsx
import { notFound } from 'next/navigation';

async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  
  if (!product) {
    notFound();
  }
  
  return <ProductDetails product={product} />;
}
```

```tsx
// app/products/[id]/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h2>Product Not Found</h2>
      <p>Could not find the requested product.</p>
    </div>
  );
}
```

## Performance Optimization

### Component-Level Code Splitting

```tsx
import dynamic from 'next/dynamic';

// Only load when needed
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false // Skip SSR for this component
});

function Dashboard() {
  return (
    <div>
      <Stats />
      <HeavyChart />
    </div>
  );
}
```

### Preloading Data

```tsx
import { preload } from 'react-dom';

// Preload critical resources
function ProductPage() {
  preload('/api/recommendations', { as: 'fetch' });
  
  return (
    <div>
      <ProductDetails />
      <Suspense fallback={<Loading />}>
        <Recommendations />
      </Suspense>
    </div>
  );
}
```

## Best Practices

### 1. Keep Client Components Small

```tsx
// ❌ Bad: Large client component
'use client';

export function ProductPage({ product }) {
  const [quantity, setQuantity] = useState(1);
  // Lots of static content...
  return (/* large component */);
}

// ✅ Good: Small client component for interactivity only
// Server Component
function ProductPage({ product }) {
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      {/* Only interactive part is client */}
      <AddToCartButton productId={product.id} />
    </div>
  );
}
```

### 2. Push Client Boundary Down

```tsx
// ✅ Client boundary at the leaf level
function Layout({ children }) {
  return (
    <div>
      <Header /> {/* Server */}
      <Sidebar /> {/* Server */}
      {children}
      <InteractiveFooter /> {/* Client - only what needs to be */}
    </div>
  );
}
```

### 3. Serialize Data at Boundaries

```tsx
// Server Component
async function UserProfile() {
  const user = await getUser();
  
  // Only pass serializable data to client components
  return (
    <ProfileEditor 
      initialData={{
        name: user.name,
        email: user.email,
        // Don't pass: functions, dates (serialize first), symbols
      }}
    />
  );
}
```

## Conclusion

React Server Components fundamentally change how we architect React applications. Key takeaways:

1. **Default to Server Components** - Only add 'use client' when needed
2. **Fetch data in Server Components** - Direct database access, no APIs
3. **Use Suspense for streaming** - Progressive loading improves UX
4. **Push client boundaries down** - Minimize client JavaScript
5. **Leverage Server Actions** - Simplified form handling and mutations

## Resources

- [React Server Components RFC](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [React Documentation](https://react.dev/)
