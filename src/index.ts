import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

// 1. Set up the OpenAI client (but pointed at Helicone)
const client = new OpenAI({
  baseURL: "https://ai-gateway.helicone.ai",
  apiKey: process.env.HELICONE_API_KEY
});

// 2. Create a function that analyzes a GitHub repo
async function analyzeRepo(repoUrl: string) {
  const response = await client.chat.completions.create({
    model: "gemma-3-12b-it", // Fast, cheap, good enough for testing
    messages: [
      {
        role: "system",
        content:
          "You are a marketing analyst, expert in developer marketing. You analyze Github repositories and suggest content ideas for going to market.",
      },
      {
        role: "user",
        content: `What type of marketing content would be useful for the users of this product? Review this repository: ${repoUrl} in depth to find out.`,
      },
    ],
  });

  return response.choices[0]?.message.content;
}

// 3. Test it with your own repository or use the open-sourced Helicone repo
analyzeRepo("https://github.com/helicone/helicone")
  .then((result) => console.log(result))
  .catch((err) => console.error(err));
