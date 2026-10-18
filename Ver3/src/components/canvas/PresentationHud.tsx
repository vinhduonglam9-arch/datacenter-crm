import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Zap,
  BookmarkPlus,
  X,
  LogOut,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { GroupFrame, CameraBookmark, CanvasToolMode } from '../../types/crm.ts';

export interface PresentationStopItem {
  id: string;
  label: string;
  kind: 'frame' | 'bookmark';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  panX?: number;
  panY?: number;
  zoom?: number;
  color?: string;
}

interface PresentationHudProps {
  groupFrames: GroupFrame[];
  cameraBookmarks?: CameraBookmark[];
  activeStopId: string | null;
  toolMode: CanvasToolMode;
  hasFocusedPerson: boolean;
  focusedPersonName?: string | null;
  onSelectStop: (stop: PresentationStopItem) => void;
  onFitAll: () => void;
  onToggleLaser: () => void;
  onClearSpotlight: () => void;
  onSaveCurrentBookmark: (title: string) => void;
  onDeleteBookmark: (bookmarkId: string) => void;
  onExitPresentation: () => void;
}

export const PresentationHud: React.FC<PresentationHudProps> = React.memo(
  ({
    groupFrames = [],
    cameraBookmarks = [],
    activeStopId,
    toolMode,
    hasFocusedPerson,
    focusedPersonName,
    onSelectStop,
    onFitAll,
    onToggleLaser,
    onClearSpotlight,
    onSaveCurrentBookmark,
    onDeleteBookmark,
    onExitPresentation,
  }) => {
    const [isAddingBookmark, setIsAddingBookmark] = useState(false);
    const [bookmarkTitle, setBookmarkTitle] = useState('');
    const [isBarHidden, setIsBarHidden] = useState(false);

    const isLaserActive = toolMode === 'laser';

    // Build ordered tactical camera stops from visible GroupFrames + custom CameraBookmarks
    const stops = useMemo<PresentationStopItem[]>(() => {
      const sortedFrames = [...groupFrames].sort((a, b) => {
        if (Math.abs(a.x - b.x) > 120) return a.x - b.x;
        return a.y - b.y;
      });

      const frameStops: PresentationStopItem[] = sortedFrames.map((f) => ({
        id: f.id,
        label: f.title,
        kind: 'frame',
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        color: f.color,
      }));

      const bookmarkStops: PresentationStopItem[] = cameraBookmarks.map((bm) => ({
        id: bm.id,
        label: bm.title,
        kind: 'bookmark',
        panX: bm.panX,
        panY: bm.panY,
        zoom: bm.zoom,
      }));

      return [...frameStops, ...bookmarkStops];
    }, [groupFrames, cameraBookmarks]);

    const activeStopIndex = useMemo(() => {
      if (!activeStopId) return -1;
      return stops.findIndex((s) => s.id === activeStopId);
    }, [stops, activeStopId]);

    const handlePrevStop = useCallback(() => {
      if (stops.length === 0) {
        onFitAll();
        return;
      }
      if (activeStopIndex <= 0) {
        onFitAll();
      } else {
        onSelectStop(stops[activeStopIndex - 1]);
      }
    }, [stops, activeStopIndex, onFitAll, onSelectStop]);

    const handleNextStop = useCallback(() => {
      if (stops.length === 0) {
        onFitAll();
        return;
      }
      if (activeStopIndex < 0) {
        onSelectStop(stops[0]);
      } else if (activeStopIndex + 1 < stops.length) {
        onSelectStop(stops[activeStopIndex + 1]);
      } else {
        onFitAll();
      }
    }, [stops, activeStopIndex, onFitAll, onSelectStop]);

    // Keyboard navigation in Presentation Mode (Capture phase to override default Space/Esc)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const el = document.activeElement;
        if (
          el &&
          (el.tagName.toLowerCase() === 'input' ||
            el.tagName.toLowerCase() === 'textarea' ||
            (el as HTMLElement).isContentEditable)
        ) {
          return;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          if (hasFocusedPerson) {
            onClearSpotlight();
          } else {
            onExitPresentation();
          }
          return;
        }

        if (e.key === 'ArrowRight' || e.code === 'Space') {
          e.preventDefault();
          e.stopPropagation();
          handleNextStop();
          return;
        }

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          handlePrevStop();
          return;
        }

        if (e.key.toLowerCase() === 'h') {
          e.preventDefault();
          e.stopPropagation();
          setIsBarHidden((prev) => !prev);
          return;
        }
      };

      window.addEventListener('keydown', handleKeyDown, { capture: true });
      return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [handleNextStop, handlePrevStop, hasFocusedPerson, onClearSpotlight, onExitPresentation]);

    const handleSaveBookmark = (e: React.FormEvent) => {
      e.preventDefault();
      const title = bookmarkTitle.trim() || `视角 ${cameraBookmarks.length + 1}`;
      onSaveCurrentBookmark(title);
      setBookmarkTitle('');
      setIsAddingBookmark(false);
    };

    // Collapsed / Hidden state: ultra-thin bottom pill
    if (isBarHidden) {
      return (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setIsBarHidden(false)}
            className="px-2.5 py-0.5 rounded-full bg-slate-900/50 hover:bg-slate-900/90 text-white/75 hover:text-white border border-slate-700/50 shadow-md backdrop-blur-xs text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer"
            title="展开路演控制栏 (H)"
          >
            <ChevronUp className="w-3 h-3" />
            <span>路演栏</span>
          </button>
        </div>
      );
    }

    return (
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] flex flex-col items-center gap-1.5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Optional Custom Bookmark Input Popover */}
        {isAddingBookmark && (
          <form
            onSubmit={handleSaveBookmark}
            className="bg-slate-900/95 text-white px-2.5 py-1 rounded-full border border-slate-700 shadow-xl flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-150"
          >
            <input
              type="text"
              autoFocus
              value={bookmarkTitle}
              onChange={(e) => setBookmarkTitle(e.target.value)}
              placeholder="输入当前视角书签名称…"
              className="px-2 py-0.5 bg-slate-800 border border-slate-600 rounded-full text-[11px] text-white focus:outline-none focus:border-indigo-400 w-44"
            />
            <button
              type="submit"
              className="px-2 py-0.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-[11px] font-bold cursor-pointer"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => setIsAddingBookmark(false)}
              className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </form>
        )}

        {/* Ultra-Slim Presentation Toolbar */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md text-white px-2 py-1 rounded-full border border-slate-700/80 shadow-xl">
          {/* Active Person Spotlight Indicator (if any) */}
          {hasFocusedPerson && (
            <>
              <button
                type="button"
                onClick={onClearSpotlight}
                className="px-2 py-0.5 rounded-full bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/40 text-[11px] font-semibold text-amber-200 flex items-center gap-1 transition-colors cursor-pointer"
                title="点击清除节点聚焦 (Esc)"
              >
                <span className="max-w-20 truncate">{focusedPersonName || '已聚焦'}</span>
                <X className="w-2.5 h-2.5 shrink-0" />
              </button>
              <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />
            </>
          )}

          {/* Prev Camera Cruise Arrow */}
          <button
            type="button"
            onClick={handlePrevStop}
            className="p-1 rounded-full hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="上一镜头 (← 左方向键)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Camera Bookmark Capsules */}
          <div className="flex items-center gap-0.5 overflow-x-auto max-w-[60vw] px-0.5 no-scrollbar">
            {/* Overview Stop */}
            <button
              type="button"
              onClick={onFitAll}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                activeStopId === null
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title="全局总览"
            >
              <Maximize2 className="w-2.5 h-2.5 text-indigo-300" />
              <span>总览</span>
            </button>

            {stops.map((stop, idx) => {
              const isActive = stop.id === activeStopId;
              return (
                <div key={stop.id} className="flex items-center group relative">
                  <button
                    type="button"
                    onClick={() => onSelectStop(stop)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {stop.color && (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: stop.color }}
                      />
                    )}
                    <span>
                      {idx + 1}.{stop.label}
                    </span>
                  </button>
                  {stop.kind === 'bookmark' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBookmark(stop.id);
                      }}
                      className="p-0.5 rounded-full text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="删除书签"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Next Camera Cruise Arrow */}
          <button
            type="button"
            onClick={handleNextStop}
            className="p-1 rounded-full hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="下一镜头 (→ 右方向键 / 空格键)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Save Current Camera as Bookmark (Icon) */}
          <button
            type="button"
            onClick={() => setIsAddingBookmark((prev) => !prev)}
            className={`p-1 rounded-full transition-colors cursor-pointer ${
              isAddingBookmark
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:bg-slate-700/80 hover:text-white'
            }`}
            title="保存当前视角为书签"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />

          {/* Red Laser Pointer Toggle (Icon Only) */}
          <button
            type="button"
            onClick={onToggleLaser}
            className={`p-1 rounded-full transition-all cursor-pointer ${
              isLaserActive
                ? 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-400'
                : 'text-slate-300 hover:bg-slate-700/80 hover:text-white'
            }`}
            title={isLaserActive ? '关闭红色激光笔' : '开启红色激光笔'}
            aria-label="激光笔"
          >
            <Zap className={`w-3.5 h-3.5 ${isLaserActive ? 'text-amber-200' : 'text-amber-400'}`} />
          </button>

          {/* Hide / Collapse Toolbar Button (Icon Only) */}
          <button
            type="button"
            onClick={() => setIsBarHidden(true)}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-700/80 hover:text-white transition-colors cursor-pointer"
            title="隐藏路演工具栏 (H)"
            aria-label="隐藏路演工具栏"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Exit Presentation Button (Icon Only) */}
          <button
            type="button"
            onClick={onExitPresentation}
            className="p-1 rounded-full text-slate-300 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
            title="退出路演汇报 (Esc)"
            aria-label="退出路演汇报"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }
);
