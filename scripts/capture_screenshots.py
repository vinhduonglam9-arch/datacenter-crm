import os
import time
from playwright.sync_api import sync_playwright

output_dir = os.path.join(os.path.dirname(__file__), '..', 'docs', 'screenshots')
os.makedirs(output_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    # 高清分辨率 1600x960
    context = browser.new_context(viewport={'width': 1600, 'height': 960}, device_scale_factor=2)
    page = context.new_page()

    def capture(name, duration=1.0):
        time.sleep(duration)
        fp = os.path.join(output_dir, name)
        page.screenshot(path=fp)
        print(f"Captured: {name}")

    print("Navigating to http://localhost:3000/...")
    page.goto('http://localhost:3000/', wait_until='networkidle')
    time.sleep(2)

    # 1. 智算拓扑关系图谱 (主画布视图)
    capture('01-topology-canvas.png', 1)

    # 2. 项目总览仪表盘 (Dashboard)
    page.locator('button:has-text("项目总览")').first.click()
    capture('02-project-dashboard.png', 1)

    # 切回拓扑画布
    page.locator('button:has-text("拓扑画布")').first.click()
    time.sleep(1)

    # 3. 突破寻径 / BFS决策链路径分析
    page.locator('button:has-text("突破寻径")').first.click()
    capture('03-influence-path.png', 1)
    # 点击右上角关闭按钮
    page.locator('.fixed.inset-0.z-50 button:has(svg.lucide-x)').first.click()
    time.sleep(0.5)

    # 4. 本地离线 OCR 识别弹窗
    page.locator('button:has-text("名片OCR")').first.click()
    capture('04-ocr-recognition.png', 1)
    # 关闭弹窗
    close_btn = page.locator('.fixed.inset-0.z-50 button:has(svg.lucide-x), .fixed.inset-0.z-50 button:has-text("取消")').first
    if close_btn.count() > 0:
        close_btn.click()
    else:
        page.keyboard.press("Escape")
    time.sleep(0.5)

    # 5. 样式中心 (20x20x20 预设与自定义视觉系统)
    page.locator('button:has-text("样式中心")').first.click()
    capture('05-style-center.png', 1)
    close_btn = page.locator('.fixed.inset-0.z-50 button:has(svg.lucide-x), .fixed.inset-0.z-50 button:has-text("完成"), .fixed.inset-0.z-50 button:has-text("关闭")').first
    if close_btn.count() > 0:
        close_btn.click()
    else:
        page.keyboard.press("Escape")
    time.sleep(0.5)

    # 6. 图层管理器 (展开要素分层层级面板)
    page.locator('button:has-text("图层管理")').first.click()
    capture('06-layer-management.png', 1)

    # 7. 高清导出与数据中心战报生成
    page.locator('button:has-text("高清导出")').first.click()
    capture('07-export-center.png', 1)

    browser.close()
    print("All screenshots generated successfully in docs/screenshots/")
