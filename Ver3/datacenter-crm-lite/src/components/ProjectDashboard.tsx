import React, { useState, useMemo } from 'react';
import {
  Server,
  Building2,
  Users,
  GitFork,
  Clock,
  Plus,
  Edit2,
  ArrowUpRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  TrendingUp,
  Calendar,
  Trash2,
  X,
} from 'lucide-react';
import {
  ProjectMap,
  Person,
  Relationship,
  GroupFrame,
  VisitRecord,
  STAGE_LIST,
  DC_SPECIALTY_MODULES,
  RelationshipStage,
} from '../types/crm.ts';
import {
  loadSavedPeople,
  loadSavedRelationships,
  loadSavedVisitRecords,
  loadSavedGroupFrames,
} from '../utils/storage.ts';
import { calculateRelationshipStrength } from '../utils/relationship-strength.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface ProjectDashboardProps {
  projects: ProjectMap[];
  activeProject: ProjectMap;
  people: Person[];
  relationships: Relationship[];
  groupFrames: GroupFrame[];
  visits: VisitRecord[];
  onSelectProject: (projectId: string) => void;
  onEnterCanvas: (projectId?: string, focusPersonId?: string) => void;
  onCreateProject: (proj: Omit<ProjectMap, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateProject: (id: string, data: Partial<ProjectMap>) => void;
  onDeleteProject: (id: string) => void;
  onEditPerson: (person: Person) => void;
  onOpenNewPerson: () => void;
  onOpenTimeline: (person: Person) => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  projects,
  activeProject,
  people,
  relationships,
  visits,
  onSelectProject,
  onEnterCanvas,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onEditPerson,
  onOpenNewPerson,
  onOpenTimeline,
}) => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [personSearch, setPersonSearch] = useState('');
  const [personStageFilter, setPersonStageFilter] = useState<string>('all');

  // Project Create / Edit Modal State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProj, setEditingProj] = useState<ProjectMap | null>(null);
  const [projCode, setProjCode] = useState('');
  const [projName, setProjName] = useState('');
  const [projCompany, setProjCompany] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projScale, setProjScale] = useState('');
  const [projPue, setProjPue] = useState('');
  const [projTier, setProjTier] = useState('');
  const [projCooling, setProjCooling] = useState('');
  const [projBudget, setProjBudget] = useState('');
  const [projBidding, setProjBidding] = useState('');
  const [projWinProb, setProjWinProb] = useState<number>(75);
  const [projOwnerLead, setProjOwnerLead] = useState('');

  const openCreateProjectModal = () => {
    setEditingProj(null);
    setProjCode(`AIDC-2026-0${projects.length + 1}`);
    setProjName('');
    setProjCompany('');
    setProjDesc('');
    setProjScale('40 MW · 5,000 机柜');
    setProjPue('PUE ≤ 1.15');
    setProjTier('国标 A级 / Tier III+');
    setProjCooling('冷板式液冷 + 间接蒸发冷');
    setProjBudget('¥ 5.20 亿');
    setProjBidding('技术交流与立项');
    setProjWinProb(70);
    setProjOwnerLead('李晓峰 (AR)');
    setIsProjectModalOpen(true);
  };

  const openEditProjectModal = (proj: ProjectMap) => {
    setEditingProj(proj);
    setProjCode(proj.code || '');
    setProjName(proj.name || '');
    setProjCompany(proj.companyName || '');
    setProjDesc(proj.description || '');
    setProjScale(proj.scaleMw || '');
    setProjPue(proj.targetPue || '');
    setProjTier(proj.tierLevel || '');
    setProjCooling(proj.coolingType || '');
    setProjBudget(proj.contractBudget || '');
    setProjBidding(proj.biddingStage || '');
    setProjWinProb(proj.winProbability ?? 75);
    setProjOwnerLead(proj.ownerLead || '李晓峰 (AR)');
    setIsProjectModalOpen(true);
  };

  const handleSaveProjectForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;
    const payload = {
      code: projCode.trim() || 'IDC-2026',
      name: projName.trim(),
      companyName: projCompany.trim() || '待确认业主单位',
      description: projDesc.trim(),
      scaleMw: projScale.trim() || '30 MW',
      targetPue: projPue.trim() || 'PUE ≤ 1.15',
      tierLevel: projTier.trim() || '国标 A级',
      coolingType: projCooling.trim() || '冷板式液冷',
      contractBudget: projBudget.trim() || '¥ 3.50 亿',
      biddingStage: projBidding.trim() || '深化设计',
      winProbability: projWinProb,
      ownerLead: projOwnerLead.trim() || '李晓峰 (AR)',
    };
    if (editingProj) {
      onUpdateProject(editingProj.id, payload);
    } else {
      onCreateProject(payload);
    }
    setIsProjectModalOpen(false);
  };

  // Compute Portfolio-wide stats across all projects
  const portfolioStats = useMemo(() => {
    let totalBudgetYi = 0;
    let totalMw = 0;
    let totalPeopleCount = 0;
    let totalHotWarmCount = 0;
    let totalRelCount = 0;
    let totalVisitsCount = 0;

    const projectSummaries = projects.map((proj) => {
      const pList = proj.id === activeProject.id ? people : loadSavedPeople(proj.id);
      const rList = proj.id === activeProject.id ? relationships : loadSavedRelationships(proj.id);
      const vList = proj.id === activeProject.id ? visits : loadSavedVisitRecords(proj.id);
      const fList = loadSavedGroupFrames(proj.id);

      const budgetMatch = (proj.contractBudget || '').match(/([\d.]+)/);
      const budgetVal = budgetMatch ? parseFloat(budgetMatch[1]) : 0;
      totalBudgetYi += budgetVal;

      const mwMatch = (proj.scaleMw || '').match(/([\d.]+)\s*MW/i);
      const mwVal = mwMatch ? parseFloat(mwMatch[1]) : 0;
      totalMw += mwVal;

      const hotCount = pList.filter((p) => p.relationshipStage === 'hot').length;
      const warmCount = pList.filter((p) => p.relationshipStage === 'warm').length;
      const blockedCount = pList.filter((p) => p.relationshipStage === 'blocked').length;

      totalPeopleCount += pList.length;
      totalHotWarmCount += hotCount + warmCount;
      totalRelCount += rList.length;
      totalVisitsCount += vList.length;

      const healthScore =
        pList.length > 0
          ? Math.min(
              100,
              Math.round(((hotCount * 1.0 + warmCount * 0.75) / pList.length) * 85 + Math.min(15, rList.length * 1.5))
            )
          : 50;

      return {
        project: proj,
        peopleCount: pList.length,
        onCanvasCount: pList.filter((p) => p.onCanvas).length,
        relCount: rList.length,
        visitCount: vList.length,
        frameCount: fList.length,
        hotCount,
        warmCount,
        blockedCount,
        healthScore,
      };
    });

    return {
      totalBudgetYi: totalBudgetYi.toFixed(2),
      totalMw: Math.round(totalMw),
      totalPeopleCount,
      totalHotWarmCount,
      supportRate:
        totalPeopleCount > 0 ? Math.round((totalHotWarmCount / totalPeopleCount) * 100) : 0,
      totalRelCount,
      totalVisitsCount,
      projectSummaries,
    };
  }, [projects, activeProject.id, people, relationships, visits]);

  // Filter project cards
  const filteredProjectSummaries = useMemo(() => {
    return portfolioStats.projectSummaries.filter(({ project }) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        project.name.toLowerCase().includes(q) ||
        project.companyName.toLowerCase().includes(q) ||
        (project.code && project.code.toLowerCase().includes(q)) ||
        (project.coolingType && project.coolingType.toLowerCase().includes(q));
      if (!matchesSearch) return false;
      if (stageFilter === 'all') return true;
      return (project.biddingStage || '').includes(stageFilter);
    });
  }, [portfolioStats.projectSummaries, searchQuery, stageFilter]);

  // Active Project Deep-Dive Analytics
  const activeProjectAnalytics = useMemo(() => {
    const peopleMap = new Map<string, Person>();
    people.forEach((p) => peopleMap.set(p.id, p));

    // Stage breakdown
    const stageCounts: Record<RelationshipStage, number> = {
      hot: 0,
      warm: 0,
      exploring: 0,
      cold: 0,
      blocked: 0,
    };
    people.forEach((p) => {
      const st = p.relationshipStage || 'exploring';
      stageCounts[st] = (stageCounts[st] || 0) + 1;
    });

    // Specialty coverage
    const specialtyBreakdown = DC_SPECIALTY_MODULES.map((spec) => {
      const matched = people.filter((p) => p.specialty === spec);
      const hotOrWarm = matched.filter(
        (p) => p.relationshipStage === 'hot' || p.relationshipStage === 'warm'
      ).length;
      return {
        specialty: spec,
        total: matched.length,
        hotOrWarm,
        peopleNames: matched.map((p) => p.name),
      };
    });

    // Strong relationships count
    let strongLinks = 0;
    relationships.forEach((r) => {
      const res = calculateRelationshipStrength(
        r,
        peopleMap.get(r.sourceId),
        peopleMap.get(r.targetId),
        visits
      );
      if (res.level >= 4) strongLinks++;
    });

    // Connection count per person
    const connCountMap = new Map<string, number>();
    relationships.forEach((r) => {
      connCountMap.set(r.sourceId, (connCountMap.get(r.sourceId) || 0) + 1);
      connCountMap.set(r.targetId, (connCountMap.get(r.targetId) || 0) + 1);
    });

    // Latest visit per person
    const latestVisitMap = new Map<string, VisitRecord>();
    visits.forEach((v) => {
      const existing = latestVisitMap.get(v.personId);
      if (!existing || v.date > existing.date) {
        latestVisitMap.set(v.personId, v);
      }
    });

    return {
      stageCounts,
      specialtyBreakdown,
      strongLinks,
      connCountMap,
      latestVisitMap,
      peopleMap,
    };
  }, [people, relationships, visits]);

  // Filtered stakeholders for the active project table
  const filteredStakeholders = useMemo(() => {
    return people.filter((p) => {
      const q = personSearch.toLowerCase();
      const matchesQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        (p.company && p.company.toLowerCase().includes(q)) ||
        (p.specialty && p.specialty.toLowerCase().includes(q)) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchesQ) return false;
      if (personStageFilter === 'all') return true;
      return (p.relationshipStage || 'exploring') === personStageFilter;
    });
  }, [people, personSearch, personStageFilter]);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50/70 text-slate-900 select-none">
      <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-8">
        {/* Section 1: Executive Portfolio Header & 4-Column KPI Strip */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {t('dashboardTitle')}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {t('dashboardDesc')}
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={openCreateProjectModal}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.5} />
                <span>{t('newProjectBtn')}</span>
              </button>
              <button
                type="button"
                onClick={() => onEnterCanvas(activeProject.id)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
              >
                <span>{t('enterCurrentCanvas')}</span>
                <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* 4-Column Portfolio KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{t('kpiBudgetTitle')}</span>
                <Server className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
              </div>
              <div className="mt-2 flex items-baseline gap-2 font-mono tabular-nums">
                <span className="text-2xl font-bold text-slate-900">
                  ¥ {portfolioStats.totalBudgetYi} {language === 'zh' ? '亿' : 'B'}
                </span>
                <span className="text-xs text-blue-600 font-semibold">
                  {projects.length} {language === 'zh' ? '个重点项目' : 'Projects'}
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-slate-400 font-mono tabular-nums">
                {t('kpiBudgetSub', { mw: portfolioStats.totalMw })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{t('kpiPeopleTitle')}</span>
                <Users className="w-4 h-4 text-emerald-600" strokeWidth={1.5} />
              </div>
              <div className="mt-2 flex items-baseline gap-2 font-mono tabular-nums">
                <span className="text-2xl font-bold text-slate-900">
                  {portfolioStats.totalPeopleCount} {language === 'zh' ? '位' : 'Stakeholders'}
                </span>
                <span className="text-xs text-emerald-600 font-semibold">
                  {t('kpiPeopleRate')} {portfolioStats.supportRate}%
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-slate-400 font-mono tabular-nums">
                {t('kpiPeopleSub', { count: portfolioStats.totalHotWarmCount })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{t('kpiRelsTitle')}</span>
                <GitFork className="w-4 h-4 text-indigo-600" strokeWidth={1.5} />
              </div>
              <div className="mt-2 flex items-baseline gap-2 font-mono tabular-nums">
                <span className="text-2xl font-bold text-slate-900">
                  {portfolioStats.totalRelCount} {language === 'zh' ? '条' : 'Links'}
                </span>
                <span className="text-xs text-indigo-600 font-semibold">
                  {t('kpiRelsStrong')} {activeProjectAnalytics.strongLinks} {language === 'zh' ? '条' : ''}
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-slate-400 truncate">
                {activeProject.name}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{t('kpiVisitsTitle')}</span>
                <Clock className="w-4 h-4 text-amber-600" strokeWidth={1.5} />
              </div>
              <div className="mt-2 flex items-baseline gap-2 font-mono tabular-nums">
                <span className="text-2xl font-bold text-slate-900">
                  {portfolioStats.totalVisitsCount} {language === 'zh' ? '场次' : 'Visits'}
                </span>
                <span className="text-xs text-amber-600 font-semibold">
                  {t('kpiVisitsCurrent', { count: visits.length })}
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-slate-400">
                {t('kpiVisitsSub')}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Multi-Project Engineering Portfolio Cards */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-900">
                {t('projectMatrixTitle', { count: filteredProjectSummaries.length })}
              </h2>
              <span className="text-xs text-slate-500 hidden md:inline">
                {t('projectMatrixSub')}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchProjectPlaceholder')}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-52"
                />
              </div>

              {/* Stage Segmented Filter */}
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg text-xs">
                {[
                  { key: 'all', label: t('stageAll') },
                  { key: '封标', label: t('stageBidding') },
                  { key: '立项', label: t('stageApproval') },
                  { key: '询价', label: t('stageInquiry') },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStageFilter(tab.key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      stageFilter === tab.key
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {filteredProjectSummaries.map((item) => {
              const {
                project: proj,
                peopleCount,
                relCount,
                visitCount,
                hotCount,
                warmCount,
                blockedCount,
                healthScore,
              } = item;
              const isSelected = proj.id === activeProject.id;

              return (
                <div
                  key={proj.id}
                  onClick={() => onSelectProject(proj.id)}
                  className={`bg-white rounded-xl border p-5 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Top Kicker: Code & Budget */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 font-mono tabular-nums">
                      <span>
                        {proj.code || 'IDC-2026'}
                        {isSelected ? ` · ${t('activeWorkspace')}` : ''}
                      </span>
                      <span className="text-sm font-bold text-blue-600">
                        {proj.contractBudget || '¥ 4.85 亿'}
                      </span>
                    </div>

                    {/* Project Title */}
                    <h3 className="text-base font-bold text-slate-900 mt-1.5 leading-snug">
                      {proj.name}
                    </h3>

                    {/* Unboxed Metadata Line */}
                    <div className="mt-1.5 text-xs text-slate-600 flex items-center gap-1.5 flex-wrap font-mono tabular-nums">
                      <span className="font-sans font-medium text-slate-800">{proj.companyName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{proj.scaleMw}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-700 font-semibold">{proj.targetPue}</span>
                    </div>

                    <div className="mt-1 text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                      <span>{proj.tierLevel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{proj.coolingType}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-700 font-medium">{proj.biddingStage}</span>
                    </div>

                    {proj.description && (
                      <p className="mt-2.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {proj.description}
                      </p>
                    )}

                    {/* Decision Chain Readiness Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-1.5 font-mono tabular-nums">
                        <span className="font-sans text-slate-600 font-medium">
                          {t('readinessScore')}
                        </span>
                        <span className="font-bold text-slate-900">
                          {proj.winProbability ?? healthScore}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full transition-all"
                          style={{ width: `${proj.winProbability ?? healthScore}%` }}
                        />
                      </div>

                      {/* Key Metrics Row */}
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
                        <span>{t('metricStakeholders')} {peopleCount}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-600">{t('metricSupporters')} {hotCount + warmCount}</span>
                        <span aria-hidden="true">·</span>
                        <span className={blockedCount > 0 ? 'text-rose-600 font-semibold' : ''}>
                          {t('metricBlocked')} {blockedCount}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{t('metricLinks')} {relCount}</span>
                        <span aria-hidden="true">·</span>
                        <span>{t('metricVisits')} {visitCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div
                    className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditProjectModal(proj)}
                        className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3 text-slate-500" strokeWidth={1.5} />
                        <span>{t('editParameters')}</span>
                      </button>
                      {projects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteProject(proj.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title={t('deleteBtn')}
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onEnterCanvas(proj.id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                    >
                      <span>{t('openWhiteboard')}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Active Project Deep-Dive Analytics */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {t('activeProjectReview', { name: activeProject.name })}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                {activeProject.companyName} · {activeProject.scaleMw} · {activeProject.targetPue} · {t('budgetLabel')} {activeProject.contractBudget}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenNewPerson}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>{t('addStakeholderBtn')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 5 Columns: Temperature Breakdown + Specialty Coverage */}
            <div className="lg:col-span-5 space-y-6">
              {/* Stakeholder Temperature Breakdown */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    {t('temperatureDistTitle')}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono tabular-nums">
                    {t('totalPeople', { count: people.length })}
                  </span>
                </div>

                <div className="space-y-3">
                  {STAGE_LIST.map((st) => {
                    const count = activeProjectAnalytics.stageCounts[st.key] || 0;
                    const pct = people.length > 0 ? Math.round((count / people.length) * 100) : 0;
                    const isFiltered = personStageFilter === st.key;
                    return (
                      <div
                        key={st.key}
                        onClick={() =>
                          setPersonStageFilter(personStageFilter === st.key ? 'all' : st.key)
                        }
                        className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                          isFiltered
                            ? 'border-blue-500 bg-blue-50/40'
                            : 'border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-slate-800">
                            {st.emoji} {language === 'zh' ? st.label : (
                              st.key === 'hot' ? 'Champion' :
                              st.key === 'warm' ? 'Supporter' :
                              st.key === 'exploring' ? 'Exploring' :
                              st.key === 'cold' ? 'Neutral' : 'Competitor'
                            )}
                          </span>
                          <span className="font-mono tabular-nums text-slate-600">
                            {count} {language === 'zh' ? '人' : 'people'} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: st.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Data Center 7 Specialty Modules Coverage */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
                    <span>{t('specialtyCoverageTitle')}</span>
                  </h3>
                  <span className="text-xs text-slate-400">{t('specialtyCoverageSub')}</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {activeProjectAnalytics.specialtyBreakdown.map((item) => {
                    const hasBlindSpot = item.total === 0;
                    return (
                      <div
                        key={item.specialty}
                        className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-800 truncate">
                            {item.specialty}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {item.peopleNames.length > 0
                              ? item.peopleNames.join('、')
                              : t('unmappedAlert')}
                          </div>
                        </div>
                        <div className="text-right font-mono tabular-nums shrink-0">
                          {hasBlindSpot ? (
                            <span className="text-amber-600 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />
                              {t('toConnect')}
                            </span>
                          ) : (
                            <span className="text-slate-700 font-semibold">
                              {item.total} {language === 'zh' ? '人' : 'people'} · {language === 'zh' ? '支持' : 'support'} {item.hotOrWarm}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 7 Columns: High-Density Stakeholder Action Table & Recent Visits */}
            <div className="lg:col-span-7 space-y-6">
              {/* High-Density Stakeholder Action Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {t('stakeholderLedgerTitle', { count: filteredStakeholders.length })}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t('stakeholderLedgerSub')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
                      <input
                        type="text"
                        value={personSearch}
                        onChange={(e) => setPersonSearch(e.target.value)}
                        placeholder={t('searchStakeholderPlaceholder')}
                        className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 w-44"
                      />
                    </div>
                    {personStageFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setPersonStageFilter('all')}
                        className="px-2 py-1 text-xs text-blue-600 hover:underline cursor-pointer"
                      >
                        {t('resetFilter')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold">
                        <th className="py-2.5 px-4">{t('thNameTitle')}</th>
                        <th className="py-2.5 px-3">{t('thSpecialty')}</th>
                        <th className="py-2.5 px-3">{t('thTemperature')}</th>
                        <th className="py-2.5 px-3 text-right font-mono">{t('thLinks')}</th>
                        <th className="py-2.5 px-3">{t('thLatestVisit')}</th>
                        <th className="py-2.5 px-4 text-right">{t('thActions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStakeholders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            {t('noMatchingStakeholder')}
                          </td>
                        </tr>
                      ) : (
                        filteredStakeholders.map((p) => {
                          const stageMeta =
                            STAGE_LIST.find((s) => s.key === (p.relationshipStage || 'exploring')) ||
                            STAGE_LIST[2];
                          const connCount = activeProjectAnalytics.connCountMap.get(p.id) || 0;
                          const latestVisit = activeProjectAnalytics.latestVisitMap.get(p.id);

                          return (
                            <tr
                              key={p.id}
                              className="hover:bg-slate-50/90 transition-colors"
                            >
                              <td className="py-2.5 px-4">
                                <div className="font-bold text-slate-900">{p.name}</div>
                                <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                                  {p.title} · {p.company || (language === 'zh' ? '未填单位' : 'N/A')}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 max-w-[160px] truncate">
                                {p.specialty || (language === 'zh' ? '综合决策' : 'Decision')}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span
                                  className="font-semibold"
                                  style={{ color: stageMeta.color }}
                                >
                                  {stageMeta.emoji} {language === 'zh' ? stageMeta.label : (
                                    stageMeta.key === 'hot' ? 'Champion' :
                                    stageMeta.key === 'warm' ? 'Supporter' :
                                    stageMeta.key === 'exploring' ? 'Exploring' :
                                    stageMeta.key === 'cold' ? 'Neutral' : 'Competitor'
                                  )}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-700">
                                {connCount}
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                                {latestVisit ? latestVisit.date : t('noVisitRecord')}
                              </td>
                              <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => onEnterCanvas(activeProject.id, p.id)}
                                    className="text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                                  >
                                    {t('locateInCanvas')}
                                  </button>
                                  <span className="text-slate-300">·</span>
                                  <button
                                    type="button"
                                    onClick={() => onOpenTimeline(p)}
                                    className="text-emerald-600 hover:text-emerald-800 font-semibold hover:underline cursor-pointer"
                                  >
                                    {t('timelineBtn')}
                                  </button>
                                  <span className="text-slate-300">·</span>
                                  <button
                                    type="button"
                                    onClick={() => onEditPerson(p)}
                                    className="text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                                  >
                                    {t('editBtn')}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Project Visit Records & Next Actions */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {t('recentVisitsTitle', { count: visits.length })}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t('recentVisitsSub')}
                    </p>
                  </div>
                </div>

                {visits.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    {t('noVisitRecordsTip')}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {visits.slice(0, 5).map((v) => {
                      const person = activeProjectAnalytics.peopleMap.get(v.personId);
                      return (
                        <div key={v.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {person ? person.name : (language === 'zh' ? '干系人' : 'Stakeholder')}
                              </span>
                              <span className="text-slate-400">·</span>
                              <span className="text-slate-500">{person?.title}</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono tabular-nums text-slate-500">
                              <span>{v.date}</span>
                              {person && (
                                <button
                                  type="button"
                                  onClick={() => onOpenTimeline(person)}
                                  className="text-blue-600 hover:underline font-sans font-medium cursor-pointer"
                                >
                                  {language === 'zh' ? '详情' : 'Details'}
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{v.summary}</p>
                          {v.nextAction && (
                            <div className="text-[11px] text-blue-700 font-medium flex items-center gap-1.5 pt-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" strokeWidth={1.5} />
                              <span>{t('nextActionLabel')}{v.nextAction}</span>
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
        </div>
      </div>

      {/* Create / Edit Project Modal */}
      {isProjectModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
          onClick={() => setIsProjectModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingProj ? t('modalEditProject') : t('modalCreateProject')}
              </h3>
              <button
                type="button"
                onClick={() => setIsProjectModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                title={t('closeBtn')}
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSaveProjectForm} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('fieldName')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    placeholder={language === 'zh' ? '如：长三角智算中心三期 60MW 液冷工程' : 'e.g. Yangtze Delta AIDC Phase III 60MW'}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('fieldCode')}</label>
                  <input
                    type="text"
                    value={projCode}
                    onChange={(e) => setProjCode(e.target.value)}
                    placeholder="AIDC-2026-04"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('fieldCompany')}</label>
                  <input
                    type="text"
                    value={projCompany}
                    onChange={(e) => setProjCompany(e.target.value)}
                    placeholder={language === 'zh' ? '如：华东算力网络集团' : 'e.g. East Cloud Network Group'}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('fieldBudget')}</label>
                  <input
                    type="text"
                    value={projBudget}
                    onChange={(e) => setProjBudget(e.target.value)}
                    placeholder={language === 'zh' ? '如：¥ 5.20 亿' : 'e.g. ¥ 5.20 B'}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('fieldScale')}</label>
                  <input
                    type="text"
                    value={projScale}
                    onChange={(e) => setProjScale(e.target.value)}
                    placeholder="40 MW · 5,000 Racks"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('fieldPue')}</label>
                  <input
                    type="text"
                    value={projPue}
                    onChange={(e) => setProjPue(e.target.value)}
                    placeholder="PUE ≤ 1.15"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('fieldTier')}</label>
                  <input
                    type="text"
                    value={projTier}
                    onChange={(e) => setProjTier(e.target.value)}
                    placeholder="Tier III+ / GB Grade A"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('fieldCooling')}</label>
                  <input
                    type="text"
                    value={projCooling}
                    onChange={(e) => setProjCooling(e.target.value)}
                    placeholder={language === 'zh' ? '冷板式液冷 + 氟泵自然冷' : 'Cold Plate Liquid + Indirect Evaporative'}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('fieldBidding')}</label>
                  <input
                    type="text"
                    value={projBidding}
                    onChange={(e) => setProjBidding(e.target.value)}
                    placeholder={language === 'zh' ? '技术封标前夕' : 'Pre-Bidding Stage'}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('fieldWinProb')} ({projWinProb}%)
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={projWinProb}
                    onChange={(e) => setProjWinProb(Number(e.target.value))}
                    className="w-full mt-2 accent-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t('fieldDesc')}
                </label>
                <textarea
                  rows={2}
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  placeholder={language === 'zh' ? '简要描述本项目的供配电 (HVDC/UPS)、液冷 CDU、微模块或 EPC 总包标段划分...' : 'Brief overview of HVDC power, cooling CDU, containerized pods or EPC scope...'}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  {t('cancelBtn')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-2xs cursor-pointer"
                >
                  {t('saveBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
