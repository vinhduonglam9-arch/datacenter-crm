import type { Relationship, Person, VisitRecord, RelationshipStage } from '../types/crm.ts';

export interface StrengthBreakdown {
  baseScore: number;
  templateLabel: string;
  visitsCount: number;
  visitsBonus: number;
  stageBonus: number;
  stageLabel: string;
}

export interface RelationshipStrengthResult {
  score: number;        // Normalized score 0 - 100
  level: 1 | 2 | 3 | 4 | 5; // 1 (Weakest) to 5 (Strongest)
  levelLabel: string;   // e.g. "铁杆同盟", "深度协同", "稳固连接", "初步接触", "薄弱/排他"
  color: string;        // Visual color representing strength
  strokeWidth: number;  // Recommended line stroke thickness
  breakdown: StrengthBreakdown;
}

const TEMPLATE_BASE_SCORES: Record<string, { score: number; label: string }> = {
  decision_maker: { score: 85, label: '拍板决策' },
  customer: { score: 80, label: '核心业主' },
  partner: { score: 78, label: '生态盟友' },
  superior: { score: 75, label: '直属汇报' },
  influencer: { score: 72, label: '技术影响' },
  liaison: { score: 65, label: '内线支持' },
  referrer: { score: 62, label: '高层引荐' },
  subordinate: { score: 58, label: '业务协同' },
  prospect: { score: 48, label: '潜在突破' },
  competitor: { score: 30, label: '友商控标' },
};

const VISIT_TYPE_WEIGHTS: Record<string, number> = {
  dinner: 6.0,      // 高层餐叙
  site_survey: 5.5, // 机房踏勘
  demo: 5.0,        // 样机测试/POC
  meeting: 4.0,     // 专场拜访
  call: 2.5,        // 电话沟通
  wechat: 1.5,      // 微信跟进
};

const STAGE_BONUSES: Record<RelationshipStage, { bonus: number; label: string }> = {
  hot: { bonus: 15, label: '热力铁杆 (+15)' },
  warm: { bonus: 8, label: '温和支持 (+8)' },
  exploring: { bonus: 2, label: '接触摸底 (+2)' },
  cold: { bonus: -10, label: '态度中立 (-10)' },
  blocked: { bonus: -22, label: '友商排他 (-22)' },
};

export function calculateRelationshipStrength(
  relationship: Relationship,
  sourcePerson?: Person | null,
  targetPerson?: Person | null,
  visits: VisitRecord[] = []
): RelationshipStrengthResult {
  const tplKey = relationship.templateKey || 'prospect';
  const tplInfo = TEMPLATE_BASE_SCORES[tplKey] || { score: 55, label: relationship.label || '业务关联' };
  const baseScore = tplInfo.score;

  const relatedPersonIds = new Set<string>();
  if (relationship.sourceId) relatedPersonIds.add(relationship.sourceId);
  if (relationship.targetId) relatedPersonIds.add(relationship.targetId);

  const matchedVisits = visits.filter((v) => relatedPersonIds.has(v.personId));
  const visitsCount = matchedVisits.length;

  let rawVisitsBonus = 0;
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  for (const v of matchedVisits) {
    const baseWeight = VISIT_TYPE_WEIGHTS[v.type] || 2.0;
    const daysAgo = Math.max(0, Math.floor((now - (v.createdAt || now)) / DAY_MS));
    let timeFactor = 1.0;
    if (daysAgo <= 14) {
      timeFactor = 1.35;
    } else if (daysAgo <= 45) {
      timeFactor = 1.15;
    } else if (daysAgo > 90) {
      timeFactor = 0.75;
    }
    rawVisitsBonus += baseWeight * timeFactor;
  }

  const visitsBonus = Math.min(28, Math.round(rawVisitsBonus * 10) / 10);

  const sourceStage = sourcePerson?.relationshipStage || 'exploring';
  const targetStage = targetPerson?.relationshipStage || 'exploring';
  const sourceStageBonus = STAGE_BONUSES[sourceStage]?.bonus ?? 0;
  const targetStageBonus = STAGE_BONUSES[targetStage]?.bonus ?? 0;
  const stageBonus = Math.round((sourceStageBonus + targetStageBonus) / 2);
  const stageLabel = STAGE_BONUSES[targetStage]?.label || STAGE_BONUSES[sourceStage]?.label || '接触摸底';

  const rawTotal = baseScore + visitsBonus + stageBonus;
  const score = Math.max(10, Math.min(100, Math.round(rawTotal)));

  let level: 1 | 2 | 3 | 4 | 5 = 3;
  let levelLabel = '稳固连接';
  let color = '#2563eb';
  let strokeWidth = 2.8;

  if (score >= 88) {
    level = 5;
    levelLabel = '铁杆同盟';
    color = '#059669';
    strokeWidth = 4.8;
  } else if (score >= 74) {
    level = 4;
    levelLabel = '深度协同';
    color = '#4f46e5';
    strokeWidth = 3.8;
  } else if (score >= 58) {
    level = 3;
    levelLabel = '稳固连接';
    color = '#2563eb';
    strokeWidth = 2.8;
  } else if (score >= 40) {
    level = 2;
    levelLabel = '初步接触';
    color = '#d97706';
    strokeWidth = 2.0;
  } else {
    level = 1;
    levelLabel = '薄弱/排他';
    color = '#94a3b8';
    strokeWidth = 1.4;
  }

  return {
    score,
    level,
    levelLabel,
    color,
    strokeWidth,
    breakdown: {
      baseScore,
      templateLabel: tplInfo.label,
      visitsCount,
      visitsBonus,
      stageBonus,
      stageLabel,
    },
  };
}
