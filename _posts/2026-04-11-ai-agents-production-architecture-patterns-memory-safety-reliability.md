---
layout: post
title: "AI Agents in Production: Architecture Patterns for Reliable, Safe, and Scalable Agentic Systems"
subtitle: "From experimental demos to production-grade agents: memory management, tool calling, human-in-the-loop, and failure recovery"
date: 2026-04-11 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80"
categories: [AI, Architecture]
tags: [AI Agents, LLM, Production AI, Architecture, MCP, Tool Calling, Agent Systems]
---

## Introduction

In 2024, AI agents were demos. In 2025, they were experiments. In 2026, they're running in production, handling real customer interactions, executing code, making API calls, and managing workflows. The engineering challenges have shifted: we're no longer asking "can we build agents?" but "how do we build agents that are reliable, safe, and cost-effective at scale?"

This post distills lessons from running agentic systems in production: what architectures work, what fails, and the patterns that have emerged as best practices.

![Robot and Human Collaboration](https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=900&auto=format&fit=crop&q=80)

*Photo by Tara Winstead on Unsplash*

---

## The Production Agent Stack

A production-grade agent system has more moving parts than a simple LLM API call:

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Orchestrator                        │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────┐ │
│  │  Planning   │   │  Execution   │   │   Monitoring    │ │
│  │  Engine     │   │  Engine      │   │   & Safety      │ │
│  └──────┬──────┘   └──────┬───────┘   └────────┬────────┘ │
└─────────┼─────────────────┼────────────────────┼──────────┘
          │                 │                    │
    ┌─────▼──────┐   ┌──────▼───────┐   ┌───────▼────────┐
    │    LLM     │   │  Tool Layer  │   │  Human-in-Loop │
    │  Provider  │   │  (MCP/API)   │   │  Checkpoint    │
    └────────────┘   └──────────────┘   └────────────────┘
          │
    ┌─────▼──────┐
    │   Memory   │
    │  (Short +  │
    │   Long)    │
    └────────────┘
```

---

## Pattern 1: The Hierarchical Agent Architecture

For complex tasks, avoid monolithic "do everything" agents. Instead, structure them hierarchically:

```python
from anthropic import Anthropic
from typing import Any
import json

client = Anthropic()

class PlannerAgent:
    """High-level planner that breaks tasks into subtasks."""
    
    SYSTEM_PROMPT = """You are a planning agent. Given a high-level goal,
    you break it down into specific, actionable subtasks. You do NOT execute tasks —
    you only plan. Return a JSON array of subtasks with:
    - id: string
    - description: string
    - required_tools: list of tool names needed
    - depends_on: list of subtask ids that must complete first
    - risk_level: "low" | "medium" | "high"
    """
    
    def plan(self, goal: str, available_tools: list[str]) -> list[dict]:
        response = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=2048,
            system=self.SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": f"Goal: {goal}\nAvailable tools: {available_tools}"
            }]
        )
        return json.loads(response.content[0].text)


class ExecutorAgent:
    """Executes individual subtasks using available tools."""
    
    def execute(self, task: dict, context: dict, tools: list) -> dict:
        messages = [
            {"role": "user", "content": self._build_prompt(task, context)}
        ]
        
        # Agentic loop
        while True:
            response = client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=4096,
                tools=tools,
                messages=messages
            )
            
            if response.stop_reason == "end_turn":
                return {"status": "complete", "output": response.content[-1].text}
            
            if response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        result = self._execute_tool(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": str(result)
                        })
                
                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": tool_results})
    
    def _execute_tool(self, name: str, input: dict) -> Any:
        # Dispatch to actual tool implementations
        raise NotImplementedError


class OrchestratorAgent:
    """Top-level orchestrator managing the full workflow."""
    
    def __init__(self, tools: list):
        self.planner = PlannerAgent()
        self.executor = ExecutorAgent()
        self.tools = tools
        self.human_checkpoint = HumanCheckpoint()
    
    async def run(self, goal: str) -> dict:
        # 1. Plan
        tool_names = [t["name"] for t in self.tools]
        plan = self.planner.plan(goal, tool_names)
        
        # 2. Check with human if high-risk tasks present
        high_risk = [t for t in plan if t["risk_level"] == "high"]
        if high_risk:
            approved = await self.human_checkpoint.review(high_risk)
            if not approved:
                return {"status": "cancelled", "reason": "human rejected high-risk tasks"}
        
        # 3. Execute in dependency order
        results = {}
        for task in self._topological_sort(plan):
            context = {dep_id: results[dep_id] for dep_id in task["depends_on"]}
            results[task["id"]] = self.executor.execute(task, context, self.tools)
        
        return {"status": "complete", "results": results}
```

---

## Pattern 2: Memory Architecture

Agents without memory are stateless; agents without memory management become expensive and unreliable. The standard 2026 approach uses three tiers:

```python
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Optional
import json

@dataclass
class Memory:
    content: str
    importance: float  # 0.0 - 1.0
    created_at: datetime
    last_accessed: datetime
    access_count: int
    memory_type: str  # "episodic" | "semantic" | "procedural"


class ThreeTierMemoryManager:
    """
    Tier 1: Working memory  — current conversation context (fast, ephemeral)
    Tier 2: Session memory  — within-session facts and decisions (medium-term)
    Tier 3: Long-term memory — persisted, vector-searched (permanent)
    """
    
    def __init__(self, vector_store, max_working_tokens: int = 8000):
        self.working_memory: list[dict] = []    # Recent messages
        self.session_facts: dict = {}           # Key facts extracted this session
        self.vector_store = vector_store        # Long-term storage
        self.max_working_tokens = max_working_tokens
    
    def add_to_working(self, message: dict):
        self.working_memory.append(message)
        self._trim_working_memory()
    
    def extract_session_facts(self, llm_response: str):
        """Ask the LLM to extract important facts from its own response."""
        extraction_prompt = f"""From this response, extract any facts that should be 
        remembered for this conversation. Return as JSON key-value pairs.
        
        Response: {llm_response}
        
        Facts (JSON):"""
        
        facts_response = client.messages.create(
            model="claude-haiku-4-5",  # Use cheap model for extraction
            max_tokens=512,
            messages=[{"role": "user", "content": extraction_prompt}]
        )
        
        try:
            new_facts = json.loads(facts_response.content[0].text)
            self.session_facts.update(new_facts)
        except json.JSONDecodeError:
            pass
    
    def retrieve_relevant(self, query: str, top_k: int = 5) -> list[Memory]:
        """Search long-term memory for relevant context."""
        return self.vector_store.search(query, top_k=top_k)
    
    def build_context_for_llm(self, query: str) -> list[dict]:
        """Build the message list for an LLM call with appropriate memory included."""
        messages = []
        
        # Inject relevant long-term memories as a system note
        relevant_memories = self.retrieve_relevant(query)
        if relevant_memories:
            memory_text = "\n".join([f"- {m.content}" for m in relevant_memories])
            messages.append({
                "role": "user",
                "content": f"[Relevant context from previous interactions:\n{memory_text}]"
            })
            messages.append({"role": "assistant", "content": "Understood, I'll keep that context in mind."})
        
        # Add session facts
        if self.session_facts:
            messages.append({
                "role": "user",
                "content": f"[Facts established this session: {json.dumps(self.session_facts)}]"
            })
            messages.append({"role": "assistant", "content": "Got it."})
        
        # Add working memory (recent conversation)
        messages.extend(self.working_memory)
        
        return messages
    
    def _trim_working_memory(self):
        """Remove oldest messages when working memory exceeds token budget."""
        # Rough estimate: 4 chars ≈ 1 token
        while self._estimate_tokens() > self.max_working_tokens and len(self.working_memory) > 2:
            # Always keep system message and first user turn
            self.working_memory.pop(1)
    
    def _estimate_tokens(self) -> int:
        total = sum(len(str(m.get("content", ""))) for m in self.working_memory)
        return total // 4
```

---

## Pattern 3: Human-in-the-Loop Checkpoints

The most reliable production agents are not fully autonomous — they pause at critical junctions for human review:

```python
from enum import Enum
import asyncio

class RiskLevel(Enum):
    LOW = "low"         # Auto-approve
    MEDIUM = "medium"   # Notify but proceed
    HIGH = "high"       # Require explicit approval
    CRITICAL = "critical"  # Block until approved

class HumanCheckpoint:
    """Manages human oversight for agentic operations."""
    
    def __init__(self, notification_service, approval_timeout_seconds: int = 3600):
        self.notifications = notification_service
        self.approval_timeout = approval_timeout_seconds
        self.pending_approvals: dict[str, asyncio.Event] = {}
    
    async def request_approval(
        self,
        action: str,
        description: str,
        risk: RiskLevel,
        metadata: dict = {}
    ) -> bool:
        if risk == RiskLevel.LOW:
            return True
        
        if risk == RiskLevel.MEDIUM:
            await self.notifications.send(
                f"⚡ Agent proceeding with: {action}\n{description}"
            )
            return True
        
        # HIGH and CRITICAL require explicit approval
        approval_id = self._generate_id()
        approval_event = asyncio.Event()
        self.pending_approvals[approval_id] = {"event": approval_event, "result": None}
        
        await self.notifications.send(
            f"🔐 Agent approval required:\n"
            f"Action: {action}\n"
            f"Risk: {risk.value}\n"
            f"Details: {description}\n"
            f"Approval ID: {approval_id}\n"
            f"Reply 'approve {approval_id}' or 'reject {approval_id}'"
        )
        
        try:
            await asyncio.wait_for(approval_event.wait(), timeout=self.approval_timeout)
            return self.pending_approvals[approval_id]["result"] == "approved"
        except asyncio.TimeoutError:
            return False  # Timeout = reject
        finally:
            del self.pending_approvals[approval_id]
    
    def handle_response(self, approval_id: str, response: str):
        if approval_id in self.pending_approvals:
            self.pending_approvals[approval_id]["result"] = response
            self.pending_approvals[approval_id]["event"].set()
```

---

## Pattern 4: Agent Observability

Agents are black boxes by default. Make them transparent:

```python
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode
import time

tracer = trace.getTracer("agent-system")

class InstrumentedAgent:
    """Wrapper that adds OTel tracing to any agent."""
    
    def __init__(self, agent, name: str):
        self.agent = agent
        self.name = name
    
    def execute(self, task: str, **kwargs):
        with tracer.start_as_current_span(f"{self.name}.execute") as span:
            span.set_attributes({
                "agent.name": self.name,
                "agent.task": task[:200],  # Truncate long tasks
                "agent.model": getattr(self.agent, 'model', 'unknown'),
            })
            
            start = time.time()
            llm_calls = 0
            tool_calls = 0
            
            try:
                # Monkey-patch to count calls
                original_call = self.agent._call_llm
                def counted_llm_call(*args, **kwargs):
                    nonlocal llm_calls
                    llm_calls += 1
                    return original_call(*args, **kwargs)
                self.agent._call_llm = counted_llm_call
                
                result = self.agent.execute(task, **kwargs)
                span.set_status(Status(StatusCode.OK))
                return result
                
            except Exception as e:
                span.record_exception(e)
                span.set_status(Status(StatusCode.ERROR, str(e)))
                raise
                
            finally:
                duration_ms = (time.time() - start) * 1000
                span.set_attributes({
                    "agent.llm_calls": llm_calls,
                    "agent.tool_calls": tool_calls,
                    "agent.duration_ms": duration_ms,
                })
```

---

## Failure Modes to Watch For

Based on production experience, these are the most common failure patterns:

| Failure | Cause | Mitigation |
|---------|-------|------------|
| **Infinite loops** | Agent repeats same tool calls | Max iteration limit + loop detection |
| **Context overflow** | Long tasks exceed context window | Hierarchical summarization |
| **Tool hallucination** | Agent invents non-existent tool params | Strict JSON schema validation |
| **Cost explosion** | Unbounded recursion | Token budget + cost alerting |
| **Prompt injection** | Malicious content in tool results | Sanitize tool outputs |
| **Stale state** | Agent acts on outdated information | TTL on cached context |

---

## Production Checklist

Before deploying an agent to production:

- [ ] **Rate limiting**: Max LLM calls per agent run
- [ ] **Cost budgets**: Alert at 50%, hard stop at 100%
- [ ] **Timeout**: Global timeout per agent task (not per LLM call)
- [ ] **Idempotency**: Can you safely retry a failed run?
- [ ] **Audit log**: Every tool call and LLM response recorded
- [ ] **Human escalation**: Clear path for agent to ask for help
- [ ] **Kill switch**: Ability to halt running agents immediately
- [ ] **Dry-run mode**: Test agent plans before real execution
- [ ] **Output validation**: Structured output parsing with error handling
- [ ] **Graceful degradation**: Agent behavior when tools are unavailable

---

Agentic AI is maturing fast. The patterns that separate production systems from demos are less about AI capability and more about engineering discipline: memory management, observability, human oversight, and failure handling. Build the scaffolding right, and the AI can do remarkable things.

---

*Building AI agents? Share your architecture challenges in the comments — we'd love to feature real-world case studies.*
