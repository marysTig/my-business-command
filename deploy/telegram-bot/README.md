# Hosting the Telegram bot

The bot (`scripts/telegram-bot.mjs`) is a long-polling process: it holds a
connection to Telegram and answers for as long as it runs. The Freebuff site is a
request/response Worker, so it **cannot** host it — the bot has to live on a
machine that stays on.

Everything it needs is already in this folder.

## 1. What it needs

| Variable | Required | Purpose |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | yes | Token from @BotFather |
| `TELEGRAM_OWNER_CHAT_ID` | yes (after first run) | Your chat id — the bot refuses data questions without it |
| `TELEGRAM_ALLOWED_CHATS` | no | Extra chat/group ids allowed to use it |
| `ZAI_API_KEY` (`ZAI_API_KEY_2`) | yes | The AI model that answers |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | yes | Data the bot reads and writes |

Keep them in `.env.local` on the host (or in the host's secret store). The
script reads `.env.local` / `.env` next to the project, then falls back to the
process environment.

## 2. First run, anywhere

```bash
bun run scripts/telegram-bot.mjs --check   # prints the bot username and owner lock
bun run scripts/telegram-bot.mjs           # start polling
```

Message the bot once: it replies with your chat id. Put that id in
`TELEGRAM_OWNER_CHAT_ID`, restart, and it starts answering.

## 3. Docker (VPS, or any host running Docker)

```bash
docker compose -f deploy/telegram-bot/docker-compose.yml up -d --build
docker compose -f deploy/telegram-bot/docker-compose.yml logs -f
```

`restart: unless-stopped` brings it back after a reboot or a crash.

## 4. systemd (VPS without Docker)

```bash
sudo useradd -r -m -d /opt/my-business-command bos
sudo rsync -a --exclude node_modules ./ /opt/my-business-command/
sudo -u bos bash -c 'cd /opt/my-business-command && bun install'
sudo cp deploy/telegram-bot/telegram-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now telegram-bot
journalctl -u telegram-bot -f
```

## 5. Managed platforms

Any host that runs a container or a Node/Bun process works: Railway, Fly.io,
Render, a small Hetzner/DigitalOcean VPS.

- **Railway / Render**: new service from this repo, start command
  `bun run scripts/telegram-bot.mjs`, add the variables above in the dashboard.
- **Fly.io**: `fly launch --dockerfile deploy/telegram-bot/Dockerfile`, then
  `fly secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_OWNER_CHAT_ID=...` and
  `fly deploy`. Do not expose a port; the bot only calls out.

## 6. Sanity checks

```bash
bun run scripts/telegram-bot.mjs --check     # token valid, owner lock state
curl -s -H "Authorization: Bearer $DASHBOARD_API_KEY" \
  https://site-e42bb61bef6248459e7b4797d3fd7e49.freebuff.page/api/health
```

Logs print one line per message (`[chat] replied, N chars`); a `poll error`
line means the network or the token is wrong, and the process backs off
automatically.

## Never

- commit `.env.local` or paste the token/key into a chat or a config file;
- run two copies of the bot with the same token — `getUpdates` offsets collide
  and messages get lost. Keep one instance.
