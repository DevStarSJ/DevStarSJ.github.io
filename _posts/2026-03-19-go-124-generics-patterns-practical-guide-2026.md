---
layout: post
title: "Go 1.24 Generics Patterns: Writing Reusable, Type-Safe Code Without the Pain"
subtitle: "Practical generics patterns in Go that actually improve code quality — and the anti-patterns to avoid"
date: 2026-03-19 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1600&q=80"
catalog: true
tags:
  - Go
  - Generics
  - Programming
  - Backend
  - Software Design
---

# Go 1.24 Generics Patterns: Writing Reusable, Type-Safe Code Without the Pain

Go's generics, introduced in 1.18, have now had years to mature both in the language and in the Go community's collective wisdom. Go 1.24 brings further refinements to type inference and constraint ergonomics that make generics genuinely pleasant to use.

But Go generics have a learning curve, and the community has accumulated hard-won lessons about when generics improve code and when they make it worse. This post focuses on the practical patterns that work well in real codebases.

![Go programming code](https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&q=80)
*Photo by Ilya Pavlov on Unsplash*

---

## The Golden Rule: Generics for Behavior, Not Data

Before diving into patterns, the most important principle:

> **Use generics when the *algorithm* is the same but the *type* varies. Don't use generics just to avoid `interface{}`.**

Generics are excellent for:
- Container types (collections, queues, trees)
- Functional combinators (map, filter, reduce)
- Protocol/constraint-based algorithms
- Type-safe option patterns

Generics are *not* great for:
- Domain logic that's inherently type-specific
- "I don't know the type yet" — that's still `any` or interfaces
- Performance optimization (the compiler usually handles this)

---

## Pattern 1: Generic Collections

The standard library's `slices` and `maps` packages are the canonical examples:

```go
// A type-safe ordered map that tracks insertion order
package collections

type OrderedMap[K comparable, V any] struct {
    keys   []K
    values map[K]V
}

func NewOrderedMap[K comparable, V any]() *OrderedMap[K, V] {
    return &OrderedMap[K, V]{
        keys:   make([]K, 0),
        values: make(map[K]V),
    }
}

func (m *OrderedMap[K, V]) Set(key K, value V) {
    if _, exists := m.values[key]; !exists {
        m.keys = append(m.keys, key)
    }
    m.values[key] = value
}

func (m *OrderedMap[K, V]) Get(key K) (V, bool) {
    v, ok := m.values[key]
    return v, ok
}

func (m *OrderedMap[K, V]) Keys() []K {
    result := make([]K, len(m.keys))
    copy(result, m.keys)
    return result
}

func (m *OrderedMap[K, V]) ForEach(fn func(key K, value V)) {
    for _, k := range m.keys {
        fn(k, m.values[k])
    }
}

// Usage
config := NewOrderedMap[string, any]()
config.Set("host", "localhost")
config.Set("port", 5432)
config.Set("db", "production")

config.ForEach(func(k string, v any) {
    fmt.Printf("%s = %v\n", k, v)
})
// Outputs in insertion order:
// host = localhost
// port = 5432
// db = production
```

### Generic Stack

```go
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    last := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return last, true
}

func (s *Stack[T]) Peek() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    return s.items[len(s.items)-1], true
}

func (s *Stack[T]) Len() int {
    return len(s.items)
}
```

---

## Pattern 2: Functional Combinators

The `slices` package covers the basics, but you often need more:

```go
package fp

import "golang.org/x/exp/slices"

// Map applies fn to each element
func Map[T, U any](slice []T, fn func(T) U) []U {
    result := make([]U, len(slice))
    for i, v := range slice {
        result[i] = fn(v)
    }
    return result
}

// Filter returns elements matching predicate
func Filter[T any](slice []T, predicate func(T) bool) []T {
    result := make([]T, 0, len(slice)/2)
    for _, v := range slice {
        if predicate(v) {
            result = append(result, v)
        }
    }
    return result
}

// Reduce folds a slice into a single value
func Reduce[T, U any](slice []T, initial U, fn func(U, T) U) U {
    acc := initial
    for _, v := range slice {
        acc = fn(acc, v)
    }
    return acc
}

// GroupBy organizes elements into a map by key function
func GroupBy[T any, K comparable](slice []T, keyFn func(T) K) map[K][]T {
    result := make(map[K][]T)
    for _, v := range slice {
        k := keyFn(v)
        result[k] = append(result[k], v)
    }
    return result
}

// Partition splits into two slices based on predicate
func Partition[T any](slice []T, predicate func(T) bool) ([]T, []T) {
    var matching, notMatching []T
    for _, v := range slice {
        if predicate(v) {
            matching = append(matching, v)
        } else {
            notMatching = append(notMatching, v)
        }
    }
    return matching, notMatching
}
```

Usage example:

```go
type Order struct {
    ID     string
    UserID string
    Amount float64
    Status string
}

orders := []Order{
    {ID: "1", UserID: "u1", Amount: 99.99, Status: "completed"},
    {ID: "2", UserID: "u2", Amount: 149.99, Status: "pending"},
    {ID: "3", UserID: "u1", Amount: 49.99, Status: "completed"},
    {ID: "4", UserID: "u3", Amount: 299.99, Status: "cancelled"},
}

// Group by user
byUser := GroupBy(orders, func(o Order) string { return o.UserID })

// Get completed orders only
completed, _ := Partition(orders, func(o Order) bool {
    return o.Status == "completed"
})

// Sum revenue
totalRevenue := Reduce(completed, 0.0, func(acc float64, o Order) float64 {
    return acc + o.Amount
})
// → 149.98

// Get all order IDs
ids := Map(completed, func(o Order) string { return o.ID })
// → ["1", "3"]
```

---

## Pattern 3: Type-Safe Result / Option Types

Go's idiomatic `value, err` pattern is fine, but sometimes you want to compose operations without deeply nested error checks:

```go
package result

// Result represents either a successful value or an error
type Result[T any] struct {
    value T
    err   error
}

func Ok[T any](value T) Result[T] {
    return Result[T]{value: value}
}

func Err[T any](err error) Result[T] {
    return Result[T]{err: err}
}

func (r Result[T]) IsOk() bool {
    return r.err == nil
}

func (r Result[T]) Unwrap() T {
    if r.err != nil {
        panic(fmt.Sprintf("called Unwrap on error result: %v", r.err))
    }
    return r.value
}

func (r Result[T]) UnwrapOr(fallback T) T {
    if r.err != nil {
        return fallback
    }
    return r.value
}

func (r Result[T]) Error() error {
    return r.err
}

// Map transforms the value if Ok, passes through Err
func Map[T, U any](r Result[T], fn func(T) U) Result[U] {
    if r.err != nil {
        return Err[U](r.err)
    }
    return Ok(fn(r.value))
}

// FlatMap chains results (monadic bind)
func FlatMap[T, U any](r Result[T], fn func(T) Result[U]) Result[U] {
    if r.err != nil {
        return Err[U](r.err)
    }
    return fn(r.value)
}
```

Usage:

```go
func parseUserID(s string) Result[int] {
    id, err := strconv.Atoi(s)
    if err != nil {
        return result.Err[int](fmt.Errorf("invalid user ID %q: %w", s, err))
    }
    if id <= 0 {
        return result.Err[int](fmt.Errorf("user ID must be positive, got %d", id))
    }
    return result.Ok(id)
}

func fetchUser(id int) Result[User] {
    user, err := db.GetUser(ctx, id)
    if err != nil {
        return result.Err[User](err)
    }
    return result.Ok(user)
}

// Chain operations without nested error checks
userResult := result.FlatMap(
    parseUserID(rawInput),
    fetchUser,
)

if userResult.IsOk() {
    fmt.Printf("Welcome, %s!\n", userResult.Unwrap().Name)
} else {
    log.Printf("Error: %v", userResult.Error())
}
```

---

## Pattern 4: Generic Repository Pattern

A database access pattern that eliminates boilerplate:

```go
package repository

import (
    "context"
    "database/sql"
)

// Entity must implement these methods for the generic repository
type Entity[ID comparable] interface {
    GetID() ID
    TableName() string
}

type Repository[T Entity[ID], ID comparable] struct {
    db      *sql.DB
    scanner func(*sql.Rows) (T, error)
}

func NewRepository[T Entity[ID], ID comparable](
    db *sql.DB,
    scanner func(*sql.Rows) (T, error),
) *Repository[T, ID] {
    return &Repository[T, ID]{db: db, scanner: scanner}
}

func (r *Repository[T, ID]) FindByID(ctx context.Context, id ID) (T, error) {
    var zero T
    
    // We need a concrete instance to get the table name
    // This is one limitation of Go generics
    query := fmt.Sprintf("SELECT * FROM %s WHERE id = $1", zero.TableName())
    
    rows, err := r.db.QueryContext(ctx, query, id)
    if err != nil {
        return zero, fmt.Errorf("query failed: %w", err)
    }
    defer rows.Close()
    
    if !rows.Next() {
        return zero, sql.ErrNoRows
    }
    
    return r.scanner(rows)
}

func (r *Repository[T, ID]) FindAll(ctx context.Context, limit, offset int) ([]T, error) {
    var zero T
    query := fmt.Sprintf(
        "SELECT * FROM %s ORDER BY id LIMIT $1 OFFSET $2",
        zero.TableName(),
    )
    
    rows, err := r.db.QueryContext(ctx, query, limit, offset)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var results []T
    for rows.Next() {
        item, err := r.scanner(rows)
        if err != nil {
            return nil, err
        }
        results = append(results, item)
    }
    return results, rows.Err()
}
```

---

## Pattern 5: Constraints and Type Sets

Go 1.24 improves constraint ergonomics. Here are useful constraint patterns:

```go
package constraints

import "golang.org/x/exp/constraints"

// Numeric covers all numeric types
type Numeric interface {
    constraints.Integer | constraints.Float
}

// Ordered covers types that support <, >, ==
type Ordered = constraints.Ordered

// Summable can be summed
type Summable interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64 |
    ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 |
    ~float32 | ~float64 |
    ~string  // String concatenation!
}

// Generic sum function
func Sum[T Summable](values []T) T {
    var total T
    for _, v := range values {
        total += v
    }
    return total
}

// Generic min/max
func Min[T Ordered](a, b T) T {
    if a < b {
        return a
    }
    return b
}

func Max[T Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}

// Clamp constrains a value to [lo, hi]
func Clamp[T Ordered](value, lo, hi T) T {
    return Max(lo, Min(value, hi))
}

// Usage
prices := []float64{9.99, 24.99, 4.99, 14.99}
total := Sum(prices)             // 54.96

tags := []string{"go", "generics", "2026"}
concat := Sum(tags)              // "gogenerics2026" 

clampedScore := Clamp(150, 0, 100)  // 100
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Generic Everything

```go
// BAD: Gratuitous generics
func GetName[T interface{ GetName() string }](v T) string {
    return v.GetName()
}

// GOOD: Just use the interface
func GetName(v interface{ GetName() string }) string {
    return v.GetName()
}
```

### Anti-Pattern 2: Type Assertions in Generic Code

```go
// BAD: You've defeated the purpose of generics
func Process[T any](value T) {
    switch v := any(value).(type) {  // ← type assertion defeats generics
    case string:
        processString(v)
    case int:
        processInt(v)
    }
}

// GOOD: Use interfaces or separate functions
func ProcessString(value string) { ... }
func ProcessInt(value int) { ... }
```

### Anti-Pattern 3: Over-Constraining

```go
// BAD: Constraint is too specific, limits reuse
type OnlyMyTypes interface {
    User | Product | Order
}

// GOOD: Constrain by behavior, not concrete type
type Identifiable interface {
    GetID() string
}
```

---

## Performance: When Do Generics Cost You?

Go generics compile to either dictionary-based dispatch (similar to interface dispatch) or GCShape stenciling (similar to C++ templates). The compiler chooses based on the type.

```go
// Benchmark: generic vs type-specific
func BenchmarkGenericSum(b *testing.B) {
    data := make([]int64, 10000)
    for i := range data {
        data[i] = int64(i)
    }
    
    b.Run("generic", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            Sum(data)  // generic function
        }
    })
    
    b.Run("specific", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            SumInt64(data)  // type-specific function
        }
    })
}

// Typical result: generic and specific are within 1-2% for primitive types
// The compiler generates specialized code for common GCShapes
```

For most code, generic and type-specific performance is identical. Profile before optimizing.

---

## Conclusion

Go generics have found their niche: container types, functional combinators, and constraint-based algorithms. The patterns in this post represent battle-tested approaches that improve type safety without sacrificing Go's characteristic simplicity.

The key is restraint. Not every function needs to be generic. Start with concrete types, extract generic abstractions only when you have two or more callers with different types, and always ask: "does the generic version make this clearer or more obscure?"

When used well, Go generics are a powerful tool. When overused, they produce code that looks like Java circa 2008. The community has learned to tell the difference.

Go 1.24's improvements to type inference and constraint ergonomics make the good patterns easier and the bad patterns rarer. It's a good time to revisit generics if you found earlier versions frustrating.
