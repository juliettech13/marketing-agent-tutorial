import "dotenv/config";
import { runAgent } from "./agent";

runAgent(process.env.TARGET_REPO || "helicone/helicone")
  .then((draft) => console.log("\n=== DRAFT ===\n", draft))
  .catch((err) => console.error("Failed:", err));
