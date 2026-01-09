# Become an AI Engineer in 7 days

Welcome to the 7-day AI agent building workshop! This repository contains everything you need to build a production-ready marketing agent from scratch.

## What We're Building

By the end of this course, you'll have built a **hybrid agent and workflow system** that:
- Analyzes GitHub repositories (code, commits, README files)
- Decides what type of marketing content to create
- Generates drafts
- Posts drafts to Typefully for social media
- Runs on a schedule for weekly content generation

This repository contains complete working code, plus 7 days of tutorials to understand how it all works.

## Quick Start

### Prerequisites
- Node.js 18+ installed

### Setup

1. **Create a new project**
   ```bash
   mkdir marketing-agent
   cd marketing-agent
   npm init -y
   ```

2. **Open the tutorial for your day**
  Navigate to TUTORIALS/ folder and open your day's file
  For example: `TUTORIALS/day-1.md`

1. **Follow the tutorials**

  Open `TUTORIALS/day-1.md` and start building!

  Each tutorial guides you through creating the files step by step.

  You can reference the complete solution in the `src/` folder at any time, but you'll learn more by building it yourself.

### Run the Finished Solution

To run the finalized working code, clone the repository and run the following commands:

```bash
git clone <this-repo-url>
cd marketing-agent
npm install
# Add your .env file with API keys
npm run start
```

## What you'll learn

This repository includes 7 days of tutorials in the `TUTORIALS/` folder. Each tutorial builds on the previous one:

- **Day 1**: Setup & First LLM Request
- **Day 2**: Building the Agent Loop
- **Day 3**: Tool Calling & Actions
- **Day 4**: Memory & Context Management
- **Day 5**: MCP & Posting to Typefully
- **Day 6**: Production Deployment
- **Day 7**: Monitoring & Observability

**Start here**: Open `TUTORIALS/day-1.md` to begin learning how the agent works.

## Project Structure

```
marketing-agent/
├── src/
│   ├── index.ts           # Entry point - runs the agent
│   ├── agent.ts           # Main agent loop (Think → Act → Observe)
│   ├── types.ts           # TypeScript interfaces (AgentState)
│   ├── github.ts          # GitHub API integration
│   ├── tools.ts           # Tool definitions & execution
│   ├── memory.ts          # Conversation history management
│   ├── mcp.ts             # MCP client for Typefully integration
│   └── cron.ts            # Vercel cron handler (production)
│
├── TUTORIALS/
│   ├── day-1.md           # Setup & First LLM Request
│   ├── day-2.md           # Building the Agent Loop
│   ├── day-3.md           # Tool Calling & Actions
│   ├── day-4.md           # Memory & Context Management
│   ├── day-5.md           # MCP & Posting to Typefully
│   ├── day-6.md           # Monitoring & Observability
│   └── day-7.md           # Production Deployment
│
├── .env                   # Environment variables (create this)
├── vercel.json            # Cron schedule config
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

## Troubleshooting

**Missing API key error:**
- Verify `.env` is in project root (same folder as `package.json`)
- Format: `HELICONE_API_KEY=sk-helicone-...`
- Restart terminal after creating `.env`

**Module not found error:**
- Check `"type": "module"` is in `package.json`
- Reinstall: `rm -rf node_modules package-lock.json && npm install`

**Request not in Helicone dashboard:**
- Verify API key starts with `sk-helicone-`
- Confirm `baseURL` is `https://ai-gateway.helicone.ai`
- Wait 10-15 seconds, then refresh dashboard
- Ensure you have credits in your account

**GitHub API rate limit:**
- Authenticated requests get 5,000/hour
- Check rate limit: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/rate_limit`

**Need more help?**

Each tutorial in `TUTORIALS/` includes detailed troubleshooting for specific concepts.

Or reach out to me on [X](https://x.com/_juliettech) and I'll be happy to help!

## Resources

- [Helicone Documentation](https://docs.helicone.ai) - AI Gateway & Observability
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP specification
- [Typefully](https://typefully.com) - Social media scheduling
- [Vercel](https://vercel.com) - Production deployment
- [Cron](https://cron.com) - Schedule jobs
