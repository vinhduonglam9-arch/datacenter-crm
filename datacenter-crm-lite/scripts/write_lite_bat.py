import os

lines = [
    "@echo off",
    "title DataCenter-CRM-Lite-Portable",
    "setlocal enabledelayedexpansion",
    "",
    'set "APP_DIR=%~dp0"',
    'cd /d "%APP_DIR%"',
    "",
    "echo ========================================================",
    "echo   DataCenter CRM Lite (Portable Edition)",
    "echo   Fast, Lightweight, Pure Topology & Project Management",
    "echo ========================================================",
    "echo.",
    "echo [*] Starting DataCenter CRM Lite Desktop...",
    "",
    'start "" "%APP_DIR%数据中心CRM精简版.exe"',
    ""
]

content = "\r\n".join(lines)
for fname in ["start.bat", "启动系统.bat"]:
    path = os.path.join("datacenter-crm-lite", "release", "data-center-crm-lite-portable", fname)
    with open(path, "wb") as f:
        f.write(content.encode("gbk"))

print("Launchers successfully written.")
