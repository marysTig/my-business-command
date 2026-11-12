@echo off
rem Starts the Telegram bot in the background (no console window stays open).
rem Put a shortcut to this file in the Startup folder to run it at login:
rem   Win+R -> shell:startup
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0start-bot.ps1"
