import React, { useState, useRef } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Image as ImageIcon,
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
  Sparkles,
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
  onOpenInfluencePath?: () => void;
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
  onOpenInfluencePath,
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
    <div className="bg-white border-b border-slate-200 select-none z-30 shrink-0">
      {/* Row 1: Strict 3-Zone Top Bar Contract */}
      <header className="h-12 px-5 flex items-center justify-between gap-8 border-b border-slate-100">
        {/* Zone 1: Single text element wordmark */}
        <span
          onClick={() => onChangeView('canvas')}
          className="text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {t('appTitle')}
        </span>

        {/* Zone 2: 5 clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onChangeView('dashboard')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer underline-offset-4 ${
              activeView === 'dashboard'
                ? 'text-blue-600 font-bold underline'
                : 'hover:text-slate-900 hover:underline'
            }`}
          >
            {t('navDashboard')}
          </button>
          <button
            type="button"
            onClick={() => onChangeView('canvas')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer underline-offset-4 ${
              activeView === 'canvas'
                ? 'text-blue-600 font-bold underline'
                : 'hover:text-slate-900 hover:underline'
            }`}
          >
            {t('navCanvas')}
          </button>
          <button
            type="button"
            onClick={onOpenInfluencePath}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t('navInfluencePath')}
          </button>
          <button
            type="button"
            onClick={onOpenStyleCenter}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t('navStyleCenter')}
          </button>
          <button
            type="button"
            onClick={onOpenExportModal}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t('navExport')}
          </button>
        </nav>

        {/* Zone 3: Language Switcher + 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors whitespace-nowrap cursor-pointer"
            title={language === 'zh' ? 'Switch to English' : '切换至简体中文'}
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.5} />
            <span className="font-mono text-[11px] font-semibold">{t('languageSwitch')}</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewPerson}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            {t('newStakeholder')}
          </button>
        </div>
      </header>

      {/* Row 2: Data Center Project Engineering Ledger & Workspace Toolbar */}
      <div className="h-10 px-4 bg-slate-50/80 flex items-center justify-between gap-4 text-xs">
        {/* Left: View Switcher + Sidebar Toggle + Active Project Selector + Unboxed Telemetry */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {activeView === 'canvas' && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors shrink-0 cursor-pointer"
              title={sidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')}
              aria-label={sidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <PanelLeftClose className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>
          )}

          {/* Segmented View Switcher (Dashboard vs Canvas) */}
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-200/75 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => onChangeView('dashboard')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeView === 'dashboard'
                  ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>{t('navDashboard')}</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeView('canvas')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeView === 'canvas'
                  ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Network className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>{t('navCanvas')}</span>
            </button>
          </div>

          {/* Project Switcher Dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowProjectMenu(!showProjectMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-xs font-semibold text-slate-900 transition-colors whitespace-nowrap cursor-pointer"
              aria-label={t('switchProject')}
            >
              <Server className="w-3.5 h-3.5 text-blue-600 shrink-0" strokeWidth={1.5} />
              <span className="max-w-[155px] sm:max-w-[300px] truncate">{activeProject.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.5} />
            </button>

            {showProjectMenu && (
              <div
                className="absolute left-0 mt-1.5 w-[440px] max-w-[92vw] bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50"
                onMouseLeave={() => setShowProjectMenu(false)}
              >
                <div className="px-3.5 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-100 flex items-center justify-between">
                  <span>{t('switchProject')} ({projects.length})</span>
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
                        <span>{proj.companyName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{proj.scaleMw}</span>
                        <span aria-hidden="true">·</span>
                        <span>{proj.targetPue}</span>
                        <span aria-hidden="true">·</span>
                        <span>{proj.biddingStage}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unboxed Data Center Engineering Telemetry Metadata */}
          <div className="hidden xl:flex items-center gap-2 text-[11px] text-slate-500 truncate font-mono tabular-nums">
            <span className="text-slate-700 font-medium flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" strokeWidth={1.5} />
              {activeProject.companyName}
            </span>
            <span aria-hidden="true">·</span>
            <span>{activeProject.scaleMw || '32 MW'}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700 font-semibold">{activeProject.targetPue || 'PUE ≤ 1.15'}</span>
            <span aria-hidden="true">·</span>
            <span className="text-blue-700 font-semibold">{t('budgetLabel')} {activeProject.contractBudget || '¥ 4.85 亿'}</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-600">{activeProject.biddingStage}</span>
          </div>

          {/* Active Focus Indicator */}
          {focusedPersonName && (
            <div className="flex items-center gap-1.5 text-blue-700 text-xs font-medium shrink-0">
              <span>{t('focusLabel')}: {focusedPersonName}</span>
              <button
                type="button"
                onClick={onClearFocus}
                className="hover:text-blue-950 font-bold px-1 cursor-pointer"
                title={t('clearFocus')}
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Right: Workspace Canvas Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {activeView === 'canvas' && (
            <>
              {/* Undo / Redo */}
              <div className="hidden lg:flex items-center gap-0.5 border-r border-slate-200 pr-2 mr-1">
                <button
                  type="button"
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded transition-colors disabled:opacity-30 cursor-pointer"
                  title={t('undo')}
                  aria-label={t('undo')}
                >
                  <Undo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded transition-colors disabled:opacity-30 cursor-pointer"
                  title={t('redo')}
                  aria-label={t('redo')}
                >
                  <Redo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>

              {/* Layer Manager Toggle */}
              <button
                type="button"
                onClick={onToggleLayerPanel}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer border ${
                  isLayerPanelOpen
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
                title={t('layerManagerTip')}
              >
                <Layers className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="hidden sm:inline">{t('layerManager')}</span>
              </button>

              {/* Auto Layout Dropdown */}
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                  title={t('autoLayout')}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                  <span className="hidden sm:inline">{t('autoLayout')}</span>
                </button>
                {showLayoutMenu && (
                  <div
                    className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-50 text-xs"
                    onMouseLeave={() => setShowLayoutMenu(false)}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowLayoutMenu(false);
                        onAutoLayoutFaction?.();
                      }}
                      className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <GitFork className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.5} />
                      <div>
                        <div className="font-medium text-slate-900">{t('factionLayout')}</div>
                        <div className="text-[10px] text-slate-400">{t('factionLayoutDesc')}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLayoutMenu(false);
                        onAutoLayoutHierarchy?.();
                      }}
                      className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors border-t border-slate-100 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.5} />
                      <div>
                        <div className="font-medium text-slate-900">{t('hierarchyLayout')}</div>
                        <div className="text-[10px] text-slate-400">{t('hierarchyLayoutDesc')}</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}


          {/* Style Center */}
          <button
            type="button"
            onClick={onOpenStyleCenter}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors whitespace-nowrap cursor-pointer"
            title={t('styleCenterTip')}
          >
            <Palette className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
            <span className="hidden sm:inline">{t('navStyleCenter')}</span>
          </button>

          {/* Export Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap border border-slate-200 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
              <span className="hidden sm:inline">{t('exportAndBackup')}</span>
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

          {/* Quick Help */}
          <button
            type="button"
            onClick={onOpenQuickHelp}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
            title={t('shortcutsAndGuide')}
            aria-label={t('shortcutsAndGuide')}
          >
            <HelpCircle className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
};
