# Day 5: MCP & Posting to Typefully

Yesterday we gave the agent memory to maintain conversation context. Today we're connecting to **external tools via MCP** so your agent can use tools designed by others (like Typefully) to post drafts (Typefully is a social media scheduler).

## What is MCP?

**Model Context Protocol (MCP)** is a standard connecting LLMs to external tools and services.

Instead of writing custom API wrappers for every service, MCP provides pre-built servers with standardized communication.

```
┌─────────────────────────────────────────────────────────┐
│  WITHOUT MCP                                            │
│  You write custom code wrapping every API               │
│                                                         │
│  ❌ Repetitive code for each API                        │
│  ❌ Different patterns for each service                 │
│  ❌ Manual auth handling                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  WITH MCP                                               │
│  Standard communication across all servers              │
│                                                         │
│  LLM ──→ MCP Client ──→ MCP Server ──→ Any Tool         │
│                                                         │
│  ✅ Plug-and-play integration                           │
│  ✅ Consistent interface                                │
│  ✅ Community-maintained servers                        │
└─────────────────────────────────────────────────────────┘
```

**Why use MCP instead of calling APIs?**
- **Standardization**: Same pattern for all external tools
- **Maintenance**: Service providers maintain their own MCP servers, updating versions as needed
- **Discovery**: LLMs can discover available tools automatically

## Step 1: Install Dependencies

```bash
npm install @modelcontextprotocol/sdk
```

This gives us the MCP client SDK to connect to any MCP server.

## Step 2: Get API Keys

Update `.env`:

```bash
TYPEFULLY_API_KEY=your_typefully_api_key_here
TYPEFULLY_SOCIAL_SET_ID=your_social_set_id_here
```

**Typefully API Key**

1. Go to https://typefully.com/
2. Create a new API key in your account settings
3. Copy the key

**Typefully Social Set ID**

This is your account identifier. To find it:

1. In your account settings, select "Development Mode"
2. Go to your avatar icon on the top right corner and copy your account ID

## Step 3: Create MCP Client

Create `src/mcp.ts`:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

let client: Client | null = null;

export async function getTypefullyMCP() {
  if (client) return client;

  const apiKey = process.env.TYPEFULLY_API_KEY;
  if (!apiKey) {
    throw new Error("TYPEFULLY_API_KEY environment variable is not set");
  }

  const transport = new StreamableHTTPClientTransport(
    new URL(`https://mcp.typefully.com/mcp?TYPEFULLY_API_KEY=${apiKey}`),
    { sessionId: crypto.randomUUID() }
  );

  client = new Client(
    { name: "marketing-agent", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  return client;
}
```

### What's Happening Here?

This is the equivalent of us setting up a back-end service with access to tons of APIs (in this case, Typefully's API).

**StreamableHTTPClientTransport:**
- Connects to Typefully's MCP server over HTTP
- API key passed as query parameter
- Each connection gets a unique session ID

**Client initialization:**
- Name and version identify your agent
- Capabilities can be extended later for advanced features

**Connection:**
- `connect()` establishes the connection to the MCP server
- MCP server now knows about your agent and can respond to requests

## Step 4: Add Typefully Tool so LLM can use it

Open `src/tools.ts` and add the import at the top:

```typescript
import { getTypefullyMCP } from "./mcp";
```

Add the tool definition to the `tools` array:

```typescript
export const tools: ChatCompletionTool[] = [
  // ... existing tools (analyze_codebase, generate_changelog, create_use_case)
  {
    type: "function",
    function: {
      name: "create_typefully_draft",
      description: "Save content as Typefully draft",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string" }
        },
        required: ["content"]
      }
    }
  }
];
```

Now add the tool execution logic in the `executeTool()` function:

```typescript
export async function executeTool(name: string, args: any) {
  // ... existing tool handlers

  if (name === "create_typefully_draft") {
    try {
      const mcp = await getTypefullyMCP();

      // Your Typefully account ID
      const socialSetId = process.env.TYPEFULLY_SOCIAL_SET_ID;
      if (!socialSetId) {
        throw new Error("TYPEFULLY_SOCIAL_SET_ID environment variable is not set");
      }

      // Create draft with proper structure
      const result = await mcp.callTool({
        name: "typefully_drafts_create_draft",
        arguments: {
          social_set_id: socialSetId,
          requestBody: {
            platforms: {
              x: {
                enabled: true,
                posts: [
                  {
                    text: args.content
                  }
                ]
              }
            }
          }
        }
      });

      console.log("Typefully MCP Result:", JSON.stringify(result, null, 2));
      return `✓ Draft saved to Typefully`;
    } catch (error) {
      console.error("Typefully MCP Error:", error);
      throw error;
    }
  }

  throw new Error(`Unknown tool: ${name}`);
}
```

### What's Happening Here?

**Tool definition:**
- Describes what the tool does (saves content to Typefully)
- Only requires `content` parameter (a string)
- LLM will decide when to call this tool

**Tool execution:**
- Get MCP client connection
- Validate social set ID exists
- Call the MCP server's `typefully_drafts_create_draft` tool
- Pass structured data for X/Twitter post
- Return success message to LLM

**MCP server call:**
- `mcp.callTool()` is the standard MCP method
- `name`: The specific tool on the Typefully MCP server
- `arguments`: Required data (account ID and post content)
- MCP server handles authentication and API calls

## Step 5: Update Agent with Tool Loop

The agent now needs to handle **multiple tool calls** in sequence. The LLM might:
1. First call `generate_changelog` to create content
2. Then call `create_typefully_draft` to save it

Open `src/agent.ts` and update the `case "action":` block:

```typescript
case "action":
  // Add user instruction with repo context
  memory.add("user", `Create ${state.contentType} content for ${state.repoOwner}/${state.repoName}.
  Recent commits: ${state.repoContext?.recentCommits.join(", ")}
  README excerpt: ${state.repoContext?.readme.slice(0, 200)}
  Primary language: ${state.repoContext?.language}
  Use the appropriate tool to generate content, format it as compelling tweet-length content (280 characters max) for developers, then save it to Typefully.`);

  // Start the conversation
  let response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: memory.getAll(),
    tools
  });

  // Tool calling loop - LLM will call tools until it's done
  while (response.choices[0]?.message.tool_calls) {
    const message = response.choices[0].message;
    const toolCalls = message.tool_calls!;

    // Save assistant's tool calls to memory
    memory.add("assistant", message.content || "", { tool_calls: toolCalls });

    // Execute each tool and add results to memory
    for (const toolCall of toolCalls) {
      if (toolCall.type !== "function") continue;

      console.log(`→ Calling ${toolCall.function.name}`);
      const result = await executeTool(
        toolCall.function.name,
        JSON.parse(toolCall.function.arguments)
      );

      memory.add("tool", result, {
        tool_call_id: toolCall.id,
        name: toolCall.function.name
      });
    }

    // Continue the conversation
    response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: memory.getAll(),
      tools
    });
  }

  const draftContent = response.choices[0]?.message.content || null;

  return {
    ...state,
    draft: draftContent,
    step: "done"
  };
```

### Understanding the Tool Loop

Here's what happens in the new multi-tool flow:

```
┌────────────────────────────────────────────────────────────────┐
│                     TOOL CALLING LOOP                          │
│                                                                │
│  START:                                                        │
│  User request: "Generate changelog and save to Typefully"      │
│                                                                │
│  ↓                                                             │
│                                                                │
│  ITERATION 1:                                                  │
│  LLM → calls generate_changelog(commits, repo_name)            │
│  Agent → executes tool                                         │
│  Tool → returns "## What's New\n• Feature X\n• Bug fix Y"      │
│  Memory ← saves tool result                                    │
│                                                                │
│  ↓                                                             │
│                                                                │
│  ITERATION 2:                                                  │
│  LLM sees changelog in memory                                  │
│  LLM → calls create_typefully_draft(formatted_content)         │
│  Agent → executes tool via MCP                                 │
│  MCP → posts to Typefully API                                  │
│  Tool → returns "✓ Draft saved to Typefully"                   │
│  Memory ← saves tool result                                    │
│                                                                │
│  ↓                                                             │
│                                                                │
│  ITERATION 3:                                                  │
│  LLM sees both results in memory                               │
│  LLM → no more tool_calls (task complete)                      │
│  Loop exits                                                    │
│                                                                │
│  ↓                                                             │
│                                                                │
│  DONE:                                                         │
│  Return final message: "Created changelog and saved to         │
│  Typefully successfully"                                       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Step 6: Run It

```bash
npx tsx src/index.ts
```

**Expected output:**

```
Step: thought
Step: action
→ Calling generate_changelog
→ Calling create_typefully_draft
Typefully MCP Result: {
  "content": [
    {
      "type": "text",
      "text": "{\"id\":\"draft_123\",\"status\":\"draft\"}"
    }
  ]
}

=== DRAFT ===
Successfully created changelog and saved to Typefully!
Check your drafts at https://typefully.com/drafts
```

## Verify in Typefully

1. Go to https://typefully.com/
2. You should see your AI-generated content as a draft
3. Edit if needed, then schedule or publish

## How It All Works Together

```
┌───────────────────────────────────────────────────────────────┐
│                    FULL ARCHITECTURE                          │
│                                                               │
│  ┌──────────────┐                                             │
│  │  Your Agent  │                                             │
│  └──────┬───────┘                                             │
│         │                                                     │
│         │ 1. LLM decides to post                              │
│         ↓                                                     │
│  ┌──────────────┐                                             │
│  │  executeTool │                                             │
│  │  (tools.ts)  │                                             │
│  └──────┬───────┘                                             │
│         │                                                     │
│         │ 2. Calls getTypefullyMCP()                          │
│         ↓                                                     │
│  ┌──────────────┐                                             │
│  │  MCP Client  │                                             │
│  │  (mcp.ts)    │                                             │
│  └──────┬───────┘                                             │
│         │                                                     │
│         │ 3. HTTP request with API key                        │
│         ↓                                                     │
│  ┌──────────────┐                                             │
│  │  Typefully   │                                             │
│  │  MCP Server  │                                             │
│  └──────┬───────┘                                             │
│         │                                                     │
│         │ 4. Calls Typefully API                              │
│         ↓                                                     │
│  ┌──────────────┐                                             │
│  │  Typefully   │                                             │
│  │     API      │                                             │
│  └──────────────┘                                             │
│                                                                │
│  Each layer handles its own concern:                           │
│  - Agent: Decides WHEN to post                                │
│  - executeTool: Validates and formats request                 │
│  - MCP Client: Manages connection                             │
│  - MCP Server: Handles auth and API calls                     │
│  - Typefully API: Creates the actual draft                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Pro Tips

### 1. Handle MCP Errors Gracefully

MCP servers can fail (network issues, auth problems, rate limits). Always wrap calls:

```typescript
if (name === "create_typefully_draft") {
  try {
    const mcp = await getTypefullyMCP();
    const result = await mcp.callTool({...});
    return `✓ Draft saved to Typefully`;
  } catch (error) {
    console.error("Typefully MCP Error:", error);

    // Return helpful error to LLM
    if (error instanceof Error && error.message.includes("401")) {
      return "❌ Invalid Typefully API key. Check your .env file.";
    }

    return `❌ Failed to save to Typefully: ${error}`;
  }
}
```

The LLM can see these errors in memory and adapt.

### 2. Reuse MCP Connections

Our singleton pattern prevents connection overhead:

```typescript
let client: Client | null = null;

export async function getTypefullyMCP() {
  if (client) return client; // Reuse existing connection

  // Only create new connection if needed
  client = new Client(...);
  await client.connect(transport);
  return client;
}
```

### 3. Support Multiple Platforms

Typefully supports multiple platforms (X, LinkedIn, Threads). Extend the tool:

```typescript
{
  type: "function",
  function: {
    name: "create_typefully_draft",
    description: "Save content as Typefully draft for social platforms",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string" },
        platforms: {
          type: "array",
          items: { enum: ["x", "linkedin", "threads"] },
          description: "Platforms to post on (default: x)"
        }
      },
      required: ["content"]
    }
  }
}
```

Then use it:

```typescript
requestBody: {
  platforms: {
    x: { enabled: args.platforms.includes("x"), posts: [{ text: args.content }] },
    linkedin: { enabled: args.platforms.includes("linkedin"), posts: [{ text: args.content }] }
  }
}
```

### 5. Discover Available MCP Tools

MCP servers expose their capabilities. You can query them:

```typescript
const mcp = await getTypefullyMCP();
const tools = await mcp.listTools();
console.log("Available Typefully tools:", tools);
```

This helps you discover what else Typefully's MCP server can do!

## Common MCP Use Cases

Now that you understand MCP, here are other services you can integrate:

| Service | MCP Server | Use Case |
|---------|------------|----------|
| **Typefully** | `mcp.typefully.com` | Schedule social media posts |
| **GitHub** | Community MCP servers | Read issues, create PRs |
| **Slack** | Community MCP servers | Send notifications |
| **Google Sheets** | Community MCP servers | Log data, read spreadsheets |
| **Notion** | Community MCP servers | Create pages, query databases |
| **Linear** | Community MCP servers | Create issues, update tickets |

Find more at: https://github.com/modelcontextprotocol/servers

## Troubleshooting

**"TYPEFULLY_API_KEY environment variable is not set":**
- Check `.env` exists in project root
- Verify format: `TYPEFULLY_API_KEY=your_key` (no quotes)
- Restart your terminal to reload environment

**"TYPEFULLY_SOCIAL_SET_ID environment variable is not set":**
- You need your Typefully account ID
- Check Typefully API documentation
- Or inspect browser network requests on typefully.com

**MCP connection timeout:**
- Check your internet connection
- Verify Typefully MCP server is accessible: `curl https://mcp.typefully.com/mcp?TYPEFULLY_API_KEY=test`
- Try increasing timeout in transport config

**Draft doesn't appear in Typefully:**
- Wait 10-15 seconds and refresh
- Check console for MCP errors
- Verify API key has permission to create drafts
- Try creating a draft manually to ensure account is active

**"Tool not found" error:**
- The MCP server might not support that tool
- Use `mcp.listTools()` to see available tools
- Check Typefully MCP documentation for correct tool names

**Multiple tool calls not working:**
- Verify you're using the `while` loop in agent.ts
- Check that memory is being passed correctly
- Don't use `tool_choice: "required"` (it forces exactly one call)
- Log tool_calls to debug what LLM is doing

## Next Steps

Tomorrow we're deploying this to production with **Vercel cron jobs** so your agent:
- Runs automatically every week
- Analyzes recent repo changes
- Generates and posts content
- All without manual intervention

The MCP integration you built today will handle the posting automatically!

## Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [MCP SDK on GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [Typefully API Documentation](https://docs.typefully.com)
- [Community MCP Servers](https://github.com/modelcontextprotocol/servers)
- [OpenAI Tool Calling Guide](https://platform.openai.com/docs/guides/function-calling)

