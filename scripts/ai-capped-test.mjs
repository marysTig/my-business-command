// Proves the round-cap fallback in runLoop.
// Run with: bun run scripts/ai-capped-test.mjs
import { readFileSync } from "node:fs";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of raw.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
}

const { tools, executeTool } = await import("../src/lib/ai/tools.ts");
const { runLoop } = await import("../src/lib/ai/client.ts");

const reply = await runLoop(
  [
    {
      role: "system",
      content:
        "You are a dashboard assistant. Read data with your tools, then answer concisely. When told you have no tool calls left, answer from the data you already have.",
    },
    { role: "user", content: "How many team members are there?" },
  ],
  tools,
  executeTool,
  1, // force the cap immediately
);
console.log("reply with maxRounds=1:", JSON.stringify(String(reply.content).slice(0, 200)));
