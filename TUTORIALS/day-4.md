# Day 4: Memory & Conversation History

Yesterday we gave the agent tools to execute actions. Today we're adding **memory** so it can remember the state of what has been done.

## Why Agents Need Memory

LLMs are **stateless**. Every API call starts fresh with zero context, unless we add and maintain the conversation history.

Without memory, your agent:
- Repeats the same requests
- Loses context between steps
- Can't build on previous actions
- Wastes tokens re-explaining everything

With memory, your agent:
- Builds on previous context
- Makes coherent multi-step decisions
- Doesn't repeat the same requests

## How Memory Works

Memory is just an array of messages you maintain and pass to the LLM:

```
┌────────────────────────────────────────────────────────────────┐
│                    CONVERSATION MEMORY                         │
│                                                                │
│  messages = [                                                  │
│    { role: "system", content: "You're a marketing agent" }     │
│    { role: "user", content: "Analyze this repo" }              │
│    { role: "assistant", content: "It's a Python library..." }  │
│    { role: "tool", content: "..." }                            │
│    { role: "user", content: "Now write a changelog" }          │
│  ]                                                             │
│                                                                │
│  Each loop: append new messages → LLM sees full history        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Message Roles:**
- `system`: Instructions for how the agent should behave
- `user`: Your requests and follow-ups
- `assistant`: LLM's responses and tool selections
- `tool`: Results from tool executions

## Step 1: Create Memory Class

Create `src/memory.ts`:

```typescript
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export class Memory {
  private messages: ChatCompletionMessageParam[] = [];

  constructor(systemPrompt: string) {
    this.messages.push({ role: "system", content: systemPrompt });
  }

  add(role: ChatCompletionMessageParam["role"], content: string, extra: any = {}) {
    this.messages.push({ role, content, ...extra } as ChatCompletionMessageParam);

    // Keep last 10 messages + system prompt to avoid token limits
    if (this.messages.length > 11) {
      this.messages = [this.messages[0]!, ...this.messages.slice(-10)];
    }
  }

  getAll() {
    return this.messages;
  }
}
```

### What's Happening Here?

**Constructor:**
- Takes a system prompt that defines the agent's behavior
- Stored as the first message and never removed

**add():**
- Appends new messages to the conversation
- Accepts `extra` for OpenAI-specific fields like `tool_calls` or `tool_call_id`
- Implements sliding window to keep memory manageable

**getAll():**
- Returns full message history to pass to the LLM

**Sliding window:**
- Keeps first message (system prompt) + last 10 messages
- Prevents token limit errors on long conversations
- Feel free to adjust the number `11` threshold based on your needs

## Step 2: Integrate Memory into Agent

Open `src/agent.ts` and import the Memory class:

```typescript
import { Memory } from "./memory";
```

Update `runAgent()` to create and pass memory:

```typescript
export async function runAgent(repoFullName: string) {
  const [owner, repo] = repoFullName.split("/");
  const sessionId = randomUUID();

  // Create memory with system prompt
  const memory = new Memory(
    "You are a marketing agent for GitHub repositories. Your job is to analyze repos and create engaging, concise marketing content for developers. Always use the provided tools and keep content under 280 characters."
  );

  let state: AgentState = {
    repoOwner: owner!,
    repoName: repo!,
    repoContext: null,
    contentType: null,
    draft: null,
    step: "thought"
  };

  // Agent loop - now with memory
  while (state.step !== "done") {
    console.log(`Step: ${state.step}`);
    state = await executeStep(state, sessionId, memory);
  }

  return state.draft;
}
```

Update the `executeStep()` function signature:

```typescript
async function executeStep(
  state: AgentState,
  sessionId: string,
  memory: Memory
): Promise<AgentState> {
```

Now update the `case "action":` block to use memory:

```typescript
case "action":
  // Add user request to memory
  memory.add("user", `Create ${state.contentType} content for ${state.repoOwner}/${state.repoName}.

  Recent commits: ${state.repoContext?.recentCommits.join(", ")}
  README excerpt: ${state.repoContext?.readme.slice(0, 200)}
  Primary language: ${state.repoContext?.language}

  Use the appropriate tool to generate this content.`);

  // First LLM call - tool selection
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: memory.getAll(), // Inject memory
    tools,
    tool_choice: "required"
  });

  const toolCall = response.choices[0]?.message.tool_calls?.[0];
  if (!toolCall || toolCall.type !== "function") {
    throw new Error("No tool was called");
  }

  console.log(`Tool called: ${toolCall.function.name}`);
  console.log(`Arguments: ${toolCall.function.arguments}`);

  // Add assistant's tool call to memory
  memory.add("assistant", "", { tool_calls: [toolCall] });

  // Execute the tool
  const result = await executeTool(
    toolCall.function.name,
    JSON.parse(toolCall.function.arguments)
  );

  // Add tool result to memory
  memory.add("tool", result, {
    tool_call_id: toolCall.id,
    name: toolCall.function.name
  });

  // Add instruction for final formatting
  memory.add("user", "Based on the tool result, create engaging tweet-length content (280 characters max). Make it compelling for developers.");

  // Second LLM call - final generation
  const final = await client.chat.completions.create({
    model: "gpt-4o",
    messages: memory.getAll() // Use full conversation history
  });

  return {
    ...state,
    draft: final.choices[0]!.message.content,
    step: "done"
  };
```

### What Changed?

**Before:** We manually constructed message arrays for each LLM call
**After:** We maintain a single conversation history that grows with each step

## Step 3: Run It

```bash
npx tsx src/index.ts
```

**Expected output:**

```
Step: thought
Step: action
Tool called: generate_changelog
Arguments: {"commits":["Add feature X","Fix bug Y"],"repo_name":"helicone"}

=== DRAFT ===
🚀 Helicone just shipped:
• Feature X for better tracking
• Bug fix in Y

Ready to upgrade? Check the latest release!
```

## View Memory in Helicone Dashboard

Add memory tracking to your OpenAI requests:

```typescript
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: memory.getAll(),
  tools,
  tool_choice: "required",
  headers: {
    "Helicone-Session-Id": sessionId,
    "Helicone-Property-Repository": `${state.repoOwner}/${state.repoName}`,
    "Helicone-Property-MemorySize": memory.getAll().length.toString()
  }
});
```

Now in [https://us.helicone.ai/dashboard](https://us.helicone.ai/dashboard) you can:
- Track memory size over time
- See token usage grow with conversation length
- Debug which messages are in context
- Identify when to clear or summarize memory

## Memory Strategies

Different tasks need different memory approaches. Here's when to use each:

### 1. Full History (What We Built)

**Keep everything until token limit**

```typescript
add(role, content, extra = {}) {
  this.messages.push({ role, content, ...extra });
}
```

**Good for:**
- Short tasks (< 10 turns)
- Debugging sessions
- When every detail matters

**Bad for:**
- Long conversations
- Cost-sensitive applications
- Production systems

### 2. Sliding Window (Recommended)

**Keep last N messages**

```typescript
add(role, content, extra = {}) {
  this.messages.push({ role, content, ...extra });

  if (this.messages.length > 11) {
    // Keep system prompt + last 10 messages
    this.messages = [this.messages[0]!, ...this.messages.slice(-10)];
  }
}
```

**Good for:**
- Most production use cases
- Controlling costs
- Preventing context overflow
- Reducing hallucinations

**Bad for:**
- When you need full history
- Multi-hour tasks

### 3. Summarization (Advanced)

**Periodically compress old messages**

```typescript
async summarize() {
  if (this.messages.length > 15) {
    const summary = await llm.summarize(this.messages.slice(1, -5));
    this.messages = [
      this.messages[0]!, // system
      { role: "system", content: `Previous context: ${summary}` },
      ...this.messages.slice(-5) // Keep last 5 raw
    ];
  }
}
```

**Good for:**
- Multi-hour agent runs
- Complex workflows
- When recent context matters most

**Bad for:**
- Real-time applications (adds latency)
- When you need exact message history

### 4. Retrieval (RAG)

**Store in vector DB, retrieve relevant parts**

```typescript
async add(role, content, extra = {}) {
  await vectorDB.store({ role, content, timestamp: Date.now() });

  // Only keep recent + relevant in active memory
  const relevant = await vectorDB.search(content, limit: 3);
  this.messages = [
    this.messages[0]!, // system
    ...relevant,
    { role, content, ...extra }
  ];
}
```

**Good for:**
- Large knowledge bases
- Long-term memory across sessions
- Agents that need to recall specific past events

**Bad for:**
- Simple tasks
- When you don't need historical context
- Cost-sensitive applications (vector DB + embeddings)

## Understanding the Flow

Here's what happens with memory in your agent loop:

```
┌────────────────────────────────────────────────────────────────┐
│                   MEMORY-ENABLED AGENT LOOP                    │
│                                                                │
│  START:                                                        │
│  messages = [                                                  │
│    { role: "system", content: "You're a marketing agent" }     │
│  ]                                                             │
│                                                                │
│  ↓                                                             │
│                                                                │
│  STEP 1 - USER REQUEST:                                        │
│  messages.push(                                                │
│    { role: "user", content: "Create changelog for repo X" }    │
│  )                                                             │
│                                                                │
│  ↓                                                             │
│                                                                │
│  STEP 2 - LLM DECIDES TO USE TOOL:                             │
│  messages.push(                                                │
│    { role: "assistant", tool_calls: [...] }                    │
│  )                                                             │
│                                                                │
│  ↓                                                             │
│                                                                │
│  STEP 3 - TOOL EXECUTES:                                       │
│  messages.push(                                                │
│    { role: "tool", content: "Results: ..." }                   │
│  )                                                             │
│                                                                │
│  ↓                                                             │
│                                                                │
│  STEP 4 - FINAL INSTRUCTION:                                   │
│  messages.push(                                                │
│    { role: "user", content: "Make it 280 chars" }              │
│  )                                                             │
│                                                                │
│  ↓                                                             │
│                                                                │
│  STEP 5 - LLM GENERATES:                                       │
│  LLM sees ALL 6 messages and understands full context          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Pro Tips

### 1. Make System Prompts Specific

**Bad:**
```typescript
const memory = new Memory("You are a helpful assistant.");
```

**Good:**
```typescript
const memory = new Memory(
  "You are a marketing agent for GitHub repositories. Create concise, engaging content for developers. Always:\n" +
  "- Keep content under 280 characters\n" +
  "- Use emojis sparingly (1-2 max)\n" +
  "- Focus on practical benefits\n" +
  "- Use the provided tools before generating"
);
```

### 2. Log Memory for Debugging

Add a method to inspect current memory:

```typescript
debug() {
  console.log("\n=== MEMORY STATE ===");
  this.messages.forEach((msg, i) => {
    console.log(`[${i}] ${msg.role}: ${msg.content?.slice(0, 50)}...`);
  });
  console.log(`Total messages: ${this.messages.length}\n`);
}
```

Call it before each LLM request:

```typescript
memory.debug();
const response = await client.chat.completions.create({
  messages: memory.getAll()
});
```

### 3. Track Token Usage

Add token counting to your Memory class:

```typescript
getTokenCount() {
  // Rough estimate: 1 token ≈ 4 characters
  return this.messages.reduce((total, msg) => {
    return total + (msg.content?.length || 0) / 4;
  }, 0);
}
```

Use it to decide when to clear or summarize:

```typescript
if (memory.getTokenCount() > 3000) {
  await memory.summarize();
}
```

### 4. Clear Memory Between Sessions

If your agent runs multiple independent tasks:

```typescript
reset(newSystemPrompt?: string) {
  const systemPrompt = newSystemPrompt || this.messages[0]!.content;
  this.messages = [{ role: "system", content: systemPrompt }];
}
```

### 5. Save Memory for Future Runs

Persist memory to resume later:

```typescript
export() {
  return JSON.stringify(this.messages);
}

static import(json: string) {
  const memory = new Memory("");
  memory.messages = JSON.parse(json);
  return memory;
}
```

## Troubleshooting

**"Context length exceeded" error:**
- Your conversation is too long for the model's context window
- Implement sliding window (keep last N messages)
- Use a model with larger context (gpt-4o supports 128k tokens)
- Implement summarization to compress old messages

**Agent repeats itself:**
- Check that you're actually passing `memory.getAll()` to LLM
- Verify messages are being added after each step
- Debug with `memory.debug()` to see what's in context
- System prompt might be too vague - make it more specific

**Tool results not visible to LLM:**
- Ensure you're adding tool messages with correct `tool_call_id`
- The `tool_call_id` must match between assistant and tool messages
- Check message order: assistant (with tool_calls) → tool (with result)

**Memory grows too large:**
- Implement sliding window with smaller threshold
- Clear memory between independent tasks
- Use summarization for long-running agents
- Monitor token usage with `Helicone-Property-MemorySize`

**Agent forgets early context:**
- This is expected with sliding window
- Keep important info in system prompt
- Implement retrieval if you need long-term memory
- Consider increasing window size (but watch token costs)

## Next Steps

Tomorrow we're adding **multi-step reasoning** so your agent can:
- Plan multiple steps before acting
- Evaluate different content strategies
- Self-correct based on quality checks
- Make more sophisticated marketing decisions

The memory system you built today will store these planning steps, making your agent even more capable!

## Resources

- [OpenAI Chat Completions API](https://platform.openai.com/docs/guides/chat)
- [Message Roles Documentation](https://platform.openai.com/docs/guides/chat/introduction)
- [Helicone Custom Properties](https://docs.helicone.ai/features/advanced-usage/custom-properties)
- [Token Counting Best Practices](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them)

