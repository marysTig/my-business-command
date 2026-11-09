// Debug the tool loop for the SaaS question.
// Run with: bun run scripts/ai-debug-loop.mjs
import { readFileSync } from "node:fs";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of raw.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
}

const { tools, executeTool } = await import("../src/lib/ai/tools.ts");
const { chatCompletions } = await import("../src/lib/ai/client.ts");

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

let convo = [
  { role: "system", content: SYSTEM_PROMPT },
  { role: "user", content: "What are my SaaS projects and who is the contact?" },
];

for (let round = 0; round < 6; round++) {
  let data;
  try {
    ({ data } = await chatCompletions({
      messages: convo,
      tools,
      tool_choice: "auto",
      temperature: 0.2,
    }));
  } catch (error) {
    console.log(`round ${round}: chatCompletions threw: ${error.message}`);
    break;
  }
  const choice = data.choices?.[0];
  const message = choice?.message;
  console.log(
    `round ${round}: finish=${choice?.finish_reason} tool_calls=${message?.tool_calls?.length ?? 0} contentLen=${String(message?.content ?? "").length}`,
  );
  convo = [...convo, message];
  const calls = message?.tool_calls ?? [];
  if (!calls.length) {
    console.log("final content:", JSON.stringify(message?.content));
    break;
  }
  for (const call of calls) {
    const args = JSON.parse(call.function.arguments || "{}");
    console.log(`  -> ${call.function.name}(${JSON.stringify(args)})`);
    try {
      const result = await executeTool(call.function.name, args);
      console.log(`  <- result: ${JSON.stringify(result).slice(0, 300)}`);
      convo.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    } catch (error) {
      console.log(`  <- ERROR: ${error.message}`);
      convo.push({ role: "tool", tool_call_id: call.id, content: `Error: ${error.message}` });
    }
  }
}
