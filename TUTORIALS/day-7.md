# Day 7: Observability & Debugging

Your agent runs in production. Now let's **make it debuggable**.

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

Update `src/agent.ts` to add one tracking header:

```typescript
const client = new OpenAI({
  baseURL: "https://ai-gateway.helicone.ai",
  apiKey: process.env.HELICONE_API_KEY,
  defaultHeaders: {
    "Helicone-Session-Id": randomUUID(),
    "Helicone-Property-Repository": process.env.TARGET_REPO || "helicone/helicone",
    "Helicone-Property-Environment": process.env.NODE_ENV || "development"
    // ... anything you want to track!
  }
});
```

That's it. Now all requests are grouped by session and tagged with the repo name.

---

## Step 2: Using the Dashboard

### View a Session

1. Go to https://helicone.ai/sessions
2. Click any session
3. See every LLM call in order:
   - Tool selections
   - Tool executions
   - Final generation

### Filter by Repository

1. Go to https://helicone.ai/requests
2. Click "Add Filter"
3. Select "Property: Repository"
4. Enter repo name

### Find Expensive Runs

```
Filter: Cost > $0.10
Group by: Session
```

### Find Failures

```
Filter: Status >= 400
```

---

## Step 3: Debug a Failed Session

**Example: Agent never completes**

1. Find the session in dashboard
2. See the timeline:
   ```
   1. Tool: generate_changelog ✓
   2. Tool: generate_changelog ✓
   3. Tool: generate_changelog ✓
   4. Tool: generate_changelog ✓ (repeating!)
   ```
3. Found it: Infinite loop calling same tool

**Fix:** Improve tool description or add max iterations

---

## Step 4: Set Up Alerts

In Helicone dashboard:

1. Go to Settings → Alerts
2. Create alert: "Cost > $5 per day"
3. Create alert: "Error rate > 10%"
4. Get emailed when thresholds hit

---

## Common Debug Patterns

### Pattern 1: Tool Not Being Called

**Symptom:** Agent never calls `create_typefully_draft`

**How to find:**
```
Filter by session
See which tools were called
Notice: Only generate_changelog, never create_typefully_draft
```

**Fix:** Improve prompt to mention saving to Typefully

### Pattern 2: Hallucinated Arguments

**Symptom:** Tool fails with invalid parameters

**How to find:**
```
Click on failed tool call
View: function.arguments
See: {"commits": "hello"} (should be array!)
```

**Fix:** Better tool parameter descriptions

### Pattern 3: High Costs

**Symptom:** Spending too much per run

**How to find:**
```
Group sessions by: Cost
Sort: Descending
See: Some sessions cost $0.50+ (outliers!)
```

**Fix:** Add token limits or use cheaper model

---

## What You've Built

A production agent with:
- ✅ Automatic request logging
- ✅ Session-based grouping
- ✅ Repository tagging
- ✅ Cost tracking
- ✅ Error monitoring

All without changing much additional code.

---

## Resources

- [Helicone Dashboard](https://helicone.ai/dashboard)
- [Helicone Sessions](https://helicone.ai/sessions)
- [Custom Properties](https://docs.helicone.ai/features/advanced-usage/custom-properties)

---

**You're done.** Production agent with observability.

Nicely done!!

~ Jules
