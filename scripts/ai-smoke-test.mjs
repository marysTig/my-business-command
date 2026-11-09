// Quick smoke test for src/lib/ai/client.ts — verifies that the configured
// key slots (see .env.local) can actually call the AI API.
// Run with: bun run scripts/ai-smoke-test.mjs
// Never prints key material.
import { readFileSync } from "node:fs";

const envPath = new URL("../.env.local", import.meta.url);
try {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].trim();
    }
  }
} catch {
  console.log("No .env.local found.");
  process.exit(1);
}

const { chatCompletions } = await import("../src/lib/ai/client.ts");

for (const label of ["1st call", "2nd call"]) {
  try {
    const { slot, data } = await chatCompletions({
      messages: [{ role: "user", content: "Reply with exactly: ok" }],
      temperature: 0,
      max_tokens: 64,
    });
    const text = data?.choices?.[0]?.message?.content ?? "";
    console.log(`${label}: answered by ${slot}, reply: ${JSON.stringify(String(text).slice(0, 20))}`);
  } catch (error) {
    console.log(`${label}: FAILED (${error?.message ?? error})`);
  }
}
