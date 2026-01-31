---
layout: post
title: "Python AsyncIO Complete Tutorial: Mastering Asynchronous Programming"
subtitle: Build high-performance concurrent applications with Python's asyncio
categories: development
tags: python
comments: true
---

# Python AsyncIO Complete Tutorial: Mastering Asynchronous Programming

Asynchronous programming has become essential for building high-performance Python applications. This comprehensive guide covers everything from basic concepts to advanced patterns in Python's asyncio library.

## Understanding Async/Await

### The Basics

```python
import asyncio

async def hello():
    print("Hello")
    await asyncio.sleep(1)  # Non-blocking sleep
    print("World")

# Running the coroutine
asyncio.run(hello())
```

### Coroutines vs Regular Functions

```python
# Regular function - blocks the entire program
import time

def sync_task():
    time.sleep(2)
    return "Done"

# Coroutine - yields control during await
async def async_task():
    await asyncio.sleep(2)
    return "Done"
```

## Running Multiple Coroutines

### asyncio.gather()

```python
import asyncio

async def fetch_data(name: str, delay: float) -> dict:
    print(f"Fetching {name}...")
    await asyncio.sleep(delay)
    return {"name": name, "data": f"Data from {name}"}

async def main():
    # Run multiple coroutines concurrently
    results = await asyncio.gather(
        fetch_data("API 1", 2),
        fetch_data("API 2", 1),
        fetch_data("API 3", 3),
    )
    
    for result in results:
        print(result)

asyncio.run(main())
# Total time: ~3 seconds (not 6 seconds)
```

### asyncio.create_task()

```python
async def main():
    # Create tasks for concurrent execution
    task1 = asyncio.create_task(fetch_data("API 1", 2))
    task2 = asyncio.create_task(fetch_data("API 2", 1))
    
    # Do other work while tasks run
    print("Tasks are running...")
    
    # Wait for results when needed
    result1 = await task1
    result2 = await task2
    
    print(result1, result2)

asyncio.run(main())
```

### TaskGroup (Python 3.11+)

```python
async def main():
    async with asyncio.TaskGroup() as tg:
        task1 = tg.create_task(fetch_data("API 1", 2))
        task2 = tg.create_task(fetch_data("API 2", 1))
        task3 = tg.create_task(fetch_data("API 3", 3))
    
    # All tasks completed here
    print(task1.result())
    print(task2.result())
    print(task3.result())

asyncio.run(main())
```

## Error Handling

### Basic Exception Handling

```python
async def risky_operation():
    await asyncio.sleep(1)
    raise ValueError("Something went wrong!")

async def main():
    try:
        await risky_operation()
    except ValueError as e:
        print(f"Caught error: {e}")

asyncio.run(main())
```

### Handling Errors in gather()

```python
async def might_fail(n: int):
    await asyncio.sleep(1)
    if n == 2:
        raise ValueError(f"Task {n} failed!")
    return f"Task {n} succeeded"

async def main():
    # return_exceptions=True prevents one failure from canceling others
    results = await asyncio.gather(
        might_fail(1),
        might_fail(2),
        might_fail(3),
        return_exceptions=True
    )
    
    for result in results:
        if isinstance(result, Exception):
            print(f"Error: {result}")
        else:
            print(f"Success: {result}")

asyncio.run(main())
```

### ExceptionGroup (Python 3.11+)

```python
async def main():
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(might_fail(1))
            tg.create_task(might_fail(2))
            tg.create_task(might_fail(3))
    except* ValueError as eg:
        for exc in eg.exceptions:
            print(f"Caught: {exc}")

asyncio.run(main())
```

## Timeouts and Cancellation

### Using asyncio.timeout()

```python
async def slow_operation():
    await asyncio.sleep(10)
    return "Done"

async def main():
    try:
        async with asyncio.timeout(2):
            result = await slow_operation()
    except TimeoutError:
        print("Operation timed out!")

asyncio.run(main())
```

### wait_for with Timeout

```python
async def main():
    try:
        result = await asyncio.wait_for(
            slow_operation(),
            timeout=2.0
        )
    except asyncio.TimeoutError:
        print("Timed out!")

asyncio.run(main())
```

### Cancelling Tasks

```python
async def long_running_task():
    try:
        while True:
            print("Working...")
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        print("Task was cancelled!")
        # Cleanup code here
        raise  # Re-raise to properly cancel

async def main():
    task = asyncio.create_task(long_running_task())
    
    await asyncio.sleep(3)
    task.cancel()
    
    try:
        await task
    except asyncio.CancelledError:
        print("Main: Task cancelled successfully")

asyncio.run(main())
```

## Synchronization Primitives

### asyncio.Lock

```python
class SharedResource:
    def __init__(self):
        self.data = 0
        self.lock = asyncio.Lock()
    
    async def increment(self):
        async with self.lock:
            current = self.data
            await asyncio.sleep(0.1)  # Simulate some work
            self.data = current + 1

async def main():
    resource = SharedResource()
    
    # Without lock, this would have race conditions
    await asyncio.gather(*[
        resource.increment() for _ in range(10)
    ])
    
    print(f"Final value: {resource.data}")  # 10

asyncio.run(main())
```

### asyncio.Semaphore

```python
async def limited_task(semaphore: asyncio.Semaphore, n: int):
    async with semaphore:
        print(f"Task {n} starting")
        await asyncio.sleep(1)
        print(f"Task {n} done")

async def main():
    # Only 3 tasks can run concurrently
    semaphore = asyncio.Semaphore(3)
    
    await asyncio.gather(*[
        limited_task(semaphore, i) for i in range(10)
    ])

asyncio.run(main())
```

### asyncio.Event

```python
async def waiter(event: asyncio.Event, name: str):
    print(f"{name} waiting for event...")
    await event.wait()
    print(f"{name} got the event!")

async def setter(event: asyncio.Event):
    await asyncio.sleep(2)
    print("Setting event!")
    event.set()

async def main():
    event = asyncio.Event()
    
    await asyncio.gather(
        waiter(event, "Task 1"),
        waiter(event, "Task 2"),
        setter(event)
    )

asyncio.run(main())
```

## Queues for Producer-Consumer

```python
async def producer(queue: asyncio.Queue, n: int):
    for i in range(n):
        item = f"item-{i}"
        await queue.put(item)
        print(f"Produced {item}")
        await asyncio.sleep(0.5)
    
    # Signal end of production
    await queue.put(None)

async def consumer(queue: asyncio.Queue, name: str):
    while True:
        item = await queue.get()
        if item is None:
            queue.put_nowait(None)  # Propagate to other consumers
            break
        
        print(f"{name} processing {item}")
        await asyncio.sleep(1)
        queue.task_done()

async def main():
    queue = asyncio.Queue(maxsize=5)
    
    await asyncio.gather(
        producer(queue, 10),
        consumer(queue, "Consumer 1"),
        consumer(queue, "Consumer 2"),
    )

asyncio.run(main())
```

## Real-World Patterns

### HTTP Client with aiohttp

```python
import aiohttp
import asyncio

async def fetch_url(session: aiohttp.ClientSession, url: str) -> dict:
    async with session.get(url) as response:
        return {
            "url": url,
            "status": response.status,
            "data": await response.json()
        }

async def fetch_all(urls: list[str]) -> list[dict]:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        return await asyncio.gather(*tasks)

async def main():
    urls = [
        "https://api.github.com/users/python",
        "https://api.github.com/users/microsoft",
        "https://api.github.com/users/google",
    ]
    
    results = await fetch_all(urls)
    for result in results:
        print(f"{result['url']}: {result['status']}")

asyncio.run(main())
```

### Rate-Limited API Client

```python
import asyncio
from collections import deque
from time import monotonic

class RateLimiter:
    def __init__(self, rate: int, per: float):
        self.rate = rate
        self.per = per
        self.timestamps = deque()
        self.lock = asyncio.Lock()
    
    async def acquire(self):
        async with self.lock:
            now = monotonic()
            
            # Remove old timestamps
            while self.timestamps and now - self.timestamps[0] > self.per:
                self.timestamps.popleft()
            
            if len(self.timestamps) >= self.rate:
                sleep_time = self.per - (now - self.timestamps[0])
                await asyncio.sleep(sleep_time)
                return await self.acquire()
            
            self.timestamps.append(now)

async def rate_limited_fetch(limiter: RateLimiter, url: str):
    await limiter.acquire()
    # Perform actual fetch here
    print(f"Fetching {url}")
    await asyncio.sleep(0.1)

async def main():
    limiter = RateLimiter(rate=5, per=1.0)  # 5 requests per second
    
    urls = [f"https://api.example.com/item/{i}" for i in range(20)]
    await asyncio.gather(*[
        rate_limited_fetch(limiter, url) for url in urls
    ])

asyncio.run(main())
```

### Async Context Manager

```python
class AsyncDatabaseConnection:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.connection = None
    
    async def __aenter__(self):
        print(f"Connecting to {self.connection_string}")
        await asyncio.sleep(0.5)  # Simulate connection
        self.connection = "connected"
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        print("Closing connection")
        await asyncio.sleep(0.1)  # Simulate cleanup
        self.connection = None
        return False  # Don't suppress exceptions
    
    async def query(self, sql: str) -> list:
        await asyncio.sleep(0.1)
        return [{"id": 1, "name": "Test"}]

async def main():
    async with AsyncDatabaseConnection("postgres://localhost/db") as db:
        results = await db.query("SELECT * FROM users")
        print(results)

asyncio.run(main())
```

### Async Iterator

```python
class AsyncPaginator:
    def __init__(self, url: str, page_size: int = 10):
        self.url = url
        self.page_size = page_size
        self.current_page = 0
        self.has_more = True
    
    def __aiter__(self):
        return self
    
    async def __anext__(self):
        if not self.has_more:
            raise StopAsyncIteration
        
        # Simulate API call
        await asyncio.sleep(0.5)
        
        self.current_page += 1
        if self.current_page >= 5:  # Simulate 5 pages
            self.has_more = False
        
        return {
            "page": self.current_page,
            "items": [f"item-{i}" for i in range(self.page_size)]
        }

async def main():
    paginator = AsyncPaginator("https://api.example.com/items")
    
    async for page in paginator:
        print(f"Page {page['page']}: {len(page['items'])} items")

asyncio.run(main())
```

## Testing Async Code

### pytest-asyncio

```python
import pytest

@pytest.mark.asyncio
async def test_async_function():
    result = await async_task()
    assert result == "Done"

@pytest.mark.asyncio
async def test_with_timeout():
    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(slow_operation(), timeout=1.0)

# Fixtures
@pytest.fixture
async def db_connection():
    conn = await create_connection()
    yield conn
    await conn.close()

@pytest.mark.asyncio
async def test_with_fixture(db_connection):
    result = await db_connection.query("SELECT 1")
    assert result is not None
```

## Best Practices

### 1. Use async with for Resources

```python
# ✅ Good
async with aiohttp.ClientSession() as session:
    async with session.get(url) as response:
        data = await response.json()

# ❌ Bad - resource may not be cleaned up
session = aiohttp.ClientSession()
response = await session.get(url)
```

### 2. Avoid Blocking Calls

```python
# ❌ Bad - blocks the event loop
def blocking_io():
    with open("large_file.txt") as f:
        return f.read()

# ✅ Good - run in thread pool
async def non_blocking_io():
    return await asyncio.to_thread(blocking_io)
```

### 3. Use TaskGroup for Structured Concurrency

```python
# ✅ Python 3.11+ preferred pattern
async def main():
    async with asyncio.TaskGroup() as tg:
        tg.create_task(task1())
        tg.create_task(task2())
    # All tasks complete or error here
```

## Conclusion

Python's asyncio provides powerful tools for building concurrent applications. Key takeaways:

1. **Use async/await** for I/O-bound operations
2. **Leverage gather() or TaskGroup** for concurrent execution
3. **Handle cancellation and timeouts** properly
4. **Use synchronization primitives** when sharing state
5. **Run blocking code** in thread pools

## Resources

- [Python asyncio Documentation](https://docs.python.org/3/library/asyncio.html)
- [PEP 492 - Coroutines with async and await syntax](https://peps.python.org/pep-0492/)
- [aiohttp Documentation](https://docs.aiohttp.org/)
