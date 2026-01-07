# Day 3: Tool Calling

Yesterday you built an agent loop that reasons about what to do. Today we're giving your agent **tools** so it can actually do things.

Tool calling is how we connect LLMs and code execution. We describe functions to the LLM, it decides when to use them, and then actually run the code we want based on its decisions.

## What is Tool Calling?

Think of tools as functions your agent can use. Rather than a conditional loop like we're used to, the agent reasons whether to use a tool or not (whether to execute the function we give it access to, or not).

This enables the LLM to:
- Read files
- Call APIs
- Run calculations
- Save data
- Send emails
- ...etc!

**The flow:**
```
You: "Generate a changelog for recent commits"
LLM: "I need the analyze_codebase tool with these parameters: {...}"
Your code: *executes the function*
Your code: "Here's the result: {...}"
LLM: "Based on that data, here's your changelog..."
```

## Anatomy of a Tool

Every tool has 4 components:

```
┌────────────────────────────────────────────────────────────────┐
│                         TOOL                                   │
│                                                                │
│  ┌────────────────┐                                            │
│  │     NAME       │  Unique identifier (e.g., "get_commits")   │
│  └────────────────┘                                            │
│                                                                │
│  ┌────────────────┐                                            │
│  │  DESCRIPTION   │  Tell LLM when to use it                   │
│  └────────────────┘  "Fetches recent commits from a GitHub     │
│                       repository. Use when you need to see     │
│                       what changed recently."                  │
│                                                                │
│  ┌────────────────┐                                            │
│  │   PARAMETERS   │  JSON Schema of inputs                     │
│  └────────────────┘  { owner: string, repo: string, limit: n } │
│                                                                │
│  ┌────────────────┐                                            │
│  │    EXECUTE     │  The actual function that runs             │
│  └────────────────┘  async (args) => { ...fetch data... }      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Tool Design Principles

1. **Single responsibility:** One tool, one job. Don't make a "do_everything" tool.
2. **Descriptive names:** The LLM reads these to decide what to call. `generate_changelog` is better than `tool_1`.
3. **Rich descriptions:** Tell the LLM *when* and *why* to use it, not just what it does.
4. **Strict schemas:** Define exactly what parameters are needed and their types.
5. **Handle errors gracefully:** Return useful error messages that help the LLM retry.

## Today's Build

We're creating 3 tools for our marketing agent:
1. **analyze_codebase** - Understand what the project does
2. **generate_changelog** - Turn commits into announcements
3. **create_use_case** - Write practical examples

## Step 1: Define the Tools

Create `src/tools.ts`:

```typescript
import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "analyze_codebase",
      description:
        "Analyzes repository structure and purpose to understand what the project does",
      parameters: {
        type: "object",
        properties: {
          readme_excerpt: {
            type: "string",
            description: "First 500 chars of README to analyze",
          },
          primary_language: {
            type: "string",
            description: "Main programming language used",
          },
        },
        required: ["readme_excerpt", "primary_language"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_changelog",
      description: "Turn commits into a changelog announcement",
      parameters: {
        type: "object",
        properties: {
          commits: {
            type: "array",
            items: { type: "string" },
          },
          repo_name: { type: "string" },
        },
        required: ["commits", "repo_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_use_case",
      description: "Write a practical example of how to use this project to solve a problem",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string" },
          language: { type: "string" },
        },
        required: ["description", "language"],
      },
    },
  },
];

// The actual function implementations, in this case simplified as strings
export async function executeTool(name: string, args: any) {
  if (name === "analyze_codebase") {
    return `## Codebase summary: ${args.description}`;
  }

  if (name === "generate_changelog") {
    return `## What's New\n\n${args.commits.map((c: string) => `• ${c}`).join("\n")}`;
  }

  if (name === "create_use_case") {
    return `## Use Case\n\n${args.description}\n\nBuilt with ${args.language}.`;
  }

  throw new Error(`Unknown tool: ${name}`);
}
```

### What's Happening Here?

**Tool Definitions:**
Each tool follows OpenAI's function calling schema:
- `description` tells the LLM when to use the tool
- `parameters` uses JSON Schema to define inputs
- `required` array enforces which fields must be provided

**executeTool():**
- Maps tool names to actual implementations
- In production, these would call real APIs, databases, etc.
- For now, they format the data into markdown strings
- Returns strings that the LLM can use to generate final content

## Step 2: Update the Agent Loop

Open `src/agent.ts` and add the tools import at the top:

```typescript
import { tools, executeTool } from "./tools";
```

Now replace the entire `case "action":` block with this tool-calling version:

```typescript
case "action":
  // Ask LLM which tool to use
  const response = await client.chat.completions.create({
    model: "gemma-3-12b-it",
    messages: [
      {
        role: "system",
        content: "You are a marketing content generator. Use the provided tools to create engaging, concise content for developers."
      },
      {
        role: "user",
        content: `Create ${state.contentType} content for ${state.repoOwner}/${state.repoName}.

Recent commits: ${state.repoContext?.recentCommits.join(", ")}
README excerpt: ${state.repoContext?.readme.slice(0, 200)}
Primary language: ${state.repoContext?.language}

Use the appropriate tool to generate this content.`
      }
    ],
    tools,
    tool_choice: "required"
  });

  const toolCall = response.choices[0]?.message.tool_calls?.[0];
  if (!toolCall || toolCall.type !== "function") {
    throw new Error("No tool was called");
  }

  // Execute the tool
  console.log(`Tool called: ${toolCall.function.name}`);
  console.log(`Arguments: ${toolCall.function.arguments}`);

  const result = await executeTool(
    toolCall.function.name,
    JSON.parse(toolCall.function.arguments)
  );

  // Get final draft using the tool result
  const final = await client.chat.completions.create({
    model: "gemini-3-pro-preview", // Use expensive model for final generation
    messages: [
      {
        role: "system",
        content: "You are a marketing content generator. Use the provided tools to create engaging, concise content for developers."
      },
      {
        role: "user",
        content: `Create ${state.contentType} content for ${state.repoOwner}/${state.repoName}.

Recent commits: ${state.repoContext?.recentCommits.join(", ")}
README excerpt: ${state.repoContext?.readme.slice(0, 200)}
Primary language: ${state.repoContext?.language}

Use the appropriate tool to generate this content.`
      },
      response.choices[0]!.message,
      {
        role: "tool",
        tool_call_id: toolCall.id,
        content: result
      },
      {
        role: "user",
        content: "Based on the tool result, create engaging tweet-length content (280 characters max). Make it compelling for developers."
      }
    ]
  });

  return {
    ...state,
    draft: final.choices[0]!.message.content,
    step: "done"
  };
```

### What Changed?

**Two LLM calls in the action phase:**
1. **First call** - LLM decides which tool to use and generates arguments
2. **Tool execution** - We run the actual function
3. **Second call** - LLM uses the tool result to generate final content

**tool_choice: "required":**
- Forces the LLM to call a tool (can't just respond with text)
- Ensures we always get structured output

## Step 3: Run It

```bash
npx tsx src/index.ts
```

**Expected output:**

```
Step: perceive
Step: reason
Step: action
Tool called: generate_changelog
Arguments: {"commits":["Add new feature...","Fix bug in..."],"repo_name":"helicone"}

=== DRAFT ===
🚀 New in Helicone: Fresh updates just dropped!
• Add new feature for better tracking
• Fix bug in dashboard

Check out the latest release!
```

## Understanding the Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     TOOL CALLING FLOW                           │
│                                                                 │
│  1. USER → LLM                                                  │
│     "Create a changelog"                                        │
│                                                                 │
│  2. LLM → TOOL DECISION                                         │
│     "I'll use generate_changelog with these args:               │
│      {commits: [...], repo_name: 'helicone'}"                   │
│                                                                 │
│  3. YOUR CODE → EXECUTE                                         │
│     executeTool("generate_changelog", {...})                    │
│                                                                 │
│  4. TOOL → RESULT                                               │
│     "## What's New in helicone\n• Update 1\n• Update 2"         │
│                                                                 │
│  5. YOUR CODE → LLM                                             │
│     "Here's the tool result: ..."                               │
│                                                                 │
│  6. LLM → FINAL OUTPUT                                          │
│     "🚀 New in Helicone: Fresh updates just dropped!..."        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## View in Helicone Dashboard

Visit [https://us.helicone.ai/dashboard](https://us.helicone.ai/dashboard) to see:
- Both LLM calls (tool selection + final generation)
- Tool call parameters and execution
- Token usage for each phase
- Total cost per agent run

You can filter by session ID to see the entire flow grouped together.

## Pro Tips

### 1. Make Descriptions Specific

**Bad:**
```typescript
description: "Generates changelog"
```

**Good:**
```typescript
description: "Turn recent commits into a changelog announcement. Use this when the content type is 'changelog' or when highlighting recent updates."
```

The LLM uses descriptions to decide which tool to call. Be explicit about when to use it and why. This helps the LLM make better decisions.

### 2. Validate Tool Arguments

Add validation to `executeTool()`:

```typescript
export async function executeTool(name: string, args: any): Promise<string> {
  if (name === "generate_changelog") {
    if (!args.commits || !Array.isArray(args.commits)) {
      throw new Error("commits must be an array");
    }
    if (!args.repo_name || typeof args.repo_name !== "string") {
      throw new Error("repo_name must be a string");
    }
    // ... rest of implementation
  }
}
```

### 3. Handle Tool Errors Gracefully

Instead of throwing errors, return error messages that the LLM can understand:

```typescript
export async function executeTool(name: string, args: any): Promise<string> {
  try {
    // ... tool implementation
  } catch (error) {
    return `Error executing ${name}: ${error.message}. Please try again with different parameters.`;
  }
}
```

### 4. Track Tool Usage in Helicone

Add custom properties to track which tools are most used:

```typescript
const response = await client.chat.completions.create({
  model: "gemma-3-12b-it",
  messages: [/* ... */],
  tools,
  headers: {
    "Helicone-Session-Id": sessionId,
    "Helicone-Property-ContentType": state.contentType,
    "Helicone-Property-Step": "tool_selection"
  }
});
```

## Troubleshooting

**"No tool was called" error:**
- Check that you're passing the `tools` array to the LLM
- Verify `tool_choice: "required"` is set
- Ensure your prompt clearly indicates a tool should be used
- Try with `tool_choice: "auto"` to see if the LLM thinks a tool is needed

**"Invalid JSON" error when parsing tool arguments:**
- The LLM sometimes generates malformed JSON
- Add try-catch around `JSON.parse()`
- Log the raw arguments to debug: `console.log(toolCall.function.arguments)`
- Consider using a more robust parser or validating with Zod

**Tool executes but final response is empty:**
- Check that you're passing all messages back to the LLM
- Verify the tool result is being included in the conversation
- Make sure the `tool_call_id` matches between request and response

**LLM calls wrong tool:**
- Improve your tool descriptions
- Make them more specific about when to use each tool
- Add examples in the description
- Consider using `tool_choice: {type: "function", function: {name: "specific_tool"}}` to force a specific tool

**High costs from tool calling:**
- Tool calling requires multiple LLM calls (selection + generation)
- Use cheaper models for tool selection: `gemma-3-12b-it`
- Use expensive models only for final generation: `gemini-3-pro-preview`
- Cache tool results when possible
- Monitor token usage in Helicone dashboard

## Next Steps

Tomorrow we're adding **memory** so your agent can:
- Remember past content it generated
- Avoid repeating the same ideas
- Track what's been posted and when
- Make smarter decisions based on history

The tool structure stays the same—we're just adding a new tool for memory management!

## Resources

- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [JSON Schema Reference](https://json-schema.org/understanding-json-schema)
- [Helicone Tool Tracking](https://docs.helicone.ai/features/advanced-usage/custom-properties)

