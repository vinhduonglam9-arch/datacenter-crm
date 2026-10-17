import React, { useState, useMemo, useEffect } from 'react';
import { X, ArrowRight, Compass, CheckCircle2 } from 'lucide-react';
import { Person, Relationship } from '../types/crm.ts';
import { findInfluencePath } from '../utils/graph-algorithms.ts';

interface InfluencePathModalProps {
  isOpen: boolean;
  people: Person[];
  relationships: Relationship[];
  initialSourceId?: string | null;
  initialTargetId?: string | null;
  onClose: () => void;
  onApplyPathFocus: (pathNodeIds: string[]) => void;
}

export const InfluencePathModal: React.FC<InfluencePathModalProps> = ({
  isOpen,
  people,
  relationships,
  initialSourceId,
  initialTargetId,
  onClose,
  onApplyPathFocus,
}) => {
  const canvasPeople = useMemo(() => people.filter((p) => p.onCanvas), [people]);

  const defaultSource = useMemo(() => {
    return (
      canvasPeople.find((p) => (p.tags || []).some((t) => t.includes('我方')) || p.company?.includes('我方'))?.id ||
      canvasPeople[0]?.id ||
      ''
    );
  }, [canvasPeople]);

  const defaultTarget = useMemo(() => {
    return (
      canvasPeople.find(
        (p) =>
          (p.tags || []).some((t) => t.includes('决策')) ||
          p.title.includes('总裁') ||
          p.title.includes('CEO') ||
          p.title.includes('总经理')
      )?.id ||
      canvasPeople[1]?.id ||
      ''
    );
  }, [canvasPeople]);

  const [sourceId, setSourceId] = useState(defaultSource);
  const [targetId, setTargetId] = useState(defaultTarget);

  useEffect(() => {
    if (isOpen) {
      setSourceId(initialSourceId || defaultSource);
      setTargetId(initialTargetId || defaultTarget);
    }
  }, [isOpen, initialSourceId, initialTargetId, defaultSource, defaultTarget]);

  const peopleMap = useMemo(() => {
    const map = new Map<string, Person>();
    canvasPeople.forEach((p) => map.set(p.id, p));
    return map;
  }, [canvasPeople]);

  const path = useMemo(() => {
    if (!sourceId || !targetId) return [];
    return findInfluencePath(sourceId, targetId, relationships);
  }, [sourceId, targetId, relationships]);

  if (!isOpen) return null;

  const handleApplyFocus = () => {
    if (path.length > 0) {
      onApplyPathFocus(path);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">最短高层突破路径寻径 (BFS)</h3>
              <p className="text-xs text-slate-500">自动计算从我方人员触达核心拍板决策人的最短引荐链路</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                发起起点 (如：我方负责人)
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-hidden focus:border-indigo-500"
              >
                {canvasPeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.title})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                突破终点 (如：甲方拍板人)
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-hidden focus:border-indigo-500"
              >
                {canvasPeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.title})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">
                {path.length > 0 ? `已规划最短触达路径（共 ${path.length} 个节点，${Math.max(0, path.length - 1)} 跳）` : '路径计算结果'}
              </span>
              {path.length > 0 && (
                <span className="text-[11px] text-emerald-600 font-medium">
                  链路已贯通
                </span>
              )}
            </div>

            {path.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                当前两个节点之间尚未建立连通关系，请先在画布中补充内线或引荐人连线
              </div>
            ) : (
              <div className="space-y-2 max-h-68 overflow-y-auto pr-1">
                {path.map((nodeId, idx) => {
                  const node = peopleMap.get(nodeId);
                  if (!node) return null;

                  const nextNodeId = path[idx + 1];
                  const relToNext = nextNodeId
                    ? relationships.find(
                        (r) =>
                          (r.sourceId === nodeId && r.targetId === nextNodeId) ||
                          (r.sourceId === nextNodeId && r.targetId === nodeId)
                      )
                    : null;

                  return (
                    <React.Fragment key={nodeId}>
                      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 font-mono"
                          style={{ backgroundColor: node.cardColor }}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{node.name}</span>
                            <span className="text-[11px] text-blue-600 font-medium">{node.title}</span>
                            {idx === 0 && (
                              <span className="text-[10px] text-slate-500">· 起点</span>
                            )}
                            {idx === path.length - 1 && (
                              <span className="text-[10px] text-indigo-600 font-semibold">· 目标决策人</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {node.company || node.bio || '核心节点'}
                          </div>
                        </div>
                      </div>

                      {relToNext && (
                        <div className="flex items-center justify-center py-0.5 text-slate-400">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <ArrowRight className="w-3 h-3 text-indigo-500" />
                            <span>通过 [{relToNext.label}] 关系传导影响</span>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
          >
            关闭
          </button>
          {path.length > 0 && (
            <button
              type="button"
              onClick={handleApplyFocus}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>在画布中高亮该突破路径</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
