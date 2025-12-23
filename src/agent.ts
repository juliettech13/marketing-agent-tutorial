import OpenAI from "openai";
import { randomUUID } from "crypto";
import type { AgentState } from "./types";
import { fetchRepoContext } from "./github";

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
