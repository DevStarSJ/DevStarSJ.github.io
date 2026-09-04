---
layout: post
title: "Edge AI in 2026: Running LLMs and Vision Models On-Device"
subtitle: "How to deploy quantized models, manage memory constraints, and build responsive AI features that work without a cloud API call"
date: 2026-02-21
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200"
catalog: true
tags:
  - Edge AI
  - On-Device AI
  - Machine Learning
  - Mobile AI
  - Quantization
categories: ai
---

# Edge AI in 2026: Running LLMs and Vision Models On-Device

Two years ago, running a capable language model on a phone or laptop without internet felt like a research project. Today it's a product decision. Apple Neural Engine, Qualcomm Hexagon NPU, MediaTek APU, and consumer GPUs have collectively made on-device AI not just feasible, but often preferable.

This post covers what's actually possible on edge hardware in 2026, how to quantize and deploy models effectively, and when to choose edge inference over cloud APIs.

![Computer chip close-up with circuit board background](https://images.unsplash.com/photo-1518770660439-4636190af475?w=800)
*Photo by [Alexandre Debiève](https://unsplash.com/@alexkixa) on Unsplash*

---

## Why Edge AI? The Real Reasons

The pitch usually leads with privacy. That matters, but it's rarely the primary driver. Here's what actually moves the needle:

**Latency** — A local 7B model can respond in 200–400ms on a modern laptop. A cloud API call to the same quality model is 600–1200ms just for the first token, before streaming. For interactive features (autocomplete, real-time translation, live video analysis), local wins.

**Reliability** — No network = no outage. Apps that work on a plane, in a tunnel, in countries with restricted API access, or simply during a cloud provider incident are genuinely better products.

**Cost at scale** — At millions of inferences per day, the difference between $0.001/inference (cloud) and $0.000003/inference (amortized device compute) is significant.

**Privacy as a feature** — Medical, legal, and enterprise applications where data literally cannot leave the device. This is a regulatory requirement, not just a preference.

---

## The Hardware Landscape (2026 Edition)

### Mobile
- **Apple A18 Pro** — 38 TOPS, 8GB unified memory shared with the Neural Engine. Handles 3B–7B models well; 13B is possible with aggressive quantization.
- **Qualcomm Snapdragon 8 Elite** — 45 TOPS NPU, 12GB LPDDR5X. The Android flagship benchmark; runs 7B models at 20+ tokens/sec.
- **Samsung Exynos 2600** — 38 TOPS, NPU specialized for on-device LLM inference with hardware int4 support.

### Desktop / Laptop
- **Apple M4 Max** — 120GB unified memory, 38.5 TOPS. Can run 70B models quantized to 4-bit comfortably. The current gold standard for CPU-based LLM inference.
- **NVIDIA RTX 5090** — 32GB GDDR7. Full-precision 30B models, or 70B at int4. Fast prefill, ideal for developer workflows.
- **AMD RX 9900 XT** — 24GB, competitive for inference with ROCm maturation.

### Embedded / IoT
- **NVIDIA Jetson Orin NX** — 16GB, 100 TOPS. The standard for edge robotics, industrial vision.
- **Raspberry Pi 5 + AI HAT+** — 26 TOPS for vision workloads. Genuinely useful for object detection and classification at the edge.

---

## Model Selection and Quantization

The key equation: **model capability × memory footprint × inference speed**.

### Choosing Model Size

| Use Case | Recommended Size | Notes |
|----------|-----------------|-------|
| Text autocomplete | 1–3B | Sub-100ms latency |
| Chat / Q&A | 7B | Best capability/cost ratio |
| Code completion | 7–13B | Needs strong reasoning |
| Complex reasoning | 30–70B | Desktop/server edge only |
| Vision + text | 3–7B VLM | Higher memory due to vision encoder |

### Quantization Methods

**GGUF / llama.cpp** is the standard for CPU inference:

```bash
# Convert a HuggingFace model to GGUF Q4_K_M (recommended quality/speed balance)
python convert_hf_to_gguf.py ./models/llama-3.2-7b --outfile llama-3.2-7b-Q4_K_M.gguf --outtype q4_K_M

# Benchmark on your hardware
./llama-bench -m llama-3.2-7b-Q4_K_M.gguf -p 512 -n 128
```

**GGUF quantization tiers:**

| Format | Size (7B) | Quality Loss | Use When |
|--------|-----------|--------------|----------|
| Q8_0 | ~7GB | Negligible | You have RAM to spare |
| Q4_K_M | ~4.1GB | Very low | Best general choice |
| Q3_K_M | ~3.1GB | Low | RAM-constrained |
| Q2_K | ~2.7GB | Noticeable | Last resort |

**For mobile (iOS/Android)**, use Core ML or ONNX + platform-specific runtimes:

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
import coremltools as ct

# Export to Core ML
model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.2-3B")
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3.2-3B")

# Convert with 4-bit palettization
config = ct.OptimizationConfig(
    global_config=ct.optimize.coreml.OpPalettizerConfig(
        mode="kmeans",
        nbits=4,
    )
)
mlmodel = ct.convert(model, compute_units=ct.ComputeUnit.ALL)
mlmodel = ct.optimize.coreml.palettize_weights(mlmodel, config)
mlmodel.save("Llama-3B-4bit.mlpackage")
```

---

## Inference Engines: The Ecosystem

### llama.cpp
The foundation of most CPU/hybrid inference. Supports every major architecture, runs on everything from a Raspberry Pi to a Mac Pro.

```python
from llama_cpp import Llama

llm = Llama(
    model_path="./llama-3.2-7b-Q4_K_M.gguf",
    n_ctx=4096,
    n_gpu_layers=35,      # Offload layers to GPU (Metal/CUDA/Vulkan)
    n_threads=8,
    verbose=False,
)

response = llm.create_chat_completion(
    messages=[{"role": "user", "content": "Explain gradient descent briefly."}],
    max_tokens=256,
    temperature=0.7,
    stream=True,
)

for chunk in response:
    delta = chunk["choices"][0]["delta"].get("content", "")
    print(delta, end="", flush=True)
```

### Ollama
The developer-friendly wrapper around llama.cpp. One-command model management:

```bash
# Pull and run a model
ollama run llama3.2:7b

# Use via OpenAI-compatible API
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama3.2:7b", "messages": [{"role":"user","content":"Hello"}]}'
```

### MLX (Apple Silicon)
Apple's own ML framework, optimized for unified memory. Dramatically faster than llama.cpp on M-series chips for larger models:

```python
from mlx_lm import load, generate

model, tokenizer = load("mlx-community/Llama-3.2-7B-Instruct-4bit")

prompt = "Write a Python function to merge two sorted arrays."
response = generate(
    model,
    tokenizer,
    prompt=prompt,
    max_tokens=512,
    verbose=True,  # Shows tokens/sec
)
```

On M4 Max, MLX routinely achieves 60–80 tokens/sec for 7B models — fast enough to feel instant.

---

## Vision Models at the Edge

Vision Language Models (VLMs) on edge hardware are one of the more exciting 2026 developments. Models like **LLaVA 1.6**, **PaliGemma 2**, and **Qwen2-VL-7B** can analyze images locally.

```python
from llama_cpp import Llama
from llama_cpp.llama_chat_format import MoondreamChatHandler

# Moondream2 is tiny (1.8B) but surprisingly capable for image description
chat_handler = MoondreamChatHandler.from_pretrained(
    repo_id="vikhyatk/moondream2",
    filename="*mmproj*",
)

llm = Llama.from_pretrained(
    repo_id="vikhyatk/moondream2",
    filename="*text-model*",
    chat_handler=chat_handler,
    n_ctx=2048,
)

# Analyze a local image
import base64
with open("product_photo.jpg", "rb") as f:
    image_data = base64.b64encode(f.read()).decode()

result = llm.create_chat_completion(
    messages=[{
        "role": "user",
        "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}},
            {"type": "text", "text": "What defects can you see in this product?"},
        ],
    }]
)
```

This pattern is being deployed in manufacturing quality control, medical imaging (where data cannot leave a facility), and retail inventory systems.

![Smartphone with AI interface displaying real-time vision analysis](https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800)
*Photo by [Priscilla Du Preez](https://unsplash.com/@priscilladupreez) on Unsplash*

---

## Streaming Responses in a Mobile App

Streaming is essential for perceived performance. Even a 15 tokens/sec model feels fast if you start showing output immediately.

### iOS (Swift)

```swift
import LLMFarm  // Or use the official Apple Foundation Models framework

class LocalInferenceManager: ObservableObject {
    @Published var streamingText = ""
    private var model: LLMModel?
    
    func loadModel() async {
        model = try? await LLMModel.load(
            path: Bundle.main.url(forResource: "llama-3b-q4", withExtension: "gguf")!,
            configuration: .init(contextLength: 2048, gpuLayers: 28)
        )
    }
    
    func generate(prompt: String) {
        streamingText = ""
        Task {
            guard let model else { return }
            for try await token in model.generateStream(prompt: prompt) {
                await MainActor.run {
                    streamingText += token
                }
            }
        }
    }
}
```

---

## When NOT to Use Edge AI

Edge AI isn't always the right call. Use cloud when:

- **Model capability outweighs latency** — frontier models (GPT-5, Claude 4) are still significantly smarter than local alternatives for complex reasoning
- **Infrequent inference** — if a user runs a feature once a day, the cold start cost of loading a local model may exceed the API call cost
- **Model updates matter** — cloud models are updated continuously; on-device models need app updates to improve
- **Device is too constrained** — a 2GB RAM Android device with no NPU is not going to run a useful LLM gracefully

---

## The Hybrid Pattern

Most production apps end up with a hybrid approach:

```
Simple/frequent → local model (fast, cheap, private)
Complex/rare   → cloud API (smarter, always fresh)
```

```python
async def smart_completion(
    prompt: str,
    context: dict,
    complexity_score: float,  # 0.0–1.0 estimated by a tiny local classifier
) -> str:
    if complexity_score < 0.4 and len(prompt) < 500:
        # Simple request: use local model
        return await local_llm.generate(prompt)
    else:
        # Complex request: use cloud
        return await cloud_api.generate(prompt, model="claude-4-sonnet")
```

---

## Getting Started Today

1. **Install Ollama** — the fastest path to running a local model: `brew install ollama && ollama run llama3.2`
2. **Benchmark your hardware** — run `llama-bench` to know what model sizes are comfortable on your machine
3. **Choose a runtime** — llama.cpp for flexibility, MLX for Apple Silicon, ONNX Runtime for mobile deployment
4. **Profile memory usage** — on-device memory is precious; measure with `Instruments` (iOS) or `memory_profiler` (Python)

The gap between cloud and edge AI quality is narrowing every quarter. The architecture decisions you make now will determine how quickly you can shift workloads on-device as the models improve.
