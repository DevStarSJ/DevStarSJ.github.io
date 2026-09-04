---
layout: post
title: "LLM Evaluation in Production: Beyond Vibes and Spot Checks"
subtitle: "How to build a rigorous, automated evaluation pipeline for language model features before they reach your users"
date: 2026-03-06 10:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=1200"
catalog: true
tags:
  - LLM
  - AI Engineering
  - Evaluation
  - MLOps
  - Production AI
categories: ai
---

Shipping LLM-powered features is now table stakes. The hard part isn't getting a prototype working — it's knowing whether your model is performing well, catching regressions before users do, and maintaining quality as you iterate on prompts and models.

Most teams start with vibes: manually read some outputs, decide they look good, ship. This works until it doesn't — which usually means a degraded user experience that took days to discover.

This post covers how to build an evaluation pipeline that actually catches problems.

![Data visualization and analytics on a laptop](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800)
*Photo by Luke Chesser on Unsplash*

---

## The Evaluation Gap

Traditional software has clear correctness criteria. A function either returns the right value or it doesn't. You write a test, it passes or fails, done.

LLMs don't work like that. A response can be:
- **Correct** — answers the question accurately
- **Plausible but wrong** — sounds confident, is actually incorrect
- **Correct but unhelpful** — technically accurate, misses what the user needed
- **Format-correct but content-poor** — follows instructions, lacks substance

Measuring quality here requires judgment, which is why manual review *feels* like the only option. But judgment can be systematized.

---

## The Evaluation Stack

A mature LLM evaluation pipeline has four layers:

### 1. Deterministic Checks (Fast, Cheap, Reliable)

These are programmatic assertions that don't require an AI judge:

```python
def check_response(response: str) -> EvalResult:
    checks = [
        # Format checks
        lambda r: len(r) >= 50,                          # Not too short
        lambda r: len(r) <= 2000,                        # Not too long
        lambda r: not r.startswith("I cannot"),          # No refusal
        lambda r: "```" in r if expects_code else True,  # Code block present
        
        # Content checks
        lambda r: "error" not in r.lower(),              # No error bleed-through
        lambda r: company_name in r,                     # Brand compliance
        
        # Safety checks
        lambda r: not contains_pii(r),                   # No PII in output
    ]
    return all(check(response) for check in checks)
```

These run in microseconds and should gate every response. They catch obvious failures: empty responses, format violations, safety violations.

### 2. Reference-Based Evaluation

For tasks with a known-good answer (e.g., classification, extraction, structured data generation), compare against a golden dataset:

```python
# Example: entity extraction evaluation
golden = [
    {"input": "Email John at john@example.com", "expected": {"emails": ["john@example.com"]}},
    {"input": "Call Sarah on 555-1234", "expected": {"phones": ["555-1234"]}},
]

results = []
for item in golden:
    actual = extract_entities(item["input"])
    results.append({
        "precision": compute_precision(actual, item["expected"]),
        "recall": compute_recall(actual, item["expected"]),
    })
```

Maintain a golden dataset of 50–200 representative inputs. Run it on every prompt change. Track precision/recall/F1 over time.

### 3. LLM-as-Judge

For open-ended quality (summarization, tone, helpfulness), use a second LLM to evaluate the first:

{% raw %}
```python
JUDGE_PROMPT = """
You are evaluating the quality of an AI assistant's response.

User query: {query}
Assistant response: {response}

Rate the response on these dimensions (1-5):
- Accuracy: Does it answer correctly?
- Completeness: Does it cover what was asked?
- Conciseness: Is it appropriately brief?
- Helpfulness: Would a real user find this useful?

Respond in JSON: {{"accuracy": N, "completeness": N, "conciseness": N, "helpfulness": N, "overall": N, "reasoning": "..."}}
"""

def judge_response(query: str, response: str) -> dict:
    result = claude.complete(JUDGE_PROMPT.format(query=query, response=response))
    return json.loads(result)
```
{% endraw %}

**Important caveats:**
- LLM judges have biases (prefer their own responses, prefer longer outputs)
- Use a *different* model family as judge than the model you're evaluating
- Calibrate your judge against human ratings on a representative sample

### 4. Human Evaluation (Sparse but Essential)

You can't automate everything. Set up a lightweight human review loop:

- **A/B preference testing** — show two responses, human picks better one
- **Annotation on failures** — when automated evals flag a response, human reviews to calibrate
- **Monthly quality audits** — sample 50-100 recent responses, rate manually

This doesn't need to be a massive operation. 2-3 hours per week of structured human review will calibrate your automated evals and catch systematic issues.

---

## Building the Pipeline

Here's the architecture for a production eval pipeline:

```
[Production Logs] → [Sampling Layer] → [Eval Runner]
                                            ↓
                         ┌──────────────────────────────┐
                         │  Deterministic Checks         │
                         │  Reference Evals              │
                         │  LLM Judge (async)            │
                         └──────────┬───────────────────┘
                                    ↓
                         [Results DB] → [Dashboard]
                                    ↓
                         [Alerting on Regression]
```

### Sampling Strategy

You can't eval every request — it's too expensive. Sample intelligently:
- **100% of new/changed prompt variants** (before full rollout)
- **5-10% of production traffic** (continuous quality monitoring)
- **100% of flagged responses** (user feedback, low-confidence responses)
- **Stratified sample** — ensure coverage across user types, query categories

### The Regression Gate

The most valuable part of the pipeline is the **regression gate** in CI/CD:

```yaml
# .github/workflows/eval.yml
- name: Run LLM Eval Suite
  run: python eval/run_suite.py --dataset golden_v3.jsonl
  
- name: Check Regression Threshold
  run: |
    python eval/check_regression.py \
      --baseline ./eval/baselines/main.json \
      --current ./eval/results/latest.json \
      --threshold 0.05  # Allow max 5% regression on any metric
```

Merging a prompt change requires passing the eval suite. This is the single most impactful thing you can do to maintain quality over time.

---

## Metrics That Actually Matter

Don't track 20 metrics. Track 3-5 that map directly to user value:

| Metric | Measures | How |
|--------|----------|-----|
| Task Success Rate | Did it do the thing? | Reference eval or LLM judge |
| Format Compliance | Did it follow instructions? | Deterministic |
| Factual Accuracy | Is it correct? | RAG grounding check or human |
| Refusal Rate | Is it too conservative? | Keyword detection |
| Latency (P95) | Is it fast enough? | Infrastructure metrics |

Establish baselines. Track weekly. Alert on drops > 5%.

---

## Tools Worth Knowing

![AI model evaluation and benchmarking visualization](https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800)
*Photo by Google DeepMind on Unsplash*

### Evaluation Frameworks

**[LangSmith](https://smith.langchain.com/)** — If you're in the LangChain ecosystem, LangSmith provides tracing + evaluation with minimal setup. Good default choice.

**[Braintrust](https://www.braintrust.dev/)** — Purpose-built eval platform. Has a strong LLM-as-judge framework with calibration tooling.

**[Phoenix (Arize)](https://phoenix.arize.com/)** — Open source, self-hostable. Good for RAG tracing + retrieval quality evaluation.

**[Ragas](https://docs.ragas.io/)** — Specialized for RAG evaluation. If you have a retrieval-augmented system, Ragas metrics (faithfulness, answer relevance, context precision) are well-calibrated.

**DIY with Pytest** — For many teams, a well-organized pytest suite with golden datasets is sufficient and has zero vendor dependency.

### Observability

LLM calls need tracing just like API calls:
- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) — now stable for LLM traces
- [Langfuse](https://langfuse.com/) — open source LLM observability, self-hostable
- [Helicone](https://www.helicone.ai/) — lightweight proxy-based observability

---

## Common Mistakes

**1. Only evaluating the happy path**
Your golden dataset should include hard cases, edge cases, and adversarial inputs — not just typical queries.

**2. Evaluating offline but not online**
Offline evals on golden datasets miss distribution shift. You need production sampling to catch "this works great on our test data but real users ask differently."

**3. Treating LLM judge scores as ground truth**
They're noisy. Use them for trends and regression detection, not absolute quality measurement.

**4. Not versioning your prompts**
Every eval needs to be tied to a specific prompt version. Use semantic versioning for prompts just as you would for code.

**5. Evaluating too infrequently**
Run evals on every PR that touches prompts. Don't let changes accumulate before you measure.

---

## Getting Started

If you have no eval infrastructure today, here's the minimal starting point:

1. **Write 30-50 golden examples** — real inputs with verified expected outputs or quality ratings
2. **Add deterministic checks** — length, format, safety keywords
3. **Set up LangSmith or Langfuse** for tracing
4. **Write a 10-example regression test** in pytest that runs in CI
5. **Sample 5% of production responses** and spot-check weekly

You can build from there. The key is that evaluation becomes a habit, not an afterthought.

---

## Resources

- [HELM — Holistic Evaluation of Language Models (Stanford)](https://crfm.stanford.edu/helm/)
- [Building LLM Evals at Scale (Shreya Shankar)](https://www.sh-reya.com/blog/ai-engineering-evals/)
- [Ragas Documentation](https://docs.ragas.io/)
- [OpenTelemetry GenAI Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
