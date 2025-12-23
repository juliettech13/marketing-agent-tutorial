import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { getTypefullyMCP } from "./mcp";

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
      description:
        "Write a practical example of how to use this project to solve a problem",
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
  {
    type: "function",
    function: {
      name: "create_typefully_draft",
      description: "Save content as Typefully draft",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string" },
        },
        required: ["content"],
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
