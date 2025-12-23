# How to Build an AI Agent

Over the next 7 days, we'll build a hybrid agent and workflow system that analyzes GitHub repositories and generates marketing content. System reads repos (code, commits, README), decides content type, generates drafts, and emails weekly ideas.

## Day 1: Setup & First LLM Request

Learn agents vs workflows, set up TypeScript + OpenAI, make your first LLM request through an AI Gateway, and get automatic observability.

## Agents vs Workflows

Most "agents" today aren't agents at all. they're workflows that call an LLM.

**Workflows**: Predetermined paths. You define steps, LLM fills blanks.
```
Input → Step 1 → Step 2 → Step 3 → Output

✅ Predictable      ✅ Easier to debug    ✅ Lower cost
❌ Rigid            ❌ Limited scope      ❌ Manual updates
```

**Agents**: Dynamic decisions. LLM chooses next action based on context.
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

### Hybrid Architecture

For our marketing agent, we'll build what's known as a **hybrid approach** :
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

## Get Started

### 1. Setup

**Prerequisites**: Node.js 18+

**Install:**
```bash
mkdir marketing-agent && cd marketing-agent
npm init -y
npm install openai dotenv
npm install -D typescript @types/node tsx
npx tsc --init
```

**Configure `package.json`** - Add ES6 modules:
```json
{
  "name": "marketing-agent",
  "type": "module",
  // ...
}
```

**Create `.env`:**
```bash
HELICONE_API_KEY=your_key_here  # Get at https://us.helicone.ai/settings/api-key
GITHUB_TOKEN=your_github_token  # Get at https://github.com/settings/tokens
```

### 2. Send an LLM Request

Create `src/agent.ts`:

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

### 3. Run it

```bash
npx tsx src/agent.ts
```

**View logs:** [https://us.helicone.ai/dashboard](https://us.helicone.ai/dashboard)

## Project Structure (Days 1-7)

```
marketing-agent/
├── src/
│   ├── index.ts           # Entry point
│   ├── agent.ts           # Main agent loop (perceive → reason → act)
│   ├── types.ts           # AgentState interface
│   ├── github.ts          # fetchRepoContext() - GitHub API
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

## Troubleshooting

**Missing API key error:**
- Check `.env` is in project root (same folder as `package.json`)
- Verify format: `HELICONE_API_KEY=sk-helicone-...`
- Restart terminal

**Module not found error:**
- Add `"type": "module"` to `package.json`
- Or reinstall: `rm -rf node_modules package-lock.json && npm install`

**Request not in Helicone dashboard:**
- Verify API key starts with `sk-helicone-`
- Confirm `baseURL` is `https://ai-gateway.helicone.ai`
- Wait 10-15 seconds, refresh dashboard
- Check you're logged into correct account

**401 Unauthorized:**
- Generate new API key at [https://us.helicone.ai/settings/api-key](https://us.helicone.ai/settings/api-key)

## Resources

- [Helicone Documentation](https://docs.helicone.ai)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [GitHub REST API](https://docs.github.com/en/rest)
