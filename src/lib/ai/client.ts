// Server-side AI client with a small key pool.
//
// Two Z.ai (or any OpenAI-compatible) API keys are balanced round-robin;
// if one hits a rate limit (429) or a server error (5xx) it is cooled down
// and the next key answers the request instead.
//
// Env (never VITE_-prefixed, never shipped to the browser):
//   ZAI_API_KEY      first key slot
//   ZAI_API_KEY_2    second key slot (optional)
//   ZAI_API_BASE     default https://api.z.ai/api/paas/v4
//   ZAI_MODEL        default glm-4.6
// Per-slot overrides ZAI_API_BASE_2 / ZAI_MODEL_2 let the second key point at
// another OpenAI-compatible endpoint if it is not Z.ai.

type Slot = {
  id: string;
  base: string;
  key: string;
  model: string;
};

function env(name: string): string | undefined {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;
  // In Vite SSR (TanStack Start server fns), loaded env vars are exposed via
  // import.meta.env, which always reflects the current .env.local contents.
  const fromMeta = import.meta.env?.[name]?.trim();
  return fromMeta || undefined;
}

function readSlots(): Slot[] {
  const base = env("ZAI_API_BASE") ?? "https://api.z.ai/api/paas/v4";
  const model = env("ZAI_MODEL") ?? "glm-4.6";
  const slots: Slot[] = [];
  const first = env("ZAI_API_KEY");
  if (first) slots.push({ id: "key-1", base, key: first, model });
  const second = env("ZAI_API_KEY_2");
  if (second) {
    slots.push({
      id: "key-2",
      base: env("ZAI_API_BASE_2") ?? base,
      key: second,
      model: env("ZAI_MODEL_2") ?? model,
    });
  }
  if (slots.length === 0) {
    throw new Error(
      "No AI API key configured. Set ZAI_API_KEY (and optionally ZAI_API_KEY_2) server-side.",
    );
  }
  return slots;
}

// Round-robin cursor + per-key cooldown (in-memory; fine for a single
// instance, and for two keys the failover matters more than perfect spread).
let cursor = 0;
const cooldownUntil = new Map<string, number>();

function orderedSlots(slots: Slot[]): Slot[] {
  const start = cursor % slots.length;
  const ordered = [...slots.slice(start), ...slots.slice(0, start)];
  const now = Date.now();
  const fresh = ordered.filter((s) => (cooldownUntil.get(s.id) ?? 0) <= now);
  return fresh.length > 0 ? fresh : ordered;
}

function coolDown(slot: Slot, status: number) {
  cooldownUntil.set(slot.id, Date.now() + (status === 429 ? 60_000 : 30_000));
}

export async function chatCompletions(payload: Record<string, unknown>) {
  const slots = readSlots();
  const order = orderedSlots(slots);
  cursor = (cursor + 1) % slots.length;

  let lastStatus = 0;
  for (const slot of order) {
    let response: Response;
    try {
      response = await fetch(`${slot.base}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${slot.key}`,
        },
        body: JSON.stringify({ ...payload, model: slot.model }),
      });
    } catch {
      // Network-level failure: try the next key.
      coolDown(slot, 502);
      continue;
    }
    if (response.status === 429 || response.status >= 500) {
      lastStatus = response.status;
      coolDown(slot, response.status);
      continue;
    }
    if (!response.ok) {
      throw new Error(`AI request failed (status ${response.status}, slot ${slot.id}).`);
    }
    const data = await response.json();
    return { slot: slot.id, data };
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
  tool_calls?: Array<{ id: string; function: { name: string; arguments?: string } }>;
  tool_call_id?: string;
};

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
  let convo: Message[] = [...messages];
  for (let round = 0; round < maxRounds; round++) {
    const { data } = await chatCompletions({
      messages: convo,
      tools,
      tool_choice: "auto",
      temperature: 0.2,
    });
    const message = (data as { choices?: Array<{ message?: Message }> }).choices?.[0]?.message;
    if (!message) throw new Error("AI returned an empty response.");
    convo = [...convo, message];
    const calls = message.tool_calls ?? [];
    if (calls.length === 0) return message;
    for (const call of calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments ?? "{}");
      } catch {
        args = {};
      }
      const result = await execute(call.function.name, args);
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
  const { data } = await chatCompletions({ messages: convo, temperature: 0.2 });
  const message = (data as { choices?: Array<{ message?: Message }> }).choices?.[0]?.message;
  if (!message) throw new Error("AI returned an empty response.");
  return message;
}
