---
layout: subsite-post
title: "Claude Code Agent Teams: Multi-Agent Collaboration for Complex Coding Tasks"
date: 2026-02-07
category: coding
tags: [Claude Code, Agent Teams, Multi-Agent, AI Coding, Anthropic, Developer Tools, Pair Programming]
lang: en
header-img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200"
---

# Claude Code Agent Teams: Multi-Agent Collaboration for Complex Coding Tasks

Claude Code v2.1.32 introduced a groundbreaking experimental feature: **Agent Teams**. This allows you to orchestrate multiple Claude Code instances working together as a team, each with its own context window, communicating directly with each other to tackle complex problems.

![Team Collaboration](https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800)
*Photo by [Brooke Cagle](https://unsplash.com/@brookecagle) on Unsplash*

## What Are Agent Teams?

Agent Teams let you coordinate multiple Claude Code instances:

- **Team Lead**: One session acts as the coordinator, assigning tasks and synthesizing results
- **Teammates**: Separate Claude instances that work independently, each in its own context window
- **Direct Communication**: Teammates can message each other directly, not just report back to the lead
- **Shared Task List**: All agents can see task status and claim available work

This is fundamentally different from traditional single-agent workflows where one AI tries to handle everything sequentially.

## Agent Teams vs Subagents

Claude Code already had subagents, so what's different?

| Feature | Subagents | Agent Teams |
|---------|-----------|-------------|
| Context | Own window; results return to caller | Own window; fully independent |
| Communication | Report back to main agent only | Teammates message each other directly |
| Coordination | Main agent manages all work | Shared task list with self-coordination |
| Best for | Focused tasks where only result matters | Complex work requiring discussion |
| Token cost | Lower: results summarized back | Higher: each is a separate instance |

**Use subagents** when you need quick, focused workers that report back.
**Use agent teams** when teammates need to share findings, challenge each other, and coordinate on their own.

## Getting Started

### Enable Agent Teams

Agent teams are disabled by default. Enable them in your environment or settings:

**Option 1: Environment Variable**
```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

**Option 2: settings.json**
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Settings file locations:
- User: `~/.claude/settings.json`
- Project: `.claude/settings.json`
- Local: `.claude/settings.local.json`

### Start Your First Team

After enabling, simply tell Claude to create a team:

```
I'm designing a CLI tool that helps developers track TODO comments across
their codebase. Create an agent team to explore this from different angles:
- one teammate on UX
- one on technical architecture  
- one playing devil's advocate
```

Claude will:
1. Create a team with a shared task list
2. Spawn teammates for each perspective
3. Have them explore the problem
4. Synthesize findings
5. Clean up the team when finished

## Display Modes

### In-Process Mode (Default)

All teammates run inside your main terminal:

- Use `Shift+Up/Down` to select a teammate
- Type to send them a message directly
- Press `Enter` to view a teammate's session
- Press `Escape` to interrupt their current turn
- Press `Ctrl+T` to toggle the task list

Works in any terminal, no extra setup required.

### Split-Pane Mode

Each teammate gets its own pane for simultaneous viewing:

```json
{
  "teammateMode": "tmux"
}
```

Or for a single session:
```bash
claude --teammate-mode tmux
```

**Requirements:**
- [tmux](https://github.com/tmux/tmux/wiki) or
- iTerm2 with [it2 CLI](https://github.com/mkusaka/it2)

**Note:** Split-pane mode is not supported in VS Code's integrated terminal, Windows Terminal, or Ghostty.

## Working with Teams

### Specify Teammates and Models

```
Create a team with 4 teammates to refactor these modules in parallel.
Use Sonnet for each teammate.
```

### Require Plan Approval

For complex or risky tasks:

```
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```

The teammate works in read-only plan mode until the lead approves their approach.

### Delegate Mode

Restrict the lead to coordination-only (no coding):

Press `Shift+Tab` to cycle into delegate mode after starting a team.

Useful when you want the lead to focus entirely on orchestration.

### Direct Teammate Communication

You can message any teammate directly:

- **In-process mode**: `Shift+Up/Down` to select, then type
- **Split-pane mode**: Click into a teammate's pane

### Task Management

Tasks have three states: pending, in progress, and completed.

- **Lead assigns**: Tell the lead which task to give to which teammate
- **Self-claim**: After finishing, teammates pick up the next unassigned task

Tasks can have dependencies—a pending task with unresolved dependencies cannot be claimed until those are completed.

### Shutdown and Cleanup

**Shut down a teammate:**
```
Ask the researcher teammate to shut down
```

**Clean up the team:**
```
Clean up the team
```

The lead checks for active teammates and fails if any are still running.

## Best Use Cases

### 1. Parallel Code Review

```
Create an agent team to review PR #142. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

Each reviewer applies a different lens, and the lead synthesizes findings.

### 2. Competing Hypothesis Investigation

```
Users report the app exits after one message instead of staying connected.
Spawn 5 agent teammates to investigate different hypotheses. Have them talk
to each other to try to disprove each other's theories, like a scientific
debate. Update the findings doc with whatever consensus emerges.
```

Multiple investigators actively trying to disprove each other find the actual root cause faster than sequential investigation.

### 3. Cross-Layer Feature Development

```
Create an agent team for the new user profile feature:
- Frontend teammate: React components and styling
- Backend teammate: API endpoints and database
- Testing teammate: Unit and integration tests
Have them coordinate on interfaces.
```

Each teammate owns a different layer without stepping on each other.

### 4. Research and Documentation

```
Create a team to document our microservices architecture:
- One teammate maps service dependencies
- One documents API contracts
- One identifies undocumented behaviors
Synthesize into a comprehensive architecture doc.
```

## Architecture Deep Dive

### Team Components

| Component | Role |
|-----------|------|
| Team Lead | Creates team, spawns teammates, coordinates work |
| Teammates | Separate Claude instances working on assigned tasks |
| Task List | Shared list of work items that teammates claim |
| Mailbox | Messaging system for agent-to-agent communication |

### Storage Locations

- Team config: `~/.claude/teams/{team-name}/config.json`
- Task list: `~/.claude/tasks/{team-name}/`

### Context and Communication

Each teammate has its own context window. When spawned:
- Loads project context (CLAUDE.md, MCP servers, skills)
- Receives the spawn prompt from the lead
- Does NOT inherit the lead's conversation history

Communication methods:
- **message**: Send to one specific teammate
- **broadcast**: Send to all teammates (use sparingly—costs scale with team size)

### Permissions

Teammates inherit the lead's permission settings. If the lead runs with `--dangerously-skip-permissions`, all teammates do too.

## Token Usage Considerations

Agent teams use significantly more tokens than single sessions:

- Each teammate has its own context window
- Token usage scales with number of active teammates
- Agent teams use approximately **7x more tokens** than standard sessions when in plan mode

### Cost Management Tips

1. **Use Sonnet for teammates**: Balances capability and cost
2. **Keep teams small**: Each teammate is a separate Claude instance
3. **Keep spawn prompts focused**: Everything in the prompt adds to context
4. **Clean up teams when done**: Active teammates continue consuming tokens even if idle

## Current Limitations

| Limitation | Details |
|------------|---------|
| No session resumption | `/resume` and `/rewind` do not restore in-process teammates |
| Task status can lag | Teammates sometimes fail to mark tasks as completed |
| Shutdown can be slow | Teammates finish current work before shutting down |
| One team per session | Clean up current team before starting a new one |
| No nested teams | Teammates cannot spawn their own teams |
| Lead is fixed | Can't promote a teammate to lead |
| Permissions set at spawn | Can change individual modes after, not at spawn time |
| Split panes require tmux/iTerm2 | Not supported in VS Code terminal, Windows Terminal, Ghostty |

## Pro Tips 💡

### Installing and Running tmux

Split-pane mode requires tmux:

**macOS:**
```bash
brew install tmux
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install tmux
```

**How to run:**
```bash
# 1. Start a tmux session first
tmux

# 2. Run Claude Code inside tmux
claude --dangerously-skip-permissions --teammate-mode tmux
```

When you run tmux, you'll see a green status bar at the bottom of the terminal. You need to run Claude Code in this state for Split-pane to work properly.

### When settings.json Doesn't Work

Since this is still experimental, settings.json configurations sometimes don't apply. In this case, **add the flag when running**:

```bash
# Use both settings.json config + runtime flag (recommended)
claude --teammate-mode tmux
```

### Team Trigger Tips ⭐

Simply saying "work as a team" often creates subagents instead. **How to reliably trigger Agent Teams:**

```
I'm going to build a developer blog. I'll use Next.js + Tailwind CSS.
Plan which tasks can run in parallel,
and how the teammates should be structured.

Check the Agent Teams documentation at this link and plan accordingly:
https://code.claude.com/docs/en/agent-teams
```

**Key points:**
1. Use keywords like "parallel execution"
2. Explicitly request "teammate structure"
3. **Include the official docs link** → drastically increases success rate!

Since this is a new feature, Claude sometimes doesn't use it correctly. Including the documentation link significantly improves the chances of proper configuration.

### The Importance of Team Names

Specifying a team name saves the information to files, allowing you to **reload it later**:

```
Set the team name to "blog-creator" and create teammates as planned.
```

**Storage locations:**
- Team config: `~/.claude/teams/blog-creator/config.json`
- Tasks: `~/.claude/tasks/blog-creator/`

When work is done, teammates are automatically disposed, but the information saved under the team name remains, allowing you to recreate the same team structure later.

### Connecting Independent Instances with Task ID

Multiple Claude Code instances can communicate without the Team feature! The task list is globally configured:

1. Create a task list in one Claude Code
2. Inject the task ID into another Claude Code instance
3. They automatically orchestrate and communicate with each other

This shows that Anthropic designed multi-agent collaboration from the start. Agent Teams simply adds a UI to orchestrate this from the main Claude Code at once.

### Recommended Execution Command

Recommended way to run with all options:

```bash
# Start tmux session
tmux

# Run Claude Code (with all recommended options)
claude --dangerously-skip-permissions --teammate-mode tmux

# To resume an existing session
claude --dangerously-skip-permissions --teammate-mode tmux -r
```

## Troubleshooting

### Teammates Not Appearing

1. In in-process mode, press `Shift+Down` to cycle through teammates
2. Ensure your task warrants a team—Claude decides based on complexity
3. For split panes, verify tmux is installed: `which tmux`

### Too Many Permission Prompts

Pre-approve common operations in your permission settings before spawning teammates.

### Lead Shuts Down Early

Tell the lead to wait for teammates to finish before proceeding.

### Orphaned tmux Sessions

```bash
tmux ls
tmux kill-session -t <session-name>
```

## Summary

Claude Code Agent Teams represent a paradigm shift in AI-assisted development:

- **Parallel exploration** instead of sequential investigation
- **Direct team communication** instead of hub-and-spoke
- **Self-coordinating work** through shared task lists
- **Specialized perspectives** on the same problem

While still experimental and token-intensive, agent teams excel at:
- Complex code reviews
- Multi-hypothesis debugging
- Cross-layer feature development
- Research and documentation

Enable with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and start experimenting!

## Resources

- [Official Documentation](https://code.claude.com/docs/en/agent-teams)
- [Subagents Documentation](https://code.claude.com/docs/en/sub-agents)
- [Claude Code GitHub](https://github.com/anthropics/claude-code)
- [Claude Code Costs Guide](https://code.claude.com/docs/en/costs)
