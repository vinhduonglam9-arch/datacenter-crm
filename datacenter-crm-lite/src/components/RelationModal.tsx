import React, { useState, useEffect } from 'react';
import { X, Trash2, Check, Palette, FileText, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Relationship, RELATION_TEMPLATES, Person } from '../types/crm.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface RelationModalProps {
  isOpen: boolean;
  relation: Relationship | null;
  sourcePerson?: Person;
  targetPerson?: Person;
  onClose: () => void;
  onSave: (updated: Partial<Relationship>) => void;
  onDelete: (id: string) => void;
}

const PRESET_COLORS = [
  '#3B82F6',
  '#10B981',
  '#8B5CF6',
  '#EC4899',
  '#EAB308',
  '#06B6D4',
  '#F97316',
  '#EF4444',
  '#14B8A6',
  '#64748B',
  '#6366F1',
  '#334155',
];

const QUICK_DESC_TAGS_ZH = [
  { label: '审批进度', prefix: '审批进度：', example: '审批进度：技术方案已过会' },
  { label: '商务风险', prefix: '商务风险：', example: '商务风险：账期与维保条款博弈' },
  { label: '控标预警', prefix: '控标预警：', example: '控标预警：友商低价冲标需防御' },
  { label: '关键卡点', prefix: '关键卡点：', example: '关键卡点：待总工终审签字' },
  { label: '推进计划', prefix: '推进计划：', example: '推进计划：本周五安排高层回访' },
];

const QUICK_DESC_TAGS_EN = [
  { label: 'Approval', prefix: 'Approval: ', example: 'Approval: Tech spec signed off' },
  { label: 'Biz Risk', prefix: 'Biz Risk: ', example: 'Biz Risk: Payment terms under negotiation' },
  { label: 'Competitor', prefix: 'Alert: ', example: 'Alert: Aggressive low-price bid' },
  { label: 'Blocker', prefix: 'Blocker: ', example: 'Blocker: Pending VP final review' },
  { label: 'Next Step', prefix: 'Next: ', example: 'Next: Executive visit this Friday' },
];

export const RelationModal: React.FC<RelationModalProps> = ({
  isOpen,
  relation,
  sourcePerson,
  targetPerson,
  onClose,
  onSave,
  onDelete,
}) => {
  const { t, language } = useLanguage();
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [templateKey, setTemplateKey] = useState<string | undefined>('customer');
  const [arrow, setArrow] = useState<'forward' | 'both' | 'none'>('forward');
  const [lineStyle, setLineStyle] = useState<'bezier' | 'straight' | 'step' | 'arc' | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [showDescriptionOnCanvas, setShowDescriptionOnCanvas] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (relation) {
      setLabel(relation.label || '');
      setColor(relation.color || '#3B82F6');
      setTemplateKey(relation.templateKey);
      setArrow(relation.arrow || 'forward');
      setLineStyle(relation.lineStyle);
      setDescription(relation.description ?? '');
      setShowDescriptionOnCanvas(relation.showDescriptionOnCanvas !== false);
      setNotes(relation.notes || '');
    }
  }, [relation]);

  if (!isOpen || !relation) return null;

  const handleSelectTemplate = (tpl: (typeof RELATION_TEMPLATES)[0]) => {
    setTemplateKey(tpl.key);
    setLabel(tpl.label);
    setColor(tpl.color);
  };

  const handleQuickTagClick = (prefix: string, example: string) => {
    const trimmed = description.trim();
    if (!trimmed) {
      setDescription(example);
    } else if (trimmed.startsWith(prefix)) {
      // Already starts with this prefix, keep as is
      return;
    } else {
      // Replace existing known prefix if ends with colon, or append prefix
      const replaced = trimmed.replace(/^(审批进度|商务风险|控标预警|关键卡点|推进计划|Approval|Biz Risk|Alert|Blocker|Next)[:：]\s*/i, `${prefix}`);
      if (replaced !== trimmed) {
        setDescription(replaced);
      } else {
        setDescription(`${prefix}${trimmed}`);
      }
    }
    setShowDescriptionOnCanvas(true);
  };

  const handleSave = () => {
    onSave({
      label: label.trim() || (language === 'zh' ? '业务关联' : 'Connection'),
      color,
      templateKey,
      arrow,
      lineStyle,
      description: description.trim(),
      showDescriptionOnCanvas,
      notes: notes.trim(),
    });
    onClose();
  };

  const quickTags = language === 'zh' ? QUICK_DESC_TAGS_ZH : QUICK_DESC_TAGS_EN;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {language === 'zh' ? '编辑关系纽带属性' : 'Edit Relationship Properties'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {sourcePerson ? sourcePerson.name : (language === 'zh' ? '起点' : 'Source')} → {targetPerson ? targetPerson.name : (language === 'zh' ? '终点' : 'Target')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
            title={t('closeBtn')}
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                {language === 'zh' ? '10 种大客户公关关系模板 (点击套用)' : '10 Major Account Relationship Templates'}
              </label>
              <span className="text-[11px] text-slate-400">
                {language === 'zh' ? '自动匹配标签与色系' : 'Auto preset colors & labels'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {RELATION_TEMPLATES.map((tpl) => {
                const isSelected = templateKey === tpl.key || label === tpl.label;
                return (
                  <button
                    key={tpl.key}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 font-semibold text-blue-900 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tpl.color }}
                    />
                    <span className="truncate">{tpl.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {language === 'zh' ? '自定义关系标签文字' : 'Relationship Label Text'}
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={language === 'zh' ? '如：联合定标 / 高层引荐...' : 'e.g. Joint Bid / Executive Intro'}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {language === 'zh' ? '箭头方向' : 'Arrow Direction'}
              </label>
              <div className="flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setArrow('forward')}
                  className={`flex-1 py-1 text-xs rounded-sm transition-all cursor-pointer ${
                    arrow === 'forward' ? 'bg-white shadow-2xs font-semibold text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {language === 'zh' ? '单向 (A→B)' : 'Single (A→B)'}
                </button>
                <button
                  type="button"
                  onClick={() => setArrow('both')}
                  className={`flex-1 py-1 text-xs rounded-sm transition-all cursor-pointer ${
                    arrow === 'both' ? 'bg-white shadow-2xs font-semibold text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {language === 'zh' ? '双向 (A↔B)' : 'Mutual (A↔B)'}
                </button>
                <button
                  type="button"
                  onClick={() => setArrow('none')}
                  className={`flex-1 py-1 text-xs rounded-sm transition-all cursor-pointer ${
                    arrow === 'none' ? 'bg-white shadow-2xs font-semibold text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {language === 'zh' ? '无箭头' : 'None'}
                </button>
              </div>
            </div>
          </div>

          {/* 连接描述 (画布连线备注) 字段 */}
          <div className="rounded-lg border border-blue-100 bg-blue-50/35 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.75} />
                <span>{language === 'zh' ? '连接描述（画布连线备注）' : 'Connection Description (Line Note)'}</span>
              </label>
              <button
                type="button"
                onClick={() => setShowDescriptionOnCanvas((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                  showDescriptionOnCanvas
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
                title={
                  language === 'zh'
                    ? '控制是否在画布关系连线上直接显示该连接描述'
                    : 'Toggle displaying this description directly on the canvas connection line'
                }
              >
                {showDescriptionOnCanvas ? (
                  <>
                    <Eye className="w-3 h-3" strokeWidth={1.75} />
                    <span>{language === 'zh' ? '连线上显示' : 'Show on Line'}</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3" strokeWidth={1.75} />
                    <span>{language === 'zh' ? '仅悬浮显示' : 'Hover Only'}</span>
                  </>
                )}
              </button>
            </div>

            {/* 快捷填入维度标签 */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 flex items-center gap-0.5 mr-0.5">
                <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                {language === 'zh' ? '快捷维度:' : 'Quick tags:'}
              </span>
              {quickTags.map((tag) => (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => handleQuickTagClick(tag.prefix, tag.example)}
                  className="px-2 py-0.5 text-[11px] font-medium rounded border border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors cursor-pointer"
                >
                  + {tag.label}
                </button>
              ))}
              {description && (
                <button
                  type="button"
                  onClick={() => setDescription('')}
                  className="ml-auto text-[11px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  {language === 'zh' ? '清空' : 'Clear'}
                </button>
              )}
            </div>

            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                language === 'zh'
                  ? '补充如“审批进度：技术方案已过会”、“商务风险：付款条件博弈”等关键信息...'
                  : 'e.g. Approval Progress: Tech spec approved / Business Risk: Price pressure...'
              }
              className="w-full px-3 py-1.5 text-xs bg-white rounded-md border border-slate-300 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'zh' ? '单条连线独立几何线型 (默认跟随全局样式中心)' : 'Line Geometry Override'}
            </label>
            <div className="grid grid-cols-5 gap-1.5 text-xs">
              {[
                { key: undefined, label: language === 'zh' ? '跟随全局' : 'Inherit' },
                { key: 'bezier', label: t('geomBezier') },
                { key: 'straight', label: t('geomStraight') },
                { key: 'step', label: t('geomStep') },
                { key: 'arc', label: t('geomArc') },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setLineStyle(opt.key as any)}
                  className={`py-1.5 rounded-md border text-center transition-colors cursor-pointer ${
                    lineStyle === opt.key
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.5} />
                <span>{language === 'zh' ? '连线与标签色系' : 'Line & Badge Color'}</span>
              </label>
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-slate-300"
                  style={{ backgroundColor: color }}
                />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                  title={language === 'zh' ? '选择颜色' : 'Select color'}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border flex items-center justify-center transition-transform cursor-pointer ${
                    color.toLowerCase() === c.toLowerCase() ? 'scale-115 ring-2 ring-blue-500 ring-offset-1 border-white' : 'border-slate-200 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color.toLowerCase() === c.toLowerCase() && (
                    <Check className="w-3 h-3 text-white drop-shadow-xs" strokeWidth={1.5} />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'zh' ? '内部背景档案备注 (仅悬浮详情与导出可见)' : 'Background Notes (Tooltip & Export)'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'zh' ? '例如: 曾共同主导 2025 一期工程验收，信任度高' : 'e.g. Co-led Phase I project delivery in 2025, high mutual trust'}
              className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              onDelete(relation.id);
              onClose();
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{language === 'zh' ? '删除此关系' : 'Delete Link'}</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
            >
              {t('cancelBtn')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors cursor-pointer"
            >
              {t('saveBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
