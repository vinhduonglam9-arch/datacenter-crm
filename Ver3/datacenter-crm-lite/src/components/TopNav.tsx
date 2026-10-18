import React, { useState, useRef } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  HelpCircle,
  Download,
  Upload,
  FileImage,
  FileCode,
  FileText,
  FileJson,
  FileSpreadsheet,
  Undo2,
  Redo2,
  LayoutGrid,
  Layers,
  GitFork,
  Palette,
  ChevronDown,
  Server,
  Building2,
  BarChart3,
  Network,
  Globe,
  ScanLine,
  UserPlus,
  X,
  History,
  Presentation,
} from 'lucide-react';
import { ProjectMap } from '../types/crm.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface TopNavProps {
  activeView: 'dashboard' | 'canvas';
  onChangeView: (view: 'dashboard' | 'canvas') => void;
  projects: ProjectMap[];
  activeProject: ProjectMap;
  onSelectProject: (projectId: string) => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isLayerPanelOpen: boolean;
  onToggleLayerPanel: () => void;
  focusedPersonName?: string | null;
  onClearFocus?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onAutoLayoutFaction?: () => void;
  onAutoLayoutHierarchy?: () => void;
  onOpenSnapshotDiff?: () => void;
  hasActiveSnapshotDiff?: boolean;
  isPresentationMode?: boolean;
  onTogglePresentationMode?: () => void;
  onOpenOcrModal: () => void;
  onOpenStyleCenter: () => void;
  onOpenExportModal: () => void;
  onOpenQuickHelp: () => void;
  onOpenNewPerson: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onImportJson: (jsonData: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeView,
  onChangeView,
  projects,
  activeProject,
  onSelectProject,
  sidebarCollapsed,
  onToggleSidebar,
  isLayerPanelOpen,
  onToggleLayerPanel,
  focusedPersonName,
  onClearFocus,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onAutoLayoutFaction,
  onAutoLayoutHierarchy,
  onOpenSnapshotDiff,
  hasActiveSnapshotDiff = false,
  isPresentationMode = false,
  onTogglePresentationMode,
  onOpenOcrModal,
  onOpenStyleCenter,
  onOpenExportModal,
  onOpenQuickHelp,
  onOpenNewPerson,
  onExportCsv,
  onExportJson,
  onImportJson,
}) => {
  const { language, toggleLanguage, t } = useLanguage();
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          onImportJson(event.target.result);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <header className="h-12 px-3.5 bg-white border-b border-slate-200/90 flex items-center justify-between gap-3 select-none z-40 shrink-0">
      {/* Left Zone: Sidebar Toggle + Compact Brand + Icon View Switcher + Active Project Selector */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {activeView === 'canvas' && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0 cursor-pointer"
            title={sidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')}
            aria-label={sidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" strokeWidth={1.6} />
            ) : (
              <PanelLeftClose className="w-4 h-4" strokeWidth={1.6} />
            )}
          </button>
        )}

        {/* Compact Iconized Brand Mark */}
        <div
          onClick={() => onChangeView('canvas')}
          className="flex items-center gap-2 cursor-pointer shrink-0 group"
          title={t('appTitle')}
        >
          <div className="w-7 h-7 rounded-lg bg-slate-900 group-hover:bg-blue-600 text-white flex items-center justify-center transition-colors shadow-2xs">
            <Network className="w-3.5 h-3.5 text-blue-400 group-hover:text-white transition-colors" strokeWidth={1.8} />
          </div>
          <span className="hidden sm:inline text-xs font-bold tracking-tight text-slate-900">
            {language === 'zh' ? '智算作战室' : 'DC-CRM'}
          </span>
        </div>

        <div className="h-4 w-[1px] bg-slate-200 shrink-0 mx-0.5" />

        {/* Icon-Only Segmented View Switcher (Dashboard vs Topology Canvas) */}
        <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 border border-slate-200/70 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => onChangeView('dashboard')}
            className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center ${
              activeView === 'dashboard'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title={t('navDashboard')}
            aria-label={t('navDashboard')}
          >
            <BarChart3 className="w-3.5 h-3.5" strokeWidth={1.7} />
          </button>
          <button
            type="button"
            onClick={() => onChangeView('canvas')}
            className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center ${
              activeView === 'canvas'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title={t('navCanvas')}
            aria-label={t('navCanvas')}
          >
            <Network className="w-3.5 h-3.5" strokeWidth={1.7} />
          </button>
        </div>

        {/* Active Project Selector Pill with Condensed Telemetry Badges */}
        <div className="relative min-w-0">
          <button
            type="button"
            onClick={() => {
              setShowProjectMenu(!showProjectMenu);
              setShowLayoutMenu(false);
              setShowExportMenu(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-lg text-xs font-semibold text-slate-800 transition-colors cursor-pointer max-w-full"
            title={`${activeProject.name} · ${activeProject.companyName} · ${activeProject.scaleMw} · ${activeProject.targetPue} · ${activeProject.contractBudget} · ${activeProject.biddingStage}`}
            aria-label={t('switchProject')}
          >
            <Server className="w-3.5 h-3.5 text-blue-600 shrink-0" strokeWidth={1.6} />
            <span className="truncate max-w-[140px] sm:max-w-[220px] md:max-w-[260px]">
              {activeProject.name}
            </span>
            <span className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-white border border-slate-200/80 text-[10px] font-mono text-slate-600 shrink-0">
              <span>{activeProject.scaleMw || '32 MW'}</span>
              <span className="text-slate-300">·</span>
              <span className="text-emerald-700 font-semibold">{activeProject.targetPue || 'PUE≤1.15'}</span>
              <span className="text-slate-300">·</span>
              <span className="text-blue-600 font-semibold">{activeProject.contractBudget || '¥4.85亿'}</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.6} />
          </button>

          {showProjectMenu && (
            <div
              className="absolute left-0 mt-1.5 w-[420px] max-w-[92vw] bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50"
              onMouseLeave={() => setShowProjectMenu(false)}
            >
              <div className="px-3.5 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-100 flex items-center justify-between">
                <span>
                  {t('switchProject')} ({projects.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowProjectMenu(false);
                    onChangeView('dashboard');
                  }}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  {t('openProjectDashboard')}
                </button>
              </div>
              {projects.map((proj) => {
                const isCurrent = proj.id === activeProject.id;
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => {
                      onSelectProject(proj.id);
                      setShowProjectMenu(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-left transition-colors flex flex-col gap-1 border-b border-slate-50 last:border-b-0 cursor-pointer ${
                      isCurrent ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-bold text-xs ${isCurrent ? 'text-blue-700' : 'text-slate-900'}`}>
                        {proj.name}
                      </span>
                      <span className="font-mono tabular-nums text-[11px] font-semibold text-blue-600 shrink-0">
                        {proj.contractBudget}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap font-mono tabular-nums">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" strokeWidth={1.5} />
                        {proj.companyName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{proj.scaleMw}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-700">{proj.targetPue}</span>
                      <span aria-hidden="true">·</span>
                      <span>{proj.biddingStage}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Compact Active Focus Badge */}
        {focusedPersonName && (
          <div className="hidden md:flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-[11px] font-medium shrink-0">
            <span className="truncate max-w-[120px]">{focusedPersonName}</span>
            <button
              type="button"
              onClick={onClearFocus}
              className="hover:text-blue-950 p-0.5 rounded hover:bg-blue-100 cursor-pointer"
              title={t('clearFocus')}
            >
              <X className="w-3 h-3" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {/* Right Zone: Pure Iconized Action Dock (Minimal Text, Clear Visual Grouping) */}
      <div className="flex items-center gap-1 shrink-0">
        {activeView === 'canvas' && (
          <>
            {/* Undo / Redo Icon Group */}
            <div className="hidden sm:flex items-center gap-0.5 bg-slate-50 border border-slate-200/80 rounded-lg p-0.5">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors disabled:opacity-30 cursor-pointer"
                title={t('undo')}
                aria-label={t('undo')}
              >
                <Undo2 className="w-3.5 h-3.5" strokeWidth={1.6} />
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors disabled:opacity-30 cursor-pointer"
                title={t('redo')}
                aria-label={t('redo')}
              >
                <Redo2 className="w-3.5 h-3.5" strokeWidth={1.6} />
              </button>
            </div>

            <div className="hidden sm:block h-4 w-[1px] bg-slate-200 mx-0.5" />
          </>
        )}

        {/* Tactical Analysis & Canvas Organization Icon Group */}
        <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200/80 rounded-lg p-0.5">
          {/* Historical Snapshot & Diff Comparison */}
          {onOpenSnapshotDiff && (
            <button
              type="button"
              onClick={onOpenSnapshotDiff}
              className={`relative p-1.5 rounded-md transition-colors cursor-pointer ${
                hasActiveSnapshotDiff
                  ? 'bg-amber-500 text-slate-950 shadow-2xs'
                  : 'text-slate-600 hover:text-amber-600 hover:bg-white'
              }`}
              title="⏱ 历史快照与演进对比 (Snapshot Diff)"
              aria-label="历史快照对比"
            >
              <History className="w-4 h-4" strokeWidth={1.6} />
              {hasActiveSnapshotDiff && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </button>
          )}

          {/* Presentation & Spotlight Mode (Canvas Only) */}
          {activeView === 'canvas' && onTogglePresentationMode && (
            <button
              type="button"
              onClick={onTogglePresentationMode}
              className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer ${
                isPresentationMode
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-indigo-700 bg-indigo-50/90 hover:bg-indigo-600 hover:text-white'
              }`}
              title="🎬 进入路演汇报聚焦模式 (阵营镜头巡航 · 激光笔 · 节点聚光灯)"
              aria-label="路演汇报"
            >
              <Presentation className="w-3.5 h-3.5" strokeWidth={1.8} />
              <span className="hidden lg:inline">路演汇报</span>
            </button>
          )}

          {/* Auto Layout Dropdown (Canvas Only) */}
          {activeView === 'canvas' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowLayoutMenu(!showLayoutMenu);
                  setShowProjectMenu(false);
                  setShowExportMenu(false);
                }}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  showLayoutMenu
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-white'
                }`}
                title={t('autoLayout')}
                aria-label={t('autoLayout')}
              >
                <LayoutGrid className="w-4 h-4" strokeWidth={1.6} />
              </button>

              {showLayoutMenu && (
                <div
                  className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs"
                  onMouseLeave={() => setShowLayoutMenu(false)}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowLayoutMenu(false);
                      onAutoLayoutFaction?.();
                    }}
                    className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <GitFork className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={1.6} />
                    <div>
                      <div className="font-semibold text-slate-900">{t('factionLayout')}</div>
                      <div className="text-[10px] text-slate-400">{t('factionLayoutDesc')}</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLayoutMenu(false);
                      onAutoLayoutHierarchy?.();
                    }}
                    className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors border-t border-slate-100 cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-indigo-600 shrink-0" strokeWidth={1.6} />
                    <div>
                      <div className="font-semibold text-slate-900">{t('hierarchyLayout')}</div>
                      <div className="text-[10px] text-slate-400">{t('hierarchyLayoutDesc')}</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Layer Manager Toggle (Canvas Only) */}
          {activeView === 'canvas' && (
            <button
              type="button"
              onClick={onToggleLayerPanel}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isLayerPanelOpen
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-white'
              }`}
              title={t('layerManagerTip')}
              aria-label={t('layerManager')}
            >
              <Layers className="w-4 h-4" strokeWidth={1.6} />
            </button>
          )}

        </div>

        <div className="h-4 w-[1px] bg-slate-200 mx-0.5" />

        {/* Style, Export, Language & Help Icon Group */}
        <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200/80 rounded-lg p-0.5">
          {/* Style Center */}
          <button
            type="button"
            onClick={onOpenStyleCenter}
            className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-white rounded-md transition-colors cursor-pointer"
            title={t('styleCenterTip')}
            aria-label={t('navStyleCenter')}
          >
            <Palette className="w-4 h-4" strokeWidth={1.6} />
          </button>

          {/* Export & Backup Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowExportMenu(!showExportMenu);
                setShowProjectMenu(false);
                setShowLayoutMenu(false);
              }}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                showExportMenu
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-white'
              }`}
              title={t('exportAndBackup')}
              aria-label={t('exportAndBackup')}
            >
              <Download className="w-4 h-4" strokeWidth={1.6} />
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onOpenExportModal();
                  }}
                  className="w-full px-3.5 py-2 text-left text-blue-700 bg-blue-50/50 hover:bg-blue-50 flex items-center gap-2.5 transition-colors font-semibold border-b border-slate-100 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
                  <div>
                    <div className="font-bold text-slate-900">{t('exportTitle')}</div>
                    <div className="text-[10px] text-slate-500 font-normal">{t('exportSubtitle')}</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onOpenExportModal();
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileImage className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                  <span>{t('exportPng')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onOpenExportModal();
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                  <span>{t('exportSvg')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onOpenExportModal();
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                  <span>{t('exportPdf')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportCsv();
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                  <span>{t('exportCsv')}</span>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportJson();
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                  <span>{t('saveBackupJson')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                  <span>{t('restoreBackupJson')}</span>
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>

          {/* Language Switcher Icon */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors cursor-pointer relative"
            title={language === 'zh' ? 'Switch to English' : '切换至简体中文'}
            aria-label={language === 'zh' ? 'Switch to English' : '切换至简体中文'}
          >
            <Globe className="w-4 h-4" strokeWidth={1.6} />
          </button>

          {/* Quick Help Icon */}
          <button
            type="button"
            onClick={onOpenQuickHelp}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors cursor-pointer"
            title={t('shortcutsAndGuide')}
            aria-label={t('shortcutsAndGuide')}
          >
            <HelpCircle className="w-4 h-4" strokeWidth={1.6} />
          </button>
        </div>

        {/* Primary Action: New Stakeholder Icon Button */}
        <button
          type="button"
          onClick={onOpenNewPerson}
          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shrink-0 cursor-pointer shadow-2xs flex items-center justify-center"
          title={t('newStakeholder')}
          aria-label={t('newStakeholder')}
        >
          <UserPlus className="w-4 h-4" strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
};
