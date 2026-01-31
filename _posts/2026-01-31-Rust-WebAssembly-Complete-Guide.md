---
layout: post
title: "Rust WebAssembly: Complete Guide to Building High-Performance Web Apps"
subtitle: Learn how to compile Rust to WebAssembly for blazing-fast browser applications
categories: development
tags: rust webassembly wasm performance
comments: true
---

# Rust WebAssembly: Complete Guide to Building High-Performance Web Apps

WebAssembly (Wasm) has revolutionized web development by enabling near-native performance in the browser. Rust, with its zero-cost abstractions and memory safety, is the perfect language for WebAssembly development. This comprehensive guide will teach you everything you need to know.

## Why Rust for WebAssembly?

### Memory Safety Without Garbage Collection

Rust's ownership system eliminates the need for garbage collection, making it ideal for WebAssembly where every byte counts:

```rust
// Rust ensures memory safety at compile time
fn process_data(data: Vec<u8>) -> Vec<u8> {
    data.iter()
        .map(|&x| x * 2)
        .collect()
}
```

### Zero-Cost Abstractions

High-level code compiles to efficient machine code:

```rust
// This iterator chain compiles to optimal assembly
let sum: i32 = numbers
    .iter()
    .filter(|&&x| x > 0)
    .map(|&x| x * x)
    .sum();
```

## Setting Up Your Environment

### Install Required Tools

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WebAssembly target
rustup target add wasm32-unknown-unknown

# Install wasm-pack for easy bundling
cargo install wasm-pack

# Install wasm-bindgen-cli for JS bindings
cargo install wasm-bindgen-cli
```

### Create a New Project

```bash
cargo new --lib wasm-app
cd wasm-app
```

### Configure Cargo.toml

```toml
[package]
name = "wasm-app"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
web-sys = { version = "0.3", features = ["console", "Document", "Element", "Window"] }

[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
```

## Your First WebAssembly Function

### Basic Example

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}
```

### Build and Use

```bash
wasm-pack build --target web
```

```html
<!DOCTYPE html>
<html>
<head>
    <title>Rust Wasm Demo</title>
</head>
<body>
    <script type="module">
        import init, { add, greet } from './pkg/wasm_app.js';
        
        async function run() {
            await init();
            console.log(add(2, 3)); // 5
            console.log(greet("World")); // "Hello, World!"
        }
        run();
    </script>
</body>
</html>
```

## DOM Manipulation

### Accessing the DOM

```rust
use wasm_bindgen::prelude::*;
use web_sys::{Document, Element, Window};

#[wasm_bindgen]
pub fn create_element(tag: &str, content: &str) -> Result<Element, JsValue> {
    let window = web_sys::window().expect("no global window");
    let document = window.document().expect("no document");
    
    let element = document.create_element(tag)?;
    element.set_text_content(Some(content));
    
    Ok(element)
}

#[wasm_bindgen]
pub fn append_to_body(element: &Element) -> Result<(), JsValue> {
    let window = web_sys::window().expect("no global window");
    let document = window.document().expect("no document");
    let body = document.body().expect("no body");
    
    body.append_child(element)?;
    Ok(())
}
```

### Event Handling

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{Event, HtmlButtonElement};

#[wasm_bindgen]
pub fn setup_click_handler(button_id: &str) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();
    let button = document
        .get_element_by_id(button_id)
        .unwrap()
        .dyn_into::<HtmlButtonElement>()?;
    
    let closure = Closure::wrap(Box::new(move |_event: Event| {
        web_sys::console::log_1(&"Button clicked!".into());
    }) as Box<dyn FnMut(_)>);
    
    button.add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())?;
    closure.forget(); // Prevent cleanup
    
    Ok(())
}
```

## Image Processing Example

One of WebAssembly's killer use cases is image processing:

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen::Clamped;

#[wasm_bindgen]
pub fn grayscale(data: Clamped<Vec<u8>>, width: u32, height: u32) -> Clamped<Vec<u8>> {
    let mut result = data.0;
    
    for i in (0..result.len()).step_by(4) {
        let r = result[i] as f32;
        let g = result[i + 1] as f32;
        let b = result[i + 2] as f32;
        
        let gray = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
        
        result[i] = gray;
        result[i + 1] = gray;
        result[i + 2] = gray;
        // Alpha channel unchanged
    }
    
    Clamped(result)
}

#[wasm_bindgen]
pub fn blur(data: Clamped<Vec<u8>>, width: u32, height: u32, radius: u32) -> Clamped<Vec<u8>> {
    let mut result = vec![0u8; data.len()];
    let kernel_size = (radius * 2 + 1) as i32;
    let divisor = (kernel_size * kernel_size) as f32;
    
    for y in 0..height as i32 {
        for x in 0..width as i32 {
            let mut r_sum = 0f32;
            let mut g_sum = 0f32;
            let mut b_sum = 0f32;
            
            for ky in -(radius as i32)..=(radius as i32) {
                for kx in -(radius as i32)..=(radius as i32) {
                    let px = (x + kx).clamp(0, width as i32 - 1) as usize;
                    let py = (y + ky).clamp(0, height as i32 - 1) as usize;
                    let idx = (py * width as usize + px) * 4;
                    
                    r_sum += data[idx] as f32;
                    g_sum += data[idx + 1] as f32;
                    b_sum += data[idx + 2] as f32;
                }
            }
            
            let idx = (y as usize * width as usize + x as usize) * 4;
            result[idx] = (r_sum / divisor) as u8;
            result[idx + 1] = (g_sum / divisor) as u8;
            result[idx + 2] = (b_sum / divisor) as u8;
            result[idx + 3] = data[idx + 3];
        }
    }
    
    Clamped(result)
}
```

## Async/Await in WebAssembly

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, Response};

#[wasm_bindgen]
pub async fn fetch_json(url: &str) -> Result<JsValue, JsValue> {
    let mut opts = RequestInit::new();
    opts.method("GET");
    
    let request = Request::new_with_str_and_init(url, &opts)?;
    
    let window = web_sys::window().unwrap();
    let resp_value = JsFuture::from(window.fetch_with_request(&request)).await?;
    let resp: Response = resp_value.dyn_into()?;
    
    let json = JsFuture::from(resp.json()?).await?;
    Ok(json)
}
```

## Performance Optimization

### Use SIMD for Parallel Processing

```rust
#[cfg(target_feature = "simd128")]
use std::arch::wasm32::*;

#[wasm_bindgen]
pub fn add_vectors_simd(a: &[f32], b: &[f32]) -> Vec<f32> {
    let mut result = vec![0f32; a.len()];
    
    #[cfg(target_feature = "simd128")]
    {
        let chunks = a.len() / 4;
        for i in 0..chunks {
            let idx = i * 4;
            unsafe {
                let va = v128_load(a[idx..].as_ptr() as *const v128);
                let vb = v128_load(b[idx..].as_ptr() as *const v128);
                let vr = f32x4_add(va, vb);
                v128_store(result[idx..].as_mut_ptr() as *mut v128, vr);
            }
        }
    }
    
    result
}
```

### Memory Management

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct ImageProcessor {
    buffer: Vec<u8>,
    width: u32,
    height: u32,
}

#[wasm_bindgen]
impl ImageProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            buffer: vec![0; (width * height * 4) as usize],
            width,
            height,
        }
    }
    
    pub fn buffer_ptr(&self) -> *const u8 {
        self.buffer.as_ptr()
    }
    
    pub fn buffer_len(&self) -> usize {
        self.buffer.len()
    }
    
    pub fn process(&mut self) {
        // In-place processing avoids allocations
        for pixel in self.buffer.chunks_mut(4) {
            let avg = (pixel[0] as u16 + pixel[1] as u16 + pixel[2] as u16) / 3;
            pixel[0] = avg as u8;
            pixel[1] = avg as u8;
            pixel[2] = avg as u8;
        }
    }
}
```

## Integration with React

```javascript
// useWasm.js
import { useState, useEffect } from 'react';

export function useWasm() {
    const [wasm, setWasm] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        async function loadWasm() {
            const wasmModule = await import('./pkg/wasm_app.js');
            await wasmModule.default();
            setWasm(wasmModule);
            setLoading(false);
        }
        loadWasm();
    }, []);
    
    return { wasm, loading };
}

// Component.jsx
function ImageEditor() {
    const { wasm, loading } = useWasm();
    const canvasRef = useRef(null);
    
    const applyGrayscale = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const result = wasm.grayscale(
            imageData.data,
            canvas.width,
            canvas.height
        );
        
        const newImageData = new ImageData(result, canvas.width, canvas.height);
        ctx.putImageData(newImageData, 0, 0);
    };
    
    if (loading) return <div>Loading WebAssembly...</div>;
    
    return (
        <div>
            <canvas ref={canvasRef} />
            <button onClick={applyGrayscale}>Grayscale</button>
        </div>
    );
}
```

## Debugging Tips

### Console Logging

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
    
    #[wasm_bindgen(js_namespace = console)]
    fn error(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format!($($t)*)))
}

#[wasm_bindgen]
pub fn debug_example() {
    console_log!("Debug value: {}", 42);
}
```

### Source Maps

```bash
wasm-pack build --target web --dev
```

## Conclusion

Rust and WebAssembly together provide:

- **Near-native performance** in the browser
- **Memory safety** without garbage collection overhead
- **Seamless JavaScript interop** via wasm-bindgen
- **Growing ecosystem** with web-sys and js-sys

Start with simple functions, then gradually tackle more complex use cases like image processing, cryptography, or game engines. The future of high-performance web development is here.

## Resources

- [Rust and WebAssembly Book](https://rustwasm.github.io/docs/book/)
- [wasm-bindgen Guide](https://rustwasm.github.io/docs/wasm-bindgen/)
- [web-sys Documentation](https://rustwasm.github.io/wasm-bindgen/api/web_sys/)
