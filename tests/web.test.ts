import { afterEach, beforeEach, describe, expect, test } from "bun:test";

const realFetch = globalThis.fetch;

type Captured = { url: string; init?: RequestInit };

function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: Captured[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;
  return calls;
}

describe("webSearch", () => {
  beforeEach(() => {
    process.env.EXA_API_KEY = "test-key";
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.EXA_API_KEY;
  });

  test("reports a clear error when no key is configured", async () => {
    delete process.env.EXA_API_KEY;
    const { webSearch, webSearchConfigured } = await import("../src/lib/ai/web");
    expect(webSearchConfigured()).toBe(false);
    await expect(webSearch("anything")).rejects.toThrow(/EXA_API_KEY/);
  });

  test("calls Exa with the key and maps results", async () => {
    const { webSearch } = await import("../src/lib/ai/web");
    const calls = stubFetch(
      () =>
        new Response(
          JSON.stringify({
            results: [
              { title: " Doc ", url: "https://a.test/x", highlights: [" hi "], publishedDate: "2026-01-02" },
              { url: "https://b.test/y" },
              { title: "no url" },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );

    const results = await webSearch("  tanstack start  ", 3);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.exa.ai/search");
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("test-key");
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.query).toBe("tanstack start");
    expect(body.numResults).toBe(3);

    // Results without a url are dropped; the rest are normalised.
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      title: "Doc",
      url: "https://a.test/x",
      snippet: "hi",
      published: "2026-01-02",
    });
    expect(results[1].title).toBe("https://b.test/y");
  });

  test("surfaces HTTP failures instead of pretending there are no results", async () => {
    const { webSearch } = await import("../src/lib/ai/web");
    stubFetch(() => new Response("quota exceeded", { status: 429 }));
    await expect(webSearch("x")).rejects.toThrow(/HTTP 429/);
  });

  test("rejects an empty query", async () => {
    const { webSearch } = await import("../src/lib/ai/web");
    await expect(webSearch("   ")).rejects.toThrow(/query/i);
  });
});
