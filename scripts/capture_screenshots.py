# -*- coding: utf-8 -*-
import os
import sys
import time
from playwright.sync_api import sync_playwright

output_dir = os.path.join(os.path.dirname(__file__), '..', 'docs', 'screenshots')
os.makedirs(output_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    # 高清视口 1600x960, scale=2
    context = browser.new_context(viewport={'width': 1600, 'height': 960}, device_scale_factor=2)
    page = context.new_page()

    def capture(name, duration=1.2):
        time.sleep(duration)
        fp = os.path.join(output_dir, name)
        page.screenshot(path=fp)
        sys.stdout.buffer.write(f"Captured: {name}\n".encode('utf-8'))

    sys.stdout.buffer.write(b"Navigating to http://127.0.0.1:3000/...\n")
    page.goto('http://127.0.0.1:3000/', wait_until='networkidle')
    time.sleep(2)

    # 1. 智算拓扑关系图谱 (主画布视图)
    capture('01-topology-canvas.png', 1)

    # 2. 项目总览仪表盘
    page.locator('button[aria-label="项目总览"]').first.click()
    capture('02-project-dashboard.png', 1.5)

    # 切回拓扑画布
    page.locator('button[aria-label="拓扑画布"]').first.click()
    time.sleep(1)

    # 3. 历史快照对比抽屉
    page.locator('button[aria-label="历史快照对比"]').first.click()
    capture('03-influence-path.png', 1.5)
    # 点击抽屉内部的关闭按钮 (svg.lucide-x)
    page.locator('.fixed.inset-0 button:has(svg.lucide-x)').first.click()
    time.sleep(0.8)

    # 4. 本地离线 OCR 识别弹窗
    page.locator('button[aria-label="名片OCR"]').first.click()
    capture('04-ocr-recognition.png', 1.5)
    # 关闭弹窗
    page.locator('.fixed.inset-0 button:has(svg.lucide-x)').first.click()
    time.sleep(0.8)

    # 5. 样式中心
    page.locator('button[aria-label="样式中心"]').first.click()
    capture('05-style-center.png', 1.5)
    # 关闭弹窗
    page.locator('.fixed.inset-0 button:has(svg.lucide-x)').first.click()
    time.sleep(0.8)

    # 6. 图层管理器
    page.locator('button[aria-label="图层管理"]').first.click()
    capture('06-layer-management.png', 1.5)
    # 点击关闭或再次点击切换
    page.locator('button[aria-label="图层管理"]').first.click()
    time.sleep(0.8)

    # 7. 导出中心
    page.locator('button[aria-label="导出与备份"]').first.click()
    time.sleep(0.5)
    # 点击弹出菜单的第一项打开导出中心模态框
    page.locator('div.absolute.right-0 button').first.click()
    capture('07-export-center.png', 1.5)

    browser.close()
    sys.stdout.buffer.write(b"All 7 screenshots generated successfully in docs/screenshots/\n")
