---
layout: post
title: "Inference Optimization: Making LLMs Fast and Cheap Enough for Production"
subtitle: "Quantization, speculative decoding, KV cache optimization, and batching strategies that actually move the needle"
date: 2026-06-30 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80"
catalog: true
tags:
  - AI
  - LLM
  - Inference
  - Performance
  - MLOps
categories: ai
---

# Inference Optimization: Making LLMs Fast and Cheap Enough for Production

Everyone talks about training large language models. The unsexy truth is that **inference is where the money goes**. A model that costs $10M to train might cost $50M/year to serve at scale. Inference optimization is the difference between a viable product and a money pit.

This post covers the techniques that matter most in 2026 — not the research paper versions, but the practical implementations that engineers are shipping in production today.

![GPU server infrastructure](https://images.unsplash.com/photo-1601737487795-dab272f52420?w=900&q=80)
*Photo by [Lars Kienle](https://unsplash.com/@larskienle) on Unsplash*

---

## The Inference Cost Stack

Before optimizing, know what you're actually paying for:

```
User Request
    ↓
Tokenization (~0ms)
    ↓
Prefill Phase: Process input tokens in parallel
    - Cost: O(n²) attention, expensive for long prompts
    ↓
Decode Phase: Generate output tokens one-by-one
    - Cost: O(n) per token, memory bandwidth bound
    ↓
Response
```

The key insight: **prefill is compute-bound, decode is memory-bandwidth bound**. Different optimizations target different phases.

---

## Quantization: The First Lever

Quantization reduces model weight precision. Most models train in BF16 (2 bytes/weight). You can serve in INT8, INT4, or even lower.

### INT8 (W8A16)

- Weights stored in INT8, activations stay in FP16
- ~2x memory reduction, <1% quality degradation on most tasks
- Widely supported via `bitsandbytes`, `llm.int8()`, `GPTQ`

```python
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

bnb_config = BitsAndBytesConfig(
    load_in_8bit=True,
    llm_int8_threshold=6.0,
    llm_int8_skip_modules=["lm_head"],  # Keep output layer precise
)

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-4-Scout-17B",
    quantization_config=bnb_config,
    device_map="auto",
)
```

### INT4 (AWQ / GPTQ)

- ~4x memory reduction vs BF16
- 1–3% quality degradation depending on task
- AWQ (Activation-Aware Weight Quantization) is generally better than GPTQ on reasoning tasks
- Enables running 70B models on consumer-grade 4x24GB GPU setups

### FP8 (NVIDIA H100/H200)

- Supported natively on Hopper+ GPUs
- ~2x over BF16, near-zero quality loss
- vLLM 0.5+ and TensorRT-LLM both support FP8 seamlessly

```bash
# vLLM with FP8
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-4-Maverick-17B \
  --quantization fp8 \
  --max-model-len 128000
```

**Practical guidance:** Use FP8 on H100s, AWQ INT4 on older hardware, INT8 when quality can't budge.

---

## Speculative Decoding

One of the biggest throughput improvements of the last two years. The idea: use a **small draft model** to speculatively generate multiple tokens, then verify them all at once with the large model.

```
Normal decode:     [large_model] → token 1 → [large_model] → token 2 → ...
                   N large model calls for N tokens

Speculative:       [small_model] → tokens 1-4 (draft)
                   [large_model] → verify all 4 in one forward pass
                   Accept: 3 tokens, reject: 1
                   Net: 3 tokens for price of ~1.3 large model calls
```

### When It Works

Speculative decoding works best when:
- The draft model agrees with the large model often (high acceptance rate)
- You're generating long outputs (>50 tokens)
- You have spare compute for the draft model

Typical acceptance rates: 70–85% for code generation, 60–75% for chat, lower for creative tasks.

### Implementation with vLLM

```python
from vllm import LLM, SamplingParams

llm = LLM(
    model="meta-llama/Llama-4-Maverick-70B",
    speculative_model="meta-llama/Llama-4-Scout-8B",
    num_speculative_tokens=5,
    speculative_draft_tensor_parallel_size=1,
)

params = SamplingParams(temperature=0.7, max_tokens=512)
outputs = llm.generate(prompts, params)
```

### Self-Speculative (Medusa / EAGLE)

No separate draft model required. Extra "heads" on the base model draft multiple tokens simultaneously. Lower memory overhead but slightly lower speedup than separate draft models.

EAGLE-2 (2025) achieves 3–4x speedup on code tasks with <0.1% quality drop — impressive.

---

## KV Cache Optimization

Every token attended to in the decode phase requires its key-value tensors to be loaded from memory. For long contexts, this dominates latency and memory.

### Paged Attention

vLLM's core innovation (now industry standard). Instead of pre-allocating a contiguous KV cache block per request (causing fragmentation and waste), paged attention uses fixed-size "pages" managed like virtual memory.

Result: 2–4x better GPU memory utilization, enabling much higher batch sizes.

### KV Cache Compression

For very long contexts, you can compress old KV cache entries:
- **StreamingLLM**: Keep only initial tokens + recent tokens (attention sink phenomenon)
- **SnapKV / PyramidKV**: Adaptive pruning based on attention scores
- **Quantized KV Cache (FP8/INT8)**: Store cache in lower precision

```python
# vLLM KV cache quantization
llm = LLM(
    model="Qwen/Qwen3-72B",
    kv_cache_dtype="fp8_e5m2",  # Halves KV cache memory
    max_model_len=128000,
)
```

### Prefix Caching

If many requests share the same system prompt or few-shot examples, **cache the KV states** for that prefix. Subsequent requests skip re-computing the prefix entirely.

```python
# vLLM enables prefix caching by default in recent versions
# For SGLang, use RadixAttention:
from sglang import Runtime

rt = Runtime(
    model_path="meta-llama/Llama-4-Scout-17B",
    enable_radix_cache=True,  # Trie-based prefix cache
)
```

In production RAG systems where a large context is prepended to every query, prefix caching can reduce compute by 40–60%.

---

## Continuous Batching

The naive approach: wait for N requests, batch them, process together. Problem: requests finish at different times, leaving GPU idle.

**Continuous batching** (also called iteration-level scheduling): at each decode step, the scheduler can inject new requests and eject completed ones. GPU utilization goes from ~40% to 80%+.

All major serving frameworks implement this now (vLLM, SGLang, TGI). If you're building a custom serving layer, don't reinvent it — use one of these.

---

## Tensor Parallelism vs Pipeline Parallelism

When a model doesn't fit on one GPU:

### Tensor Parallelism (TP)
- Split individual weight matrices across GPUs
- High NVLink bandwidth required between GPUs
- Latency increases (all GPUs communicate at every layer)
- Best for **same-node** multi-GPU (A100/H100 NVLink)

### Pipeline Parallelism (PP)
- Split layers across GPUs (GPU 0 runs layers 0-16, GPU 1 runs 17-32...)
- Lower bandwidth requirements — only activations cross boundaries
- Introduces "bubble" overhead
- Best for **multi-node** setups

```python
# vLLM tensor + pipeline parallel
llm = LLM(
    model="deepseek-ai/DeepSeek-V3",
    tensor_parallel_size=4,   # 4 GPUs within a node
    pipeline_parallel_size=2, # 2 nodes
)
```

---

## Disaggregated Prefill/Decode

Emerging in 2025, now production-ready in 2026: run prefill and decode on **separate GPU pools**.

Why? Prefill is compute-intensive (wants big GPUs). Decode is memory-bandwidth intensive (wants many GPUs or HBM-dense GPUs).

```
Requests → Prefill Farm (H100 SXM, 8x per node) → KV Transfer → Decode Farm (H200, 4x per node)
```

This lets you optimize each phase independently and handle traffic spikes more gracefully. Mooncake (developed by Moonshot AI) is the most mature open-source implementation.

---

## The Numbers: What You Can Expect

For a 70B parameter model serving chat traffic:

| Configuration | Throughput (tokens/s) | Memory | Relative Cost |
|---|---|---|---|
| BF16, no optimization | 800 | 140GB | 1.0x |
| INT8 + continuous batching | 1,800 | 70GB | 0.45x |
| FP8 + speculative decoding | 3,200 | 70GB | 0.25x |
| FP8 + spec dec + prefix cache | 4,500+ | 70GB | 0.18x |

Real numbers vary significantly by request pattern, output length, and hardware. But the direction is consistent: stack these optimizations and costs drop 5–6x.

---

## Practical Stack for 2026

For most teams:

**Serving framework:** vLLM (most mature ecosystem) or SGLang (better for structured outputs/constrained generation)

**Quantization:** FP8 if on H100+, AWQ INT4 if on older hardware

**Speculative decoding:** Enable if output length > 100 tokens on average, draft model available

**KV cache:** Enable prefix caching by default, FP8 KV cache if memory-constrained

**Monitoring:** Track TPOT (time-per-output-token), TTFT (time-to-first-token), and GPU MFU (model flop utilization)

---

## Conclusion

Inference optimization is now core engineering, not ML research. The gap between an unoptimized serving setup and a well-tuned one is 5–10x in cost and latency. For any team running LLMs at meaningful scale, this work pays back faster than almost anything else you can do.

Start with quantization (easiest win), add continuous batching (vLLM/SGLang give you this for free), then layer in prefix caching and speculative decoding based on your traffic patterns.

---

*What's your current inference stack? I'm particularly curious about teams running models larger than 70B in production — what's working?*
