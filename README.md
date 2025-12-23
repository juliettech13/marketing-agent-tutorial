# How to Build an AI Agent

Welcome to the 7-day AI agent building workshop! This repository contains everything you need to build a production-ready marketing agent from scratch.

## What We're Building

By the end of this course, you'll have built a **hybrid agent and workflow system** that:
- Analyzes GitHub repositories (code, commits, README files)
- Intelligently decides what type of marketing content to create
- Generates high-quality drafts
- Runs on a schedule to email weekly content ideas


## How to Use This Repository

### Follow These Steps:

1. **Switch to your day's branch**
   ```bash
   git checkout day-1  # Or day-2, day-3, etc.
   ```

2. **Open the tutorial for your day**
   ```bash
   # Navigate to TUTORIALS/ folder and open your day's file
   # For example: TUTORIALS/day-1.md
   ```

3. **Follow the tutorial**
   Each day contains code that is self-contained, meaning you can run the code and see the results of the day.

   Each day's tutorial contains:
   - Concepts you'll learn
   - Step-by-step code examples
   - Troubleshooting tips
   - Working code in the branch

### Course Structure

- **Day 1**: Setup & First LLM Request
- **Day 2**: Building the Agent Loop
- **Day 3**: Tool Calling & Actions
- **Day 4**: Memory & Context Management
- **Day 5**: MCP & Posting to Typefully
- **Day 6**: Monitoring & Observability
- **Day 7**: Production Deployment

## What We're Building

### Understanding Agents vs Workflows

Most "agents" today aren't agents at all. Instead, they're workflows that call an LLM. Understanding the difference between agents and workflows is key to building reliable AI systems.

**Workflows** follow predetermined paths. You define the steps, the LLM fills in the blanks:
```
Input → Step 1 → Step 2 → Step 3 → Output

✅ Predictable      ✅ Easier to debug    ✅ Lower cost
❌ Rigid            ❌ Limited scope      ❌ Manual updates
```

**Agents** make dynamic decisions. The LLM chooses the next action based on context:
```
Input → Think → Act → Observe → Think → Act → ... → Output

✅ Flexible         ✅ Handles novelty   ✅ Self-correcting
❌ Unpredictable    ❌ Hard to debug     ❌ Higher cost
```

| Use Workflows When | Use Agents When |
|-------------------|-----------------|
| Steps are known upfront | User intent varies wildly |
| Reliability > flexibility | Task requires reasoning about many options |
| You're optimizing for cost | Self-correction is key |
| You can enumerate all paths | You can't predict all edge cases |

### Our Hybrid Architecture

This course teaches you to build a **hybrid approach**:
- **Workflows** for predictable tasks (fetching GitHub data, posting content)
- **Agent loops** for creative decisions (what to write about, how to frame it)

```
┌──────────────────────────────────────────────────────────────┐
│                    MARKETING AGENT                           │
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐  │
│  │  WORKFLOW   │ →  │    AGENT     │ →  │    WORKFLOW     │  │
│  │ Fetch GitHub│    │ Decide &     │    │ Format & post   │  │
│  │    data     │    │ write content│    │    content      │  │
│  └─────────────┘    └──────────────┘    └─────────────────┘  │
│                                                              │
│  Predictable         Creative           Predictable          │
└──────────────────────────────────────────────────────────────┘
```

## Quick Start

**Prerequisites**: Node.js 18+

### Setup

1. **Clone and checkout Day 1**
   ```bash
   git clone <this-repo-url>
   cd marketing-agent
   git checkout day-1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Then edit .env with your keys:
   # - HELICONE_API_KEY from https://us.helicone.ai/settings/api-key
   # - GITHUB_TOKEN from https://github.com/settings/tokens
   ```

4. **Open your tutorial**
   ```bash
   # Open TUTORIALS/day-1.md in your editor
   ```
5. **Start coding!**

  Follow the tutorial for day 1 to get started.



## What You'll Learn

### Day 1: Setup & First LLM Request
- Agents vs workflows fundamentals
- TypeScript project setup
- First LLM request through Helicone gateway
- Automatic observability

### Day 2: Building the Agent Loop
- The core agent architecture (Think → Act → Observe)
- GitHub API integration
- Agent state management
- Session tracking

### Day 3: Tool Calling & Actions
- OpenAI function calling
- Tool definitions and execution
- Dynamic tool selection
- Content generation

### Day 4: Memory & Context Management
- Conversation history
- Context window management
- Token optimization
- State persistence

### Day 5: MCP & Posting to Typefully
- Model Context Protocol (MCP) introduction
- Connecting to external tools via MCP
- Typefully integration for social media posting
- Multi-step tool calling loops
- MCP client setup and management

### Day 6: Monitoring & Observability
- Performance metrics
- Cost tracking
- Debugging with Helicone
- Production monitoring

### Day 7: Production Deployment
- Vercel deployment
- Cron scheduling
- Environment configuration
- Email integration

## Final Project Structure

By Day 7, your project will look like this:

```
marketing-agent/
├── src/
│   ├── index.ts           # Entry point
│   ├── agent.ts           # Main agent loop (Think → Act → Observe)
│   ├── types.ts           # AgentState interface
│   ├── github.ts          # GitHub API integration
│   ├── tools.ts           # Tool definitions & execution
│   ├── memory.ts          # Conversation history management
│   ├── mcp.ts             # MCP client for external tools (Typefully)
│   └── monitor.ts         # Performance tracking
│
├── api/
│   └── cron.ts            # Vercel cron handler for weekly runs
│
├── TUTORIALS/
│   ├── day-1.md           # Daily tutorials
│   ├── day-2.md
│   └── ...
│
├── .env                   # Environment variables
├── vercel.json            # Cron schedule config
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

## Branch Navigation

Each day has its own branch with working code:

```bash
git checkout day-1    # Start here
git checkout day-2    # After completing day 1
git checkout day-3    # And so on...
git checkout day-7    # Final production version
```

The `main` branch contains this overview README. Always switch to the specific day branch and read that day's tutorial in `TUTORIALS/`.

## Why This Approach?

Building AI agents requires understanding multiple concepts that build on each other:

1. **Foundation First**: You need to understand how LLMs work before building loops
2. **Incremental Complexity**: Each day adds one major concept
3. **Working Code**: Every branch has tested, runnable code
4. **Learn by Doing**: Follow tutorials, run code, see results immediately

By the end, you'll have built a complete agent system and understand every line of code.

## Common Troubleshooting

### Setup Issues

**Missing API key error:**
- Check `.env` is in project root (same folder as `package.json`)
- Verify format: `HELICONE_API_KEY=sk-helicone-...`
- Restart your terminal after creating `.env`

**Module not found error:**
- Ensure `"type": "module"` is in `package.json`
- Reinstall: `rm -rf node_modules package-lock.json && npm install`

### API Issues

**Request not in Helicone dashboard:**
- Verify API key starts with `sk-helicone-`
- Confirm `baseURL` is `https://ai-gateway.helicone.ai`
- Wait 10-15 seconds, then refresh dashboard
- Check you're logged into the correct account

**401 Unauthorized:**
- Generate a new API key at [https://us.helicone.ai/settings/api-key](https://us.helicone.ai/settings/api-key)
- Make sure to add credits to your account to be able to make requests.

**GitHub API rate limit:**
- Authenticated requests get 5,000/hour
- Check your rate limit: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/rate_limit`

### Need Help?

Each day's tutorial (`TUTORIALS/day-X.md`) includes specific troubleshooting for that day's concepts. Check there first!

## Resources

- [Helicone Documentation](https://docs.helicone.ai) - AI Gateway & Observability
- [OpenAI API Reference](https://platform.openai.com/docs) - LLM API docs
- [GitHub REST API](https://docs.github.com/en/rest) - Repository data access
