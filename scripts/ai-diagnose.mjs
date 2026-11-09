// Calls slot 2's endpoint directly and prints status + body (no secrets shown).
// Run with: bun run scripts/ai-diagnose.mjs
import { readFileSync } from "node:fs";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of raw.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
}

const base = process.env.ZAI_API_BASE_2 || "https://generativelanguage.googleapis.com/v1beta/openai";
const model = process.env.ZAI_MODEL_2 || "gemini-2.5-flash";
const key = process.env.ZAI_API_KEY_2;

const response = await fetch(`${base}/chat/completions`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify({
    model,
    messages: [{ role: "user", content: "Reply with exactly: ok" }],
    max_tokens: 4,
    temperature: 0,
  }),
});

const body = (await response.text()).slice(0, 600);
console.log(`status: ${response.status}`);
console.log(`body: ${body}`);
