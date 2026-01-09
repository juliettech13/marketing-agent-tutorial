# Day 7: Observability & Debugging

Your agent runs in production. Now make it debuggable.

## The 5 Most Common Agent Failures

```
┌─────────────────────────────────────────────────────────────┐
│  #1  INFINITE LOOPS                                         │
│  Agent calls same tool repeatedly, never completes          │
│  → Check: Repeated tool calls in session trace              │
├─────────────────────────────────────────────────────────────┤
│  #2  WRONG TOOL SELECTION                                   │
│  Agent picks wrong tool or skips data gathering             │
│  → Check: Tool call order doesn't make sense                │
├─────────────────────────────────────────────────────────────┤
│  #3  HALLUCINATED ARGS                                      │
│  Tool called with made-up data or invalid parameters        │
│  → Check: function.arguments in tool_calls                  │
├─────────────────────────────────────────────────────────────┤
│  #4  CONTEXT OVERFLOW                                       │
│  Agent forgets earlier steps, hits token limits             │
│  → Check: Token count per request                           │
├─────────────────────────────────────────────────────────────┤
│  #5  API FAILURES                                           │
│  GitHub rate limits, timeouts, provider errors              │
│  → Check: Filter by status >= 400                           │
└─────────────────────────────────────────────────────────────┘
```

---

## What You Already Have

**You're already logging everything to Helicone.**

Every LLM call goes through the gateway and is automatically tracked. In this tutorial, we'll just add advanced tracking and teach you how to maximize the dashboard to debug your agent.

---

## Step 1: Add Session Tracking

**Sessions** are groupings of related LLM calls. For AI agents, this is critical because:
- Each agent run involves multiple LLM calls (tool selection, tool execution, final response)
- You need to see the **complete decision-making flow**, not isolated requests
- Sessions let you replay and debug the entire agent conversation

Update `src/agent.ts` to add session tracking headers:

```typescript
import { randomUUID } from "crypto";

const client = new OpenAI({
  baseURL: "https://ai-gateway.helicone.ai",
  apiKey: process.env.HELICONE_API_KEY,
  defaultHeaders: {
    "Helicone-Session-Id": randomUUID(),
    "Helicone-Session-Name": "Marketing Agent Run",
    "Helicone-Session-Path": "/agent/run",
    "Helicone-Property-Repository": process.env.TARGET_REPO || "helicone/helicone",
    "Helicone-Property-Environment": process.env.NODE_ENV || "development"
    // ... anything you want to track!
  }
});
```

Done. All requests are now grouped by session.

---

## Step 2: Using the Dashboard

**View Sessions:** https://helicone.ai/sessions
- Click any session to see timeline of all LLM calls
- See tool selections, executions, and results in order

**Filter by Repository:**
- Go to https://helicone.ai/requests
- Add Filter → Property: Repository → Enter repo name

**Find Issues:**
- Expensive runs: `Cost > $0.10` + Group by Session
- Failures: `Status >= 400`
- Slow agents: `Session duration > 30s`

---

## Step 3: Debug Patterns

**Infinite Loop:** Same tool called repeatedly → Improve tool description or add max iterations

**Wrong Tools:** Agent skips data gathering → Check prompt explicitly mentions all required steps

**Hallucinated Args:** Tool fails with invalid params → Click failed call → View function.arguments

**High Cost:** Session costs $0.50+ → Check token counts, use cheaper model, or add limits

When analyzing sessions, check:
1. Did agent gather context first?
2. Are tool calls in logical order?
3. Is context growing too large?

---

## Step 4: Set Up Alerts

Go to Settings → Alerts and create:

- `Cost > $5 per day` - Control spend
- `Error rate > 10%` - Catch failures
- `Session duration > 60s` - Catch slow/stuck agents
- `Session request count > 20` - Catch infinite loops

---

## Best Practices

**Use Descriptive Session Names:**

```typescript
// ❌ Bad: Generic name
"Helicone-Session-Name": "Agent Run"

// ✅ Good: Descriptive names
"Helicone-Session-Name": `Marketing Agent - ${repoName} - ${timestamp}`
```

**Track Trigger Source:**

```typescript
"Helicone-Session-Path": "/cron/weekly"        // Scheduled
"Helicone-Session-Path": "/webhook/pr-opened"  // GitHub trigger
"Helicone-Session-Path": "/api/manual"         // User initiated
```

---

## Metrics to Track

| Metric | Target |
|--------|--------|
| Avg requests per session | 5-10 |
| Avg cost per session | < $0.20 |
| Avg session duration | < 30s |
| Session success rate | > 95% |

**Red Flags:**
- 20+ requests per session → Inefficiency or looping
- Cost increasing week over week → Agent getting worse
- One tool called 10x more than others → Over-reliance

---

## What You Have

- ✅ Complete session tracking
- ✅ Timeline view of all LLM calls
- ✅ Cost and latency monitoring
- ✅ Real-time alerts
- ✅ Debugging dashboard

All with just header changes.

---

## Resources

**Helicone:**
- [Sessions](https://helicone.ai/sessions)
- [Dashboard](https://helicone.ai/dashboard)
- [Docs: Sessions](https://docs.helicone.ai/features/sessions)
- [Docs: AI Agents](https://docs.helicone.ai/use-cases/ai-agents)

---

## Done!

Congratulations! You're now an AI engineer.

So, what will you build next?

Find us at [@juliettech13](https://x.com/_juliettech) and [@heliconeai](https://x.com/heliconeai).
