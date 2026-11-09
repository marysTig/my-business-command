// End-to-end test of the upgraded AI assistant.
// Run with: bun run scripts/ai-tools-test.mjs
import { readFileSync } from "node:fs";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of raw.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
}

const { executeTool, tools } = await import("../src/lib/ai/tools.ts");
const { runLoop } = await import("../src/lib/ai/client.ts");

console.log("--- tool: get_dashboard_overview");
const overview = await executeTool("get_dashboard_overview", {});
console.log(JSON.stringify(overview, null, 2).slice(0, 2000));

console.log("\n--- tool: search('marys')");
console.log(JSON.stringify(await executeTool("search", { query: "marys" })).slice(0, 600));

console.log("\n--- tool: summarize_table(sales)");
console.log(JSON.stringify(await executeTool("summarize_table", { table: "sales" })));

console.log("\n--- agent loop: 'Give me a business overview'");
const SYSTEM_PROMPT = `You are the AI assistant inside "My Business OS", a business dashboard. You answer questions and act on the user's business data through your tools. The dashboard has 17 tables: tasks, customers, sales, car_buyers, saas_projects, client_websites, digital_products, resources, leads, properties, property_dataset, property_leads, profiles, team_members, velora_clients, velora_orders, velora_expenses.

TOOLS YOU CAN USE:
- get_dashboard_overview — KPIs + alerts + pipeline statuses, computed exactly like the dashboard page. Call this FIRST for any "how is my business / status / summary" question.
- search — fuzzy name search across 11 tables. Use to find a record by partial name before drilling in.
- query_table, count_table, summarize_table — filtered reads and aggregates on any of the 17 tables (count_table for totals, summarize_table for status breakdowns and money sums).
- create_task, update_task_status (To Do / In Progress / Waiting / Done) — the ONLY writes you can perform. When the user asks you to add or move a task, do it, then confirm with the task's title and new status.

RULES:
- Never invent numbers, names, dates, or statuses. Every fact in your answer must come from a tool result; if a tool returned empty, say so.
- Call tools only when you need information you do not already have from earlier results. Answer as soon as you can; never make enrichment lookups (profiles, team_members) unless the user asked about people. Prefer overview/search first, query only for detail.
- You CANNOT delete anything, edit other tables, or undo writes. If asked, say so clearly.
- The user may write in French or English — answer in the same language they used.
- Be concise and concrete: lead with the answer, then brief supporting points. Use currency and dates as they appear in the data.
- If a question does not match the data (weather, personal life, general knowledge), politely say it is outside your dashboard data.`;

const reply = await runLoop(
  [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: "Give me a business overview" },
  ],
  tools,
  executeTool,
);
console.log("assistant reply:", JSON.stringify(reply.content).slice(0, 1200));
