---
layout: post
title: "Next.js 15 App Router: Complete 2026 Guide"
subtitle: Master Next.js App Router with Server Components, Server Actions, and modern patterns
categories: development
tags: nextjs react typescript frontend
comments: true
---

# Next.js 15 App Router: Complete 2026 Guide

Next.js 15 with the App Router represents the future of React development. This guide covers everything you need to build production-ready applications with modern patterns and best practices.

## Why Next.js App Router?

- **React Server Components** - Reduced client-side JavaScript
- **Server Actions** - Type-safe server mutations
- **Streaming** - Progressive rendering
- **Partial Prerendering** - Best of static and dynamic
- **Built-in caching** - Intelligent request deduplication

## Project Setup

```bash
# Create new project
npx create-next-app@latest my-app --typescript --tailwind --eslint --app

# Project structure
my-app/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   ├── not-found.tsx
│   ├── globals.css
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   └── api/
│       └── [...route]/
│           └── route.ts
├── components/
│   ├── ui/
│   └── forms/
├── lib/
│   ├── actions/
│   ├── db/
│   └── utils/
├── types/
└── public/
```

## Routing Fundamentals

### Basic Page

```typescript
// app/page.tsx
export default function HomePage() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-4xl font-bold">Welcome to Next.js 15</h1>
    </main>
  );
}
```

### Dynamic Routes

```typescript
// app/blog/[slug]/page.tsx
interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogPost({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}

// Generate static params
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

// Metadata
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      images: [post.image],
    },
  };
}
```

### Route Groups

```typescript
// app/(marketing)/layout.tsx - Marketing layout
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-layout">
      <header>Marketing Header</header>
      {children}
      <footer>Marketing Footer</footer>
    </div>
  );
}

// app/(dashboard)/layout.tsx - Dashboard layout
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

### Parallel Routes

```typescript
// app/@modal/(.)photos/[id]/page.tsx
// Intercepting route for modal

export default async function PhotoModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const photo = await getPhoto(id);

  return (
    <div className="modal">
      <img src={photo.url} alt={photo.title} />
    </div>
  );
}

// app/layout.tsx
export default function Layout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html>
      <body>
        {children}
        {modal}
      </body>
    </html>
  );
}
```

## Server Components

### Data Fetching

```typescript
// app/users/page.tsx
// Server Component - fetches data on server
async function getUsers() {
  const res = await fetch('https://api.example.com/users', {
    next: { revalidate: 3600 }, // Revalidate every hour
  });
  return res.json();
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Streaming with Suspense

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Suspense fallback={<CardSkeleton />}>
        <RevenueCard />
      </Suspense>
      <Suspense fallback={<CardSkeleton />}>
        <UsersCard />
      </Suspense>
      <Suspense fallback={<CardSkeleton />}>
        <OrdersCard />
      </Suspense>
    </div>
  );
}

// Each component fetches its own data
async function RevenueCard() {
  const revenue = await getRevenue();
  return <Card title="Revenue" value={revenue} />;
}
```

### Loading UI

```typescript
// app/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  );
}
```

## Server Actions

### Basic Actions

```typescript
// lib/actions/user-actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

export type ActionState = {
  errors?: {
    name?: string[];
    email?: string[];
  };
  message?: string;
};

export async function createUser(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Validate
  const validatedFields = CreateUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Validation failed',
    };
  }

  try {
    await db.user.create({
      data: validatedFields.data,
    });
  } catch (error) {
    return { message: 'Failed to create user' };
  }

  revalidatePath('/users');
  redirect('/users');
}

export async function deleteUser(id: string) {
  await db.user.delete({ where: { id } });
  revalidatePath('/users');
}
```

### Form with useActionState

```typescript
// components/forms/user-form.tsx
'use client';

import { useActionState } from 'react';
import { createUser, ActionState } from '@/lib/actions/user-actions';

const initialState: ActionState = {};

export function UserForm() {
  const [state, formAction, pending] = useActionState(createUser, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="border rounded px-3 py-2 w-full"
          aria-describedby="name-error"
        />
        {state.errors?.name && (
          <p id="name-error" className="text-red-500 text-sm">
            {state.errors.name[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="border rounded px-3 py-2 w-full"
          aria-describedby="email-error"
        />
        {state.errors?.email && (
          <p id="email-error" className="text-red-500 text-sm">
            {state.errors.email[0]}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {pending ? 'Creating...' : 'Create User'}
      </button>

      {state.message && <p className="text-red-500">{state.message}</p>}
    </form>
  );
}
```

### Optimistic Updates

```typescript
// components/todo-list.tsx
'use client';

import { useOptimistic } from 'react';
import { addTodo } from '@/lib/actions/todo-actions';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo: string) => [
      ...state,
      { id: 'temp', text: newTodo, completed: false },
    ]
  );

  async function handleSubmit(formData: FormData) {
    const text = formData.get('text') as string;
    addOptimisticTodo(text);
    await addTodo(text);
  }

  return (
    <div>
      <form action={handleSubmit}>
        <input name="text" placeholder="Add todo..." />
        <button type="submit">Add</button>
      </form>

      <ul>
        {optimisticTodos.map((todo) => (
          <li key={todo.id} className={todo.id === 'temp' ? 'opacity-50' : ''}>
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Caching and Revalidation

### Fetch Cache Options

```typescript
// Force cache (default for GET in Server Components)
const data = await fetch(url);

// No cache
const data = await fetch(url, { cache: 'no-store' });

// Time-based revalidation
const data = await fetch(url, { next: { revalidate: 3600 } });

// Tag-based revalidation
const data = await fetch(url, { next: { tags: ['posts'] } });

// Revalidate in Server Action
import { revalidateTag } from 'next/cache';
revalidateTag('posts');
```

### Route Segment Config

```typescript
// app/api/data/route.ts
export const dynamic = 'force-dynamic'; // Always dynamic
export const revalidate = 60; // Revalidate every 60 seconds
export const fetchCache = 'force-no-store'; // Disable fetch cache
```

## Authentication

### Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isProtectedPage = request.nextUrl.pathname.startsWith('/dashboard');

  if (isProtectedPage && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
```

### Auth with Server Actions

```typescript
// lib/actions/auth-actions.ts
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSession, verifyCredentials } from '@/lib/auth';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function login(prevState: any, formData: FormData) {
  const validatedFields = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return { error: 'Invalid credentials' };
  }

  const user = await verifyCredentials(
    validatedFields.data.email,
    validatedFields.data.password
  );

  if (!user) {
    return { error: 'Invalid email or password' };
  }

  const session = await createSession(user.id);
  
  (await cookies()).set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  redirect('/dashboard');
}

export async function logout() {
  (await cookies()).delete('session');
  redirect('/login');
}
```

## API Routes

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  const users = await db.user.findMany({
    skip: (page - 1) * limit,
    take: limit,
  });

  return NextResponse.json(users);
}

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateUserSchema.parse(body);

    const user = await db.user.create({
      data: validated,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id } });

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(user);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.user.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
```

## Error Handling

```typescript
// app/error.tsx
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <button
        onClick={() => reset()}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Try again
      </button>
    </div>
  );
}
```

```typescript
// app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-4xl font-bold mb-4">404</h2>
      <p className="mb-4">Page not found</p>
      <Link href="/" className="text-blue-500 hover:underline">
        Go home
      </Link>
    </div>
  );
}
```

## Performance Optimization

### Image Optimization

```typescript
import Image from 'next/image';

export function Hero() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero"
      width={1920}
      height={1080}
      priority // Load immediately
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  );
}
```

### Script Loading

```typescript
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Script
          src="https://analytics.example.com/script.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
```

## Testing

```typescript
// __tests__/page.test.tsx
import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';

describe('HomePage', () => {
  it('renders heading', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
```

## Conclusion

Next.js 15 with App Router provides a powerful foundation for building modern web applications. Server Components, Server Actions, and built-in caching make it easier than ever to create fast, scalable applications.

Key takeaways:
- Use Server Components by default
- Leverage Server Actions for mutations
- Implement proper loading and error states
- Use route groups for organization
- Cache strategically

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [Vercel Deployment](https://vercel.com/docs)
