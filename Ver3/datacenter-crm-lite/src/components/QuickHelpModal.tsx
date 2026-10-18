import React, { useEffect, useMemo } from 'react';
import {
  X,
  HelpCircle,
  ArrowRight,
  Move,
  MousePointer,
  Image,
  Tag,
  Layers,
  BoxSelect,
  Lasso,
  Frame,
} from 'lucide-react';
import { RELATION_TEMPLATES } from '../types/crm.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface QuickHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickHelpModal: React.FC<QuickHelpModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useLanguage();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const shortcuts = useMemo(() => {
    if (language === 'zh') {
      return [
        { action: '选择与框选模式 (默认快捷键 Space)', method: '按空格键快速切回选择与框选模式；点击选中卡片，在画布空白处拖拽拉出矩形框选多个要素', icon: MousePointer },
        { action: '抓手平移与缩放画布 (快捷键 H)', method: '按 H 键切换抓手工具拖拽平移画布，或使用触控板双指平移；Ctrl + 滚轮缩放', icon: Move },
        { action: '矩形框选与自由套索 (M / L)', method: '支持矩形框选或自由画圈套索圈选，选中后支持批量移动、对齐、变色与打包成组', icon: BoxSelect },
        { action: '自由套索智能圈选与刀切 (快捷键 L)', method: '支持圈选节点、手绘闭合圈直接生成分组框、按住 Alt 划线切断连线', icon: Lasso },
        { action: '自由画笔与多箭头样式 (快捷键 P)', method: '支持色盘选色、非箭头/单箭头/双箭头线条及一笔成型几何图形自动规整', icon: Tag },
        { action: '荧光马克笔与演示激光笔 (G / Z)', method: '马克笔支持色盘高亮；激光笔显示红色发光圆点指针与流光彗星拖尾', icon: Layers },
        { action: '自定义作战便签与矢量橡皮擦 (N / E)', method: '便签支持自定义战术印章文字、印章颜色与背景色；按 E 启用矢量橡皮擦', icon: Layers },
        { action: '全方位右键菜单 (Right Click)', method: '在人物卡、连线、分组框、批注或画布空白处点击右键，呼出专属快捷菜单', icon: Tag },
        { action: '可拖动工具栏 (Draggable Menu)', method: '鼠标拖拽顶部把手可将工具栏移动至任意位置，并可一键切换横竖布局', icon: Move },
        { action: '锚点拖拽快速连线 (快捷键 C)', method: '悬停卡片四周蓝色锚点拖拽至目标卡片，或使用连线工具连续点击两张卡片', icon: ArrowRight },
        { action: '阵营分组框拖拽与缩放 (F)', method: '点击阵营框标题栏可自由拖拽（可同步带动框内卡片），拖拽右下角调整尺寸', icon: Frame },
        { action: '名片照片拖拽 OCR 建档', method: '直接将电脑中的名片图片拖入画布任意位置，自动触发 OCR 识别建档', icon: Image },
      ];
    }
    return [
      { action: 'Select & Box Selection (Default Key: Space)', method: 'Press Spacebar to switch to Select & Box mode; click node to select or drag on empty canvas to marquee select', icon: MousePointer },
      { action: 'Pan & Zoom Canvas (Key H)', method: 'Press H for Hand Pan tool or use trackpad; Ctrl + wheel to zoom in/out', icon: Move },
      { action: 'Marquee & Freehand Lasso (M / L)', method: 'Box or freehand lasso selection with batch move, align, color and pack into frame', icon: BoxSelect },
      { action: 'Freehand Lasso & Knife (Key L)', method: 'Select nodes, auto-generate group frames, or hold Alt to slice relationship lines', icon: Lasso },
      { action: 'Freehand Pen & Arrow Modes (Key P)', method: 'Full color palette, No-Arrow / Single-Arrow / Double-Arrow options, and Smart Shape snapping', icon: Tag },
      { action: 'Highlighter & Red Dot Laser (G / Z)', method: 'Color palette highlighter; Laser pointer features a glowing red dot cursor and smooth comet trail', icon: Layers },
      { action: 'Custom Sticky Note & Eraser (N / E)', method: 'Customize stamp badge text, accent color, and note background color; press E for vector eraser', icon: Layers },
      { action: 'Comprehensive Context Menu (Right Click)', method: 'Right click on cards, lines, frames, annotations, or empty canvas for contextual actions', icon: Tag },
      { action: 'Draggable Floating Menu Bar', method: 'Drag the grip handle to reposition anywhere; toggle between vertical & horizontal dock', icon: Move },
      { action: 'Anchor Drag Connection (Key C)', method: 'Hover card glowing blue anchors to drag connections, or click connect tool', icon: ArrowRight },
      { action: 'Group Frames (Key F)', method: 'Drag group frame headers to move (along with cards), drag bottom-right corner to resize', icon: Frame },
      { action: 'Business Card OCR Drop', method: 'Drop card images directly onto canvas to auto-extract stakeholder contact details', icon: Image },
    ];
  }, [language]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-medium">
              <HelpCircle className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {language === 'zh' ? '交互操作指南与效率快捷键' : 'Interaction Guide & Shortcuts'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'zh'
                  ? 'BoardMix 级高效率绘图工具栏 · 智能圈选 · 图层管理 · 全景右键菜单'
                  : 'BoardMix-Grade Interactive Toolbar · Smart Marquee/Lasso · Layer Manager · Context Menu'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
            title={t('closeBtn')}
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              {language === 'zh' ? '核心画布交互与效率工具' : 'Core Canvas Interactions & Tools'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {shortcuts.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-1.5 rounded-md bg-white text-slate-600 shadow-2xs shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{item.action}</div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.method}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                {language === 'zh' ? '10 种大客户公关关系模板' : '10 Major Account Relationship Templates'}
              </h3>
              <span className="text-xs text-slate-400">
                {language === 'zh' ? '连线后可一键套用或右键快速切换' : 'Click to apply or quick switch via right click'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {RELATION_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.key}
                  className="p-2.5 rounded-lg border border-slate-200/80 bg-white hover:border-slate-300 transition-all text-center flex flex-col items-center"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tpl.color }}
                    />
                    <span className="text-xs font-semibold text-slate-800">{tpl.label}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 line-clamp-1">{tpl.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            {language === 'zh'
              ? '支持 CSV、JSON 备份及 PNG / SVG / PDF 战报全格式导出'
              : 'Supports CSV, JSON backup and PNG / SVG / PDF presentation export'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer"
          >
            {language === 'zh' ? '我知道了' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};
