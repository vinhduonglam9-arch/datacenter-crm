import React, { useState, useEffect } from 'react';
import { X, Frame, Trash2, Check } from 'lucide-react';
import { GroupFrame, CARD_COLORS } from '../types/crm.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface GroupFrameModalProps {
  isOpen: boolean;
  frame: GroupFrame | null;
  onClose: () => void;
  onSave: (data: Partial<GroupFrame>) => void;
  onDelete?: (id: string) => void;
}

export const GroupFrameModal: React.FC<GroupFrameModalProps> = ({
  isOpen,
  frame,
  onClose,
  onSave,
  onDelete,
}) => {
  const { t, language } = useLanguage();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [color, setColor] = useState('#8B5CF6');
  const [width, setWidth] = useState(360);
  const [height, setHeight] = useState(420);

  useEffect(() => {
    if (frame) {
      setTitle(frame.title || '');
      setSubtitle(frame.subtitle || '');
      setColor(frame.color || '#8B5CF6');
      setWidth(frame.width || 360);
      setHeight(frame.height || 420);
    } else {
      setTitle(language === 'zh' ? '新阵营分组区域' : 'New Decision Group Frame');
      setSubtitle(language === 'zh' ? '核心决策组 · 协同专班' : 'Core Decision Team · Working Group');
      setColor('#8B5CF6');
      setWidth(360);
      setHeight(420);
    }
  }, [frame, isOpen, language]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      color,
      width: Math.max(180, Number(width) || 360),
      height: Math.max(140, Number(height) || 420),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Frame className="w-4 h-4 text-purple-600" strokeWidth={1.5} />
            <h3 className="text-sm font-bold text-slate-900">
              {frame
                ? (language === 'zh' ? '编辑阵营分组框' : 'Edit Group Frame')
                : (language === 'zh' ? '新建阵营分组框' : 'New Group Frame')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
            title={t('closeBtn')}
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {language === 'zh' ? '阵营分组框标题' : 'Group Frame Title'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={language === 'zh' ? '如：业主方核心决策链 / 我方铁三角作战组' : 'e.g. Client Core Decision Chain / Internal Taskforce'}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {language === 'zh' ? '副标题 / 职能说明' : 'Subtitle / Function Note'}
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder={language === 'zh' ? '如：投资拍板 · 技术定标 · 商务招采' : 'e.g. Budget Approval · Technical Spec · Procurement'}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {language === 'zh' ? '宽度 (px)' : 'Width (px)'}
              </label>
              <input
                type="number"
                min={180}
                max={2400}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {language === 'zh' ? '高度 (px)' : 'Height (px)'}
              </label>
              <input
                type="number"
                min={140}
                max={2400}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              {language === 'zh' ? '边框与阵营主题色' : 'Border & Frame Theme Color'}
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {CARD_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-6 h-6 rounded-full border flex items-center justify-center transition-transform cursor-pointer ${
                    color.toLowerCase() === c.value.toLowerCase()
                      ? 'scale-115 ring-2 ring-blue-500 ring-offset-1 border-white'
                      : 'border-slate-200'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                >
                  {color.toLowerCase() === c.value.toLowerCase() && (
                    <Check className="w-3 h-3 text-white" strokeWidth={1.5} />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {frame && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(frame.id);
                  onClose();
                }}
                className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-medium flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>{language === 'zh' ? '删除分组框' : 'Delete Frame'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
              >
                {t('cancelBtn')}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-2xs cursor-pointer"
              >
                {t('saveBtn')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
