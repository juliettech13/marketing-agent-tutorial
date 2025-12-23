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
