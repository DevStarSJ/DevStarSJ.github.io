---
layout: post
title: "LLM Fine-Tuning in 2026: A Practical Guide from LoRA to Full Training"
description: "Master LLM fine-tuning techniques including LoRA, QLoRA, and full fine-tuning. Step-by-step guide with code examples for Llama, Mistral, and custom models."
category: ai
tags: [llm, fine-tuning, lora, machine-learning, ai, transformers, nlp]
date: 2026-02-01
read_time: 16
header-img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200"
---

# LLM Fine-Tuning in 2026: A Practical Guide from LoRA to Full Training

Pre-trained LLMs are impressive, but fine-tuning unlocks their true potential for your specific use case. Whether you're building a customer support bot or a code assistant, this guide will get you there.

![AI Neural Network](https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800)
*Photo by [Steve Johnson](https://unsplash.com/@steve_j) on Unsplash*

## Why Fine-Tune?

Base models like Llama 3, Mistral, or Qwen are trained on general internet data. Fine-tuning adapts them to:

- **Your domain vocabulary** — Legal, medical, or technical jargon
- **Your output format** — JSON, specific templates, structured data
- **Your tone and style** — Formal, casual, or brand-specific
- **Your use case** — Classification, extraction, generation

### Fine-Tuning vs RAG vs Prompting

| Approach | Best For | Cost | Latency |
|----------|----------|------|---------|
| Prompt Engineering | Quick experiments | Free | Base |
| RAG | Dynamic knowledge | Medium | +50-100ms |
| Fine-Tuning | Behavior change | High upfront | Faster inference |
| Fine-Tuning + RAG | Production systems | Highest | Optimized |

## Fine-Tuning Methods Explained

### 1. Full Fine-Tuning

Updates all model parameters. Best quality, highest cost.

**Requirements for Llama 3 70B:**
- 8x A100 80GB GPUs
- ~500GB disk space
- Days of training time
- $10,000+ compute cost

### 2. LoRA (Low-Rank Adaptation)

Freezes base model, trains small adapter layers.

**Requirements for Llama 3 70B:**
- 1x A100 80GB or 2x A100 40GB
- ~200GB disk space
- Hours of training
- $100-500 compute cost

### 3. QLoRA (Quantized LoRA)

Combines 4-bit quantization with LoRA for maximum efficiency.

**Requirements for Llama 3 70B:**
- 1x A100 40GB or 1x 4090 24GB
- ~50GB disk space
- Hours of training
- $50-200 compute cost

![Data Processing](https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800)
*Photo by [Markus Spiske](https://unsplash.com/@markusspiske) on Unsplash*

## Step 1: Prepare Your Dataset

Quality data is everything. The format depends on your task.

### Instruction Following Format

```json
{
  "instruction": "Summarize the following customer complaint",
  "input": "I ordered product #12345 two weeks ago and it still hasn't arrived. I've called support three times with no resolution. This is unacceptable for a premium member.",
  "output": "Customer complaint about delayed order #12345 (2+ weeks). Multiple support contacts unsuccessful. Premium member expressing frustration."
}
```

### Conversation Format

```json
{
  "conversations": [
    {"role": "system", "content": "You are a helpful customer service agent."},
    {"role": "user", "content": "My order hasn't arrived"},
    {"role": "assistant", "content": "I'm sorry to hear that. Could you provide your order number?"},
    {"role": "user", "content": "It's #12345"},
    {"role": "assistant", "content": "Thank you. I can see order #12345 is currently in transit..."}
  ]
}
```

### Data Quality Checklist

- [ ] Minimum 1,000 examples (ideally 10,000+)
- [ ] Consistent formatting
- [ ] No contradictory examples
- [ ] Diverse coverage of your use case
- [ ] Balanced classes (for classification)
- [ ] Human-reviewed samples

## Step 2: Set Up Your Environment

### Using Hugging Face + PEFT

```bash
pip install torch transformers datasets peft accelerate bitsandbytes
pip install trl wandb  # Training and monitoring
```

### Load Model with Quantization

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

model_id = "meta-llama/Llama-3.1-8B-Instruct"

# 4-bit quantization config for QLoRA
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16
)

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True
)

tokenizer = AutoTokenizer.from_pretrained(model_id)
tokenizer.pad_token = tokenizer.eos_token
```

## Step 3: Configure LoRA

```python
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

# Prepare model for training
model = prepare_model_for_kbit_training(model)

# LoRA configuration
lora_config = LoraConfig(
    r=64,                      # Rank - higher = more capacity
    lora_alpha=128,            # Scaling factor
    target_modules=[           # Which layers to adapt
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj"
    ],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

model = get_peft_model(model, lora_config)

# Check trainable parameters
model.print_trainable_parameters()
# Output: trainable params: 83,886,080 || all params: 8,030,261,248 || trainable%: 1.04%
```

### LoRA Hyperparameter Guide

| Parameter | Low | Medium | High | Notes |
|-----------|-----|--------|------|-------|
| r (rank) | 8 | 32-64 | 128+ | More = better fit, more memory |
| alpha | 16 | 64-128 | 256 | Usually 2x rank |
| dropout | 0 | 0.05 | 0.1 | Helps prevent overfitting |

## Step 4: Prepare Dataset

```python
from datasets import load_dataset

# Load your dataset
dataset = load_dataset("json", data_files="training_data.jsonl")

def format_instruction(example):
    """Convert to model's expected chat format"""
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": example["instruction"]},
        {"role": "assistant", "content": example["output"]}
    ]
    
    # Apply chat template
    text = tokenizer.apply_chat_template(
        messages, 
        tokenize=False, 
        add_generation_prompt=False
    )
    return {"text": text}

dataset = dataset.map(format_instruction)
dataset = dataset["train"].train_test_split(test_size=0.1)
```

## Step 5: Train

```python
from trl import SFTTrainer
from transformers import TrainingArguments

training_args = TrainingArguments(
    output_dir="./llama3-finetuned",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    weight_decay=0.01,
    warmup_ratio=0.03,
    lr_scheduler_type="cosine",
    logging_steps=10,
    save_strategy="epoch",
    evaluation_strategy="epoch",
    bf16=True,
    gradient_checkpointing=True,
    optim="paged_adamw_8bit",
    report_to="wandb"
)

trainer = SFTTrainer(
    model=model,
    train_dataset=dataset["train"],
    eval_dataset=dataset["test"],
    tokenizer=tokenizer,
    args=training_args,
    dataset_text_field="text",
    max_seq_length=2048,
    packing=True  # Efficient packing of short examples
)

trainer.train()
```

## Step 6: Merge and Export

```python
# Save LoRA adapter
trainer.save_model("./llama3-lora-adapter")

# Merge adapter with base model for deployment
from peft import PeftModel

# Load base model in full precision
base_model = AutoModelForCausalLM.from_pretrained(
    model_id,
    torch_dtype=torch.bfloat16,
    device_map="auto"
)

# Load and merge LoRA
model = PeftModel.from_pretrained(base_model, "./llama3-lora-adapter")
model = model.merge_and_unload()

# Save merged model
model.save_pretrained("./llama3-finetuned-merged")
tokenizer.save_pretrained("./llama3-finetuned-merged")
```

## Common Issues and Solutions

### Issue 1: Overfitting

**Symptoms**: Training loss goes down, eval loss goes up after epoch 1

**Solutions**:
- Reduce epochs (try 1-2)
- Increase dropout
- Add more diverse training data
- Reduce LoRA rank

### Issue 2: Catastrophic Forgetting

**Symptoms**: Model loses general capabilities

**Solutions**:
- Lower learning rate (try 1e-5)
- Mix in general instruction data (10-20%)
- Use fewer epochs

### Issue 3: Output Format Breaks

**Symptoms**: Model doesn't follow your desired format

**Solutions**:
- More format-consistent training examples
- Add format instructions to system prompt
- Include negative examples with corrections

### Issue 4: GPU Out of Memory

**Solutions**:
- Reduce batch size
- Enable gradient checkpointing
- Use QLoRA instead of LoRA
- Reduce max sequence length

## Advanced: Multi-GPU Training

```python
# Use accelerate for distributed training
# accelerate launch --multi_gpu --num_processes 4 train.py

from accelerate import Accelerator

accelerator = Accelerator()
model, optimizer, train_dataloader = accelerator.prepare(
    model, optimizer, train_dataloader
)
```

## Deployment Options

### 1. Hugging Face Inference Endpoints

```bash
# Push to Hub
model.push_to_hub("your-username/llama3-custom")

# Deploy via HF UI or API
```

### 2. vLLM for High Throughput

```python
from vllm import LLM, SamplingParams

llm = LLM(model="./llama3-finetuned-merged")
outputs = llm.generate(["Your prompt"], SamplingParams(max_tokens=256))
```

### 3. Ollama for Local

```bash
# Create Modelfile
FROM ./llama3-finetuned-merged
SYSTEM "You are a helpful assistant."

# Import to Ollama
ollama create my-model -f Modelfile
ollama run my-model
```

## Cost Comparison

| Method | Hardware | Time | Cost |
|--------|----------|------|------|
| QLoRA 8B | 1x RTX 4090 | 2-4h | $10-20 |
| LoRA 8B | 1x A100 40GB | 1-2h | $20-40 |
| QLoRA 70B | 1x A100 80GB | 8-16h | $100-200 |
| Full 8B | 4x A100 40GB | 4-8h | $200-400 |
| Full 70B | 8x A100 80GB | 24-48h | $2000-4000 |

## Conclusion

Fine-tuning isn't magic — it's engineering. Start with QLoRA on a small model, validate your approach, then scale up. The key is **quality data** and **iterative improvement**.

**Quick start path:**
1. Prepare 1,000+ high-quality examples
2. QLoRA fine-tune Llama 3.1 8B
3. Evaluate on held-out test set
4. Iterate on data quality
5. Scale to larger model if needed

The best fine-tuned model isn't the biggest — it's the one trained on the best data for your specific use case.

---

*What are you fine-tuning? The model is only as good as its training data.*
