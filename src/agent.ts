import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

// Set up Helicone AI Gateway so you can call any model with the same OpenAI SDK
const client = new OpenAI({
  baseURL: "https://ai-gateway.helicone.ai",
  apiKey: process.env.HELICONE_API_KEY
});

async function analyzeRepo(repoUrl: string) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini", // Fast, cheap, good enough for testing
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

// Test it
analyzeRepo("https://github.com/helicone/helicone")
  .then((result) => console.log(result))
  .catch((err) => console.error(err));
