import OpenAI from "openai";
import { randomUUID } from "crypto";
import type { AgentState } from "./types";
import { fetchRepoContext } from "./github";
import { tools, executeTool } from "./tools";

const client = new OpenAI({
  baseURL: "https://ai-gateway.helicone.ai",
  apiKey: process.env.HELICONE_API_KEY,
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
      // Ask LLM which tool to use
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `Create ${state.contentType} for ${state.repoOwner}/${state.repoName}.

Commits: ${state.repoContext?.recentCommits.join(", ")}
README: ${state.repoContext?.readme.slice(0, 200)}

Use the right tool.`,
          },
        ],
        tools,
        tool_choice: "required",
      });

      const toolCall = response.choices[0]?.message.tool_calls?.[0];
      if (!toolCall || toolCall.type !== 'function') throw new Error("No tool called");

      // Execute the tool
      console.log(`Tool: ${toolCall.function.name}`);
      const result = await executeTool(
        toolCall.function.name,
        JSON.parse(toolCall.function.arguments)
      );

      // Get final draft
      const final = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "user", content: `Create ${state.contentType} content` },
          response.choices[0]!.message,
          { role: "tool", tool_call_id: toolCall.id, content: result },
          { role: "user", content: "Make it tweet-length (280 chars)" },
        ],
      });

      return {
        ...state,
        draft: final.choices[0]!.message.content,
        step: "done",
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
