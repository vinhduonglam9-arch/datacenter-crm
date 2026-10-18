import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Edit2,
  Trash2,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Database,
  Users,
  CheckCircle2,
  Building2,
  Briefcase,
} from 'lucide-react';
import { Person } from '../types/crm.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  people: Person[];
  onNewPerson: () => void;
  onSelectPerson: (person: Person) => void;
  onEditPerson: (person: Person) => void;
  onAddToCanvas: (personId: string) => void;
  onRemoveFromCanvas: (personId: string) => void;
  onLoadSampleData: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  people,
  onNewPerson,
  onSelectPerson,
  onEditPerson,
  onAddToCanvas,
  onRemoveFromCanvas,
  onLoadSampleData,
}) => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabKey, setActiveTabKey] = useState<string>('all');

  const filterTabs = useMemo(() => [
    { key: 'all', label: t('sidebarFilterAll') },
    { key: 'onCanvas', label: t('sidebarFilterOnCanvas') },
    { key: 'client', label: t('sidebarFilterClient'), matches: ['业主方', '客户', 'client'] },
    { key: 'team', label: t('sidebarFilterOurTeam'), matches: ['我方团队', '铁三角', 'our team'] },
    { key: 'epc', label: t('sidebarFilterEpc'), matches: ['分包', 'subcontractor'] },
    { key: 'design', label: t('sidebarFilterDesign'), matches: ['设计院', '咨询', '顾问', 'design', 'consult'] },
    { key: 'competitor', label: t('sidebarFilterCompetitor'), matches: ['竞争对手', '友商', 'competitor'] },
  ], [t]);

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        person.name.toLowerCase().includes(q) ||
        person.title.toLowerCase().includes(q) ||
        (person.company && person.company.toLowerCase().includes(q)) ||
        (person.specialty && person.specialty.toLowerCase().includes(q)) ||
        person.bio.toLowerCase().includes(q) ||
        person.tags.some((tg) => tg.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (activeTabKey === 'all') return true;
      if (activeTabKey === 'onCanvas') return person.onCanvas;

      const currentTab = filterTabs.find((ft) => ft.key === activeTabKey);
      if (!currentTab || !currentTab.matches) return true;

      // Prevent subcontractors from leaking into "Our Team" tab
      const isSub =
        person.tags.some((tg) => tg.includes('分包')) ||
        (person.company && person.company.includes('分包'));
      if (activeTabKey === 'team' && isSub) return false;

      return currentTab.matches.some((m) => {
        const matchTerm = m.toLowerCase();
        return (
          person.tags.some((tg) => tg.toLowerCase().includes(matchTerm)) ||
          (person.company && person.company.toLowerCase().includes(matchTerm)) ||
          (person.specialty && person.specialty.toLowerCase().includes(matchTerm))
        );
      });
    });
  }, [people, searchQuery, activeTabKey, filterTabs]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, person: Person) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ personId: person.id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  if (isCollapsed) {
    return (
      <div className="relative w-0 h-full z-20">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-16 bg-white border border-l-0 border-slate-200 rounded-r-lg shadow-md flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-all cursor-pointer"
          title={t('expandSidebar')}
          aria-label={t('expandSidebar')}
        >
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <aside className="relative w-72 h-full bg-white border-r border-slate-200 flex flex-col select-none z-20 shrink-0">
      {/* Collapse Handle */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="absolute -right-5 top-1/2 -translate-y-1/2 w-5 h-14 bg-white border border-l-0 border-slate-200 rounded-r-md shadow-xs flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-colors z-30 cursor-pointer"
        title={t('collapseSidebar')}
        aria-label={t('collapseSidebar')}
      >
        <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>

      {/* Top Header & Quick Add */}
      <div className="p-3.5 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
            <span className="text-xs font-bold text-slate-800">{t('sidebarTitle')}</span>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {people.filter((p) => p.onCanvas).length}/{people.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onNewPerson}
            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors shrink-0 cursor-pointer"
            title={t('newStakeholder')}
            aria-label={t('newStakeholder')}
          >
            <UserPlus className="w-4 h-4" strokeWidth={1.7} />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('sidebarSearchPlaceholder')}
            aria-label={t('sidebarSearchPlaceholder')}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        {/* Interactive Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mt-2.5 pb-0.5">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTabKey(tab.key)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTabKey === tab.key
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* People List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredPeople.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="text-slate-500 text-xs font-semibold mb-1">{t('sidebarNoPeople')}</div>
            <div className="text-slate-400 text-[11px] mb-3">{t('sidebarNoPeopleSub')}</div>
            <button
              type="button"
              onClick={onNewPerson}
              className="text-xs text-blue-600 font-medium hover:underline cursor-pointer"
            >
              {t('newStakeholder')}
            </button>
          </div>
        ) : (
          filteredPeople.map((person) => (
            <div
              key={person.id}
              draggable
              onDragStart={(e) => handleDragStart(e, person)}
              onClick={() => onSelectPerson(person)}
              className={`group relative p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                person.onCanvas
                  ? 'bg-white border-slate-200/90 hover:border-blue-300 shadow-2xs'
                  : 'bg-slate-50/70 border-dashed border-slate-200 hover:border-blue-300 hover:bg-white'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {/* Avatar */}
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center">
                  {person.avatarUrl ? (
                    <img
                      src={person.avatarUrl}
                      alt={person.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span
                      className="text-xs font-bold text-white w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: person.cardColor || '#3B82F6' }}
                    >
                      {person.name.slice(0, 1)}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {person.name}
                    </span>
                    {person.onCanvas ? (
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium shrink-0"
                        title={language === 'zh' ? '已在画布中' : 'Placed on canvas'}
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" strokeWidth={1.5} />
                        <span>{language === 'zh' ? '已上画' : 'On Canvas'}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {language === 'zh' ? '待上画' : 'Not on Canvas'}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-blue-600 font-medium truncate mt-0.5">
                    {person.title}
                  </div>

                  {person.company && (
                    <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <Building2 className="w-2.5 h-2.5 text-slate-400 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{person.company}</span>
                    </div>
                  )}

                  {/* Specialty & Role Metadata */}
                  <div className="text-[10px] text-slate-400 truncate mt-1">
                    {person.specialty ? `${person.specialty} · ` : ''}
                    {person.tags.slice(0, 2).join(' / ')}
                  </div>
                </div>
              </div>

              {/* Hover Actions */}
              <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] opacity-85 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  {person.onCanvas
                    ? (language === 'zh' ? '点击在画布聚焦' : 'Click to locate')
                    : (language === 'zh' ? '拖拽放入画布' : 'Drag to canvas')}
                </span>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {!person.onCanvas ? (
                    <button
                      type="button"
                      onClick={() => onAddToCanvas(person.id)}
                      className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                      title={t('sidebarAddToCanvas')}
                      aria-label={t('sidebarAddToCanvas')}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.7} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRemoveFromCanvas(person.id)}
                      className="px-1.5 py-0.5 rounded text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                      title={t('sidebarRemoveFromCanvas')}
                    >
                      <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onEditPerson(person)}
                    className="px-1.5 py-0.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                    title={language === 'zh' ? '编辑人物档案' : 'Edit profile'}
                  >
                    <Edit2 className="w-3 h-3" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Sample Data Loader */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/60">
        <button
          type="button"
          onClick={onLoadSampleData}
          className="w-full py-2 px-3 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          title={t('sidebarLoadSample')}
        >
          <Database className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.5} />
          <span>{t('sidebarLoadSample')}</span>
        </button>
      </div>
    </aside>
  );
};
