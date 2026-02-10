---
layout: post
title: "Fine-Tuning LLMs in 2026: A Practical Guide to Custom AI Models"
subtitle: "When to fine-tune, techniques that work, and avoiding common pitfalls"
date: 2026-02-10
author: "Dev Star"
header-img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1920&q=80"
tags: [LLM, Fine-Tuning, Machine Learning, AI, LoRA, QLoRA, OpenAI, Hugging Face]
---

Prompt engineering gets you 80% of the way. Fine-tuning gets you the last 20%—but it's expensive and easy to mess up. Here's when it makes sense and how to do it right.

![AI visualization](https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80)
*Photo by [Google DeepMind](https://unsplash.com/@googledeepmind) on Unsplash*

## When to Fine-Tune (and When Not To)

### Fine-tune when:
- You need consistent output format (JSON, specific structure)
- Domain vocabulary matters (legal, medical, your product)
- Latency is critical (shorter prompts = faster inference)
- You have high-quality training data (1000+ examples)

### Don't fine-tune when:
- Prompt engineering works well enough
- Your data is messy or limited
- You need the model to learn new facts (use RAG instead)
- You're still iterating on the task definition

## The Fine-Tuning Landscape in 2026

| Provider | Models | Best For |
|----------|--------|----------|
| OpenAI | GPT-4o, GPT-4o-mini | Production, API simplicity |
| Anthropic | Claude (via Amazon) | Enterprise, safety-critical |
| Google | Gemini | Multimodal tasks |
| Open Source | Llama 3, Mistral, Qwen | Control, cost, privacy |

## OpenAI Fine-Tuning

### Preparing Training Data

```python
# training_data.py
import json

def prepare_openai_format(examples: list[dict]) -> list[dict]:
    """Convert examples to OpenAI's chat format."""
    formatted = []
    
    for ex in examples:
        formatted.append({
            "messages": [
                {"role": "system", "content": ex["system_prompt"]},
                {"role": "user", "content": ex["input"]},
                {"role": "assistant", "content": ex["output"]}
            ]
        })
    
    return formatted

# Example: Customer support classifier
examples = [
    {
        "system_prompt": "Classify customer messages into categories.",
        "input": "My order hasn't arrived and it's been 2 weeks",
        "output": '{"category": "shipping", "sentiment": "frustrated", "priority": "high"}'
    },
    {
        "system_prompt": "Classify customer messages into categories.",
        "input": "How do I change my password?",
        "output": '{"category": "account", "sentiment": "neutral", "priority": "low"}'
    },
    # ... 1000+ more examples
]

# Save as JSONL
with open("training.jsonl", "w") as f:
    for item in prepare_openai_format(examples):
        f.write(json.dumps(item) + "\n")
```

### Starting the Fine-Tune

```python
from openai import OpenAI

client = OpenAI()

# Upload training file
file = client.files.create(
    file=open("training.jsonl", "rb"),
    purpose="fine-tune"
)

# Start fine-tuning
job = client.fine_tuning.jobs.create(
    training_file=file.id,
    model="gpt-4o-mini-2024-07-18",
    hyperparameters={
        "n_epochs": 3,
        "batch_size": 8,
        "learning_rate_multiplier": 1.0
    }
)

print(f"Job started: {job.id}")
```

### Monitoring Progress

```python
# Check status
job = client.fine_tuning.jobs.retrieve(job.id)
print(f"Status: {job.status}")

# List events
events = client.fine_tuning.jobs.list_events(job.id, limit=10)
for event in events.data:
    print(f"{event.created_at}: {event.message}")
```

![Data processing](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80)
*Photo by [Luke Chesser](https://unsplash.com/@lukechesser) on Unsplash*

## LoRA: Efficient Fine-Tuning for Open Source

Full fine-tuning updates all model weights. LoRA (Low-Rank Adaptation) only trains small adapter layers—faster and cheaper.

### Setting Up LoRA with PEFT

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model, TaskType
import torch

# Load base model
model_name = "meta-llama/Llama-3.1-8B-Instruct"
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.bfloat16,
    device_map="auto"
)
tokenizer = AutoTokenizer.from_pretrained(model_name)

# Configure LoRA
lora_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=16,                    # Rank - higher = more capacity
    lora_alpha=32,           # Scaling factor
    lora_dropout=0.1,
    target_modules=[         # Which layers to adapt
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj"
    ],
    bias="none"
)

# Apply LoRA
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# Output: trainable params: 20,971,520 || all params: 8,050,000,000 || trainable%: 0.26
```

### QLoRA: When GPU Memory is Limited

```python
from transformers import BitsAndBytesConfig

# 4-bit quantization config
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

# Load quantized model
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    quantization_config=bnb_config,
    device_map="auto"
)

# Now LoRA trains on the quantized model
# 8B model fits on 24GB GPU instead of 80GB+
```

### Training Loop

```python
from transformers import TrainingArguments, Trainer
from datasets import load_dataset

# Load your dataset
dataset = load_dataset("json", data_files="training.jsonl")

def format_prompt(example):
    return f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
{example['system']}<|eot_id|>
<|start_header_id|>user<|end_header_id|>
{example['input']}<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
{example['output']}<|eot_id|>"""

# Tokenize
def tokenize(example):
    text = format_prompt(example)
    tokens = tokenizer(
        text,
        truncation=True,
        max_length=2048,
        padding="max_length"
    )
    tokens["labels"] = tokens["input_ids"].copy()
    return tokens

tokenized = dataset.map(tokenize, remove_columns=dataset["train"].column_names)

# Training arguments
training_args = TrainingArguments(
    output_dir="./llama-finetuned",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    warmup_ratio=0.1,
    logging_steps=10,
    save_strategy="epoch",
    bf16=True,
    optim="paged_adamw_32bit",
)

# Train
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized["train"],
)

trainer.train()

# Save adapter weights only (small!)
model.save_pretrained("./llama-lora-adapter")
```

## Evaluation Strategy

Fine-tuning without evaluation is flying blind.

```python
from datasets import load_dataset
import numpy as np

def evaluate_model(model, tokenizer, test_data):
    results = []
    
    for example in test_data:
        # Generate
        inputs = tokenizer(example["input"], return_tensors="pt").to(model.device)
        outputs = model.generate(**inputs, max_new_tokens=256)
        generated = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Compare to expected
        expected = example["output"]
        
        # Custom metrics for your task
        results.append({
            "exact_match": generated.strip() == expected.strip(),
            "valid_json": is_valid_json(generated),
            "category_correct": extract_category(generated) == extract_category(expected),
        })
    
    # Aggregate
    return {
        "exact_match": np.mean([r["exact_match"] for r in results]),
        "valid_json": np.mean([r["valid_json"] for r in results]),
        "category_accuracy": np.mean([r["category_correct"] for r in results]),
    }
```

## Common Pitfalls

### 1. Overfitting
```python
# Signs: Training loss drops, eval loss rises
# Fix: Early stopping, more data, lower epochs
training_args = TrainingArguments(
    # ...
    evaluation_strategy="steps",
    eval_steps=100,
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
)
```

### 2. Catastrophic Forgetting
```python
# Model forgets general knowledge
# Fix: Include diverse examples, not just task-specific
training_data = (
    task_specific_examples +  # Your use case
    general_chat_examples     # Keep general ability
)
```

### 3. Poor Data Quality
```python
# Garbage in, garbage out
# Fix: Review and clean your data
def validate_example(example):
    # Check format
    if not example.get("input") or not example.get("output"):
        return False
    
    # Check output is valid
    try:
        json.loads(example["output"])
    except:
        return False
    
    # Check length
    if len(example["input"]) < 10:
        return False
    
    return True

clean_data = [ex for ex in raw_data if validate_example(ex)]
```

## Deploying Fine-Tuned Models

### OpenAI
```python
# Just use the fine-tuned model ID
response = client.chat.completions.create(
    model="ft:gpt-4o-mini-2024-07-18:my-org::abc123",
    messages=[{"role": "user", "content": "Classify this..."}]
)
```

### Open Source with vLLM
```bash
# Merge LoRA adapter with base model
python -m peft.merge_and_unload \
    --base_model meta-llama/Llama-3.1-8B-Instruct \
    --lora_path ./llama-lora-adapter \
    --output_dir ./llama-merged

# Serve with vLLM
vllm serve ./llama-merged \
    --port 8000 \
    --tensor-parallel-size 2
```

## Cost Comparison (as of 2026)

| Approach | Training Cost | Inference Cost | Time to Deploy |
|----------|--------------|----------------|----------------|
| OpenAI Fine-Tune | ~$50-500 | 2x base model | Hours |
| LoRA on 8B | ~$20 (cloud GPU) | Self-hosted | Hours |
| Full Fine-Tune 70B | ~$500-5000 | Self-hosted | Days |

---

*Fine-tuning is powerful but not magic. Start with prompting, measure what's missing, then fine-tune with quality data. Your evaluation suite matters more than your hyperparameters.*
