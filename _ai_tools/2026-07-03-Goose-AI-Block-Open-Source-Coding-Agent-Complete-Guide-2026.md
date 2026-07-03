---
layout: subsite-post
title: "Goose AI: Block's Open-Source AI Coding Agent Complete Guide 2026"
category: coding
tags: [goose ai, block, open source, ai coding agent, developer tools, autonomous coding]
date: 2026-07-03 15:00:00
header-img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop"
---

# Goose AI: Block's Open-Source AI Coding Agent Complete Guide 2026

![Code on a computer screen](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop)
*Photo by [Luca Bravo](https://unsplash.com/@lucabravo) on Unsplash*

**Goose** is Block's (formerly Square) open-source AI coding agent — a powerful, extensible tool that runs locally on your machine and can autonomously execute complex software development tasks. Unlike cloud-only AI coding assistants, Goose is fully **self-hostable**, **model-agnostic**, and designed to integrate deeply with your existing development environment.

In 2026, Goose has become one of the most popular open-source AI development tools, with thousands of developers using it for everything from automated testing to full feature implementation.

## What is Goose AI?

Goose is a **local AI agent** that lives on your computer and interacts with your actual development environment. It can:

- Read and write files in your project
- Execute shell commands and run tests
- Browse documentation and the web
- Use tools and APIs via its extension system
- Chain multiple actions autonomously to complete complex tasks

Unlike GitHub Copilot (which only suggests code in an editor), Goose **acts** — it runs your test suite, fixes failing tests, reads error messages, and iterates until it solves the problem.

### Why Goose Stands Out

| Feature | Goose AI | Cursor | Devin | GitHub Copilot |
|---|---|---|---|---|
| Open source | ✅ | ❌ | ❌ | ❌ |
| Self-hostable | ✅ | ❌ | ❌ | ❌ |
| Model agnostic | ✅ | Partial | ❌ | ❌ |
| Runs commands | ✅ | Limited | ✅ | ❌ |
| Free to use | ✅ (BYOK) | $20/mo | $500/mo | $10/mo |
| Extensions | ✅ | Limited | ❌ | Limited |

---

## Installation

### Prerequisites

- Python 3.10+ or Node.js 18+
- Git
- An LLM API key (Anthropic, OpenAI, or Ollama for local models)

### Quick Install

```bash
# Using pip
pip install goose-ai

# Or using pipx (recommended)
pipx install goose-ai

# Verify installation
goose --version
```

### Configure Your LLM Provider

```bash
# Set up with Claude (recommended for coding tasks)
goose configure

# Or set environment variable
export ANTHROPIC_API_KEY="your-key-here"

# Or use OpenAI
export OPENAI_API_KEY="your-key-here"
```

Goose works with any OpenAI-compatible API, including local models via Ollama:

```bash
# Use a local model with Ollama
export GOOSE_PROVIDER="ollama"
export GOOSE_MODEL="codellama:70b"
```

---

## Core Concepts

### Sessions

Goose operates in **sessions** — persistent contexts where it remembers what it has done, what files it has read, and what commands it has run:

```bash
# Start a new session
goose session start

# Resume the last session
goose session resume

# List all sessions
goose session list
```

### Toolkits

Goose's capabilities come from **toolkits** — modular extensions that give it specific abilities:

| Toolkit | What it does |
|---|---|
| `developer` | File read/write, shell commands (default) |
| `web_search` | Browse the web and read URLs |
| `github` | Interact with GitHub API |
| `jira` | Read/update Jira tickets |
| `memory` | Persist knowledge across sessions |
| `screen` | Take screenshots and analyze UI |

Enable toolkits in your `~/.config/goose/config.yaml`:

```yaml
toolkits:
  - developer
  - web_search
  - github
```

---

## Getting Started: First Tasks

### Task 1: Code Explanation

Navigate to your project and start a session:

```bash
cd ~/my-project
goose session start

# In the Goose REPL:
> Explain what this codebase does, starting with the entry point
```

Goose will read your files and provide a structured explanation.

### Task 2: Bug Fix

```bash
> I'm getting this error: [paste error message]. Find the bug and fix it.
```

Goose will:
1. Read the relevant source files
2. Trace the error to its source
3. Write the fix
4. Run your test suite to verify

### Task 3: Feature Implementation

```bash
> Add a rate limiting middleware to the Express.js API. 
> Use the existing auth middleware as a reference.
> Add unit tests for the new middleware.
```

Goose will read your existing code, implement the feature consistently with your patterns, and write tests.

![Developer workspace with multiple screens](https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop)
*Photo by [Christopher Gower](https://unsplash.com/@cgower) on Unsplash*

---

## Advanced Usage

### Running Goose Non-Interactively

```bash
# Run a one-shot task
goose run "Add input validation to all API endpoints in src/routes/"

# Run from a task file
goose run --task-file tasks/add-authentication.md

# With specific toolkit
goose run --with-toolkit github "Create a GitHub issue for every TODO comment in the codebase"
```

### Creating Custom Recipes

Recipes are reusable task templates stored as markdown files:

```markdown
# recipe: add-tests.md
---
description: Add comprehensive unit tests for a given module
params:
  - module_path: Path to the module to test
  - test_framework: pytest or jest (default: auto-detect)
---

Generate comprehensive unit tests for {{ module_path }}.

Requirements:
- Use {{ test_framework }} framework
- Cover happy paths and edge cases
- Include error/exception cases
- Aim for >90% coverage
- Follow the project's existing test patterns
```

Run with:
```bash
goose recipe add-tests --module_path src/auth/jwt.py
```

### MCP (Model Context Protocol) Integration

Goose supports MCP servers, letting you connect to any MCP-compatible tool:

```yaml
# ~/.config/goose/config.yaml
mcp_servers:
  - name: filesystem
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
  - name: postgres
    command: npx  
    args: ["-y", "@modelcontextprotocol/server-postgres"]
    env:
      DATABASE_URL: "postgresql://localhost/mydb"
```

---

## Real-World Workflows

### Automated Code Review

```bash
# Create a script: review.sh
#!/bin/bash
goose run "Review the changes in the current git diff for:
1. Security vulnerabilities
2. Performance issues  
3. Missing error handling
4. Inconsistencies with the codebase style
Provide specific, actionable feedback."
```

Run as part of your CI pipeline or pre-commit hooks.

### Documentation Generation

```bash
goose run "Generate comprehensive JSDoc/docstring documentation 
for all public functions in src/ that currently lack it. 
Match the style of the existing documentation in the codebase."
```

### Dependency Upgrades

```bash
goose run "Upgrade all npm dependencies to their latest minor versions.
Run tests after each upgrade. If tests break, investigate and fix or revert."
```

### Legacy Code Modernization

```bash
goose run "Migrate all callback-style async code in src/ to async/await.
Preserve existing behavior exactly. Run tests to verify after each file."
```

---

## Goose in CI/CD Pipelines

Integrate Goose into your GitHub Actions workflow:

```yaml
# .github/workflows/ai-review.yml
name: AI Code Review
on: [pull_request]

jobs:
  goose-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Install Goose
        run: pipx install goose-ai
      
      - name: Run AI Review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          git diff origin/main...HEAD > changes.diff
          goose run "Review the attached diff for issues" \
            --context changes.diff \
            --output review.md
      
      - name: Post Review as Comment
        uses: actions/github-script@v7
        with:
          script: |
            const review = require('fs').readFileSync('review.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## 🦆 Goose AI Review\n\n' + review
            });
```

---

## Tips and Best Practices

### 1. Be Specific in Your Requests

```bash
# ❌ Vague
> Fix the authentication

# ✅ Specific
> The JWT token validation in src/middleware/auth.js fails for tokens 
> with non-standard expiry formats. Fix it to handle both ISO 8601 
> and Unix timestamp formats. Add a test case for each format.
```

### 2. Use Checkpoints

For long tasks, ask Goose to commit work incrementally:

```bash
> Refactor the payment module to use the repository pattern.
> Make a git commit after each class you refactor so we can review progress.
```

### 3. Give Context About Your Stack

```bash
> This is a TypeScript Express.js app using Prisma ORM and Jest for testing.
> [Then your actual task]
```

### 4. Review Before Committing

Always review what Goose has done before pushing to production. Use `git diff` to see all changes.

---

## Pricing

Goose itself is **100% free and open source**. You only pay for your LLM API:

| Provider | Typical Cost (per hour of use) | Notes |
|---|---|---|
| Claude Sonnet 4 | ~$0.50–2.00 | Best coding performance |
| GPT-4o | ~$0.80–3.00 | Good all-rounder |
| Ollama (local) | $0 | Privacy, slower |
| Gemini 1.5 Pro | ~$0.30–1.50 | Good value |

---

## Getting Involved with Goose

Goose is **actively developed** on GitHub by Block and the community:

- **GitHub:** [github.com/block/goose](https://github.com/block/goose)
- **Discord:** Active community with #help and #showcase channels
- **Documentation:** [docs.goose.ai](https://block.github.io/goose/)

Contributing is welcome — the extension/toolkit system makes it easy to add new capabilities without touching core code.

---

## Conclusion

Goose AI is arguably the best free, open-source AI coding agent in 2026. Its local execution model, extensible toolkit system, and model-agnosticism make it a genuinely powerful tool that respects developer privacy and autonomy. Whether you're automating repetitive coding tasks, doing autonomous bug hunting, or building CI-integrated AI review pipelines, Goose is worth adding to your developer toolkit.

**Get Goose:** [github.com/block/goose](https://github.com/block/goose)
