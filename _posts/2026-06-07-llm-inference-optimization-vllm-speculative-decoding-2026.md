---
layout: post
title: "LLM Inference Optimization in 2026: From vLLM to Speculative Decoding"
subtitle: "A practical guide to running large language models efficiently in production"
date: 2026-06-07 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - LLM
  - AI Inference
  - GPU
  - Performance
  - vLLM
  - Production AI
categories: ai
---

## The LLM Inference Challenge

Deploying large language models in production is expensive. A single A100 GPU costs roughly $2-3 per hour; a cluster of 8 needed to serve a 70B parameter model runs $16-24/hour. At scale, inference costs can dwarf training costs — a counterintuitive reality that has driven enormous research investment into inference optimization.

In 2026, the inference optimization landscape has matured dramatically. Let's explore the key techniques and tools that are defining production LLM deployments.

![GPU Server Infrastructure](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&auto=format&fit=crop)
*Photo by Lars Kienle on Unsplash*

## The Anatomy of LLM Inference

Before optimizing, you need to understand what makes LLM inference expensive:

### Memory Bandwidth is the Bottleneck

LLMs are **memory bandwidth bound**, not compute bound. For each generated token:

1. Load all model weights from HBM to compute units
2. Load KV cache from previous tokens
3. Run attention + FFN computation
4. Write new KV cache entry

For a 70B parameter model in FP16, model weights alone are ~140GB. Loading these weights for every token is the primary bottleneck.

### KV Cache: The Key Resource

The **KV (Key-Value) cache** stores attention keys and values from previously generated tokens. It's essential for efficient autoregressive generation, but it's expensive:

- Size grows linearly with sequence length
- For 70B model, 32K context uses ~128GB KV cache per request
- Cache must stay in GPU memory during generation

Managing KV cache efficiently is the central challenge of LLM serving infrastructure.

## vLLM: PagedAttention and Continuous Batching

**vLLM** from UC Berkeley remains the dominant open-source LLM serving framework in 2026. Its two key innovations:

### PagedAttention

Traditional KV cache allocation reserved contiguous GPU memory blocks. vLLM's PagedAttention treats KV cache like virtual memory — breaking it into non-contiguous pages:

```
Traditional KV Cache:
Request A: [block1][block2][block3][   ][   ]  ← wasted padding
Request B: [block1][   ][   ][   ][   ]        ← wasted padding

PagedAttention:
Request A: [page1][page7][page3]               ← no waste
Request B: [page2][page8]                      ← no waste
Shared:    [page5] ← prompt prefix shared between requests!
```

Benefits:
- **Near-zero memory waste** from fragmentation
- **Prompt caching** — identical prefixes (system prompts) share pages
- **Higher batch sizes** — more requests fit in the same GPU memory

### Continuous Batching

Static batching waits for a batch to complete before starting new requests. Continuous batching inserts new requests mid-batch:

```python
# vLLM server setup
from vllm import LLM, SamplingParams

llm = LLM(
    model="meta-llama/Llama-3-70b-instruct",
    tensor_parallel_size=4,        # Split across 4 GPUs
    max_model_len=32768,           # Max context length
    gpu_memory_utilization=0.90,   # Use 90% of GPU memory
    enable_prefix_caching=True,    # Cache common prefixes
    enable_chunked_prefill=True,   # Better long-context handling
)

sampling_params = SamplingParams(
    temperature=0.7,
    top_p=0.9,
    max_tokens=512,
)

outputs = llm.generate(prompts, sampling_params)
```

With continuous batching, throughput increases 2-5x compared to static batching for typical workloads.

## Speculative Decoding: Free Speedup

**Speculative decoding** is one of the most elegant inference optimizations discovered in recent years. The insight:

- LLM generation is sequential (one token at a time)
- Verifying multiple tokens in parallel is possible and cheap
- A small "draft" model is much faster than the target model

### How It Works

```
1. Draft model generates k tokens speculatively (fast)
   Draft: [token1][token2][token3][token4][token5]

2. Target model verifies all k tokens in ONE forward pass (parallelizable!)
   Target: ✅ [token1] ✅ [token2] ✅ [token3] ❌ [token4]

3. Accept correct prefix, reject first wrong token
   Accepted: [token1][token2][token3]
   Regenerate from: token4 position

4. Result: 3 tokens accepted with ~same latency as generating 1
```

Typical speedups: **1.5x - 3x** for common language generation tasks.

```python
# vLLM speculative decoding configuration
llm = LLM(
    model="meta-llama/Llama-3-70b-instruct",
    speculative_model="meta-llama/Llama-3-8b-instruct",  # Draft model
    num_speculative_tokens=5,      # Tokens to speculate per step
    tensor_parallel_size=4,
)
```

### Medusa: Multiple Draft Heads

An alternative to a separate draft model — **Medusa** adds multiple prediction heads to the main model, each predicting tokens at different positions:

```python
# Medusa heads predict tokens 1-4 positions ahead simultaneously
# Head 1: predicts token at position t+1
# Head 2: predicts token at position t+2
# Head 3: predicts token at position t+3
# Head 4: predicts token at position t+4
```

Medusa achieves speculative decoding without needing a separate model, reducing operational complexity.

## Quantization: Trading Precision for Speed

Quantization reduces model weight precision from FP16 (16-bit) to INT8 or INT4:

| Format | Bits | Memory Reduction | Quality Loss |
|--------|------|-----------------|--------------|
| FP16 | 16 | baseline | none |
| BF16 | 16 | baseline | minimal |
| INT8 | 8 | 2x | minimal |
| INT4 (GPTQ) | 4 | 4x | small |
| INT4 (AWQ) | 4 | 4x | smallest |
| INT2 | 2 | 8x | significant |

### GPTQ vs. AWQ in 2026

**AWQ (Activation-aware Weight Quantization)** has become the preferred INT4 method:

```python
from awq import AutoAWQForCausalLM
from transformers import AutoTokenizer

model_path = 'meta-llama/Llama-3-70b-instruct'
quant_path = 'llama3-70b-awq'

quant_config = {
    "zero_point": True,
    "q_group_size": 128,
    "w_bit": 4,
    "version": "GEMM"
}

# Load model
model = AutoAWQForCausalLM.from_pretrained(model_path)
tokenizer = AutoTokenizer.from_pretrained(model_path)

# Quantize — takes 1-2 hours for 70B
model.quantize(tokenizer, quant_config=quant_config)
model.save_quantized(quant_path)
tokenizer.save_pretrained(quant_path)
```

A 70B model shrinks from ~140GB to ~40GB in AWQ INT4, fitting on a single 8×A100 node instead of requiring a multi-node setup.

## Flash Attention 3: The Foundation

**Flash Attention** is no longer optional — it's the default implementation in every major framework. Flash Attention 3 brings:

- **2x speedup** over Flash Attention 2 on H100 GPUs
- Support for **FP8** computation (H100/H800)
- Better support for **GQA (Grouped Query Attention)** used in modern LLaMA/Mistral architectures
- **Asynchronous softmax** — better hardware utilization

```python
# Flash Attention 3 is enabled by default in transformers 4.40+
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3-70b-instruct",
    attn_implementation="flash_attention_2",  # or "eager"
    torch_dtype=torch.bfloat16,
)
```

## Disaggregated Prefill: The Latest Frontier

The newest technique in production LLM serving (2025-2026) is **disaggregated prefill**:

Traditional serving: prefill (processing the input prompt) and decode (generating output) happen on the same hardware.

**Disaggregated prefill** separates them onto different hardware:

```
Prefill cluster (compute-intensive):
- Large batch of prompts → process in parallel
- High GPU utilization during prefill
- Transfer KV cache to decode cluster

Decode cluster (memory-bandwidth-intensive):
- Receive KV cache from prefill
- Generate tokens one at a time
- Optimized for low latency
```

This separation allows each cluster to be optimized for its specific workload, achieving both high throughput and low latency simultaneously.

## Serving Infrastructure Comparison (2026)

| Framework | Best For | Key Strength |
|-----------|---------|-------------|
| vLLM | General purpose serving | PagedAttention, ecosystem |
| TensorRT-LLM | NVIDIA GPU maximum perf | Hardware optimization |
| TGI (Hugging Face) | Enterprise/managed | Ease of deployment |
| Ollama | Local development | Developer experience |
| LMDeploy | Edge/embedded | Efficiency at scale |

## Cost Reality: What Actually Saves Money

Based on production deployments:

1. **Quantization (INT4)** — 3-4x cost reduction, minimal quality loss
2. **Continuous batching** — 2-4x throughput improvement
3. **Speculative decoding** — 1.5-2.5x latency reduction
4. **Prompt caching** — 50-80% cost reduction for repeated prefixes
5. **Model selection** — Right-sizing model to task (3B vs 70B)

Often, combining techniques 1+2+4 gives the highest ROI with the least complexity.

## Conclusion

LLM inference optimization in 2026 has transformed from a research topic into an engineering discipline. The combination of PagedAttention, speculative decoding, AWQ quantization, and Flash Attention means that models which required expensive multi-node clusters two years ago can now run efficiently on a single high-end server.

The tools are mature. The techniques are understood. The remaining challenge is operational: building reliable serving infrastructure that applies these optimizations correctly for your specific workload.

---

**Resources:**
- [vLLM Documentation](https://docs.vllm.ai)
- [Flash Attention 3 Paper](https://arxiv.org/abs/2407.08608)
- [AWQ: Activation-aware Weight Quantization](https://github.com/mit-han-lab/llm-awq)
- [Speculative Decoding Paper](https://arxiv.org/abs/2211.17192)
