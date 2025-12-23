# Day 2: Building the Agent Loop

Yesterday you made your first LLM call through the gateway. Today, we're building the actual agent architecture.

Every agent is a `while` loop making decisions based on what the LLM returns. The magic of agents lies in how we structure that loop.

## The Agent Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                     THE AGENT LOOP                              │
│                                                                 │
│                    ┌──────────────┐                             │
│                    │    INPUT     │                             │
│                    │  (Goal/Task) │                             │
│                    └──────┬───────┘                             │
│                           │                                     │
│                           ▼                                     │
│         ┌────────────────────────────────────┐                  │
│         │                                    │                  │
│         │  ┌─────────┐    ┌───────────────┐  │                  │
│         │  │  THINK  │ →  │    DECIDE     │  │                  │
│         │  │ (LLM)   │    │ (Tool/Answer) │  │                  │
│         │  └─────────┘    └───────┬───────┘  │                  │
│         │                         │          │                  │
│         │         ┌───────────────┴──────┐   │                  │
│         │         │                      │   │                  │
│         │         ▼                      ▼   │                  │
│         │  ┌────────────┐    ┌──────────────┐│                  │
│         │  │    ACT     │    │   RESPOND    ││                  │
│         │  │ (Run Tool) │    │ (Final Answer││                  │
│         │  └──────┬─────┘    └──────────────┘│                  │
│         │         │                   │      │                  │
│         │         ▼                   │      │                  │
│         │  ┌────────────┐             │      │                  │
│         │  │  OBSERVE   │             │      │                  │
│         │  │ (Result)   │ ────────────┘      │                  │
│         │  └──────┬─────┘                    │                  │
│         │         │                          │                  │
│         │         └───────── LOOP ───────────┘                  │
│         │                                                       │
│         └───────────────────────────────────────────────────────┘
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**How to set up your loop:**

1. **Thought:** LLM gathers data, reasons about current state
2. **Action:** LLM decides what to do, calls a tool
3. **Observation:** Tool executes, we see the returned output
4. **Repeat** until task is complete

Today, we'll connect our agent with the GitHub API and start building our agent loop.

## Setup

### Install GitHub Package

```bash
npm install @octokit/rest
```

### Update Your Environment Variables

Update your `.env`:

```bash
HELICONE_API_KEY=your_key_here
GITHUB_TOKEN=your_github_token
TARGET_REPO=helicone/helicone  # Format: owner/repo
```

## Step 1: Define Agent State

Create `src/types.ts`:

```typescript
export interface AgentState {
  repoOwner: string;
  repoName: string;
  repoContext: {
    readme: string;
    recentCommits: string[];
    language: string;
  } | null;
  contentType: "changelog" | "feature" | "use-case" | null;
  draft: string | null;
  step: "perceive" | "reason" | "act" | "done";
}
```

## Step 2: Read the GitHub Repo

Create `src/github.ts`:

```typescript
import { Octokit } from "@octokit/rest";

const github = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function fetchRepoContext(owner: string, repo: string) {
  const [repoData, readmeData, commits] = await Promise.all([
    github.repos.get({ owner, repo }),
    github.repos.getReadme({ owner, repo, mediaType: { format: "raw" } })
      .catch(() => ({ data: "No README" })),
    github.repos.listCommits({ owner, repo, per_page: 5 })
  ]);

  return {
    readme: String(readmeData.data).slice(0, 2000), // Token limit
    recentCommits: commits.data.map(c => c.commit.message),
    language: repoData.data.language || "Unknown"
  };
}
```

This function fetches repository context in parallel: README, recent commits, and primary language. We limit the README to 2000 characters to manage token costs, but you may want to fetch the entire README.

## Step 3: Build the Agent Loop

Replace the contents of `src/agent.ts` with:

```typescript
import OpenAI from "openai";
import { randomUUID } from "crypto";
import type { AgentState } from "./types";
import { fetchRepoContext } from "./github";

const client = new OpenAI({
  baseURL: "https://ai-gateway.helicone.ai",
  apiKey: process.env.HELICONE_API_KEY
});

export async function runAgent(repoFullName: string) {
  const [owner, repo] = repoFullName.split("/");
  const sessionId = randomUUID();

  let state: AgentState = {
    repoOwner: owner!,
    repoName: repo!,
    repoContext: null,
    contentType: null,
    draft: null,
    step: "thought",
  };

  // Agent loop
  while (state.step !== "done") {
    console.log(`Step: ${state.step}`);
    state = await executeStep(state, sessionId);
  }

  return state.draft;
}

async function executeStep(
  state: AgentState,
  sessionId: string
): Promise<AgentState> {
  switch (state.step) {
    case "thought":
      const context = await fetchRepoContext(state.repoOwner, state.repoName);
      return { ...state, repoContext: context, step: "action" };

    case "action":
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Repository: ${state.repoOwner}/${state.repoName}
            Recent commits: ${state.repoContext?.recentCommits.join(", ")}

            What content type makes sense? Reply with ONE word: changelog, feature, or use-case`,
          },
        ]},
        {
          headers: {
            "Helicone-Session-Id": sessionId,
            "Helicone-Property-Repository": `${state.repoOwner}/${state.repoName}`,
          },
        }
      );

      const contentType = response.choices[0]?.message.content
        ?.trim()
        .toLowerCase() as any;
      return { ...state, contentType, step: "observation" };

    case "observation":
      const draft = `[${state.contentType?.toUpperCase()}]

      Repository: ${state.repoOwner}/${state.repoName}
      Based on recent commits: ${state.repoContext?.recentCommits[0]}

      (Full generation coming Day 3 with tools)`;

      return { ...state, draft, step: "done" };

    default:
      return state;
  }
}
```

### What's Happening Here?

1. **runAgent()** initializes state and runs the loop until completion
2. **executeStep()** handles each phase:
   - **Thought:** Fetch GitHub data
   - **Action:** LLM decides content type based on commits
   - **Observation:** Generate draft (placeholder for now)
3. **Session tracking:** The `sessionId` groups all requests in Helicone's dashboard

## Step 4: Create Entry Point

Create `src/index.ts`:

```typescript
import "dotenv/config";
import { runAgent } from "./agent";

runAgent(process.env.TARGET_REPO || "helicone/helicone")
  .then(draft => console.log("\n=== DRAFT ===\n", draft))
  .catch(err => console.error("Failed:", err));
```

## Run It

```bash
npx tsx src/index.ts
```

**Expected output:**

```
Step: perceive
Step: reason
Step: act
Step: done

=== DRAFT ===
[CHANGELOG]

Repository: helicone/helicone
Based on recent commits: Add new feature...

(Full generation coming Day 3 with tools)
```

## View in Helicone Dashboard

Visit [https://us.helicone.ai/dashboard](https://us.helicone.ai/dashboard) to see:
- All requests grouped by session ID
- Custom properties (repository, content type)
- Token usage per agent run
- Latency for each step

## Pro Tips

### Track Custom Properties

Add this to your OpenAI requests to track content types:

```typescript
const response = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [/* ... */],
  headers: {
    "Helicone-Session-Id": sessionId,
    "Helicone-Property-Repository": `${state.repoOwner}/${state.repoName}`,
    "Helicone-Property-ContentType": state.contentType || "unknown"
  }
});
```

## Troubleshooting

**GitHub API rate limit error:**
- Authenticated requests get 5,000/hour
- Check your token: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/rate_limit`
- Wait or use a different token

**"Cannot find module @octokit/rest":**
- Verify installation: `npm list @octokit/rest`
- Reinstall: `npm install @octokit/rest`

**Agent loop never exits:**
- Check that your `executeStep()` eventually returns `step: "done"`
- Add a max iteration counter for safety
- Log state changes to debug

**Requests not grouped in Helicone:**
- Ensure `Helicone-Session-Id` header is the same across all requests
- Use `randomUUID()` once at the start of `runAgent()`
- Verify header is passed in the OpenAI `create()` call

## Next Steps

Tomorrow we'll add **tool calling** so our agent can:
- Generate full marketing content
- Save drafts to files
- Make autonomous decisions about which tools to use

The loop structure you built today will stay the same—we're just giving the LLM more powerful actions.

## Resources

- [Octokit Documentation](https://octokit.github.io/rest.js/)
- [Helicone Session Tracking](https://docs.helicone.ai/features/sessions)
- [OpenAI Custom Headers](https://platform.openai.com/docs/api-reference/chat/create)

