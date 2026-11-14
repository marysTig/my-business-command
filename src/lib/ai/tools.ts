import { createClient } from "@supabase/supabase-js";
import type { ToolDef } from "./client";
import { computeInsights } from "./insights";
import {
  isValidColumn,
  isValidTable,
  TABLE_COLUMNS,
  TABLE_NAMES,
  type TableName,
} from "./schemas";
import { webSearch } from "./web";

const LIMIT_MIN = 1;
const LIMIT_MAX = 50;
const SEARCH_TABLES: TableName[] = [
  "tasks",
  "customers",
  "client_websites",
  "saas_projects",
  "car_buyers",
  "digital_products",
  "sales",
  "velora_clients",
  "velora_orders",
  "velora_expenses",
  "personal_expenses",
  "research_reports",
  "leads",
];
const TEXT_COLUMNS = ["name", "title", "label", "project_name", "item", "email", "notes"];
const MONEY_COLUMNS = ["amount", "price", "sale_price", "amount_paid", "project_amount", "budget"];

// Uses the same publishable (anon) key as the browser app. The database has
// open access (migration 0001_open_access_no_auth), so reads/writes work
// server-side. If RLS is enabled later, switch to the service-role client.
function getClient() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
    "";
  if (!url || !key) {
    throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY).");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

const OPERATORS = ["eq", "neq", "gt", "gte", "lt", "lte", "ilike", "in", "is_null"] as const;
type Operator = (typeof OPERATORS)[number];

type Filter = { column: string; operator: Operator; value: unknown };

function parseFilters(table: TableName, raw: unknown): Filter[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new Error("filters must be an array.");
  return raw.map((f) => {
    const filter = f as { column?: string; operator?: string; value?: unknown };
    if (!isValidColumn(table, filter.column)) {
      throw new Error(
        `Invalid column "${String(filter.column)}" for table "${table}". Valid columns: ${TABLE_COLUMNS[table].join(", ")}.`,
      );
    }
    if (!(OPERATORS as readonly string[]).includes(String(filter.operator))) {
      throw new Error(`Invalid operator "${String(filter.operator)}". Use one of: ${OPERATORS.join(", ")}.`);
    }
    return { column: String(filter.column), operator: filter.operator as Operator, value: filter.value };
  });
}

function applyFilters(query: any, filters: Filter[]) {
  for (const { column, operator, value } of filters) {
    switch (operator) {
      case "eq":
        query = query.eq(column, value);
        break;
      case "neq":
        query = query.neq(column, value);
        break;
      case "gt":
        query = query.gt(column, value);
        break;
      case "gte":
        query = query.gte(column, value);
        break;
      case "lt":
        query = query.lt(column, value);
        break;
      case "lte":
        query = query.lte(column, value);
        break;
      case "ilike":
        query = query.ilike(column, `%${String(value ?? "")}%`);
        break;
      case "in":
        query = query.in(column, Array.isArray(value) ? value : [value]);
        break;
      case "is_null":
        query = query.is(column, null);
        break;
    }
  }
  return query;
}

function parseLimit(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw ?? 10);
  if (!Number.isFinite(n)) return 10;
  return Math.min(Math.max(Math.floor(n), LIMIT_MIN), LIMIT_MAX);
}

function filterDef() {
  return {
    type: "array",
    items: {
      type: "object",
      properties: {
        column: { type: "string" },
        operator: { type: "string", enum: [...OPERATORS] },
        value: { type: ["string", "number", "boolean", "array", "null"] },
      },
      required: ["column", "operator"],
    },
  } as const;
}

// Columns the assistant must never overwrite by hand.
const PROTECTED_COLUMNS = ["id", "created_at", "user_id"];

/**
 * Column/value pairs for an insert or update. Accepts an object
 * ({"price": 10}) or the array-of-pairs form the model is given
 * ([{column: "price", value: 10}]), and rejects unknown columns so a typo
 * can never write to the wrong field.
 */
function parseValues(table: TableName, raw: unknown): Record<string, unknown> {
  const entries: Array<[string, unknown]> = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const pair = item as { column?: unknown; value?: unknown };
      if (typeof pair?.column !== "string") throw new Error("Each value needs a column name.");
      entries.push([pair.column, pair.value]);
    }
  } else if (raw && typeof raw === "object") {
    for (const [column, value] of Object.entries(raw as Record<string, unknown>)) {
      entries.push([column, value]);
    }
  } else {
    throw new Error("values must list the columns to write.");
  }
  if (entries.length === 0) throw new Error("values must contain at least one column.");

  const out: Record<string, unknown> = {};
  for (const [column, value] of entries) {
    if (!isValidColumn(table, column)) {
      throw new Error(
        `Invalid column "${column}" for table "${table}". Valid columns: ${TABLE_COLUMNS[table].join(", ")}.`,
      );
    }
    if (PROTECTED_COLUMNS.includes(column)) {
      throw new Error(`Column "${column}" cannot be set by the assistant.`);
    }
    out[column] = value;
  }
  return out;
}

function valuesDef(description: string) {
  return {
    type: "array",
    description,
    items: {
      type: "object",
      properties: {
        column: { type: "string" },
        value: { type: ["string", "number", "boolean", "array", "null"] },
      },
      required: ["column", "value"],
    },
  } as const;
}

export const tools: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "get_dashboard_overview",
      description:
        "The smart business overview, computed exactly like the dashboard page: KPIs (active websites, SaaS projects, car buyers, visits, products, total paid sales, revenue this month, active subscriptions), actionable alerts (overdue tasks, deadlines in the next 14 days, blocked items, unpaid sales, subscriptions expiring within 30 days), pipeline velocity (counts by status per module), and Velora money (revenue, expenses, profit). Call this FIRST for any 'how is my business doing?' / summary / status question.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "search",
      description:
        "Fuzzy name search across 11 tables (tasks, customers, client websites, SaaS projects, car buyers, products, sales, Velora clients/orders/expenses, leads). Use to find a record by a partial name, then query that table for full detail. Optionally restrict with tables.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          tables: { type: "array", items: { type: "string", enum: SEARCH_TABLES } },
          limit: { type: "integer", minimum: 1, maximum: 50 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_table",
      description:
        "Read rows from a dashboard table with filters (eq, neq, gt, gte, lt, lte, contains=ilike, list=in, null check=is_null), ordering, and a limit of 50. Read-only. Use select to shrink results to the columns you need.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: TABLE_NAMES },
          filters: filterDef(),
          order_by: { type: "string" },
          order_asc: { type: "boolean" },
          limit: { type: "integer", minimum: LIMIT_MIN, maximum: LIMIT_MAX },
          select: { type: "string" },
        },
        required: ["table"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "count_table",
      description:
        "Count rows in a table, optionally with the same filters as query_table. Use for totals instead of fetching all rows.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: TABLE_NAMES },
          filters: filterDef(),
        },
        required: ["table"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "summarize_table",
      description:
        "Aggregate one table in a single call: row count, value groups for status/priority/payment_status/access_status (if present), and sums of numeric money columns (amount, price, sale_price, amount_paid, project_amount, budget). Use for 'how much', 'how many per status', 'total across ...' questions without pulling every row.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: TABLE_NAMES },
        },
        required: ["table"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description:
        "Create a new task in the Tasks module. Columns title (required), description, priority (Low|Medium|High|Urgent), due_date (YYYY-MM-DD), and optional links: saas_project_id, client_website_id, digital_product_id, property_id. New tasks always enter at status To Do. For other tables use create_record.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["Low", "Medium", "High", "Urgent"] },
          due_date: { type: "string", description: "YYYY-MM-DD" },
          saas_project_id: { type: "string" },
          client_website_id: { type: "string" },
          digital_product_id: { type: "string" },
          property_id: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task_status",
      description:
        "Change a task's status to one of: To Do, In Progress, Waiting, Done. Use task_id (preferred, from a query or search) or fall back to title for exact-title match. For editing any other field or table use update_record.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string" },
          title: { type: "string" },
          status: { type: "string", enum: ["To Do", "In Progress", "Waiting", "Done"] },
        },
        required: ["status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "describe_table",
      description:
        "List every column you may read or write on a table, plus its row count and one sample row. Call this before creating or editing a record in a table you have not touched yet, so you use real column names and value formats.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: TABLE_NAMES },
        },
        required: ["table"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_record",
      description:
        "Create a record in ANY dashboard table (customers, sales, car_buyers, saas_projects, client_websites, digital_products, resources, leads, properties, velora_clients, velora_orders, velora_expenses, tasks, ...). Send only columns that exist on that table (use describe_table). Numbers must be sent as numbers (price 2500, not \"2500\"); dates as YYYY-MM-DD or ISO. Returns the created row.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: TABLE_NAMES },
          values: valuesDef("Columns to insert, e.g. name + price for a product."),
        },
        required: ["table", "values"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_record",
      description:
        "Edit an existing record in ANY dashboard table: change status, price, dates, notes, contact details, progress, anything. Target one row with id (preferred — get it from query_table/search) or a set of filters; it refuses to run with neither. Returns how many rows changed and their new values.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: TABLE_NAMES },
          id: { type: "string", description: "Row id — preferred way to target one record." },
          filters: filterDef(),
          values: valuesDef("Columns to change and their new values."),
        },
        required: ["table", "values"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_record",
      description:
        "Permanently delete ONE record from any dashboard table by id. Call it only after the user clearly asked to delete that specific record, and always pass confirm=true. To clear many rows, delete them one by one and tell the user what you removed.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: TABLE_NAMES },
          id: { type: "string" },
          confirm: { type: "boolean", description: "Must be true — confirms the deletion is intended." },
        },
        required: ["table", "id", "confirm"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the LIVE web for current information: news, prices, product releases, competitors, people, companies, regulations, anything that changed after your training data. Use it whenever the user asks to check online, or when an answer needs recent facts. Returns results with title, url, published date and a snippet — always cite the URLs you actually used. If the search key is not configured the tool returns a clear error; report that instead of guessing.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "What to look for, in natural language." },
          num_results: { type: "integer", minimum: 1, maximum: 8 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_research_report",
      description:
        "File a research report in the dashboard (research_reports) so it shows up on the Research page. Call it right after a market / news / competitor / leads research, with the same content you are about to send: the question or project definition, a 2-3 sentence summary, the findings as light markdown, and the source URLs you actually used. It never writes to the business tables.",
      parameters: {
        type: "object",
        properties: {
          section: {
            type: "string",
            description:
              "Research section: tasks, customers, sales, cars, saas, websites, products, resources, leads, properties, velora, expenses, team, or general for free research.",
          },
          question: { type: "string", description: "The user's question or the project definition used." },
          summary: { type: "string", description: "2-3 sentences with the headline finding." },
          findings: {
            type: "string",
            description: "The findings, as light markdown (## headings, - bullets, **bold**).",
          },
          sources: {
            type: "array",
            description: "The web pages you used.",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                url: { type: "string" },
              },
              required: ["url"],
            },
          },
        },
        required: ["question", "summary", "findings"],
      },
    },
  },
];

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  // Web search needs no database access, so it runs before the client is built.
  if (name === "web_search") {
    const query = String(args["query"] ?? "").trim();
    if (!query) throw new Error("query is required.");
    const results = await webSearch(query, Number(args["num_results"] ?? 5));
    if (results.length === 0) return { query, results: [], note: "No results found." };
    return { query, results };
  }

  const supabase = getClient();

  if (name === "save_research_report") {
    const question = String(args["question"] ?? "").trim();
    if (!question) throw new Error("question is required.");
    const section = String(args["section"] ?? "general").trim() || "general";
    const sources = Array.isArray(args["sources"])
      ? (args["sources"] as unknown[])
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
          .map((item) => ({
            title: String(item["title"] ?? item["url"] ?? "Source").slice(0, 200),
            url: String(item["url"] ?? "").slice(0, 500),
          }))
          .filter((item) => /^https?:\/\//i.test(item.url))
          .slice(0, 10)
      : [];
    const { data, error } = await (supabase.from("research_reports" as never) as any)
      .insert({
        section,
        question: question.slice(0, 2000),
        summary: String(args["summary"] ?? "").slice(0, 2000) || null,
        findings: String(args["findings"] ?? "").slice(0, 8000) || null,
        sources,
        actions: [],
        created_by: "telegram",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { saved: true, id: (data as { id?: string } | null)?.id ?? null, section };
  }

  if (name === "get_dashboard_overview") {
    return computeInsights();
  }

  if (name === "search") {
    const needle = String(args["query"] ?? "").trim();
    if (!needle) throw new Error("query is required.");
    const limit = parseLimit(args["limit"]);
    const tables =
      Array.isArray(args["tables"]) && (args["tables"] as unknown[]).length > 0
        ? (args["tables"] as string[]).filter((t): t is TableName => isValidTable(t))
        : SEARCH_TABLES;
    const perTable = Math.max(1, Math.ceil(limit / tables.length));
    const results: Record<string, unknown[]> = {};
    await Promise.all(
      tables.map(async (table) => {
        try {
          const columns = TABLE_COLUMNS[table].filter((c) => TEXT_COLUMNS.includes(c));
          if (columns.length === 0) return;
          const ors = columns.map((c) => `${c}.ilike.%${needle}%`).join(",");
          const { data, error } = await supabase
            .from(table)
            .select(columns.filter((c) => c !== "notes").join(","))
            .or(ors)
            .limit(perTable);
          if (error) return;
          if (data && (data as unknown[]).length > 0) results[table] = data;
        } catch {
          // ignore per-table failures
        }
      }),
    );
    return results;
  }

  if (name === "query_table") {
    if (!isValidTable(args["table"])) throw new Error(`Invalid table "${String(args["table"])}".`);
    const table = args["table"] as TableName;

    const selectList = typeof args["select"] === "string" ? (args["select"] as string).split(",") : null;
    // Never select("*"): the registry excludes credential columns, so building
    // the list from it keeps passwords out of every AI response.
    let select = TABLE_COLUMNS[table].join(",");
    if (selectList && selectList.length > 0) {
      for (const col of selectList) {
        if (!isValidColumn(table, col.trim())) throw new Error(`Invalid column "${col.trim()}" for table "${table}".`);
      }
      select = selectList.map((c) => c.trim()).join(",");
    }

    const filters = parseFilters(table, args["filters"]);
    let query = supabase.from(table).select(select);
    query = applyFilters(query, filters);
    const orderBy =
      typeof args["order_by"] === "string" && isValidColumn(table, args["order_by"])
        ? args["order_by"]
        : TABLE_COLUMNS[table].includes("created_at")
          ? "created_at"
          : "id";
    query = query.order(orderBy, { ascending: args["order_asc"] === true });
    query = query.limit(parseLimit(args["limit"]));

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  if (name === "count_table") {
    if (!isValidTable(args["table"])) throw new Error(`Invalid table "${String(args["table"])}".`);
    const table = args["table"] as TableName;
    const filters = parseFilters(table, args["filters"]);
    let query = supabase.from(table).select("id", { count: "exact", head: true });
    query = applyFilters(query, filters);
    const { count, error } = await query;
    if (error) throw error;
    return { table, count: count ?? 0 };
  }

  if (name === "summarize_table") {
    if (!isValidTable(args["table"])) throw new Error(`Invalid table "${String(args["table"])}".`);
    const table = args["table"] as TableName;
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw error;
    const rows = (data ?? []) as Record<string, any>[];
    const out: Record<string, unknown> = { table, rows: rows.length };
    const groupColumns = ["status", "priority", "payment_status", "access_status"];
    for (const col of groupColumns) {
      if (!isValidColumn(table, col)) continue;
      const groups: Record<string, number> = {};
      let seen = false;
      for (const r of rows) {
        const v = r[col];
        if (v === null || v === undefined) continue;
        seen = true;
        const key = String(v);
        groups[key] = (groups[key] ?? 0) + 1;
      }
      if (seen) out[`by_${col}`] = groups;
    }
    const moneyColumns = MONEY_COLUMNS.filter((c) => isValidColumn(table, c));
    const sums: Record<string, number> = {};
    for (const col of moneyColumns) {
      let sum = 0;
      let seen = false;
      for (const r of rows) {
        const v = Number(r[col]);
        if (!Number.isNaN(v) && r[col] !== null && r[col] !== undefined) {
          sum += v;
          seen = true;
        }
      }
      if (seen) sums[col] = Math.round(sum * 100) / 100;
    }
    if (Object.keys(sums).length > 0) out["sums"] = sums;
    return out;
  }

  if (name === "create_task") {
    const title = String(args["title"] ?? "").trim();
    if (!title) throw new Error("title is required.");
    const priority = args["priority"];
    if (priority !== undefined && !["Low", "Medium", "High", "Urgent"].includes(String(priority))) {
      throw new Error("priority must be Low, Medium, High, or Urgent.");
    }
    const payload: Record<string, unknown> = {
      title,
      status: "To Do",
      created_by: "AI Assistant",
    };
    if (args["description"]) payload["description"] = String(args["description"]);
    if (priority) payload["priority"] = String(priority);
    if (args["due_date"]) payload["due_date"] = String(args["due_date"]);
    for (const link of ["saas_project_id", "client_website_id", "digital_product_id", "property_id"]) {
      if (args[link]) payload[link] = String(args[link]);
    }
    const { data, error } = await supabase.from("tasks").insert(payload).select().single();
    if (error) throw error;
    return data;
  }

  if (name === "update_task_status") {
    const status = String(args["status"] ?? "");
    if (!["To Do", "In Progress", "Waiting", "Done"].includes(status)) {
      throw new Error("status must be one of: To Do, In Progress, Waiting, Done.");
    }
    let taskId = args["task_id"] ? String(args["task_id"]) : null;
    if (!taskId) {
      const title = String(args["title"] ?? "").trim();
      if (!title) throw new Error("Provide task_id, or title to look up by title.");
      const { data, error } = await supabase
        .from("tasks")
        .select("id")
        .eq("title", title)
        .limit(1);
      if (error) throw error;
      taskId = (data as any[])?.[0]?.["id"] ?? null;
      if (!taskId) throw new Error(`No task found with title "${title}".`);
    }
    const { data, error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", taskId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  if (name === "describe_table") {
    if (!isValidTable(args["table"])) throw new Error(`Invalid table "${String(args["table"])}".`);
    const table = args["table"] as TableName;
    const columns = TABLE_COLUMNS[table].join(",");
    const { data, error, count } = await supabase
      .from(table)
      .select(columns, { count: "exact" })
      .limit(1);
    if (error) throw error;
    return {
      table,
      columns: TABLE_COLUMNS[table],
      rows: count ?? 0,
      sample: (data as unknown[] | null)?.[0] ?? null,
      writable: TABLE_COLUMNS[table].filter((c) => !PROTECTED_COLUMNS.includes(c)),
    };
  }

  if (name === "create_record") {
    if (!isValidTable(args["table"])) throw new Error(`Invalid table "${String(args["table"])}".`);
    const table = args["table"] as TableName;
    const values = parseValues(table, args["values"]);
    if (isValidColumn(table, "created_by") && values["created_by"] === undefined) {
      values["created_by"] = "AI Assistant";
    }
    const { data, error } = await supabase.from(table).insert(values).select().single();
    if (error) throw error;
    return { created: true, table, row: data };
  }

  if (name === "update_record") {
    if (!isValidTable(args["table"])) throw new Error(`Invalid table "${String(args["table"])}".`);
    const table = args["table"] as TableName;
    const values = parseValues(table, args["values"]);
    const id = args["id"] ? String(args["id"]) : null;
    const filters = parseFilters(table, args["filters"]);
    if (!id && filters.length === 0) {
      throw new Error(
        "Refusing to update: pass id (preferred) or at least one filter so the whole table cannot be overwritten by accident.",
      );
    }
    if (isValidColumn(table, "updated_at")) values["updated_at"] = new Date().toISOString();

    let query = supabase.from(table).update(values);
    query = id ? query.eq("id", id) : applyFilters(query, filters);
    const { data, error } = await query.select();
    if (error) throw error;
    const rows = (data ?? []) as unknown[];
    if (rows.length === 0) throw new Error(`No row matched in "${table}", so nothing was updated.`);
    return { updated: rows.length, table, rows };
  }

  if (name === "delete_record") {
    if (!isValidTable(args["table"])) throw new Error(`Invalid table "${String(args["table"])}".`);
    const table = args["table"] as TableName;
    const id = String(args["id"] ?? "").trim();
    if (!id) throw new Error("id is required to delete a record.");
    if (args["confirm"] !== true) {
      throw new Error("Refusing to delete: pass confirm=true once the user has agreed to remove this record.");
    }
    const { data, error } = await supabase.from(table).delete().eq("id", id).select();
    if (error) throw error;
    const rows = (data ?? []) as unknown[];
    if (rows.length === 0) throw new Error(`No row with id ${id} in "${table}".`);
    return { deleted: rows.length, table, row: rows[0] };
  }

  throw new Error(`Unknown tool: ${name}`);
}
