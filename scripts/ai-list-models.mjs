// Lists models visible to slot 2's key. Run with: bun run scripts/ai-list-models.mjs
import { readFileSync } from "node:fs";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of raw.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
}

const base = process.env.ZAI_API_BASE_2 || "https://generativelanguage.googleapis.com/v1beta/openai";
const key = process.env.ZAI_API_KEY_2;

const response = await fetch(`${base}/models`, {
  headers: { Authorization: `Bearer ${key}` },
});
const body = await response.text();

try {
  const data = JSON.parse(body);
  const ids = (data.data ?? []).map((m) => m.id).filter(Boolean);
  console.log(`status: ${response.status}`);
  console.log(`models (${ids.length}):`);
  for (const id of ids) console.log(` - ${id}`);
} catch {
  console.log(`status: ${response.status}`);
  console.log(`body: ${body.slice(0, 400)}`);
}
