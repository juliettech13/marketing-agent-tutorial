import OpenAI from "openai";
import { randomUUID } from "crypto";
import type { AgentState } from "./types";
import { fetchRepoContext } from "./github";
import { tools, executeTool } from "./tools";
import { Memory } from "./memory";

const client = new OpenAI({
  baseURL: "https://ai-gateway.helicone.ai",
  apiKey: process.env.HELICONE_API_KEY,
});

export async function runAgent(repoFullName: string) {
  const [owner, repo] = repoFullName.split("/");
  const sessionId = randomUUID();
  const memory = new Memory(
    "You are a marketing agent for GitHub repositories. Your job is to analyze repos and create engaging, concise marketing content for developers. Always use the provided tools and keep content under 280 characters."
  );

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
    state = await executeStep(state, sessionId, memory);
  }

  return state.draft;
}

async function executeStep(
  state: AgentState,
  sessionId: string,
  memory: Memory
): Promise<AgentState> {
  switch (state.step) {
    case "thought":
      const context = await fetchRepoContext(state.repoOwner, state.repoName);
      return { ...state, repoContext: context, step: "action" };

    case "action":
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
