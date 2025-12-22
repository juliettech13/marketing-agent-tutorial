# Marketing Agent - Day 1

> **Welcome to Day 1!** Over the next 7 days, you'll build a smart AI agent that analyzes GitHub repositories and generates marketing content ideas for developer-focused products.

## 🎯 What You'll Build

By the end of this 7-day tutorial, you'll have a hybrid agent/workflow system that:

- 📚 Reads GitHub repositories (code, commits, README)
- 🤔 Decides what type of marketing content would be useful
- ✍️ Generates drafts (changelog posts, feature announcements, use case examples)
- 📧 Emails you weekly fresh content ideas

## 📍 Day 1 Goals

Today, you'll learn:

1. The difference between agents and workflows (and when to use each)
2. How to set up your project with TypeScript and OpenAI
3. How to make your first LLM request through an AI Gateway
4. How to get automatic observability for every request

## 🧠 Agents vs Workflows: The Mental Model

Most "agents" today aren't agents at all. they're workflows that call an LLM.

### Workflows
```
Predetermined paths. You define the steps. LLM fills in the blanks.

Input → Step 1 → Step 2 → Step 3 → Output

✅ Predictable      ✅ Easier to debug    ✅ Lower cost
❌ Rigid            ❌ Limited scope      ❌ Manual updates
```

### Agents
```
Dynamic decisions. LLM chooses next action based on context.

Input → Think → Act → Observe → Think → Act → ... → Output

✅ Flexible         ✅ Handles novelty   ✅ Self-correcting
❌ Unpredictable    ❌ Hard to debug     ❌ Higher cost
```

### When to use which?

| Use Workflows When | Use Agents When |
|-------------------|-----------------|
| Steps are known upfront | User intent varies wildly |
| Reliability > flexibility | Task requires reasoning about many options |
| You're optimizing for cost | Self-correction is key |
| You can enumerate all paths | You can't predict all edge cases |

### Our Hybrid Architecture

Throughout this tutorial, we'll build what's known as a **hybrid approach** :
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

## 🚀 Getting Started in 5 mins

### Step 1: Prerequisites

Before you begin, make sure you have:

- Node.js 18+ installed

### Step 2: Project Setup

1. **Create a new directory and initialize:**

```bash
mkdir marketing-agent
cd marketing-agent
npm init -y
npm install openai dotenv
npm install -D typescript @types/node tsx
npx tsc --init
```

2. **Update your `package.json`:**

Add `"type": "module"` to enable ES6 modules:

```json
{
  "name": "marketing-agent",
  "type": "module",
  // ...
}
```

3. **Create a `.env` file in your project root:**

```bash
HELICONE_API_KEY=your_key_here # Get your free Helicone API key at https://us.helicone.ai/settings/api-key
GITHUB_TOKEN=your_github_token # Get your GitHub personal access token at https://github.com/settings/tokens
```

### Step 3: Your First LLM Request

Create a `src` folder and add `src/agent.ts`:

```bash
mkdir src
```

Now create `src/agent.ts` with the following code:

```typescript
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

// 1. Set up the OpenAI client (but pointed at Helicone)
const client = new OpenAI({
  baseURL: "https://ai-gateway.helicone.ai",
  apiKey: process.env.HELICONE_API_KEY
});

// 2. Create a function that analyzes a GitHub repo
async function analyzeRepo(repoUrl: string) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini", // Fast, cheap, good enough for testing
    messages: [
      {
        role: "system",
        content: "You are a marketing analyst, expert in developer marketing. You analyze Github repositories and suggest content ideas for going to market."
      },
      {
        role: "user",
        content: `What type of marketing content would be useful for the users of this product? Review this repository: ${repoUrl} in depth to find out.`
      }
    ]
  });

  return response.choices[0]?.message.content;
}

// 3. Test it with the Helicone repository
analyzeRepo("https://github.com/helicone/helicone")
  .then(result => console.log(result))
  .catch(err => console.error(err));
```

### Step 4: Run Your Agent

```bash
npx tsx src/agent.ts
```

You should see AI-generated marketing content ideas in your console.

### Step 5: Check Your Observability Dashboard

Visit [https://us.helicone.ai/dashboard](https://us.helicone.ai/dashboard) to see your LLM request logged with full observability - no extra code needed!

## 🤔 What Just Happened?

Let's break down what you just built:

1. **You used OpenAI's SDK** - Familiar interface, easy to work with
2. **Pointed it at Helicone's gateway** - Instead of calling OpenAI directly
3. **The gateway logged everything** - Request, response, tokens, latency
4. **Translated and forwarded your request** - To the LLM provider (OpenAI)
5. **You got automatic observability** - Without writing any logging code

This is the power of using an AI Gateway!

## 📁 What We'll Build (Future Structure)

Over the next 7 days, your project will evolve into this structure:

```
marketing-agent/
├── src/
│   ├── index.ts           # Entry point - runs the agent
│   ├── agent.ts           # Main agent loop (perceive → reason → act)
│   ├── types.ts           # AgentState interface
│   ├── github.ts          # fetchRepoContext() - GitHub API calls
│   ├── tools.ts           # Tool definitions + executeTool()
│   ├── memory.ts          # Memory class - conversation history
│   └── monitor.ts         # logRunMetrics() - performance tracking
│
├── api/
│   └── cron.ts            # Vercel cron handler for weekly runs
│
├── .env                   # Environment variables
├── vercel.json            # Cron schedule config
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

> 📝 **Note:** Don't worry about creating all these files now! You'll build them step-by-step throughout the tutorial.

## 🔧 Understanding What You Built Today

### Why an AI Gateway?

Think of it as middleware, a smart proxy between your application and your LLM provider. In our case, you've just used [Helicone](https://helicone.ai) as our AI Gateway.

```
Your Code → Helicone Gateway → OpenAI/Anthropic/etc. → Response
                    ↓
          Logging + Observability
```

**Why this matters:**
- ✅ **Switch models instantly:** Access 100+ models through one API key
- ✅ **Automatic observability:** Every request logged without extra code
- ✅ **Provider failover:** If OpenAI is down, automatically try Anthropic
- ✅ **Cost optimization:** Built-in caching can save up to 90% of costs

## 📦 Dependencies Installed

- **openai** - OpenAI SDK (works with any LLM through Helicone gateway)
- **dotenv** - Loads environment variables from `.env` file
- **typescript** - Type safety and modern JavaScript features
- **tsx** - Fast TypeScript execution (no build step needed for development)
- **@types/node** - TypeScript types for Node.js

## 🔮 What's Next: Your 7-Day Journey

You've completed Day 1! Here's what's coming:

- [x] **Day 1:** Basic setup and first LLM request ✅
- [ ] **Day 2:** Agent execution loop + GitHub API integration
- [ ] **Day 3:** Tool calling and function execution
- [ ] **Day 4:** Memory and context management
- [ ] **Day 5:** Content generation workflows
- [ ] **Day 6:** Deployment and scheduling
- [ ] **Day 7:** Debugging and observability deep dive

Each day builds on the previous one, so make sure you've completed today's homework before moving forward!

## ✅ Day 1 Homework

Before moving to Day 2, make sure you:

1. ✅ Have a working `src/agent.ts` file
2. ✅ Can run `npm start` and see output in your console
3. ✅ Can see your request in the [Helicone dashboard](https://us.helicone.ai/dashboard)
4. ✅ Understand the difference between agents and workflows

**Extra Credit:**
- Try analyzing a different GitHub repository
- Modify the system prompt to ask for different types of content
- Check the Helicone dashboard to see token usage and response times

## 🐛 Troubleshooting

### "Missing API key" error

Make sure your `.env` file is in the project root (same folder as `package.json`) and contains:

```bash
HELICONE_API_KEY=sk-helicone-...
GITHUB_TOKEN=ghp_...
```

Then restart your terminal or run `source .env` to reload environment variables.

### "Module not found" error

Double-check that `"type": "module"` is in your `package.json`:

```json
{
  "type": "module"
}
```

If you're still getting errors, try deleting `node_modules` and reinstalling:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Request not showing in Helicone dashboard

1. Verify your `HELICONE_API_KEY` is correct (it should start with `sk-helicone-`)
2. Make sure you are loading `dotenv` at startup so your API key is loaded into your environment variables
3. Check the `baseURL` is exactly: `https://ai-gateway.helicone.ai`
4. Wait 10-15 seconds and refresh the dashboard
5. Make sure you're logged into the correct Helicone account

### "Unauthorized" or 401 errors

This likely means your Helicone API key is incorrect or expired. Generate a new one at [https://us.helicone.ai/settings/api-key](https://us.helicone.ai/settings/api-key)

Still stuck? The code is working if you can see output in your console - the Helicone dashboard issues can be debugged later!

## 📚 Learn More

### Resources for Day 1
- [Helicone Documentation](https://docs.helicone.ai) - Learn more about the AI Gateway
- [OpenAI API Reference](https://platform.openai.com/docs) - Understanding chat completions
- [GitHub REST API](https://docs.github.com/en/rest) - You'll need this for Day 2!

## 💬 Getting Help

If you're stuck or have questions:
1. Check the troubleshooting section above
2. Review your Helicone dashboard for error details
3. Make sure you completed all steps in order
4. Try the "extra credit" homework to build intuition

## 🎉 Congratulations!

You've completed Day 1! You now have:
- ✅ A working TypeScript + OpenAI project
- ✅ Your first LLM request through an AI Gateway
- ✅ Automatic observability for all your requests
- ✅ Understanding of when to use agents vs workflows

Tomorrow, you'll build the agent execution loop and connect to the GitHub API to read real repository data.

See you on Day 2! 🚀
