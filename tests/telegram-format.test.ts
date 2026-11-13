import { describe, expect, test } from "bun:test";

import { escapeHtml, stripTags, toTelegramHtml } from "../src/lib/telegram-format";

describe("toTelegramHtml", () => {
  test("escapes raw HTML from the model", () => {
    const out = toTelegramHtml('Attention <script>alert("x")</script> & done');
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
    expect(out).toContain("&amp; done");
  });

  test("converts bold, inline code and headings", () => {
    expect(toTelegramHtml("**Total** : `12` ventes")).toBe("<b>Total</b> : <code>12</code> ventes");
    expect(toTelegramHtml("## Résumé")).toBe("<b>Résumé</b>");
  });

  test("converts links without breaking the href", () => {
    const out = toTelegramHtml("voir [Exa](https://exa.ai/docs?x=1&y=2)");
    expect(out).toBe('voir <a href="https://exa.ai/docs?x=1&amp;y=2">Exa</a>');
  });

  test("turns dashes into bullets and keeps numbers", () => {
    const out = toTelegramHtml("- client A\n- client B\n1. premier");
    expect(out).toContain("• client A");
    expect(out).toContain("• client B");
    expect(out).toContain("1. premier");
  });

  test("supports italic but never mangles snake_case identifiers", () => {
    expect(toTelegramHtml("c'est *important* ici")).toContain("<i>important</i>");
    expect(toTelegramHtml("colonne saas_project_id")).toContain("saas_project_id");
  });

  test("keeps fenced code verbatim", () => {
    const out = toTelegramHtml("```ts\nconst a = 1 < 2;\n```");
    expect(out).toBe("<pre>const a = 1 &lt; 2;</pre>");
  });

  test("collapses runs of blank lines", () => {
    expect(toTelegramHtml("a\n\n\n\nb")).toBe("a\n\nb");
  });
});

describe("escapeHtml / stripTags", () => {
  test("round-trips the supported subset", () => {
    const html = escapeHtml("a < b & c > d");
    expect(html).toBe("a &lt; b &amp; c &gt; d");
    expect(stripTags(`<b>${html}</b>`)).toBe("a < b & c > d");
  });

  test("stripTags removes every tag", () => {
    expect(stripTags('<b>x</b> <a href="y">z</a>')).toBe("x z");
  });
});
