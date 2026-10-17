# 数据中心项目客户关系管理系统 (DataCenter CRM)

[![Release](https://img.shields.io/badge/Release-v2.0-blue.svg)](https://github.com/vinhduonglam9-arch/datacenter-crm/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-brightgreen.svg)](https://github.com/vinhduonglam9-arch/datacenter-crm)
[![License](https://img.shields.io/badge/License-Private-orange.svg)](LICENSE)

面向数据中心（AIDC/IDC）智算基建、机电总包、暖通液冷与供配电业务的大型复杂项目客户关系管理（CRM）平台。集成 **100% 本地 CPU 离线运行的多模态名片 OCR** 与 **Qwen2.5 结构化语义抽取大模型**，提供可视化的多维度关系拓扑图谱、铁三角决策链分析、拜访跟进时间线及专业图表导出。

---

## 📸 系统界面全景预览

### 1. 智算项目客户关系拓扑画布 (核心主视图)
支持拖拽、连线、关系温度标记、分组框以及铁三角拍板人/把关人动态定位。
![智算拓扑关系图谱](docs/screenshots/01-topology-canvas.png)

### 2. 算力中心工程作战大屏 (Project Dashboard)
宏观掌控在建算力 MW 总负荷、各标段关键决策链覆盖度、支持率雷达及拜访跟进。
![项目总览仪表盘](docs/screenshots/02-project-dashboard.png)

### 3. 最短高层突破路径寻径 (BFS 决策链穿透)
自动计算从我方负责人触达甲方核心决策拍板人的最短信任推荐路径。
![突破寻径分析](docs/screenshots/03-influence-path.png)

### 4. 100% 本地 CPU 离线名片 OCR 与结构化提取
无需外网及 GPU，支持模糊拍照名片本地自动纠错与结构化解析，一键入库。
![本地离线 OCR 识别](docs/screenshots/04-ocr-recognition.png)

### 5. 画布视觉样式中心 (20×20×20 定制系统)
内置行业主流深浅工程主题、多种节点与连接线材质，适配多样化汇报场景。
![样式中心](docs/screenshots/05-style-center.png)

### 6. 图层分级管理器
支持对干系人、组织分组框、关系网进行独立锁定、隐藏与上下层级拖拽调序。
![图层管理器](docs/screenshots/06-layer-management.png)

### 7. 高清战报与工业级图纸导出中心
提供 1:1 所见即所得的高清 PNG、矢量 SVG、投委会报告 PDF 与 Excel 台账数据导出。
![导出中心](docs/screenshots/07-export-center.png)

---

## 🌟 核心特性

### 1. 100% 本地 CPU 离线名片 OCR 与大模型抽取
- **零显卡要求，笔记本 CPU 顺畅运行**：采用轻量级 `RapidOCR`（ONNXRuntime CPU 算子）配合量化模型 `Qwen2.5-1.5B-Instruct-GGUF`。
- **两阶段流水线架构**：
  - **阶段 1 (字形识别)**：200~400ms 内快速完成名片文字检测、分类定位与识别，解决模糊与低像素问题。
  - **阶段 2 (智能结构化)**：自动纠正识别错误，提取姓名、头衔、公司机构、手机号码、邮箱、核心关注点与标签，返回标准格式。
- **多编码自适应解码**：内置 UTF-8 与 Windows 原生 GBK/CP936 智能容错探测，彻底解决中文乱码。

### 2. 算力中心项目全生命周期与铁三角决策链拓扑
- **项目参数画像**：支持算力规模（MW / 机柜数）、设计 PUE 指标、等级标准（国标 A 级 / Tier III+）、制冷架构（冷板式液冷 / 氟泵自然冷）、标段预算及中标把握度。
- **可视化拓扑画布**：
  - 支持拖拽、连线、锚点连接、分组框（GroupFrame）、层级对齐（Faction / Hierarchy Layout）。
  - 人物关系温度与阶段跟踪：标段拍板人、技术把关人、商务负责人、品牌倾向与反感度。
  - 决策链与影响力路径计算（Influence Path）。

### 3. 多维度拜访记录与时间线抽屉
- 记录客户现场拜访、高层技术闭门会、联合勘验、商务宴请等多场景互动。
- 联动项目卡片自动更新推进阶段。

### 4. 样式中心与专业汇报导出
- 内置 10+ 预设设计主题（深色工程蓝、极简工科灰、科技暗黑等）。
- 支持高质量导出为 **PNG 高清拓扑大图、SVG 矢量图、PDF 工程文档及关系 CSV 数据**。

---

## 📦 桌面端下载与分发方式

本系统已提供两种面向 Windows 用户的交付形态（均包含完整的离线推理模型与运行环境，**无需目标电脑安装 Node.js、Python、CUDA 或任何依赖**）：

### 1. 完整版 (Standard Edition - 含本地离线 OCR 与 Qwen2.5 大模型)
- **Windows 安装包**：`DataCenter-CRM-2.0.0-Setup.exe` (约 1.45 GB)
- **绿色免安装便携版**：`DataCenter-CRM-Portable-v2.0.zip` (约 1.41 GB)
- **特点**：全功能开箱即用，自带 RapidOCR 与 Qwen2.5-1.5B GGUF 离线权重。

### 2. 精简版 (Lite Edition - 去除 OCR 与 AI 模型，超小体积)
- **Windows 安装包**：`DataCenter-CRM-Lite-2.0.0-Setup.exe` (约 154 MB，体积缩小 90%)
- **绿色免安装便携版**：`DataCenter-CRM-Lite-Portable-v2.0.zip` (约 224 MB，体积缩小 85%)
- **特点**：完全移除 OCR 引擎和庞大权重包，极速下载；解压后直接双击根目录 `数据中心CRM精简版.exe` 即可启动原生桌面客户端（无需任何 .bat 脚本）。保留所有算力看板、拓扑画布、突破寻径、样式中心与高清导出功能。

---

## 🛠️ 本地开发与二次构建

### 运行环境要求
- Node.js >= 18
- pnpm >= 9
- Python 3.10+ (仅在本地开发二次训练/扩展 OCR 脚本时需要；打包后脱离 Python)

### 1. 安装项目依赖
```bash
pnpm install
```

### 2. 开发模式运行
```bash
pnpm run dev
```
启动后访问 `http://localhost:3000`。

### 3. 生产静态资源与后端编译
```bash
# 构建前端 dist 静态文件
pnpm run build

# 编译后端单文件 ESM 路由
pnpm run bundle:server
```

### 4. 构建 Electron 桌面客户端与安装包
```bash
# 生成 Windows NSIS 安装包 (输出至 installer-dist/)
pnpm run pack:installer

# 生成免安装解包目录 (输出至 installer-dist/win-unpacked/)
pnpm run pack:dir
```

---

## 📁 目录架构说明

```
├── build/                 # NSIS 定制安装脚本 (installer.nsh) 与 Windows 图标
├── desktop/               # Electron 桌面主进程入口 (main.cjs)
├── dist/                  # 前端 Vite + React 生产静态构建产物
├── models/                # 本地离线 AI 模型权重文件 (已忽略入库，分发包自带)
│   ├── ocr/               # RapidOCR ONNX 算子 (det, rec, cls)
│   └── llm/               # Qwen2.5-1.5B-Instruct Q4_K_M GGUF
├── bin/                   # 独立免安装底层执行体 (已忽略入库，分发包自带)
│   ├── llama/             # llama-server.exe (CPU AVX2 推理引擎)
│   ├── ocr/               # ocr_service.exe (独立 OCR 推理体)
│   └── node/              # 便携式 node.exe
├── scripts/               # 离线推理辅助脚本与测试套件
├── src/                   # CRM 前端工程源码
│   ├── components/        # 画布、拓扑、OCR 识别弹窗、项目看板组件
│   ├── types/             # CRM 业务对象、项目、人物、拓扑类型定义
│   └── utils/             # 拓扑排版算法、导出器、本地缓存管理器
├── server.ts              # 核心服务端 (OCR 两阶段流水线调度 + 静态托管)
└── package.json           # 项目元配置与 electron-builder 构建规则
```

---

## 🔒 隐私与离线声明
- 本系统在默认配置下名片识别与文本解析 **100% 在本地 CPU 进行计算**，不会向任何公网服务器上传名片图像或客户隐私数据。
- 可选配置：若需使用云端大模型，可在环境配置中填入 `GEMINI_API_KEY`，服务端会自动将其作为后备通道。
