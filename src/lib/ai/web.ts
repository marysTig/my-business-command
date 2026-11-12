/**
 * Live web search for the assistant and the bot.
 *
 * Provider: Exa (https://exa.ai). The key is read from EXA_API_KEY, server
 * side only — the bot reads it from .env.local, the deployed site from its
 * secrets. Without a key the helper throws a clear message instead of silently
 * returning nothing, so the assistant can tell the user what is missing.
 */

export type WebResult = {
  title: string;
  url: string;
  snippet: string;
  published: string | null;
};

const EXA_ENDPOINT = "https://api.exa.ai/search";
const DEFAULT_RESULTS = 5;
const MAX_RESULTS = 8;
const TIMEOUT_MS = 12_000;

function apiKey(): string | undefined {
  const fromProcess = process.env["EXA_API_KEY"]?.trim();
  if (fromProcess) return fromProcess;
  return (import.meta.env?.["EXA_API_KEY"] as string | undefined)?.trim() || undefined;
}

export function webSearchConfigured(): boolean {
  return Boolean(apiKey());
}

export async function webSearch(query: string, numResults = DEFAULT_RESULTS): Promise<WebResult[]> {
  const text = query.trim();
  if (!text) throw new Error("A search query is required.");

  const key = apiKey();
  if (!key) {
    throw new Error(
      "Web search is not configured: add EXA_API_KEY to .env.local (bot) or to the site secrets, then restart.",
    );
  }

  const count = Math.min(Math.max(Math.trunc(Number(numResults) || DEFAULT_RESULTS), 1), MAX_RESULTS);

  let response: Response;
  try {
    response = await fetch(EXA_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify({
        query: text.slice(0, 400),
        type: "auto",
        numResults: count,
        contents: { highlights: { numSentences: 2 }, text: { maxCharacters: 800 } },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(
      `Web search failed: ${error instanceof Error ? error.message : "network error"}.`,
    );
  }

  if (!response.ok) {
    throw new Error(`Web search failed (HTTP ${response.status}): ${(await response.text()).slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    results?: Array<{
      title?: string | null;
      url?: string;
      publishedDate?: string | null;
      highlights?: string[];
      text?: string;
    }>;
  };

  return (data.results ?? [])
    .filter((item) => Boolean(item.url))
    .map((item) => ({
      title: item.title?.trim() || item.url!,
      url: item.url!,
      snippet: (item.highlights?.[0] ?? item.text?.slice(0, 300) ?? "").trim(),
      published: item.publishedDate ?? null,
    }));
}
