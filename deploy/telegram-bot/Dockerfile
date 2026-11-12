# Telegram bot container. Build from the repository root:
#   docker build -f deploy/telegram-bot/Dockerfile -t my-business-os-bot .
FROM oven/bun:1

WORKDIR /app

# The bot imports the AI stack from src/lib/ai, so it needs the repo deps.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY scripts ./scripts
COPY src ./src

# Secrets arrive as environment variables (TELEGRAM_BOT_TOKEN, TELEGRAM_OWNER_CHAT_ID,
# AI + Supabase keys). Never bake them into the image.
CMD ["bun", "scripts/telegram-bot.mjs"]
