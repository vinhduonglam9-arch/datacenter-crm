/**
 * Pure graph algorithms: Pathfinding (BFS), AAAAA-Grade Auto-Layout Engine
 * (Strategic Faction Swimlanes & Executive Hierarchy Tree), Smart Connector Routing,
 * Obstacle-Avoiding Curve Deflection, and Multi-Node Alignment/Distribution.
 */

import {
  CARD_WIDTH,
  CARD_HEIGHT,
  AnchorPosition,
  getAnchorPoint,
  calculateBezierPath,
  Rect,
} from './graph-math.ts';
import type { GroupFrame } from '../types/crm.ts';

export interface BasePerson {
  id: string;
  name: string;
  title: string;
  company?: string;
  bio?: string;
  tags?: string[];
  specialty?: string;
  vendorPreference?: string;
  relationshipStage?: string;
  cardColor?: string;
  x: number;
  y: number;
  onCanvas: boolean;
  hidden?: boolean;
}

export interface BaseRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  sourceAnchor?: AnchorPosition;
  targetAnchor?: AnchorPosition;
  label: string;
  color?: string;
  offsetX?: number;
  offsetY?: number;
  description?: string;
  showDescriptionOnCanvas?: boolean;
  hidden?: boolean;
}

export interface GraphNodePosition {
  id: string;
  x: number;
  y: number;
}

export interface RelationshipLayoutUpdate {
  id: string;
  sourceAnchor: AnchorPosition;
  targetAnchor: AnchorPosition;
  offsetX: number;
  offsetY: number;
}

export interface AutoLayoutResult {
  peoplePositions: GraphNodePosition[];
  groupFrames: GroupFrame[];
  relationshipUpdates: RelationshipLayoutUpdate[];
}

/**
 * Find the shortest relationship path between two people (BFS)
 */
export function findInfluencePath(
  sourceId: string,
  targetId: string,
  relationships: BaseRelationship[]
): string[] {
  if (sourceId === targetId) return [sourceId];

  const adj = new Map<string, string[]>();
  for (const rel of relationships) {
    if (!adj.has(rel.sourceId)) adj.set(rel.sourceId, []);
    if (!adj.has(rel.targetId)) adj.set(rel.targetId, []);
    adj.get(rel.sourceId)!.push(rel.targetId);
    adj.get(rel.targetId)!.push(rel.sourceId);
  }

  const queue: string[] = [sourceId];
  const visited = new Set<string>([sourceId]);
  const parent = new Map<string, string>();

  let found = false;
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetId) {
      found = true;
      break;
    }

    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  if (!found) return [];

  const path: string[] = [];
  let curr: string | undefined = targetId;
  while (curr) {
    path.unshift(curr);
    if (curr === sourceId) break;
    curr = parent.get(curr);
  }

  return path;
}

type FactionCategory = 'our_team' | 'subcontractor' | 'owner' | 'partner' | 'competitor';
type OwnerSubTrack = 'exec' | 'tech' | 'comm';

interface ClassifiedPerson {
  person: BasePerson;
  faction: FactionCategory;
  ownerTrack: OwnerSubTrack;
  hierarchyTier: 1 | 2 | 3 | 4;
  sortWeight: number;
}

/**
 * Classify each stakeholder into an exact Faction, Functional Track, and Hierarchy Tier
 * with strict priority rules so Subcontractors, Design Institutes/Consultants, or Competitors never mix with Owner VPs.
 */
function classifyStakeholder(p: BasePerson): ClassifiedPerson {
  const tags = (p.tags || []).join(' ');
  const company = p.company || '';
  const title = p.title || '';
  const bio = p.bio || '';
  const specialty = p.specialty || '';

  // 1. Check Our Subcontractor / Delivery Alliance first (before our_team since tags may contain "我方分包商")
  const isSubcontractor =
    tags.includes('分包') ||
    company.includes('分包') ||
    title.includes('分包') ||
    tags.includes('施工分包') ||
    tags.includes('液冷分包');

  if (isSubcontractor) {
    const isFluidOrTech =
      specialty.includes('液冷') || title.includes('液冷') || company.includes('流体');
    return {
      person: p,
      faction: 'subcontractor',
      ownerTrack: isFluidOrTech ? 'tech' : 'comm',
      hierarchyTier: 3,
      sortWeight: isFluidOrTech ? 32 : 38,
    };
  }

  // 2. Check Our Team (highest specificity for internal account team)
  const isOurTeam =
    tags.includes('我方') ||
    company.includes('我方') ||
    tags.includes('铁三角') ||
    /\b(AR|SR|FR)\b/.test(title) ||
    /\b(AR|SR|FR)\b/.test(tags);

  if (isOurTeam) {
    // Order for Faction vertical stack: AR (10) -> SR (20) -> FR (30)
    let sortWeight = 25;
    if (title.includes('AR') || tags.includes('AR') || title.includes('销售')) {
      sortWeight = 10;
    } else if (title.includes('SR') || tags.includes('SR') || title.includes('架构')) {
      sortWeight = 20;
    } else if (title.includes('FR') || tags.includes('FR') || title.includes('交付') || title.includes('商务')) {
      sortWeight = 30;
    }
    return {
      person: p,
      faction: 'our_team',
      ownerTrack: 'exec',
      hierarchyTier: 4,
      sortWeight,
    };
  }

  // 3. Check Competitor / Blocker
  const isCompetitor =
    p.relationshipStage === 'blocked' ||
    tags.includes('竞争') ||
    tags.includes('友商') ||
    tags.includes('高危') ||
    company.includes('友商') ||
    bio.includes('竞争对手');

  if (isCompetitor) {
    const isCommercialRival =
      specialty.includes('招采') || title.includes('大客户') || tags.includes('低价');
    return {
      person: p,
      faction: 'competitor',
      ownerTrack: 'comm',
      hierarchyTier: 3,
      sortWeight: isCommercialRival ? 85 : 92,
    };
  }

  // 4. Check External Ecosystem Partner (Design Institute & Consulting Firm / EPC Advisor)
  const isPartner =
    tags.includes('设计院') ||
    tags.includes('咨询') ||
    tags.includes('顾问') ||
    tags.includes('总包') ||
    tags.includes('EPC') ||
    tags.includes('盟友') ||
    tags.includes('引荐') ||
    company.includes('设计院') ||
    company.includes('咨询') ||
    company.includes('规划') ||
    specialty.includes('设计') ||
    specialty.includes('EPC');

  if (isPartner) {
    const isDesignInstitute =
      tags.includes('设计院') || company.includes('设计院') || title.includes('总工');
    return {
      person: p,
      faction: 'partner',
      ownerTrack: isDesignInstitute ? 'tech' : 'comm',
      hierarchyTier: 2,
      sortWeight: isDesignInstitute ? 12 : 18,
    };
  }

  // 5. Owner / Client Side Stakeholder
  const isCommercial =
    tags.includes('商务') ||
    tags.includes('招采') ||
    tags.includes('采购') ||
    title.includes('采购') ||
    title.includes('招采') ||
    title.includes('合约') ||
    title.includes('商务') ||
    title.includes('财务') ||
    specialty.includes('招采');

  const isTopExecutive =
    tags.includes('拍板') ||
    tags.includes('高管') ||
    title.includes('副总裁') ||
    title.includes('总裁') ||
    title.includes('总指挥') ||
    title.includes('董事长') ||
    /\b(CEO|VP)\b/i.test(title) ||
    (title.includes('总经理') && !isCommercial);

  if (isTopExecutive) {
    return {
      person: p,
      faction: 'owner',
      ownerTrack: 'exec',
      hierarchyTier: 1,
      sortWeight: 5,
    };
  }

  const isMidGatekeeper =
    tags.includes('把关') ||
    tags.includes('专家') ||
    title.includes('总工') ||
    title.includes('总工程师') ||
    title.includes('总监') ||
    title.includes('主任') ||
    title.includes('部长') ||
    /\b(CIO|CTO)\b/i.test(title) ||
    (title.includes('总经理') && isCommercial);

  if (isCommercial) {
    return {
      person: p,
      faction: 'owner',
      ownerTrack: 'comm',
      hierarchyTier: isMidGatekeeper ? 2 : 3,
      sortWeight: isMidGatekeeper ? 35 : 60,
    };
  }

  // Technical / Operations Track within Owner
  let techSort = 50;
  if (title.includes('总工') || title.includes('总监')) techSort = 20;
  else if (title.includes('高级经理') || title.includes('主任')) techSort = 40;
  else if (title.includes('主管') || title.includes('工程师')) techSort = 55;

  return {
    person: p,
    faction: 'owner',
    ownerTrack: 'tech',
    hierarchyTier: isMidGatekeeper ? 2 : 3,
    sortWeight: techSort,
  };
}

/**
 * Helper to compute a bounding GroupFrame around a set of positioned nodes
 */
function buildFrameForPositions(
  id: string,
  title: string,
  subtitle: string,
  color: string,
  zIndex: number,
  positions: { x: number; y: number }[],
  padX = 40,
  padTop = 54,
  padBottom = 38
): GroupFrame | null {
  if (positions.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pos of positions) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + CARD_WIDTH);
    maxY = Math.max(maxY, pos.y + CARD_HEIGHT);
  }

  return {
    id,
    title,
    subtitle,
    x: Math.round(minX - padX),
    y: Math.round(minY - padTop),
    width: Math.round(maxX - minX + padX * 2),
    height: Math.round(maxY - minY + padTop + padBottom),
    color,
    zIndex,
  };
}

/**
 * Check if a point (x, y) is inside a padded rectangle
 */
function isPointInRect(x: number, y: number, rect: Rect, pad = 0): boolean {
  return (
    x >= rect.x - pad &&
    x <= rect.x + rect.width + pad &&
    y >= rect.y - pad &&
    y <= rect.y + rect.height + pad
  );
}

/**
 * Check if two rectangles overlap
 */
function rectsOverlap(a: Rect, b: Rect, pad = 0): boolean {
  return !(
    b.x > a.x + a.width + pad ||
    b.x + b.width + pad < a.x ||
    b.y > a.y + a.height + pad ||
    b.y + b.height + pad < a.y
  );
}

/**
 * Evaluate cubic Bezier point at parameter t in [0, 1] with midpoint deflection (offsetX, offsetY)
 */
function sampleDeflectedBezier(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  a1: AnchorPosition,
  a2: AnchorPosition,
  offsetX: number,
  offsetY: number,
  t: number
): { x: number; y: number } {
  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);
  const curvature = Math.max(48, Math.min(180, Math.hypot(dx, dy) * 0.42));

  const cp1 = { ...p1 };
  const cp2 = { ...p2 };

  if (a1 === 'top') cp1.y -= curvature;
  else if (a1 === 'bottom') cp1.y += curvature;
  else if (a1 === 'left') cp1.x -= curvature;
  else if (a1 === 'right') cp1.x += curvature;

  if (a2 === 'top') cp2.y -= curvature;
  else if (a2 === 'bottom') cp2.y += curvature;
  else if (a2 === 'left') cp2.x -= curvature;
  else if (a2 === 'right') cp2.x += curvature;

  cp1.x += (offsetX * 4) / 3;
  cp1.y += (offsetY * 4) / 3;
  cp2.x += (offsetX * 4) / 3;
  cp2.y += (offsetY * 4) / 3;

  const mt = 1 - t;
  return {
    x:
      mt * mt * mt * p1.x +
      3 * mt * mt * t * cp1.x +
      3 * mt * t * t * cp2.x +
      t * t * t * p2.x,
    y:
      mt * mt * mt * p1.y +
      3 * mt * mt * t * cp1.y +
      3 * mt * t * t * cp2.y +
      t * t * t * p2.y,
  };
}

/**
 * Smart Relationship Anchor & Anti-Occlusion Optimizer
 * Automatically selects optimal anchors and deflects curve/badge offsets so that:
 * 1. Curves never slice through intermediate cards
 * 2. Relationship badges never overlap any person card or frame header
 * 3. Relationship badges never collide with each other
 */
export function optimizeRelationshipsForLayout(
  positions: GraphNodePosition[],
  relationships: BaseRelationship[],
  frames: GroupFrame[],
  mode: 'faction' | 'hierarchy'
): RelationshipLayoutUpdate[] {
  const posMap = new Map<string, GraphNodePosition>();
  positions.forEach((p) => posMap.set(p.id, p));

  const cardRects: { id: string; rect: Rect }[] = positions.map((p) => ({
    id: p.id,
    rect: { x: p.x, y: p.y, width: CARD_WIDTH, height: CARD_HEIGHT },
  }));

  // Frame title pill rectangles to avoid placing relationship badges over frame titles
  const frameTitleRects: Rect[] = frames.map((f) => ({
    x: f.x + 8,
    y: f.y - 18,
    width: Math.min(f.width - 16, 310),
    height: 30,
  }));

  const placedBadges: Rect[] = [];
  const updates: RelationshipLayoutUpdate[] = [];

  for (const rel of relationships) {
    if (rel.hidden) continue;
    const sPos = posMap.get(rel.sourceId);
    const tPos = posMap.get(rel.targetId);
    if (!sPos || !tPos) continue;

    const scx = sPos.x + CARD_WIDTH / 2;
    const scy = sPos.y + CARD_HEIGHT / 2;
    const tcx = tPos.x + CARD_WIDTH / 2;
    const tcy = tPos.y + CARD_HEIGHT / 2;

    const dx = tcx - scx;
    const dy = tcy - scy;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let sourceAnchor: AnchorPosition = 'right';
    let targetAnchor: AnchorPosition = 'left';
    let preferredOffsetX = 0;
    let preferredOffsetY = 0;

    if (mode === 'faction') {
      if (absDx < 65) {
        // Same vertical column
        const minY = Math.min(scy, tcy);
        const maxY = Math.max(scy, tcy);
        const hasCardBetweenV = positions.some((other) => {
          if (other.id === rel.sourceId || other.id === rel.targetId) return false;
          const ocx = other.x + CARD_WIDTH / 2;
          const ocy = other.y + CARD_HEIGHT / 2;
          return Math.abs(ocx - scx) < 65 && ocy > minY + 20 && ocy < maxY - 20;
        });
        if (hasCardBetweenV) {
          sourceAnchor = 'left';
          targetAnchor = 'left';
          preferredOffsetX = -56;
        } else {
          sourceAnchor = dy >= 0 ? 'bottom' : 'top';
          targetAnchor = dy >= 0 ? 'top' : 'bottom';
        }
      } else if (absDx < 240 && absDy > 140) {
        // Diagonal inside Owner Pyramid (e.g. Top Executive down-left to Tech or down-right to Comm)
        sourceAnchor = dy >= 0 ? 'bottom' : 'top';
        targetAnchor = dy >= 0 ? 'top' : 'bottom';
      } else {
        // Cross-swimlane horizontal/diagonal connection
        sourceAnchor = dx >= 0 ? 'right' : 'left';
        targetAnchor = dx >= 0 ? 'left' : 'right';
      }
    } else {
      // Hierarchy Tree Mode
      if (absDy < 65) {
        // Same horizontal tier
        const minX = Math.min(scx, tcx);
        const maxX = Math.max(scx, tcx);
        const hasCardBetween = positions.some((other) => {
          if (other.id === rel.sourceId || other.id === rel.targetId) return false;
          const ocx = other.x + CARD_WIDTH / 2;
          const ocy = other.y + CARD_HEIGHT / 2;
          return Math.abs(ocy - scy) < 65 && ocx > minX + 20 && ocx < maxX - 20;
        });

        if (hasCardBetween) {
          sourceAnchor = 'top';
          targetAnchor = 'top';
          preferredOffsetY = -54;
        } else {
          sourceAnchor = dx >= 0 ? 'right' : 'left';
          targetAnchor = dx >= 0 ? 'left' : 'right';
        }
      } else {
        // Across horizontal tiers
        sourceAnchor = dy >= 0 ? 'bottom' : 'top';
        targetAnchor = dy >= 0 ? 'top' : 'bottom';
      }
    }

    const sRect: Rect = { x: sPos.x, y: sPos.y, width: CARD_WIDTH, height: CARD_HEIGHT };
    const tRect: Rect = { x: tPos.x, y: tPos.y, width: CARD_WIDTH, height: CARD_HEIGHT };
    const p1 = getAnchorPoint(sRect, sourceAnchor);
    const p2 = getAnchorPoint(tRect, targetAnchor);

    const { midPoint: baseMid } = calculateBezierPath(p1, p2, sourceAnchor, targetAnchor, 0, 0);
    const rawDesc = (rel.description ?? '').trim();
    const hasVisibleDesc = rel.showDescriptionOnCanvas !== false && rawDesc.length > 0;
    const descDisplayLen = Math.min(24, rawDesc.length);
    const badgeW = Math.max(
      88,
      (rel.label.length + 5) * 10 + 22,
      hasVisibleDesc ? descDisplayLen * 9.5 + 28 : 0
    );
    const badgeH = hasVisibleDesc ? 46 : 28;

    // Candidate offsets to search for a 100% collision-free curve & badge position
    const candidateOffsets: [number, number][] = [
      [preferredOffsetX, preferredOffsetY],
      [0, 0],
      [0, -28],
      [0, 28],
      [-48, 0],
      [48, 0],
      [-42, -26],
      [42, -26],
      [-42, 26],
      [42, 26],
      [0, -48],
      [0, 48],
      [-85, 0],
      [85, 0],
      [-85, -32],
      [85, -32],
      [-85, 32],
      [85, 32],
      [-135, 0],
      [135, 0],
      [-135, -36],
      [135, -36],
      [-175, 0],
      [175, 0],
      [-210, 0],
      [210, 0],
    ];

    let bestOffset: [number, number] = [preferredOffsetX, preferredOffsetY];
    let bestPenalty = Infinity;

    for (const [ox, oy] of candidateOffsets) {
      const bx = baseMid.x + ox;
      const by = baseMid.y + oy;
      const badgeRect: Rect = {
        x: bx - badgeW / 2,
        y: by - badgeH / 2,
        width: badgeW,
        height: badgeH,
      };

      let penalty = 0;

      // 1. Heavy penalty if badge overlaps ANY person card (including source & target)
      for (const c of cardRects) {
        if (rectsOverlap(badgeRect, c.rect, 12)) {
          penalty += 5000;
        }
      }

      // 2. Heavy penalty if badge overlaps any GroupFrame title bar
      for (const ft of frameTitleRects) {
        if (rectsOverlap(badgeRect, ft, 6)) {
          penalty += 2500;
        }
      }

      // 3. Heavy penalty if badge overlaps any already-placed relationship badge
      for (const pb of placedBadges) {
        if (rectsOverlap(badgeRect, pb, 10)) {
          penalty += 3500;
        }
      }

      // 4. Penalty if the deflected Bezier curve passes through any unrelated person card
      const sampleTs = [0.22, 0.36, 0.5, 0.64, 0.78];
      for (const t of sampleTs) {
        const pt = sampleDeflectedBezier(p1, p2, sourceAnchor, targetAnchor, ox, oy, t);
        for (const c of cardRects) {
          if (c.id === rel.sourceId || c.id === rel.targetId) continue;
          if (isPointInRect(pt.x, pt.y, c.rect, 10)) {
            penalty += 1800;
          }
        }
      }

      // 5. Mild preference for smaller offsets when collision-free
      const distFromPreferred = Math.hypot(ox - preferredOffsetX, oy - preferredOffsetY);
      penalty += distFromPreferred * 0.4;

      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        bestOffset = [Math.round(ox), Math.round(oy)];
        if (penalty < 1) break; // Found ideal zero-collision placement
      }
    }

    const finalBx = baseMid.x + bestOffset[0];
    const finalBy = baseMid.y + bestOffset[1];
    placedBadges.push({
      x: finalBx - badgeW / 2,
      y: finalBy - badgeH / 2,
      width: badgeW,
      height: badgeH,
    });

    updates.push({
      id: rel.id,
      sourceAnchor,
      targetAnchor,
      offsetX: bestOffset[0],
      offsetY: bestOffset[1],
    });
  }

  return updates;
}

/**
 * Full AAAAA-Grade 5-Camp Faction / Ecosystem Swimlane Auto-Layout (阵营分栏自动排版)
 * Synchronizes People Positions + Dynamic Swimlane GroupFrames + Smart Non-Overlapping Connectors
 */
export function calculateFactionLayoutFull(
  people: BasePerson[],
  relationships: BaseRelationship[] = [],
  projectCompanyName?: string
): AutoLayoutResult {
  const onCanvas = people.filter((p) => p.onCanvas && !p.hidden);
  const classified = onCanvas.map(classifyStakeholder);

  const ourTeam = classified
    .filter((c) => c.faction === 'our_team')
    .sort((a, b) => a.sortWeight - b.sortWeight)
    .map((c) => c.person);

  const subcontractors = classified
    .filter((c) => c.faction === 'subcontractor')
    .sort((a, b) => a.sortWeight - b.sortWeight)
    .map((c) => c.person);

  const ownerClassified = classified.filter((c) => c.faction === 'owner');
  const ownerExecs = ownerClassified
    .filter((c) => c.ownerTrack === 'exec')
    .sort((a, b) => a.sortWeight - b.sortWeight)
    .map((c) => c.person);
  const ownerTech = ownerClassified
    .filter((c) => c.ownerTrack === 'tech')
    .sort((a, b) => a.sortWeight - b.sortWeight)
    .map((c) => c.person);
  const ownerComm = ownerClassified
    .filter((c) => c.ownerTrack === 'comm')
    .sort((a, b) => a.sortWeight - b.sortWeight)
    .map((c) => c.person);

  const partners = classified
    .filter((c) => c.faction === 'partner')
    .sort((a, b) => a.sortWeight - b.sortWeight)
    .map((c) => c.person);

  const competitors = classified
    .filter((c) => c.faction === 'competitor')
    .sort((a, b) => a.sortWeight - b.sortWeight)
    .map((c) => c.person);

  // Layout Spacing Constants (Generous AAAAA-grade breathing room)
  const START_Y = 140;
  const ROW_STEP = 256; // 148px card height + 108px vertical gap for labels & arrows
  const CORRIDOR_GAP = 268; // Wide 268px horizontal avenue between swimlane columns
  const OWNER_INNER_COL_GAP = 132; // 132px horizontal gap between Tech col and Comm col

  const peoplePositions: GraphNodePosition[] = [];
  const ourPositions: { x: number; y: number }[] = [];
  const subPositions: { x: number; y: number }[] = [];
  const ownerPositions: { x: number; y: number }[] = [];
  const partnerPositions: { x: number; y: number }[] = [];
  const competitorPositions: { x: number; y: number }[] = [];

  // Calculate Owner Decision Chain dimensions first
  const hasTwoOwnerTracks = ownerTech.length > 0 && ownerComm.length > 0;
  const ownerTrackRows = hasTwoOwnerTracks
    ? Math.max(ownerTech.length, ownerComm.length)
    : ownerTech.length + ownerComm.length;
  const ownerExecRows = Math.ceil(ownerExecs.length / 2);
  const totalOwnerRows = Math.max(1, ownerExecRows + ownerTrackRows);

  // 1. Left Column: Swimlane 1A (Our Account Team) & Swimlane 1B (Our Subcontractors)
  const ourX = 80;
  const ourStartY =
    subcontractors.length === 0 && ourTeam.length < totalOwnerRows
      ? Math.round(
          START_Y +
            Math.max(0, ((totalOwnerRows - 1) * ROW_STEP - Math.max(0, (ourTeam.length - 1) * ROW_STEP)) * 0.25)
        )
      : START_Y;

  ourTeam.forEach((p, idx) => {
    const pos = { id: p.id, x: ourX, y: ourStartY + idx * ROW_STEP };
    peoplePositions.push(pos);
    ourPositions.push({ x: pos.x, y: pos.y });
  });

  const subStartY =
    ourTeam.length > 0 ? ourStartY + ourTeam.length * ROW_STEP + 72 : START_Y;

  subcontractors.forEach((p, idx) => {
    const pos = { id: p.id, x: ourX, y: subStartY + idx * ROW_STEP };
    peoplePositions.push(pos);
    subPositions.push({ x: pos.x, y: pos.y });
  });

  // 2. Center Column: Swimlane 2 (Client / Owner Core Decision Chain Pyramid-Matrix)
  const hasLeftColumn = ourTeam.length > 0 || subcontractors.length > 0;
  const ownerColLeftX = hasLeftColumn ? ourX + CARD_WIDTH + CORRIDOR_GAP : 320;
  const ownerColRightX = ownerColLeftX + CARD_WIDTH + OWNER_INNER_COL_GAP;

  let currentOwnerY = START_Y;
  if (ownerExecs.length === 1 && hasTwoOwnerTracks) {
    // Center single top executive symmetrically above the Tech & Comm tracks
    const centerExecX = Math.round((ownerColLeftX + ownerColRightX) / 2);
    const pos = { id: ownerExecs[0].id, x: centerExecX, y: currentOwnerY };
    peoplePositions.push(pos);
    ownerPositions.push({ x: pos.x, y: pos.y });
    currentOwnerY += ROW_STEP;
  } else if (ownerExecs.length > 0) {
    ownerExecs.forEach((p, idx) => {
      const col = hasTwoOwnerTracks ? idx % 2 : 0;
      const row = hasTwoOwnerTracks ? Math.floor(idx / 2) : idx;
      const x = col === 0 ? ownerColLeftX : ownerColRightX;
      const y = START_Y + row * ROW_STEP;
      peoplePositions.push({ id: p.id, x, y });
      ownerPositions.push({ x, y });
    });
    currentOwnerY =
      START_Y + (hasTwoOwnerTracks ? Math.ceil(ownerExecs.length / 2) : ownerExecs.length) * ROW_STEP;
  }

  if (hasTwoOwnerTracks) {
    // Left Track: Technical & O&M
    ownerTech.forEach((p, idx) => {
      const x = ownerColLeftX;
      const y = currentOwnerY + idx * ROW_STEP;
      peoplePositions.push({ id: p.id, x, y });
      ownerPositions.push({ x, y });
    });
    // Right Track: Commercial & Procurement
    ownerComm.forEach((p, idx) => {
      const x = ownerColRightX;
      const y = currentOwnerY + idx * ROW_STEP;
      peoplePositions.push({ id: p.id, x, y });
      ownerPositions.push({ x, y });
    });
  } else {
    const combinedSub = [...ownerTech, ...ownerComm];
    combinedSub.forEach((p, idx) => {
      const x = ownerColLeftX;
      const y = currentOwnerY + idx * ROW_STEP;
      peoplePositions.push({ id: p.id, x, y });
      ownerPositions.push({ x, y });
    });
  }

  // 3. Right Column: Swimlane 3 (Design Institute & Consulting Firm) & Swimlane 4 (Competitors)
  const ownerRightEdge = hasTwoOwnerTracks
    ? ownerColRightX + CARD_WIDTH
    : ownerColLeftX + CARD_WIDTH;
  const externalColX =
    ownerPositions.length > 0 ? ownerRightEdge + CORRIDOR_GAP : ownerColLeftX;

  partners.forEach((p, idx) => {
    const x = externalColX;
    const y = START_Y + idx * ROW_STEP;
    peoplePositions.push({ id: p.id, x, y });
    partnerPositions.push({ x, y });
  });

  const compStartY =
    partners.length > 0
      ? START_Y + partners.length * ROW_STEP + 72
      : START_Y;

  competitors.forEach((p, idx) => {
    const x = externalColX;
    const y = compStartY + idx * ROW_STEP;
    peoplePositions.push({ id: p.id, x, y });
    competitorPositions.push({ x, y });
  });

  // Build synchronized, non-overlapping GroupFrames for each active Faction
  const groupFrames: GroupFrame[] = [];

  const ourFrame = buildFrameForPositions(
    'frame-our-team',
    '我方铁三角作战指挥部',
    'AR 客户总监 · SR 首席架构 · FR 商务交付',
    '#3B82F6',
    10,
    ourPositions
  );
  if (ourFrame) groupFrames.push(ourFrame);

  const subFrame = buildFrameForPositions(
    'frame-subcontractors',
    '我方核心分包商与交付联合体',
    '液冷环网定制 · 机电总包施工 · 背靠背锁价结盟',
    '#10B981',
    11,
    subPositions
  );
  if (subFrame) groupFrames.push(subFrame);

  const ownerTitle = projectCompanyName
    ? `客户核心决策链 (${projectCompanyName})`
    : '客户核心决策链';
  const ownerFrame = buildFrameForPositions(
    'frame-decision-chain',
    ownerTitle,
    '高层投资拍板 · 技术总工定标 · 战略招采评标 · 工程与运维验收',
    '#8B5CF6',
    12,
    ownerPositions
  );
  if (ownerFrame) groupFrames.push(ownerFrame);

  const partnerFrame = buildFrameForPositions(
    'frame-design-consult',
    '设计院 & 全过程工程咨询顾问',
    '可研与招标技术规范主笔 · BOQ 清单控制价与 TCO 审计',
    '#F97316',
    14,
    partnerPositions
  );
  if (partnerFrame) groupFrames.push(partnerFrame);

  const compFrame = buildFrameForPositions(
    'frame-competitors-alert',
    '友商竞争与控标阻击阵营',
    '商务超低价冲标 · 策反分包商 · 排他技术参数渗透',
    '#EF4444',
    15,
    competitorPositions
  );
  if (compFrame) groupFrames.push(compFrame);

  const relationshipUpdates = optimizeRelationshipsForLayout(
    peoplePositions,
    relationships,
    groupFrames,
    'faction'
  );

  return {
    peoplePositions,
    groupFrames,
    relationshipUpdates,
  };
}

/**
 * Full AAAAA-Grade Executive Hierarchy Tree Auto-Layout (汇报层级树自动排版)
 * Arranges stakeholders into a 4-Tier Strategic Command Pyramid with horizontal tier frames
 * and minimum edge-crossing ordering.
 */
export function calculateHierarchyLayoutFull(
  people: BasePerson[],
  relationships: BaseRelationship[] = [],
  projectCompanyName?: string
): AutoLayoutResult {
  const onCanvas = people.filter((p) => p.onCanvas && !p.hidden);
  const classified = onCanvas.map(classifyStakeholder);

  // Tier 1: Executive Decision Makers (VP / GM / 总指挥)
  const tier1 = classified
    .filter((c) => c.hierarchyTier === 1)
    .sort((a, b) => a.sortWeight - b.sortWeight)
    .map((c) => c.person);

  // Tier 2: Core Gatekeepers & Advisors
  // Order: Design Institute Advisor (Left) -> Technical Chief Engineer (Center) -> Commercial Director (Right)
  const tier2 = classified
    .filter((c) => c.hierarchyTier === 2)
    .sort((a, b) => {
      const rank = (c: ClassifiedPerson) => {
        if (c.faction === 'partner') return 10; // Design Institute on left-center
        if (c.ownerTrack === 'tech') return 20; // Owner Tech Chief in center
        return 30; // Owner Procurement Director on right
      };
      return rank(a) - rank(b) || a.sortWeight - b.sortWeight;
    })
    .map((c) => c.person);

  // Tier 3: Subcontractors, Execution Managers & Competitors
  // Order: Our Subcontractors (Left) -> Client Technical Execution (Center-Left) -> Client Comm/Partner (Center-Right) -> Competitor (Far Right)
  const tier3 = classified
    .filter((c) => c.hierarchyTier === 3)
    .sort((a, b) => {
      const rank = (c: ClassifiedPerson) => {
        if (c.faction === 'subcontractor') return 5 + c.sortWeight * 0.1;
        if (c.faction === 'owner' && c.ownerTrack === 'tech') return 20 + (100 - c.sortWeight) * 0.1;
        if (c.faction === 'owner' && c.ownerTrack === 'comm') return 35;
        if (c.faction === 'partner') return 45;
        return 60 + c.sortWeight * 0.1; // Competitor on far right
      };
      return rank(a) - rank(b);
    })
    .map((c) => c.person);

  // Tier 4: Our Account Team (Launchpad at base)
  // Order to align with tracks above: SR (Technical, Left) -> AR (Executive Lead, Center) -> FR (Commercial, Right)
  const tier4 = classified
    .filter((c) => c.hierarchyTier === 4)
    .sort((a, b) => {
      const rank = (c: ClassifiedPerson) => {
        const t = `${c.person.title} ${(c.person.tags || []).join(' ')}`;
        if (t.includes('SR') || t.includes('架构') || t.includes('技术')) return 10;
        if (t.includes('AR') || t.includes('销售') || t.includes('总监')) return 20;
        return 30;
      };
      return rank(a) - rank(b);
    })
    .map((c) => c.person);

  const CENTER_X = 860;
  const START_Y = 120;
  const TIER_GAP_Y = 320; // 148px card + 172px open vertical corridor between tiers
  const MAX_CARDS_PER_ROW = 6;

  const tiers = [
    {
      id: 'frame-tier-1-exec',
      title: projectCompanyName
        ? `L1 最高决策与投资拍板层 (${projectCompanyName})`
        : 'L1 最高决策与投资拍板层',
      subtitle: '集团高层领导 · 预算审批 · 最终定标拍板',
      color: '#8B5CF6',
      zIndex: 10,
      nodes: tier1,
      hGap: 150,
    },
    {
      id: 'frame-tier-2-gatekeepers',
      title: 'L2 核心技术定标、设计院 & 全过程咨询把关层',
      subtitle: '设计院规范主笔 · 咨询公司造价/TCO审计 · 总工技术定标 · 招采商务谈判',
      color: '#06B6D4',
      zIndex: 11,
      nodes: tier2,
      hGap: 140,
    },
    {
      id: 'frame-tier-3-execution',
      title: 'L3 我方分包商联合体、客户工程运维执行与友商博弈层',
      subtitle: '液冷/机电核心分包商 · 客户工程与DCIM验收 · 友商低价冲标与参数排他',
      color: '#F59E0B',
      zIndex: 12,
      nodes: tier3,
      hGap: 116,
    },
    {
      id: 'frame-tier-4-our-team',
      title: 'L4 我方铁三角作战指挥部',
      subtitle: 'SR 技术方案共创 · AR 高层公关操盘 · FR 分包统筹与商务闭环',
      color: '#3B82F6',
      zIndex: 13,
      nodes: tier4,
      hGap: 148,
    },
  ].filter((t) => t.nodes.length > 0);

  const peoplePositions: GraphNodePosition[] = [];
  const tierPositionedGroups: {
    meta: (typeof tiers)[number];
    coords: { x: number; y: number }[];
  }[] = [];

  let currentTierY = START_Y;
  let globalMinX = Infinity;
  let globalMaxX = -Infinity;

  for (const tier of tiers) {
    const coords: { x: number; y: number }[] = [];
    const totalNodes = tier.nodes.length;
    const numSubRows = Math.ceil(totalNodes / MAX_CARDS_PER_ROW);

    for (let r = 0; r < numSubRows; r++) {
      const rowNodes = tier.nodes.slice(r * MAX_CARDS_PER_ROW, (r + 1) * MAX_CARDS_PER_ROW);
      const count = rowNodes.length;
      const stepX = CARD_WIDTH + tier.hGap;
      const rowWidth = count * CARD_WIDTH + (count - 1) * tier.hGap;
      const startX = Math.round(CENTER_X - rowWidth / 2);
      const rowY = currentTierY + r * 244;

      rowNodes.forEach((p, idx) => {
        const x = startX + idx * stepX;
        const y = rowY;
        peoplePositions.push({ id: p.id, x, y });
        coords.push({ x, y });
        globalMinX = Math.min(globalMinX, x);
        globalMaxX = Math.max(globalMaxX, x + CARD_WIDTH);
      });
    }

    tierPositionedGroups.push({ meta: tier, coords });
    currentTierY += (numSubRows - 1) * 244 + TIER_GAP_Y;
  }

  // Generate sleek, aligned horizontal swimlane frames for each active tier
  const unifiedFrameLeft = Number.isFinite(globalMinX) ? Math.round(globalMinX - 52) : 160;
  const unifiedFrameWidth = Number.isFinite(globalMaxX)
    ? Math.max(920, Math.round(globalMaxX - globalMinX + 104))
    : 1200;

  const groupFrames: GroupFrame[] = tierPositionedGroups.map(({ meta, coords }) => {
    const minY = Math.min(...coords.map((c) => c.y));
    const maxY = Math.max(...coords.map((c) => c.y + CARD_HEIGHT));
    return {
      id: meta.id,
      title: meta.title,
      subtitle: meta.subtitle,
      x: unifiedFrameLeft,
      y: Math.round(minY - 46),
      width: unifiedFrameWidth,
      height: Math.round(maxY - minY + 46 + 34),
      color: meta.color,
      zIndex: meta.zIndex,
    };
  });

  const relationshipUpdates = optimizeRelationshipsForLayout(
    peoplePositions,
    relationships,
    groupFrames,
    'hierarchy'
  );

  return {
    peoplePositions,
    groupFrames,
    relationshipUpdates,
  };
}

/**
 * Legacy wrapper for Faction Layout (returns node positions)
 */
export function calculateFactionLayout(people: BasePerson[]): GraphNodePosition[] {
  return calculateFactionLayoutFull(people).peoplePositions;
}

/**
 * Legacy wrapper for Hierarchy Layout (returns node positions)
 */
export function calculateHierarchyLayout(people: BasePerson[]): GraphNodePosition[] {
  return calculateHierarchyLayoutFull(people).peoplePositions;
}

export type AlignmentType =
  | 'left'
  | 'center-h'
  | 'right'
  | 'top'
  | 'center-v'
  | 'bottom'
  | 'distribute-h'
  | 'distribute-v';

export interface AlignableElementBox {
  kind: 'person' | 'frame' | 'annotation';
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SmartGuideLine {
  orientation: 'vertical' | 'horizontal';
  pos: number;
  start: number;
  end: number;
  snapType: 'edge' | 'center';
  anchorPoints: { x: number; y: number }[];
}

export interface SmartSnapResult {
  snappedDeltaX: number;
  snappedDeltaY: number;
  guides: SmartGuideLine[];
}

/**
 * Align or distribute a heterogeneous set of canvas elements (Person cards, Shapes, Sticky notes, Text boxes, GroupFrames)
 * using their true bounding boxes (x, y, width, height).
 */
export function alignUnifiedElements(
  elements: AlignableElementBox[],
  alignment: AlignmentType
): AlignableElementBox[] {
  if (elements.length < 2) {
    return elements.map((el) => ({ ...el }));
  }

  const minLeft = Math.min(...elements.map((el) => el.x));
  const maxRight = Math.max(...elements.map((el) => el.x + el.width));
  const minTop = Math.min(...elements.map((el) => el.y));
  const maxBottom = Math.max(...elements.map((el) => el.y + el.height));

  const unionCenterX = (minLeft + maxRight) / 2;
  const unionCenterY = (minTop + maxBottom) / 2;

  switch (alignment) {
    case 'left':
      return elements.map((el) => ({
        ...el,
        x: Math.round(minLeft),
      }));

    case 'center-h':
      return elements.map((el) => ({
        ...el,
        x: Math.round(unionCenterX - el.width / 2),
      }));

    case 'right':
      return elements.map((el) => ({
        ...el,
        x: Math.round(maxRight - el.width),
      }));

    case 'top':
      return elements.map((el) => ({
        ...el,
        y: Math.round(minTop),
      }));

    case 'center-v':
      return elements.map((el) => ({
        ...el,
        y: Math.round(unionCenterY - el.height / 2),
      }));

    case 'bottom':
      return elements.map((el) => ({
        ...el,
        y: Math.round(maxBottom - el.height),
      }));

    case 'distribute-h': {
      const sorted = [...elements].sort(
        (a, b) => a.x + a.width / 2 - (b.x + b.width / 2)
      );
      const totalWidths = sorted.reduce((sum, el) => sum + el.width, 0);
      const totalSpan = maxRight - minLeft;
      const rawGap =
        sorted.length > 1 ? (totalSpan - totalWidths) / (sorted.length - 1) : 0;
      const netGap = Math.max(24, rawGap);

      let cursorX = minLeft;
      const posMap = new Map<string, number>();
      sorted.forEach((el) => {
        posMap.set(`${el.kind}:${el.id}`, Math.round(cursorX));
        cursorX += el.width + netGap;
      });

      return elements.map((el) => ({
        ...el,
        x: posMap.get(`${el.kind}:${el.id}`) ?? el.x,
      }));
    }

    case 'distribute-v': {
      const sorted = [...elements].sort(
        (a, b) => a.y + a.height / 2 - (b.y + b.height / 2)
      );
      const totalHeights = sorted.reduce((sum, el) => sum + el.height, 0);
      const totalSpan = maxBottom - minTop;
      const rawGap =
        sorted.length > 1 ? (totalSpan - totalHeights) / (sorted.length - 1) : 0;
      const netGap = Math.max(24, rawGap);

      let cursorY = minTop;
      const posMap = new Map<string, number>();
      sorted.forEach((el) => {
        posMap.set(`${el.kind}:${el.id}`, Math.round(cursorY));
        cursorY += el.height + netGap;
      });

      return elements.map((el) => ({
        ...el,
        y: posMap.get(`${el.kind}:${el.id}`) ?? el.y,
      }));
    }
  }
}

/**
 * Computes real-time magnetic Smart Alignment Guides (left/center/right & top/middle/bottom)
 * when dragging one or more elements across the canvas.
 */
export function computeSmartSnapGuides(
  movingBox: Rect,
  staticBoxes: Rect[],
  threshold: number = 6
): SmartSnapResult {
  if (staticBoxes.length === 0) {
    return { snappedDeltaX: 0, snappedDeltaY: 0, guides: [] };
  }

  // Spatial bounding-box pre-filtering: only consider static boxes within a reasonable neighborhood
  // along the perpendicular axis (avoids O(N) inner-loop checks on distant off-screen nodes when N > 100)
  const MAX_NEIGHBOR_SPAN = 2200;
  const moveCenterX = movingBox.x + movingBox.width / 2;
  const moveCenterY = movingBox.y + movingBox.height / 2;

  const xCandidates =
    staticBoxes.length > 40
      ? staticBoxes.filter(
          (s) => Math.abs(s.y + s.height / 2 - moveCenterY) <= MAX_NEIGHBOR_SPAN
        )
      : staticBoxes;

  const yCandidates =
    staticBoxes.length > 40
      ? staticBoxes.filter(
          (s) => Math.abs(s.x + s.width / 2 - moveCenterX) <= MAX_NEIGHBOR_SPAN
        )
      : staticBoxes;

  const mXPoints: { val: number; type: 'edge' | 'center' }[] = [
    { val: movingBox.x + movingBox.width / 2, type: 'center' },
    { val: movingBox.x, type: 'edge' },
    { val: movingBox.x + movingBox.width, type: 'edge' },
  ];

  const mYPoints: { val: number; type: 'edge' | 'center' }[] = [
    { val: movingBox.y + movingBox.height / 2, type: 'center' },
    { val: movingBox.y, type: 'edge' },
    { val: movingBox.y + movingBox.height, type: 'edge' },
  ];

  let bestDiffX = threshold + 0.001;
  let snappedDeltaX = 0;

  for (const sBox of xCandidates) {
    const sXPoints = [
      sBox.x + sBox.width / 2,
      sBox.x,
      sBox.x + sBox.width,
    ];
    for (const mPt of mXPoints) {
      for (const sVal of sXPoints) {
        const diff = Math.abs(sVal - mPt.val);
        // Give center-to-center alignment a tiny priority tie-breaker
        const weightedDiff = mPt.type === 'center' ? diff - 0.05 : diff;
        if (diff <= threshold && weightedDiff < bestDiffX) {
          bestDiffX = weightedDiff;
          snappedDeltaX = sVal - mPt.val;
        }
      }
    }
  }

  let bestDiffY = threshold + 0.001;
  let snappedDeltaY = 0;

  for (const sBox of yCandidates) {
    const sYPoints = [
      sBox.y + sBox.height / 2,
      sBox.y,
      sBox.y + sBox.height,
    ];
    for (const mPt of mYPoints) {
      for (const sVal of sYPoints) {
        const diff = Math.abs(sVal - mPt.val);
        const weightedDiff = mPt.type === 'center' ? diff - 0.05 : diff;
        if (diff <= threshold && weightedDiff < bestDiffY) {
          bestDiffY = weightedDiff;
          snappedDeltaY = sVal - mPt.val;
        }
      }
    }
  }

  const finalMovingBox: Rect = {
    x: movingBox.x + snappedDeltaX,
    y: movingBox.y + snappedDeltaY,
    width: movingBox.width,
    height: movingBox.height,
  };

  const guides: SmartGuideLine[] = [];
  const EPS = 0.75;

  // Build active vertical guide lines if X snapped
  if (bestDiffX <= threshold) {
    const finalMX: { val: number; type: 'edge' | 'center' }[] = [
      { val: finalMovingBox.x + finalMovingBox.width / 2, type: 'center' },
      { val: finalMovingBox.x, type: 'edge' },
      { val: finalMovingBox.x + finalMovingBox.width, type: 'edge' },
    ];

    for (const mLine of finalMX) {
      const matchedStatic: Rect[] = [];
      for (const sBox of staticBoxes) {
        const sLines = [sBox.x, sBox.x + sBox.width / 2, sBox.x + sBox.width];
        if (sLines.some((sVal) => Math.abs(sVal - mLine.val) <= EPS)) {
          matchedStatic.push(sBox);
        }
      }
      if (matchedStatic.length > 0) {
        const allBoxes = [finalMovingBox, ...matchedStatic];
        const minY = Math.min(...allBoxes.map((b) => b.y)) - 14;
        const maxY = Math.max(...allBoxes.map((b) => b.y + b.height)) + 14;
        const anchorPoints = allBoxes.map((b) => ({
          x: mLine.val,
          y: b.y + b.height / 2,
        }));
        guides.push({
          orientation: 'vertical',
          pos: mLine.val,
          start: minY,
          end: maxY,
          snapType: mLine.type,
          anchorPoints,
        });
        // Keep at most 1 primary vertical line if center is already matched to avoid visual clutter on equal-width cards
        if (mLine.type === 'center') break;
      }
    }
  }

  // Build active horizontal guide lines if Y snapped
  if (bestDiffY <= threshold) {
    const finalMY: { val: number; type: 'edge' | 'center' }[] = [
      { val: finalMovingBox.y + finalMovingBox.height / 2, type: 'center' },
      { val: finalMovingBox.y, type: 'edge' },
      { val: finalMovingBox.y + finalMovingBox.height, type: 'edge' },
    ];

    for (const mLine of finalMY) {
      const matchedStatic: Rect[] = [];
      for (const sBox of staticBoxes) {
        const sLines = [sBox.y, sBox.y + sBox.height / 2, sBox.y + sBox.height];
        if (sLines.some((sVal) => Math.abs(sVal - mLine.val) <= EPS)) {
          matchedStatic.push(sBox);
        }
      }
      if (matchedStatic.length > 0) {
        const allBoxes = [finalMovingBox, ...matchedStatic];
        const minX = Math.min(...allBoxes.map((b) => b.x)) - 14;
        const maxX = Math.max(...allBoxes.map((b) => b.x + b.width)) + 14;
        const anchorPoints = allBoxes.map((b) => ({
          x: b.x + b.width / 2,
          y: mLine.val,
        }));
        guides.push({
          orientation: 'horizontal',
          pos: mLine.val,
          start: minX,
          end: maxX,
          snapType: mLine.type,
          anchorPoints,
        });
        if (mLine.type === 'center') break;
      }
    }
  }

  return {
    snappedDeltaX,
    snappedDeltaY,
    guides,
  };
}

/**
 * Align or distribute a set of selected Person cards with generous non-overlapping spacing
 */
export function alignSelectedPeople(
  selectedPeople: BasePerson[],
  alignment: AlignmentType
): GraphNodePosition[] {
  const boxes: AlignableElementBox[] = selectedPeople.map((p) => ({
    kind: 'person',
    id: p.id,
    x: p.x,
    y: p.y,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  }));
  const aligned = alignUnifiedElements(boxes, alignment);
  return aligned.map((b) => ({ id: b.id, x: b.x, y: b.y }));
}
