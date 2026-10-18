# 智算/数据中心大客户攻关作战地图 —— 下一步演进实施计划 (`next-step.md`)

## 一、 总体演进目标

在当前已完成**拓扑可视化、连线几何避障、白板手绘批注、战术便签、跨类型智能对齐与磁吸、自定义样式中心、多格式高清导出**的基础上，将系统进一步升级为**「兼具政企攻关方法论深度、图算法智能决策、会议路演级交互、以及高帧率模块化架构」**的企业级大客户作战指挥平台（Enterprise Account War-Room & Stakeholder Intelligence Platform）。

---

## 二、 三大核心模块详细技术方案

### 模块一：业务与政企攻关深度（从「画图工具」升级为「攻关参谋」）

#### 1. 攻关突破路径计算（Shortest Influence Path / 最短影响链寻路）
- **业务场景**：当客户高层（如集团董事长/分管副总）态度为「中立/未知/反对」，而我方仅与部分中层或外部顾问建立「铁杆支持」关系时，自动计算并高亮**最优渗透传导路径**。
- **算法与数据结构设计**：
  - 在 `src/utils/graph-algorithms.ts` 中新增 `findOptimalInfluencePaths(people, relationships, targetPersonId, maxPaths = 3)`。
  - **节点初始得分映射**：根据我方已掌握干系人的支持度（`attitude`）与接触频次设定起点集合（如 `Strong Supporter` 权重系数 `1.0`，`Supporter` 权重系数 `0.75`）。
  - **有向/无向混合边阻尼权重计算**：
    - 综合计算 `calculateRelationshipStrength(rel)`（结合紧密程度 `closeness`、证据链数量、共同标签等）作为边传导率 $P(u \to v) \in (0, 1]$。
    - 使用改进型 **Dijkstra / Yen's K-Shortest Paths 算法**（对传导概率取负对数 $-\ln(P)$ 作为路径阻抗），求得从任一「我方铁杆/支持者」到达「目标核心决策人」阻抗最小的前 $K$ 条路径。
- **UI 交互与画布渲染**：
  - 在人物详情抽屉（`PersonDetailPanel`）和右键菜单中增加 **「⚡ 计算攻关突破路径」** 按钮。
  - 激活后，画布进入「突破路径聚焦态」：非路径节点与连线自动降低透明度至 `20%`，最优路径上的连线呈现**动态流光脉冲动画（SVG `stroke-dasharray` + 关键帧流动）**，并在画布顶部浮动条展示路径评分对比（如：`路径 A：赵工(铁杆) → 孙处长(老乡/前同事) → 李总(最终决策人) | 综合渗透胜率 84%`）。

#### 2. 权力-态度四象限矩阵视图（Power vs. Attitude 2x2 Matrix View）
- **业务场景**：一键在「自由拓扑画布」与「战略四象限分析矩阵」之间平滑切换，直观识别高影响力反对者（重点防雷区）与高影响力支持者（核心基本盘）。
- **坐标映射与交互设计**：
  - 新增组件 `src/components/MatrixAnalysisModal.tsx`（或画布内嵌切换模式 `viewMode: 'topology' | 'matrix'`）。
  - **X 轴（对我方态度 Attitude）**：坚决反对（`-2`）→ 存疑（`-1`）→ 中立/未知（`0`）→ 支持（`+1`）→ 铁杆支持（`+2`）。
  - **Y 轴（决策影响力 Influence / Role Weight）**：综合人物职级层级（`level`）、决策角色（最终决策人 `Decision Maker` / 技术把关 `Gatekeeper` / 关键影响人 `Influencer` / 内线 `Coach`）与中心度得分（`0 ~ 100`）。
  - **四大战术象限分区**：
    1. **右上象限（高权 + 支持）**：「核心赢单引擎」—— 重点赋能、提供汇报弹药。
    2. **左上象限（高权 + 反对/中立）**：「关键攻坚/防雷区」—— 急需寻找迂回影响链或高层公关。
    3. **右下象限（低权 + 支持）**：「内线情报源」—— 发展为高频信息传感器。
    4. **左下象限（低权 + 反对/中立）**：「低优观察区」—— 保持常规覆盖，避免消耗过多资源。
  - **双向拖拽赋权**：支持在四象限中直接拖动人物头像卡片，松手后自动反写人物的 `attitude` 与影响力权重字段。

#### 3. 时间轴与版本快照对比（Timeline & Snapshot Diff）
- **业务场景**：大客户攻关周期长达 3~12 个月，复盘与周会汇报时需直观回答「相比上个月，哪些关键人态度发生了转变？新增了哪些关键连线？」。
- **数据结构扩展（`src/types.ts`）**：
  ```ts
  export interface ProjectSnapshot {
    id: string;
    projectId: string;
    title: string;           // 如："一阶段立项前摸底"、"招投标前夕定盘"
    createdAt: string;
    note?: string;
    people: Person[];
    relationships: Relationship[];
    frames: FactionFrame[];
    annotations: CanvasAnnotation[];
  }
  ```
- **核心功能实现**：
  - 在 `src/utils/snapshot-diff.ts` 中实现 `computeSnapshotDiff(baseSnapshot, currentGraph)`：
    - 识别 **新增人物**（绿色光环标记）、**移除人物**（虚线残影）、**态度正向跃迁**（如 `中立 → 支持`，显示绿色上升徽章 `↑`）、**态度恶化预警**（如 `支持 → 存疑`，显示红色警示徽章 `↓`）、以及 **新增/断裂关系连线**。
  - 顶部主栏新增 **「⏱ 历史快照与演进对比」** 抽屉，支持一键打快照、时光机滑块回放、以及「对比模式」高亮增量变化。

---

### 模块二：画布与批注交互体验（更顺畅的会议演示与推演）

#### 1. 几何形状与文本框双击「原地内联编辑（In-place WYSIWYG Editing）」
- **痛点解决**：移除双击几何形状/文本框时弹出的全屏模态遮罩框，改为与 Miro / Figma 一致的**画布原地光标输入**。
- **实现细节**：
  - 在 `Canvas.tsx` 中新增状态 `editingAnnotationId: string | null`。
  - 双击形状（`shape`）或文本框（`text`）或便签（`sticky`）时，直接在该元素的画布世界坐标框内挂载自适应 `<textarea>`，字体大小、字重、颜色、对齐方式与原元素 `1:1` 完全一致。
  - **键盘交互**：
    - 直接打字并随框体宽度自动折行；
    - 按 `Shift + Enter` 或 `Enter` 自由换行；
    - 点击画布空白处或按 `Esc` 键立即保存并退出编辑态，同时写入撤销历史栈（Undo History）。

#### 2. 演示与汇报聚焦模式（Presentation & Spotlight Mode）
- **业务场景**：投委会/周会投屏汇报时，屏蔽一切编辑态干扰，按预设战术镜头一键巡航讲解。
- **实现细节**：
  - **纯净全屏态**：点击右上角「🎬 路演汇报」进入演示模式，自动收起左侧名册栏、顶部编辑工具栏、网格控制点，仅保留底部极简演示控制条。
  - **镜头书签巡航（Camera Bookmarks）**：
    - 自动将画布中的「阵营分组框（`FactionFrame`）」及用户自定义的「视角书签」生成底部分步导航胶囊（如：`1. 全局总览` → `2. 集团高管决策层` → `3. 智算技术评审组` → `4. 商务采购风控线`）。
    - 支持键盘 `←` / `→` 方向键或空格键触发**平滑阻尼镜头平移与缩放动画（Smooth Viewport Interpolation）**，自动聚焦到对应阵营并居中放大。
  - **激光笔与聚光灯（Laser Pointer & Spotlight）**：
    - 演示控制条内置**「红色激光笔」**（鼠标拖动留下 1.2 秒自动渐隐的高亮尾迹，不污染画布数据）与**「节点聚光灯」**（点击任一人物卡片，立即高亮其一跳/二跳关系网，其余节点暗化）。

#### 3. 组与层级锁定（Group & Lock 机制）
- **数据结构扩展**：
  - 在 `Person`、`FactionFrame`、`CanvasAnnotation` 接口中统一新增可选字段：
    - `locked?: boolean`（锁定坐标、尺寸与删除权限）；
    - `groupId?: string`（多元素逻辑编组 ID）。
- **交互设计**：
  - **锁定/解锁（`Ctrl/Cmd + L`）**：对排好版的底层阵营框、背景大泳道或固定图例一键上锁；锁定后的元素在框选拖拽时自动忽略，鼠标悬停右上角显示微型锁头图标，点击可单独解锁。
  - **组合/解组（`Ctrl/Cmd + G` / `Ctrl/Cmd + Shift + G`）**：多选任意跨类型元素后点击顶部浮动栏「编组」按钮，后续点击组内任一元素即可整体选中并同步拖拽。

---

### 模块三：工程架构与性能优化（`Canvas.tsx` 模块化重构与渲染加速）

#### 1. `Canvas.tsx` 职责解耦与子组件拆分
目前 `src/components/Canvas.tsx` 已超过 7,000 行，包含状态管理、手势交互、工具栏、属性栏、SVG 图层与右键菜单。计划按职责拆分为高内聚模块：

| 目标文件路径 | 核心职责说明 |
| :--- | :--- |
| `src/components/canvas/CanvasFloatingToolbar.tsx` | 主画布自适应横/竖排浮动工具栏（选择、抓手、连线、形状下拉菜单、文本、便签、马克笔、对齐、撤销重做等） |
| `src/components/canvas/CanvasPropertyBar.tsx` | 顶部选中态上下文属性栏（几何形状样式、文本字号排版、便签配色、多选批量对齐与等距分布栏） |
| `src/components/canvas/CanvasContextMenu.tsx` | 画布节点、连线、阵营框、批注及多选状态的右键快捷菜单 |
| `src/components/canvas/SmartGuidesLayer.tsx` | 拖拽与缩放时的智能对齐参考线（洋红中心线、科技蓝边缘线、十字捕捉锚点与间距标注） |
| `src/components/canvas/PresentationHud.tsx` | 路演汇报模式的底部镜头书签巡航条、激光笔图层与聚光灯控制器 |
| `src/components/canvas/InlineAnnotationEditor.tsx` | 几何形状、文本框、作战便签的原地双击内联编辑器 |

#### 2. 大规模画布渲染帧率优化
- **React.memo 与细粒度重绘隔离**：对人物节点卡片、SVG 关系连线（`RelationshipEdge`）及几何批注组件封装精细化比较函数，确保拖动单个节点时仅重算关联连线，避免全图重绘。
- **空间索引加速碰撞与对齐检测**：在 `computeSmartSnapGuides` 与正交连线避障中引入轻量级包围盒网格过滤，在节点数 > 100 时依然保持 `60fps` 丝滑拖拽。

---

## 三、 分阶段实施路线图（Implementation Phases）

### 第一阶段：交互质感与工程解耦（Phase 1）
1. **原地内联文本编辑（In-place Editing）**：重构双击形状、文本框与便签的文字输入体验，移除弹窗遮罩，支持原地实时输入与 `Shift+Enter` 换行。
2. **元素锁定与编组（Lock & Group）**：支持画布任意元素一键锁定防误触、多元素组合同步移动，并在右键菜单与顶部浮动栏集成图标入口。
3. **`Canvas.tsx` 核心子组件拆分**：抽离 `SmartGuidesLayer`、`CanvasContextMenu`、`InlineAnnotationEditor` 等独立模块，降低主文件复杂度。

### 第二阶段：政企攻关参谋引擎（Phase 2）
1. **攻关突破路径计算器（Shortest Influence Path）**：完成图算法寻路与动态流光路径高亮面板。
2. **权力-态度四象限分析视图（2x2 Matrix View）**：实现拓扑视图与四象限战略分析矩阵的一键切换及拖拽改写属性。
3. **历史快照与演进对比（Snapshot Diff）**：实现关键攻关节点快照保存、对比高亮（新增人物、态度转变徽章、新增连线）。

### 第三阶段：会议路演与大规模画布性能加速（Phase 3）
1. **路演汇报聚焦模式（Presentation & Spotlight Mode）**：实现全屏纯净演示、阵营镜头平滑巡航、激光笔轨迹与一跳关系聚光灯。
2. **全量组件解耦与空间索引加速**：完成 `CanvasFloatingToolbar`、`CanvasPropertyBar`、`PresentationHud` 独立封装，以及大规模节点 `React.memo` 重绘隔离与空间索引碰撞优化。

---

## 四、 验收标准（Acceptance Criteria）

1. **全功能零破坏性升级**：现有项目存档（`localStorage` 及 `.json` 导出文件）100% 向后兼容，新增字段均具备安全默认值。
2. **极简图标化视觉统一**：所有新增功能入口遵循现有高密度图标化 + 悬停 Tooltip 规范，不造成工具栏臃肿。
3. **构建与类型安全**：通过 `npm run lint`（`tsc --noEmit`）零错误校验与 `npm run build` 生产环境打包验证。
