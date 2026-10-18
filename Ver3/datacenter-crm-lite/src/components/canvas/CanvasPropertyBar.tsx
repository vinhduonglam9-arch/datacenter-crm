import React from 'react';
import {
  Link2,
  Lasso,
  Frame,
  Scissors,
  PenTool,
  Highlighter,
  Zap,
  Palette,
  Minus,
  MoveRight,
  MoveHorizontal,
  Wand2,
  Shapes,
  Type,
  StickyNote,
  Eraser,
  AlignLeft,
  AlignCenterHorizontal,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Columns,
  Rows,
  ArrowUpToLine,
  ArrowUp,
  ArrowDown,
  ArrowDownToLine,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Group,
  Ungroup,
} from 'lucide-react';
import {
  Person,
  CanvasAnnotation,
  CanvasToolMode,
  SmartShapeType,
  COMMON_SHAPE_ITEMS,
  TacticalStampType,
  TACTICAL_STAMPS,
  LayerAction,
  CARD_COLORS,
} from '../../types/crm.ts';
import { AlignmentType } from '../../utils/graph-algorithms.ts';
import { ToolbarPosition } from '../../utils/storage.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  PEN_TACTICAL_COLORS,
  EXTENDED_COLOR_PALETTE,
  STICKY_BG_PALETTE,
  PEN_STROKE_WIDTHS,
} from './canvas-constants.ts';

interface CanvasPropertyBarProps {
  toolMode: CanvasToolMode;
  setToolMode: (mode: CanvasToolMode) => void;
  connectModeSourceId: string | null;
  setConnectModeSourceId: (id: string | null) => void;
  peopleMap: Map<string, Person>;
  lassoSubMode: 'select' | 'frame' | 'knife';
  setLassoSubMode: (mode: 'select' | 'frame' | 'knife') => void;
  penColor: string;
  setPenColor: (color: string) => void;
  penStrokeWidth: number;
  setPenStrokeWidth: (w: number) => void;
  penArrowMode: 'none' | 'forward' | 'both';
  setPenArrowMode: (mode: 'none' | 'forward' | 'both') => void;
  smartShapeEnabled: boolean;
  setSmartShapeEnabled: (enabled: boolean) => void;
  showColorPalettePopover: 'pen' | 'sticky' | 'selection' | null;
  setShowColorPalettePopover: React.Dispatch<
    React.SetStateAction<'pen' | 'sticky' | 'selection' | null>
  >;
  toolbarPos: ToolbarPosition;
  activeShapeType: SmartShapeType;
  shapeBgColor: string;
  setShapeBgColor: (color: string) => void;
  shapeFontSize: number;
  setShapeFontSize: (fs: number) => void;
  stickyStamp: TacticalStampType;
  setStickyStamp: (stamp: TacticalStampType) => void;
  stickyStampLabel: string;
  setStickyStampLabel: (label: string) => void;
  stickyColor: string;
  setStickyColor: (color: string) => void;
  stickyBgColor: string;
  setStickyBgColor: (color: string) => void;
  stickyCalloutMode: 'none' | 'solid' | 'dashed';
  setStickyCalloutMode: (mode: 'none' | 'solid' | 'dashed') => void;
  totalSelectedCount: number;
  alignableSelectedCount: number;
  selectedPersonIds: string[];
  selectedFrameIds: string[];
  selectedAnnotationIds: string[];
  annotations: CanvasAnnotation[];
  onTriggerUnifiedAlign: (alignment: AlignmentType) => void;
  onGroupPeopleIntoFrame: (personIds: string[]) => void;
  onBatchMoveLayer: (
    personIds: string[],
    frameIds: string[],
    action: LayerAction,
    annotationIds?: string[]
  ) => void;
  onUpdateAnnotation?: (id: string, updates: Partial<CanvasAnnotation>) => void;
  onDeleteAnnotations?: (ids: string[]) => void;
  onClearSelectedAnnotations: () => void;
  onBatchUpdatePeople: (personIds: string[], updates: Partial<Person>) => void;
  onDuplicatePeople: (personIds: string[], offsetX?: number, offsetY?: number) => void;
  onBatchRemoveFromCanvas: (personIds: string[]) => void;
  onClearSelectedPeople: () => void;
  hasGroupedSelection?: boolean;
  hasLockedSelection?: boolean;
  onGroupSelectedElements?: () => void;
  onUngroupSelectedElements?: () => void;
  onToggleLockSelectedElements?: () => void;
}

export const CanvasPropertyBar: React.FC<CanvasPropertyBarProps> = React.memo(
  ({
    toolMode,
    setToolMode,
    connectModeSourceId,
    setConnectModeSourceId,
    peopleMap,
    lassoSubMode,
    setLassoSubMode,
    penColor,
    setPenColor,
    penStrokeWidth,
    setPenStrokeWidth,
    penArrowMode,
    setPenArrowMode,
    smartShapeEnabled,
    setSmartShapeEnabled,
    showColorPalettePopover,
    setShowColorPalettePopover,
    toolbarPos,
    activeShapeType,
    shapeBgColor,
    setShapeBgColor,
    shapeFontSize,
    setShapeFontSize,
    stickyStamp,
    setStickyStamp,
    stickyStampLabel,
    setStickyStampLabel,
    stickyColor,
    setStickyColor,
    stickyBgColor,
    setStickyBgColor,
    stickyCalloutMode,
    setStickyCalloutMode,
    totalSelectedCount,
    alignableSelectedCount,
    selectedPersonIds,
    selectedFrameIds,
    selectedAnnotationIds,
    annotations,
    onTriggerUnifiedAlign,
    onGroupPeopleIntoFrame,
    onBatchMoveLayer,
    onUpdateAnnotation,
    onDeleteAnnotations,
    onClearSelectedAnnotations,
    onBatchUpdatePeople,
    onDuplicatePeople,
    onBatchRemoveFromCanvas,
    onClearSelectedPeople,
    hasGroupedSelection = false,
    hasLockedSelection = false,
    onGroupSelectedElements,
    onUngroupSelectedElements,
    onToggleLockSelectedElements,
  }) => {
    const { language, t } = useLanguage();

    return (
      <>
        {toolMode === 'connect' && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white px-4 py-1.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Link2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>
              {connectModeSourceId
                ? t('bannerConnectSourceSelected', {
                    name: peopleMap.get(connectModeSourceId)?.name || '',
                  })
                : t('bannerConnectIdle')}
            </span>
            <button
              type="button"
              onClick={() => {
                setConnectModeSourceId(null);
                setToolMode('select');
              }}
              className="ml-2 bg-blue-700 hover:bg-blue-800 px-2 py-0.5 rounded text-[11px] cursor-pointer"
            >
              {t('exitEsc')}
            </button>
          </div>
        )}

        {toolMode === 'lasso' && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl px-3.5 py-1.5 flex items-center gap-2.5 text-xs text-slate-700"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5 text-indigo-600 font-bold">
              <Lasso className="w-4 h-4" strokeWidth={1.5} />
              <span>{language === 'zh' ? '自由套索与刀切 (L)' : 'Lasso & Knife (L)'}</span>
            </div>
            <div className="h-4 w-[1px] bg-slate-200" />
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              {[
                { key: 'select', label: language === 'zh' ? '圈选节点' : 'Select Nodes', icon: Lasso },
                { key: 'frame', label: language === 'zh' ? '套索直接建组' : 'Lasso to Frame', icon: Frame },
                { key: 'knife', label: language === 'zh' ? '划线切断连线 (Alt)' : 'Slice Links (Alt)', icon: Scissors },
              ].map((m) => {
                const MIcon = m.icon;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setLassoSubMode(m.key as 'select' | 'frame' | 'knife')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                      lassoSubMode === m.key
                        ? m.key === 'knife'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MIcon className="w-3 h-3" strokeWidth={1.5} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setToolMode('select')}
              className="ml-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium cursor-pointer"
            >
              {t('switchBackSelect')}
            </button>
          </div>
        )}

        {(toolMode === 'pen' || toolMode === 'highlighter' || toolMode === 'laser') && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl px-3.5 py-1.5 flex items-center gap-2.5 text-xs text-slate-700"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5 font-bold text-slate-900 whitespace-nowrap">
              {toolMode === 'pen' ? (
                <PenTool className="w-4 h-4 text-rose-600" strokeWidth={1.5} />
              ) : toolMode === 'highlighter' ? (
                <Highlighter className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
              ) : (
                <Zap className="w-4 h-4 text-red-600" strokeWidth={1.5} />
              )}
              <span>
                {toolMode === 'pen'
                  ? language === 'zh'
                    ? '自由画笔 (P)'
                    : 'Freehand Pen (P)'
                  : toolMode === 'highlighter'
                  ? language === 'zh'
                    ? '荧光马克笔 (G)'
                    : 'Highlighter (G)'
                  : language === 'zh'
                  ? '演示激光笔 (Z · 红点拖尾)'
                  : 'Laser Pointer (Z)'}
              </span>
            </div>

            {toolMode !== 'laser' && (
              <>
                <div className="h-4 w-[1px] bg-slate-200" />

                <div className="relative flex items-center gap-1.5">
                  {PEN_TACTICAL_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setPenColor(c.value)}
                      className={`w-4.5 h-4.5 rounded-full border transition-transform cursor-pointer ${
                        penColor.toLowerCase() === c.value.toLowerCase()
                          ? 'scale-125 ring-2 ring-blue-500 ring-offset-1 border-white'
                          : 'border-slate-200 hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setShowColorPalettePopover((prev) => (prev === 'pen' ? null : 'pen'))
                    }
                    className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      showColorPalettePopover === 'pen'
                        ? 'bg-blue-50 border-blue-400 text-blue-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title={
                      language === 'zh'
                        ? '展开全色域调色盘与自定义取色器'
                        : 'Open Color Palette & Custom Picker'
                    }
                  >
                    <Palette className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span
                      className="w-3 h-3 rounded-full border border-white shadow-2xs"
                      style={{ backgroundColor: penColor }}
                    />
                  </button>

                  <label
                    className="relative w-5 h-5 rounded-full overflow-hidden border border-slate-300 cursor-pointer shadow-2xs hover:scale-110 transition-transform flex items-center justify-center"
                    style={{
                      background:
                        'conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
                    }}
                    title={language === 'zh' ? '自定义无极取色' : 'Custom Color Picker'}
                  >
                    <input
                      type="color"
                      value={penColor}
                      onChange={(e) => setPenColor(e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                  </label>

                  {showColorPalettePopover === 'pen' && (
                    <div
                      className="absolute top-9 left-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 w-64"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-800">
                          {language === 'zh' ? '战术扩展色盘 (24色)' : 'Extended Color Palette'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          {penColor}
                        </span>
                      </div>
                      <div className="grid grid-cols-6 gap-1.5 mb-2.5">
                        {EXTENDED_COLOR_PALETTE.map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => {
                              setPenColor(hex);
                              setShowColorPalettePopover(null);
                            }}
                            className={`w-7 h-7 rounded-lg border transition-transform cursor-pointer ${
                              penColor.toLowerCase() === hex.toLowerCase()
                                ? 'scale-110 ring-2 ring-blue-600 border-white'
                                : 'border-slate-200/80 hover:scale-105'
                            }`}
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500">
                          {language === 'zh' ? '自定义颜色:' : 'Custom Hex:'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={penColor}
                            onChange={(e) => setPenColor(e.target.value)}
                            className="w-6 h-6 rounded border border-slate-200 cursor-pointer p-0 bg-transparent"
                          />
                          <input
                            type="text"
                            value={penColor}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                                setPenColor(val);
                              }
                            }}
                            className="w-20 px-1.5 py-0.5 text-[11px] font-mono border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-4 w-[1px] bg-slate-200" />

                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                  {PEN_STROKE_WIDTHS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setPenStrokeWidth(w)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                        penStrokeWidth === w
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {w}px
                    </button>
                  ))}
                </div>
              </>
            )}

            {toolMode === 'pen' && (
              <>
                <div className="h-4 w-[1px] bg-slate-200" />
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
                  {[
                    {
                      key: 'none' as const,
                      label: language === 'zh' ? '无箭头' : 'No Arrow',
                      icon: Minus,
                    },
                    {
                      key: 'forward' as const,
                      label: language === 'zh' ? '单箭头' : 'Single Arrow',
                      icon: MoveRight,
                    },
                    {
                      key: 'both' as const,
                      label: language === 'zh' ? '双箭头' : 'Double Arrow',
                      icon: MoveHorizontal,
                    },
                  ].map((arrOpt) => {
                    const ArrIcon = arrOpt.icon;
                    return (
                      <button
                        key={arrOpt.key}
                        type="button"
                        onClick={() => setPenArrowMode(arrOpt.key)}
                        className={`p-1.5 rounded transition-all cursor-pointer flex items-center justify-center ${
                          penArrowMode === arrOpt.key
                            ? 'bg-white text-blue-600 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title={arrOpt.label}
                        aria-label={arrOpt.label}
                      >
                        <ArrIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </button>
                    );
                  })}
                </div>

                <div className="h-4 w-[1px] bg-slate-200" />
                <button
                  type="button"
                  onClick={() => setSmartShapeEnabled(!smartShapeEnabled)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-center ${
                    smartShapeEnabled
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                  title={
                    language === 'zh'
                      ? '一笔成型：开启后手绘圆圈、矩形、直线与带勾箭头将自动规整为标准几何矢量图形'
                      : 'Smart Shape: Auto-convert freehand circles, rectangles, lines & arrows into crisp geometric shapes'
                  }
                  aria-label={language === 'zh' ? '一笔成型' : 'Smart Shape'}
                >
                  <Wand2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setToolMode('select')}
              className="ml-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium cursor-pointer whitespace-nowrap"
            >
              {t('switchBackSelect')}
            </button>
          </div>
        )}

        {(toolMode === 'shape' || toolMode === 'text') && (
          <div
            style={{
              top:
                toolbarPos.orientation === 'horizontal' && toolbarPos.y < 96
                  ? `${toolbarPos.y + 60}px`
                  : '16px',
              left:
                toolbarPos.orientation === 'vertical' && toolbarPos.x < 360
                  ? 'calc(50% + 90px)'
                  : '50%',
            }}
            className="absolute -translate-x-1/2 z-30 bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl px-3.5 py-1.5 flex items-center gap-2.5 text-xs text-slate-700 max-w-[90vw] whitespace-nowrap"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5 font-bold text-indigo-700 whitespace-nowrap">
              {toolMode === 'shape' ? (
                <Shapes className="w-4 h-4 text-indigo-600" strokeWidth={1.6} />
              ) : (
                <Type className="w-4 h-4 text-sky-600" strokeWidth={1.6} />
              )}
              <span>
                {toolMode === 'shape'
                  ? language === 'zh'
                    ? `几何形状 · ${
                        COMMON_SHAPE_ITEMS.find((s) => s.key === activeShapeType)?.labelZh || '矩形'
                      }`
                    : `Shape · ${
                        COMMON_SHAPE_ITEMS.find((s) => s.key === activeShapeType)?.labelEn || 'Rect'
                      }`
                  : language === 'zh'
                  ? '文本输入 (T · 点击画布直接输入)'
                  : 'Text Input (T · Click canvas to type)'}
              </span>
            </div>

            <div className="h-4 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500">
                {language === 'zh' ? '颜色:' : 'Color:'}
              </span>
              {PEN_TACTICAL_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setPenColor(c.value)}
                  className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                    penColor.toLowerCase() === c.value.toLowerCase()
                      ? 'scale-120 ring-2 ring-blue-500 border-white'
                      : 'border-slate-200 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
              <label
                className="relative w-4.5 h-4.5 rounded-full overflow-hidden border border-slate-300 cursor-pointer shadow-2xs"
                style={{ backgroundColor: penColor }}
                title={language === 'zh' ? '自定义颜色' : 'Custom Color'}
              >
                <input
                  type="color"
                  value={penColor}
                  onChange={(e) => setPenColor(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>

            <div className="h-4 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500">
                {language === 'zh' ? '填充:' : 'Fill:'}
              </span>
              <button
                type="button"
                onClick={() => setShapeBgColor('')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                  !shapeBgColor
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {language === 'zh' ? '半透默认' : 'Default'}
              </button>
              {STICKY_BG_PALETTE.slice(0, 5).map((bg) => (
                <button
                  key={bg.value}
                  type="button"
                  onClick={() => setShapeBgColor(bg.value)}
                  className={`w-4 h-4 rounded border transition-transform cursor-pointer ${
                    shapeBgColor.toLowerCase() === bg.value.toLowerCase()
                      ? 'scale-115 ring-2 ring-blue-500 border-blue-400'
                      : 'border-slate-300 hover:scale-110'
                  }`}
                  style={{ backgroundColor: bg.value }}
                  title={bg.name}
                />
              ))}
            </div>

            <div className="h-4 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              {[12, 14, 16, 20, 24].map((fs) => (
                <button
                  key={fs}
                  type="button"
                  onClick={() => setShapeFontSize(fs)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold cursor-pointer ${
                    shapeFontSize === fs
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {fs}px
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setToolMode('select')}
              className="ml-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium cursor-pointer whitespace-nowrap"
            >
              {t('switchBackSelect')}
            </button>
          </div>
        )}

        {toolMode === 'sticky' && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl px-3.5 py-1.5 flex items-center gap-2 text-xs text-slate-700 max-w-[95vw] flex-wrap"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5 font-bold text-emerald-700 whitespace-nowrap">
              <StickyNote className="w-4 h-4" strokeWidth={1.5} />
              <span>{language === 'zh' ? '作战便签 (N · 点击放置)' : 'Sticky Note (N)'}</span>
            </div>
            <div className="h-4 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              {TACTICAL_STAMPS.map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => {
                    setStickyStamp(st.key);
                    setStickyStampLabel(language === 'zh' ? st.labelZh : st.labelEn);
                    setStickyColor(st.color);
                    setStickyBgColor(st.bg);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                    stickyStamp === st.key &&
                    stickyStampLabel === (language === 'zh' ? st.labelZh : st.labelEn)
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {language === 'zh' ? st.labelZh : st.labelEn}
                </button>
              ))}
            </div>

            <div className="h-4 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500 whitespace-nowrap">
                {language === 'zh' ? '印章文字:' : 'Stamp:'}
              </span>
              <input
                type="text"
                value={stickyStampLabel}
                onChange={(e) => setStickyStampLabel(e.target.value)}
                placeholder={language === 'zh' ? '自定义印章…' : 'Custom stamp...'}
                className="w-24 px-2 py-0.5 text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="h-4 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500 whitespace-nowrap">
                {language === 'zh' ? '引出线:' : 'Callout:'}
              </span>
              <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
                {[
                  { key: 'none' as const, label: language === 'zh' ? '无' : 'None' },
                  { key: 'solid' as const, label: language === 'zh' ? '实线引出' : 'Solid' },
                  { key: 'dashed' as const, label: language === 'zh' ? '虚线引出' : 'Dashed' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setStickyCalloutMode(opt.key)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      stickyCalloutMode === opt.key
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-4 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500 whitespace-nowrap">
                {language === 'zh' ? '印章色:' : 'Accent:'}
              </span>
              {PEN_TACTICAL_COLORS.slice(0, 5).map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setStickyColor(c.value)}
                  className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                    stickyColor.toLowerCase() === c.value.toLowerCase()
                      ? 'scale-120 ring-2 ring-blue-500 border-white'
                      : 'border-slate-200 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
              <label
                className="relative w-4.5 h-4.5 rounded-full overflow-hidden border border-slate-300 cursor-pointer shadow-2xs"
                style={{ backgroundColor: stickyColor }}
                title={language === 'zh' ? '自定义印章与边框颜色' : 'Custom Stamp & Border Color'}
              >
                <input
                  type="color"
                  value={stickyColor}
                  onChange={(e) => setStickyColor(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>

            <div className="h-4 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500 whitespace-nowrap">
                {language === 'zh' ? '底色:' : 'Paper:'}
              </span>
              {STICKY_BG_PALETTE.map((bg) => (
                <button
                  key={bg.value}
                  type="button"
                  onClick={() => setStickyBgColor(bg.value)}
                  className={`w-4.5 h-4.5 rounded-md border transition-transform cursor-pointer ${
                    stickyBgColor.toLowerCase() === bg.value.toLowerCase()
                      ? 'scale-115 ring-2 ring-blue-500 border-blue-400'
                      : 'border-slate-300 hover:scale-110'
                  }`}
                  style={{ backgroundColor: bg.value }}
                  title={bg.name}
                />
              ))}
              <label
                className="relative w-4.5 h-4.5 rounded-md overflow-hidden border border-slate-300 cursor-pointer shadow-2xs"
                style={{ backgroundColor: stickyBgColor }}
                title={language === 'zh' ? '自定义便签背景色' : 'Custom Background Color'}
              >
                <input
                  type="color"
                  value={stickyBgColor}
                  onChange={(e) => setStickyBgColor(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => setToolMode('select')}
              className="ml-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium cursor-pointer whitespace-nowrap"
            >
              {t('cancelEsc')}
            </button>
          </div>
        )}

        {toolMode === 'eraser' && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white px-4 py-1.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Eraser className="w-3.5 h-3.5 text-rose-400" strokeWidth={1.5} />
            <span>{t('bannerEraser')}</span>
            <button
              type="button"
              onClick={() => setToolMode('select')}
              className="ml-2 bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-[11px] cursor-pointer"
            >
              {t('switchBackSelect')}
            </button>
          </div>
        )}

        {toolMode === 'frame' && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-purple-600 text-white px-4 py-1.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Frame className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{t('bannerFrame')}</span>
            <button
              type="button"
              onClick={() => setToolMode('select')}
              className="ml-2 bg-purple-700 hover:bg-purple-800 px-2 py-0.5 rounded text-[11px] cursor-pointer"
            >
              {t('cancelEsc')}
            </button>
          </div>
        )}

        {/* Floating Multi-Selection Batch Action Bar */}
        {totalSelectedCount > 0 &&
          toolMode !== 'connect' &&
          toolMode !== 'pen' &&
          toolMode !== 'highlighter' &&
          toolMode !== 'shape' &&
          toolMode !== 'text' &&
          toolMode !== 'laser' &&
          toolMode !== 'eraser' && (
            <div
              style={{
                top:
                  toolbarPos.orientation === 'horizontal' && toolbarPos.y < 96
                    ? `${toolbarPos.y + 60}px`
                    : '16px',
                left: '50%',
              }}
              className="absolute -translate-x-1/2 z-30 bg-white/98 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl px-3 py-1.5 flex items-center gap-1.5 text-xs text-slate-700 max-w-[92vw] overflow-x-auto"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span className="font-bold text-blue-600 whitespace-nowrap font-mono tabular-nums px-1">
                {t('selectedCount', { count: totalSelectedCount })}
              </span>

              <div className="h-4 w-[1px] bg-slate-200 shrink-0" />

              {alignableSelectedCount >= 2 && (
                <>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onTriggerUnifiedAlign('left')}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 cursor-pointer transition-colors"
                      title={t('alignLeft')}
                    >
                      <AlignLeft className="w-3.5 h-3.5" strokeWidth={1.7} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onTriggerUnifiedAlign('center-h')}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 cursor-pointer transition-colors"
                      title={t('alignCenterH')}
                    >
                      <AlignCenterHorizontal className="w-3.5 h-3.5" strokeWidth={1.7} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onTriggerUnifiedAlign('right')}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 cursor-pointer transition-colors"
                      title={t('alignRight')}
                    >
                      <AlignRight className="w-3.5 h-3.5" strokeWidth={1.7} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onTriggerUnifiedAlign('top')}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 cursor-pointer transition-colors"
                      title={t('alignTop')}
                    >
                      <AlignStartVertical className="w-3.5 h-3.5" strokeWidth={1.7} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onTriggerUnifiedAlign('center-v')}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 cursor-pointer transition-colors"
                      title={t('alignCenterV')}
                    >
                      <AlignCenterVertical className="w-3.5 h-3.5" strokeWidth={1.7} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onTriggerUnifiedAlign('bottom')}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 cursor-pointer transition-colors"
                      title={t('alignBottom')}
                    >
                      <AlignEndVertical className="w-3.5 h-3.5" strokeWidth={1.7} />
                    </button>
                    {alignableSelectedCount >= 3 && (
                      <>
                        <div className="h-3.5 w-[1px] bg-slate-200 mx-0.5 shrink-0" />
                        <button
                          type="button"
                          onClick={() => onTriggerUnifiedAlign('distribute-h')}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 cursor-pointer transition-colors"
                          title={t('distributeH')}
                        >
                          <Columns className="w-3.5 h-3.5" strokeWidth={1.7} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onTriggerUnifiedAlign('distribute-v')}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 cursor-pointer transition-colors"
                          title={t('distributeV')}
                        >
                          <Rows className="w-3.5 h-3.5" strokeWidth={1.7} />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
                </>
              )}

              {selectedPersonIds.length >= 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => onGroupPeopleIntoFrame(selectedPersonIds)}
                    className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                    title={`${t('packIntoFrame')} (${t('packIntoFrameTip')})`}
                  >
                    <Frame className="w-3.5 h-3.5" strokeWidth={1.7} />
                  </button>
                  <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
                </>
              )}

              {/* Group / Ungroup (Ctrl+G / Ctrl+Shift+G) & Lock / Unlock (Ctrl+L) */}
              {alignableSelectedCount >= 1 && (
                <>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {alignableSelectedCount >= 2 && onGroupSelectedElements && (
                      <button
                        type="button"
                        onClick={onGroupSelectedElements}
                        className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        title="组合编组选中元素 (Ctrl/Cmd + G) · 点击任一成员同步拖拽"
                      >
                        <Group className="w-3.5 h-3.5" strokeWidth={1.7} />
                        <span className="text-[10px] font-bold">编组</span>
                      </button>
                    )}
                    {hasGroupedSelection && onUngroupSelectedElements && (
                      <button
                        type="button"
                        onClick={onUngroupSelectedElements}
                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        title="解除逻辑编组 (Ctrl/Cmd + Shift + G)"
                      >
                        <Ungroup className="w-3.5 h-3.5" strokeWidth={1.7} />
                        <span className="text-[10px] font-bold">解组</span>
                      </button>
                    )}
                    {onToggleLockSelectedElements && (
                      <button
                        type="button"
                        onClick={onToggleLockSelectedElements}
                        className={`p-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors ${
                          hasLockedSelection
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'hover:bg-slate-100 text-slate-600 hover:text-amber-600'
                        }`}
                        title={
                          hasLockedSelection
                            ? '解锁选中元素 (Ctrl/Cmd + L)'
                            : '锁定选中元素防误触 (Ctrl/Cmd + L)'
                        }
                      >
                        {hasLockedSelection ? (
                          <Unlock className="w-3.5 h-3.5" strokeWidth={1.7} />
                        ) : (
                          <Lock className="w-3.5 h-3.5" strokeWidth={1.7} />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
                </>
              )}

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    onBatchMoveLayer(
                      selectedPersonIds,
                      selectedFrameIds,
                      'front',
                      selectedAnnotationIds
                    )
                  }
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 cursor-pointer"
                  title={t('bringToFront')}
                >
                  <ArrowUpToLine className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onBatchMoveLayer(
                      selectedPersonIds,
                      selectedFrameIds,
                      'forward',
                      selectedAnnotationIds
                    )
                  }
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 cursor-pointer"
                  title={t('bringForward')}
                >
                  <ArrowUp className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onBatchMoveLayer(
                      selectedPersonIds,
                      selectedFrameIds,
                      'backward',
                      selectedAnnotationIds
                    )
                  }
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 cursor-pointer"
                  title={t('sendBackward')}
                >
                  <ArrowDown className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onBatchMoveLayer(
                      selectedPersonIds,
                      selectedFrameIds,
                      'back',
                      selectedAnnotationIds
                    )
                  }
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 cursor-pointer"
                  title={t('sendToBack')}
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>

              {selectedAnnotationIds.length > 0 && selectedPersonIds.length === 0 && (
                <>
                  <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
                  <div className="flex items-center gap-1 shrink-0">
                    {PEN_TACTICAL_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() =>
                          selectedAnnotationIds.forEach((id) =>
                            onUpdateAnnotation?.(id, { color: c.value })
                          )
                        }
                        className="w-4 h-4 rounded-full border border-white shadow-2xs hover:scale-120 transition-transform cursor-pointer"
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                    <label
                      className="relative w-4.5 h-4.5 rounded-full overflow-hidden border border-slate-300 cursor-pointer shadow-2xs hover:scale-110 transition-transform"
                      style={{
                        background:
                          'conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
                      }}
                      title={language === 'zh' ? '自定义批注颜色' : 'Custom Color'}
                    >
                      <input
                        type="color"
                        onChange={(e) =>
                          selectedAnnotationIds.forEach((id) =>
                            onUpdateAnnotation?.(id, { color: e.target.value })
                          )
                        }
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                    </label>
                  </div>

                  {selectedAnnotationIds.some((id) => {
                    const targetAnn = annotations.find((a) => a.id === id);
                    return (
                      targetAnn &&
                      (targetAnn.kind === 'pen' ||
                        (targetAnn.kind === 'shape' &&
                          (targetAnn.shapeType === 'line' || targetAnn.shapeType === 'arrow')))
                    );
                  }) && (
                    <>
                      <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
                      <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg shrink-0">
                        {[
                          { key: 'none' as const, label: language === 'zh' ? '无箭头' : 'None', icon: Minus },
                          { key: 'forward' as const, label: language === 'zh' ? '单箭头' : 'Single', icon: MoveRight },
                          { key: 'both' as const, label: language === 'zh' ? '双箭头' : 'Double', icon: MoveHorizontal },
                        ].map((arrOpt) => {
                          const ArrIcon = arrOpt.icon;
                          return (
                            <button
                              key={arrOpt.key}
                              type="button"
                              onClick={() =>
                                selectedAnnotationIds.forEach((id) => {
                                  const targetAnn = annotations.find((a) => a.id === id);
                                  if (!targetAnn) return;
                                  if (
                                    targetAnn.kind === 'shape' &&
                                    (targetAnn.shapeType === 'line' || targetAnn.shapeType === 'arrow')
                                  ) {
                                    onUpdateAnnotation?.(id, {
                                      arrow: arrOpt.key,
                                      shapeType: arrOpt.key === 'none' ? 'line' : 'arrow',
                                    });
                                  } else if (targetAnn.kind === 'pen') {
                                    onUpdateAnnotation?.(id, { arrow: arrOpt.key });
                                  }
                                })
                              }
                              className="px-1.5 py-0.5 rounded hover:bg-white text-slate-600 hover:text-blue-600 flex items-center gap-0.5 text-[10px] font-medium cursor-pointer"
                              title={arrOpt.label}
                            >
                              <ArrIcon className="w-3 h-3" strokeWidth={1.8} />
                              <span>{arrOpt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteAnnotations?.(selectedAnnotationIds);
                      onClearSelectedAnnotations();
                    }}
                    className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600 cursor-pointer"
                    title={t('deleteBtn')}
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </>
              )}

              {selectedPersonIds.length > 0 && (
                <>
                  <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
                  <div className="flex items-center gap-1 shrink-0">
                    {CARD_COLORS.slice(0, 6).map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => onBatchUpdatePeople(selectedPersonIds, { cardColor: c.value })}
                        className="w-4 h-4 rounded-full border border-white shadow-2xs hover:scale-120 transition-transform cursor-pointer"
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>

                  <div className="h-4 w-[1px] bg-slate-200 shrink-0" />

                  <button
                    type="button"
                    onClick={() => onDuplicatePeople(selectedPersonIds, 36, 36)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer"
                    title={t('duplicateCards')}
                  >
                    <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onBatchRemoveFromCanvas(selectedPersonIds);
                      onClearSelectedPeople();
                    }}
                    className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600 cursor-pointer"
                    title={t('removeCardsFromCanvas')}
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </>
              )}
            </div>
          )}
      </>
    );
  }
);
