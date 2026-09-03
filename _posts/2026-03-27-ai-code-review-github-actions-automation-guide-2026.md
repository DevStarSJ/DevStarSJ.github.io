---
layout: post
title: "AI-Powered Code Review with GitHub Actions: Automate Quality Gates in 2026"
subtitle: "Use Claude, GPT-4, and Custom Prompts to Catch Bugs Before Your Human Reviewers Do"
date: 2026-03-27 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=1200&auto=format&fit=crop&q=80"
catalog: true
tags:
  - GitHub Actions
  - AI
  - Code Review
  - DevOps
  - CI/CD
  - Claude
  - Automation
categories: ai
---

# AI-Powered Code Review with GitHub Actions: Automate Quality Gates in 2026

By 2026, AI code review has moved from novelty to standard practice. Teams that still rely entirely on human reviewers for first-pass review are slower, and frankly, their reviewers are less happy. AI doesn't catch everything — but it's available 24/7, never tired, and is surprisingly good at catching security issues, missing error handling, and style drift.

This guide shows you how to build a robust AI code review pipeline with GitHub Actions that complements (not replaces) your human reviewers.

![Code Review](https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=1000&auto=format&fit=crop&q=80)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

---

## What AI Code Review Is Good At

Before building the pipeline, understand where AI excels vs. where humans still win:

**AI excels:**
- ✅ Security vulnerabilities (SQL injection, XSS, exposed secrets)
- ✅ Missing error handling and edge cases
- ✅ Code style and consistency
- ✅ Documentation and comment quality
- ✅ Obvious bugs (off-by-one, null deref patterns)
- ✅ Import/dependency issues
- ✅ Accessibility problems in UI code
- ✅ TypeScript type safety issues

**Humans still win:**
- ✅ Business logic correctness
- ✅ Architecture decisions
- ✅ Product requirements alignment
- ✅ Team-specific context
- ✅ Long-term maintainability judgment
- ✅ "This approach is fine but here's a better pattern for our codebase"

The right model: **AI does triage and catches automatable issues first, humans review the diff + AI feedback together.**

---

## Architecture Overview

```
PR Opened/Updated
      │
      ▼
GitHub Action triggers
      │
      ▼
Fetch PR diff (changed files only)
      │
      ▼
Chunk by file/function (stay within token limits)
      │
      ▼
Claude API call with specialized prompts
      │
      ├── Security scan
      ├── Code quality review
      └── Documentation check
      │
      ▼
Post structured comments to PR
      │
      ├── Inline comments (file:line)
      └── Summary comment
      │
      ▼
Set PR status check (pass/fail)
```

---

## The GitHub Actions Workflow

{% raw %}
```yaml
# .github/workflows/ai-code-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, ready_for_review]
    # Skip WIP/draft PRs
  workflow_dispatch:  # Allow manual trigger

permissions:
  contents: read
  pull-requests: write  # Needed to post comments

jobs:
  ai-review:
    # Skip draft PRs unless manually triggered
    if: >
      github.event_name == 'workflow_dispatch' ||
      github.event.pull_request.draft == false
    
    runs-on: ubuntu-latest
    timeout-minutes: 10
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for diff
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      
      - name: Install dependencies
        run: pip install anthropic pygithub requests

      - name: Run AI Code Review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ github.event.number }}
          REPO_NAME: ${{ github.repository }}
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
        run: python .github/scripts/ai_review.py
      
      - name: Upload review artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: ai-review-results
          path: review_output.json
          retention-days: 30
```
{% endraw %}

---

## The Review Script

{% raw %}
```python
# .github/scripts/ai_review.py
import os
import json
import subprocess
import anthropic
from github import Github
from pathlib import Path

# Configuration
MAX_DIFF_LINES = 3000  # Stay within token limits
SKIP_EXTENSIONS = {'.lock', '.svg', '.png', '.jpg', '.ico', '.min.js', '.min.css'}
SKIP_FILES = {'package-lock.json', 'bun.lockb', 'yarn.lock', 'pnpm-lock.yaml'}

def get_pr_diff() -> dict[str, str]:
    """Get changed files and their diffs."""
    base_sha = os.environ["BASE_SHA"]
    head_sha = os.environ["HEAD_SHA"]
    
    # Get list of changed files
    result = subprocess.run(
        ["git", "diff", "--name-only", base_sha, head_sha],
        capture_output=True, text=True
    )
    
    changed_files = result.stdout.strip().split('\n')
    file_diffs = {}
    
    for filepath in changed_files:
        # Skip binary/generated files
        if not filepath:
            continue
        
        path = Path(filepath)
        if path.suffix in SKIP_EXTENSIONS or path.name in SKIP_FILES:
            continue
        
        # Get diff for this file
        diff_result = subprocess.run(
            ["git", "diff", base_sha, head_sha, "--", filepath],
            capture_output=True, text=True
        )
        
        diff = diff_result.stdout
        if diff and len(diff.split('\n')) < MAX_DIFF_LINES:
            file_diffs[filepath] = diff
    
    return file_diffs

def review_with_claude(file_path: str, diff: str) -> dict:
    """Send diff to Claude for review."""
    client = anthropic.Anthropic()
    
    # Determine file type for specialized prompting
    extension = Path(file_path).suffix
    
    review_prompt = f"""You are a senior software engineer doing a code review. 
Review the following code diff for the file `{file_path}`.

Focus on:
1. **Security issues**: SQL injection, XSS, exposed secrets, insecure dependencies, path traversal, etc.
2. **Bugs**: Off-by-one errors, null/undefined access, race conditions, wrong error handling
3. **Code quality**: Readability, maintainability, overly complex logic
4. **Missing tests**: Changes that likely need tests but don't have them
5. **Performance**: Obvious inefficiencies (N+1 queries, unnecessary re-renders, etc.)
6. **Type safety**: Missing type annotations, unsafe casts, any types

Be concise. Only flag real issues, not style preferences.
For each issue, provide the line number if identifiable from the diff.

Return a JSON object:
{{
  "overall": "lgtm" | "minor" | "major" | "critical",
  "summary": "One sentence summary of the changes",
  "issues": [
    {{
      "severity": "critical" | "major" | "minor" | "suggestion",
      "line": 42,  // line number in the new file, or null
      "title": "Brief title",
      "description": "Detailed explanation and suggested fix"
    }}
  ]
}}

If the changes look good, return {{"overall": "lgtm", "summary": "...", "issues": []}}

CODE DIFF:
```diff
{% endraw %}
{diff}
{% raw %}
```"""

    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2048,
        messages=[{"role": "user", "content": review_prompt}]
    )
    
    try:
        # Extract JSON from response
        content = response.content[0].text
        # Find JSON in the response
        start = content.find('{')
        end = content.rfind('}') + 1
        if start >= 0 and end > start:
            return json.loads(content[start:end])
    except (json.JSONDecodeError, IndexError):
        pass
    
    return {"overall": "minor", "summary": "Review completed", "issues": []}

def security_scan(file_path: str, diff: str) -> list[dict]:
    """Dedicated security scan with focused prompting."""
    client = anthropic.Anthropic()
    
    prompt = f"""You are a security engineer. Scan this code diff for security vulnerabilities ONLY.

Check for:
- Hardcoded secrets, API keys, passwords
- SQL/NoSQL injection
- XSS vulnerabilities  
- Path traversal / directory traversal
- Insecure cryptography
- Authentication/authorization flaws
- Sensitive data in logs/errors
- Dependency vulnerabilities (known bad packages)
- CSRF vulnerabilities
- Open redirects

Return a JSON array of security issues found (empty array if none):
[
  {{
    "severity": "critical" | "high" | "medium" | "low",
    "cwe": "CWE-89",  // CWE identifier if applicable
    "line": 42,
    "title": "SQL Injection in user query",
    "description": "User input is directly interpolated...",
    "remediation": "Use parameterized queries: ..."
  }}
]

FILE: {file_path}
DIFF:
```diff
{% endraw %}
{diff}
```"""

    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )
    
    try:
        content = response.content[0].text
        start = content.find('[')
        end = content.rfind(']') + 1
        if start >= 0 and end > start:
            return json.loads(content[start:end])
    except (json.JSONDecodeError, IndexError):
        pass
    
    return []

def post_review_to_github(pr_number: int, reviews: dict[str, dict], security_issues: list):
    """Post AI review results as PR comments."""
    gh = Github(os.environ["GITHUB_TOKEN"])
    repo = gh.get_repo(os.environ["REPO_NAME"])
    pr = repo.get_pull(pr_number)
    
    # Determine overall verdict
    all_issues = []
    for file_review in reviews.values():
        all_issues.extend(file_review.get("issues", []))
    all_issues.extend([{**i, "severity": i.get("severity", "major")} for i in security_issues])
    
    critical_count = sum(1 for i in all_issues if i["severity"] == "critical")
    major_count = sum(1 for i in all_issues if i["severity"] == "major")
    minor_count = sum(1 for i in all_issues if i["severity"] in ("minor", "low"))
    
    if critical_count > 0:
        verdict = "🚨 Critical issues found"
        status_state = "failure"
    elif major_count > 0:
        verdict = "⚠️ Major issues found"
        status_state = "failure"
    elif minor_count > 0:
        verdict = "💡 Minor suggestions"
        status_state = "success"
    else:
        verdict = "✅ LGTM from AI reviewer"
        status_state = "success"
    
    # Build summary comment
    comment_parts = [
        f"## 🤖 AI Code Review — {verdict}\n",
        f"*Reviewed {len(reviews)} files | {len(all_issues)} issues found*\n",
    ]
    
    if security_issues:
        comment_parts.append("\n### 🔒 Security Issues\n")
        for issue in security_issues:
            emoji = "🚨" if issue["severity"] in ("critical", "high") else "⚠️"
            comment_parts.append(f"{emoji} **[{issue['severity'].upper()}]** {issue['title']}")
            comment_parts.append(f"\n> {issue['description']}\n")
            if issue.get("remediation"):
                comment_parts.append(f"> **Fix:** {issue['remediation']}\n")
    
    # Per-file summaries
    comment_parts.append("\n### 📁 File Reviews\n")
    for filepath, review in reviews.items():
        overall = review.get("overall", "lgtm")
        emoji = {"lgtm": "✅", "minor": "💡", "major": "⚠️", "critical": "🚨"}.get(overall, "✅")
        comment_parts.append(f"\n**{emoji} `{filepath}`** — {review.get('summary', '')}")
        
        issues = review.get("issues", [])
        if issues:
            for issue in issues[:3]:  # Show top 3 per file
                sev_emoji = {"critical": "🚨", "major": "❌", "minor": "💡", "suggestion": "💬"}.get(
                    issue.get("severity", "minor"), "💡"
                )
                line_ref = f"L{issue['line']}" if issue.get("line") else "general"
                comment_parts.append(f"\n  - {sev_emoji} **{issue['title']}** ({line_ref})")
    
    comment_parts.append("\n\n---")
    comment_parts.append("*AI review by Claude Sonnet 4.5. Always verify AI suggestions with human judgment.*")
    
    summary_comment = "\n".join(comment_parts)
    
    # Delete previous AI review comments (keep thread clean)
    for comment in pr.get_issue_comments():
        if "🤖 AI Code Review" in comment.body:
            comment.delete()
    
    # Post new summary
    pr.create_issue_comment(summary_comment)
    
    return status_state

def main():
    pr_number = int(os.environ["PR_NUMBER"])
    
    print("🔍 Fetching PR diff...")
    file_diffs = get_pr_diff()
    
    if not file_diffs:
        print("No reviewable files changed. Skipping AI review.")
        return
    
    print(f"📝 Reviewing {len(file_diffs)} files...")
    
    reviews = {}
    all_security_issues = []
    
    for filepath, diff in file_diffs.items():
        print(f"  → {filepath}")
        
        # General code review
        reviews[filepath] = review_with_claude(filepath, diff)
        
        # Security scan for backend/config files
        if any(filepath.endswith(ext) for ext in ['.py', '.ts', '.js', '.go', '.java', '.env', '.yaml', '.json']):
            security_issues = security_scan(filepath, diff)
            all_security_issues.extend(security_issues)
    
    # Save results
    output = {"reviews": reviews, "security_issues": all_security_issues}
    with open("review_output.json", "w") as f:
        json.dump(output, f, indent=2)
    
    print("💬 Posting review to GitHub...")
    status = post_review_to_github(pr_number, reviews, all_security_issues)
    
    print(f"✅ Review complete. Status: {status}")
    
    # Exit with failure for critical/major issues (blocks merge if branch protection enabled)
    critical = sum(1 for issues in [all_security_issues] + [r.get("issues", []) for r in reviews.values()]
                   for i in issues if i.get("severity") in ("critical", "major"))
    
    if critical > 0:
        print(f"❌ {critical} critical/major issues found. Failing CI.")
        exit(1)

if __name__ == "__main__":
    main()
```

---

## Adding Custom Rules for Your Team

Extend the system with team-specific rules:

```python
CUSTOM_RULES = """
Additional rules specific to our codebase:

1. Database queries must use our `db` wrapper, never raw `pg` connections
2. API endpoints must have rate limiting middleware
3. All user-facing errors must use our `AppError` class (never expose raw stack traces)
4. React components must have proper loading/error states
5. All API calls must handle network errors (not just HTTP errors)
6. Dates must use our `DateUtils` helper, never `new Date()` directly in components
7. Environment variables must be accessed through our `config` module
"""

def review_with_custom_rules(file_path: str, diff: str) -> dict:
    prompt = f"""...standard prompt...

{CUSTOM_RULES}

{diff}
"""
```

---

## Using AI Review Comments Inline

For more targeted feedback, post comments on specific lines:

```python
def post_inline_comments(pr, filepath: str, issues: list[dict], commits):
    """Post comments on specific lines of the diff."""
    for issue in issues:
        if not issue.get("line"):
            continue
        
        try:
            # Get the commit for this file
            commit = commits.reversed[0]  # Latest commit
            
            pr.create_review_comment(
                body=f"**{issue['title']}** ({issue['severity']})\n\n{issue['description']}",
                commit=commit,
                path=filepath,
                line=issue["line"],
            )
        except Exception as e:
            print(f"Could not post inline comment: {e}")
```

---

## Cost Optimization

AI review can get expensive. Here's how to keep costs low:

```yaml
# Only review files with significant changes
- name: Check diff size
  id: diff-check
  run: |
    DIFF_SIZE=$(git diff --stat $BASE_SHA $HEAD_SHA | tail -1 | grep -oP '\d+ insertion')
    echo "diff_size=$DIFF_SIZE" >> $GITHUB_OUTPUT

- name: Run AI review
  if: |
    steps.diff-check.outputs.diff_size != '' &&
    steps.diff-check.outputs.diff_size > 10
  run: python .github/scripts/ai_review.py
```

```python
# Use cheaper model for small diffs
model = "claude-haiku-3-5" if len(diff) < 500 else "claude-sonnet-4-5"
# claude-haiku: ~10x cheaper, good for simple reviews
```

Average costs per PR review (2026 pricing):
- Small PR (< 200 lines): ~$0.01-0.05
- Medium PR (200-1000 lines): ~$0.05-0.20
- Large PR (1000+ lines): ~$0.20-0.50

For a team making 50 PRs/week, that's typically $10-50/month — less than one hour of developer time.

---

## Integration with GitHub Branch Protection

```yaml
# .github/branch-protection.yml (via GitHub REST API or Terraform)
required_status_checks:
  strict: true
  contexts:
    - "ai-review"      # Block merge if critical AI issues found
    - "ci/tests"
    - "ci/lint"
```

Make AI review a **non-blocking soft-gate** until your team builds trust with it:

```yaml
# Start with informational-only (never fails)
- name: AI Review (advisory)
  continue-on-error: true  # PR can still merge
  run: python .github/scripts/ai_review.py
```

After a few weeks, review the AI's track record and decide whether to make it blocking.

---

## Sample Output

Here's what a typical AI review comment looks like on a PR:

```
## 🤖 AI Code Review — ⚠️ Major issues found

*Reviewed 3 files | 5 issues found*

### 🔒 Security Issues

🚨 **[HIGH]** Potential SQL injection in user search
> String interpolation used in query: `f"SELECT * FROM users WHERE name = '{search_term}'"` 
> **Fix:** Use parameterized query: `db.execute("SELECT * FROM users WHERE name = %s", (search_term,))`

### 📁 File Reviews

**⚠️ `src/api/users.py`** — Adds user search endpoint with filtering

  - 🚨 **SQL injection in search** (L47)
  - 💡 **Missing pagination** (L52)
  - 💡 **No rate limiting on search endpoint** (general)

**✅ `src/models/user.py`** — Adds email validation field

**💡 `tests/test_users.py`** — Adds tests for user model

  - 💡 **Missing test for empty search term** (L34)
```

---

## Conclusion

AI code review in 2026 is a force multiplier, not a replacement. The teams doing it well use AI to handle the mechanical, automatable parts of review — leaving human reviewers to focus on architecture, business logic, and team knowledge transfer.

The pipeline in this guide is production-ready. Start with `continue-on-error: true` and let your team build trust with the AI reviewer before making it a hard gate. Within a few sprints, you'll wonder how you reviewed code without it.

**Ship faster. Catch more bugs. Keep your human reviewers happy.**

---

*References:*
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [GitHub REST API for PR Reviews](https://docs.github.com/en/rest/pulls/reviews)
- [PyGithub Documentation](https://pygithub.readthedocs.io/)
