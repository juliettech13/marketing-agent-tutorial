import OpenAI from "openai";
import { randomUUID } from "crypto";
import type { AgentState } from "./types";
import { fetchRepoContext } from "./github";
import { tools, executeTool } from "./tools";
import { Memory } from "./memory";

const client = new OpenAI({
  baseURL: "https://ai-gateway.helicone.ai",
  apiKey: process.env.HELICONE_API_KEY,
  defaultHeaders: {
    "Helicone-Session-Id": randomUUID(), // Already have this variable
    "Helicone-Property-Repository": process.env.TARGET_REPO || "helicone/helicone", // Add this
    "Helicone-Property-Environment": process.env.NODE_ENV || "development"
  },
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

    case "observation":
      const draft = `[${state.contentType?.toUpperCase()}]

      Repository: ${state.repoOwner}/${state.repoName}
      Based on recent commits: ${state.repoContext?.recentCommits[0]}`;

      return { ...state, draft, step: "done" };

    default:
      return state;
  }
}
