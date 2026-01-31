---
layout: post
title: "Fine-Tuning LLM Complete Guide: Customize AI Models for Your Use Case"
subtitle: Learn how to fine-tune GPT, Llama, and other models
categories: development
tags: python ai
comments: true
---

# Fine-Tuning LLM Complete Guide: Customize AI Models for Your Use Case

Fine-tuning allows you to customize AI models for specific tasks, improving accuracy and reducing costs. This guide covers techniques from simple OpenAI fine-tuning to advanced methods like LoRA.

## Why Fine-Tune?

| Approach | Best For | Cost | Quality |
|----------|----------|------|---------|
| Prompting | Quick experiments | Low | Variable |
| RAG | Knowledge-specific tasks | Medium | Good |
| Fine-tuning | Style/format consistency | High | Excellent |

**Fine-tune when you need:**
- Consistent output format
- Domain-specific knowledge
- Reduced token usage
- Better task performance

## OpenAI Fine-Tuning

### Prepare Training Data

```python
# training_data.jsonl
{"messages": [{"role": "system", "content": "You are a customer support agent."}, {"role": "user", "content": "How do I reset my password?"}, {"role": "assistant", "content": "To reset your password:\n1. Go to login page\n2. Click 'Forgot Password'\n3. Enter your email\n4. Check inbox for reset link"}]}
{"messages": [{"role": "system", "content": "You are a customer support agent."}, {"role": "user", "content": "What's your refund policy?"}, {"role": "assistant", "content": "Our refund policy:\n- Full refund within 30 days\n- Partial refund within 60 days\n- Contact support@company.com for requests"}]}
```

### Create Training File

```python
from openai import OpenAI
client = OpenAI()

# Upload file
file = client.files.create(
    file=open("training_data.jsonl", "rb"),
    purpose="fine-tune"
)

print(f"File ID: {file.id}")
```

### Start Fine-Tuning

```python
# Create fine-tuning job
job = client.fine_tuning.jobs.create(
    training_file=file.id,
    model="gpt-4o-mini-2024-07-18",
    hyperparameters={
        "n_epochs": 3
    }
)

print(f"Job ID: {job.id}")
```

### Monitor Progress

```python
# Check status
job = client.fine_tuning.jobs.retrieve(job.id)
print(f"Status: {job.status}")

# List events
events = client.fine_tuning.jobs.list_events(job.id, limit=10)
for event in events.data:
    print(f"{event.created_at}: {event.message}")
```

### Use Fine-Tuned Model

```python
# After job completes
response = client.chat.completions.create(
    model="ft:gpt-4o-mini:your-org::abc123",  # Your fine-tuned model
    messages=[
        {"role": "system", "content": "You are a customer support agent."},
        {"role": "user", "content": "How do I change my email?"}
    ]
)
```

## Local Fine-Tuning with Hugging Face

### Setup

```bash
pip install transformers datasets peft accelerate bitsandbytes
pip install torch torchvision torchaudio
```

### Load Model and Tokenizer

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

model_name = "meta-llama/Llama-2-7b-hf"

tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto"
)
```

### Prepare Dataset

```python
from datasets import Dataset

training_data = [
    {
        "instruction": "Summarize this text",
        "input": "The quick brown fox...",
        "output": "A fox jumped over a dog."
    },
    # More examples...
]

def format_prompt(example):
    return f"""### Instruction:
{example['instruction']}

### Input:
{example['input']}

### Response:
{example['output']}"""

dataset = Dataset.from_list(training_data)
dataset = dataset.map(lambda x: {"text": format_prompt(x)})
```

## LoRA Fine-Tuning (Efficient)

### What is LoRA?

LoRA (Low-Rank Adaptation) fine-tunes only a small number of parameters, making it:
- Memory efficient
- Fast to train
- Easy to swap adapters

### Setup LoRA

```python
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

# LoRA configuration
lora_config = LoraConfig(
    r=16,                    # Rank
    lora_alpha=32,           # Alpha scaling
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

# Prepare model
model = prepare_model_for_kbit_training(model)
model = get_peft_model(model, lora_config)

# Check trainable parameters
model.print_trainable_parameters()
# Output: trainable params: 4,194,304 || all params: 6,742,609,920 || trainable%: 0.0622
```

### Training with LoRA

```python
from transformers import TrainingArguments, Trainer

training_args = TrainingArguments(
    output_dir="./lora-output",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    fp16=True,
    save_steps=100,
    logging_steps=10,
    warmup_steps=50
)

trainer = Trainer(
    model=model,
    train_dataset=tokenized_dataset,
    args=training_args,
    data_collator=data_collator
)

trainer.train()
```

### Save and Load LoRA Adapter

```python
# Save
model.save_pretrained("./my-lora-adapter")

# Load
from peft import PeftModel

base_model = AutoModelForCausalLM.from_pretrained(model_name)
model = PeftModel.from_pretrained(base_model, "./my-lora-adapter")
```

## QLoRA (Quantized LoRA)

Even more efficient—trains in 4-bit precision:

```python
from transformers import BitsAndBytesConfig

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True
)

model = AutoModelForCausalLM.from_pretrained(
    model_name,
    quantization_config=bnb_config,
    device_map="auto"
)
```

## Full Fine-Tuning Script

```python
import torch
from datasets import Dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

# Configuration
MODEL_NAME = "meta-llama/Llama-2-7b-hf"
OUTPUT_DIR = "./fine-tuned-model"
MAX_LENGTH = 512

# Load model and tokenizer
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float16,
    device_map="auto"
)

# LoRA config
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

model = prepare_model_for_kbit_training(model)
model = get_peft_model(model, lora_config)

# Prepare data
def format_example(example):
    prompt = f"### Instruction:\n{example['instruction']}\n\n"
    if example.get('input'):
        prompt += f"### Input:\n{example['input']}\n\n"
    prompt += f"### Response:\n{example['output']}"
    return {"text": prompt}

# Load your data
training_data = [
    {"instruction": "Translate to French", "input": "Hello", "output": "Bonjour"},
    # Add more examples...
]

dataset = Dataset.from_list(training_data)
dataset = dataset.map(format_example)

def tokenize(example):
    return tokenizer(
        example["text"],
        truncation=True,
        max_length=MAX_LENGTH,
        padding="max_length"
    )

tokenized_dataset = dataset.map(tokenize, remove_columns=dataset.column_names)

# Training
training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    fp16=True,
    save_strategy="epoch",
    logging_steps=10,
    warmup_ratio=0.05,
    report_to="none"
)

trainer = Trainer(
    model=model,
    train_dataset=tokenized_dataset,
    args=training_args,
    data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False)
)

# Train
trainer.train()

# Save
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
```

## Data Preparation Best Practices

### 1. Quality Over Quantity

```python
# Good: Specific, high-quality examples
{
    "instruction": "Write a professional email declining a meeting",
    "input": "Meeting about Q4 budget review, scheduled for Friday 3pm",
    "output": "Subject: Unable to Attend Q4 Budget Review Meeting\n\nDear [Name],\n\nThank you for the invitation to the Q4 budget review meeting scheduled for Friday at 3:00 PM.\n\nUnfortunately, I have a prior commitment at that time and will be unable to attend. Could we possibly reschedule, or would you be able to share the meeting notes afterward?\n\nBest regards,\n[Your Name]"
}

# Bad: Vague, low-quality
{
    "instruction": "Write email",
    "input": "meeting",
    "output": "hi cant come bye"
}
```

### 2. Diverse Examples

Include variations:
- Different phrasings
- Edge cases
- Various formats

### 3. Consistent Format

```python
# Pick a format and stick with it
TEMPLATE = """### Instruction:
{instruction}

### Input:
{input}

### Response:
{output}"""
```

## Evaluation

### Compare Base vs Fine-Tuned

```python
def compare_models(prompt, base_model, finetuned_model, tokenizer):
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
    
    # Base model
    with torch.no_grad():
        base_output = base_model.generate(**inputs, max_new_tokens=100)
    
    # Fine-tuned model
    with torch.no_grad():
        ft_output = finetuned_model.generate(**inputs, max_new_tokens=100)
    
    print("Base Model:", tokenizer.decode(base_output[0]))
    print("Fine-tuned:", tokenizer.decode(ft_output[0]))
```

### Metrics

```python
from evaluate import load

# BLEU for translation
bleu = load("bleu")
results = bleu.compute(predictions=predictions, references=references)

# ROUGE for summarization
rouge = load("rouge")
results = rouge.compute(predictions=predictions, references=references)
```

## Cost Comparison

| Method | GPU Memory | Training Time | Cost |
|--------|-----------|---------------|------|
| Full Fine-tuning | 80GB+ | Hours | $$$ |
| LoRA | 16-24GB | Hours | $$ |
| QLoRA | 8-12GB | Hours | $ |
| OpenAI Fine-tuning | N/A | Minutes | $-$$ |

## When to Use What

**OpenAI Fine-tuning:**
- Quick turnaround needed
- No GPU infrastructure
- Smaller datasets

**LoRA/QLoRA:**
- Full control needed
- Privacy requirements
- Larger models (13B+)

**Full Fine-tuning:**
- Maximum performance needed
- Ample GPU resources
- Significant model changes

## Conclusion

Fine-tuning transforms general AI into specialized tools:

1. **Start simple** with OpenAI fine-tuning
2. **Scale up** to LoRA for more control
3. **Optimize** with QLoRA for limited resources
4. **Evaluate** thoroughly before deployment

The key is quality training data—garbage in, garbage out!

---

*Fine-tune responsibly! 🚀*
