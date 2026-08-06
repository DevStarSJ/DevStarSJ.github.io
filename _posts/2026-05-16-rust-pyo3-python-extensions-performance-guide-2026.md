---
layout: post
title: "Rust for Python Developers: Writing Fast Extensions with PyO3 in 2026"
subtitle: "When Python is too slow, you don't have to rewrite everything—bridge the gap with PyO3 Rust extensions"
date: 2026-05-16 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1600&auto=format&fit=crop"
catalog: true
tags:
  - Rust
  - Python
  - PyO3
  - Performance
  - Systems Programming
  - Backend
---

# Rust for Python Developers: Writing Fast Extensions with PyO3 in 2026

Python is the best language for writing the first version of almost anything. It's also sometimes 100× too slow for the hot path. Rewriting the entire project in Rust is overkill—but rewriting that one bottleneck function? That's PyO3.

This is a practical guide for Python developers who want to selectively accelerate their code with Rust, without becoming Rust experts first.

![Code Editor](https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1200&auto=format&fit=crop)
*Photo by Ilya Pavlov on Unsplash*

## When to Reach for PyO3

Before writing any Rust, profile first:

```python
import cProfile
import pstats

# Find the actual bottleneck
profiler = cProfile.Profile()
profiler.enable()

result = your_slow_function(data)  # Run the thing

profiler.disable()
stats = pstats.Stats(profiler)
stats.sort_stats("cumulative")
stats.print_stats(20)  # Top 20 hotspots
```

Rust is worth it when:
- A function runs millions of times per request
- You're processing large numpy arrays in pure Python loops
- String/byte manipulation at scale (parsers, encoders)
- CPU-bound work that can't be parallelized with Python threads (GIL)

It's NOT worth it for:
- I/O-bound code (async Python or Go handles this fine)
- One-off scripts
- Code that changes every sprint

## Setting Up a PyO3 Project

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install maturin (the build tool for PyO3)
pip install maturin

# Create project structure
maturin new --bindings pyo3 my_fast_lib
cd my_fast_lib
```

Generated structure:
```
my_fast_lib/
├── Cargo.toml
├── pyproject.toml
├── src/
│   └── lib.rs
└── my_fast_lib/
    └── __init__.py
```

### Cargo.toml

```toml
[package]
name = "my_fast_lib"
version = "0.1.0"
edition = "2021"

[lib]
name = "my_fast_lib"
crate-type = ["cdylib"]

[dependencies]
pyo3 = { version = "0.22", features = ["extension-module"] }
rayon = "1.10"         # Parallelism
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[profile.release]
opt-level = 3
lto = true             # Link-time optimization
codegen-units = 1      # Better optimization at cost of compile time
strip = true           # Strip symbols for smaller binary
```

## Your First PyO3 Function

```rust
// src/lib.rs
use pyo3::prelude::*;

/// Count word frequencies in text.
/// This is the docstring that appears in Python's help()
#[pyfunction]
fn word_count(text: &str) -> PyResult<std::collections::HashMap<String, usize>> {
    let mut counts = std::collections::HashMap::new();

    for word in text.split_whitespace() {
        // Normalize: lowercase, strip punctuation
        let normalized: String = word
            .to_lowercase()
            .chars()
            .filter(|c| c.is_alphabetic())
            .collect();

        if !normalized.is_empty() {
            *counts.entry(normalized).or_insert(0) += 1;
        }
    }

    Ok(counts)
}

/// Module definition — name must match lib name in Cargo.toml
#[pymodule]
fn my_fast_lib(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(word_count, m)?)?;
    Ok(())
}
```

```bash
# Development build (fast compile, debug symbols)
maturin develop

# Test it
python -c "import my_fast_lib; print(my_fast_lib.word_count('hello world hello'))"
# {'hello': 2, 'world': 1}
```

## Working with Python Types

PyO3 handles most type conversions automatically, but knowing the mapping prevents surprises:

```rust
use pyo3::prelude::*;
use pyo3::types::{PyList, PyDict, PyBytes};

#[pyfunction]
fn process_records(
    py: Python<'_>,
    records: Vec<std::collections::HashMap<String, PyObject>>,
    threshold: f64,
) -> PyResult<Vec<PyObject>> {
    let mut results = Vec::new();

    for record in records {
        if let Some(score_obj) = record.get("score") {
            let score: f64 = score_obj.extract(py)?;
            if score >= threshold {
                // Rebuild as Python dict to return
                let result = PyDict::new(py);
                result.set_item("score", score)?;
                result.set_item("status", "pass")?;
                results.push(result.into());
            }
        }
    }

    Ok(results)
}
```

### Accepting NumPy Arrays (The Big Win)

```toml
# Cargo.toml — add numpy dependency
[dependencies]
pyo3 = { version = "0.22", features = ["extension-module"] }
numpy = "0.22"
ndarray = "0.15"
```

```rust
use numpy::{PyReadonlyArray1, PyArray1, IntoPyArray};
use ndarray::Array1;
use pyo3::prelude::*;

/// Compute rolling mean — often 10-50× faster than pandas for custom logic
#[pyfunction]
fn rolling_mean<'py>(
    py: Python<'py>,
    data: PyReadonlyArray1<'py, f64>,
    window: usize,
) -> PyResult<Bound<'py, PyArray1<f64>>> {
    let arr = data.as_array();
    let n = arr.len();

    if n < window {
        return Err(pyo3::exceptions::PyValueError::new_err(
            "Data length must be >= window"
        ));
    }

    let mut result = Array1::zeros(n - window + 1);
    let mut sum: f64 = arr.slice(ndarray::s![..window]).sum();

    result[0] = sum / window as f64;

    for i in window..n {
        sum += arr[i] - arr[i - window];
        result[i - window + 1] = sum / window as f64;
    }

    Ok(result.into_pyarray(py))
}
```

```python
import numpy as np
import my_fast_lib
import time

data = np.random.randn(10_000_000)

# Pandas rolling mean
start = time.perf_counter()
result_pandas = pd.Series(data).rolling(window=100).mean().dropna().values
print(f"Pandas: {time.perf_counter() - start:.3f}s")

# Rust rolling mean
start = time.perf_counter()
result_rust = my_fast_lib.rolling_mean(data, 100)
print(f"Rust:   {time.perf_counter() - start:.3f}s")

# Typical output:
# Pandas: 0.241s
# Rust:   0.019s  (~12× faster)
```

## Parallelism with Rayon (Release the GIL)

The Python GIL prevents true CPU parallelism. In Rust, you can release it:

```rust
use pyo3::prelude::*;
use rayon::prelude::*;

#[pyfunction]
fn parallel_process(
    py: Python<'_>,
    items: Vec<String>,
) -> PyResult<Vec<usize>> {
    // Release GIL for the parallel computation
    py.allow_threads(|| {
        items
            .par_iter()                    // Rayon parallel iterator
            .map(|item| expensive_compute(item))
            .collect()
    })
}

fn expensive_compute(s: &str) -> usize {
    // CPU-intensive work (e.g., hashing, parsing, ML inference)
    s.chars()
        .filter(|c| c.is_alphabetic())
        .count()
        // ... more work ...
}
```

## Python Classes from Rust

```rust
use pyo3::prelude::*;
use std::collections::HashMap;

#[pyclass]
struct BloomFilter {
    bits: Vec<bool>,
    size: usize,
    hash_count: usize,
    count: usize,
}

#[pymethods]
impl BloomFilter {
    #[new]
    fn new(expected_items: usize, false_positive_rate: f64) -> Self {
        let size = Self::optimal_size(expected_items, false_positive_rate);
        let hash_count = Self::optimal_hash_count(size, expected_items);
        BloomFilter {
            bits: vec![false; size],
            size,
            hash_count,
            count: 0,
        }
    }

    fn add(&mut self, item: &str) {
        for i in 0..self.hash_count {
            let idx = self.hash(item, i) % self.size;
            self.bits[idx] = true;
        }
        self.count += 1;
    }

    fn contains(&self, item: &str) -> bool {
        (0..self.hash_count).all(|i| {
            let idx = self.hash(item, i) % self.size;
            self.bits[idx]
        })
    }

    #[getter]
    fn item_count(&self) -> usize {
        self.count
    }

    fn __repr__(&self) -> String {
        format!("BloomFilter(items={}, size={})", self.count, self.size)
    }

    // Private helper — not exposed to Python (no #[pymethods] attribute)
    fn hash(&self, item: &str, seed: usize) -> usize {
        use std::hash::{Hash, Hasher, DefaultHasher};
        let mut hasher = DefaultHasher::new();
        item.hash(&mut hasher);
        seed.hash(&mut hasher);
        hasher.finish() as usize
    }

    fn optimal_size(n: usize, p: f64) -> usize {
        (-(n as f64) * p.ln() / (2.0_f64.ln().powi(2))).ceil() as usize
    }

    fn optimal_hash_count(m: usize, n: usize) -> usize {
        ((m as f64 / n as f64) * 2.0_f64.ln()).round() as usize
    }
}
```

```python
from my_fast_lib import BloomFilter

bf = BloomFilter(expected_items=1_000_000, false_positive_rate=0.01)
bf.add("hello")
bf.add("world")

print(bf.contains("hello"))  # True
print(bf.contains("foo"))    # False (usually)
print(repr(bf))               # BloomFilter(items=2, size=9585059)
```

## Publishing to PyPI

```bash
# Build wheels for multiple platforms with maturin
# (GitHub Actions example)
maturin build --release --out dist/

# Or publish directly
maturin publish --username __token__ --password $PYPI_TOKEN
```

For CI, use `maturin build` with cross-compilation targets:

{% raw %}
```yaml
# .github/workflows/release.yml
- uses: PyO3/maturin-action@v1
  with:
    target: ${{ matrix.target }}
    args: --release --out dist -i python3.12 python3.11 python3.10
    sccache: 'true'
    manylinux: auto
```
{% endraw %}

## Conclusion

PyO3 is the most ergonomic path from Python to native performance. The feedback loop is tight—`maturin develop` rebuilds in under 10 seconds for small extensions—and the type system means you catch errors at compile time rather than in production.

The pragmatic workflow: build everything in Python first, profile ruthlessly, then rewrite the 5% of code that does 80% of the compute work. You get Python's development speed and Rust's runtime speed, with the integration boundary kept as thin as possible.

If you're maintaining a Python library that does any significant computation, there's likely a `pip install` drop-in replacement waiting to be written.
