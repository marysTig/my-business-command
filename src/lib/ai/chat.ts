import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { runLoop, type Message } from "./client";
import { executeTool, tools } from "./tools";
import { SYSTEM_PROMPT } from "./prompt";

const ChatInputSchema = z.object({
  messages: z.array(
    z.object({
      role: z.string(),
      content: z.string().optional(),
    }),
  ),
});

/**
 * Server function (POST). Runs the tool loop with the key pool in ./client,
 * executing the read-only tools in ./tools against Supabase. Only the final
 * assistant message is returned — tool calls and DB rows stay server-side.
 */
export const chatWithAssistant = createServerFn({ method: "POST" })
  .validator(ChatInputSchema)
  .handler(async ({ data }) => {
    const messages = (data.messages ?? []).filter(
      (m) => typeof m.content === "string" && m.content.length > 0,
    );
    if (messages.length === 0) {
      throw new Error("No messages provided.");
    }

    const reply = await runLoop(
      [{ role: "system", content: SYSTEM_PROMPT }, ...messages] as Message[],
      tools,
      executeTool,
    );

    return { reply: String(reply.content ?? "") };
  });
