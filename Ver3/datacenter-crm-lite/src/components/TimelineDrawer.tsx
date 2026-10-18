import React, { useState } from 'react';
import {
  X,
  Plus,
  Calendar,
  Phone,
  MessageSquare,
  Users,
  Presentation,
  Utensils,
  Trash2,
  CheckCircle2,
  Clock,
  Flame,
  Building2,
  Cpu,
  HardHat,
} from 'lucide-react';
import {
  Person,
  VisitRecord,
  VisitInteractionType,
  STAGE_LIST,
  RelationshipStage,
} from '../types/crm.ts';

interface TimelineDrawerProps {
  isOpen: boolean;
  person: Person | null;
  visits: VisitRecord[];
  onClose: () => void;
  onAddVisit: (record: Omit<VisitRecord, 'id' | 'createdAt'>) => void;
  onDeleteVisit: (id: string) => void;
  onUpdateStage: (personId: string, stage: RelationshipStage) => void;
}

const INTERACTION_TYPES: {
  key: VisitInteractionType;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { key: 'site_survey', label: '机房踏勘', icon: HardHat },
  { key: 'demo', label: '样机/POC', icon: Presentation },
  { key: 'meeting', label: '专场拜访', icon: Users },
  { key: 'dinner', label: '高层餐叙', icon: Utensils },
  { key: 'call', label: '电话沟通', icon: Phone },
  { key: 'wechat', label: '微信跟进', icon: MessageSquare },
];

export const TimelineDrawer: React.FC<TimelineDrawerProps> = ({
  isOpen,
  person,
  visits,
  onClose,
  onAddVisit,
  onDeleteVisit,
  onUpdateStage,
}) => {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<VisitInteractionType>('site_survey');
  const [summary, setSummary] = useState('');
  const [nextAction, setNextAction] = useState('');

  if (!isOpen || !person) return null;

  const personVisits = visits
    .filter((v) => v.personId === person.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;
    onAddVisit({
      personId: person.id,
      date,
      type,
      summary: summary.trim(),
      nextAction: nextAction.trim() || undefined,
    });
    setSummary('');
    setNextAction('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
      <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col select-none">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs"
              style={{ backgroundColor: person.cardColor || '#3B82F6' }}
            >
              {person.name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900 truncate">{person.name}</h3>
                <span className="text-[11px] text-blue-600 font-semibold truncate">
                  {person.title}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{person.company || '未填写单位'}</span>
                {person.specialty && (
                  <>
                    <span aria-hidden="true">·</span>
                    <Cpu className="w-3 h-3 text-blue-500 shrink-0" />
                    <span className="text-slate-700 font-medium truncate">{person.specialty}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-slate-100 bg-white">
          <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              点击快速更新关系推进温度（实时联动热力图评分）
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {STAGE_LIST.map((st) => {
              const active = (person.relationshipStage || 'exploring') === st.key;
              return (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => onUpdateStage(person.id, st.key)}
                  className={`py-1.5 px-1 rounded-lg border text-[11px] font-semibold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs">{st.emoji}</span>
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              新增拜访与跟进记录
            </span>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 py-0.5">
              <Calendar className="w-3 h-3 text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-[11px] text-slate-700 font-mono tabular-nums focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {INTERACTION_TYPES.map((item) => {
              const Icon = item.icon;
              const isSelected = type === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setType(item.key)}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          <textarea
            rows={2}
            required
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="记录拜访核心纪要，如：探讨二期 HVDC 与液冷标段参数权重..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none select-text"
          />

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="下一步推进动作 (可选)"
              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 select-text"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              添加记录
            </button>
          </div>
        </form>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              历史互动时间轴 ({personVisits.length} 条)
            </span>
          </div>

          {personVisits.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl">
              <Clock className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-600">暂无拜访跟进记录</div>
              <div className="text-[11px] text-slate-400 mt-1">
                在上方填写纪要并保存，将自动提升该人脉的关系强度分值
              </div>
            </div>
          ) : (
            <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
              {personVisits.map((visit) => {
                const meta =
                  INTERACTION_TYPES.find((t) => t.key === visit.type) || INTERACTION_TYPES[0];
                const Icon = meta.icon;

                return (
                  <div
                    key={visit.id}
                    className="relative bg-slate-50/80 border border-slate-200/90 rounded-xl p-3 hover:border-blue-200 transition-colors group"
                  >
                    <div className="absolute -left-[21px] top-4 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                          <Icon className="w-3 h-3 text-blue-600" />
                          {meta.label}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{visit.date}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteVisit(visit.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity cursor-pointer"
                        title="删除此条记录"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed select-text">
                      {visit.summary}
                    </p>

                    {visit.nextAction && (
                      <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-start gap-1.5 text-[11px] text-blue-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span className="select-text">
                          <strong>下一步：</strong>
                          {visit.nextAction}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
