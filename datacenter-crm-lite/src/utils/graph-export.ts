import { jsPDF } from 'jspdf';
import type { Person, Relationship, VisitRecord, GroupFrame, ProjectMap } from '../types/crm.ts';
import type { BackgroundStyleConfig, LineStyleConfig, CardStyleConfig } from '../types/styles.ts';
import { CARD_WIDTH, CARD_HEIGHT, getAnchorPoint, calculateConnectionPath } from './graph-math.ts';
import { calculateRelationshipStrength } from './relationship-strength.ts';

export interface GraphBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export function escapeXml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function calculateGraphBounds(
  people: Person[],
  relationships: Relationship[],
  padding: number = 80,
  includeHeaderMargin: boolean = false,
  groupFrames: GroupFrame[] = []
): GraphBounds {
  const onCanvasPeople = people.filter((p) => p.onCanvas && !p.hidden);
  const visibleFrames = groupFrames.filter((f) => !f.hidden);
  if (onCanvasPeople.length === 0 && visibleFrames.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 1200,
      maxY: 800,
      width: 1200,
      height: 800,
      offsetX: -padding,
      offsetY: -padding,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  onCanvasPeople.forEach((p) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + CARD_WIDTH);
    maxY = Math.max(maxY, p.y + CARD_HEIGHT + 24);
  });

  visibleFrames.forEach((f) => {
    minX = Math.min(minX, f.x);
    minY = Math.min(minY, f.y);
    maxX = Math.max(maxX, f.x + f.width);
    maxY = Math.max(maxY, f.y + f.height);
  });

  const peopleMap = new Map<string, Person>();
  onCanvasPeople.forEach((p) => peopleMap.set(p.id, p));

  relationships.forEach((rel) => {
    if (rel.hidden) return;
    const s = peopleMap.get(rel.sourceId);
    const t = peopleMap.get(rel.targetId);
    if (s && t) {
      const midX = (s.x + t.x) / 2 + (rel.offsetX || 0);
      const midY = (s.y + t.y) / 2 + (rel.offsetY || 0);
      minX = Math.min(minX, midX - 75);
      minY = Math.min(minY, midY - 35);
      maxX = Math.max(maxX, midX + 75);
      maxY = Math.max(maxY, midY + 35);
    }
  });

  const headerHeight = includeHeaderMargin ? 92 : 0;
  const width = Math.max(800, maxX - minX + padding * 2);
  const height = Math.max(600, maxY - minY + padding * 2 + headerHeight);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    offsetX: minX - padding,
    offsetY: minY - padding - headerHeight,
  };
}

export interface ExportOptions {
  people: Person[];
  relationships: Relationship[];
  visits?: VisitRecord[];
  groupFrames?: GroupFrame[];
  showGroupFrames?: boolean;
  showStrengthHeatmap?: boolean;
  project?: ProjectMap;
  projectName?: string;
  withBackground?: boolean;
  scale?: number;
  bgConfig?: BackgroundStyleConfig;
  lineConfig?: LineStyleConfig;
  cardConfig?: CardStyleConfig;
}

export interface ResolvedCardVisuals {
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  rx: number;
  isDarkCard: boolean;
  nameColor: string;
  titleColor: string;
  companyColor: string;
  bioColor: string;
  dividerColor: string;
  avatarBg: string;
  avatarBorder: string;
  accentStyle: 'bar' | 'glow' | 'frame' | 'full' | 'minimal' | 'ribbon' | 'tag';
  hardShadow?: boolean;
  polaroidBottom?: boolean;
  auroraBorder?: boolean;
}

export function resolveCardVisuals(
  cardConfig: CardStyleConfig | undefined,
  personCardColor: string
): ResolvedCardVisuals {
  const id = cardConfig?.id || 'classic-white';
  const isDarkCard = cardConfig?.isDarkCard ?? false;
  const accentStyle = cardConfig?.accentStyle || 'bar';

  let rx = 12;
  if (cardConfig?.roundedClass === 'rounded-xs' || cardConfig?.roundedClass === 'rounded-sm') rx = 4;
  else if (cardConfig?.roundedClass === 'rounded-lg') rx = 8;
  else if (cardConfig?.roundedClass === 'rounded-xl') rx = 12;
  else if (cardConfig?.roundedClass === 'rounded-2xl') rx = 16;
  else if (cardConfig?.roundedClass === 'rounded-3xl') rx = 22;

  let fill = isDarkCard ? '#0f172a' : '#ffffff';
  let stroke = isDarkCard ? '#334155' : '#e2e8f0';
  let strokeWidth = 1.2;
  let strokeDasharray: string | undefined = undefined;
  let hardShadow = false;
  let polaroidBottom = false;
  let auroraBorder = false;

  switch (id) {
    case 'frosted-glass':
      fill = 'rgba(255, 255, 255, 0.88)';
      stroke = '#cbd5e1';
      break;
    case 'dark-obsidian':
      fill = '#0f172a';
      stroke = '#334155';
      break;
    case 'cyber-matrix':
      fill = '#091122';
      stroke = '#06b6d4';
      strokeWidth = 1.5;
      break;
    case 'tinted-pastel':
      fill = `${personCardColor}18`;
      stroke = `${personCardColor}66`;
      break;
    case 'borderless-minimal':
      fill = '#ffffff';
      stroke = '#f1f5f9';
      strokeWidth = 0.8;
      break;
    case 'blueprint-cad':
      fill = '#081d38';
      stroke = personCardColor || '#60a5fa';
      strokeWidth = 1.6;
      break;
    case 'vintage-parchment':
      fill = '#fcf7ec';
      stroke = personCardColor || '#cfbe9f';
      strokeWidth = 1.5;
      strokeDasharray = '5,3';
      break;
    case 'neumorphic-soft':
      fill = '#f8fafc';
      stroke = '#e2e8f0';
      break;
    case 'polaroid-snap':
      fill = '#ffffff';
      stroke = personCardColor || '#cbd5e1';
      strokeWidth = 1.5;
      polaroidBottom = true;
      break;
    case 'pop-art-neo':
      fill = '#fffbeb';
      stroke = '#0f172a';
      strokeWidth = 2.4;
      hardShadow = true;
      break;
    case 'aurora-gradient':
      fill = '#ffffff';
      stroke = '#8b5cf6';
      strokeWidth = 1.8;
      auroraBorder = true;
      break;
    case 'split-capsule':
      fill = '#ffffff';
      stroke = '#cbd5e1';
      break;
    case 'titanium-metal':
      fill = '#f1f5f9';
      stroke = '#94a3b8';
      break;
    case 'nordic-forest':
      fill = '#ecfdf5';
      stroke = '#a7f3d0';
      break;
    case 'sunset-coral':
      fill = '#fff7ed';
      stroke = '#fed7aa';
      break;
    case 'matrix-terminal':
      fill = '#020617';
      stroke = '#10b981';
      strokeWidth = 1.5;
      break;
    case 'royal-velvet':
      fill = '#1e1b4b';
      stroke = '#fbbf24';
      strokeWidth = 1.6;
      break;
    case 'outline-wireframe':
      fill = 'rgba(255, 255, 255, 0.72)';
      stroke = personCardColor || '#94a3b8';
      strokeWidth = 2.0;
      break;
    case 'watercolor-blush':
      fill = '#fff1f2';
      stroke = '#fecdd3';
      break;
    default:
      break;
  }

  if (accentStyle === 'frame' && id !== 'pop-art-neo') {
    stroke = personCardColor || stroke;
  }

  return {
    fill,
    stroke,
    strokeWidth,
    strokeDasharray,
    rx,
    isDarkCard,
    nameColor: isDarkCard ? '#ffffff' : '#0f172a',
    titleColor: isDarkCard ? '#22d3ee' : '#2563eb',
    companyColor: isDarkCard ? '#94a3b8' : '#64748b',
    bioColor: isDarkCard ? '#94a3b8' : '#64748b',
    dividerColor: isDarkCard ? '#1e293b' : '#f1f5f9',
    avatarBg: isDarkCard ? '#1e293b' : '#f1f5f9',
    avatarBorder: isDarkCard ? '#334155' : '#e2e8f0',
    accentStyle,
    hardShadow,
    polaroidBottom,
    auroraBorder,
  };
}

export function resolveBackgroundPattern(bgConfig: BackgroundStyleConfig | undefined): {
  bgColor: string;
  isDark: boolean;
  patternType: 'dots' | 'grid' | 'diagonal' | 'gradient' | 'solid';
  patternColor: string;
  spacing: number;
  dotRadius: number;
  gradientStops?: [string, string, string];
} {
  const id = bgConfig?.id || 'grid-dots-slate';
  const bgColor = bgConfig?.backgroundColor || '#f8fafc';
  const isDark = bgConfig?.isDark ?? false;
  const spacing = parseInt(bgConfig?.backgroundSize || '24', 10) || 24;

  switch (id) {
    case 'grid-square-subtle':
      return { bgColor, isDark, patternType: 'grid', patternColor: '#e2e8f0', spacing: 24, dotRadius: 1.2 };
    case 'cyber-dark-grid':
      return { bgColor, isDark, patternType: 'grid', patternColor: 'rgba(6,182,212,0.16)', spacing: 28, dotRadius: 1.2 };
    case 'blueprint-cad':
      return { bgColor, isDark, patternType: 'grid', patternColor: 'rgba(255,255,255,0.12)', spacing: 30, dotRadius: 1.2 };
    case 'circuit-matrix':
      return { bgColor, isDark, patternType: 'grid', patternColor: 'rgba(59,130,246,0.18)', spacing: 36, dotRadius: 1.2 };
    case 'diagonal-mesh':
      return { bgColor, isDark, patternType: 'diagonal', patternColor: '#e2e8f0', spacing: 32, dotRadius: 1.2 };
    case 'dawn-gradient':
      return {
        bgColor,
        isDark,
        patternType: 'gradient',
        patternColor: '#fed7aa',
        spacing: 24,
        dotRadius: 1.2,
        gradientStops: ['#fef3c7', '#fed7aa', '#e0f2fe'],
      };
    case 'twilight-aurora':
      return {
        bgColor,
        isDark,
        patternType: 'gradient',
        patternColor: '#312e81',
        spacing: 24,
        dotRadius: 1.2,
        gradientStops: ['#1e1b4b', '#0f172a', '#172554'],
      };
    case 'sunset-amber':
      return {
        bgColor,
        isDark,
        patternType: 'gradient',
        patternColor: '#fde68a',
        spacing: 24,
        dotRadius: 1.2,
        gradientStops: ['#fffbeb', '#fef3c7', '#ffedd5'],
      };
    case 'pure-studio':
      return {
        bgColor,
        isDark,
        patternType: 'gradient',
        patternColor: '#f1f5f9',
        spacing: 24,
        dotRadius: 1.2,
        gradientStops: ['#ffffff', '#f8fafc', '#f1f5f9'],
      };
    case 'obsidian-night':
      return { bgColor, isDark, patternType: 'dots', patternColor: '#334155', spacing: 24, dotRadius: 1.4 };
    case 'warm-parchment':
      return { bgColor, isDark, patternType: 'dots', patternColor: '#d4c5a9', spacing: 22, dotRadius: 1.2 };
    case 'nordic-frost':
      return { bgColor, isDark, patternType: 'dots', patternColor: '#bae6fd', spacing: 24, dotRadius: 1.5 };
    case 'emerald-matrix':
      return { bgColor, isDark, patternType: 'dots', patternColor: 'rgba(16,185,129,0.35)', spacing: 26, dotRadius: 1.3 };
    case 'amethyst-glow':
      return { bgColor, isDark, patternType: 'dots', patternColor: '#d8b4fe', spacing: 24, dotRadius: 1.3 };
    case 'warm-latte':
      return { bgColor, isDark, patternType: 'dots', patternColor: '#d6c7b2', spacing: 22, dotRadius: 1.3 };
    case 'honeycomb-hex':
      return { bgColor, isDark, patternType: 'dots', patternColor: '#cbd5e1', spacing: 28, dotRadius: 1.5 };
    case 'misty-marine':
      return { bgColor, isDark, patternType: 'dots', patternColor: '#86efac', spacing: 24, dotRadius: 1.3 };
    case 'concrete-slate':
      return { bgColor, isDark, patternType: 'dots', patternColor: '#b0bec5', spacing: 24, dotRadius: 1.4 };
    case 'deep-cosmos':
      return { bgColor, isDark, patternType: 'dots', patternColor: 'rgba(147,197,253,0.45)', spacing: 32, dotRadius: 1.3 };
    default:
      return { bgColor, isDark, patternType: 'dots', patternColor: '#cbd5e1', spacing: 24, dotRadius: 1.2 };
  }
}

function wrapBioLines(bio: string, maxCharsPerLine: number = 17): string[] {
  if (!bio) return [];
  const clean = bio.trim().replace(/\s+/g, ' ');
  if (clean.length <= maxCharsPerLine) return [clean];
  const line1 = clean.slice(0, maxCharsPerLine);
  const rest = clean.slice(maxCharsPerLine);
  const line2 = rest.length > maxCharsPerLine ? rest.slice(0, maxCharsPerLine - 1) + '…' : rest;
  return [line1, line2];
}

export function generateGraphSvgString(options: ExportOptions): string {
  const {
    people,
    relationships,
    visits = [],
    groupFrames = [],
    showGroupFrames = true,
    showStrengthHeatmap = true,
    project,
    projectName = project?.name || '华云智算 32MW 液冷智算中心二期',
    withBackground = true,
    bgConfig,
    lineConfig,
    cardConfig,
  } = options;

  const onCanvasPeople = people
    .filter((p) => p.onCanvas && !p.hidden)
    .sort((a, b) => (a.zIndex ?? 100) - (b.zIndex ?? 100));
  const activeFrames = showGroupFrames
    ? groupFrames.filter((f) => !f.hidden).sort((a, b) => (a.zIndex ?? 10) - (b.zIndex ?? 10))
    : [];
  const visibleRelationships = relationships
    .filter((r) => !r.hidden)
    .sort((a, b) => (a.zIndex ?? 60) - (b.zIndex ?? 60));

  const bounds = calculateGraphBounds(people, visibleRelationships, 80, withBackground, activeFrames);

  const peopleMap = new Map<string, Person>();
  onCanvasPeople.forEach((p) => peopleMap.set(p.id, p));

  const bgPattern = resolveBackgroundPattern(bgConfig);
  const isDark = bgPattern.isDark;
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';

  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bounds.width} ${bounds.height}" width="${bounds.width}" height="${bounds.height}">\n`;
  svg += `  <defs>\n`;
  svg += `    <style>\n`;
  svg += `      text { font-family: "Plus Jakarta Sans", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }\n`;
  svg += `    </style>\n`;
  svg += `    <filter id="card-shadow" x="-10%" y="-10%" width="125%" height="125%">\n`;
  svg += `      <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#0f172a" flood-opacity="${isDark ? '0.45' : '0.08'}" />\n`;
  svg += `    </filter>\n`;
  svg += `    <filter id="line-glow-cyan" x="-30%" y="-30%" width="160%" height="160%">\n`;
  svg += `      <feDropShadow dx="0" dy="0" stdDeviation="3.5" flood-color="#06b6d4" flood-opacity="0.85" />\n`;
  svg += `    </filter>\n`;
  svg += `    <filter id="line-glow-purple" x="-30%" y="-30%" width="160%" height="160%">\n`;
  svg += `      <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#9333ea" flood-opacity="0.9" />\n`;
  svg += `    </filter>\n`;
  svg += `    <filter id="line-glow-gold" x="-30%" y="-30%" width="160%" height="160%">\n`;
  svg += `      <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#d97706" flood-opacity="0.85" />\n`;
  svg += `    </filter>\n`;
  svg += `    <filter id="line-shadow-3d" x="-30%" y="-30%" width="160%" height="160%">\n`;
  svg += `      <feDropShadow dx="1.5" dy="3.5" stdDeviation="2.5" flood-color="#0f172a" flood-opacity="0.35" />\n`;
  svg += `    </filter>\n`;
  svg += `    <linearGradient id="line-grad-twilight" x1="0%" y1="0%" x2="100%" y2="100%">\n`;
  svg += `      <stop offset="0%" stop-color="#4f46e5" />\n`;
  svg += `      <stop offset="50%" stop-color="#9333ea" />\n`;
  svg += `      <stop offset="100%" stop-color="#ec4899" />\n`;
  svg += `    </linearGradient>\n`;
  svg += `    <linearGradient id="aurora-card-border" x1="0%" y1="0%" x2="100%" y2="0%">\n`;
  svg += `      <stop offset="0%" stop-color="#6366f1" />\n`;
  svg += `      <stop offset="50%" stop-color="#a855f7" />\n`;
  svg += `      <stop offset="100%" stop-color="#ec4899" />\n`;
  svg += `    </linearGradient>\n`;

  if (bgPattern.gradientStops) {
    svg += `    <linearGradient id="bg-gradient-fill" x1="0%" y1="0%" x2="100%" y2="100%">\n`;
    svg += `      <stop offset="0%" stop-color="${bgPattern.gradientStops[0]}" />\n`;
    svg += `      <stop offset="50%" stop-color="${bgPattern.gradientStops[1]}" />\n`;
    svg += `      <stop offset="100%" stop-color="${bgPattern.gradientStops[2]}" />\n`;
    svg += `    </linearGradient>\n`;
  }
  svg += `  </defs>\n`;

  if (withBackground) {
    svg += `  <!-- Background -->\n`;
    const rectFill = bgPattern.gradientStops ? 'url(#bg-gradient-fill)' : bgPattern.bgColor;
    svg += `  <rect width="${bounds.width}" height="${bounds.height}" fill="${rectFill}" />\n`;

    if (bgPattern.patternType === 'dots') {
      const step = bgPattern.spacing;
      for (let x = 20; x < bounds.width; x += step) {
        for (let y = 20; y < bounds.height; y += step) {
          svg += `  <circle cx="${x}" cy="${y}" r="${bgPattern.dotRadius}" fill="${bgPattern.patternColor}" />\n`;
        }
      }
    } else if (bgPattern.patternType === 'grid') {
      const step = bgPattern.spacing;
      for (let x = 0; x <= bounds.width; x += step) {
        svg += `  <line x1="${x}" y1="0" x2="${x}" y2="${bounds.height}" stroke="${bgPattern.patternColor}" stroke-width="1" />\n`;
      }
      for (let y = 0; y <= bounds.height; y += step) {
        svg += `  <line x1="0" y1="${y}" x2="${bounds.width}" y2="${y}" stroke="${bgPattern.patternColor}" stroke-width="1" />\n`;
      }
    } else if (bgPattern.patternType === 'diagonal') {
      const step = bgPattern.spacing;
      for (let i = -bounds.height; i < bounds.width + bounds.height; i += step) {
        svg += `  <line x1="${i}" y1="0" x2="${i + bounds.height}" y2="${bounds.height}" stroke="${bgPattern.patternColor}" stroke-width="0.8" />\n`;
        svg += `  <line x1="${i}" y1="${bounds.height}" x2="${i + bounds.height}" y2="0" stroke="${bgPattern.patternColor}" stroke-width="0.8" />\n`;
      }
    }

    const specLine = project?.scaleMw
      ? `${project.scaleMw} · ${project.targetPue || 'PUE 1.15'} · ${project.tierLevel || '国标A级'} · ${project.contractBudget || ''}`
      : `导出时间: ${new Date().toLocaleString()} | 关键人: ${onCanvasPeople.length} 位 | 关系链: ${visibleRelationships.length} 条`;

    svg += `  <!-- Title & Metadata -->\n`;
    svg += `  <g transform="translate(35, 45)">\n`;
    svg += `    <rect x="-15" y="-26" width="640" height="60" rx="10" fill="${isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.94)'}" stroke="${isDark ? '#334155' : '#e2e8f0'}" stroke-width="1.2" />\n`;
    svg += `    <text x="0" y="-2" font-size="15" font-weight="bold" fill="${textColor}">${escapeXml(projectName)}</text>\n`;
    svg += `    <text x="0" y="18" font-size="11" fill="${subTextColor}">${escapeXml(specLine)} · 节点 ${onCanvasPeople.length} 人 / 连线 ${visibleRelationships.length} 条</text>\n`;
    svg += `  </g>\n`;
  }

  if (activeFrames.length > 0) {
    svg += `  <!-- Group Frames Layer -->\n`;
    svg += `  <g id="group-frames">\n`;
    activeFrames.forEach((frame) => {
      const fx = frame.x - bounds.offsetX;
      const fy = frame.y - bounds.offsetY;
      const fColor = frame.color || '#3b82f6';
      svg += `    <g transform="translate(${fx}, ${fy})">\n`;
      svg += `      <rect width="${frame.width}" height="${frame.height}" rx="16" fill="${fColor}0A" stroke="${fColor}55" stroke-width="1.5" stroke-dasharray="8,5" />\n`;
      svg += `      <rect x="14" y="-12" width="${Math.max(140, frame.title.length * 13 + 24)}" height="24" rx="6" fill="${isDark ? '#0f172a' : '#ffffff'}" stroke="${fColor}88" stroke-width="1.2" />\n`;
      svg += `      <text x="26" y="4" font-size="11.5" font-weight="bold" fill="${fColor}">${escapeXml(frame.title)}</text>\n`;
      svg += `    </g>\n`;
    });
    svg += `  </g>\n`;
  }

  svg += `  <!-- Relationships Layer -->\n`;
  svg += `  <g id="relationships">\n`;

  const isTwilight = lineConfig?.id === 'gradient-twilight';

  visibleRelationships.forEach((rel) => {
    const source = peopleMap.get(rel.sourceId);
    const target = peopleMap.get(rel.targetId);
    if (!source || !target) return;

    const strength = calculateRelationshipStrength(rel, source, target, visits);

    const p1 = getAnchorPoint(
      { x: source.x - bounds.offsetX, y: source.y - bounds.offsetY, width: CARD_WIDTH, height: CARD_HEIGHT },
      rel.sourceAnchor || 'right'
    );
    const p2 = getAnchorPoint(
      { x: target.x - bounds.offsetX, y: target.y - bounds.offsetY, width: CARD_WIDTH, height: CARD_HEIGHT },
      rel.targetAnchor || 'left'
    );

    const effectiveType = rel.lineStyle || lineConfig?.lineType || 'bezier';
    const { path, midPoint } = calculateConnectionPath(
      p1,
      p2,
      rel.sourceAnchor || 'right',
      rel.targetAnchor || 'left',
      effectiveType,
      rel.offsetX || 0,
      rel.offsetY || 0
    );

    const baseStrokeColor = showStrengthHeatmap
      ? strength.color
      : isTwilight
      ? 'url(#line-grad-twilight)'
      : lineConfig?.glowEffect === 'neon-cyan'
      ? '#06B6D4'
      : lineConfig?.glowEffect === 'neon-purple'
      ? '#A855F7'
      : lineConfig?.glowEffect === 'gold'
      ? '#D97706'
      : rel.color || '#3B82F6';

    const solidBadgeColor = showStrengthHeatmap
      ? strength.color
      : lineConfig?.glowEffect === 'neon-cyan'
      ? '#06B6D4'
      : lineConfig?.glowEffect === 'neon-purple'
      ? '#A855F7'
      : lineConfig?.glowEffect === 'gold'
      ? '#D97706'
      : rel.color || '#3B82F6';

    const strokeFilter =
      lineConfig?.glowEffect === 'neon-cyan'
        ? ' filter="url(#line-glow-cyan)"'
        : lineConfig?.glowEffect === 'neon-purple'
        ? ' filter="url(#line-glow-purple)"'
        : lineConfig?.glowEffect === 'gold'
        ? ' filter="url(#line-glow-gold)"'
        : lineConfig?.glowEffect === 'shadow-3d'
        ? ' filter="url(#line-shadow-3d)"'
        : '';

    const strokeWidth = showStrengthHeatmap
      ? strength.strokeWidth
      : lineConfig?.strokeWidth || 2.4;

    const dashAttr =
      !rel.lineStyle && lineConfig?.strokeDasharray
        ? ` stroke-dasharray="${lineConfig.strokeDasharray}"`
        : '';

    svg += `    <path d="${path}" fill="none" stroke="${baseStrokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round"${dashAttr}${strokeFilter} />\n`;

    if (lineConfig?.doubleLine) {
      svg += `    <path d="${path}" fill="none" stroke="${isDark ? '#0a0f1d' : '#ffffff'}" stroke-width="${(strokeWidth * 0.4).toFixed(1)}" stroke-linecap="round" />\n`;
    }

    if (lineConfig?.arrowType === 'diamond') {
      svg += `    <polygon points="${p2.x},${p2.y - 5} ${p2.x + 5},${p2.y} ${p2.x},${p2.y + 5} ${p2.x - 5},${p2.y}" fill="${solidBadgeColor}" />\n`;
    } else if (lineConfig?.arrowType === 'both' || rel.arrow === 'both') {
      svg += `    <circle cx="${p1.x}" cy="${p1.y}" r="${Math.max(3.5, strokeWidth * 0.85)}" fill="${solidBadgeColor}" />\n`;
      svg += `    <circle cx="${p2.x}" cy="${p2.y}" r="${Math.max(4, strokeWidth * 0.95)}" fill="${solidBadgeColor}" />\n`;
    } else {
      svg += `    <circle cx="${p2.x}" cy="${p2.y}" r="${Math.max(3.5, strokeWidth * 0.85)}" fill="${solidBadgeColor}" />\n`;
    }

    const labelX = midPoint.x + (rel.offsetX || 0);
    const labelY = midPoint.y + (rel.offsetY || 0);
    const badgeText = showStrengthHeatmap
      ? `${rel.label} (${strength.score}分)`
      : rel.label;
    const rawDesc = (rel.description ?? '').trim();
    const showDescOnLine = rel.showDescriptionOnCanvas !== false && rawDesc.length > 0;
    const displayDesc = rawDesc.length > 24 ? `${rawDesc.slice(0, 23)}…` : rawDesc;
    const badgeWidth = Math.max(
      72,
      badgeText.length * 10 + 20,
      showDescOnLine ? displayDesc.length * 9.5 + 24 : 0
    );
    const badgeHeight = showDescOnLine ? 42 : 24;

    svg += `    <g transform="translate(${labelX}, ${labelY})">\n`;
    svg += `      <rect x="${-badgeWidth / 2}" y="${-badgeHeight / 2}" width="${badgeWidth}" height="${badgeHeight}" rx="7" fill="${isDark ? '#1e293b' : '#ffffff'}" stroke="${solidBadgeColor}" stroke-width="1.6" />\n`;
    if (showDescOnLine) {
      const isRiskDesc = /(风险|预警|冲标|卡点|排他|受阻|博弈|Risk|Alert|Blocker)/i.test(rawDesc);
      const isProgressDesc = /(审批|进度|通过|会签|过会|完成|批复|认可|Approval|Approved)/i.test(rawDesc);
      const descTextColor = isRiskDesc
        ? isDark
          ? '#fbbf24'
          : '#d97706'
        : isProgressDesc
        ? isDark
          ? '#34d399'
          : '#059669'
        : isDark
        ? '#cbd5e1'
        : '#475569';
      const descPillBg = isRiskDesc
        ? isDark
          ? 'rgba(245, 158, 11, 0.16)'
          : '#fffbeb'
        : isProgressDesc
        ? isDark
          ? 'rgba(16, 185, 129, 0.16)'
          : '#ecfdf5'
        : isDark
        ? 'rgba(148, 163, 184, 0.14)'
        : '#f8fafc';
      svg += `      <text x="0" y="-5" text-anchor="middle" font-size="11" font-weight="bold" fill="${isDark ? '#f8fafc' : solidBadgeColor}">${escapeXml(badgeText)}</text>\n`;
      svg += `      <rect x="${-badgeWidth / 2 + 4}" y="1" width="${badgeWidth - 8}" height="16" rx="4" fill="${descPillBg}" />\n`;
      svg += `      <text x="0" y="12" text-anchor="middle" font-size="9.5" font-weight="500" fill="${descTextColor}">${escapeXml(displayDesc)}</text>\n`;
    } else {
      svg += `      <text x="0" y="4" text-anchor="middle" font-size="11" font-weight="bold" fill="${isDark ? '#f8fafc' : solidBadgeColor}">${escapeXml(badgeText)}</text>\n`;
    }
    svg += `    </g>\n`;
  });

  svg += `  </g>\n`;

  svg += `  <!-- Person Cards Layer -->\n`;
  svg += `  <g id="person-cards">\n`;

  onCanvasPeople.forEach((p) => {
    const cardX = p.x - bounds.offsetX;
    const cardY = p.y - bounds.offsetY;
    const cardColor = p.cardColor || '#3b82f6';
    const cv = resolveCardVisuals(cardConfig, cardColor);
    const bioLines = wrapBioLines(p.bio, 18);
    const cardH = CARD_HEIGHT;

    svg += `    <g transform="translate(${cardX}, ${cardY})">\n`;

    if (cv.hardShadow) {
      svg += `      <rect x="4" y="4" width="${CARD_WIDTH}" height="${cardH}" rx="${cv.rx}" fill="#0f172a" />\n`;
    }

    const strokeAttr = cv.auroraBorder ? 'url(#aurora-card-border)' : cv.stroke;
    const dashCardAttr = cv.strokeDasharray ? ` stroke-dasharray="${cv.strokeDasharray}"` : '';
    const shadowFilter = cv.hardShadow ? '' : ' filter="url(#card-shadow)"';

    svg += `      <rect width="${CARD_WIDTH}" height="${cardH}" rx="${cv.rx}" fill="${cv.fill}" stroke="${strokeAttr}" stroke-width="${cv.strokeWidth}"${dashCardAttr}${shadowFilter} />\n`;

    if (cv.accentStyle === 'bar') {
      svg += `      <rect x="1" y="1" width="${CARD_WIDTH - 2}" height="5.5" rx="${Math.max(2, cv.rx - 2)}" fill="${cardColor}" />\n`;
    } else if (cv.accentStyle === 'glow') {
      svg += `      <rect x="12" y="1" width="${CARD_WIDTH - 24}" height="3.5" rx="2" fill="${cardColor}" opacity="0.85" />\n`;
    }

    if (cv.accentStyle === 'ribbon') {
      svg += `      <rect x="${CARD_WIDTH - 38}" y="6" width="28" height="14" rx="3" fill="#fbbf24" />\n`;
      svg += `      <text x="${CARD_WIDTH - 24}" y="16" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#451a03">VIP</text>\n`;
    }

    svg += `      <g transform="translate(12, 14)">\n`;
    if (p.avatarUrl && p.avatarUrl.startsWith('data:image/')) {
      svg += `        <rect width="44" height="44" rx="8" fill="${cv.avatarBg}" stroke="${cv.avatarBorder}" stroke-width="1" />\n`;
      svg += `        <image href="${p.avatarUrl}" x="0" y="0" width="44" height="44" preserveAspectRatio="xMidYMid slice" />\n`;
    } else {
      svg += `        <rect width="44" height="44" rx="8" fill="${cardColor}" />\n`;
      svg += `        <text x="22" y="27" text-anchor="middle" font-size="16" font-weight="bold" fill="#ffffff">${escapeXml(p.name.slice(0, 1))}</text>\n`;
    }
    svg += `      </g>\n`;

    svg += `      <text x="66" y="28" font-size="12.5" font-weight="bold" fill="${cv.nameColor}">${escapeXml(p.name)}</text>\n`;
    svg += `      <text x="66" y="44" font-size="11" font-weight="600" fill="${cv.titleColor}">${escapeXml(p.title.slice(0, 14))}</text>\n`;
    if (p.company) {
      svg += `      <text x="66" y="58" font-size="10" fill="${cv.companyColor}">${escapeXml(p.company.slice(0, 15))}</text>\n`;
    }

    if (bioLines.length > 0) {
      svg += `      <line x1="12" y1="68" x2="${CARD_WIDTH - 12}" y2="68" stroke="${cv.dividerColor}" stroke-width="1" />\n`;
      svg += `      <text x="12" y="83" font-size="9.5" fill="${cv.bioColor}">${escapeXml(bioLines[0])}</text>\n`;
      if (bioLines[1]) {
        svg += `      <text x="12" y="96" font-size="9.5" fill="${cv.bioColor}">${escapeXml(bioLines[1])}</text>\n`;
      }
    }

    const stageText =
      p.relationshipStage === 'hot'
        ? '热力铁杆'
        : p.relationshipStage === 'warm'
        ? '温和支持'
        : p.relationshipStage === 'cold'
        ? '态度中立'
        : p.relationshipStage === 'blocked'
        ? '友商排他'
        : '接触摸底';
    const metaText = p.specialty ? `${p.specialty} · ${stageText}` : stageText;

    svg += `      <text x="12" y="${cardH - 7}" font-size="9" font-weight="500" fill="${cv.titleColor}" opacity="0.9">${escapeXml(metaText.slice(0, 22))}</text>\n`;
    svg += `    </g>\n`;
  });

  svg += `  </g>\n`;
  svg += `</svg>`;

  return svg;
}

export function downloadGraphSvg(options: ExportOptions): void {
  const svgContent = generateGraphSvgString(options);
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const suffix = options.withBackground ? 'with-bg' : 'transparent';
  a.download = `dc-crm-topology-${suffix}-${new Date().toISOString().slice(0, 10)}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

export function drawStyledGraphOnCanvas2D(
  ctx: CanvasRenderingContext2D,
  bounds: GraphBounds,
  options: ExportOptions
): void {
  const {
    people,
    relationships,
    visits = [],
    groupFrames = [],
    showGroupFrames = true,
    showStrengthHeatmap = true,
    project,
    projectName = project?.name || '华云智算 32MW 液冷智算中心二期',
    withBackground = true,
    bgConfig,
    lineConfig,
    cardConfig,
  } = options;

  const onCanvasPeople = people
    .filter((p) => p.onCanvas && !p.hidden)
    .sort((a, b) => (a.zIndex ?? 100) - (b.zIndex ?? 100));
  const activeFrames = showGroupFrames
    ? groupFrames.filter((f) => !f.hidden).sort((a, b) => (a.zIndex ?? 10) - (b.zIndex ?? 10))
    : [];
  const visibleRelationships = relationships
    .filter((r) => !r.hidden)
    .sort((a, b) => (a.zIndex ?? 60) - (b.zIndex ?? 60));

  const peopleMap = new Map<string, Person>();
  onCanvasPeople.forEach((p) => peopleMap.set(p.id, p));

  const bgPattern = resolveBackgroundPattern(bgConfig);
  const isDark = bgPattern.isDark;

  if (withBackground) {
    if (bgPattern.gradientStops) {
      const grad = ctx.createLinearGradient(0, 0, bounds.width, bounds.height);
      grad.addColorStop(0, bgPattern.gradientStops[0]);
      grad.addColorStop(0.5, bgPattern.gradientStops[1]);
      grad.addColorStop(1, bgPattern.gradientStops[2]);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = bgPattern.bgColor;
    }
    ctx.fillRect(0, 0, bounds.width, bounds.height);

    if (bgPattern.patternType === 'dots') {
      ctx.fillStyle = bgPattern.patternColor;
      const step = bgPattern.spacing;
      for (let x = 20; x < bounds.width; x += step) {
        for (let y = 20; y < bounds.height; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, bgPattern.dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (bgPattern.patternType === 'grid') {
      ctx.strokeStyle = bgPattern.patternColor;
      ctx.lineWidth = 1;
      const step = bgPattern.spacing;
      for (let x = 0; x <= bounds.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, bounds.height);
        ctx.stroke();
      }
      for (let y = 0; y <= bounds.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(bounds.width, y);
        ctx.stroke();
      }
    } else if (bgPattern.patternType === 'diagonal') {
      ctx.strokeStyle = bgPattern.patternColor;
      ctx.lineWidth = 0.8;
      const step = bgPattern.spacing;
      for (let i = -bounds.height; i < bounds.width + bounds.height; i += step) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + bounds.height, bounds.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i, bounds.height);
        ctx.lineTo(i + bounds.height, 0);
        ctx.stroke();
      }
    }

    ctx.save();
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = isDark ? '#334155' : '#e2e8f0';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(24, 20, 640, 60, 10);
    } else {
      ctx.rect(24, 20, 640, 60);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
    ctx.font = 'bold 15px "Plus Jakarta Sans", "Noto Sans SC", -apple-system, sans-serif';
    ctx.fillText(projectName, 40, 44);

    const specLine = project?.scaleMw
      ? `${project.scaleMw} · ${project.targetPue || 'PUE 1.15'} · ${project.tierLevel || '国标A级'} · ${project.contractBudget || ''}`
      : `导出时间: ${new Date().toLocaleString()}`;

    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '11px "Plus Jakarta Sans", "Noto Sans SC", -apple-system, sans-serif';
    ctx.fillText(
      `${specLine} · 节点 ${onCanvasPeople.length} 人 / 连线 ${visibleRelationships.length} 条`,
      40,
      64
    );
    ctx.restore();
  } else {
    ctx.clearRect(0, 0, bounds.width, bounds.height);
  }

  activeFrames.forEach((frame) => {
    const fx = frame.x - bounds.offsetX;
    const fy = frame.y - bounds.offsetY;
    const fColor = frame.color || '#3b82f6';
    ctx.save();
    ctx.fillStyle = `${fColor}10`;
    ctx.strokeStyle = `${fColor}66`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(fx, fy, frame.width, frame.height, 16);
    } else {
      ctx.rect(fx, fy, frame.width, frame.height);
    }
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    const labelW = Math.max(140, frame.title.length * 13 + 24);
    ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
    ctx.strokeStyle = `${fColor}88`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(fx + 14, fy - 12, labelW, 24, 6);
    } else {
      ctx.rect(fx + 14, fy - 12, labelW, 24);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = fColor;
    ctx.font = 'bold 11.5px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(frame.title, fx + 26, fy);
    ctx.restore();
  });

  visibleRelationships.forEach((rel) => {
    const source = peopleMap.get(rel.sourceId);
    const target = peopleMap.get(rel.targetId);
    if (!source || !target) return;

    const strength = calculateRelationshipStrength(rel, source, target, visits);

    const p1 = getAnchorPoint(
      { x: source.x - bounds.offsetX, y: source.y - bounds.offsetY, width: CARD_WIDTH, height: CARD_HEIGHT },
      rel.sourceAnchor || 'right'
    );
    const p2 = getAnchorPoint(
      { x: target.x - bounds.offsetX, y: target.y - bounds.offsetY, width: CARD_WIDTH, height: CARD_HEIGHT },
      rel.targetAnchor || 'left'
    );

    const effectiveType = rel.lineStyle || lineConfig?.lineType || 'bezier';
    const { path, midPoint } = calculateConnectionPath(
      p1,
      p2,
      rel.sourceAnchor || 'right',
      rel.targetAnchor || 'left',
      effectiveType,
      rel.offsetX || 0,
      rel.offsetY || 0
    );

    const strokeColor = showStrengthHeatmap
      ? strength.color
      : lineConfig?.glowEffect === 'neon-cyan'
      ? '#06B6D4'
      : lineConfig?.glowEffect === 'neon-purple'
      ? '#A855F7'
      : lineConfig?.glowEffect === 'gold'
      ? '#D97706'
      : rel.color || '#3B82F6';

    const strokeWidth = showStrengthHeatmap
      ? strength.strokeWidth
      : lineConfig?.strokeWidth || 2.4;

    ctx.save();
    if (lineConfig?.id === 'gradient-twilight' && !showStrengthHeatmap) {
      const lGrad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      lGrad.addColorStop(0, '#4f46e5');
      lGrad.addColorStop(0.5, '#9333ea');
      lGrad.addColorStop(1, '#ec4899');
      ctx.strokeStyle = lGrad;
    } else {
      ctx.strokeStyle = strokeColor;
    }

    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';

    if (lineConfig?.glowEffect === 'neon-cyan') {
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
    } else if (lineConfig?.glowEffect === 'neon-purple') {
      ctx.shadowColor = '#9333ea';
      ctx.shadowBlur = 9;
    } else if (lineConfig?.glowEffect === 'gold') {
      ctx.shadowColor = '#d97706';
      ctx.shadowBlur = 7;
    } else if (lineConfig?.glowEffect === 'shadow-3d') {
      ctx.shadowColor = 'rgba(15,23,42,0.35)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 1.5;
      ctx.shadowOffsetY = 3.5;
    }

    if (lineConfig?.strokeDasharray && !rel.lineStyle) {
      ctx.setLineDash(lineConfig.strokeDasharray.split(',').map(Number));
    }

    try {
      const p2d = new Path2D(path);
      ctx.stroke(p2d);

      if (lineConfig?.doubleLine) {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = isDark ? '#0a0f1d' : '#ffffff';
        ctx.lineWidth = strokeWidth * 0.4;
        ctx.stroke(p2d);
      }
    } catch {}
    ctx.restore();

    ctx.save();
    ctx.fillStyle = strokeColor;
    if (lineConfig?.arrowType === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y - 5);
      ctx.lineTo(p2.x + 5, p2.y);
      ctx.lineTo(p2.x, p2.y + 5);
      ctx.lineTo(p2.x - 5, p2.y);
      ctx.closePath();
      ctx.fill();
    } else if (lineConfig?.arrowType === 'both' || rel.arrow === 'both') {
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, Math.max(3.5, strokeWidth * 0.85), 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, Math.max(4, strokeWidth * 0.95), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, Math.max(3.5, strokeWidth * 0.85), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const labelX = midPoint.x + (rel.offsetX || 0);
    const labelY = midPoint.y + (rel.offsetY || 0);
    const badgeText = showStrengthHeatmap
      ? `${rel.label} (${strength.score}分)`
      : rel.label;
    const rawDesc = (rel.description ?? '').trim();
    const showDescOnLine = rel.showDescriptionOnCanvas !== false && rawDesc.length > 0;
    const displayDesc = rawDesc.length > 24 ? `${rawDesc.slice(0, 23)}…` : rawDesc;
    const textMetrics = Math.max(
      72,
      badgeText.length * 10 + 20,
      showDescOnLine ? displayDesc.length * 9.5 + 24 : 0
    );
    const badgeHeight = showDescOnLine ? 42 : 24;

    ctx.save();
    ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(labelX - textMetrics / 2, labelY - badgeHeight / 2, textMetrics, badgeHeight, 7);
    } else {
      ctx.rect(labelX - textMetrics / 2, labelY - badgeHeight / 2, textMetrics, badgeHeight);
    }
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (showDescOnLine) {
      const isRiskDesc = /(风险|预警|冲标|卡点|排他|受阻|博弈|Risk|Alert|Blocker)/i.test(rawDesc);
      const isProgressDesc = /(审批|进度|通过|会签|过会|完成|批复|认可|Approval|Approved)/i.test(rawDesc);
      const descTextColor = isRiskDesc
        ? isDark
          ? '#fbbf24'
          : '#d97706'
        : isProgressDesc
        ? isDark
          ? '#34d399'
          : '#059669'
        : isDark
        ? '#cbd5e1'
        : '#475569';
      const descPillBg = isRiskDesc
        ? isDark
          ? 'rgba(245, 158, 11, 0.16)'
          : '#fffbeb'
        : isProgressDesc
        ? isDark
          ? 'rgba(16, 185, 129, 0.16)'
          : '#ecfdf5'
        : isDark
        ? 'rgba(148, 163, 184, 0.14)'
        : '#f8fafc';

      ctx.fillStyle = isDark ? '#f8fafc' : strokeColor;
      ctx.font = 'bold 11px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
      ctx.fillText(badgeText, labelX, labelY - 9);

      ctx.fillStyle = descPillBg;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(labelX - textMetrics / 2 + 4, labelY + 1, textMetrics - 8, 16, 4);
      } else {
        ctx.rect(labelX - textMetrics / 2 + 4, labelY + 1, textMetrics - 8, 16);
      }
      ctx.fill();

      ctx.fillStyle = descTextColor;
      ctx.font = '500 9.5px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
      ctx.fillText(displayDesc, labelX, labelY + 9);
    } else {
      ctx.fillStyle = isDark ? '#f8fafc' : strokeColor;
      ctx.font = 'bold 11px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
      ctx.fillText(badgeText, labelX, labelY);
    }
    ctx.restore();
  });

  onCanvasPeople.forEach((p) => {
    const cardX = p.x - bounds.offsetX;
    const cardY = p.y - bounds.offsetY;
    const cardColor = p.cardColor || '#3b82f6';
    const cv = resolveCardVisuals(cardConfig, cardColor);
    const bioLines = wrapBioLines(p.bio, 18);
    const cardH = CARD_HEIGHT;

    ctx.save();
    if (cv.hardShadow) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(cardX + 4, cardY + 4, CARD_WIDTH, cardH, cv.rx);
      } else {
        ctx.rect(cardX + 4, cardY + 4, CARD_WIDTH, cardH);
      }
      ctx.fill();
    } else {
      ctx.shadowColor = isDark ? 'rgba(0,0,0,0.45)' : 'rgba(15,23,42,0.08)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
    }

    ctx.fillStyle = cv.fill;
    ctx.strokeStyle = cv.stroke;
    ctx.lineWidth = cv.strokeWidth;
    if (cv.strokeDasharray) {
      ctx.setLineDash(cv.strokeDasharray.split(',').map(Number));
    }

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(cardX, cardY, CARD_WIDTH, cardH, cv.rx);
    } else {
      ctx.rect(cardX, cardY, CARD_WIDTH, cardH);
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.stroke();
    ctx.setLineDash([]);

    if (cv.accentStyle === 'bar') {
      ctx.fillStyle = cardColor;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(cardX + 1, cardY + 1, CARD_WIDTH - 2, 5.5, [cv.rx, cv.rx, 0, 0]);
      } else {
        ctx.rect(cardX + 1, cardY + 1, CARD_WIDTH - 2, 5.5);
      }
      ctx.fill();
    } else if (cv.accentStyle === 'glow') {
      const g = ctx.createLinearGradient(cardX, cardY, cardX + CARD_WIDTH, cardY);
      g.addColorStop(0, 'transparent');
      g.addColorStop(0.5, cardColor);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(cardX + 10, cardY + 1, CARD_WIDTH - 20, 3.5);
    }

    if (cv.accentStyle === 'ribbon') {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(cardX + CARD_WIDTH - 38, cardY + 6, 28, 14, 3);
      } else {
        ctx.rect(cardX + CARD_WIDTH - 38, cardY + 6, 28, 14);
      }
      ctx.fill();
      ctx.fillStyle = '#451a03';
      ctx.font = 'bold 8.5px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VIP', cardX + CARD_WIDTH - 24, cardY + 13);
    }

    ctx.fillStyle = cardColor;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(cardX + 12, cardY + 14, 44, 44, 8);
    } else {
      ctx.rect(cardX + 12, cardY + 14, 44, 44);
    }
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.name.slice(0, 1), cardX + 34, cardY + 36);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = cv.nameColor;
    ctx.font = 'bold 12.5px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
    ctx.fillText(p.name, cardX + 66, cardY + 28);

    ctx.fillStyle = cv.titleColor;
    ctx.font = '600 11px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
    ctx.fillText(p.title.slice(0, 14), cardX + 66, cardY + 44);

    if (p.company) {
      ctx.fillStyle = cv.companyColor;
      ctx.font = '10px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
      ctx.fillText(p.company.slice(0, 15), cardX + 66, cardY + 58);
    }

    if (bioLines.length > 0) {
      ctx.strokeStyle = cv.dividerColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX + 12, cardY + 68);
      ctx.lineTo(cardX + CARD_WIDTH - 12, cardY + 68);
      ctx.stroke();

      ctx.fillStyle = cv.bioColor;
      ctx.font = '9.5px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
      ctx.fillText(bioLines[0], cardX + 12, cardY + 82);
      if (bioLines[1]) {
        ctx.fillText(bioLines[1], cardX + 12, cardY + 95);
      }
    }

    const stageText =
      p.relationshipStage === 'hot'
        ? '热力铁杆'
        : p.relationshipStage === 'warm'
        ? '温和支持'
        : p.relationshipStage === 'cold'
        ? '态度中立'
        : p.relationshipStage === 'blocked'
        ? '友商排他'
        : '接触摸底';
    const metaText = p.specialty ? `${p.specialty} · ${stageText}` : stageText;
    ctx.fillStyle = cv.titleColor;
    ctx.font = '500 9px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
    ctx.fillText(metaText.slice(0, 22), cardX + 12, cardY + cardH - 7);

    ctx.restore();
  });
}

export async function downloadGraphPng(options: ExportOptions): Promise<void> {
  const {
    people,
    relationships,
    groupFrames = [],
    showGroupFrames = true,
    withBackground = true,
    scale = 2,
  } = options;

  const onCanvasPeople = people.filter((p) => p.onCanvas && !p.hidden);
  if (onCanvasPeople.length === 0) {
    return;
  }

  const activeFrames = showGroupFrames ? groupFrames.filter((f) => !f.hidden) : [];
  const bounds = calculateGraphBounds(people, relationships, 80, withBackground, activeFrames);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bounds.width * scale);
  canvas.height = Math.round(bounds.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.scale(scale, scale);
  drawStyledGraphOnCanvas2D(ctx, bounds, options);
  ctx.restore();

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = withBackground ? 'with-bg' : 'transparent';
    a.download = `dc-crm-topology-${suffix}-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export async function downloadGraphPdf(options: ExportOptions): Promise<void> {
  const {
    people,
    relationships,
    visits = [],
    groupFrames = [],
    showGroupFrames = true,
    project,
    projectName = project?.name || '华云智算 32MW 液冷智算中心二期',
    bgConfig,
  } = options;

  const onCanvasPeople = people.filter((p) => p.onCanvas && !p.hidden);
  if (onCanvasPeople.length === 0) {
    return;
  }

  const reportWidth = 2376;
  const reportHeight = 1680;
  const reportCanvas = document.createElement('canvas');
  reportCanvas.width = reportWidth;
  reportCanvas.height = reportHeight;
  const ctx = reportCanvas.getContext('2d');
  if (!ctx) return;

  const isDarkTheme = bgConfig?.isDark ?? false;

  ctx.fillStyle = isDarkTheme ? '#090d16' : '#f8fafc';
  ctx.fillRect(0, 0, reportWidth, reportHeight);

  const grad = ctx.createLinearGradient(0, 0, reportWidth, 0);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.6, '#1e3a8a');
  grad.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, reportWidth, 108);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(60, 24, 60, 60, 12);
  } else {
    ctx.rect(60, 24, 60, 60);
  }
  ctx.fill();

  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DC', 90, 54);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px "Plus Jakarta Sans", "Noto Sans SC", "PingFang SC", sans-serif';
  ctx.fillText('数智算力中心关键决策链与攻关态势报告', 140, 62);

  ctx.font = '17px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
  ctx.fillStyle = '#93c5fd';
  ctx.textAlign = 'right';
  ctx.fillText(
    `工程编号: ${project?.code || 'AIDC-2026'}  |  生成日期: ${new Date().toLocaleString()}`,
    reportWidth - 60,
    62
  );

  ctx.textAlign = 'left';
  ctx.fillStyle = isDarkTheme ? '#f8fafc' : '#0f172a';
  ctx.font = 'bold 34px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
  ctx.fillText(projectName, 60, 178);

  const engDesc = project
    ? `业主单位: ${project.companyName}   ·   算力规模: ${project.scaleMw || '32 MW'}   ·   设计指标: ${project.targetPue || 'PUE ≤ 1.15'}   ·   建设等级: ${project.tierLevel || '国标 A级'}   ·   当前阶段: ${project.biddingStage || '技术封标前夕'}`
    : '算力中心决策链全景拓扑分析';
  ctx.font = '18px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
  ctx.fillStyle = isDarkTheme ? '#94a3b8' : '#475569';
  ctx.fillText(engDesc, 60, 212);

  const peopleMap = new Map<string, Person>();
  onCanvasPeople.forEach((p) => peopleMap.set(p.id, p));
  const highStrengthCount = relationships.filter((r) => {
    const s = calculateRelationshipStrength(r, peopleMap.get(r.sourceId), peopleMap.get(r.targetId), visits);
    return s.level >= 4;
  }).length;

  const stats = [
    { label: '标段合同预算', value: project?.contractBudget || '¥ 4.85 亿', color: '#2563eb' },
    { label: '上画关键干系人', value: `${onCanvasPeople.length} 位`, color: '#0284c7' },
    { label: '核心关系纽带', value: `${relationships.length} 条 (强关联 ${highStrengthCount} 条)`, color: '#4f46e5' },
    { label: '累计拜访跟进', value: `${visits.length} 场次`, color: '#059669' },
  ];

  const statCardWidth = 535;
  const statCardHeight = 94;
  const statY = 236;

  stats.forEach((st, idx) => {
    const sx = 60 + idx * (statCardWidth + 24);
    ctx.fillStyle = isDarkTheme ? '#111827' : '#ffffff';
    ctx.strokeStyle = isDarkTheme ? '#1e293b' : '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(sx, statY, statCardWidth, statCardHeight, 14);
    } else {
      ctx.rect(sx, statY, statCardWidth, statCardHeight);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isDarkTheme ? '#94a3b8' : '#64748b';
    ctx.font = '500 17px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
    ctx.fillText(st.label, sx + 26, statY + 36);

    ctx.fillStyle = st.color;
    ctx.font = 'bold 30px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
    ctx.fillText(st.value, sx + 26, statY + 76);
  });

  const activeFrames = showGroupFrames ? groupFrames.filter((f) => !f.hidden) : [];
  const bounds = calculateGraphBounds(people, relationships, 70, false, activeFrames);

  const offscreen = document.createElement('canvas');
  offscreen.width = bounds.width * 2;
  offscreen.height = bounds.height * 2;
  const offCtx = offscreen.getContext('2d');
  if (offCtx) {
    offCtx.save();
    offCtx.scale(2, 2);
    drawStyledGraphOnCanvas2D(offCtx, bounds, {
      ...options,
      withBackground: true,
    });
    offCtx.restore();
  }

  const graphBoxX = 60;
  const graphBoxY = 355;
  const graphBoxW = reportWidth - 120;
  const graphBoxH = 1235;

  const bgPattern = resolveBackgroundPattern(bgConfig);
  ctx.fillStyle = bgPattern.bgColor;
  ctx.strokeStyle = isDarkTheme ? '#334155' : '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(graphBoxX, graphBoxY, graphBoxW, graphBoxH, 18);
  } else {
    ctx.rect(graphBoxX, graphBoxY, graphBoxW, graphBoxH);
  }
  ctx.fill();
  ctx.stroke();

  const pad = 20;
  const availW = graphBoxW - pad * 2;
  const availH = graphBoxH - pad * 2;
  const fitRatio = Math.min(availW / bounds.width, availH / bounds.height);
  const drawW = bounds.width * fitRatio;
  const drawH = bounds.height * fitRatio;
  const drawX = graphBoxX + pad + (availW - drawW) / 2;
  const drawY = graphBoxY + pad + (availH - drawH) / 2;

  ctx.drawImage(offscreen, drawX, drawY, drawW, drawH);

  ctx.fillStyle = '#64748b';
  ctx.font = '16px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    '数智算力中心项目客户关系拓扑与作战平台 · 内部机密投委会汇报文件',
    60,
    reportHeight - 34
  );
  ctx.textAlign = 'right';
  ctx.fillText(
    `当前视觉主题: ${bgConfig?.name || '极简点阵灰'} / ${options.lineConfig?.name || '平滑曲线'} / ${options.cardConfig?.name || '经典白卡'}`,
    reportWidth - 60,
    reportHeight - 34
  );

  const imgData = reportCanvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });
  pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
  pdf.save(`dc-crm-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
