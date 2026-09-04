---
layout: post
title: "Go 1.24 Generics in Practice: Real Patterns, Performance, and When Not to Use Them"
subtitle: "A pragmatic guide to writing idiomatic generic Go code — from type constraints to generic data structures"
date: 2026-03-30 00:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1580584126903-c17d41830450?w=1200&auto=format&fit=crop&q=80"
catalog: true
tags:
  - Go
  - Golang
  - Generics
  - Backend
  - Performance
---

# Go 1.24 Generics in Practice: Real Patterns, Performance, and When Not to Use Them

Go added generics in 1.18. It's been three years and two major revisions. The community has formed opinions. The `any` type proliferation has been warned against. The over-engineering backlash happened. Now we're at a mature equilibrium: generics are genuinely useful in specific places, and actively harmful in others. Let's look at where the lines are.

![Go Programming](https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1000&auto=format&fit=crop&q=80)
*Photo by [Christopher Gower](https://unsplash.com/@cgower) on Unsplash*

---

## The Basics (Quickly)

If you're already comfortable with generics, skip this section. If not:

```go
// A generic function with a type parameter T constrained to Ordered
func Min[T constraints.Ordered](a, b T) T {
    if a < b {
        return a
    }
    return b
}

// Usage — type is inferred
result := Min(3, 5)        // int
result2 := Min(3.14, 2.71) // float64
result3 := Min("apple", "banana") // string
```

Type parameters go in square brackets. Constraints define what operations `T` supports. `constraints.Ordered` means `T` must support `<`, `>`, `<=`, `>=`.

---

## Constraint Patterns

### Union Constraints

```go
// Constraint: only these types are allowed
type Integer interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64
}

type Float interface {
    ~float32 | ~float64
}

type Number interface {
    Integer | Float
}

func Sum[T Number](nums []T) T {
    var total T
    for _, n := range nums {
        total += n
    }
    return total
}
```

The `~` prefix means "this type or any type whose underlying type is this." `~int` matches `int` and also custom types like `type UserID int`.

### Interface Constraints

```go
type Stringer interface {
    String() string
}

func PrintAll[T Stringer](items []T) {
    for _, item := range items {
        fmt.Println(item.String())
    }
}
```

This is equivalent to `io.Writer`, `sort.Interface`, etc. — just applied to a type parameter.

### Comparable

```go
// T must support == and !=
func Contains[T comparable](slice []T, item T) bool {
    for _, v := range slice {
        if v == item {
            return true
        }
    }
    return false
}
```

`comparable` is a built-in constraint. It's satisfied by all types that support `==`: primitives, structs (if all fields are comparable), pointers, interfaces.

---

## Practical Generic Data Structures

### Generic Stack

```go
package collections

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
    item := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return item, true
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

```go
// Usage
stack := &collections.Stack[int]{}
stack.Push(1)
stack.Push(2)
stack.Push(3)

val, ok := stack.Pop()  // val=3, ok=true
```

### Generic Result Type

Go's multi-return error pattern works well for simple cases, but sometimes you want a container:

```go
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

func (r Result[T]) Unwrap() (T, error) {
    return r.value, r.err
}

func (r Result[T]) IsOk() bool {
    return r.err == nil
}

func (r Result[T]) MapErr(fn func(error) error) Result[T] {
    if r.err != nil {
        return Err[T](fn(r.err))
    }
    return r
}
```

```go
func fetchUser(id string) Result[User] {
    user, err := db.GetUser(id)
    if err != nil {
        return Err[User](fmt.Errorf("fetchUser %s: %w", id, err))
    }
    return Ok(user)
}
```

### Generic Set

```go
type Set[T comparable] map[T]struct{}

func NewSet[T comparable](items ...T) Set[T] {
    s := make(Set[T], len(items))
    for _, item := range items {
        s[item] = struct{}{}
    }
    return s
}

func (s Set[T]) Add(item T) {
    s[item] = struct{}{}
}

func (s Set[T]) Contains(item T) bool {
    _, ok := s[item]
    return ok
}

func (s Set[T]) Remove(item T) {
    delete(s, item)
}

func (s Set[T]) Union(other Set[T]) Set[T] {
    result := NewSet[T]()
    for k := range s {
        result[k] = struct{}{}
    }
    for k := range other {
        result[k] = struct{}{}
    }
    return result
}

func (s Set[T]) Intersection(other Set[T]) Set[T] {
    result := NewSet[T]()
    for k := range s {
        if other.Contains(k) {
            result[k] = struct{}{}
        }
    }
    return result
}
```

---

## Functional Patterns

The `slices` and `maps` packages in stdlib (since 1.21) cover most collection operations. But here's what custom generics look like:

```go
// Map transforms a slice
func Map[T, U any](slice []T, fn func(T) U) []U {
    result := make([]U, len(slice))
    for i, v := range slice {
        result[i] = fn(v)
    }
    return result
}

// Filter returns elements matching predicate
func Filter[T any](slice []T, predicate func(T) bool) []T {
    var result []T
    for _, v := range slice {
        if predicate(v) {
            result = append(result, v)
        }
    }
    return result
}

// Reduce folds a slice to a single value
func Reduce[T, U any](slice []T, initial U, fn func(U, T) U) U {
    acc := initial
    for _, v := range slice {
        acc = fn(acc, v)
    }
    return acc
}

// GroupBy groups elements by a key function
func GroupBy[T any, K comparable](slice []T, key func(T) K) map[K][]T {
    result := make(map[K][]T)
    for _, v := range slice {
        k := key(v)
        result[k] = append(result[k], v)
    }
    return result
}
```

```go
// Example: process order data
orders := []Order{...}

byCustomer := GroupBy(orders, func(o Order) string {
    return o.CustomerID
})

totals := Map(orders, func(o Order) float64 {
    return o.Total
})

total := Reduce(totals, 0.0, func(acc, v float64) float64 {
    return acc + v
})
```

---

## Type-Safe Options Pattern

A common Go pattern is functional options for configuring structs. Generics make this composable:

```go
type Option[T any] func(*T)

func NewServer(opts ...Option[ServerConfig]) *Server {
    cfg := &ServerConfig{
        Port:    8080,
        Timeout: 30 * time.Second,
    }
    for _, opt := range opts {
        opt(cfg)
    }
    return &Server{config: cfg}
}

func WithPort(port int) Option[ServerConfig] {
    return func(cfg *ServerConfig) {
        cfg.Port = port
    }
}

func WithTimeout(d time.Duration) Option[ServerConfig] {
    return func(cfg *ServerConfig) {
        cfg.Timeout = d
    }
}
```

---

## Performance Considerations

Generics in Go are implemented via **GC shapes** (generics stenciling). All pointer types share one instantiation; all 8-byte integer types may share one. This means:

- **Value types** (int, float64, structs): may get separate instantiations → can be as fast as hand-written code.
- **Pointer types**: share an instantiation → comparable to `interface{}` under the hood.
- **Interface constraints**: always use dynamic dispatch → similar to interface{} performance.

Benchmarks (approximate, Go 1.24, arm64):

```
BenchmarkSumInt64_Typed      1000000000    0.82 ns/op  // hand-written
BenchmarkSumInt64_Generic    1000000000    0.85 ns/op  // generic
BenchmarkSumInterface        100000000     11.2 ns/op  // interface{}
```

**Takeaway:** For numeric operations on value types, generics are essentially free. For pointer-heavy workloads, measure before assuming.

---

## When NOT to Use Generics

This is the important part. The Go team's own guideline: **don't use generics just because you can.**

### Don't use generics when...

**You're just wrapping `any`:**
```go
// ❌ Pointless — just use interface{} or any
func Print[T any](v T) {
    fmt.Println(v)
}

// ✅ Just do this
func Print(v any) {
    fmt.Println(v)
}
```

**You have 2-3 concrete types:**
```go
// ❌ Over-engineered
func ToSlice[T int | string](v T) []T { ... }

// ✅ Just write two functions
func IntsToSlice(v int) []int { ... }
func StringsToSlice(v string) []string { ... }
```

**The implementation isn't simpler:**

If writing the generic version is harder to understand than three concrete implementations, write the three implementations. Readability wins.

**You're doing reflection-based serialization:**
Generics don't eliminate the need for reflection for JSON marshaling, ORM mapping, etc. The encoding/json package still uses reflect internally even when you write `json.Unmarshal(data, &result)`.

### The Rob Pike test

Ask: "Would I be writing the same code three times for three different types?" If yes, a generic is probably warranted. If the answer is "I have one type but I want to be prepared for future types," resist.

---

## stdlib Generic Packages (Go 1.21+)

Don't write these yourself:

```go
import (
    "slices"
    "maps"
    "cmp"
)

// Sort any ordered slice
slices.Sort([]int{3, 1, 4, 1, 5})
slices.SortFunc(users, func(a, b User) int {
    return cmp.Compare(a.Name, b.Name)
})

// Search
idx, found := slices.BinarySearch(sorted, target)
idx := slices.Index(slice, elem) // linear search

// Maps
keys := maps.Keys(myMap)    // unordered
vals := maps.Values(myMap)
maps.Copy(dst, src)
maps.DeleteFunc(m, func(k, v int) bool { return v < 0 })
```

These are well-optimized and avoid inventing your own slice utilities.

---

## Summary

Generics shine for:
- **Reusable data structures** (Set, Stack, Queue, Cache, Result)
- **Algorithm abstractions** that work on multiple numeric or ordered types
- **Functional combinators** (Map, Filter, Reduce, GroupBy)
- **Type-safe wrappers** where `any` used to cause runtime errors

They're a poor fit for:
- Single-type use cases
- Cases where `interface{}` or `any` is genuinely fine
- Replacing reflection-based frameworks
- Making code look functional when Go idioms are clearer

The Go ethos remains: prefer simplicity. Generics are a tool, not a style.

---

*Playing with Go generics? Check out the [pkg.go.dev/golang.org/x/exp/slices](https://pkg.go.dev/golang.org/x/exp/slices) page for pre-stdlib experiments that informed the final API.*
