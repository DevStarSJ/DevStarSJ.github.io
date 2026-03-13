---
layout: subsite-post
title: "Aider: The Open-Source AI Pair Programmer for Your Terminal — Complete Guide"
date: 2026-03-13 15:00:00
category: coding
tags: [aider, ai-coding, pair-programming, open-source, terminal, llm]
header-img: https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop
---

# Aider: The Open-Source AI Pair Programmer for Your Terminal

While flashy AI coding IDEs dominate headlines, **Aider** has quietly become the secret weapon of professional developers who prefer their existing workflow. It's a command-line AI coding assistant that works directly with your local files and Git repository — no cloud sync, no proprietary IDE, no lock-in.

![Developer coding at terminal](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop)
*Photo by Lukas on Unsplash*

---

## What Is Aider?

Aider is an **open-source, terminal-based AI coding assistant** that connects to powerful language models (Claude, GPT-4o, Gemini, local models) to help you write, edit, refactor, and debug code directly in your existing project. It operates on your local filesystem, tracks changes through Git, and works with any editor or IDE you already use.

**Key stats:**
- ⭐ 25,000+ GitHub stars
- 🆓 Completely free and open-source (Apache 2.0)
- 🤖 Supports 100+ LLMs (OpenAI, Anthropic, Gemini, Ollama, etc.)
- 🐙 Native Git integration
- 💻 Works with any language, any project

---

## Why Developers Love Aider

### Works With Your Existing Workflow
Aider doesn't force you to switch editors. Use VS Code, Neovim, Emacs, or anything else. Aider runs in your terminal alongside your editor — you make a request, it edits the files, you see the diff and decide whether to accept it.

### Git-First Approach
Every change Aider makes is committed to Git with a meaningful commit message. This means:
- Easy rollback with `git revert`
- Full history of AI-assisted changes
- Seamless code review
- No "magic black box" — every change is transparent

### True Multi-File Editing
Aider doesn't just edit the file you're looking at. It can reason across your **entire codebase**, editing multiple files simultaneously when a change requires coordination between components.

### Model Flexibility
You choose the brains. Use Claude 3.7 Sonnet for best results, GPT-4o for cost efficiency, or run local models via Ollama for complete privacy.

---

## Installation & Setup

### Quick Install
```bash
pip install aider-chat
```

Or using uv (recommended for isolation):
```bash
uv tool install aider-chat
```

### Configure Your API Key
```bash
# For Anthropic Claude (recommended)
export ANTHROPIC_API_KEY=your_key_here

# For OpenAI
export OPENAI_API_KEY=your_key_here

# Or add to ~/.aider.conf.yml
```

### Start Aider in Your Project
```bash
cd your-project
aider
```

That's it. Aider automatically maps your repository and is ready to help.

---

## Core Commands

### Adding Files to Context
```bash
# Add files when starting
aider src/main.py src/utils.py

# Add files during session
/add src/new_feature.py

# Add files matching a pattern
/add src/**/*.py
```

### Key In-Session Commands

| Command | Description |
|---------|-------------|
| `/add <file>` | Add file to AI context |
| `/drop <file>` | Remove file from context |
| `/undo` | Undo last AI commit |
| `/diff` | Show last change diff |
| `/git <cmd>` | Run any git command |
| `/run <cmd>` | Run shell command, share output with AI |
| `/voice` | Use voice input (mic required) |
| `/ask <question>` | Ask without making changes |
| `/help` | Show all commands |

---

## Real Usage Examples

### Refactoring Code
```
> Refactor the authentication module to use JWT tokens instead of 
  session cookies. Update all related tests.
```
Aider will analyze `auth.py`, `tests/test_auth.py`, and any other relevant files, then make coordinated changes across all of them.

### Fixing Bugs
```
> The API returns a 500 error when the user ID doesn't exist. 
  Add proper error handling with a 404 response.
```
Aider reads the traceback (you can paste it directly), identifies the cause, and fixes the issue.

### Writing Tests
```
> Write comprehensive pytest tests for the UserService class. 
  Include edge cases and mock the database calls.
```

### Explaining Code
```
/ask What does the process_payment function do and what are 
     potential failure points?
```
(Using `/ask` means Aider explains without making changes.)

### Adding Features
```
> Add pagination to the /api/users endpoint. Use cursor-based 
  pagination with limit/cursor query params. Update the docs too.
```

---

## Aider Modes

### Default Mode
Standard interactive chat. You describe what you want, Aider does it.

### Architect Mode (`--architect`)
Two-model approach: a "architect" model (e.g., o1) plans the changes, an "editor" model (e.g., Claude Sonnet) implements them. Great for complex architectural changes.

```bash
aider --architect --model o1 --editor-model claude-sonnet-4-5
```

### Auto-Commit Mode
Aider automatically commits each change without prompting:
```bash
aider --auto-commits
```

### Watch Mode (`--watch-files`)
Aider watches for AI comments in your code and acts on them:
```python
# ai: refactor this to use list comprehension
result = []
for item in items:
    result.append(transform(item))
```
Aider sees the comment and refactors automatically.

---

## Best Practices

### 1. Start Small
Add only the files directly relevant to your task. The more focused the context, the better the output.

### 2. Be Specific
❌ "Fix the bug"
✅ "Fix the KeyError on line 47 of user_service.py that occurs when the user doesn't have a 'profile' key in their data dict"

### 3. Leverage `/run`
Run your tests after changes:
```
/run pytest tests/test_user.py -v
```
Share the output with Aider to fix failures automatically.

### 4. Use `/undo` Liberally
Don't be afraid to undo and try a different approach. Git makes this instant and safe.

### 5. Review Every Diff
Aider shows you a diff before committing. Actually read it. AI can sometimes make surprising decisions.

---

## Supported Models

| Model | Best For | Cost |
|-------|----------|------|
| **Claude 3.7 Sonnet** | Best overall quality | ~$3/M tokens |
| **GPT-4o** | Good balance | ~$2.50/M tokens |
| **o3-mini** | Complex reasoning | ~$1.10/M tokens |
| **Gemini 2.0 Flash** | Speed + cost | ~$0.10/M tokens |
| **Ollama (local)** | Privacy, no cost | Free |

### Using Local Models (Ollama)
```bash
# Install and run Ollama
ollama pull qwen2.5-coder:32b

# Use with Aider
aider --model ollama/qwen2.5-coder:32b
```

---

## Aider vs. Other AI Coding Tools

| Feature | Aider | Cursor | GitHub Copilot | Cline |
|---------|-------|--------|---------------|-------|
| Open source | ✅ | ❌ | ❌ | ✅ |
| Works in any editor | ✅ | ❌ | ✅ | ❌ |
| Local model support | ✅ | Limited | ❌ | ✅ |
| Git integration | ✅ Native | Manual | Manual | Manual |
| Multi-file editing | ✅ | ✅ | Limited | ✅ |
| Price | Free | $20/mo | $10-19/mo | Free |

---

## Benchmarks: SWE-Bench Performance

Aider consistently ranks at the top of SWE-bench (a benchmark of real GitHub issues):
- **Aider + Claude 3.7 Sonnet:** ~50%+ resolution rate on SWE-bench Verified
- Outperforms most proprietary coding assistants on complex, real-world tasks

---

## Getting the Most Out of Aider

### Set Up a `.aider.conf.yml`
```yaml
# ~/.aider.conf.yml
model: claude-sonnet-4-5-20251101
auto-commits: true
dark-mode: true
```

### Use `.aiderignore`
Like `.gitignore` but for Aider — exclude files you don't want the AI to touch:
```
node_modules/
*.env
secrets/
```

### Create a `CONVENTIONS.md`
Tell Aider about your project's conventions:
```markdown
# Code Conventions
- Use TypeScript strict mode
- All functions must have JSDoc comments
- Prefer async/await over Promises
- Test files go in tests/ directory
```
Add with: `aider --read CONVENTIONS.md`

---

## Verdict

**Rating: ⭐⭐⭐⭐⭐ (5/5)**

Aider is the AI coding assistant for developers who know what they're doing. It's powerful, transparent, flexible, and respects your existing workflow. The Git-first approach means you're always in control, and the open-source model means you're never locked in.

If you're tired of AI tools that want to replace your IDE, Aider is a breath of fresh air.

**Best for:** Backend developers, open-source contributors, DevOps engineers, and anyone who lives in the terminal.

**Get started:** `pip install aider-chat` and check out [aider.chat](https://aider.chat)

---

*Do you use Aider in your workflow? What's your go-to model combination? Share in the comments!*
