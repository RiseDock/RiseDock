@echo off
cd /d D:\AI_WorkDir\WorkBuddy\risedock
call "C:\Program Files\nodejs\npm.cmd" install
call node_modules\.bin\tauri.cmd build
pause
