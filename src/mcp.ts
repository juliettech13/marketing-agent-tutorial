import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

let client: Client | null = null;

export async function getTypefullyMCP() {
  if (client) return client;

  const apiKey = process.env.TYPEFULLY_API_KEY;
  if (!apiKey) {
    throw new Error("TYPEFULLY_API_KEY environment variable is not set");
  }

  const transport = new StreamableHTTPClientTransport(
    new URL(`https://mcp.typefully.com/mcp?TYPEFULLY_API_KEY=${apiKey}`),
    { sessionId: crypto.randomUUID() }
  );

  client = new Client(
    { name: "marketing-agent", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  return client;
}
