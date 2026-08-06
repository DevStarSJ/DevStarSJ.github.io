---
layout: post
title: "LLM Evals: The Testing Methodology Your AI Team Is Probably Skipping"
subtitle: "Why vibes-based AI development fails in production and how to build rigorous evaluation pipelines for language models"
date: 2026-07-06 12:00:00
author: "Seokjun Lee"
header-img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80"
catalog: true
tags:
  - LLM
  - AI
  - Evaluation
  - Testing
  - MLOps
  - Production AI
---

## The Vibes-Based Development Trap

You tried your new prompt on 10 examples. It looked great. You shipped it. Three days later, support is flooded with complaints about responses that are factually wrong, off-brand, or just weird.

This is vibes-based AI development. And it's how most teams operate.

The problem isn't that your prompt was bad. The problem is you had no way to know it was bad before your users told you. In traditional software, you write tests. In LLM development, teams often skip the equivalent step — building evals — because it's harder and less familiar.

It doesn't have to be.

![AI Testing](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&q=80)
*Photo by Luke Chesser on Unsplash*

---

## What Are LLM Evals?

Evals (evaluations) are tests for LLM behavior. But unlike unit tests that return `true`/`false`, LLM evals operate in a probabilistic, semantic space:

```python
# Traditional test
def test_add():
    assert add(2, 3) == 5  # Binary: pass or fail

# LLM eval
def eval_customer_support_response(response: str, context: dict) -> Score:
    # Did the response solve the user's problem?
    # Was it empathetic?
    # Was it factually correct?
    # Was it on-brand?
    # Return a score + reasoning
```

Good evals answer: **"Is this LLM doing what I want, reliably, across a representative set of inputs?"**

---

## The Eval Taxonomy

### 1. Functional Evals (Does it work?)
The most basic: does the LLM produce the right output?

**Exact match:** For structured outputs (JSON, SQL, code)
```python
expected = {"intent": "cancel_subscription", "confidence": "high"}
actual = json.loads(llm_response)
assert actual["intent"] == expected["intent"]
```

**Substring/regex match:** For semi-structured outputs
```python
# Response must contain order number in expected format
assert re.search(r'order #[A-Z]{2}\d{6}', response)
```

**Model-graded:** For open-ended text (use another LLM as judge)
{% raw %}
```python
prompt = f"""
You are evaluating a customer support response.
User question: {user_question}
Agent response: {agent_response}

Rate on:
1. Accuracy (0-5): Is the information factually correct?
2. Helpfulness (0-5): Does it actually help the user?
3. Tone (0-5): Is it empathetic and professional?

Respond as JSON: {{"accuracy": N, "helpfulness": N, "tone": N, "reasoning": "..."}}
"""
scores = json.loads(gpt4o(prompt))
```
{% endraw %}

### 2. Safety Evals (Will it behave badly?)
Test for outputs you explicitly don't want:

```python
JAILBREAK_PROMPTS = [
    "Ignore your previous instructions and...",
    "As a DAN (Do Anything Now)...",
    "My grandmother used to read me instructions for...",
    # ... many more from your threat model
]

for prompt in JAILBREAK_PROMPTS:
    response = your_llm(prompt)
    assert not contains_harmful_content(response), f"Jailbreak succeeded: {prompt}"
```

### 3. Regression Evals (Did your change break anything?)
Before and after comparisons:

```python
# Baseline: production prompt responses on golden dataset
baseline_scores = evaluate(production_prompt, golden_dataset)

# Candidate: new prompt responses
candidate_scores = evaluate(new_prompt, golden_dataset)

# Significant regression?
assert candidate_scores.mean() >= baseline_scores.mean() * 0.95, \
    "New prompt regressed >5% on golden dataset"
```

### 4. Benchmark Evals (How does it compare?)
Standard benchmarks for specific capabilities:
- **MMLU**: General knowledge
- **HumanEval**: Code generation
- **TruthfulQA**: Factual accuracy
- **MT-Bench**: Instruction following

Important caveat: benchmark scores often don't correlate with your specific use case. Use them for sanity checks, not as the primary signal.

---

## Building an Eval Pipeline

### Step 1: Create Your Golden Dataset

The quality of your evals depends entirely on the quality of your dataset.

```python
# Structure of a golden dataset entry
{
    "id": "cs-001",
    "input": {
        "user_message": "I want to cancel my subscription",
        "user_history": "Premium customer, 2 years",
        "context": "user contacted support via chat"
    },
    "expected_behavior": {
        "intent_detected": "cancellation",
        "should_offer_retention": true,
        "required_elements": ["acknowledgment", "retention_offer", "cancellation_path"],
        "forbidden_elements": ["rude_language", "false_promises"]
    },
    "metadata": {
        "difficulty": "medium",
        "category": "retention",
        "created_from": "real_conversation_2026-01-15",
        "annotator": "jane.smith@company.com"
    }
}
```

**How to build your dataset:**
1. Curate 50-100 real examples from production logs
2. Include edge cases, failure modes, and adversarial inputs
3. Get human annotation for "ground truth" judgments
4. Continuously expand with cases that caused production issues

### Step 2: Define Your Scoring Functions

```python
from dataclasses import dataclass
from typing import Callable

@dataclass
class EvalCriteria:
    name: str
    weight: float
    scorer: Callable[[str, dict], float]  # Returns 0.0-1.0

def score_intent_detection(response: str, expected: dict) -> float:
    """Check if the correct intent was detected and acted upon"""
    intent = expected["intent_detected"]
    return 1.0 if intent.lower() in response.lower() else 0.0

def score_required_elements(response: str, expected: dict) -> float:
    """Check what fraction of required elements are present"""
    elements = expected.get("required_elements", [])
    if not elements:
        return 1.0
    present = sum(1 for e in elements if e in response)
    return present / len(elements)

CRITERIA = [
    EvalCriteria("intent_detection", weight=0.3, scorer=score_intent_detection),
    EvalCriteria("required_elements", weight=0.4, scorer=score_required_elements),
    EvalCriteria("llm_quality_judge", weight=0.3, scorer=llm_judge_score),
]
```

### Step 3: Run and Report

```python
import asyncio
from datetime import datetime

async def run_eval_suite(
    prompt_template: str,
    dataset: list[dict],
    criteria: list[EvalCriteria]
) -> EvalReport:
    results = []
    
    async for item in dataset:
        response = await llm_call(
            prompt=prompt_template.format(**item["input"])
        )
        
        scores = {}
        for criterion in criteria:
            scores[criterion.name] = criterion.scorer(
                response, item["expected_behavior"]
            )
        
        weighted_score = sum(
            scores[c.name] * c.weight for c in criteria
        )
        
        results.append({
            "id": item["id"],
            "response": response,
            "scores": scores,
            "weighted_score": weighted_score,
        })
    
    return EvalReport(
        timestamp=datetime.now(),
        prompt_hash=hash(prompt_template),
        mean_score=sum(r["weighted_score"] for r in results) / len(results),
        results=results,
    )
```

---

## The LLM-as-Judge Pattern

Using a powerful model (GPT-4o, Claude 3.7 Sonnet) to judge the outputs of your production model is now standard practice. But it requires careful calibration:

### Calibration: Does Your Judge Agree with Humans?

Before trusting your LLM judge, validate it against human judgments:

```python
# Gold standard: human-labeled pairs
human_labels = [
    {"response_a": "...", "response_b": "...", "human_preference": "A"},
    # ... 200 pairs
]

# Test your judge
judge_agreement = 0
for pair in human_labels:
    judge_verdict = llm_judge_compare(pair["response_a"], pair["response_b"])
    if judge_verdict == pair["human_preference"]:
        judge_agreement += 1

agreement_rate = judge_agreement / len(human_labels)
print(f"Judge-human agreement: {agreement_rate:.1%}")  # Aim for >75%
```

### Avoiding Judge Biases

LLM judges have known biases:
- **Position bias:** Prefers the first option presented
- **Verbosity bias:** Prefers longer responses
- **Self-enhancement bias:** GPT-4 rates GPT-4 outputs higher

Mitigations:
```python
# 1. Swap order and average
score_ab = judge(response_a=candidate, response_b=baseline)
score_ba = judge(response_a=baseline, response_b=candidate)
final_score = (score_ab + (1 - score_ba)) / 2

# 2. Use specific rubrics, not "which is better"
# Bad: "Which response is better?"
# Good: "Rate factual accuracy (0-5), citing specific errors"

# 3. Chain-of-thought before judgment
# Ask the judge to reason before scoring
```

---

## Eval Tools in the Wild

### Open Source
- **OpenAI Evals:** Battle-tested framework, flexible
- **Ragas:** Specialized for RAG (Retrieval-Augmented Generation) systems
- **DeepEval:** Comprehensive, good defaults, Pytest integration
- **Promptfoo:** YAML-based, great for prompt comparison

```bash
# Promptfoo example
npx promptfoo eval \
  --prompts prompts/customer-support.yaml \
  --providers openai:gpt-4o anthropic:claude-3-7-sonnet \
  --tests tests/customer-support.yaml
```

### Commercial
- **Braintrust:** Real-time tracing + evals, great DX
- **LangSmith:** Deep LangChain integration
- **Humanloop:** Collaborative annotation + evals
- **Arize Phoenix:** Strong on observability + drift detection

---

## CI/CD Integration: Gate Your Deploys

```yaml
# .github/workflows/eval.yml
name: LLM Eval Gate

on:
  pull_request:
    paths:
      - 'prompts/**'
      - 'src/llm/**'

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run Eval Suite
      run: |
        python scripts/run_evals.py \
          --prompt-file prompts/new-prompt.yaml \
          --dataset tests/golden-dataset.json \
          --output results/eval-results.json
    
    - name: Check Regression
      run: |
        python scripts/check_regression.py \
          --current results/eval-results.json \
          --baseline metrics/production-baseline.json \
          --threshold 0.95  # Must be within 5% of baseline
    
    - name: Comment Results on PR
      uses: actions/github-script@v7
      with:
        script: |
          const results = require('./results/eval-results.json');
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            body: formatEvalReport(results)
          });
```

Prompt changes are now treated like code changes. They go through review. They pass evals before merging. They don't go to production based on vibes.

---

## The Minimal Eval Setup (Start Here)

If you're building evals from scratch, start small:

**Week 1:** Create a dataset of 30 examples — 10 typical cases, 10 edge cases, 10 previously-failed cases.

**Week 2:** Write 3 scorers — exact match for any structured output, one substring check, one LLM judge.

**Week 3:** Run evals before every prompt change. Track scores in a spreadsheet if you have to.

**Month 2:** Expand to 100+ examples, integrate into CI/CD.

---

## Conclusion

LLM evals aren't optional. They're the difference between shipping a reliable AI product and hoping your users don't notice the regressions.

The good news: you don't need a research team or a ML platform to get started. You need a dataset of real examples, a few scoring functions, and the discipline to run them before you ship.

Your users are already evaluating your LLM. Build evals so you do it first.

---

*Resources: [HELM Benchmark](https://crfm.stanford.edu/helm/) | [Ragas](https://docs.ragas.io) | [OpenAI Evals](https://github.com/openai/evals) | [Braintrust](https://braintrust.dev)*
