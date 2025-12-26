import { runAgent } from "../src/agent";

export default async function handler(req: Request, res: Response) {
  const repo = process.env.TARGET_REPO || "helicone/helicone";
  const draft = await runAgent(repo);

  return new Response(JSON.stringify({ draft }), {
    headers: { "Content-Type": "application/json" },
  });
}
