---
layout: subsite-post
title: "Dust AI: Build Enterprise AI Assistants and Automation Complete Guide 2026"
category: automation
tags: [dust ai, enterprise ai, ai assistants, ai agents, workflow automation, rag]
date: 2026-07-03 15:00:00
header-img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop"
---

# Dust AI: Build Enterprise AI Assistants and Automation Complete Guide 2026

![Abstract technology and AI visualization](https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop)
*Photo by [NASA](https://unsplash.com/@nasa) on Unsplash*

**Dust** is a platform for building and deploying AI assistants and agents across your organization. Designed for enterprise teams, Dust connects to your existing tools and data sources — Slack, Notion, GitHub, Google Drive, Salesforce — and lets you build custom AI assistants that have deep context about your company, products, and workflows.

In 2026, Dust has become the go-to platform for companies that want Claude- or GPT-4-powered assistants with their own data, without building everything from scratch.

## What is Dust?

Dust is an **enterprise AI platform** with two core components:

1. **AI Assistants** — Custom chatbots connected to your company's data
2. **Workflow Automation** — AI agents that run complex multi-step tasks automatically

Unlike general AI tools, Dust assistants know about your specific company: your documentation, your codebase, your customer data, your team's conversations.

### Key Differentiators

- **Data connectors** — 20+ native integrations with enterprise tools
- **RAG (Retrieval Augmented Generation)** — Answers grounded in your actual docs, not hallucinations
- **Multi-model support** — Use Claude, GPT-4, Gemini, or Mistral as the backbone
- **Permission management** — Control which employees can access which data
- **Audit trails** — Log all AI interactions for compliance
- **On-premise option** — Deploy in your own cloud for maximum data control

---

## Core Features

### 1. AI Assistants with Company Context

Build assistants that know your business:

**Example assistants teams build on Dust:**

- **Engineering Assistant** — Knows your codebase, architecture docs, and runbooks; answers technical questions
- **HR Assistant** — Connected to policy docs, benefits guides; answers employee questions
- **Sales Assistant** — Knows your product, pricing, and sales playbooks; helps reps draft proposals
- **Support Assistant** — Connected to your knowledge base and past tickets; reduces support volume
- **Legal Assistant** — Knows your contracts and policies; flags compliance issues

### 2. Data Connectors

Connect Dust to your existing data sources:

| Platform | What Gets Connected |
|---|---|
| **Slack** | Channel messages, threads, DMs |
| **Notion** | Pages, databases, wikis |
| **Google Drive** | Documents, spreadsheets |
| **GitHub** | Code, issues, PRs, wiki |
| **Confluence** | Pages, spaces |
| **Salesforce** | Accounts, opportunities, cases |
| **Linear** | Issues, projects |
| **Intercom** | Conversations, articles |
| **Zendesk** | Tickets, help center |
| **Custom APIs** | Any REST API via connector builder |

Data is indexed and kept in sync automatically. When your docs change, the assistant's knowledge updates.

### 3. Agent Workflows (Dust Apps)

Beyond Q&A, Dust lets you build **automated agents** — AI workflows that take actions:

```yaml
# Example: Auto-draft PR descriptions
Trigger: New PR opened on GitHub
Steps:
  1. Read the PR diff (GitHub connector)
  2. Check related Linear tickets (Linear connector)
  3. Fetch relevant documentation (Notion connector)
  4. Generate PR description with: context, impact, testing notes
  5. Post draft to PR as a comment (GitHub action)
```

More complex examples:
- **Incident response** — When a Datadog alert fires, gather context from runbooks, draft a Slack incident message, and create a Linear ticket
- **Onboarding** — When a new employee joins, send personalized welcome, schedule intro meetings, share relevant docs
- **Customer escalation** — When a high-value customer files a complaint, pull their history, draft a response, alert the account manager

![Data flowing through network](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop)
*Photo by [imgix](https://unsplash.com/@imgix) on Unsplash*

### 4. RAG (Retrieval Augmented Generation)

This is what makes Dust answers trustworthy. Instead of the AI guessing, Dust:

1. Searches your connected data sources for relevant information
2. Retrieves the most relevant chunks
3. Passes them to the LLM as context
4. Generates an answer grounded in your actual documentation
5. **Cites its sources** — every answer includes references to the docs it used

Result: Accurate, verifiable answers instead of hallucinations.

---

## Getting Started

### Step 1: Create a Workspace

Visit **[dust.tt](https://dust.tt)** and create your company workspace. Invite team members with role-based access:
- **Admin** — Full workspace access
- **Builder** — Can create and edit assistants
- **Member** — Can use assistants, no editing

### Step 2: Connect Your Data

Navigate to **Data Sources** and add connectors:

```
Settings → Data Sources → Add → Select: Notion
→ Authorize with OAuth → Select which workspaces to sync
→ Configure sync frequency: Real-time / Hourly / Daily
```

Allow the initial sync to complete (can take 30 min–several hours for large workspaces).

### Step 3: Create Your First Assistant

```
Assistants → New Assistant → Configure:

Name: "Engineering Helper"
Description: "Answers questions about our codebase and architecture"
Instruction: "You are an expert in our engineering systems. 
  Answer questions using our documentation, code comments, 
  and architecture docs. Always cite your sources.
  If you don't know something, say so — don't guess."

Data Sources: 
  ✅ GitHub (main repo)
  ✅ Notion (Engineering space)
  ✅ Confluence (Architecture docs)

Model: Claude Sonnet 4
Creativity: Low (for technical accuracy)
```

### Step 4: Test and Iterate

Use the playground to test your assistant before deploying:

```
Q: "How does our authentication system work?"
Q: "What's the database schema for user accounts?"
Q: "Walk me through our deployment process"
```

Review answers for accuracy, check that sources are being cited, refine the instruction prompt if needed.

---

## Advanced Configuration

### Multi-Step RAG with Routing

For complex assistants, use **routing** to decide which data source to search:

```
If question is about code → search GitHub first, then Confluence
If question is about HR → search Notion HR space only
If question is about customers → search Salesforce + Intercom
```

### Custom Actions

Dust assistants can do more than answer questions — they can take actions:

- **Create Notion page** — "Summarize this Slack thread as a Notion doc"
- **Update Linear ticket** — "Mark this issue as done and add a comment"
- **Send Slack message** — "Notify #engineering when this condition is met"
- **Call external API** — Any REST endpoint you define

### Memory and Context

Enable **memory** so assistants remember previous interactions:

- **User memory** — The assistant remembers preferences for each user
- **Team memory** — Shared context across the team
- **Project memory** — Context specific to ongoing projects

---

## Deployment Options

### Slack Integration

The most popular deployment — add your Dust assistants directly to Slack:

1. Connect Dust to your Slack workspace
2. Add the Dust bot to channels
3. Team members interact with assistants via `@assistant-name question`
4. Or use `/dust` slash command for private queries

### API Access

For custom integrations:

```python
import requests

response = requests.post(
    "https://dust.tt/api/v1/w/{workspace_id}/assistant/conversations",
    headers={"Authorization": f"Bearer {DUST_API_KEY}"},
    json={
        "assistant_name": "engineering-helper",
        "message": "How does our caching layer work?",
        "context": {"user_email": "engineer@company.com"}
    }
)

answer = response.json()["answer"]["content"]
sources = response.json()["answer"]["sources"]
```

### Embedded Widgets

Embed Dust assistants into internal tools, Notion pages, or custom portals.

---

## Pricing (2026)

| Plan | Price | Features |
|---|---|---|
| Free | $0 | 1 workspace, 1 assistant, limited connectors |
| Starter | $49/mo | 5 users, unlimited assistants, core connectors |
| Pro | $249/mo | 20 users, all connectors, custom actions |
| Enterprise | Custom | Unlimited users, on-premise, SSO, audit logs |

---

## ROI: What Teams Report

Companies using Dust typically report:

- **50-70% reduction** in time spent searching for internal documentation
- **30-40% reduction** in repetitive support questions to senior engineers
- **2-3x faster** onboarding for new employees
- **Significant reduction** in "tribal knowledge" risk when employees leave

---

## Best Practices

1. **Start narrow** — Build one focused assistant (e.g., HR bot) before building many
2. **Write detailed instructions** — The system prompt is critical; be explicit about tone, scope, and limitations
3. **Keep data sources curated** — More is not always better; irrelevant data degrades answer quality
4. **Enable source citations** — Users trust answers more when they can verify sources
5. **Review conversations regularly** — Use conversation logs to identify gaps and improve prompts
6. **Set scope boundaries** — Tell the assistant what it should NOT answer to prevent scope creep

---

## Conclusion

Dust AI is the enterprise solution for teams that want the power of Claude and GPT-4 with the context of their own company. Its robust data connectors, trustworthy RAG architecture, and flexible agent capabilities make it one of the most practical enterprise AI platforms available in 2026.

If your team is spending hours searching internal docs, answering repetitive questions, or manually connecting information across tools — Dust is built to solve exactly those problems.

**Get started with Dust:** [dust.tt](https://dust.tt)
