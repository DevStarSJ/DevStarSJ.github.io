---
layout: post
title: "Modern Testing Best Practices: Complete 2026 Guide"
subtitle: Master unit testing, integration testing, and E2E testing for reliable software
categories: development
tags: testing jest pytest playwright ci-cd
comments: true
---

# Modern Testing Best Practices: Complete 2026 Guide

Testing is crucial for delivering reliable software. This guide covers modern testing strategies, tools, and best practices for 2026.

## Testing Pyramid

```
        /\
       /E2E\       ← Few, slow, expensive
      /------\
     /Integration\ ← Some, medium speed
    /--------------\
   /    Unit Tests  \ ← Many, fast, cheap
  /-------------------\
```

## Unit Testing

### JavaScript/TypeScript with Vitest

```typescript
// math.ts
export function add(a: number, b: number): number {
  return a + b;
}

export function divide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}

export async function fetchUserData(userId: string) {
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) throw new Error('User not found');
  return response.json();
}
```

```typescript
// math.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { add, divide, fetchUserData } from './math';

describe('Math functions', () => {
  describe('add', () => {
    it('adds two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('handles negative numbers', () => {
      expect(add(-1, 1)).toBe(0);
    });

    it.each([
      [1, 2, 3],
      [0, 0, 0],
      [-1, -1, -2],
      [1.5, 2.5, 4],
    ])('add(%d, %d) = %d', (a, b, expected) => {
      expect(add(a, b)).toBe(expected);
    });
  });

  describe('divide', () => {
    it('divides two numbers', () => {
      expect(divide(10, 2)).toBe(5);
    });

    it('throws on division by zero', () => {
      expect(() => divide(10, 0)).toThrow('Division by zero');
    });
  });
});

describe('fetchUserData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches user data successfully', async () => {
    const mockUser = { id: '1', name: 'John' };
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUser),
    });

    const result = await fetchUserData('1');
    
    expect(result).toEqual(mockUser);
    expect(fetch).toHaveBeenCalledWith('/api/users/1');
  });

  it('throws when user not found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    });

    await expect(fetchUserData('999')).rejects.toThrow('User not found');
  });
});
```

### Python with pytest

```python
# services.py
from dataclasses import dataclass
from typing import Optional
import httpx

@dataclass
class User:
    id: str
    name: str
    email: str

class UserService:
    def __init__(self, base_url: str = "http://api.example.com"):
        self.base_url = base_url
        self.client = httpx.Client()
    
    def get_user(self, user_id: str) -> Optional[User]:
        response = self.client.get(f"{self.base_url}/users/{user_id}")
        if response.status_code == 404:
            return None
        response.raise_for_status()
        data = response.json()
        return User(**data)
    
    def create_user(self, name: str, email: str) -> User:
        response = self.client.post(
            f"{self.base_url}/users",
            json={"name": name, "email": email}
        )
        response.raise_for_status()
        return User(**response.json())
```

```python
# test_services.py
import pytest
from unittest.mock import Mock, patch
from services import UserService, User

class TestUserService:
    @pytest.fixture
    def service(self):
        return UserService("http://test.api")
    
    @pytest.fixture
    def mock_client(self):
        with patch.object(UserService, 'client', new_callable=Mock) as mock:
            yield mock
    
    def test_get_user_success(self, service, mock_client):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": "1",
            "name": "John",
            "email": "john@example.com"
        }
        mock_client.get.return_value = mock_response
        
        user = service.get_user("1")
        
        assert user.id == "1"
        assert user.name == "John"
        mock_client.get.assert_called_once_with("http://test.api/users/1")
    
    def test_get_user_not_found(self, service, mock_client):
        mock_response = Mock()
        mock_response.status_code = 404
        mock_client.get.return_value = mock_response
        
        user = service.get_user("999")
        
        assert user is None
    
    @pytest.mark.parametrize("name,email", [
        ("John Doe", "john@example.com"),
        ("Jane Doe", "jane@example.com"),
    ])
    def test_create_user(self, service, mock_client, name, email):
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            "id": "new-id",
            "name": name,
            "email": email
        }
        mock_client.post.return_value = mock_response
        
        user = service.create_user(name, email)
        
        assert user.name == name
        assert user.email == email
```

### Testing React Components

```tsx
// components/UserCard.tsx
interface User {
  id: string;
  name: string;
  email: string;
}

interface UserCardProps {
  user: User;
  onDelete?: (id: string) => void;
}

export function UserCard({ user, onDelete }: UserCardProps) {
  return (
    <div data-testid="user-card" className="user-card">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      {onDelete && (
        <button onClick={() => onDelete(user.id)}>Delete</button>
      )}
    </div>
  );
}
```

```tsx
// components/UserCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UserCard } from './UserCard';
import { vi } from 'vitest';

describe('UserCard', () => {
  const mockUser = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
  };

  it('renders user information', () => {
    render(<UserCard user={mockUser} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('does not render delete button when onDelete not provided', () => {
    render(<UserCard user={mockUser} />);

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('renders delete button when onDelete provided', () => {
    render(<UserCard user={mockUser} onDelete={() => {}} />);

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('calls onDelete with user id when delete clicked', () => {
    const handleDelete = vi.fn();
    render(<UserCard user={mockUser} onDelete={handleDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(handleDelete).toHaveBeenCalledWith('1');
    expect(handleDelete).toHaveBeenCalledTimes(1);
  });
});
```

## Integration Testing

### API Integration Tests

```typescript
// tests/integration/users.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/db';

describe('Users API', () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await db('users').truncate();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('POST /api/users', () => {
    it('creates a new user', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(response.body.id).toBeDefined();
    });

    it('returns 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'John Doe',
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.error).toContain('email');
    });

    it('returns 409 for duplicate email', async () => {
      await request(app)
        .post('/api/users')
        .send({ name: 'John', email: 'john@example.com' });

      await request(app)
        .post('/api/users')
        .send({ name: 'Jane', email: 'john@example.com' })
        .expect(409);
    });
  });

  describe('GET /api/users/:id', () => {
    it('returns user by id', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({ name: 'John', email: 'john@example.com' });

      const response = await request(app)
        .get(`/api/users/${createResponse.body.id}`)
        .expect(200);

      expect(response.body.name).toBe('John');
    });

    it('returns 404 for non-existent user', async () => {
      await request(app)
        .get('/api/users/non-existent-id')
        .expect(404);
    });
  });
});
```

### Database Integration Tests (Python)

```python
# tests/integration/test_repositories.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, User
from app.repositories import UserRepository

@pytest.fixture(scope="module")
def engine():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()

@pytest.fixture
def session(engine):
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def user_repo(session):
    return UserRepository(session)

class TestUserRepository:
    def test_create_user(self, user_repo, session):
        user = user_repo.create(
            name="John Doe",
            email="john@example.com"
        )
        
        assert user.id is not None
        assert user.name == "John Doe"
        
        # Verify in database
        db_user = session.query(User).filter_by(id=user.id).first()
        assert db_user is not None
    
    def test_get_by_email(self, user_repo):
        user_repo.create(name="John", email="john@example.com")
        
        found = user_repo.get_by_email("john@example.com")
        
        assert found is not None
        assert found.name == "John"
    
    def test_list_users_pagination(self, user_repo):
        for i in range(25):
            user_repo.create(name=f"User {i}", email=f"user{i}@example.com")
        
        page1 = user_repo.list(limit=10, offset=0)
        page2 = user_repo.list(limit=10, offset=10)
        
        assert len(page1) == 10
        assert len(page2) == 10
        assert page1[0].id != page2[0].id
```

## E2E Testing with Playwright

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('successful login', async ({ page }) => {
    await page.getByRole('link', { name: 'Login' }).click();
    
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  test('failed login shows error', async ({ page }) => {
    await page.getByRole('link', { name: 'Login' }).click();
    
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid credentials')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('logout', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Logout
    await page.getByRole('button', { name: 'Logout' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
  });
});

test.describe('User Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authenticated state
    await page.goto('/login');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();
  });

  test('displays user profile', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile' }).click();

    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
    await expect(page.getByText('user@example.com')).toBeVisible();
  });

  test('updates profile', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile' }).click();
    await page.getByRole('button', { name: 'Edit' }).click();

    await page.getByLabel('Name').fill('New Name');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Profile updated')).toBeVisible();
    await expect(page.getByText('New Name')).toBeVisible();
  });
});
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Test Patterns

### Arrange-Act-Assert

```typescript
it('calculates total price with discount', () => {
  // Arrange
  const items = [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 1 },
  ];
  const discount = 0.1;

  // Act
  const total = calculateTotal(items, discount);

  // Assert
  expect(total).toBe(225); // (200 + 50) * 0.9
});
```

### Test Factories

```typescript
// tests/factories/user.ts
import { faker } from '@faker-js/faker';

export function createUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    createdAt: faker.date.past(),
    ...overrides,
  };
}

// Usage
const user = createUser({ name: 'Custom Name' });
```

### Testing Hooks

```typescript
// hooks/useCounter.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it('initializes with custom value', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

## CI Configuration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v4

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Conclusion

Modern testing requires a balanced approach across unit, integration, and E2E tests. Focus on testing behavior, not implementation, and maintain a healthy test pyramid.

Key takeaways:
- Write unit tests for business logic
- Use integration tests for API boundaries
- Keep E2E tests for critical user journeys
- Mock external dependencies appropriately
- Run tests in CI/CD pipelines

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [pytest Documentation](https://docs.pytest.org/)
