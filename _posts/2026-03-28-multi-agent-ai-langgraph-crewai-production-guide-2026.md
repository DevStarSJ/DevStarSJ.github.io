---
layout: post
title: "Multi-Agent AI Systems with LangGraph & CrewAI: Production Guide 2026"
subtitle: "Build sophisticated agent orchestration systems with graph-based workflows, role specialization, and fault tolerance"
date: 2026-03-28 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1600&auto=format&fit=crop"
catalog: true
tags:
  - AI
  - LangGraph
  - CrewAI
  - Multi-Agent
  - LLM
  - Python
categories: ai
---

# Multi-Agent AI Systems with LangGraph & CrewAI: Production Guide 2026

Single LLM calls can only take you so far. Complex tasks — research, code generation pipelines, autonomous workflows — require multiple specialized agents working in concert. LangGraph and CrewAI have emerged as the dominant frameworks for orchestrating these multi-agent systems, each with distinct philosophies and strengths. This guide dives deep into both, covering architecture patterns, production considerations, and when to use which.

![Multi-Agent AI Architecture](https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&auto=format&fit=crop)
*Photo by Steve Johnson on Unsplash*

---

## Why Multi-Agent Systems?

Single-agent architectures hit fundamental limits:

- **Context window constraints**: Complex tasks exceed what fits in a single prompt
- **Specialization**: General agents are mediocre at specific skills
- **Parallelism**: Independent subtasks should run concurrently
- **Reliability**: Specialized agents can verify each other's work
- **Scalability**: Different agents can use different (cheaper) models

### The Agent Taxonomy

```
┌─────────────────────────────────────────────────────────────┐
│                     Orchestrator Agent                       │
│    (Plans, delegates, coordinates, validates results)        │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    ┌─────────┐  ┌─────────┐  ┌─────────┐
    │Research │  │  Code   │  │ Review  │
    │  Agent  │  │  Agent  │  │  Agent  │
    └────┬────┘  └────┬────┘  └────┬────┘
         │            │            │
    [Web Search] [Code Exec]  [Static Analysis]
    [RAG Query]  [Test Runner] [Security Scan]
```

---

## LangGraph: Graph-Based Agent Orchestration

LangGraph models agent workflows as directed graphs (or DAGs), giving you precise control over execution flow, state management, and conditional branching.

### Core Concepts

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_anthropic import ChatAnthropic
from typing import TypedDict, Annotated, List
import operator

# 1. Define shared state
class AgentState(TypedDict):
    messages: Annotated[List[dict], operator.add]
    research_results: str
    code_draft: str
    review_feedback: str
    iteration_count: int
    final_output: str

# 2. Initialize models
orchestrator_llm = ChatAnthropic(model="claude-sonnet-4-5")
researcher_llm = ChatAnthropic(model="claude-haiku-3-5")  # cheaper for research
coder_llm = ChatAnthropic(model="claude-sonnet-4-5")

# 3. Define node functions
async def research_node(state: AgentState) -> AgentState:
    """Gather relevant information"""
    task = state["messages"][-1]["content"]
    
    response = await researcher_llm.ainvoke([
        {"role": "system", "content": "You are a research specialist. Gather comprehensive information about the given topic."},
        {"role": "user", "content": f"Research this task: {task}"}
    ])
    
    return {"research_results": response.content}

async def code_node(state: AgentState) -> AgentState:
    """Generate code based on research"""
    response = await coder_llm.ainvoke([
        {"role": "system", "content": "You are an expert software engineer. Write clean, production-ready code."},
        {"role": "user", "content": f"""
Task: {state['messages'][-1]['content']}
Research context: {state['research_results']}
        
Write the implementation. If this is a revision, previous feedback was:
{state.get('review_feedback', 'N/A')}
        """}
    ])
    
    return {"code_draft": response.content, "iteration_count": state.get("iteration_count", 0) + 1}

async def review_node(state: AgentState) -> AgentState:
    """Review code and provide feedback"""
    response = await orchestrator_llm.ainvoke([
        {"role": "system", "content": "You are a senior code reviewer. Check for correctness, security, and best practices."},
        {"role": "user", "content": f"""
Review this code:
{state['code_draft']}

Respond with either:
- 'APPROVED: <brief explanation>' if the code is production-ready
- 'REVISE: <specific issues to fix>' if improvements are needed
        """}
    ])
    
    return {"review_feedback": response.content}

def should_revise(state: AgentState) -> str:
    """Conditional edge: route based on review outcome"""
    feedback = state.get("review_feedback", "")
    iteration_count = state.get("iteration_count", 0)
    
    if "APPROVED" in feedback or iteration_count >= 3:
        return "finalize"
    return "revise"

async def finalize_node(state: AgentState) -> AgentState:
    """Prepare final output"""
    return {"final_output": state["code_draft"]}

# 4. Build the graph
def build_coding_agent():
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("research", research_node)
    workflow.add_node("code", code_node)
    workflow.add_node("review", review_node)
    workflow.add_node("finalize", finalize_node)
    
    # Define edges
    workflow.set_entry_point("research")
    workflow.add_edge("research", "code")
    workflow.add_edge("code", "review")
    workflow.add_conditional_edges(
        "review",
        should_revise,
        {
            "revise": "code",     # loop back for revision
            "finalize": "finalize"  # done
        }
    )
    workflow.add_edge("finalize", END)
    
    # Add checkpointing for resumability
    memory = MemorySaver()
    return workflow.compile(checkpointer=memory)

# 5. Run the agent
async def run_coding_task(task: str):
    agent = build_coding_agent()
    
    config = {"configurable": {"thread_id": "task-001"}}
    
    result = await agent.ainvoke(
        {"messages": [{"role": "user", "content": task}]},
        config=config
    )
    
    return result["final_output"]
```

### LangGraph Streaming

```python
async def run_with_streaming(task: str):
    agent = build_coding_agent()
    config = {"configurable": {"thread_id": "stream-001"}}
    
    async for event in agent.astream_events(
        {"messages": [{"role": "user", "content": task}]},
        config=config,
        version="v2"
    ):
        event_type = event["event"]
        
        if event_type == "on_chat_model_stream":
            chunk = event["data"]["chunk"]
            print(chunk.content, end="", flush=True)
        
        elif event_type == "on_chain_end":
            node_name = event.get("name", "unknown")
            print(f"\n✅ Node '{node_name}' completed")
```

### Human-in-the-Loop with LangGraph

```python
from langgraph.types import interrupt, Command

async def approval_node(state: AgentState) -> AgentState:
    """Pause for human approval before executing"""
    
    # Interrupt execution and wait for human input
    human_decision = interrupt({
        "question": "Approve this action?",
        "context": state["code_draft"],
        "options": ["approve", "reject", "modify"]
    })
    
    if human_decision["decision"] == "approve":
        return state
    elif human_decision["decision"] == "modify":
        return {"code_draft": human_decision["modified_code"]}
    else:
        raise ValueError("Task rejected by human reviewer")

# Resume after human input
async def resume_after_approval(thread_id: str, decision: dict):
    agent = build_coding_agent()
    config = {"configurable": {"thread_id": thread_id}}
    
    result = await agent.ainvoke(
        Command(resume=decision),
        config=config
    )
    return result
```

---

## CrewAI: Role-Based Agent Teams

CrewAI takes a more declarative, role-oriented approach. You define agents by their roles, goals, and backstories, then assign them tasks within a crew.

### Basic Crew Setup

```python
from crewai import Agent, Task, Crew, Process
from crewai_tools import SerperDevTool, CodeInterpreterTool
from langchain_anthropic import ChatAnthropic

# Define specialized agents
researcher = Agent(
    role="Senior Research Analyst",
    goal="Uncover comprehensive information about AI and tech trends",
    backstory="""You are a veteran technology analyst with 15 years of experience 
    tracking emerging technologies. You excel at synthesizing complex information 
    from multiple sources into clear, actionable insights.""",
    tools=[SerperDevTool()],
    llm=ChatAnthropic(model="claude-haiku-3-5"),
    verbose=True,
    allow_delegation=False,
    max_iter=5
)

writer = Agent(
    role="Technical Content Writer",
    goal="Craft clear, engaging technical content that educates developers",
    backstory="""You are a former software engineer turned technical writer.
    You bridge the gap between complex technical concepts and practical 
    understanding, writing for developers who want depth without jargon.""",
    llm=ChatAnthropic(model="claude-sonnet-4-5"),
    verbose=True,
    allow_delegation=True
)

reviewer = Agent(
    role="Technical Accuracy Reviewer",
    goal="Ensure all technical claims are accurate and code examples work correctly",
    backstory="""You are a meticulous senior engineer who has reviewed thousands 
    of technical documents. You catch errors others miss and ensure code examples 
    are copy-paste ready.""",
    tools=[CodeInterpreterTool()],
    llm=ChatAnthropic(model="claude-sonnet-4-5"),
    verbose=True
)

# Define tasks
research_task = Task(
    description="""Research the latest developments in {topic}.
    Focus on:
    1. Key innovations in the last 6 months
    2. Practical use cases and adoption metrics
    3. Comparison with alternatives
    4. Expert opinions and benchmarks
    
    Produce a comprehensive research brief of 800-1000 words.""",
    expected_output="A detailed research brief with sources, key findings, and relevant statistics",
    agent=researcher
)

writing_task = Task(
    description="""Using the research brief, write a comprehensive technical blog post about {topic}.
    Requirements:
    - 2000-2500 words
    - Include at least 3 code examples in Python
    - Structure: Introduction, Core Concepts, Implementation, Best Practices, Conclusion
    - SEO-optimized with relevant keywords
    - Target audience: mid-to-senior level developers""",
    expected_output="A complete, publication-ready technical blog post in Markdown format",
    agent=writer,
    context=[research_task]  # Writer uses researcher's output
)

review_task = Task(
    description="""Review the technical blog post for:
    1. Technical accuracy (verify all claims)
    2. Code correctness (test each example)
    3. Clarity and readability
    4. SEO optimization
    
    Provide specific corrections and approve the final version.""",
    expected_output="Reviewed and corrected blog post with approval status",
    agent=reviewer,
    context=[writing_task]
)

# Assemble and run the crew
content_crew = Crew(
    agents=[researcher, writer, reviewer],
    tasks=[research_task, writing_task, review_task],
    process=Process.sequential,  # or Process.hierarchical
    verbose=True,
    memory=True,  # Enable crew-wide memory
    embedder={
        "provider": "openai",
        "config": {"model": "text-embedding-3-small"}
    }
)

result = content_crew.kickoff(inputs={"topic": "Rust async runtime internals"})
print(result.raw)
```

### Hierarchical Process with Manager

```python
from crewai import Agent, Crew, Process

# Manager agent orchestrates the team
manager = Agent(
    role="Project Manager",
    goal="Coordinate the team to deliver high-quality software components",
    backstory="Experienced engineering manager who excels at breaking down complex projects",
    llm=ChatAnthropic(model="claude-sonnet-4-5"),
    allow_delegation=True  # Manager can delegate to others
)

# Hierarchical crew: manager delegates to specialists
dev_crew = Crew(
    agents=[researcher, writer, reviewer],
    tasks=[research_task, writing_task, review_task],
    process=Process.hierarchical,
    manager_agent=manager,  # Manager coordinates
    verbose=True
)
```

### CrewAI with Custom Tools

```python
from crewai.tools import BaseTool
from pydantic import BaseModel, Field
import subprocess

class CodeRunnerInput(BaseModel):
    code: str = Field(description="Python code to execute")
    timeout: int = Field(default=30, description="Execution timeout in seconds")

class SafeCodeRunner(BaseTool):
    name: str = "Safe Code Runner"
    description: str = "Execute Python code safely in a sandboxed environment"
    args_schema: type[BaseModel] = CodeRunnerInput
    
    def _run(self, code: str, timeout: int = 30) -> str:
        try:
            result = subprocess.run(
                ["python", "-c", code],
                capture_output=True,
                text=True,
                timeout=timeout,
                # Security: run in restricted environment
                env={"PATH": "/usr/bin:/bin"}
            )
            if result.returncode == 0:
                return f"Output:\n{result.stdout}"
            else:
                return f"Error:\n{result.stderr}"
        except subprocess.TimeoutExpired:
            return f"Execution timed out after {timeout}s"
        except Exception as e:
            return f"Execution failed: {str(e)}"
```

---

## LangGraph vs CrewAI: When to Use Which

| Dimension | LangGraph | CrewAI |
|-----------|-----------|--------|
| **Control** | Fine-grained graph control | High-level role abstraction |
| **State management** | Explicit TypedDict state | Built-in memory system |
| **Flexibility** | Maximum – any topology | Opinionated – sequential/hierarchical |
| **Learning curve** | Steeper | Gentler |
| **Human-in-the-loop** | First-class with `interrupt()` | More limited |
| **Streaming** | Native event streaming | Basic streaming |
| **Best for** | Complex workflows, precise control | Content creation, research teams |
| **Debugging** | LangSmith tracing | Built-in verbose logging |

### Decision Framework

```
Do you need precise control over execution flow?
├── Yes → LangGraph
└── No
    ├── Is the task team/role oriented? → CrewAI
    ├── Does it involve lots of human approval steps? → LangGraph
    └── Simple pipeline with known sequence? → Either works
```

---

## Production Considerations

### 1. Cost Management

```python
# Use cheaper models for less critical agents
class AgentCostConfig:
    ORCHESTRATOR = "claude-sonnet-4-5"    # $3/MTok
    SPECIALIST = "claude-haiku-3-5"        # $0.25/MTok
    VALIDATOR = "claude-haiku-3-5"         # $0.25/MTok

# Track costs with callbacks
from langchain.callbacks import get_openai_callback

async def run_with_cost_tracking(agent, input_data):
    with get_openai_callback() as cb:
        result = await agent.ainvoke(input_data)
        print(f"Total cost: ${cb.total_cost:.4f}")
        print(f"Tokens: {cb.total_tokens:,}")
    return result
```

### 2. Observability with LangSmith

```python
import os
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "production-agents"
os.environ["LANGCHAIN_API_KEY"] = "your-api-key"

# All LangGraph/CrewAI runs automatically traced
# View at: https://smith.langchain.com
```

### 3. Error Handling and Retry Logic

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10)
)
async def resilient_agent_call(agent, state):
    try:
        return await agent.ainvoke(state)
    except RateLimitError:
        raise  # Let tenacity retry
    except ValidationError as e:
        # Don't retry validation errors
        logger.error(f"Validation failed: {e}")
        raise RuntimeError(f"Agent output validation failed: {e}")
```

### 4. Parallel Execution with LangGraph

```python
from langgraph.graph import StateGraph, END
import asyncio

# Run multiple agents in parallel
async def parallel_analysis_node(state: AgentState) -> AgentState:
    # Launch all analyses concurrently
    results = await asyncio.gather(
        security_analyzer(state),
        performance_analyzer(state),
        style_analyzer(state),
        return_exceptions=True
    )
    
    # Aggregate results, handling any failures gracefully
    analysis = {}
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            analysis[f"analyzer_{i}"] = f"Failed: {result}"
        else:
            analysis[f"analyzer_{i}"] = result
    
    return {"analysis_results": analysis}
```

---

## Real-World Use Case: Automated PR Review System

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class PRReviewState(TypedDict):
    pr_diff: str
    security_issues: list
    performance_notes: list
    style_violations: list
    test_coverage: float
    overall_verdict: str
    review_comment: str

async def build_pr_reviewer():
    workflow = StateGraph(PRReviewState)
    
    # Parallel analysis phase
    workflow.add_node("security_scan", security_agent_node)
    workflow.add_node("performance_review", performance_agent_node)
    workflow.add_node("style_check", style_agent_node)
    workflow.add_node("test_analysis", test_coverage_node)
    
    # Aggregation phase
    workflow.add_node("synthesize", synthesis_agent_node)
    workflow.add_node("generate_comment", comment_generator_node)
    
    # Fan-out: run all analyzers in parallel
    workflow.set_entry_point("security_scan")  # LangGraph handles fan-out
    
    # All parallel nodes → synthesize
    for node in ["security_scan", "performance_review", "style_check", "test_analysis"]:
        workflow.add_edge(node, "synthesize")
    
    workflow.add_edge("synthesize", "generate_comment")
    workflow.add_edge("generate_comment", END)
    
    return workflow.compile()

# Usage
reviewer = await build_pr_reviewer()
review = await reviewer.ainvoke({
    "pr_diff": github_pr.get_diff(),
    "security_issues": [],
    "performance_notes": [],
    "style_violations": [],
    "test_coverage": 0.0,
    "overall_verdict": "",
    "review_comment": ""
})

# Post review to GitHub
github_pr.create_review(body=review["review_comment"])
```

---

## Conclusion

Multi-agent systems are no longer experimental — they're production infrastructure for AI-native applications. LangGraph gives you the control of a state machine with the intelligence of LLMs, ideal for complex, branching workflows. CrewAI provides the abstraction of a human team, perfect for content pipelines and research tasks.

Key takeaways:
1. **Start with clear state design** – shared state is the foundation of good multi-agent systems
2. **Match model cost to task criticality** – use cheaper models for grunt work
3. **Build in human oversight** for high-stakes decisions
4. **Instrument everything** – observability is non-negotiable in production
5. **Design for failure** – agents will hallucinate; plan for retries and validation

The multi-agent paradigm is where LLM applications are heading. The teams that master orchestration today will build the autonomous systems of tomorrow.

---

*Tags: #MultiAgent #LangGraph #CrewAI #AI #LLM #Python2026*
