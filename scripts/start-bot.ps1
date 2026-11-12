# Keeps the Telegram bot running: starts it, restarts it if it exits.
# Run it from the Startup folder (see deploy/telegram-bot/README.md) so the bot
# comes back after a reboot. Stop it with: Stop-Process -Id (Get-Content .telegram-bot.pid)
$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$log = Join-Path $root ".telegram-bot.log"
$pidFile = Join-Path $root ".telegram-bot.pid"

Set-Content -Path $pidFile -Value $PID

while ($true) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') starting bot (supervisor pid $PID)" |
        Out-File -FilePath $log -Append -Encoding utf8

    # Blocking: returns only when the bot crashes or is stopped.
    cmd /c "bun run scripts/telegram-bot.mjs >> `"$log`" 2>&1"

    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') bot exited, restarting in 10s" |
        Out-File -FilePath $log -Append -Encoding utf8
    Start-Sleep -Seconds 10
}
