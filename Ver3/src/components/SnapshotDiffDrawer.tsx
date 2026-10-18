import React, { useState, useMemo } from 'react';
import {
  X,
  History,
  Camera,
  TrendingUp,
  TrendingDown,
  UserPlus,
  UserMinus,
  Link2,
  Eye,
  RotateCcw,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  Person,
  Relationship,
  GroupFrame,
  CanvasAnnotation,
  ProjectSnapshot,
} from '../types/crm.ts';
import { computeSnapshotDiff, SnapshotDiffResult } from '../utils/snapshot-diff.ts';

interface SnapshotDiffDrawerProps {
  isOpen: boolean;
  projectId: string;
  snapshots: ProjectSnapshot[];
  activeDiffSnapshotId: string | null;
  currentPeople: Person[];
  currentRelationships: Relationship[];
  currentFrames: GroupFrame[];
  currentAnnotations: CanvasAnnotation[];
  onClose: () => void;
  onCreateSnapshot: (title: string, note: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
  onRestoreSnapshot: (snapshot: ProjectSnapshot) => void;
  onToggleCanvasDiff: (snapshotId: string | null) => void;
  onFocusPersonOnCanvas: (personId: string) => void;
}

export const SnapshotDiffDrawer: React.FC<SnapshotDiffDrawerProps> = ({
  isOpen,
  snapshots,
  activeDiffSnapshotId,
  currentPeople,
  currentRelationships,
  currentFrames,
  currentAnnotations,
  onClose,
  onCreateSnapshot,
  onDeleteSnapshot,
  onRestoreSnapshot,
  onToggleCanvasDiff,
  onFocusPersonOnCanvas,
}) => {
  const [newTitle, setNewTitle] = useState<string>('');
  const [newNote, setNewNote] = useState<string>('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>(() => {
    return activeDiffSnapshotId || snapshots[0]?.id || '';
  });

  const effectiveSelectedId =
    snapshots.find((s) => s.id === selectedSnapshotId)?.id || snapshots[0]?.id || '';

  const selectedSnapshot = useMemo(
    () => snapshots.find((s) => s.id === effectiveSelectedId) || null,
    [snapshots, effectiveSelectedId]
  );

  const diffResult: SnapshotDiffResult | null = useMemo(() => {
    if (!selectedSnapshot) return null;
    return computeSnapshotDiff(selectedSnapshot, {
      people: currentPeople,
      relationships: currentRelationships,
      frames: currentFrames,
      annotations: currentAnnotations,
    });
  }, [
    selectedSnapshot,
    currentPeople,
    currentRelationships,
    currentFrames,
    currentAnnotations,
  ]);

  if (!isOpen) return null;

  const isCanvasDiffActive =
    Boolean(activeDiffSnapshotId) && activeDiffSnapshotId === effectiveSelectedId;

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    const title =
      newTitle.trim() ||
      `作战阶段快照 (${new Date().toISOString().slice(5, 10)})`;
    onCreateSnapshot(title, newNote.trim());
    setNewTitle('');
    setNewNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-[1px]">
      <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
                <span>⏱ 历史快照与演进对比</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold">
                  Snapshot Diff
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                记录关键攻关里程碑，一键对比干系人态度跃迁与关系增量
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 1. Create Snapshot Card */}
          <form
            onSubmit={handleSaveNew}
            className="bg-slate-50 rounded-xl border border-slate-200/90 p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-600" />
                <span>打下当前时刻作战快照</span>
              </span>
              <div className="flex items-center gap-1">
                {['一阶段立项摸底', '招投标前夕定盘', '技术封标冲刺'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNewTitle(preset)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="输入快照名称（如：招投标前夕定盘）…"
                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
              >
                保存快照
              </button>
            </div>

            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="可选备注：记录本周关键高层公关进展或风险点…"
              className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-600 focus:outline-none focus:border-indigo-400"
            />
          </form>

          {/* 2. Time-Machine Snapshot Selector & Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                选择对比基线快照 ({snapshots.length} 个历史版本)
              </span>
              {snapshots.length > 1 && (
                <span className="text-[10px] text-slate-400">可拖动时光机滑块切换</span>
              )}
            </div>

            {snapshots.length > 1 && (
              <div className="px-2 py-1 bg-slate-100 rounded-lg">
                <input
                  type="range"
                  min={0}
                  max={snapshots.length - 1}
                  value={Math.max(
                    0,
                    snapshots.findIndex((s) => s.id === effectiveSelectedId)
                  )}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    const snap = snapshots[idx];
                    if (snap) {
                      setSelectedSnapshotId(snap.id);
                      if (activeDiffSnapshotId) {
                        onToggleCanvasDiff(snap.id);
                      }
                    }
                  }}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            )}

            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
              {snapshots.map((snap) => {
                const isSelected = snap.id === effectiveSelectedId;
                const isCanvasComparing = activeDiffSnapshotId === snap.id;
                return (
                  <div
                    key={snap.id}
                    onClick={() => {
                      setSelectedSnapshotId(snap.id);
                      if (activeDiffSnapshotId) {
                        onToggleCanvasDiff(snap.id);
                      }
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-500 ring-1 ring-indigo-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {snap.title}
                        </span>
                        {isCanvasComparing && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 shrink-0">
                            画布高亮对比中
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{snap.createdAt}</span>
                        <span>·</span>
                        <span>{snap.people.filter((p) => p.onCanvas).length} 节点</span>
                        <span>·</span>
                        <span>{snap.relationships.length} 连线</span>
                      </div>
                      {snap.note && (
                        <div className="text-[10px] text-slate-600 truncate mt-0.5">
                          备注：{snap.note}
                        </div>
                      )}
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onRestoreSnapshot(snap)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white transition-colors cursor-pointer"
                        title="回滚恢复到此历史快照状态"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      {snapshots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteSnapshot(snap.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-colors cursor-pointer"
                          title="删除此快照"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Canvas Live Diff Overlay Toggle */}
          {selectedSnapshot && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <div>
                  <div className="text-xs font-bold">画布实时增量对比图层 (Diff Overlay)</div>
                  <div className="text-[10px] text-indigo-100">
                    在画布卡片上直接标记「↑态度跃迁」「↓态度预警」「✨新增人物」
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onToggleCanvasDiff(isCanvasDiffActive ? null : selectedSnapshot.id)
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer shrink-0 ${
                  isCanvasDiffActive
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
              >
                {isCanvasDiffActive ? '关闭画布对比' : '开启画布对比'}
              </button>
            </div>
          )}

          {/* 4. Detailed Snapshot Diff Breakdown */}
          {diffResult && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  相比「{diffResult.baseSnapshotTitle}」的演进变化：
                </span>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-center">
                  <div className="text-sm font-extrabold text-emerald-700">
                    +{diffResult.attitudeUpgraded.length}
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-800">态度正向跃迁</div>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 text-center">
                  <div className="text-sm font-extrabold text-rose-700">
                    {diffResult.attitudeDowngraded.length}
                  </div>
                  <div className="text-[10px] font-semibold text-rose-800">态度恶化预警</div>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200/80 text-center">
                  <div className="text-sm font-extrabold text-blue-700">
                    +{diffResult.addedPeople.length}
                  </div>
                  <div className="text-[10px] font-semibold text-blue-800">新增干系人</div>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200/80 text-center">
                  <div className="text-sm font-extrabold text-purple-700">
                    +{diffResult.addedRelationships.length}
                  </div>
                  <div className="text-[10px] font-semibold text-purple-800">新增突破连线</div>
                </div>
              </div>

              {/* Positive Attitude Upgrades */}
              {diffResult.attitudeUpgraded.length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                  <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span>态度正向跃迁 ({diffResult.attitudeUpgraded.length} 人)</span>
                  </div>
                  <div className="space-y-1.5">
                    {diffResult.attitudeUpgraded.map((item) => (
                      <div
                        key={item.person.id}
                        onClick={() => onFocusPersonOnCanvas(item.person.id)}
                        className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200/80 text-xs cursor-pointer hover:border-emerald-400"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{item.person.name}</span>
                          <span className="text-[10px] text-slate-500 ml-1">
                            ({item.person.title})
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                          ↑ {item.oldLabel} → {item.newLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Negative Attitude Downgrades */}
              {diffResult.attitudeDowngraded.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
                  <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                    <span>态度恶化预警 ({diffResult.attitudeDowngraded.length} 人)</span>
                  </div>
                  <div className="space-y-1.5">
                    {diffResult.attitudeDowngraded.map((item) => (
                      <div
                        key={item.person.id}
                        onClick={() => onFocusPersonOnCanvas(item.person.id)}
                        className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-rose-200/80 text-xs cursor-pointer hover:border-rose-400"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{item.person.name}</span>
                          <span className="text-[10px] text-slate-500 ml-1">
                            ({item.person.title})
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold">
                          ↓ {item.oldLabel} → {item.newLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Added People */}
              {diffResult.addedPeople.length > 0 && (
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
                  <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                    <span>新增关键干系人 ({diffResult.addedPeople.length} 人)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {diffResult.addedPeople.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onFocusPersonOnCanvas(p.id)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-xs font-bold text-blue-800 hover:bg-blue-100 cursor-pointer"
                      >
                        ✨ {p.name} ({p.title})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Added Relationships */}
              {diffResult.addedRelationships.length > 0 && (
                <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 space-y-2">
                  <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-purple-600" />
                    <span>新增突破关系连线 ({diffResult.addedRelationships.length} 条)</span>
                  </div>
                  <div className="space-y-1">
                    {diffResult.addedRelationships.map((r) => {
                      const s = currentPeople.find((p) => p.id === r.sourceId);
                      const t = currentPeople.find((p) => p.id === r.targetId);
                      return (
                        <div
                          key={r.id}
                          className="text-[11px] bg-white px-2.5 py-1 rounded-lg border border-purple-200/80 text-slate-700 flex items-center justify-between"
                        >
                          <span className="font-semibold">
                            {s?.name || '未知'} → {t?.name || '未知'}
                          </span>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                            +{r.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {diffResult.attitudeUpgraded.length === 0 &&
                diffResult.attitudeDowngraded.length === 0 &&
                diffResult.addedPeople.length === 0 &&
                diffResult.addedRelationships.length === 0 && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      当前画布与所选快照「{diffResult.baseSnapshotTitle}」完全一致，尚无增量变更。您可以修改人物态度或新增节点后在此查看自动对比。
                    </span>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
