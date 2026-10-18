import {
  Person,
  Relationship,
  GroupFrame,
  CanvasAnnotation,
  ProjectSnapshot,
  RelationshipStage,
  STAGE_LIST,
} from '../types/crm.ts';

const STAGE_RANK: Record<RelationshipStage, number> = {
  blocked: -2,
  cold: -1,
  exploring: 0,
  warm: 1,
  hot: 2,
};

export interface AttitudeChangeItem {
  person: Person;
  oldStage: RelationshipStage;
  newStage: RelationshipStage;
  oldLabel: string;
  newLabel: string;
  direction: 'up' | 'down';
  delta: number;
}

export interface PersonDiffBadge {
  personId: string;
  status: 'added' | 'removed' | 'upgraded' | 'downgraded';
  badgeText: string;
  oldStageLabel?: string;
  newStageLabel?: string;
}

export interface SnapshotDiffResult {
  baseSnapshotId: string;
  baseSnapshotTitle: string;
  baseCreatedAt: string;
  addedPeople: Person[];
  removedPeople: Person[];
  attitudeUpgraded: AttitudeChangeItem[];
  attitudeDowngraded: AttitudeChangeItem[];
  addedRelationships: Relationship[];
  removedRelationships: Relationship[];
  personDiffMap: Map<string, PersonDiffBadge>;
  addedRelIdSet: Set<string>;
}

function getStageLabel(stage: RelationshipStage = 'exploring'): string {
  return STAGE_LIST.find((s) => s.key === stage)?.label || '接触摸底';
}

/**
 * 对比历史基线快照 (`baseSnapshot`) 与当前作战图谱 (`currentGraph`)，
 * 识别新增人物、移除人物、态度正向跃迁 (↑)、态度恶化预警 (↓)、以及新增/断裂关系连线。
 */
export function computeSnapshotDiff(
  baseSnapshot: ProjectSnapshot,
  currentGraph: {
    people: Person[];
    relationships: Relationship[];
    frames?: GroupFrame[];
    annotations?: CanvasAnnotation[];
  }
): SnapshotDiffResult {
  const basePeopleMap = new Map<string, Person>();
  baseSnapshot.people
    .filter((p) => p.onCanvas && !p.hidden)
    .forEach((p) => basePeopleMap.set(p.id, p));

  const currentPeople = currentGraph.people.filter((p) => p.onCanvas && !p.hidden);
  const currentPeopleMap = new Map<string, Person>();
  currentPeople.forEach((p) => currentPeopleMap.set(p.id, p));

  const addedPeople: Person[] = [];
  const removedPeople: Person[] = [];
  const attitudeUpgraded: AttitudeChangeItem[] = [];
  const attitudeDowngraded: AttitudeChangeItem[] = [];
  const personDiffMap = new Map<string, PersonDiffBadge>();

  // 1. Check current people against baseSnapshot
  for (const curr of currentPeople) {
    const prev = basePeopleMap.get(curr.id);
    if (!prev) {
      addedPeople.push(curr);
      personDiffMap.set(curr.id, {
        personId: curr.id,
        status: 'added',
        badgeText: '✨ 新增干系人',
      });
    } else {
      const oldStage: RelationshipStage = prev.relationshipStage || 'exploring';
      const newStage: RelationshipStage = curr.relationshipStage || 'exploring';
      const oldRank = STAGE_RANK[oldStage] ?? 0;
      const newRank = STAGE_RANK[newStage] ?? 0;

      if (newRank > oldRank) {
        const oldLabel = getStageLabel(oldStage);
        const newLabel = getStageLabel(newStage);
        attitudeUpgraded.push({
          person: curr,
          oldStage,
          newStage,
          oldLabel,
          newLabel,
          direction: 'up',
          delta: newRank - oldRank,
        });
        personDiffMap.set(curr.id, {
          personId: curr.id,
          status: 'upgraded',
          badgeText: `↑ ${oldLabel} → ${newLabel}`,
          oldStageLabel: oldLabel,
          newStageLabel: newLabel,
        });
      } else if (newRank < oldRank) {
        const oldLabel = getStageLabel(oldStage);
        const newLabel = getStageLabel(newStage);
        attitudeDowngraded.push({
          person: curr,
          oldStage,
          newStage,
          oldLabel,
          newLabel,
          direction: 'down',
          delta: newRank - oldRank,
        });
        personDiffMap.set(curr.id, {
          personId: curr.id,
          status: 'downgraded',
          badgeText: `↓ ${oldLabel} → ${newLabel}`,
          oldStageLabel: oldLabel,
          newStageLabel: newLabel,
        });
      }
    }
  }

  // 2. Check removed people
  basePeopleMap.forEach((prev) => {
    if (!currentPeopleMap.has(prev.id)) {
      removedPeople.push(prev);
      personDiffMap.set(prev.id, {
        personId: prev.id,
        status: 'removed',
        badgeText: '已移出图谱',
      });
    }
  });

  // 3. Compare relationships (by id or pair key)
  const makePairKey = (r: Relationship) => {
    const a = r.sourceId < r.targetId ? r.sourceId : r.targetId;
    const b = r.sourceId < r.targetId ? r.targetId : r.sourceId;
    return `${a}--${b}`;
  };

  const baseRels = baseSnapshot.relationships.filter((r) => !r.hidden);
  const currentRels = currentGraph.relationships.filter((r) => !r.hidden);

  const baseRelPairSet = new Set(baseRels.map(makePairKey));
  const currentRelPairSet = new Set(currentRels.map(makePairKey));

  const addedRelationships: Relationship[] = [];
  const addedRelIdSet = new Set<string>();

  for (const r of currentRels) {
    if (!baseRelPairSet.has(makePairKey(r))) {
      addedRelationships.push(r);
      addedRelIdSet.add(r.id);
    }
  }

  const removedRelationships: Relationship[] = [];
  for (const r of baseRels) {
    if (!currentRelPairSet.has(makePairKey(r))) {
      removedRelationships.push(r);
    }
  }

  return {
    baseSnapshotId: baseSnapshot.id,
    baseSnapshotTitle: baseSnapshot.title,
    baseCreatedAt: baseSnapshot.createdAt,
    addedPeople,
    removedPeople,
    attitudeUpgraded,
    attitudeDowngraded,
    addedRelationships,
    removedRelationships,
    personDiffMap,
    addedRelIdSet,
  };
}
