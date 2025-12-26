# Day 6: Deploy Agent to Run Weekly

Yesterday we connected your agent to Typefully via MCP so it can post drafts. Today we're **deploying it to run automatically** every week using Vercel cron jobs.

## What You'll Build

By the end of this tutorial, your agent will:
- Run your agent automatically every Monday at 9am UTC
- Analyze recent GitHub activity
- Generate and post content to Typefully
- Track all LLM requests in Helicone for cost monitoring and debugging

## Step 1: Create Cron Handler

Create `api/cron.ts`:

```typescript
import { runAgent } from "../src/agent";

export default async function handler(req: Request, res: Response) {
  const repo = process.env.TARGET_REPO || "helicone/helicone";
  const draft = await runAgent(repo);

  return new Response(JSON.stringify({ draft }), {
    headers: { "Content-Type": "application/json" }
  });
}
```

### What's Happening Here?

**Serverless function:**
- Vercel will call this endpoint on a schedule
- Reads target repository from environment variable
- Runs your agent with the specified repo
- Returns the generated draft as JSON

**Why serverless?**
- No server to maintain
- Only runs when needed (cost-effective)
- Scales automatically if you add more repos later

## Step 2: Schedule It

Create `vercel.json` in your project root:

```json
{
  "crons": [{
    "path": "/api/cron",
    "schedule": "0 9 * * 1"
  }]
}
```

This runs **every Monday at 9am UTC** based on your timezone and [Cron format](https://crontab.guru).

## Step 3: Add Environment Variables in Vercel

```
HELICONE_API_KEY=your_key
GITHUB_TOKEN=your_token
TARGET_REPO=helicone/helicone
TYPEFULLY_API_KEY=your_key
TYPEFULLY_SOCIAL_SET_ID=your_id
```

### Getting to Vercel Settings

1. Go to https://vercel.com/dashboard
2. Click on your project
3. Click **Settings** tab
4. Click **Environment Variables** in sidebar
5. Add each variable:
   - **Key**: Variable name (e.g., `HELICONE_API_KEY`)
   - **Value**: Your actual key
   - **Environments**: Select all (Production, Preview, Development)

**Important:** After adding environment variables, redeploy your project for them to take effect.

## Step 4: Deploy

```bash
npm i -g vercel
vercel login
vercel --prod
```

Your cron job is now live! You can view it in the Vercel dashboard.

## Step 5: Track LLM Requests for Observability

Add Helicone environment tracking to monitor production vs development, and any other [custom properties](https://docs.helicone.ai/features/advanced-usage/custom-properties) you'd like to track.

Open `src/agent.ts` and update the Helicone headers:

```typescript
const client = new OpenAI({
  apiKey: process.env.HELICONE_API_KEY,
  baseURL: "https://ai-gateway.helicone.ai/v1",
  defaultHeaders: {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
    "Helicone-Property-Environment": process.env.NODE_ENV === "production" ? "production" : "development"
  }
});
```

**Other useful properties:**
- `"Helicone-Property-Repo": state.repoName` - Track per repository
- `"Helicone-Property-ContentType": state.contentType` - Track content types
- `"Helicone-Property-Version": "2.0"` - Track code versions
- Anything else you'd like to track: `"Helicone-Property-<your-property>": <your-value>`

### Filtering in Helicone Dashboard

1. Go to https://helicone.ai/dashboard
2. Click **Requests** tab
3. Click **Add Filter**
4. Select **Property: Environment**
5. Choose **production**

Now you'll see only production requests!

## Step 6: Verify Deployment

### Check Cron Configuration

In Vercel Dashboard:
1. Go to your project
2. Click **Settings** → **Cron Jobs**
3. You should see:
   - **Path:** `/api/cron`
   - **Schedule:** `0 9 * * 1`
   - **Next run:** (timestamp)

## How It All Works Together

```
┌───────────────────────────────────────────────────────────┐
│                 PRODUCTION ARCHITECTURE                   │
│                                                           │
│  ┌──────────────────────────────────────────────┐        │
│  │           Monday 9am UTC                      │        │
│  │      Vercel Cron Scheduler                    │        │
│  └───────────────┬──────────────────────────────┘        │
│                  │                                        │
│                  │ 1. HTTP POST /api/cron                 │
│                  ↓                                        │
│  ┌──────────────────────────────────────────────┐        │
│  │  Serverless Function (api/cron.ts)           │        │
│  │  • Reads TARGET_REPO env var                 │        │
│  │  • Calls runAgent(repo)                      │        │
│  └───────────────┬──────────────────────────────┘        │
│                  │                                        │
│                  │ 2. Start agent execution               │
│                  ↓                                        │
│  ┌──────────────────────────────────────────────┐        │
│  │  Agent (src/agent.ts)                        │        │
│  │  • Fetches GitHub data                       │        │
│  │  • Calls OpenAI via Helicone                 │        │
│  │  • Uses tools (generate_changelog)           │        │
│  └───────────────┬──────────────────────────────┘        │
│                  │                                        │
│                  │ 3. Tool: create_typefully_draft        │
│                  ↓                                        │
│  ┌──────────────────────────────────────────────┐        │
│  │  MCP Client (src/mcp.ts)                     │        │
│  │  • Connects to Typefully MCP server          │        │
│  │  • Calls typefully_drafts_create_draft       │        │
│  └───────────────┬──────────────────────────────┘        │
│                  │                                        │
│                  │ 4. Create draft via API                │
│                  ↓                                        │
│  ┌──────────────────────────────────────────────┐        │
│  │  Typefully                                   │        │
│  │  • Draft appears in your account             │        │
│  │  • Ready to schedule/publish                 │        │
│  └──────────────────────────────────────────────┘        │
│                                                           │
│  Meanwhile, all LLM requests logged in Helicone:          │
│                                                           │
│  ┌──────────────────────────────────────────────┐        │
│  │  Helicone Dashboard                          │        │
│  │  • Track costs                               │        │
│  │  • Filter by Environment=production          │        │
│  │  • Debug failures                            │        │
│  └──────────────────────────────────────────────┘        │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

## Troubleshooting

**Cron job doesn't run:**
- Check Vercel Dashboard → Settings → Cron Jobs shows your schedule
- Verify deployment succeeded (check Deployments tab)
- Vercel hobby plan supports cron jobs (verify your plan)
- Wait for next scheduled time (can take up to 1 hour for first run)

**"Function exceeded timeout":**
- Vercel functions timeout after 10s (hobby) or 60s (pro)
- Your agent might be too slow
- Optimize: Cache GitHub data, reduce LLM calls
- Or upgrade to Vercel Pro for longer timeouts

**Environment variables not working:**
- Redeploy after adding env vars: `vercel --prod`
- Check spelling (case-sensitive)
- View in Dashboard → Settings → Environment Variables
- Test with a health check endpoint

**Draft not appearing in Typefully:**
- Check Vercel logs for errors
- Test MCP connection locally first
- Verify Typefully API key has correct permissions
- Check Helicone dashboard for OpenAI API errors

**High costs:**
- Set Helicone cost alerts
- Reduce cron frequency (weekly → bi-weekly)
- Use cheaper model (gpt-4o → gpt-4o-mini)
- Cache GitHub API responses

**Can't access Vercel logs:**
- Logs retained for 1 hour (hobby) or longer (pro)
- Check immediately after cron runs
- Or add custom logging (send to external service)

## Resources

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Cron Schedule Generator](https://crontab.guru)
- [Helicone Dashboard](https://helicone.ai/dashboard)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)

