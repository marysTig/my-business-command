// Telegram bridge for the AI assistant (long-polling, no public URL needed).
//
// Setup:
//   1. In Telegram, open @BotFather -> /newbot -> copy the token.
//   2. Add to .env.local:  TELEGRAM_BOT_TOKEN=...   (never commit)
//   3. Run:  bun run scripts/telegram-bot.mjs        (or: npm run telegram)
//   4. Message your bot once. It replies with your chat_id.
//   5. Add:  TELEGRAM_OWNER_CHAT_ID=<your chat_id>  and restart.
//      Until then the bot refuses to answer data questions from any chat.
//
// Commands: /start (help), /overview (business overview), /reset (forget this chat).
// Usage: honest one-shot check with `bun run scripts/telegram-bot.mjs --check`.

import { readFileSync, writeFileSync } from "node:fs";

import { stripTags, toTelegramHtml } from "../src/lib/telegram-format.ts";

const ENV_FILES = ["../.env.local", "../.env"];
for (const file of ENV_FILES) {
  try {
    const raw = readFileSync(new URL(file, import.meta.url), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2].trim();
      }
    }
  } catch {
    // missing env file — fine, other file may have it
  }
}

const TOKEN = process.env["TELEGRAM_BOT_TOKEN"] ?? "";
const OWNER = String(process.env["TELEGRAM_OWNER_CHAT_ID"] ?? "").trim();
// Extra chats allowed to use the bot (e.g. a group id like -1001234567890).
// The owner is always allowed in any chat; these let teammates/group members ask too.
const ALLOWED_CHATS = new Set(
  String(process.env["TELEGRAM_ALLOWED_CHATS"] ?? "")
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter(Boolean),
);

function die(message) {
  console.error(message);
  process.exit(1);
}

if (!TOKEN) {
  die(
    [
      "TELEGRAM_BOT_TOKEN is not set.",
      "1. Open Telegram -> @BotFather -> /newbot -> name your bot -> copy the token.",
      "2. Add this line to .env.local (never commit it):  TELEGRAM_BOT_TOKEN=<token>",
      "3. Message the bot once to get your chat_id, then add TELEGRAM_OWNER_CHAT_ID=<chat_id>.",
    ].join("\n"),
  );
}

const API = `https://api.telegram.org/bot${TOKEN}`;

async function tg(method, params = {}) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    throw new Error(`${method} failed: ${data.description ?? res.statusText}`);
  }
  return data.result;
}

if (process.argv.includes("--check")) {
  try {
    const me = await tg("getMe");
    console.log(`ok: bot @${me.username} (id ${me.id})`);
    console.log(`owner lock: ${OWNER ? `user id ${OWNER}` : "NOT SET — bot will ask the first chat to set it"}`);
    console.log(`extra allowed chats: ${ALLOWED_CHATS.size ? [...ALLOWED_CHATS].join(", ") : "none"}`);
    process.exit(0);
  } catch (err) {
    die(`token check failed: ${err.message}`);
  }
}

// Lazy-load the AI stack after env is in process.env (client.ts reads env at call time).
const { runLoop } = await import("../src/lib/ai/client.ts");
const { executeTool, tools } = await import("../src/lib/ai/tools.ts");
const { SYSTEM_PROMPT } = await import("../src/lib/ai/prompt.ts");

// Per-chat conversation history (last 16 messages) so follow-ups stay in context.
// It is mirrored to disk, so a restart or a PC reboot no longer wipes what the
// user already told the bot.
const STATE_FILE = new URL("../.telegram-bot-state.json", import.meta.url);
const histories = new Map();
try {
  const saved = JSON.parse(readFileSync(STATE_FILE, "utf8"));
  for (const [chat, messages] of Object.entries(saved ?? {})) {
    if (Array.isArray(messages)) histories.set(chat, messages);
  }
} catch {
  // First run, or a corrupt file: start with empty histories.
}

function saveHistories() {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(Object.fromEntries(histories)));
  } catch (error) {
    console.error(`could not save conversation history: ${error.message}`);
  }
}

// ---------- Telegram presentation ----------
// A persistent keyboard gives the user tappable shortcuts; every button just
// sends a slash command, so a bot can keep driving the same actions.
const KEYBOARD = {
  keyboard: [
    ["📊 Vue business", "✅ Tâches"],
    ["💼 Projets SaaS", "🔎 Recherche web"],
    ["🧾 Dépenses", "❓ Aide"],
  ],
  resize_keyboard: true,
  is_persistent: true,
  input_field_placeholder: "Pose une question ou choisis une action…",
};

const BUTTON_COMMANDS = new Map([
  ["📊 Vue business", "/overview"],
  ["✅ Tâches", "/tasks"],
  ["💼 Projets SaaS", "/projects"],
  ["🔎 Recherche web", "/search"],
  ["🧾 Dépenses", "/expenses"],
  ["❓ Aide", "/help"],
]);

function splitMessage(text, limit = 3900) {
  const parts = [];
  let rest = String(text ?? "");
  while (rest.length > limit) {
    const lineBreak = rest.lastIndexOf("\n", limit);
    const cut = lineBreak > 1000 ? lineBreak : limit;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n+/, "");
  }
  if (rest.length > 0) parts.push(rest);
  return parts.length > 0 ? parts : ["…"];
}

async function sendReply(chatId, text, options = {}) {
  const shared = {
    chat_id: chatId,
    disable_web_page_preview: true,
    ...(options.replyTo
      ? { reply_parameters: { message_id: options.replyTo, allow_sending_without_reply: true } }
      : {}),
    ...(options.keyboard ? { reply_markup: options.keyboard } : {}),
  };

  for (const part of splitMessage(text)) {
    try {
      await tg("sendMessage", { ...shared, text: part, parse_mode: "HTML" });
    } catch (error) {
      // Telegram rejects an entire message if a single tag is malformed, so the
      // same content is resent as plain text instead of being lost.
      console.error(`[${chatId}] HTML rejected, retrying as text: ${error.message}`);
      await tg("sendMessage", { ...shared, text: stripTags(part) });
    }
  }
}

async function askAssistant(chatId, question) {
  const history = histories.get(chatId) ?? [];
  history.push({ role: "user", content: question });
  // Keep the last 16 messages (system prompt is prepended each turn).
  while (history.length > 16) history.shift();

  const reply = await runLoop(
    [{ role: "system", content: SYSTEM_PROMPT }, ...history],
    tools,
    executeTool,
  );

  const text = String(reply.content ?? "I couldn't find an answer.").trim();
  history.push({ role: "assistant", content: text });
  histories.set(chatId, history);
  saveHistories();
  return text;
}

const HELP = [
  "<b>🤖 Assistant My Business OS</b>",
  "",
  "Je réponds sur tes <b>tâches</b>, <b>clients</b>, <b>ventes</b> et <b>projets</b> — et je peux ajouter ou modifier des choses pour toi.",
  "",
  "<b>Raccourcis</b>",
  "/overview — 📊 vue business (KPI, alertes, échéances)",
  "/tasks — ✅ tâches par statut",
  "/customers — 👥 clients",
  "/projects — 💼 projets SaaS",
  "/sales — 💰 ventes et impayés",
  "/expenses — 🧾 dépenses du mois",
  "/prospects — 📎 fichiers de prospection",
  "/research — 🔬 recherches",
  "/add <i>chose</i> — ➕ ajouter",
  "/edit <i>chose</i> — ✏️ modifier",
  "/search <i>sujet</i> — 🔎 recherche web",
  "/reset — 🧹 oublier la conversation",
  "",
  "<i>Tu peux aussi écrire normalement. En groupe je ne réponds qu'aux commandes et aux @mentions.</i>",
].join("\n");

// Every power of the bot, as a Telegram command. Registered with setMyCommands
// so typing "/" in Telegram shows this list, and printed by /commands too.
const COMMANDS = [
  { command: "help", description: "Toutes mes commandes / ce que je sais faire" },
  { command: "overview", description: "Vue business: KPI, alertes, échéances" },
  { command: "tasks", description: "Mes tâches par statut, avec les dates" },
  { command: "customers", description: "Mes clients" },
  { command: "projects", description: "Mes projets SaaS et leur avancement" },
  { command: "sales", description: "Ventes: total, payé, impayé" },
  { command: "expenses", description: "Mes dépenses perso du mois" },
  { command: "prospects", description: "Fichiers de la liste prospection" },
  { command: "research", description: "Résumé de mes recherches" },
  { command: "add", description: "Ajouter: /add tâche appeler Ali" },
  { command: "edit", description: "Modifier: /edit tâche <titre> terminé" },
  { command: "search", description: "Recherche web: /search <sujet>" },
  { command: "reset", description: "Oublier cette conversation" },
];

// What each read command actually asks the assistant.
const COMMAND_PROMPTS = {
  tasks: "List my tasks grouped by status, with due dates and priorities.",
  customers: "List my customers with their contact details.",
  projects: "List my SaaS projects with their status and progress.",
  sales: "Summarise my sales: totals, amount paid and unpaid.",
  expenses: "List my personal expenses for this month and the total.",
  prospects: "List the prospect list files attached to each SaaS project.",
  research: "Summarise my latest research reports.",
};

function commandsList() {
  return COMMANDS.map((c) => `/${c.command} — ${c.description}`).join("\n");
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const chatType = String(msg.chat.type ?? "private");
  const isGroup = chatType === "group" || chatType === "supergroup";
  let text = String(msg.text ?? "").trim();
  if (!text) return;

  // Telegram never delivers bot-authored messages to bots; skip defensively.
  if (msg.from?.is_bot) return;

  // In groups commands arrive as "/overview@MyBot" — normalise to "/overview".
  text = text.replace(/^\/([A-Za-z0-9_]+)@([A-Za-z0-9_]+)/, (full, cmd, target) =>
    !BOT_USERNAME || target.toLowerCase() === BOT_USERNAME ? `/${cmd}` : full,
  );

  // Keyboard buttons send their label as a message; treat it as its command.
  const buttonCommand = BUTTON_COMMANDS.get(text);
  if (buttonCommand) text = buttonCommand;

  const senderId = String(msg.from?.id ?? "");
  const mentioned = BOT_USERNAME ? text.toLowerCase().includes(`@${BOT_USERNAME}`) : false;
  const isCommand = text.startsWith("/");
  const isOwner = Boolean(OWNER) && senderId === OWNER;
  const chatAllowed = ALLOWED_CHATS.has(String(chatId));

  // Groups: allowlisted groups can chat freely; other groups need a command or @mention.
  if (isGroup && !chatAllowed && !isCommand && !mentioned) {
    console.log(`[${chatId}] group ${chatType} message ignored (not allowlisted, no command/mention)`);
    return;
  }

  if (!OWNER && ALLOWED_CHATS.size === 0) {
    console.log(`seen chat_id ${chatId} — add TELEGRAM_OWNER_CHAT_ID=${chatId} to .env.local`);
    await sendReply(
      chatId,
      `Chat ID is <code>${chatId}</code>. Add TELEGRAM_OWNER_CHAT_ID=${chatId} to .env.local, restart the bot, then ask me anything.`,
    );
    return;
  }

  // The owner is authorised in any chat (private or group); allowlisted chats too.
  if (!isOwner && !chatAllowed) {
    await sendReply(chatId, "Not authorized.");
    return;
  }

  // A lone "/" shows every power of the bot as a list to pick from.
  if (text === "/" || text === "/commands" || text.startsWith("/start") || text.startsWith("/help")) {
    const isStart = text.startsWith("/start");
    await sendReply(
      chatId,
      isStart ? `${HELP}\n\n<b>Commandes</b>\n${commandsList()}` : `<b>Mes commandes</b>\n${commandsList()}`,
      { keyboard: KEYBOARD, replyTo: msg.message_id },
    );
    return;
  }

  if (text.startsWith("/reset")) {
    histories.delete(chatId);
    saveHistories();
    await sendReply(chatId, "Conversation cleared.");
    return;
  }

  // Turn a slash command into a concrete request for the assistant.
  const cmdMatch = text.match(/^\/([a-z0-9_]+)\s*([\s\S]*)$/);
  let question = "";
  if (cmdMatch) {
    const cmd = cmdMatch[1];
    const arg = cmdMatch[2].trim();
    if (cmd === "overview") question = "Give me a business overview";
    else if (cmd === "search")
      question = arg
        ? `Search the live web for: ${arg}. Cite the URLs you actually used.`
        : "Tell me what to search on the live web (usage: /search <query>).";
    else if (cmd === "add") question = arg ? `Add this: ${arg}` : "Ask me what to add.";
    else if (cmd === "edit") question = arg ? `Change this: ${arg}` : "Ask me which record to change.";
    else if (COMMAND_PROMPTS[cmd])
      question = arg ? `${COMMAND_PROMPTS[cmd]} Focus on: ${arg}` : COMMAND_PROMPTS[cmd];
    else {
      await sendReply(chatId, `Unknown command /${cmd}. Here is everything I can do:\n${commandsList()}`);
      return;
    }
  } else question = text.startsWith("/overview")
    ? "Give me a business overview"
    : (BOT_USERNAME ? text.replace(new RegExp(`@${BOT_USERNAME}\\b`, "gi"), "") : text).trim();

  // Typing indicator while the model works (refresh every 4s).
  let stopTyping = false;
  (async () => {
    while (!stopTyping) {
      tg("sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});
      await new Promise((r) => setTimeout(r, 4000));
    }
  })();

  try {
    const answer = await askAssistant(chatId, question);
    stopTyping = true;
    await sendReply(chatId, toTelegramHtml(answer), { replyTo: msg.message_id });
    console.log(`[${chatId}] replied, ${answer.length} chars`);
  } catch (err) {
    stopTyping = true;
    console.error(`[${chatId}] ${err.message}`);
    const quota = /429/.test(err.message);
    await sendReply(
      chatId,
      quota
        ? "⚠️ The AI has used up its free daily quota. It resets around midnight Pacific time — or enable billing on the Google AI Studio key for unlimited use."
        : "Sorry, something went wrong. Try again in a moment.",
    ).catch(() => {});
  }
}

const me = await tg("getMe").catch(() => null);
const BOT_USERNAME = String(me?.username ?? "").toLowerCase();

// Register the menu so typing "/" in Telegram lists every command.
try {
  await tg("setMyCommands", { commands: COMMANDS });
  console.log(`registered ${COMMANDS.length} commands (type / in Telegram to see them)`);
} catch (err) {
  console.error(`could not register commands: ${err.message}`);
}

// Bot profile text shown before the first message.
try {
  await tg("setMyShortDescription", {
    short_description: "Assistant My Business OS : business, ventes, tâches. Écris / pour voir mes commandes.",
  });
  await tg("setMyDescription", {
    description:
      "Assistant de ton dashboard My Business OS. Pose une question en français, ou utilise /overview, /tasks, /projects, /search…",
  });
} catch (err) {
  console.error(`could not update the bot description: ${err.message}`);
}

console.log(
  `Telegram bot starting as @${me?.username ?? "?"} (owner lock: ${OWNER ? "on" : "OFF — first chat gets its chat_id"}). Press Ctrl+C to stop.`,
);
console.log(
  `groups: ${ALLOWED_CHATS.size ? `chatting freely in ${[...ALLOWED_CHATS].join(", ")}` : "no allowlisted chats"}; other groups need a /command or @${BOT_USERNAME || "bot"} mention. Messages from other bots are ignored.`,
);

let offset = 0;
let delay = 1000;
while (true) {
  try {
    const updates = await tg("getUpdates", { offset, timeout: 30 });
    delay = 1000;
    for (const update of updates) {
      offset = update.update_id + 1;
      const msg = update.message ?? update.channel_post;
      if (msg?.text) await handleMessage(msg);
    }
  } catch (err) {
    console.error(`poll error: ${err.message} (retrying in ${delay}ms)`);
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 2, 30000);
  }
}
