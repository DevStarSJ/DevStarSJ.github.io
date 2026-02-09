---
layout: subsite-post
title: "Aider: AI Pair Programming in Your Terminal"
category: coding
header-img: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800"
---

![Developer pair programming with AI](https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800)
*Photo by [AltumCode](https://unsplash.com/@altumcode) on Unsplash*

## What is Aider?

Aider is an **open-source AI pair programming tool** that runs in your terminal. Unlike IDE-integrated tools, Aider works directly with your git repository, making changes, creating commits, and collaborating with you like a real pair programmer.

### Why Developers Love Aider

- **Terminal Native**: Works anywhere git works
- **Git Integrated**: Automatic commits for every change
- **Multi-Model**: Supports GPT-4, Claude, local models
- **Context Aware**: Understands your entire codebase
- **Open Source**: Free and customizable

## Key Features

### 1. Conversational Coding

Talk to Aider like a colleague. Describe what you want, and it edits your files:

```bash
$ aider app.py utils.py

> Add error handling to the database connection function

Applied edit to app.py
Commit: Add try/except block with retry logic for database connections
```

### 2. Automatic Git Integration

Every change becomes a clean commit with a descriptive message:

```bash
$ git log --oneline
a1b2c3d Add try/except block with retry logic for database connections
d4e5f6g Create user authentication middleware
g7h8i9j Initial project setup
```

### 3. Multi-File Editing

Aider handles complex changes across multiple files:

```bash
> Refactor the User class to use dataclasses and update all imports

Applied edits to:
  - models/user.py
  - services/auth.py
  - tests/test_user.py
Commit: Refactor User to dataclass, update imports across project
```

![Code on terminal screen](https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800)
*Photo by [Clement Helardot](https://unsplash.com/@clemhlrdt) on Unsplash*

## Getting Started

### Installation

```bash
# Using pip
pip install aider-chat

# Or using pipx (recommended)
pipx install aider-chat
```

### Configuration

Set your API key:

```bash
# For OpenAI
export OPENAI_API_KEY=your-key-here

# For Anthropic Claude
export ANTHROPIC_API_KEY=your-key-here
```

### First Session

```bash
# Navigate to your project
cd my-project

# Start aider with specific files
aider src/main.py src/utils.py

# Or let aider figure out relevant files
aider
```

## Aider Commands

Inside an Aider session:

| Command | Action |
|---------|--------|
| `/add file.py` | Add file to context |
| `/drop file.py` | Remove file from context |
| `/clear` | Clear conversation history |
| `/diff` | Show pending changes |
| `/undo` | Undo last commit |
| `/run command` | Execute shell command |
| `/help` | Show all commands |

## Model Selection

Aider works with multiple AI models:

```bash
# Use GPT-4 (default)
aider

# Use Claude 3.5 Sonnet
aider --model claude-3-5-sonnet-20241022

# Use local model via Ollama
aider --model ollama/codellama

# Use DeepSeek
aider --model deepseek/deepseek-coder
```

## Advanced Usage

### 1. Architect Mode

For planning before coding:

```bash
aider --architect
```

Aider will first propose a plan, then implement after your approval.

### 2. Watch Mode

Automatically respond to file changes:

```bash
aider --watch
```

### 3. Voice Mode

Code with your voice:

```bash
aider --voice
```

### 4. Repository Maps

Aider creates a map of your codebase for better context:

```bash
aider --map-tokens 2048
```

## Aider vs Other AI Coding Tools

| Feature | Aider | Cursor | Copilot |
|---------|-------|--------|---------|
| **Interface** | Terminal | IDE | IDE Plugin |
| **Git Integration** | ✅ Native | ❌ | ❌ |
| **Multi-Model** | ✅ | ✅ | ❌ |
| **Open Source** | ✅ | ❌ | ❌ |
| **Price** | Free* | $20/mo | $10/mo |
| **Local Models** | ✅ | ❌ | ❌ |

*API costs apply

## Best Practices

### 1. Start Small

Begin with specific files rather than your entire codebase:

```bash
# Good: Focused context
aider src/auth/login.py src/auth/utils.py

# Overwhelming: Too much context
aider $(find . -name "*.py")
```

### 2. Write Clear Prompts

```bash
# Vague
> Fix the bug

# Clear
> Fix the TypeError in parse_user_data() when input is None - return empty dict instead
```

### 3. Review Before Committing

Use `/diff` to review changes before they're committed:

```bash
> Add input validation

/diff   # Review the proposed changes
/undo   # Revert if needed
```

### 4. Use .aiderignore

Exclude files you don't want Aider to touch:

```
# .aiderignore
*.env
secrets/
generated/
```

## Real-World Workflow

```bash
# 1. Start Aider in your feature branch
git checkout -b feature/user-dashboard
aider src/dashboard/*.py

# 2. Describe your feature
> Create a user dashboard component that shows:
> - Recent activity (last 10 items)
> - Profile summary
> - Quick action buttons

# 3. Iterate on the implementation
> Make the activity list paginated with 5 items per page

# 4. Add tests
> Write pytest tests for the dashboard component

# 5. Review and push
git push origin feature/user-dashboard
```

## Limitations

- Requires API key (costs money for cloud models)
- Large codebases need careful file selection
- Not real-time like Copilot suggestions
- Learning curve for terminal-centric workflow

## The Verdict

Aider is **the best option for developers who live in the terminal**. Its native git integration means every AI suggestion becomes a clean, reversible commit. Combined with multi-model support and open-source flexibility, it's a powerful alternative to IDE-locked tools.

### Who Should Use Aider?

✅ Terminal-first developers
✅ Vim/Neovim/Emacs users
✅ Teams wanting git-tracked AI changes
✅ Developers testing different AI models
✅ Open source enthusiasts

## Resources

- [Official Website](https://aider.chat)
- [GitHub Repository](https://github.com/paul-gauthier/aider)
- [Documentation](https://aider.chat/docs)
- [Discord Community](https://discord.gg/aider)

---

*Pair program with AI the way developers actually work - in the terminal, with git, on your terms.*
