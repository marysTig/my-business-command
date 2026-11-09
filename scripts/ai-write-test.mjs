// Verifies create_task + update_task_status, then cleans up the test row.
// Run with: bun run scripts/ai-write-test.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of raw.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
}

const { executeTool } = await import("../src/lib/ai/tools.ts");

const title = `__ai_write_test_${Date.now()}__`;

console.log("--- create_task");
const created = await executeTool("create_task", {
  title,
  description: "Disposable verification row — deleted right after the test.",
  priority: "Low",
});
console.log(
  `created: id=${created.id} title="${created.title}" status=${created.status} created_by=${created.created_by}`,
);

console.log("--- update_task_status -> Done");
const moved = await executeTool("update_task_status", { task_id: created.id, status: "Done" });
console.log(`status now: ${moved.status}`);

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(url, key, { auth: { persistSession: false } });
const { error } = await supabase.from("tasks").delete().eq("id", created.id);
if (error) throw error;

const { count } = await supabase
  .from("tasks")
  .select("id", { count: "exact", head: true })
  .eq("title", title);
console.log(`cleanup: remaining test rows = ${count} (0 means clean)`);
