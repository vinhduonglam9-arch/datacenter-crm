import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  BACKGROUND_STYLES,
  LINE_STYLES,
  CARD_STYLES,
  CURATED_THEME_BUNDLES,
  CuratedThemeBundle,
} from '../utils/theme-presets.ts';
import {
  BackgroundStyleId,
  LineStyleId,
  CardStyleId,
} from '../types/styles.ts';

interface StyleCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  bgStyleId: BackgroundStyleId;
  lineStyleId: LineStyleId;
  cardStyleId: CardStyleId;
  onSelectBgStyle: (id: BackgroundStyleId) => void;
  onSelectLineStyle: (id: LineStyleId) => void;
  onSelectCardStyle: (id: CardStyleId) => void;
  onApplyBundle: (bundle: CuratedThemeBundle) => void;
  onResetDefaults: () => void;
}

type TabKey = 'bundles' | 'backgrounds' | 'lines' | 'cards';

export const StyleCenterModal: React.FC<StyleCenterModalProps> = ({
  isOpen,
  onClose,
  bgStyleId,
  lineStyleId,
  cardStyleId,
  onSelectBgStyle,
  onSelectLineStyle,
  onSelectCardStyle,
  onApplyBundle,
  onResetDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('bundles');
  const [bgCategoryFilter, setBgCategoryFilter] = useState<string>('all');
  const [lineCategoryFilter, setLineCategoryFilter] = useState<string>('all');
  const [cardCategoryFilter, setCardCategoryFilter] = useState<string>('all');

  if (!isOpen) return null;

  const activeBg = BACKGROUND_STYLES.find((b) => b.id === bgStyleId) || BACKGROUND_STYLES[0];
  const activeLine = LINE_STYLES.find((l) => l.id === lineStyleId) || LINE_STYLES[0];
  const activeCard = CARD_STYLES.find((c) => c.id === cardStyleId) || CARD_STYLES[0];

  const filteredBgs =
    bgCategoryFilter === 'all'
      ? BACKGROUND_STYLES
      : BACKGROUND_STYLES.filter((b) => b.category === bgCategoryFilter);

  const filteredLines =
    lineCategoryFilter === 'all'
      ? LINE_STYLES
      : LINE_STYLES.filter((l) => l.category === lineCategoryFilter);

  const filteredCards =
    cardCategoryFilter === 'all'
      ? CARD_STYLES
      : CARD_STYLES.filter((c) => c.category === cardCategoryFilter);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                画布全景视觉样式中心 (20×20×20)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                自由组合 20 种画布底纹 · 20 种连线特效 · 20 种人物卡片视觉风格
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between text-xs gap-2 shrink-0">
          <div className="flex items-center gap-3 text-slate-600 font-medium">
            <span className="text-slate-400">当前生效组合：</span>
            <span>
              画布底纹 <strong className="text-slate-900">{activeBg.name}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              连线风格 <strong className="text-slate-900">{activeLine.name}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              人物卡片 <strong className="text-slate-900">{activeCard.name}</strong>
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            所有更改实时同步至画布与导出中心
          </div>
        </div>

        <div className="px-6 pt-3 border-b border-slate-200 bg-white flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('bundles')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'bundles'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>大师级一键套装 (8套)</span>
          </button>

          <button
            onClick={() => setActiveTab('backgrounds')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'backgrounds'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>画布底纹 (20种)</span>
          </button>

          <button
            onClick={() => setActiveTab('lines')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'lines'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>关系连线 (20种)</span>
          </button>

          <button
            onClick={() => setActiveTab('cards')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'cards'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>人物卡片 (20种)</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/60">
          {activeTab === 'bundles' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
                        {isCurrent && (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'backgrounds' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1.5 pb-2">
                {[
                  { key: 'all', label: '全部底纹 (20)' },
                  { key: 'light', label: '浅色清爽 (8)' },
                  { key: 'dark', label: '深色大屏 (6)' },
                  { key: 'gradient', label: '柔和渐变 (3)' },
                  { key: 'texture', label: '质感肌理 (3)' },
                ].map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setBgCategoryFilter(cat.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      bgCategoryFilter === cat.key
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {filteredBgs.map((bg, idx) => {
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
                        <div className="flex items-center gap-2">
                          <div
                            className={`px-2 py-1 rounded text-[9px] font-bold border shadow-xs ${
                              bg.isDark
                                ? 'bg-slate-800/90 text-white border-slate-700'
                                : 'bg-white/95 text-slate-800 border-slate-200'
                            }`}
                          >
                            张明远
                          </div>
                          <div
                            className="w-5 h-0.5"
                            style={{ backgroundColor: bg.accentColor }}
                          />
                          <div
                            className={`px-2 py-1 rounded text-[9px] font-bold border shadow-xs ${
                              bg.isDark
                                ? 'bg-slate-800/90 text-white border-slate-700'
                                : 'bg-white/95 text-slate-800 border-slate-200'
                            }`}
                          >
                            赵栋梁
                          </div>
                        </div>

                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                            <Check className="w-3 h-3 stroke-3" />
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1.5 text-[9px] text-slate-400 font-mono">
                          #{idx + 1}
                        </span>
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

          {activeTab === 'lines' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1.5 pb-2">
                {[
                  { key: 'all', label: '全部连线 (20)' },
                  { key: 'standard', label: '标准曲线 (5)' },
                  { key: 'geometry', label: '几何折弧 (4)' },
                  { key: 'dash', label: '虚线节奏 (4)' },
                  { key: 'special', label: '流光特效 (7)' },
                ].map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setLineCategoryFilter(cat.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      lineCategoryFilter === cat.key
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {filteredLines.map((line, idx) => {
                  const isSelected = line.id === lineStyleId;
                  const strokeColor =
                    line.glowEffect === 'neon-cyan'
                      ? '#06b6d4'
                      : line.glowEffect === 'neon-purple'
                      ? '#9333ea'
                      : line.glowEffect === 'gold'
                      ? '#d97706'
                      : line.id === 'warning-hazard'
                      ? '#ef4444'
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
                          <circle cx="25" cy={line.lineType === 'step' ? 20 : line.lineType === 'straight' ? 35 : 45} r="3" fill="#cbd5e1" />
                          <circle cx="175" cy={line.lineType === 'step' ? 50 : line.lineType === 'straight' ? 35 : 25} r="3.5" fill={strokeColor} />
                          <g transform="translate(100, 35)">
                            <rect x="-24" y="-8" width="48" height="16" rx="4" fill="#1e293b" stroke={strokeColor} strokeWidth="1" />
                            <text x="0" y="3" textAnchor="middle" fill="#f8fafc" fontSize="8" fontWeight="600">
                              拍板决策
                            </text>
                          </g>
                        </svg>

                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                            <Check className="w-3 h-3 stroke-3" />
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1.5 text-[9px] text-slate-400 font-mono">
                          #{idx + 1}
                        </span>
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

          {activeTab === 'cards' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1.5 pb-2">
                {[
                  { key: 'all', label: '全部卡片 (20)' },
                  { key: 'classic', label: '商务经典 (2)' },
                  { key: 'modern', label: '现代通透 (9)' },
                  { key: 'dark', label: '深色极客 (4)' },
                  { key: 'creative', label: '创意设计 (5)' },
                ].map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setCardCategoryFilter(cat.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      cardCategoryFilter === cat.key
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {filteredCards.map((card, idx) => {
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
                          className={`w-full max-w-[190px] p-2 border transition-all ${card.roundedClass} ${card.bgClass} ${card.borderClass} ${card.shadowClass}`}
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
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                            <Check className="w-3 h-3 stroke-3" />
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1.5 text-[9px] text-slate-400 font-mono">
                          #{idx + 1}
                        </span>
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

        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            20 底纹 × 20 连线 × 20 卡片 = <strong>8,000 种视觉组合</strong>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            完成并关闭
          </button>
        </div>
      </div>
    </div>
  );
};
