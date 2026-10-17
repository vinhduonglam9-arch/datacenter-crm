import os

lines = [
    "@echo off",
    "title DataCenter-CRM-Portable",
    "setlocal enabledelayedexpansion",
    "",
    'set "APP_DIR=%~dp0"',
    'cd /d "%APP_DIR%"',
    "",
    'set "NODE_EXE=%APP_DIR%bin\\node\\node.exe"',
    'if not exist "%NODE_EXE%" (',
    '    set "NODE_EXE=node"',
    ")",
    "",
    'set "PORT=3000"',
    'set "NODE_ENV=production"',
    "",
    "echo ========================================================",
    "echo   DataCenter CRM (Portable Offline CPU Edition)",
    "echo   OCR Engine: RapidOCR (ONNX Runtime CPU)",
    "echo   LLM Engine: Qwen2.5-1.5B (GGUF CPU)",
    "echo ========================================================",
    "echo.",
    'echo [*] Starting backend server on port 3000...',
    "",
    'start "" /b "%NODE_EXE%" "%APP_DIR%server.mjs"',
    "",
    "echo [*] Initializing services (waiting 2s)...",
    'ping 127.0.0.1 -n 3 >nul',
    "",
    "echo [*] Opening browser: http://localhost:3000",
    "start http://localhost:3000",
    "",
    "echo.",
    "echo [*] System running. Close this console window to exit.",
    "echo.",
    "pause >nul",
    ""
]

content = "\r\n".join(lines)

for filename in ["start.bat", "启动系统.bat"]:
    path = os.path.join("release", "data-center-crm-portable", filename)
    with open(path, "wb") as f:
        f.write(content.encode("gbk"))

print("Bat files updated cleanly.")
