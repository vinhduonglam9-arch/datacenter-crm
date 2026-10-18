import React from 'react';
import {
  Edit2,
  Clock,
  GitFork,
  Link2,
  ArrowUpToLine,
  ArrowUp,
  ArrowDown,
  ArrowDownToLine,
  Frame,
  Copy,
  Unlock,
  Lock,
  Trash2,
  BoxSelect,
  RotateCcw,
  UserPlus,
  StickyNote,
  Sparkles,
  Check,
  Layers,
  LayoutGrid,
  Maximize2,
  Palette,
} from 'lucide-react';
import {
  Person,
  Relationship,
  GroupFrame,
  CanvasAnnotation,
  CanvasToolMode,
  LayerAction,
  RelationshipStage,
  STAGE_LIST,
  CARD_COLORS,
  TacticalStampType,
  TACTICAL_STAMPS,
} from '../../types/crm.ts';
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  computeStickyCalloutGeometry,
} from '../../utils/graph-math.ts';
import { LayerItemKind } from '../LayerManagerPanel.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  ContextMenuState,
  PEN_TACTICAL_COLORS,
  STICKY_BG_PALETTE,
} from './canvas-constants.ts';

interface CanvasContextMenuProps {
  contextMenu: ContextMenuState | null;
  onCloseContextMenu: () => void;
  people: Person[];
  canvasPeople: Person[];
  relationships: Relationship[];
  groupFrames: GroupFrame[];
  visibleFrames: GroupFrame[];
  annotations: CanvasAnnotation[];
  visibleAnnotations: CanvasAnnotation[];
  selectedPersonIds: string[];
  focusedPersonId?: string | null;
  copiedPersonIds: string[];
  stickyColor: string;
  stickyBgColor: string;
  stickyStamp: TacticalStampType;
  stickyStampLabel: string;
  stickyCalloutMode: 'none' | 'solid' | 'dashed';
  onEditPerson: (person: Person) => void;
  onOpenTimeline?: (person: Person) => void;
  onSetFocusedPersonId?: (id: string | null) => void;
  onStartConnectFromNode: (personId: string) => void;
  onBatchMoveLayer: (
    personIds: string[],
    frameIds: string[],
    action: LayerAction,
    annotationIds?: string[]
  ) => void;
  onBatchUpdatePeople: (personIds: string[], updates: Partial<Person>) => void;
  onGroupPeopleIntoFrame: (personIds: string[]) => void;
  onDuplicatePeople: (personIds: string[], offsetX?: number, offsetY?: number) => void;
  onToggleLockItem: (kind: LayerItemKind, id: string) => void;
  onBatchRemoveFromCanvas: (personIds: string[]) => void;
  onBatchDeletePeople: (personIds: string[]) => void;
  onClearSelectedPeople: () => void;
  onEditFrame: (frame: GroupFrame) => void;
  onSelectCardsInFrame: (frame: GroupFrame) => void;
  onMoveLayer: (kind: LayerItemKind, id: string, action: LayerAction) => void;
  onDeleteFrame: (id: string) => void;
  onEditRelationship: (relation: Relationship) => void;
  onUpdateRelationship: (id: string, updates: Partial<Relationship>) => void;
  onUpdateRelationshipOffset: (id: string, offsetX: number, offsetY: number) => void;
  onDeleteRelationship: (id: string) => void;
  onUpdateAnnotation?: (id: string, updates: Partial<CanvasAnnotation>) => void;
  onDeleteAnnotations?: (ids: string[]) => void;
  onClearSelectedAnnotations: () => void;
  onCreatePersonAt: (x: number, y: number) => void;
  onCreateFrameAt: (frameData: Omit<GroupFrame, 'id'>) => void;
  onCreateAnnotation?: (
    annData: Omit<CanvasAnnotation, 'id' | 'createdAt' | 'updatedAt'>
  ) => CanvasAnnotation | void;
  onSelectAndEditAnnotation: (id: string) => void;
  onOpenOcrAt: (canvasX: number, canvasY: number) => void;
  onSelectAllOnCanvas: () => void;
  onToggleLayerPanel: () => void;
  onAutoLayoutFaction?: () => void;
  onAutoLayoutHierarchy?: () => void;
  onFitView: () => void;
  onOpenStyleCenter?: () => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = React.memo(
  ({
    contextMenu,
    onCloseContextMenu,
    people,
    relationships,
    groupFrames,
    annotations,
    selectedPersonIds,
    focusedPersonId,
    copiedPersonIds,
    stickyColor,
    stickyBgColor,
    stickyStamp,
    stickyStampLabel,
    stickyCalloutMode,
    onEditPerson,
    onOpenTimeline,
    onSetFocusedPersonId,
    onStartConnectFromNode,
    onBatchMoveLayer,
    onBatchUpdatePeople,
    onGroupPeopleIntoFrame,
    onDuplicatePeople,
    onToggleLockItem,
    onBatchRemoveFromCanvas,
    onBatchDeletePeople,
    onClearSelectedPeople,
    onEditFrame,
    onSelectCardsInFrame,
    onMoveLayer,
    onDeleteFrame,
    onEditRelationship,
    onUpdateRelationship,
    onUpdateRelationshipOffset,
    onDeleteRelationship,
    onUpdateAnnotation,
    onDeleteAnnotations,
    onClearSelectedAnnotations,
    onCreatePersonAt,
    onCreateFrameAt,
    onCreateAnnotation,
    onSelectAndEditAnnotation,
    onOpenOcrAt,
    onSelectAllOnCanvas,
    onToggleLayerPanel,
    onAutoLayoutFaction,
    onAutoLayoutHierarchy,
    onFitView,
    onOpenStyleCenter,
  }) => {
    const { language, t } = useLanguage();

    if (!contextMenu) return null;

    return (
      <div
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onMouseDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute z-50 w-60 bg-white/98 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl py-1.5 text-xs text-slate-700 select-none"
      >
        {/* Target: Person Card */}
        {contextMenu.targetType === 'person' &&
          contextMenu.targetId &&
          (() => {
            const targetPerson = people.find((p) => p.id === contextMenu.targetId);
            if (!targetPerson) return null;
            const targetIds = selectedPersonIds.includes(targetPerson.id)
              ? selectedPersonIds
              : [targetPerson.id];

            return (
              <>
                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate">
                    {targetIds.length > 1
                      ? language === 'zh'
                        ? `已选 ${targetIds.length} 位干系人`
                        : `${targetIds.length} selected`
                      : targetPerson.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Z:{targetPerson.zIndex ?? 100}
                  </span>
                </div>

                {targetIds.length === 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onCloseContextMenu();
                        onEditPerson(targetPerson);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                      <span>{t('ctxEditPerson')}</span>
                    </button>

                    {onOpenTimeline && (
                      <button
                        type="button"
                        onClick={() => {
                          onCloseContextMenu();
                          onOpenTimeline(targetPerson);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                        <span>{t('ctxTimeline')}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onCloseContextMenu();
                        onSetFocusedPersonId?.(
                          focusedPersonId === targetPerson.id ? null : targetPerson.id
                        );
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <GitFork className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                      <span>
                        {focusedPersonId === targetPerson.id
                          ? t('ctxUnfocusNetwork')
                          : t('ctxFocusNetwork')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onCloseContextMenu();
                        onStartConnectFromNode(targetPerson.id);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                      <span>{t('ctxConnectFromNode')}</span>
                    </button>
                  </>
                )}

                {/* Layer Order */}
                <div className="my-1 border-t border-slate-100 pt-1 px-3">
                  <div className="text-[10px] text-slate-400 mb-1">{t('layerOrdering')}</div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      {
                        action: 'front' as LayerAction,
                        label: language === 'zh' ? '顶层' : 'Front',
                        icon: ArrowUpToLine,
                      },
                      {
                        action: 'forward' as LayerAction,
                        label: language === 'zh' ? '上移' : 'Up',
                        icon: ArrowUp,
                      },
                      {
                        action: 'backward' as LayerAction,
                        label: language === 'zh' ? '下移' : 'Down',
                        icon: ArrowDown,
                      },
                      {
                        action: 'back' as LayerAction,
                        label: language === 'zh' ? '底层' : 'Back',
                        icon: ArrowDownToLine,
                      },
                    ].map((btn) => {
                      const Icon = btn.icon;
                      return (
                        <button
                          key={btn.action}
                          type="button"
                          onClick={() => {
                            onBatchMoveLayer(targetIds, [], btn.action);
                            onCloseContextMenu();
                          }}
                          className="py-1 rounded border border-slate-200 hover:bg-slate-100 flex flex-col items-center gap-0.5 text-[10px] cursor-pointer"
                        >
                          <Icon className="w-3 h-3 text-slate-600" strokeWidth={1.5} />
                          <span>{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Stage Switcher */}
                <div className="my-1 border-t border-slate-100 pt-1 px-3">
                  <div className="text-[10px] text-slate-400 mb-1">{t('batchSetStage')}</div>
                  <div className="grid grid-cols-5 gap-1">
                    {STAGE_LIST.map((st) => (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => {
                          onBatchUpdatePeople(targetIds, {
                            relationshipStage: st.key as RelationshipStage,
                          });
                          onCloseContextMenu();
                        }}
                        className="py-1 rounded border border-slate-200 hover:bg-slate-100 flex flex-col items-center text-[10px] cursor-pointer"
                        title={st.label}
                      >
                        <span>{st.emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card Color */}
                <div className="my-1 border-t border-slate-100 pt-1 px-3">
                  <div className="text-[10px] text-slate-400 mb-1">{t('batchCardColor')}</div>
                  <div className="flex items-center justify-between">
                    {CARD_COLORS.slice(0, 7).map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          onBatchUpdatePeople(targetIds, { cardColor: c.value });
                          onCloseContextMenu();
                        }}
                        className="w-4 h-4 rounded-full border border-slate-200 hover:scale-120 transition-transform cursor-pointer"
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    onCloseContextMenu();
                    onGroupPeopleIntoFrame(targetIds);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Frame className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                  <span>{t('ctxGroupIntoFrame')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onCloseContextMenu();
                    onDuplicatePeople(targetIds, 36, 36);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                  <span>{t('ctxDuplicateCard')}</span>
                </button>

                {targetIds.length === 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      onCloseContextMenu();
                      onToggleLockItem('person', targetPerson.id);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    {targetPerson.locked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.5} />
                        <span>{t('ctxUnlockPosition')}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                        <span>{t('ctxLockPosition')}</span>
                      </>
                    )}
                  </button>
                )}

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    onCloseContextMenu();
                    onBatchRemoveFromCanvas(targetIds);
                    onClearSelectedPeople();
                  }}
                  className="w-full px-3 py-1.5 text-left text-amber-600 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{t('ctxRemoveFromCanvas')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onCloseContextMenu();
                    onBatchDeletePeople(targetIds);
                    onClearSelectedPeople();
                  }}
                  className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{t('ctxDeletePersonPermanent')}</span>
                </button>
              </>
            );
          })()}

        {/* Target: GroupFrame */}
        {contextMenu.targetType === 'frame' &&
          contextMenu.targetId &&
          (() => {
            const frame = groupFrames.find((f) => f.id === contextMenu.targetId);
            if (!frame) return null;
            return (
              <>
                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate">{frame.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Z:{frame.zIndex ?? 10}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onCloseContextMenu();
                    onEditFrame(frame);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                  <span>{t('ctxEditFrame')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onCloseContextMenu();
                    onSelectCardsInFrame(frame);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <BoxSelect className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                  <span>{t('ctxSelectCardsInFrame')}</span>
                </button>

                <div className="my-1 border-t border-slate-100 pt-1 px-3">
                  <div className="text-[10px] text-slate-400 mb-1">{t('layerOrdering')}</div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      {
                        action: 'front' as LayerAction,
                        label: language === 'zh' ? '顶层' : 'Front',
                        icon: ArrowUpToLine,
                      },
                      {
                        action: 'forward' as LayerAction,
                        label: language === 'zh' ? '上移' : 'Up',
                        icon: ArrowUp,
                      },
                      {
                        action: 'backward' as LayerAction,
                        label: language === 'zh' ? '下移' : 'Down',
                        icon: ArrowDown,
                      },
                      {
                        action: 'back' as LayerAction,
                        label: language === 'zh' ? '底层' : 'Back',
                        icon: ArrowDownToLine,
                      },
                    ].map((btn) => {
                      const Icon = btn.icon;
                      return (
                        <button
                          key={btn.action}
                          type="button"
                          onClick={() => {
                            onMoveLayer('frame', frame.id, btn.action);
                            onCloseContextMenu();
                          }}
                          className="py-1 rounded border border-slate-200 hover:bg-slate-100 flex flex-col items-center gap-0.5 text-[10px] cursor-pointer"
                        >
                          <Icon className="w-3 h-3 text-slate-600" strokeWidth={1.5} />
                          <span>{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onCloseContextMenu();
                    onToggleLockItem('frame', frame.id);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  {frame.locked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.5} />
                      <span>{t('ctxUnlockFrame')}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                      <span>{t('ctxLockFrame')}</span>
                    </>
                  )}
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    onCloseContextMenu();
                    onDeleteFrame(frame.id);
                  }}
                  className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{t('ctxDeleteFrame')}</span>
                </button>
              </>
            );
          })()}

        {/* Target: Relationship Line */}
        {contextMenu.targetType === 'relationship' &&
          contextMenu.targetId &&
          (() => {
            const rel = relationships.find((r) => r.id === contextMenu.targetId);
            if (!rel) return null;
            return (
              <>
                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate">{rel.label}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Z:{rel.zIndex ?? 60}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onCloseContextMenu();
                    onEditRelationship(rel);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                  <span>{t('ctxEditRelation')}</span>
                </button>

                <div className="my-1 border-t border-slate-100 pt-1 px-3">
                  <div className="text-[10px] text-slate-400 mb-1">{t('ctxQuickLineGeometry')}</div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { key: 'bezier', label: t('geomBezier') },
                      { key: 'straight', label: t('geomStraight') },
                      { key: 'step', label: t('geomStep') },
                      { key: 'arc', label: t('geomArc') },
                    ].map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => {
                          onUpdateRelationship(rel.id, { lineStyle: g.key as any });
                          onCloseContextMenu();
                        }}
                        className={`py-1 rounded border text-[10px] cursor-pointer ${
                          rel.lineStyle === g.key
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="my-1 border-t border-slate-100 pt-1 px-3">
                  <div className="text-[10px] text-slate-400 mb-1">{t('layerOrdering')}</div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      {
                        action: 'front' as LayerAction,
                        label: language === 'zh' ? '顶层' : 'Front',
                        icon: ArrowUpToLine,
                      },
                      {
                        action: 'forward' as LayerAction,
                        label: language === 'zh' ? '上移' : 'Up',
                        icon: ArrowUp,
                      },
                      {
                        action: 'backward' as LayerAction,
                        label: language === 'zh' ? '下移' : 'Down',
                        icon: ArrowDown,
                      },
                      {
                        action: 'back' as LayerAction,
                        label: language === 'zh' ? '底层' : 'Back',
                        icon: ArrowDownToLine,
                      },
                    ].map((btn) => {
                      const Icon = btn.icon;
                      return (
                        <button
                          key={btn.action}
                          type="button"
                          onClick={() => {
                            onMoveLayer('relationship', rel.id, btn.action);
                            onCloseContextMenu();
                          }}
                          className="py-1 rounded border border-slate-200 hover:bg-slate-100 flex flex-col items-center gap-0.5 text-[10px] cursor-pointer"
                        >
                          <Icon className="w-3 h-3 text-slate-600" strokeWidth={1.5} />
                          <span>{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onCloseContextMenu();
                    onUpdateRelationshipOffset(rel.id, 0, 0);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.5} />
                  <span>{t('ctxResetLabelOffset')}</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    onCloseContextMenu();
                    onDeleteRelationship(rel.id);
                  }}
                  className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{t('ctxDeleteRelation')}</span>
                </button>
              </>
            );
          })()}

        {/* Target: Freehand Annotation / Sticky Note */}
        {contextMenu.targetType === 'annotation' &&
          contextMenu.targetId &&
          (() => {
            const ann = annotations.find((a) => a.id === contextMenu.targetId);
            if (!ann) return null;
            return (
              <>
                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate">
                    {ann.kind === 'sticky'
                      ? language === 'zh'
                        ? '作战便签贴纸'
                        : 'Tactical Sticky'
                      : ann.kind === 'shape'
                      ? language === 'zh'
                        ? '一笔成型几何图形'
                        : 'Smart Shape'
                      : ann.kind === 'highlighter'
                      ? language === 'zh'
                        ? '荧光马克笔标注'
                        : 'Highlighter'
                      : language === 'zh'
                      ? '自由手绘批注'
                      : 'Freehand Stroke'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Z:{ann.zIndex ?? 145}
                  </span>
                </div>

                {ann.kind === 'sticky' && (
                  <div className="my-1 border-b border-slate-100 pb-2 px-3 space-y-2">
                    <div>
                      <div className="text-[10px] text-slate-400 mb-1">
                        {language === 'zh' ? '自定义战术印章文字' : 'Custom Stamp Label'}
                      </div>
                      <input
                        type="text"
                        value={ann.stampLabel ?? ''}
                        onChange={(e) =>
                          onUpdateAnnotation?.(ann.id, { stampLabel: e.target.value })
                        }
                        placeholder={
                          language === 'zh' ? '输入自定义印章标签…' : 'Enter custom stamp...'
                        }
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 mb-1">
                        {language === 'zh' ? '预设战术印章模板' : 'Preset Tactical Stamps'}
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {TACTICAL_STAMPS.map((st) => (
                          <button
                            key={st.key}
                            type="button"
                            onClick={() => {
                              onUpdateAnnotation?.(ann.id, {
                                stamp: st.key,
                                stampLabel: language === 'zh' ? st.labelZh : st.labelEn,
                                color: st.color,
                                bgColor: st.bg,
                              });
                              onCloseContextMenu();
                            }}
                            className={`py-1 rounded border text-[10px] cursor-pointer ${
                              ann.stamp === st.key
                                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {language === 'zh' ? st.labelZh : st.labelEn}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 mb-1">
                        {language === 'zh'
                          ? '作战引出线与折角点编辑'
                          : 'Callout Leader Line & Corners'}
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { key: 'none' as const, label: language === 'zh' ? '无引出线' : 'None' },
                          { key: 'solid' as const, label: language === 'zh' ? '实线引出' : 'Solid' },
                          { key: 'dashed' as const, label: language === 'zh' ? '虚线引出' : 'Dashed' },
                        ].map((opt) => {
                          const activeMode = !ann.calloutEnabled
                            ? 'none'
                            : ann.calloutStyle === 'dashed'
                            ? 'dashed'
                            : 'solid';
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                if (opt.key === 'none') {
                                  onUpdateAnnotation?.(ann.id, { calloutEnabled: false });
                                } else {
                                  onUpdateAnnotation?.(ann.id, {
                                    calloutEnabled: true,
                                    calloutStyle: opt.key,
                                    calloutStartNorm: ann.calloutStartNorm || { x: 0, y: 1 },
                                    calloutOffsetX: ann.calloutOffsetX ?? -85,
                                    calloutOffsetY:
                                      ann.calloutOffsetY ?? Math.round(ann.height + 48),
                                  });
                                }
                                onCloseContextMenu();
                              }}
                              className={`py-1 rounded border text-[10px] cursor-pointer ${
                                activeMode === opt.key
                                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                                  : 'border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      {ann.calloutEnabled && (
                        <div className="grid grid-cols-3 gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const geom = computeStickyCalloutGeometry(ann);
                              const mid = geom.segmentMidpoints[0];
                              if (mid) {
                                const nextElbows = [...geom.elbowOffsets];
                                nextElbows.splice(mid.insertIndex, 0, {
                                  x: Math.round(mid.x - ann.x),
                                  y: Math.round(mid.y - ann.y - 18),
                                });
                                onUpdateAnnotation?.(ann.id, { calloutElbows: nextElbows });
                              }
                              onCloseContextMenu();
                            }}
                            className="py-1 rounded border border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 text-[10px] font-medium cursor-pointer"
                          >
                            {language === 'zh' ? '+ 新增折角' : '+ Corner'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateAnnotation?.(ann.id, { calloutElbows: [] });
                              onCloseContextMenu();
                            }}
                            className="py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] cursor-pointer"
                          >
                            {language === 'zh' ? '直线无折角' : 'Straight'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateAnnotation?.(ann.id, { calloutElbows: undefined });
                              onCloseContextMenu();
                            }}
                            className="py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] cursor-pointer"
                          >
                            {language === 'zh' ? '重置折角' : 'Reset'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 mb-1">
                        {language === 'zh' ? '便签纸背景色' : 'Sticky Background Color'}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        {STICKY_BG_PALETTE.map((bg) => (
                          <button
                            key={bg.value}
                            type="button"
                            onClick={() => onUpdateAnnotation?.(ann.id, { bgColor: bg.value })}
                            className="w-4.5 h-4.5 rounded border border-slate-300 hover:scale-115 transition-transform cursor-pointer"
                            style={{ backgroundColor: bg.value }}
                            title={bg.name}
                          />
                        ))}
                        <label
                          className="w-5 h-5 rounded border border-slate-300 cursor-pointer flex items-center justify-center shadow-2xs"
                          style={{ backgroundColor: ann.bgColor || '#FEF2F2' }}
                          title={language === 'zh' ? '自定义背景色' : 'Custom Background'}
                        >
                          <input
                            type="color"
                            value={ann.bgColor || '#FEF2F2'}
                            onChange={(e) =>
                              onUpdateAnnotation?.(ann.id, { bgColor: e.target.value })
                            }
                            className="opacity-0 w-0 h-0"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {(ann.kind === 'pen' ||
                  (ann.kind === 'shape' &&
                    (ann.shapeType === 'line' || ann.shapeType === 'arrow'))) && (
                  <div className="my-1 border-b border-slate-100 pb-1.5 px-3">
                    <div className="text-[10px] text-slate-400 mb-1">
                      {language === 'zh' ? '线条箭头样式' : 'Line Arrow Style'}
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { key: 'none' as const, label: language === 'zh' ? '无箭头' : 'None' },
                        { key: 'forward' as const, label: language === 'zh' ? '单箭头' : 'Single' },
                        { key: 'both' as const, label: language === 'zh' ? '双箭头' : 'Double' },
                      ].map((arrOpt) => {
                        const currentArrow =
                          ann.arrow || (ann.shapeType === 'arrow' ? 'forward' : 'none');
                        return (
                          <button
                            key={arrOpt.key}
                            type="button"
                            onClick={() => {
                              if (ann.kind === 'shape') {
                                onUpdateAnnotation?.(ann.id, {
                                  arrow: arrOpt.key,
                                  shapeType: arrOpt.key === 'none' ? 'line' : 'arrow',
                                });
                              } else {
                                onUpdateAnnotation?.(ann.id, { arrow: arrOpt.key });
                              }
                              onCloseContextMenu();
                            }}
                            className={`py-1 rounded border text-[10px] cursor-pointer ${
                              currentArrow === arrOpt.key
                                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {arrOpt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="my-1 px-3">
                  <div className="text-[10px] text-slate-400 mb-1">
                    {ann.kind === 'sticky'
                      ? language === 'zh'
                        ? '印章与边框颜色'
                        : 'Stamp & Border Color'
                      : language === 'zh'
                      ? '批注颜色 (含自定义色盘)'
                      : 'Annotation Color'}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    {PEN_TACTICAL_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          onUpdateAnnotation?.(ann.id, { color: c.value });
                          onCloseContextMenu();
                        }}
                        className="w-4.5 h-4.5 rounded-full border border-slate-200 hover:scale-120 transition-transform cursor-pointer"
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                    <label
                      className="relative w-5 h-5 rounded-full overflow-hidden border border-slate-300 cursor-pointer shadow-2xs"
                      style={{
                        background:
                          'conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
                      }}
                      title={language === 'zh' ? '自定义调色盘' : 'Custom Color Picker'}
                    >
                      <input
                        type="color"
                        value={ann.color || '#EF4444'}
                        onChange={(e) =>
                          onUpdateAnnotation?.(ann.id, { color: e.target.value })
                        }
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                <div className="my-1 border-t border-slate-100 pt-1 px-3">
                  <div className="text-[10px] text-slate-400 mb-1">{t('layerOrdering')}</div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      {
                        action: 'front' as LayerAction,
                        label: language === 'zh' ? '顶层' : 'Front',
                        icon: ArrowUpToLine,
                      },
                      {
                        action: 'forward' as LayerAction,
                        label: language === 'zh' ? '上移' : 'Up',
                        icon: ArrowUp,
                      },
                      {
                        action: 'backward' as LayerAction,
                        label: language === 'zh' ? '下移' : 'Down',
                        icon: ArrowDown,
                      },
                      {
                        action: 'back' as LayerAction,
                        label: language === 'zh' ? '底层' : 'Back',
                        icon: ArrowDownToLine,
                      },
                    ].map((btn) => {
                      const Icon = btn.icon;
                      return (
                        <button
                          key={btn.action}
                          type="button"
                          onClick={() => {
                            onMoveLayer('annotation', ann.id, btn.action);
                            onCloseContextMenu();
                          }}
                          className="py-1 rounded border border-slate-200 hover:bg-slate-100 flex flex-col items-center gap-0.5 text-[10px] cursor-pointer"
                        >
                          <Icon className="w-3 h-3 text-slate-600" strokeWidth={1.5} />
                          <span>{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onCloseContextMenu();
                    onToggleLockItem('annotation', ann.id);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  {ann.locked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.5} />
                      <span>{t('ctxUnlockPosition')}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                      <span>{t('ctxLockPosition')}</span>
                    </>
                  )}
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    onCloseContextMenu();
                    onDeleteAnnotations?.([ann.id]);
                    onClearSelectedAnnotations();
                  }}
                  className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{t('deleteBtn')}</span>
                </button>
              </>
            );
          })()}

        {/* Target: Canvas Background */}
        {contextMenu.targetType === 'canvas' && (
          <>
            <div className="px-3 py-1 border-b border-slate-100 text-[10px] font-semibold text-slate-400">
              {t('ctxCanvasMenu')} ({contextMenu.canvasX}, {contextMenu.canvasY})
            </div>

            <button
              type="button"
              onClick={() => {
                const { canvasX, canvasY } = contextMenu;
                onCloseContextMenu();
                onCreatePersonAt(canvasX - CARD_WIDTH / 2, canvasY - CARD_HEIGHT / 2);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 font-medium text-slate-800 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.5} />
              <span>{t('ctxCreatePersonHere')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const { canvasX, canvasY } = contextMenu;
                onCloseContextMenu();
                onCreateFrameAt({
                  title: language === 'zh' ? '新阵营分组区域' : 'New Group Frame',
                  subtitle: language === 'zh' ? '核心决策与协同组' : 'Core Decision Team',
                  x: canvasX - 180,
                  y: canvasY - 160,
                  width: 360,
                  height: 360,
                  color: '#8B5CF6',
                  zIndex: 15,
                });
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
            >
              <Frame className="w-3.5 h-3.5 text-purple-600" strokeWidth={1.5} />
              <span>{t('ctxCreateFrameHere')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const { canvasX, canvasY } = contextMenu;
                onCloseContextMenu();
                const created = onCreateAnnotation?.({
                  kind: 'sticky',
                  x: canvasX - 105,
                  y: canvasY - 68,
                  width: 220,
                  height: 145,
                  color: stickyColor,
                  bgColor: stickyBgColor,
                  strokeWidth: 2,
                  opacity: 1,
                  stamp: stickyStamp,
                  stampLabel: stickyStampLabel.trim() || undefined,
                  calloutEnabled: stickyCalloutMode !== 'none',
                  calloutStyle: stickyCalloutMode === 'dashed' ? 'dashed' : 'solid',
                  calloutOffsetX: -75,
                  calloutOffsetY: 145,
                  text:
                    language === 'zh'
                      ? '请填写关键推进动作或防冲标卡点…'
                      : 'Enter tactical note or action item...',
                  zIndex: 155,
                });
                if (created && created.id) {
                  onSelectAndEditAnnotation(created.id);
                }
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
            >
              <StickyNote className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.5} />
              <span>{t('ctxCreateStickyHere')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const { canvasX, canvasY } = contextMenu;
                onCloseContextMenu();
                onOpenOcrAt(canvasX - CARD_WIDTH / 2, canvasY - CARD_HEIGHT / 2);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.5} />
              <span>{t('ctxOcrHere')}</span>
            </button>

            {copiedPersonIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onCloseContextMenu();
                  onDuplicatePeople(copiedPersonIds, 40, 40);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
                <span>{t('ctxPasteCards', { count: copiedPersonIds.length })}</span>
              </button>
            )}

            <div className="my-1 border-t border-slate-100" />

            <button
              type="button"
              onClick={() => {
                onCloseContextMenu();
                onSelectAllOnCanvas();
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
              <span>{t('ctxSelectAll')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onCloseContextMenu();
                onToggleLayerPanel();
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
              <span>{t('ctxToggleLayerManager')}</span>
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button
              type="button"
              onClick={() => {
                onCloseContextMenu();
                onAutoLayoutFaction?.();
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
              <span>{t('ctxAutoLayoutFaction')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onCloseContextMenu();
                onAutoLayoutHierarchy?.();
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
            >
              <GitFork className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
              <span>{t('ctxAutoLayoutHierarchy')}</span>
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button
              type="button"
              onClick={() => {
                onCloseContextMenu();
                onFitView();
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
              <span>{t('ctxFitView')}</span>
            </button>

            {onOpenStyleCenter && (
              <button
                type="button"
                onClick={() => {
                  onCloseContextMenu();
                  onOpenStyleCenter();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                <span>{t('ctxSwitchTheme')}</span>
              </button>
            )}
          </>
        )}
      </div>
    );
  }
);
