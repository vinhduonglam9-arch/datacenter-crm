import React, { useState, useMemo } from 'react';
import {
  Layers,
  X,
  ArrowUpToLine,
  ArrowUp,
  ArrowDown,
  ArrowDownToLine,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  User,
  Frame,
  Link2,
  Search,
} from 'lucide-react';
import { Person, Relationship, GroupFrame, LayerAction } from '../types/crm.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

export type LayerItemKind = 'person' | 'frame' | 'relationship';

export interface UnifiedLayerItem {
  id: string;
  kind: LayerItemKind;
  title: string;
  subtitle: string;
  color: string;
  zIndex: number;
  locked: boolean;
  hidden: boolean;
}

interface LayerManagerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  relationships: Relationship[];
  groupFrames: GroupFrame[];
  selectedPersonIds: string[];
  selectedFrameIds: string[];
  selectedRelIds: string[];
  onSelectLayerItem: (kind: LayerItemKind, id: string) => void;
  onMoveLayer: (kind: LayerItemKind, id: string, action: LayerAction) => void;
  onToggleLock: (kind: LayerItemKind, id: string) => void;
  onToggleHide: (kind: LayerItemKind, id: string) => void;
}

export const LayerManagerPanel: React.FC<LayerManagerPanelProps> = ({
  isOpen,
  onClose,
  people,
  relationships,
  groupFrames,
  selectedPersonIds,
  selectedFrameIds,
  selectedRelIds,
  onSelectLayerItem,
  onMoveLayer,
  onToggleLock,
  onToggleHide,
}) => {
  const { t, language } = useLanguage();
  const [filterKind, setFilterKind] = useState<'all' | LayerItemKind>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const peopleMap = useMemo(() => {
    const m = new Map<string, Person>();
    people.forEach((p) => m.set(p.id, p));
    return m;
  }, [people]);

  const unifiedItems = useMemo(() => {
    const items: UnifiedLayerItem[] = [];

    people
      .filter((p) => p.onCanvas)
      .forEach((p) => {
        items.push({
          id: p.id,
          kind: 'person',
          title: p.name,
          subtitle: `${p.title}${p.company ? ' · ' + p.company : ''}`,
          color: p.cardColor || '#3B82F6',
          zIndex: p.zIndex ?? 100,
          locked: !!p.locked,
          hidden: !!p.hidden,
        });
      });

    relationships.forEach((r) => {
      const s = peopleMap.get(r.sourceId);
      const t = peopleMap.get(r.targetId);
      items.push({
        id: r.id,
        kind: 'relationship',
        title: r.label || (language === 'zh' ? '业务连线' : 'Relation Line'),
        subtitle: `${s?.name || (language === 'zh' ? '起点' : 'Source')} → ${t?.name || (language === 'zh' ? '终点' : 'Target')}`,
        color: r.color || '#3B82F6',
        zIndex: r.zIndex ?? 60,
        locked: !!r.locked,
        hidden: !!r.hidden,
      });
    });

    groupFrames.forEach((f) => {
      items.push({
        id: f.id,
        kind: 'frame',
        title: f.title,
        subtitle: f.subtitle || (language === 'zh' ? '阵营分组框' : 'Group Frame'),
        color: f.color || '#8B5CF6',
        zIndex: f.zIndex ?? 10,
        locked: !!f.locked,
        hidden: !!f.hidden,
      });
    });

    // Sort descending by zIndex: front/top items at the top of the list
    return items.sort((a, b) => b.zIndex - a.zIndex);
  }, [people, relationships, groupFrames, peopleMap, language]);

  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      if (filterKind !== 'all' && item.kind !== filterKind) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [unifiedItems, filterKind, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      data-layer-panel="true"
      className="absolute top-16 right-5 z-30 w-84 max-h-[calc(100vh-12rem)] bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl flex flex-col select-none overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => {
        if (!e.ctrlKey && !e.metaKey) {
          e.stopPropagation();
        }
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
          <span className="text-xs font-bold text-slate-900">{t('layerPanelTitle')}</span>
          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
            ({filteredItems.length})
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
          title={t('closeBtn')}
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-2.5 border-b border-slate-100 space-y-2 bg-white">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('layerSearchPlaceholder')}
            className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-100 rounded-lg text-[11px]">
          {[
            { key: 'all', label: t('layerFilterAll') },
            { key: 'person', label: t('layerFilterPerson') },
            { key: 'relationship', label: t('layerFilterRel') },
            { key: 'frame', label: t('layerFilterFrame') },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterKind(tab.key as any)}
              className={`py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterKind === tab.key
                  ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layer List (Top to Bottom Z-Order) */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredItems.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            {t('layerEmptyTip')}
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected =
              (item.kind === 'person' && selectedPersonIds.includes(item.id)) ||
              (item.kind === 'frame' && selectedFrameIds.includes(item.id)) ||
              (item.kind === 'relationship' && selectedRelIds.includes(item.id));

            const KindIcon =
              item.kind === 'person'
                ? User
                : item.kind === 'frame'
                ? Frame
                : Link2;

            return (
              <div
                key={`${item.kind}-${item.id}`}
                onClick={() => onSelectLayerItem(item.kind, item.id)}
                className={`group px-2.5 py-2 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-400 shadow-2xs'
                    : item.hidden
                    ? 'bg-slate-50/50 border-slate-100 opacity-50'
                    : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/70'
                }`}
              >
                {/* Left Icon & Title */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: item.color }}
                  >
                    <KindIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800 truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums shrink-0">
                        Z:{item.zIndex}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                {/* Right Layer Up/Down & Lock/Hide Controls */}
                <div
                  className="flex items-center gap-0.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onMoveLayer(item.kind, item.id, 'front')}
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                    title={t('bringToFront')}
                  >
                    <ArrowUpToLine className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveLayer(item.kind, item.id, 'forward')}
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                    title={t('bringForward')}
                  >
                    <ArrowUp className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveLayer(item.kind, item.id, 'backward')}
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                    title={t('sendBackward')}
                  >
                    <ArrowDown className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveLayer(item.kind, item.id, 'back')}
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                    title={t('sendToBack')}
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleLock(item.kind, item.id)}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      item.locked
                        ? 'text-amber-600 bg-amber-50'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                    title={item.locked ? (language === 'zh' ? '解锁图层' : 'Unlock item') : (language === 'zh' ? '锁定位置' : 'Lock item')}
                  >
                    {item.locked ? (
                      <Lock className="w-3 h-3 text-amber-600" strokeWidth={1.5} />
                    ) : (
                      <Unlock className="w-3 h-3 text-slate-400" strokeWidth={1.5} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleHide(item.kind, item.id)}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      item.hidden
                        ? 'text-rose-600 bg-rose-50'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                    title={item.hidden ? (language === 'zh' ? '显示图层' : 'Show layer') : (language === 'zh' ? '隐藏图层' : 'Hide layer')}
                  >
                    {item.hidden ? (
                      <EyeOff className="w-3 h-3 text-rose-600" strokeWidth={1.5} />
                    ) : (
                      <Eye className="w-3 h-3 text-slate-400" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
        <span>{t('layerFooterTop')}</span>
        <span>{t('layerFooterDesc')}</span>
      </div>
    </div>
  );
};
