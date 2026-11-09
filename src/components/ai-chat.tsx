import { Loader2, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatWithAssistant } from "@/lib/ai/chat";
import { cn } from "@/lib/utils";

type ChatItem = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Give me a business overview",
  "What needs my attention today?",
  "Create a task: follow up with the car buyer",
  "Who is my client bader edine?",
  "Show me my recent sales",
];

export function AiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    const next: ChatItem[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setPending(true);
    try {
      const { reply } = await chatWithAssistant({
        data: { messages: next },
      });
      setMessages([...next, { role: "assistant", content: reply || "…" }]);
    } catch (error) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: `Sorry, something went wrong: ${error instanceof Error ? error.message : "unknown error"}`,
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <>
      <Button
        size="icon"
        className="fixed right-5 bottom-5 z-50 size-12 rounded-full shadow-lg"
        aria-label="Open AI assistant"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
      </Button>

      {open && (
        <div className="fixed right-5 bottom-20 z-50 flex h-[32rem] max-h-[70vh] w-[24rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Sparkles className="size-4 text-primary" />
            <div className="leading-tight">
              <p className="text-sm font-semibold">AI Assistant</p>
              <p className="text-xs text-muted-foreground">Reads your dashboard data, creates &amp; moves tasks</p>
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Ask anything about your business — or tell me to add a task.
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    disabled={pending}
                    className="block w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-accent",
                )}
              >
                {m.content}
              </div>
            ))}

            {pending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Thinking…
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="flex gap-2 border-t border-border p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your business…"
              disabled={pending}
            />
            <Button type="submit" size="icon" disabled={pending || !input.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
