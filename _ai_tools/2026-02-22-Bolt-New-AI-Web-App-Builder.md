---
layout: subsite-post
title: "Bolt.new: Build Full-Stack Web Apps with AI in Your Browser"
date: 2026-02-22
category: coding
tags: [bolt-new, stackblitz, ai-coding, web-app-builder, full-stack, no-code, vite, react, ai-development]
header-img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200"
description: "Complete guide to Bolt.new — the AI-powered in-browser full-stack development environment that lets you build, run, and deploy web apps from a single prompt."
---

# Bolt.new: Build Full-Stack Web Apps with AI in Your Browser

![Laptop with code on screen](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800)
*Photo by [Chris Ried](https://unsplash.com/@cdr6934) on Unsplash*

What if you could go from a plain English description to a fully running, deployable web application in under two minutes — entirely inside your browser? That's the promise of **Bolt.new**, the AI-powered full-stack development environment built on StackBlitz's WebContainers technology. No local setup, no Docker, no environment headaches. Just describe what you want and watch it get built.

## What is Bolt.new?

Bolt.new is an AI coding platform that combines:

- **AI Code Generation**: Claude-powered (with other model options) code synthesis
- **WebContainers Runtime**: Full Node.js environment running directly in your browser tab
- **Integrated File System**: Browse, edit, and manage project files
- **Live Preview**: See your app running in real time beside the code
- **One-Click Deploy**: Push to Netlify or other platforms instantly

Unlike Lovable or v0 which focus on frontend scaffolding, Bolt.new runs a real development server — npm, package installation, environment variables, and all — without touching your local machine.

## How Bolt.new Works

Under the hood, Bolt.new uses **StackBlitz WebContainers** — a technology that runs a full operating system environment inside a browser tab using WebAssembly. This means:

- Real `npm install` that actually resolves packages
- A live Vite (or other) dev server with hot module replacement
- File operations that persist within your session
- Terminal access for manual commands

The AI layer sits on top of this, interpreting your prompts and making targeted file edits, running commands, and validating that changes work before presenting them to you.

## Getting Started

### Your First App in 60 Seconds

1. Visit [bolt.new](https://bolt.new)
2. Sign in with GitHub or email
3. Type a prompt in the center input field
4. Click **Start building** and watch the magic happen

**Example prompts to try:**
- *"Build a Pomodoro timer app with React and Tailwind CSS"*
- *"Create a personal finance tracker with charts and localStorage persistence"*
- *"Build a REST API with Express and SQLite for a todo list"*
- *"Make a markdown note-taking app with live preview"*

Bolt will scaffold the project, install dependencies, and show you a live preview — all in about 30–60 seconds.

### Navigating the Interface

The Bolt.new UI has three main panels:

| Panel | Purpose |
|-------|---------|
| **Chat** | Describe features, ask questions, request changes |
| **Code Editor** | Browse and manually edit generated files |
| **Preview** | Live-running app with hot reload |

You can resize panels, open a terminal, and toggle between code and preview modes.

## Working with Bolt.new

### Iterative Development

After the initial scaffold, keep chatting to add features:

```
"Add a dark mode toggle to the header"
"Implement user authentication with JWT"
"Add form validation with error messages"
"Connect to the OpenAI API and show AI responses inline"
```

Each request makes surgical edits rather than regenerating everything. Bolt understands the existing codebase context.

### Manual Editing

Don't like a generated implementation? Edit directly in the code panel. The AI will pick up your changes in subsequent prompts — it always works from the current state of the files.

### Terminal Access

Open the built-in terminal to run custom commands:

```bash
npm install some-library
npx prisma migrate dev
git init && git add .
```

![Developer working at terminal](https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800)
*Photo by [Fotis Fotopoulos](https://unsplash.com/@ffstop) on Unsplash*

### Importing Existing Projects

Bolt.new can import from:
- **GitHub repos**: Paste a GitHub URL to load any public repo
- **npm packages**: Reference a published template
- **File upload**: Drag and drop a zip of your project

This is powerful for debugging or continuing work from a local project.

## Supported Tech Stacks

Bolt.new works well with many popular stacks:

### Frontend
- React, Vue, Svelte, Angular
- Vite, Next.js, Astro, Remix
- Tailwind CSS, shadcn/ui, Chakra UI

### Backend
- Node.js with Express, Fastify, Hono
- Bun runtime support
- Supabase, PocketBase, Firebase integration

### Databases
- SQLite (in-browser via sql.js)
- Supabase (Postgres via API)
- localStorage for simple persistence

### Deployment
- Netlify (one-click)
- Stackblitz hosting
- Export zip to deploy anywhere

## AI Models Available

Bolt.new offers model selection (varies by plan):

| Model | Strengths |
|-------|----------|
| Claude 3.5 Sonnet | Best overall coding quality |
| GPT-4o | Strong reasoning, broad knowledge |
| Gemini 1.5 Pro | Large context, good for big projects |
| Mistral | Fast, efficient for simpler tasks |

Higher-tier plans get priority access and more tokens per request.

## Pricing

| Plan | Price | Tokens/Day | Features |
|------|-------|-----------|---------|
| Free | $0 | Limited | Basic projects, watermark |
| Pro | $20/mo | ~10M | Unlimited projects, all models |
| Team | Custom | Unlimited | Private repos, SSO, admin |

**Tip:** Tokens are consumed per AI generation step, not per session. Simple projects use far fewer tokens than complex ones.

## Bolt.new vs. Competitors

| Feature | Bolt.new | Lovable | v0 (Vercel) | Replit |
|---------|----------|---------|------------|--------|
| Full backend | ✅ | Partial | ❌ (frontend) | ✅ |
| Browser-native runtime | ✅ | ❌ | ❌ | ❌ |
| Real npm install | ✅ | ❌ | ❌ | ✅ |
| One-click deploy | ✅ | ✅ | ✅ | ✅ |
| Local setup needed | ❌ | ❌ | ❌ | ❌ |
| Multi-file editing | ✅ | ✅ | Partial | ✅ |

Bolt.new's killer differentiator is the **full-stack, browser-native runtime**. You're not generating static code — you're running a real server.

## Practical Use Cases

### Rapid Prototyping
Build a working prototype for a meeting or pitch in an hour. Show stakeholders a real, clickable app, not a mockup.

### Learning Projects
Students can build full-stack projects without the pain of configuring local environments. Focus on learning, not setup.

### Internal Tools
Non-engineers can create admin dashboards, data visualization tools, or simple CRUD apps independently.

### Side Projects
Validate an idea quickly before committing to a full development cycle. If it works, export the code and continue locally.

## Tips for Best Results

1. **Be specific in your first prompt** — include the tech stack, key features, and UI style you want
2. **One feature at a time** — iterative small prompts work better than massive ones
3. **Describe problems, not solutions** — "the chart doesn't update when I filter" > "add an onClick handler"
4. **Use the terminal** for anything the AI is struggling with (installing packages, running migrations)
5. **Export early** — once you're happy, download the zip to continue in your local IDE

## Limitations

- **Session persistence**: Projects live in browser storage; use GitHub export to persist across sessions
- **Token limits**: Very large codebases can hit context limits mid-conversation
- **Database**: No persistent hosted database on free tier; Supabase integration required for production data
- **Performance**: Complex AI generations can take 20–60 seconds

## Conclusion

Bolt.new represents a genuine shift in how we can prototype and build web applications. By combining a real in-browser runtime with powerful AI code generation, it removes the friction that normally sits between an idea and a working application. For rapid prototyping, learning, and building internal tools, it's hard to beat — and for many use cases, the code it generates is production-quality enough to deploy directly.

**Start building for free at [bolt.new](https://bolt.new)**

---

*Have you shipped something real with Bolt.new? Drop your project in the comments — love seeing what people build!*
