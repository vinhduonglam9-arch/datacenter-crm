import React from 'react';
import {
  GripVertical,
  MousePointer,
  Hand,
  BoxSelect,
  Lasso,
  Link2,
  Frame,
  PenTool,
  Highlighter,
  Shapes,
  ChevronDown,
  Type,
  Zap,
  StickyNote,
  Eraser,
} from 'lucide-react';
import {
  CanvasToolMode,
  SmartShapeType,
  COMMON_SHAPE_ITEMS,
} from '../../types/crm.ts';
import { buildCommonShapeSvgPath } from '../../utils/graph-math.ts';
import { ToolbarPosition } from '../../utils/storage.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';

interface CanvasFloatingToolbarProps {
  toolbarPos: ToolbarPosition;
  isDraggingToolbar: boolean;
  toolMode: CanvasToolMode;
  activeShapeType: SmartShapeType;
  showShapeDropdown: boolean;
  containerWidth: number;
  containerHeight: number;
  onGripMouseDown: (e: React.MouseEvent) => void;
  onResetToolbarPos: () => void;
  onSelectToolMode: (mode: CanvasToolMode) => void;
  onToggleShapeDropdown: () => void;
  onSelectShapeType: (shapeType: SmartShapeType) => void;
}

export const CanvasFloatingToolbar: React.FC<CanvasFloatingToolbarProps> = React.memo(
  ({
    toolbarPos,
    isDraggingToolbar,
    toolMode,
    activeShapeType,
    showShapeDropdown,
    containerWidth,
    containerHeight,
    onGripMouseDown,
    onResetToolbarPos,
    onSelectToolMode,
    onToggleShapeDropdown,
    onSelectShapeType,
  }) => {
    const { language, t } = useLanguage();

    return (
      <div
        style={{ left: `${toolbarPos.x}px`, top: `${toolbarPos.y}px` }}
        className={`absolute z-40 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl p-1.5 flex ${
          toolbarPos.orientation === 'horizontal'
            ? 'flex-row items-center'
            : 'flex-col items-center'
        } gap-1 text-slate-600 transition-shadow ${
          isDraggingToolbar ? 'shadow-2xl ring-2 ring-blue-500/30' : ''
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Minimalist Drag Handle Grip */}
        <div
          onMouseDown={onGripMouseDown}
          onDoubleClick={onResetToolbarPos}
          className={`${
            toolbarPos.orientation === 'horizontal' ? 'px-1.5 py-2' : 'w-full py-1'
          } flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors`}
          title={`${t('toolDragHandle')} · ${t('toolResetPosition')}`}
        >
          <GripVertical
            className={`w-3.5 h-3.5 ${toolbarPos.orientation === 'horizontal' ? '' : 'rotate-90'}`}
            strokeWidth={1.5}
          />
        </div>

        {[
          { mode: 'select' as CanvasToolMode, label: t('toolSelect'), icon: MousePointer },
          { mode: 'pan' as CanvasToolMode, label: t('toolPan'), icon: Hand },
          { mode: 'marquee' as CanvasToolMode, label: t('toolMarquee'), icon: BoxSelect },
          { mode: 'lasso' as CanvasToolMode, label: t('toolLasso'), icon: Lasso },
          { mode: 'connect' as CanvasToolMode, label: t('toolConnect'), icon: Link2 },
          { mode: 'frame' as CanvasToolMode, label: t('toolFrame'), icon: Frame },
        ].map((item) => {
          const Icon = item.icon;
          const active = toolMode === item.mode;
          return (
            <button
              key={item.mode}
              type="button"
              onClick={() => onSelectToolMode(item.mode)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} />
            </button>
          );
        })}

        <div
          className={
            toolbarPos.orientation === 'horizontal'
              ? 'w-[1px] h-6 bg-slate-200 mx-0.5'
              : 'w-6 h-[1px] bg-slate-200 my-0.5'
          }
        />

        {/* Freehand Tactical Annotation Suite: Pen, Highlighter */}
        {[
          { mode: 'pen' as CanvasToolMode, label: t('toolPen'), icon: PenTool, activeBg: 'bg-rose-600' },
          { mode: 'highlighter' as CanvasToolMode, label: t('toolHighlighter'), icon: Highlighter, activeBg: 'bg-amber-500' },
        ].map((item) => {
          const Icon = item.icon;
          const active = toolMode === item.mode;
          return (
            <button
              key={item.mode}
              type="button"
              onClick={() => onSelectToolMode(item.mode)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                active
                  ? `${item.activeBg} text-white shadow-xs`
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} />
            </button>
          );
        })}

        {/* Shape Tool Button + Common Shapes Dropdown Menu right after Highlighter */}
        <div className="relative">
          <button
            type="button"
            onClick={onToggleShapeDropdown}
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center relative ${
              toolMode === 'shape'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title={
              language === 'zh'
                ? '几何形状库 (R · 点击展开常用形状)'
                : 'Shapes (R · Click for common shapes)'
            }
            aria-label={language === 'zh' ? '几何形状库' : 'Shapes'}
          >
            <Shapes className="w-4 h-4" strokeWidth={1.5} />
            <ChevronDown
              className={`w-2.5 h-2.5 absolute bottom-0.5 right-0.5 ${
                toolMode === 'shape' ? 'text-white' : 'text-slate-400'
              }`}
              strokeWidth={2}
            />
          </button>

          {/* Common Shapes Dropdown Flyout Menu */}
          {showShapeDropdown && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className={`absolute z-50 bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl p-3 w-72 ${
                toolbarPos.orientation === 'horizontal'
                  ? toolbarPos.y > containerHeight - 320
                    ? 'bottom-12 left-0'
                    : 'top-12 left-0'
                  : `${toolbarPos.x > containerWidth - 340 ? 'right-12' : 'left-12'} ${
                      toolbarPos.y > containerHeight - 320 ? 'bottom-0' : 'top-0'
                    }`
              }`}
            >
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Shapes className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.8} />
                  <span className="text-xs font-bold text-slate-800">
                    {language === 'zh' ? '常用战术几何形状' : 'Common Shapes'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {language === 'zh' ? '双击形状可输入文字' : 'Double-click to type'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {COMMON_SHAPE_ITEMS.map((sh) => {
                  const isSelectedShape = activeShapeType === sh.key && toolMode === 'shape';
                  const previewSvg = buildCommonShapeSvgPath(sh.key, 38, 26, 1.8);
                  return (
                    <button
                      key={sh.key}
                      type="button"
                      onClick={() => onSelectShapeType(sh.key)}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        isSelectedShape
                          ? 'border-indigo-500 bg-indigo-50/80 text-indigo-700 font-semibold shadow-2xs'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <svg width={38} height={26} viewBox="0 0 38 26" className="overflow-visible">
                        <path
                          d={previewSvg.mainPath}
                          fill={isSelectedShape ? '#6366f122' : '#94a3b818'}
                          stroke={isSelectedShape ? '#4f46e5' : '#475569'}
                          strokeWidth={1.7}
                          strokeLinejoin="round"
                        />
                        {previewSvg.detailPath && (
                          <path
                            d={previewSvg.detailPath}
                            fill="none"
                            stroke={isSelectedShape ? '#4f46e5' : '#475569'}
                            strokeWidth={1.7}
                            strokeLinejoin="round"
                          />
                        )}
                      </svg>
                      <span className="text-[10px] truncate max-w-full">
                        {language === 'zh' ? sh.labelZh : sh.labelEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Text Input Tool Button + Laser, Sticky, Eraser */}
        {[
          {
            mode: 'text' as CanvasToolMode,
            label: language === 'zh' ? '文本输入 (T)' : 'Text Input (T)',
            icon: Type,
            activeBg: 'bg-sky-600',
          },
          { mode: 'laser' as CanvasToolMode, label: t('toolLaser'), icon: Zap, activeBg: 'bg-red-600' },
          { mode: 'sticky' as CanvasToolMode, label: t('toolSticky'), icon: StickyNote, activeBg: 'bg-emerald-600' },
          { mode: 'eraser' as CanvasToolMode, label: t('toolEraser'), icon: Eraser, activeBg: 'bg-slate-800' },
        ].map((item) => {
          const Icon = item.icon;
          const active = toolMode === item.mode;
          return (
            <button
              key={item.mode}
              type="button"
              onClick={() => onSelectToolMode(item.mode)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                active
                  ? `${item.activeBg} text-white shadow-xs`
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} />
            </button>
          );
        })}
      </div>
    );
  }
);
