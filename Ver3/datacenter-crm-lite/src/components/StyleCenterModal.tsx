import React, { useState, useEffect } from 'react';
import {
  X,
  Palette,
  Sparkles,
  Layers,
  Activity,
  Check,
  RotateCcw,
  ChevronRight,
  Briefcase,
  Cpu,
  Moon,
  Compass,
  BookOpen,
  Trees,
  Sliders,
  Plus,
  Trash2,
  Edit3,
  Save,
} from 'lucide-react';
import {
  BACKGROUND_STYLES,
  LINE_STYLES,
  CARD_STYLES,
  CURATED_THEME_BUNDLES,
  CuratedThemeBundle,
  buildCustomBackgroundCss,
} from '../utils/theme-presets.ts';
import {
  BackgroundStyleId,
  LineStyleId,
  CardStyleId,
  BackgroundStyleConfig,
  LineStyleConfig,
  CardStyleConfig,
  SavedCustomStyleScheme,
} from '../types/styles.ts';

interface StyleCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  bgStyleId: BackgroundStyleId;
  lineStyleId: LineStyleId;
  cardStyleId: CardStyleId;
  activeBgConfig: BackgroundStyleConfig;
  activeLineConfig: LineStyleConfig;
  activeCardConfig: CardStyleConfig;
  savedCustomSchemes?: SavedCustomStyleScheme[];
  onSelectBgStyle: (id: BackgroundStyleId) => void;
  onSelectLineStyle: (id: LineStyleId) => void;
  onSelectCardStyle: (id: CardStyleId) => void;
  onApplyCustomBg: (config: BackgroundStyleConfig) => void;
  onApplyCustomLine: (config: LineStyleConfig) => void;
  onApplyCustomCard: (config: CardStyleConfig) => void;
  onSaveCustomScheme: (scheme: SavedCustomStyleScheme) => void;
  onApplyCustomScheme: (scheme: SavedCustomStyleScheme) => void;
  onDeleteCustomScheme: (id: string) => void;
  onApplyBundle: (bundle: CuratedThemeBundle) => void;
  onResetDefaults: () => void;
}

type TabKey = 'bundles' | 'studio' | 'backgrounds' | 'lines' | 'cards';
type StudioSection = 'bg' | 'line' | 'card';

export const StyleCenterModal: React.FC<StyleCenterModalProps> = ({
  isOpen,
  onClose,
  bgStyleId,
  lineStyleId,
  cardStyleId,
  activeBgConfig,
  activeLineConfig,
  activeCardConfig,
  savedCustomSchemes = [],
  onSelectBgStyle,
  onSelectLineStyle,
  onSelectCardStyle,
  onApplyCustomBg,
  onApplyCustomLine,
  onApplyCustomCard,
  onSaveCustomScheme,
  onApplyCustomScheme,
  onDeleteCustomScheme,
  onApplyBundle,
  onResetDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('bundles');
  const [studioSection, setStudioSection] = useState<StudioSection>('bg');

  // Custom Background Designer State
  const [draftBg, setDraftBg] = useState<BackgroundStyleConfig>(activeBgConfig);
  // Custom Line Designer State
  const [draftLine, setDraftLine] = useState<LineStyleConfig>(activeLineConfig);
  // Custom Card Designer State
  const [draftCard, setDraftCard] = useState<CardStyleConfig>(activeCardConfig);

  // Save custom scheme name & description
  const [schemeName, setSchemeName] = useState<string>('');
  const [schemeDesc, setSchemeDesc] = useState<string>('');

  // Sync draft configs when modal opens or active configs change externally
  useEffect(() => {
    if (isOpen) {
      setDraftBg(activeBgConfig);
      setDraftLine(activeLineConfig);
      setDraftCard(activeCardConfig);
    }
  }, [isOpen, activeBgConfig, activeLineConfig, activeCardConfig]);

  if (!isOpen) return null;

  const updateDraftBgAndApply = (updates: Partial<BackgroundStyleConfig>) => {
    const merged = { ...draftBg, ...updates };
    const patternType = merged.patternType || 'dots';
    const spacing = merged.spacing || 24;
    const dotRadius = merged.dotRadius ?? 1.2;
    const patternColor = merged.patternColor || (merged.isDark ? '#334155' : '#cbd5e1');
    const css = buildCustomBackgroundCss({
      backgroundColor: merged.backgroundColor,
      patternType,
      patternColor,
      spacing,
      dotRadius,
      gradientStops: merged.gradientStops,
    });
    const nextConfig: BackgroundStyleConfig = {
      ...merged,
      id: 'custom-bg',
      name: merged.name.startsWith('自定义') ? merged.name : `自定义·${merged.name}`,
      category: 'custom',
      patternType,
      patternColor,
      spacing,
      dotRadius,
      backgroundImage: css.backgroundImage,
      backgroundSize: css.backgroundSize,
      previewBg: css.previewBg,
    };
    setDraftBg(nextConfig);
    onApplyCustomBg(nextConfig);
  };

  const updateDraftLineAndApply = (updates: Partial<LineStyleConfig>) => {
    const merged: LineStyleConfig = {
      ...draftLine,
      ...updates,
      id: 'custom-line',
      name: draftLine.name.startsWith('自定义') ? draftLine.name : `自定义·${draftLine.name}`,
      category: 'custom',
    };
    setDraftLine(merged);
    onApplyCustomLine(merged);
  };

  const updateDraftCardAndApply = (updates: Partial<CardStyleConfig>) => {
    const merged: CardStyleConfig = {
      ...draftCard,
      ...updates,
      id: 'custom-card',
      name: draftCard.name.startsWith('自定义') ? draftCard.name : `自定义·${draftCard.name}`,
      category: 'custom',
    };
    setDraftCard(merged);
    onApplyCustomCard(merged);
  };

  const handleSaveAsNewScheme = () => {
    const title = schemeName.trim() || `自创视觉方案 #${savedCustomSchemes.length + 1}`;
    const desc =
      schemeDesc.trim() ||
      `${draftBg.name} + ${draftLine.name} + ${draftCard.name}`;
    const newScheme: SavedCustomStyleScheme = {
      id: `custom-scheme-${Date.now()}`,
      name: title,
      desc,
      createdAt: Date.now(),
      bgConfig: { ...draftBg, id: 'custom-bg', name: `${title}·底纹` },
      lineConfig: { ...draftLine, id: 'custom-line', name: `${title}·连线` },
      cardConfig: { ...draftCard, id: 'custom-card', name: `${title}·卡片` },
    };
    onSaveCustomScheme(newScheme);
    setSchemeName('');
    setSchemeDesc('');
  };

  const getBundleIcon = (name: string) => {
    switch (name) {
      case 'Briefcase':
        return <Briefcase className="w-4 h-4 text-blue-600" />;
      case 'Cpu':
        return <Cpu className="w-4 h-4 text-cyan-500" />;
      case 'Moon':
        return <Moon className="w-4 h-4 text-purple-400" />;
      case 'Layers':
        return <Layers className="w-4 h-4 text-sky-500" />;
      case 'Compass':
        return <Compass className="w-4 h-4 text-blue-400" />;
      case 'BookOpen':
        return <BookOpen className="w-4 h-4 text-amber-600" />;
      case 'Trees':
        return <Trees className="w-4 h-4 text-emerald-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-indigo-500" />;
    }
  };

  const previewStrokeColor =
    draftLine.glowEffect === 'neon-cyan'
      ? '#06b6d4'
      : draftLine.glowEffect === 'neon-purple'
      ? '#9333ea'
      : draftLine.glowEffect === 'gold'
      ? '#d97706'
      : '#3b82f6';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                画布视觉样式中心与自定义设计工坊
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                精选 10×10×10 实用预设 · 支持底纹、关系连线与人物卡片自由设计定制
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('studio');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'studio'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>自定义设计工坊</span>
            </button>
            <button
              onClick={onResetDefaults}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
              title="恢复默认经典主题"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>恢复默认</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between text-xs gap-2 shrink-0">
          <div className="flex items-center gap-3 text-slate-600 font-medium">
            <span className="text-slate-400">当前生效组合：</span>
            <span>
              画布底纹 <strong className="text-slate-900">{activeBgConfig.name}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              连线风格 <strong className="text-slate-900">{activeLineConfig.name}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              人物卡片 <strong className="text-slate-900">{activeCardConfig.name}</strong>
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            实时同步至拓扑画布与 PNG / SVG / PDF 导出中心
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-white flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('bundles')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'bundles'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>精选套装 & 我的主题 ({CURATED_THEME_BUNDLES.length + savedCustomSchemes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'studio'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>自定义样式设计工坊 (DIY)</span>
          </button>

          <button
            onClick={() => setActiveTab('backgrounds')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'backgrounds'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>精选画布底纹 ({BACKGROUND_STYLES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('lines')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'lines'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>精选关系连线 ({LINE_STYLES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cards')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'cards'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>精选人物卡片 ({CARD_STYLES.length})</span>
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/60">
          {/* TAB 1: Curated Bundles + Saved Custom Schemes */}
          {activeTab === 'bundles' && (
            <div className="space-y-6">
              {/* Saved Custom Schemes Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      我的自创主题方案 ({savedCustomSchemes.length})
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      在「自定义样式设计工坊」中自由调配底纹、连线与卡片并保存为专属方案
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('studio')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新建自定义样式</span>
                  </button>
                </div>

                {savedCustomSchemes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="text-xs font-bold text-slate-800">
                        尚未保存自定义视觉方案
                      </div>
                      <div className="text-xs text-slate-500">
                        支持自定义画布网格间距/颜色、连线粗细/发光/虚线节奏、人物卡片圆角/底色/边框，并一键保存复用。
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('studio')}
                      className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      前往设计工坊 →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {savedCustomSchemes.map((scheme) => {
                      return (
                        <div
                          key={scheme.id}
                          onClick={() => onApplyCustomScheme(scheme)}
                          className="relative p-4 rounded-xl border border-indigo-200 bg-white hover:border-indigo-500 cursor-pointer transition-all hover:shadow-md"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-indigo-700">
                              自创主题方案
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onApplyCustomScheme(scheme);
                                  setActiveTab('studio');
                                }}
                                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-indigo-600 cursor-pointer"
                                title="在工坊中继续编辑此方案"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteCustomScheme(scheme.id);
                                }}
                                className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="删除此自定义方案"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="font-bold text-sm text-slate-900 truncate">
                            {scheme.name}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                            {scheme.desc}
                          </p>

                          {/* Mini visual preview bar */}
                          <div
                            className="mt-3 h-12 rounded-lg border border-slate-200 flex items-center justify-between px-3 overflow-hidden"
                            style={{
                              backgroundColor: scheme.bgConfig.backgroundColor,
                              backgroundImage: scheme.bgConfig.backgroundImage,
                              backgroundSize: scheme.bgConfig.backgroundSize || '20px 20px',
                            }}
                          >
                            <div
                              className="px-2 py-0.5 text-[10px] font-bold border"
                              style={{
                                backgroundColor:
                                  scheme.cardConfig.customBgColor ||
                                  (scheme.cardConfig.isDarkCard ? '#0f172a' : '#ffffff'),
                                color: scheme.cardConfig.isDarkCard ? '#ffffff' : '#0f172a',
                                borderColor:
                                  scheme.cardConfig.customBorderColor ||
                                  (scheme.cardConfig.isDarkCard ? '#334155' : '#cbd5e1'),
                                borderRadius: `${scheme.cardConfig.customBorderRadius ?? 8}px`,
                              }}
                            >
                              张明远
                            </div>
                            <div className="flex-1 mx-2 h-0.5 bg-indigo-500" />
                            <div
                              className="px-2 py-0.5 text-[10px] font-bold border"
                              style={{
                                backgroundColor:
                                  scheme.cardConfig.customBgColor ||
                                  (scheme.cardConfig.isDarkCard ? '#0f172a' : '#ffffff'),
                                color: scheme.cardConfig.isDarkCard ? '#ffffff' : '#0f172a',
                                borderColor:
                                  scheme.cardConfig.customBorderColor ||
                                  (scheme.cardConfig.isDarkCard ? '#334155' : '#cbd5e1'),
                                borderRadius: `${scheme.cardConfig.customBorderRadius ?? 8}px`,
                              }}
                            >
                              赵栋梁
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 6 Curated Built-in Theme Bundles */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    官方精选实战套装 (6套高频场景)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    已精简冗余项，保留最适合政企汇报、大屏指挥舱、设计院评审与咨询复盘的 6 套黄金组合
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {CURATED_THEME_BUNDLES.map((bundle) => {
                    const isCurrent =
                      bundle.bgId === bgStyleId &&
                      bundle.lineId === lineStyleId &&
                      bundle.cardId === cardStyleId;
                    const targetBg = BACKGROUND_STYLES.find((b) => b.id === bundle.bgId);
                    const targetLine = LINE_STYLES.find((l) => l.id === bundle.lineId);
                    const targetCard = CARD_STYLES.find((c) => c.id === bundle.cardId);

                    return (
                      <div
                        key={bundle.id}
                        onClick={() => onApplyBundle(bundle)}
                        className={`relative p-4 rounded-xl border bg-white cursor-pointer transition-all hover:shadow-md ${
                          isCurrent
                            ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                            {getBundleIcon(bundle.iconName)}
                          </div>
                          <span className="text-[11px] font-medium text-slate-500">
                            {bundle.badge}
                          </span>
                        </div>

                        <div className="font-bold text-sm text-slate-900">
                          {bundle.name}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {bundle.desc}
                        </p>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
                          <div className="truncate">
                            底纹：<span className="text-slate-800">{targetBg?.name}</span>
                          </div>
                          <div className="truncate">
                            连线：<span className="text-slate-800">{targetLine?.name}</span>
                          </div>
                          <div className="truncate">
                            卡片：<span className="text-slate-800">{targetCard?.name}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                            {isCurrent ? '当前正在使用' : '一键应用套装'}
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onApplyBundle(bundle);
                              setActiveTab('studio');
                            }}
                            className="text-[11px] text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>微调设计</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Interactive Custom Style Designer Studio (自定义样式设计工坊) */}
          {activeTab === 'studio' && (
            <div className="space-y-5">
              {/* Live Interactive Preview Stage */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <span>实时视觉预览台</span>
                    <span className="text-slate-400 font-normal">
                      （右侧任意修改会立即同步至下方预览与主画布）
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={schemeName}
                      onChange={(e) => setSchemeName(e.target.value)}
                      placeholder="输入方案名称（如：集团深色汇报风）…"
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600 w-52"
                    />
                    <button
                      type="button"
                      onClick={handleSaveAsNewScheme}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-2xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>保存到我的主题库</span>
                    </button>
                  </div>
                </div>

                {/* Live Canvas Stage */}
                <div
                  className="relative h-44 w-full rounded-xl border border-slate-200 overflow-hidden flex items-center justify-around px-6 shadow-inner transition-colors"
                  style={{
                    backgroundColor: draftBg.backgroundColor,
                    backgroundImage: draftBg.backgroundImage,
                    backgroundSize: draftBg.backgroundSize || '24px 24px',
                  }}
                >
                  {/* Connecting SVG Line Preview */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox="0 0 600 176"
                    preserveAspectRatio="none"
                  >
                    {draftLine.lineType === 'straight' ? (
                      <line
                        x1="175"
                        y1="88"
                        x2="425"
                        y2="88"
                        stroke={previewStrokeColor}
                        strokeWidth={draftLine.strokeWidth}
                        strokeDasharray={draftLine.strokeDasharray}
                        className={draftLine.animated ? 'animate-flow-dash' : ''}
                      />
                    ) : draftLine.lineType === 'step' ? (
                      <path
                        d="M 175 68 L 300 68 L 300 108 L 425 108"
                        fill="none"
                        stroke={previewStrokeColor}
                        strokeWidth={draftLine.strokeWidth}
                        strokeDasharray={draftLine.strokeDasharray}
                        className={draftLine.animated ? 'animate-flow-dash' : ''}
                      />
                    ) : draftLine.lineType === 'arc' ? (
                      <path
                        d="M 175 105 Q 300 25 425 105"
                        fill="none"
                        stroke={previewStrokeColor}
                        strokeWidth={draftLine.strokeWidth}
                        strokeDasharray={draftLine.strokeDasharray}
                        className={draftLine.animated ? 'animate-flow-dash' : ''}
                      />
                    ) : (
                      <path
                        d="M 175 105 C 250 45, 350 130, 425 70"
                        fill="none"
                        stroke={previewStrokeColor}
                        strokeWidth={draftLine.strokeWidth}
                        strokeDasharray={draftLine.strokeDasharray}
                        className={draftLine.animated ? 'animate-flow-dash' : ''}
                      />
                    )}
                    {draftLine.doubleLine && (
                      <path
                        d={
                          draftLine.lineType === 'straight'
                            ? 'M 175 88 L 425 88'
                            : draftLine.lineType === 'step'
                            ? 'M 175 68 L 300 68 L 300 108 L 425 108'
                            : 'M 175 105 C 250 45, 350 130, 425 70'
                        }
                        fill="none"
                        stroke={draftBg.isDark ? '#0f172a' : '#ffffff'}
                        strokeWidth={Math.max(1, draftLine.strokeWidth * 0.38)}
                      />
                    )}
                    <g transform="translate(300, 88)">
                      <rect
                        x="-34"
                        y="-11"
                        width="68"
                        height="22"
                        rx="6"
                        fill={draftBg.isDark ? '#1e293b' : '#ffffff'}
                        stroke={previewStrokeColor}
                        strokeWidth="1.5"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill={draftBg.isDark ? '#f8fafc' : previewStrokeColor}
                        fontSize="10"
                        fontWeight="bold"
                      >
                        核心汇报线
                      </text>
                    </g>
                  </svg>

                  {/* Sample Card 1 */}
                  {[
                    { name: '张明远', role: '智算中心总指挥', color: '#3B82F6', tag: '最终决策人' },
                    { name: '赵栋梁', role: '机电总工程师', color: '#10B981', tag: '技术把关人' },
                  ].map((sample, sIdx) => (
                    <div
                      key={sIdx}
                      className={`relative z-10 w-48 border transition-all ${draftCard.roundedClass} ${draftCard.bgClass} ${draftCard.borderClass} ${draftCard.shadowClass}`}
                      style={{
                        backgroundColor:
                          draftCard.accentStyle === 'full'
                            ? `${sample.color}18`
                            : draftCard.customBgColor || undefined,
                        borderColor:
                          draftCard.accentStyle === 'frame'
                            ? sample.color
                            : draftCard.customBorderColor || undefined,
                        borderWidth:
                          draftCard.customBorderWidth !== undefined
                            ? `${draftCard.customBorderWidth}px`
                            : undefined,
                        borderStyle: draftCard.customBorderStyle || undefined,
                        borderRadius:
                          draftCard.customBorderRadius !== undefined
                            ? `${draftCard.customBorderRadius}px`
                            : undefined,
                      }}
                    >
                      {draftCard.accentStyle === 'bar' && (
                        <div
                          className="h-1.5 w-full rounded-t-lg"
                          style={{ backgroundColor: sample.color }}
                        />
                      )}
                      {draftCard.accentStyle === 'glow' && (
                        <div
                          className="h-1 w-full"
                          style={{
                            background: `linear-gradient(90deg, transparent, ${sample.color}, transparent)`,
                          }}
                        />
                      )}
                      {draftCard.accentStyle === 'ribbon' && (
                        <div className="absolute top-1.5 right-2 px-1.5 py-0.2 rounded text-[8px] font-bold bg-amber-400 text-amber-950">
                          VIP
                        </div>
                      )}
                      <div className="p-2.5 flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0"
                          style={{ backgroundColor: sample.color }}
                        >
                          {sample.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-xs font-bold truncate ${
                              draftCard.isDarkCard ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {sample.name}
                          </div>
                          <div className="text-[10px] text-blue-500 font-semibold truncate">
                            {sample.role}
                          </div>
                          <div
                            className={`text-[9px] truncate mt-0.5 ${
                              draftCard.isDarkCard ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {sample.tag}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Studio Dimension Selector + Controls */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  {[
                    { key: 'bg' as const, label: '① 设计画布底纹', icon: Palette },
                    { key: 'line' as const, label: '② 设计关系连线', icon: Activity },
                    { key: 'card' as const, label: '③ 设计人物卡片', icon: Layers },
                  ].map((sec) => {
                    const Icon = sec.icon;
                    return (
                      <button
                        key={sec.key}
                        type="button"
                        onClick={() => setStudioSection(sec.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          studioSection === sec.key
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{sec.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* SECTION 1: Background Designer */}
                {studioSection === 'bg' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          底纹图案类型
                        </label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[
                            { key: 'dots' as const, label: '圆点阵' },
                            { key: 'grid' as const, label: '方格网' },
                            { key: 'diagonal' as const, label: '斜纹网' },
                            { key: 'gradient' as const, label: '渐变色' },
                            { key: 'solid' as const, label: '纯色底' },
                          ].map((pt) => (
                            <button
                              key={pt.key}
                              type="button"
                              onClick={() =>
                                updateDraftBgAndApply({ patternType: pt.key })
                              }
                              className={`py-2 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                                (draftBg.patternType || 'dots') === pt.key
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              {pt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            画布背景底色
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={draftBg.backgroundColor}
                              onChange={(e) =>
                                updateDraftBgAndApply({
                                  backgroundColor: e.target.value,
                                })
                              }
                              className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                            />
                            <input
                              type="text"
                              value={draftBg.backgroundColor}
                              onChange={(e) =>
                                updateDraftBgAndApply({
                                  backgroundColor: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            网格/点阵颜色
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={
                                draftBg.patternColor?.startsWith('#')
                                  ? draftBg.patternColor
                                  : '#cbd5e1'
                              }
                              onChange={(e) =>
                                updateDraftBgAndApply({
                                  patternColor: e.target.value,
                                })
                              }
                              className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                            />
                            <input
                              type="text"
                              value={draftBg.patternColor || '#cbd5e1'}
                              onChange={(e) =>
                                updateDraftBgAndApply({
                                  patternColor: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                          <span>网格间距 (Spacing)</span>
                          <span className="font-mono text-indigo-600">
                            {draftBg.spacing || 24}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={14}
                          max={56}
                          step={2}
                          value={draftBg.spacing || 24}
                          onChange={(e) =>
                            updateDraftBgAndApply({
                              spacing: Number(e.target.value),
                            })
                          }
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      {(draftBg.patternType || 'dots') === 'dots' && (
                        <div>
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                            <span>点阵半径 (Dot Size)</span>
                            <span className="font-mono text-indigo-600">
                              {draftBg.dotRadius ?? 1.2}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.6}
                            max={3.2}
                            step={0.2}
                            value={draftBg.dotRadius ?? 1.2}
                            onChange={(e) =>
                              updateDraftBgAndApply({
                                dotRadius: Number(e.target.value),
                              })
                            }
                            className="w-full accent-indigo-600 cursor-pointer"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div>
                          <div className="text-xs font-bold text-slate-800">
                            深色背景模式适配
                          </div>
                          <div className="text-[11px] text-slate-500">
                            开启后自动将画布关系标签与辅助文字切换为浅色反白
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateDraftBgAndApply({ isDark: !draftBg.isDark })
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                            draftBg.isDark
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {draftBg.isDark ? '深色模式 (已开启)' : '浅色模式'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 2: Line Designer */}
                {studioSection === 'line' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          连线几何走向
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { key: 'bezier' as const, label: '平滑贝塞尔' },
                            { key: 'step' as const, label: '正交折线' },
                            { key: 'straight' as const, label: '极简直连' },
                            { key: 'arc' as const, label: '跨层圆弧' },
                          ].map((lt) => (
                            <button
                              key={lt.key}
                              type="button"
                              onClick={() =>
                                updateDraftLineAndApply({ lineType: lt.key })
                              }
                              className={`py-2 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                                draftLine.lineType === lt.key
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              {lt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          虚实线节奏样式
                        </label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[
                            { key: undefined, label: '标准实线' },
                            { key: '6,4', label: '轻巧虚线' },
                            { key: '10,5', label: '长虚线' },
                            { key: '2,3', label: '脉冲圆点' },
                            { key: '10,4,2,4', label: '点划线' },
                          ].map((dash, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() =>
                                updateDraftLineAndApply({
                                  strokeDasharray: dash.key,
                                })
                              }
                              className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                                (draftLine.strokeDasharray || undefined) === dash.key
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              {dash.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          终点锚点形态
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { key: 'standard' as const, label: '单端圆点' },
                            { key: 'both' as const, label: '双向圆点' },
                            { key: 'diamond' as const, label: '菱形锚点' },
                            { key: 'none' as const, label: '无端点' },
                          ].map((arr) => (
                            <button
                              key={arr.key}
                              type="button"
                              onClick={() =>
                                updateDraftLineAndApply({ arrowType: arr.key })
                              }
                              className={`py-1.5 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                                (draftLine.arrowType || 'standard') === arr.key
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              {arr.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                          <span>连线粗细 (Stroke Width)</span>
                          <span className="font-mono text-indigo-600">
                            {draftLine.strokeWidth}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1.0}
                          max={5.0}
                          step={0.2}
                          value={draftLine.strokeWidth}
                          onChange={(e) =>
                            updateDraftLineAndApply({
                              strokeWidth: Number(e.target.value),
                            })
                          }
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          外发光与立体光效
                        </label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[
                            { key: 'none' as const, label: '无光效' },
                            { key: 'neon-cyan' as const, label: '液冷青光' },
                            { key: 'neon-purple' as const, label: '紫晶荧光' },
                            { key: 'gold' as const, label: '流金光晕' },
                            { key: 'shadow-3d' as const, label: '立体投影' },
                          ].map((glow) => (
                            <button
                              key={glow.key}
                              type="button"
                              onClick={() =>
                                updateDraftLineAndApply({ glowEffect: glow.key })
                              }
                              className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                                (draftLine.glowEffect || 'none') === glow.key
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              {glow.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateDraftLineAndApply({
                              animated: !draftLine.animated,
                              strokeDasharray: !draftLine.animated
                                ? draftLine.strokeDasharray || '8,6'
                                : draftLine.strokeDasharray,
                            })
                          }
                          className={`py-2 px-3 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                            draftLine.animated
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {draftLine.animated ? '✓ 动态流光传输已开启' : '开启流光传输动画'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateDraftLineAndApply({
                              doubleLine: !draftLine.doubleLine,
                            })
                          }
                          className={`py-2 px-3 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                            draftLine.doubleLine
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {draftLine.doubleLine ? '✓ 双轨镂空干线已开启' : '开启双轨镂空干线'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 3: Card Designer */}
                {studioSection === 'card' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          卡片强调色装饰方式
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { key: 'bar' as const, label: '顶部色条' },
                            { key: 'glow' as const, label: '呼吸流光顶栏' },
                            { key: 'frame' as const, label: '角色色全包围框' },
                            { key: 'full' as const, label: '角色色彩浸染底' },
                            { key: 'ribbon' as const, label: '右上角 VIP 标' },
                            { key: 'minimal' as const, label: '极简无装饰' },
                          ].map((acc) => (
                            <button
                              key={acc.key}
                              type="button"
                              onClick={() =>
                                updateDraftCardAndApply({ accentStyle: acc.key })
                              }
                              className={`py-1.5 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                                draftCard.accentStyle === acc.key
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              {acc.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            自定义卡片底色
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={
                                draftCard.customBgColor ||
                                (draftCard.isDarkCard ? '#0f172a' : '#ffffff')
                              }
                              onChange={(e) =>
                                updateDraftCardAndApply({
                                  customBgColor: e.target.value,
                                })
                              }
                              className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateDraftCardAndApply({
                                  isDarkCard: !draftCard.isDarkCard,
                                  customBgColor: !draftCard.isDarkCard
                                    ? '#0f172a'
                                    : '#ffffff',
                                })
                              }
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              {draftCard.isDarkCard ? '深色文字反白' : '浅色深字模式'}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            自定义边框颜色
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={
                                draftCard.customBorderColor ||
                                (draftCard.isDarkCard ? '#334155' : '#cbd5e1')
                              }
                              onChange={(e) =>
                                updateDraftCardAndApply({
                                  customBorderColor: e.target.value,
                                })
                              }
                              className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateDraftCardAndApply({
                                  customBorderStyle:
                                    draftCard.customBorderStyle === 'dashed'
                                      ? 'solid'
                                      : 'dashed',
                                })
                              }
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              {draftCard.customBorderStyle === 'dashed'
                                ? '虚线边框'
                                : '实线边框'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                          <span>卡片圆角弧度 (Corner Radius)</span>
                          <span className="font-mono text-indigo-600">
                            {draftCard.customBorderRadius ?? 12}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={28}
                          step={2}
                          value={draftCard.customBorderRadius ?? 12}
                          onChange={(e) =>
                            updateDraftCardAndApply({
                              customBorderRadius: Number(e.target.value),
                            })
                          }
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                          <span>边框粗细 (Border Width)</span>
                          <span className="font-mono text-indigo-600">
                            {draftCard.customBorderWidth ?? 1}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={4}
                          step={0.5}
                          value={draftCard.customBorderWidth ?? 1}
                          onChange={(e) =>
                            updateDraftCardAndApply({
                              customBorderWidth: Number(e.target.value),
                            })
                          }
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          卡片阴影立体感
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { key: 'shadow-none', label: '扁平无影' },
                            { key: 'shadow-xs hover:shadow-md', label: '轻柔微影' },
                            { key: 'shadow-lg hover:shadow-xl', label: '悬浮立体' },
                            { key: 'shadow-[4px_4px_0px_#0f172a]', label: '波普硬投影' },
                          ].map((sh) => (
                            <button
                              key={sh.key}
                              type="button"
                              onClick={() =>
                                updateDraftCardAndApply({ shadowClass: sh.key })
                              }
                              className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                                draftCard.shadowClass === sh.key
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              {sh.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: 10 Curated Backgrounds */}
          {activeTab === 'backgrounds' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  已精选 10 款最具实用价值的画布底纹；点击任一卡片右上角「编辑」可基于该底纹自由定制颜色与网格间距。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStudioSection('bg');
                    setActiveTab('studio');
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>自定义底纹参数</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {BACKGROUND_STYLES.map((bg) => {
                  const isSelected = bg.id === bgStyleId;
                  return (
                    <div
                      key={bg.id}
                      onClick={() => onSelectBgStyle(bg.id)}
                      className={`group relative rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md bg-white ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className="relative h-22 w-full rounded-lg border border-slate-200/80 overflow-hidden mb-2.5 flex items-center justify-center shadow-inner"
                        style={{
                          backgroundColor: bg.backgroundColor,
                          backgroundImage: bg.backgroundImage,
                          backgroundSize: bg.backgroundSize || '24px 24px',
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shadow-2xs ${
                              bg.isDark
                                ? 'bg-slate-800/90 text-white border-slate-700'
                                : 'bg-white/95 text-slate-800 border-slate-200'
                            }`}
                          >
                            张明远
                          </div>
                          <div
                            className="w-4 h-0.5"
                            style={{ backgroundColor: bg.accentColor }}
                          />
                          <div
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shadow-2xs ${
                              bg.isDark
                                ? 'bg-slate-800/90 text-white border-slate-700'
                                : 'bg-white/95 text-slate-800 border-slate-200'
                            }`}
                          >
                            赵栋梁
                          </div>
                        </div>

                        {isSelected && (
                          <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                            <Check className="w-3 h-3 stroke-3" />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBgStyle(bg.id);
                            setDraftBg(bg);
                            setStudioSection('bg');
                            setActiveTab('studio');
                          }}
                          className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-white/90 hover:bg-white text-slate-700 text-[10px] font-semibold border border-slate-200 shadow-2xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          编辑
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {bg.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {bg.isDark ? '深色' : '浅色'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        {bg.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: 10 Curated Lines */}
          {activeTab === 'lines' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  已精选 10 款高频关系连线；点击任一卡片右上角「编辑」可自由定制线宽、虚线节奏、流光动画与发光特效。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStudioSection('line');
                    setActiveTab('studio');
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>自定义连线参数</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {LINE_STYLES.map((line) => {
                  const isSelected = line.id === lineStyleId;
                  const strokeColor =
                    line.glowEffect === 'neon-cyan'
                      ? '#06b6d4'
                      : line.glowEffect === 'neon-purple'
                      ? '#9333ea'
                      : line.glowEffect === 'gold'
                      ? '#d97706'
                      : '#3b82f6';

                  return (
                    <div
                      key={line.id}
                      onClick={() => onSelectLineStyle(line.id)}
                      className={`group relative rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md bg-white ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="relative h-20 w-full rounded-lg bg-slate-900 border border-slate-800 overflow-hidden mb-2.5 flex items-center justify-center">
                        <svg className="w-full h-full" viewBox="0 0 200 70">
                          {line.lineType === 'straight' ? (
                            <line
                              x1="25"
                              y1="35"
                              x2="175"
                              y2="35"
                              stroke={strokeColor}
                              strokeWidth={line.strokeWidth}
                              strokeDasharray={line.strokeDasharray}
                              className={line.animated ? 'animate-flow-dash' : ''}
                            />
                          ) : line.lineType === 'step' ? (
                            <path
                              d="M 25 20 L 100 20 L 100 50 L 175 50"
                              fill="none"
                              stroke={strokeColor}
                              strokeWidth={line.strokeWidth}
                              strokeDasharray={line.strokeDasharray}
                              className={line.animated ? 'animate-flow-dash' : ''}
                            />
                          ) : (
                            <path
                              d="M 25 45 C 75 15, 125 55, 175 25"
                              fill="none"
                              stroke={strokeColor}
                              strokeWidth={line.strokeWidth}
                              strokeDasharray={line.strokeDasharray}
                              className={line.animated ? 'animate-flow-dash' : ''}
                            />
                          )}
                          <circle
                            cx="25"
                            cy={
                              line.lineType === 'step'
                                ? 20
                                : line.lineType === 'straight'
                                ? 35
                                : 45
                            }
                            r="3"
                            fill="#cbd5e1"
                          />
                          <circle
                            cx="175"
                            cy={
                              line.lineType === 'step'
                                ? 50
                                : line.lineType === 'straight'
                                ? 35
                                : 25
                            }
                            r="3.5"
                            fill={strokeColor}
                          />
                        </svg>

                        {isSelected && (
                          <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                            <Check className="w-3 h-3 stroke-3" />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLineStyle(line.id);
                            setDraftLine(line);
                            setStudioSection('line');
                            setActiveTab('studio');
                          }}
                          className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-white/90 hover:bg-white text-slate-800 text-[10px] font-semibold shadow-2xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          编辑
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {line.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {line.strokeWidth}px
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        {line.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: 10 Curated Cards */}
          {activeTab === 'cards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  已精选 10 款高辨识度人物卡片风格；点击任一卡片右上角「编辑」可自由定制圆角、底色、边框与装饰条。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStudioSection('card');
                    setActiveTab('studio');
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>自定义卡片参数</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {CARD_STYLES.map((card) => {
                  const isSelected = card.id === cardStyleId;
                  return (
                    <div
                      key={card.id}
                      onClick={() => onSelectCardStyle(card.id)}
                      className={`group relative rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md bg-white ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="relative h-24 w-full rounded-lg bg-slate-100/70 p-2 border border-slate-200/60 overflow-hidden mb-2.5 flex items-center justify-center">
                        <div
                          className={`w-full p-2 border transition-all ${card.roundedClass} ${card.bgClass} ${card.borderClass} ${card.shadowClass}`}
                        >
                          {card.accentStyle === 'bar' && (
                            <div className="h-1 w-full bg-blue-500 rounded-full mb-1.5" />
                          )}
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                              张
                            </div>
                            <div className="flex-1 min-w-0">
                              <div
                                className={`text-[11px] font-bold truncate ${
                                  card.isDarkCard ? 'text-white' : 'text-slate-900'
                                }`}
                              >
                                张明远
                              </div>
                              <div className="text-[9px] text-blue-500 truncate font-semibold">
                                智算中心总指挥
                              </div>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                            <Check className="w-3 h-3 stroke-3" />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCardStyle(card.id);
                            setDraftCard(card);
                            setStudioSection('card');
                            setActiveTab('studio');
                          }}
                          className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-white/95 hover:bg-white text-slate-700 text-[10px] font-semibold border border-slate-200 shadow-2xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          编辑
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {card.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {card.isDarkCard ? '深色' : '浅色'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        {card.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            10 款精选底纹 × 10 款连线 × 10 款卡片 + <strong>无限制自定义样式设计</strong>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            完成并应用
          </button>
        </div>
      </div>
    </div>
  );
};

