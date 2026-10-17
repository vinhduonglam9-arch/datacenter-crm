import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Upload, Trash2, UserCheck, Flame, Cpu, ShieldCheck } from 'lucide-react';
import { Person, CARD_COLORS, STAGE_LIST, RelationshipStage, DC_SPECIALTY_MODULES } from '../types/crm.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface PersonModalProps {
  isOpen: boolean;
  person?: Person | null;
  onClose: () => void;
  onSave: (personData: Partial<Person>) => void;
  onRemoveFromCanvas?: (id: string) => void;
  onDeletePerson?: (id: string) => void;
}

export const PersonModal: React.FC<PersonModalProps> = ({
  isOpen,
  person,
  onClose,
  onSave,
  onRemoveFromCanvas,
  onDeletePerson,
}) => {
  const { t, language } = useLanguage();
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [bio, setBio] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [cardColor, setCardColor] = useState('#3B82F6');
  const [relationshipStage, setRelationshipStage] = useState<RelationshipStage>('exploring');
  const [specialty, setSpecialty] = useState('液冷与暖通系统 (CDU/冷机)');
  const [vendorPreference, setVendorPreference] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [confirmDeleteState, setConfirmDeleteState] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const presetTags = useMemo(() => {
    if (language === 'zh') {
      return [
        '拍板决策人',
        '技术把关',
        '商务把关',
        '内线支持',
        '业主方',
        '我方团队',
        '设计院',
        'EPC总包',
        '竞争对手',
      ];
    }
    return [
      'Key Decision Maker',
      'Technical Gatekeeper',
      'Commercial Gatekeeper',
      'Internal Champion',
      'Client',
      'Our Team',
      'Design Institute',
      'EPC General',
      'Competitor',
    ];
  }, [language]);

  useEffect(() => {
    if (person) {
      setName(person.name || '');
      setTitle(person.title || '');
      setCompany(person.company || '');
      setBio(person.bio || '');
      setTags(person.tags || []);
      setAvatarUrl(person.avatarUrl || '');
      setCardColor(person.cardColor || '#3B82F6');
      setRelationshipStage(person.relationshipStage || 'exploring');
      setSpecialty(person.specialty || '液冷与暖通系统 (CDU/冷机)');
      setVendorPreference(person.vendorPreference || '');
      setPhone(person.phone || '');
      setEmail(person.email || '');
    } else {
      setName('');
      setTitle('');
      setCompany('');
      setBio('');
      setTags(language === 'zh' ? ['技术把关', '业主方'] : ['Technical Gatekeeper', 'Client']);
      setAvatarUrl('');
      setCardColor('#3B82F6');
      setRelationshipStage('exploring');
      setSpecialty('液冷与暖通系统 (CDU/冷机)');
      setVendorPreference('');
      setPhone('');
      setEmail('');
    }
    setCustomTag('');
    setConfirmDeleteState(false);
  }, [person, isOpen, language]);

  if (!isOpen) return null;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setAvatarUrl(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    const trimmed = customTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setCustomTag('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      title: title.trim() || (language === 'zh' ? '未填职位' : 'N/A'),
      company: company.trim(),
      bio: bio.trim(),
      tags,
      avatarUrl,
      cardColor,
      relationshipStage,
      specialty,
      vendorPreference: vendorPreference.trim(),
      phone: phone.trim(),
      email: email.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: cardColor }}
            />
            <h3 className="text-sm font-bold text-slate-900">
              {person
                ? (language === 'zh' ? '编辑干系人档案' : 'Edit Stakeholder Profile')
                : (language === 'zh' ? '新建算力项目干系人' : 'New Project Stakeholder')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
            title={t('closeBtn')}
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          <div className="flex items-center gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 flex flex-col items-center justify-center cursor-pointer overflow-hidden shrink-0 group transition-colors"
              title={language === 'zh' ? '上传头像照片' : 'Upload photo'}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Upload className="w-4 h-4 text-slate-400 group-hover:text-blue-500" strokeWidth={1.5} />
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {language === 'zh' ? '上传照片' : 'Upload'}
                  </span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1 space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {language === 'zh' ? '姓名' : 'Full Name'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'zh' ? '请输入姓名' : 'Enter name'}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {language === 'zh' ? '职务与角色头衔' : 'Job Title & Role'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={language === 'zh' ? '如：智算中心总工程师 / 招采总监' : 'e.g. Chief Engineer / Procurement Director'}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {language === 'zh' ? '所属单位 / 机构' : 'Company / Organization'}
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={language === 'zh' ? '如：华云数字科技集团' : 'e.g. Cloud Telecom Group'}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {language === 'zh' ? '联系电话' : 'Phone'}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={language === 'zh' ? '手机或座机号码' : 'Phone or mobile'}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.5} />
                {t('thSpecialty')}
              </label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              >
                {DC_SPECIALTY_MODULES.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
                {language === 'zh' ? '厂商倾向与偏好' : 'Vendor Preference'}
              </label>
              <input
                type="text"
                value={vendorPreference}
                onChange={(e) => setVendorPreference(e.target.value)}
                placeholder={language === 'zh' ? '如：认可我方液冷冗余架构' : 'e.g. Strongly prefers our CDU redundant design'}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {language === 'zh' ? '职责与评标关注点摘要' : 'Responsibilities & Key Evaluation Criteria'}
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={language === 'zh' ? '记录其在 CDU/HVDC 选型、工程量清单 (BOQ) 或商务付款条件上的核心诉求...' : 'Key focus on CDU specs, BOQ tender items or milestones...'}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
              {language === 'zh' ? '阵营与角色属性标签' : 'Faction & Role Tags'}
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {presetTags.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                placeholder={language === 'zh' ? '输入自定义标签后回车' : 'Enter custom tag'}
                className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium cursor-pointer"
              >
                {language === 'zh' ? '添加标签' : 'Add'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500" strokeWidth={1.5} />
              {t('thTemperature')}
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {STAGE_LIST.map((st) => {
                const isSelected = relationshipStage === st.key;
                return (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setRelationshipStage(st.key)}
                    className={`py-1.5 px-1 rounded-lg border text-[11px] font-medium flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{st.emoji}</span>
                    <span>
                      {language === 'zh' ? st.label : (
                        st.key === 'hot' ? 'Champion' :
                        st.key === 'warm' ? 'Supporter' :
                        st.key === 'exploring' ? 'Exploring' :
                        st.key === 'cold' ? 'Neutral' : 'Competitor'
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
              {language === 'zh' ? '卡片强调主题色' : 'Card Theme Color'}
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {CARD_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCardColor(c.value)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                    cardColor === c.value ? 'scale-120 border-slate-900 shadow-xs' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {person ? (
              <div className="flex items-center gap-2">
                {person.onCanvas && onRemoveFromCanvas && (
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveFromCanvas(person.id);
                      onClose();
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs text-amber-600 hover:bg-amber-50 font-medium transition-colors cursor-pointer"
                  >
                    {t('sidebarRemoveFromCanvas')}
                  </button>
                )}
                {onDeletePerson && (
                  confirmDeleteState ? (
                    <div className="flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                      <span className="text-[11px] text-rose-700 font-medium">
                        {language === 'zh' ? '确认删除？' : 'Confirm?'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onDeletePerson(person.id);
                          onClose();
                        }}
                        className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-semibold hover:bg-rose-700 cursor-pointer"
                      >
                        {t('confirmBtn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteState(false)}
                        className="px-1.5 py-0.5 text-slate-500 hover:text-slate-700 text-[11px] cursor-pointer"
                      >
                        {t('cancelBtn')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteState(true)}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>{t('deleteBtn')}</span>
                    </button>
                  )
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {t('cancelBtn')}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>{t('saveBtn')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
