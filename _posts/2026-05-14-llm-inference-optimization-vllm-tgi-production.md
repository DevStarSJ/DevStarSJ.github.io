---
layout: post
title: "LLM Inference Optimization: vLLM, TGI, and Production Serving Strategies in 2026"
subtitle: "How to serve large language models at scale without burning your GPU budget"
date: 2026-05-14 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=1200&auto=format&fit=crop&q=80"
catalog: true
tags:
  - LLM
  - Inference
  - vLLM
  - TGI
  - MLOps
  - Production
  - AI
categories: ai
---

# LLM Inference Optimization: vLLM, TGI, and Production Serving Strategies in 2026

Running LLMs in production is no longer just an ML problem — it's an infrastructure problem. The gap between a model that performs well in a notebook and one that serves thousands of users under SLA is enormous. In 2026, inference optimization has become a critical engineering discipline.

This post covers the key techniques, tools, and architectural decisions for serving LLMs efficiently at scale.

![LLM Infrastructure](https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80)
*Photo by Alexandre Debiève on Unsplash*

---

## The Inference Bottleneck

LLM inference is fundamentally different from training. While training benefits from large batch sizes and can tolerate variable latency, inference requires:

- **Low first-token latency (TTFT):** Users feel the wait before the first word appears.
- **High token throughput:** Serving many concurrent users without GPU saturation.
- **Memory efficiency:** KV-cache management across long contexts.

The naive approach — loading a model and calling `model.generate()` for each request — fails at any meaningful scale. Let's look at what the ecosystem offers instead.

---

## vLLM: PagedAttention and Continuous Batching

[vLLM](https://github.com/vllm-project/vllm) introduced two game-changing ideas:

### PagedAttention

Traditional KV-cache allocates a contiguous block of memory per sequence, leading to severe memory fragmentation. PagedAttention borrows the idea of virtual memory paging: KV-cache is stored in non-contiguous blocks and managed via a page table.

**Result:** Near-zero memory waste from fragmentation, enabling 2-4x more concurrent requests on the same hardware.

```python
from vllm import LLM, SamplingParams

llm = LLM(
    model="meta-llama/Llama-3-70B-Instruct",
    tensor_parallel_size=4,
    gpu_memory_utilization=0.90,
    max_model_len=8192,
)

sampling_params = SamplingParams(
    temperature=0.7,
    top_p=0.9,
    max_tokens=512,
)

outputs = llm.generate(prompts, sampling_params)
```

### Continuous Batching

Instead of waiting for all sequences in a batch to finish before starting new ones, vLLM processes requests as a stream. New requests are inserted into the running batch as slots free up.

**Result:** GPU utilization stays high regardless of variance in output length.

### vLLM OpenAI-Compatible Server

```bash
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3-70B-Instruct \
  --tensor-parallel-size 4 \
  --max-model-len 8192 \
  --port 8000
```

You get a drop-in replacement for the OpenAI API — existing client code works without changes.

---

## TGI (Text Generation Inference): Hugging Face's Production Stack

[TGI](https://github.com/huggingface/text-generation-inference) is Hugging Face's battle-tested inference server, written in Rust with Python kernels. It powers the Hugging Face Inference API at scale.

Key features:
- **Flash Attention 2** for efficient attention computation
- **Speculative decoding** to reduce latency
- **GPTQ/AWQ/bitsandbytes quantization** out of the box
- **Token streaming** via Server-Sent Events (SSE)

```bash
docker run --gpus all \
  -p 8080:80 \
  -v $HOME/.cache/huggingface:/data \
  ghcr.io/huggingface/text-generation-inference:latest \
  --model-id meta-llama/Llama-3-70B-Instruct \
  --num-shard 4 \
  --max-batch-total-tokens 32000
```

### TGI vs vLLM: Choosing the Right Tool

| Feature | vLLM | TGI |
|---|---|---|
| Throughput | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Latency | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Model support | Broad | Hugging Face-first |
| Quantization | GPTQ, AWQ, GGUF | GPTQ, AWQ, bitsandbytes |
| Production maturity | High | Very High |
| OpenAI compat. | Native | Via adapter |

**Rule of thumb:**
- Use **vLLM** for maximum throughput with many concurrent users.
- Use **TGI** when you need streaming latency and HuggingFace ecosystem integration.

---

## Quantization: The Free Lunch

Quantization reduces model weights from 16-bit floats to 8-bit or 4-bit integers. Modern techniques maintain quality surprisingly well:

### GPTQ (Post-Training Quantization)

```python
from transformers import AutoModelForCausalLM
from optimum.gptq import GPTQQuantizer

quantizer = GPTQQuantizer(bits=4, dataset="c4", block_name_to_quantize="model.layers")
quantized_model = quantizer.quantize_model(model, tokenizer)
quantized_model.save_pretrained("./llama-3-70b-gptq-4bit")
```

**Memory savings:** A 70B model goes from ~140GB (FP16) → ~35GB (INT4). Fits on 2x A100 80GB instead of 4.

### AWQ (Activation-Aware Weight Quantization)

AWQ identifies which weights are most important by analyzing activation magnitudes, preserving accuracy better than naive quantization.

```python
from awq import AutoAWQForCausalLM

model = AutoAWQForCausalLM.from_pretrained("meta-llama/Llama-3-70B-Instruct")
model.quantize(tokenizer, quant_config={"zero_point": True, "q_group_size": 128, "w_bit": 4})
```

---

## Speculative Decoding

The core insight: autoregressive decoding generates one token per forward pass, but each pass is expensive. Speculative decoding uses a small **draft model** to propose multiple tokens at once, then verifies them with the full model in a single pass.

```
Draft model proposes: ["The", "capital", "of", "France", "is", "Paris"]
Large model verifies in one forward pass: accepts 5 of 6 tokens
Net result: 5 tokens generated at cost of ~1.2 forward passes
```

vLLM and TGI both support speculative decoding:

```python
# vLLM speculative decoding
llm = LLM(
    model="meta-llama/Llama-3-70B-Instruct",
    speculative_model="meta-llama/Llama-3-8B-Instruct",
    num_speculative_tokens=5,
    tensor_parallel_size=4,
)
```

Typical speedup: **1.5-3x** on generation-heavy workloads.

---

## Production Architecture Patterns

### 1. Prefill-Decode Disaggregation

A major trend in 2026: separate the **prefill phase** (processing the input prompt — compute-bound) from the **decode phase** (generating output tokens — memory-bandwidth-bound) onto different GPU pools.

```
                    ┌──────────────────┐
Request ──────────► │  Prefill Cluster  │ (high compute GPUs: H100)
                    └────────┬─────────┘
                             │ KV-cache transfer
                    ┌────────▼─────────┐
                    │  Decode Cluster  │ (memory-optimized GPUs: L40S)
                    └──────────────────┘
```

This matches GPU characteristics to workload type, reducing cost by 30-40%.

### 2. Multi-Level Caching

```
Request → Semantic Cache (exact/fuzzy match) →
          Prompt Cache (prefix reuse) →
          KV Cache (in-flight) →
          Model Inference
```

Semantic caching (e.g., with Redis + embeddings) can serve 20-40% of LLM queries without touching the GPU at all.

### 3. Router + Model Pool

```yaml
# Example: LiteLLM router config
model_list:
  - model_name: llama-70b
    litellm_params:
      model: openai/meta-llama/Llama-3-70B-Instruct
      api_base: http://vllm-primary:8000/v1
  - model_name: llama-70b
    litellm_params:
      model: openai/meta-llama/Llama-3-70B-Instruct
      api_base: http://vllm-replica:8000/v1

router_settings:
  routing_strategy: least-busy
  num_retries: 3
  timeout: 30
```

---

## Monitoring Inference Performance

Key metrics to track in production:

| Metric | Description | Target |
|---|---|---|
| TTFT | Time to first token | < 500ms (p95) |
| TPS | Tokens per second per user | > 30 |
| E2E latency | Total request duration | < 5s (p95) |
| GPU utilization | Should stay 70-90% | 70-90% |
| KV cache hit rate | Cache efficiency | > 40% |

```python
# vLLM exposes Prometheus metrics at /metrics
import requests

metrics = requests.get("http://vllm-server:8000/metrics").text
# Scrape: vllm:gpu_cache_usage_perc, vllm:num_requests_running, etc.
```

---

## Cost Optimization Checklist

- [ ] **Quantize** to INT4/INT8 where accuracy allows (saves 2-4x memory)
- [ ] **Enable prefix caching** for system prompts shared across requests
- [ ] **Tune `max_num_batched_tokens`** to maximize GPU utilization
- [ ] **Use speculative decoding** for latency-sensitive endpoints
- [ ] **Deploy on spot/preemptible GPUs** for batch workloads
- [ ] **Set up semantic caching** for repeated/similar queries
- [ ] **Profile and right-size** — a 70B model isn't always better than a tuned 8B

---

## Conclusion

LLM inference optimization in 2026 is a rich engineering discipline. The tools — vLLM, TGI, quantization, speculative decoding — are mature and production-ready. The patterns — disaggregated prefill/decode, semantic caching, intelligent routing — represent hard-won operational wisdom.

The organizations winning at AI in production aren't necessarily those with the biggest models; they're the ones who've mastered serving them efficiently.

Start with vLLM + INT4 quantization, add prefix caching, then layer in the advanced patterns as your scale demands.
