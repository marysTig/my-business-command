import { afterEach, beforeEach, describe, expect, test } from "bun:test";

const realFetch = globalThis.fetch;

type Captured = { url: string; body: any; auth: string };

function stubFetch(handler: (call: Captured, index: number) => Response) {
  const calls: Captured[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const call: Captured = {
      url: String(input),
      body: JSON.parse(String(init?.body ?? "{}")),
      auth: headers["Authorization"] ?? headers["authorization"] ?? "",
    };
    calls.push(call);
    return handler(call, calls.length - 1);
  }) as typeof fetch;
  return calls;
}

function completion(message: Record<string, unknown>) {
  return new Response(JSON.stringify({ choices: [{ message }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function useProviders(model1: string, model2: string) {
  process.env.ZAI_API_KEY = "key-one";
  process.env.ZAI_API_BASE = "https://provider-one.test/v1";
  process.env.ZAI_MODEL = model1;
  process.env.ZAI_API_KEY_2 = "key-two";
  process.env.ZAI_API_BASE_2 = "https://provider-two.test/v1";
  process.env.ZAI_MODEL_2 = model2;
  delete process.env.ZAI_API_KEY_3;
  delete process.env.ZAI_MODEL_FALLBACK;
}

describe("chatCompletions", () => {
  beforeEach(() => {
    useProviders("model-a", "model-b");
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("returns the model answer", async () => {
    const { chatCompletions } = await import("../src/lib/ai/client");
    const calls = stubFetch(() => completion({ role: "assistant", content: "bonjour" }));

    const { data, slot } = await chatCompletions({ messages: [{ role: "user", content: "hi" }] });

    expect(calls).toHaveLength(1);
    expect(calls[0].auth).toBe("Bearer key-one");
    expect(slot).toBe("key-1:model-a");
    expect((data as any).choices[0].message.content).toBe("bonjour");
  });

  test("retries the same provider when it answers with an empty completion", async () => {
    const { chatCompletions } = await import("../src/lib/ai/client");
    const calls = stubFetch((_call, index) =>
      index === 0 ? completion({ role: "assistant", content: "" }) : completion({ role: "assistant", content: "ok" }),
    );

    const { data } = await chatCompletions({ messages: [{ role: "user", content: "hi" }] });

    expect(calls).toHaveLength(2);
    // The retry must hit the provider that answered emptily, not another one.
    const hosts = new Set(calls.map((call) => new URL(call.url).host));
    expect(hosts.size).toBe(1);
    expect((data as any).choices[0].message.content).toBe("ok");
  });

  test("fails over to the second provider when the first one errors", async () => {
    useProviders("model-c", "model-d");
    const { chatCompletions } = await import("../src/lib/ai/client");
    const calls = stubFetch((call) =>
      call.url.startsWith("https://provider-one.test")
        ? new Response("boom", { status: 500 })
        : completion({ role: "assistant", content: "from provider two" }),
    );

    const { data, slot } = await chatCompletions({ messages: [{ role: "user", content: "hi" }] });

    expect(calls.length).toBe(2);
    expect(slot).toBe("key-2:model-d");
    expect((data as any).choices[0].message.content).toBe("from provider two");
  });
});

describe("runLoop", () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("feeds tool failures back to the model instead of aborting", async () => {
    useProviders("model-e", "model-f");
    const { runLoop } = await import("../src/lib/ai/client");

    const calls = stubFetch((_call, index) =>
      index === 0
        ? completion({
            role: "assistant",
            content: null,
            tool_calls: [
              { id: "call-1", type: "function", function: { name: "broken_tool", arguments: "{}" } },
            ],
          })
        : completion({ role: "assistant", content: "j'ai corrigé" }),
    );

    const executed: string[] = [];
    const reply = await runLoop(
      [{ role: "user", content: "fais le truc" }],
      [],
      async (name) => {
        executed.push(name);
        throw new Error('Invalid column "name" for table "saas_projects"');
      },
    );

    expect(executed).toEqual(["broken_tool"]);
    expect(calls).toHaveLength(2);
    const toolMessage = calls[1].body.messages.find((m: any) => m.role === "tool");
    expect(toolMessage.content).toContain("Invalid column");
    expect(reply.content).toBe("j'ai corrigé");
  });

  test("stays on the same provider for the whole turn", async () => {
    useProviders("model-g", "model-h");
    const { runLoop } = await import("../src/lib/ai/client");

    const calls = stubFetch((_call, index) =>
      index === 0
        ? completion({
            role: "assistant",
            content: null,
            tool_calls: [
              { id: "call-9", type: "function", function: { name: "count_table", arguments: '{"table":"tasks"}' } },
            ],
          })
        : completion({ role: "assistant", content: "2 tâches" }),
    );

    await runLoop([{ role: "user", content: "combien de tâches ?" }], [], async () => ({ count: 2 }));

    expect(calls).toHaveLength(2);
    const hosts = new Set(calls.map((call) => new URL(call.url).host));
    expect(hosts.size).toBe(1);
  });

  test("answers in plain text when a turn produces no tool calls", async () => {
    useProviders("model-i", "model-j");
    const { runLoop } = await import("../src/lib/ai/client");
    stubFetch(() => completion({ role: "assistant", content: "direct" }));

    const reply = await runLoop([{ role: "user", content: "salut" }], [], async () => null);

    expect(reply.content).toBe("direct");
  });
});
