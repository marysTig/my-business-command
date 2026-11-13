// Server-side AI client with a small key pool.
//
// Two Z.ai (or any OpenAI-compatible) API keys are balanced round-robin;
// if one hits a rate limit (429) or a server error (5xx) it is cooled down
// and the next key answers the request instead.
//
// Env (never VITE_-prefixed, never shipped to the browser):
//   ZAI_API_KEY      first key slot
//   ZAI_API_KEY_2    second key slot (optional)
//   ZAI_API_KEY_3    third key slot (optional) — may be another provider
//   ZAI_API_BASE     default https://api.z.ai/api/paas/v4
//   ZAI_MODEL        default glm-4.6
// Slots are round-robin with cooldown failover, so a free Groq key
// (ZAI_API_BASE_3=https://api.groq.com/openai/v1, ZAI_MODEL_3=openai/gpt-oss-120b)
// can sit next to the Gemini slots and add its own daily quota.
//   ZAI_MODEL_FALLBACK  comma-separated extra models tried when one is out of
//                       quota (429) — each Gemini model has its own daily limit
// Per-slot overrides ZAI_API_BASE_2 / ZAI_MODEL_2 let the second key point at
// another OpenAI-compatible endpoint if it is not Z.ai.

type Slot = {
  id: string;
  base: string;
  key: string;
  model: string;
  fallback?: boolean;
};

function env(name: string): string | undefined {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;
  // In Vite SSR (TanStack Start server fns), loaded env vars are exposed via
  // import.meta.env, which always reflects the current .env.local contents.
  const fromMeta = import.meta.env?.[name]?.trim();
  return fromMeta || undefined;
}

// Every (key, model) pair is its own target: a model out of daily quota is
// retried later while its sibling models on the same key keep answering.
function readSlots(): Slot[] {
  const base = env("ZAI_API_BASE") ?? "https://api.z.ai/api/paas/v4";
  const model = env("ZAI_MODEL") ?? "glm-4.6";
  const fallbacks = (env("ZAI_MODEL_FALLBACK") ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const slots: Slot[] = [];
  // Slot suffixes: "" = first, "_2", "_3" — each may point at another provider
  // (e.g. Groq's free gpt-oss-120b) through its own base + model.
  for (const [index, suffix] of ["", "_2", "_3"].entries()) {
    const key = env(`ZAI_API_KEY${suffix}`);
    if (!key) continue;
    slots.push({
      id: `key-${index + 1}`,
      base: env(`ZAI_API_BASE${suffix}`) ?? base,
      key,
      model: env(`ZAI_MODEL${suffix}`) ?? model,
    });
  }
  if (slots.length === 0) {
    throw new Error(
      "No AI API key configured. Set ZAI_API_KEY (and optionally ZAI_API_KEY_2) server-side.",
    );
  }
  return slots.flatMap((slot) => {
    const models = [...new Set([slot.model, ...fallbacks])];
    // The first model of a slot is its primary; the rest only serve as overflow
    // once every primary is rate-limited, so quality stays consistent.
    return models.map((m, index) => ({ ...slot, id: `${slot.id}:${m}`, model: m, fallback: index > 0 }));
  });
}

// Round-robin cursor + per-key cooldown (in-memory; fine for a single
// instance, and for two keys the failover matters more than perfect spread).
let cursor = 0;
const cooldownUntil = new Map<string, number>();

function rotate<T>(list: T[], start: number): T[] {
  if (list.length === 0) return [];
  const s = start % list.length;
  return [...list.slice(s), ...list.slice(0, s)];
}

function orderedSlots(slots: Slot[]): Slot[] {
  const now = Date.now();
  const fresh = slots.filter((s) => (cooldownUntil.get(s.id) ?? 0) <= now);
  const pool = fresh.length > 0 ? fresh : slots;
  const primary = pool.filter((s) => !s.fallback);
  const fallback = pool.filter((s) => s.fallback);
  // Primaries first (round-robin), overflow models only if none is available.
  return primary.length > 0
    ? [...rotate(primary, cursor), ...rotate(fallback, cursor)]
    : rotate(fallback, cursor);
}

function coolDown(slot: Slot, status: number) {
  // Quota errors clear slowly; empty/stalled answers recover in seconds, so a
  // short cooldown keeps the fast provider in rotation.
  cooldownUntil.set(slot.id, Date.now() + (status === 429 ? 60_000 : 15_000));
}

export async function chatCompletions(
  payload: Record<string, unknown>,
  preferredSlot?: string,
) {
  const slots = readSlots();
  const order = orderedSlots(slots);
  cursor = (cursor + 1) % slots.length;
  // Stay on the same key/model for a whole conversation turn: providers format
  // their tool calls differently, so switching mid-loop breaks the payload.
  if (preferredSlot) {
    const index = order.findIndex((s) => s.id === preferredSlot);
    if (index > 0) order.unshift(...order.splice(index, 1));
  }

  let lastStatus = 0;
  for (const slot of order) {
    // Free providers now and then answer with an empty completion; retry the
    // same slot once before cooling it down and moving to the next provider.
    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      try {
        response = await fetch(`${slot.base}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${slot.key}`,
          },
          body: JSON.stringify({ ...payload, model: slot.model }),
          // A stalled upstream must fail over quickly, not hang the bot.
          signal: AbortSignal.timeout(25_000),
        });
      } catch {
        // Network-level failure or timeout: try the next key/model.
        coolDown(slot, 502);
        break;
      }
      if (response.status === 429 || response.status >= 500) {
        lastStatus = response.status;
        coolDown(slot, response.status);
        break;
      }
      if (!response.ok) {
        // Any provider-specific rejection (bad payload, model not enabled) is a
        // reason to try the next slot, not to fail the whole request.
        lastStatus = response.status;
        const body = await response.text().catch(() => "");
        console.error(`[ai] ${slot.id} -> ${response.status} ${body.slice(0, 200)}`);
        coolDown(slot, 502);
        break;
      }
      const data = (await response.json()) as {
        choices?: Array<{
          message?: { content?: unknown; tool_calls?: unknown[] };
        }>;
      };
      const message = data.choices?.[0]?.message;
      const hasText = typeof message?.content === "string" && message.content.trim().length > 0;
      const hasCalls = Array.isArray(message?.tool_calls) && message.tool_calls.length > 0;
      if (message && !hasText && !hasCalls) {
        lastStatus = 502;
        if (attempt === 0) continue;
        coolDown(slot, 502);
        break;
      }
      return { slot: slot.id, data };
    }
  }
  throw new Error(`All AI keys failed (last status ${lastStatus}).`);
}

export type ToolDef = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type Message = {
  role: string;
  content?: unknown;
  tool_calls?: Array<{
    id: string;
    type?: string;
    function: { name: string; arguments?: string };
  }>;
  tool_call_id?: string;
  [key: string]: unknown;
};

/**
 * Keeps only the fields the OpenAI wire format defines. Providers add their own
 * extras (e.g. NVIDIA's reasoning_content, Gemini's thought_signature) and
 * another provider rejects them, so a message is never replayed as-is.
 */
function cleanMessage(message: Message): Message {
  const out: Message = {
    role: String(message.role ?? "assistant"),
    content: typeof message.content === "string" ? message.content : (message.content ?? null),
  };
  if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
    out.tool_calls = message.tool_calls.map((call) => ({
      id: call.id,
      type: "function",
      function: { name: call.function.name, arguments: call.function.arguments ?? "{}" },
    }));
  }
  if (message.tool_call_id) out.tool_call_id = message.tool_call_id;
  return out;
}

/**
 * Runs the tool-calling loop: ask the model, execute any requested tools with
 * the provided callback, feed results back, and repeat until the model answers
 * in plain text. Returns the assistant's final message. If the round cap is
 * reached, the model gets one final tool-less call to answer from the data it
 * already gathered, instead of failing.
 */
export async function runLoop(
  messages: Message[],
  tools: ToolDef[],
  execute: (name: string, args: Record<string, unknown>) => Promise<unknown>,
  maxRounds = 10,
): Promise<Message> {
  let convo: Message[] = messages.map(cleanMessage);
  let pinned: string | undefined;
  for (let round = 0; round < maxRounds; round++) {
    const { data, slot } = await chatCompletions(
      {
        messages: convo,
        tools,
        tool_choice: "auto",
        temperature: 0.2,
      },
      pinned,
    );
    pinned = slot;
    const message = (data as { choices?: Array<{ message?: Message }> }).choices?.[0]?.message;
    if (!message) throw new Error("AI returned an empty response.");
    convo = [...convo, cleanMessage(message)];
    const calls = message.tool_calls ?? [];
    if (calls.length === 0) {
      if (String(message.content ?? "").trim().length > 0) return message;
      // Empty answer: ask once more for plain text instead of showing nothing.
      if (round < maxRounds - 1) {
        convo.push({ role: "system", content: "Your previous reply was empty. Answer the user's question in plain text." });
        continue;
      }
      throw new Error("AI returned an empty answer.");
    }
    for (const call of calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments ?? "{}");
      } catch {
        args = {};
      }
      // A failed tool is fed back as data, not thrown: the model can read the
      // error (wrong column, bad filter) and correct itself in the same turn.
      let result: unknown;
      try {
        result = await execute(call.function.name, args);
      } catch (error) {
        result = {
          error: error instanceof Error ? error.message : String(error),
          hint: "The call failed. Fix the arguments (real column names come from describe_table) and try again, or explain the failure to the user.",
        };
      }
      convo.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  // Round cap hit: answer with the data already gathered (no more tool calls).
  convo.push({
    role: "system",
    content:
      "You have used all of your tool calls. Give your final answer now using only the data you have already collected. Do not call any tools.",
  });
  const { data } = await chatCompletions({ messages: convo.map(cleanMessage), temperature: 0.2 }, pinned);
  const message = (data as { choices?: Array<{ message?: Message }> }).choices?.[0]?.message;
  if (!message) throw new Error("AI returned an empty response.");
  return message;
}
