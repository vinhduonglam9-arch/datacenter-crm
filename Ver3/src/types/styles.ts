export type BackgroundStyleId =
  | 'grid-dots-slate'
  | 'grid-square-subtle'
  | 'cyber-dark-grid'
  | 'obsidian-night'
  | 'warm-parchment'
  | 'blueprint-cad'
  | 'nordic-frost'
  | 'emerald-matrix'
  | 'amethyst-glow'
  | 'dawn-gradient'
  | 'pure-studio'
  | 'warm-latte'
  | 'twilight-aurora'
  | 'diagonal-mesh'
  | 'honeycomb-hex'
  | 'circuit-matrix'
  | 'misty-marine'
  | 'concrete-slate'
  | 'sunset-amber'
  | 'deep-cosmos'
  | 'custom-bg';

export type LineStyleId =
  | 'bezier-smooth'
  | 'straight-direct'
  | 'step-orthogonal'
  | 'arc-fluid'
  | 'dash-rhythm'
  | 'dots-dense'
  | 'dash-dot-tempo'
  | 'cyber-pulse-flow'
  | 'neon-cyan-glow'
  | 'neon-purple-glow'
  | 'double-track'
  | 'hairline-minimal'
  | 'bold-executive'
  | 'diamond-marker'
  | 'gradient-twilight'
  | 'gold-thread'
  | 'warning-hazard'
  | 'sketch-handdrawn'
  | 'floating-3d-shadow'
  | 'bidirectional-arrows'
  | 'custom-line';

export type CardStyleId =
  | 'classic-white'
  | 'frosted-glass'
  | 'dark-obsidian'
  | 'cyber-matrix'
  | 'tinted-pastel'
  | 'borderless-minimal'
  | 'blueprint-cad'
  | 'vintage-parchment'
  | 'neumorphic-soft'
  | 'polaroid-snap'
  | 'pop-art-neo'
  | 'aurora-gradient'
  | 'split-capsule'
  | 'titanium-metal'
  | 'nordic-forest'
  | 'sunset-coral'
  | 'matrix-terminal'
  | 'royal-velvet'
  | 'outline-wireframe'
  | 'watercolor-blush'
  | 'custom-card';

export interface BackgroundStyleConfig {
  id: BackgroundStyleId;
  name: string;
  category: 'light' | 'dark' | 'gradient' | 'texture' | 'custom';
  desc: string;
  isDark: boolean;
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize?: string;
  previewBg: string;
  accentColor: string;
  /** Explicit pattern metadata for custom designer & 100% export fidelity */
  patternType?: 'dots' | 'grid' | 'diagonal' | 'gradient' | 'solid';
  patternColor?: string;
  spacing?: number;
  dotRadius?: number;
  gradientStops?: [string, string, string];
}

export interface LineStyleConfig {
  id: LineStyleId;
  name: string;
  category: 'standard' | 'geometry' | 'dash' | 'special' | 'custom';
  desc: string;
  lineType: 'bezier' | 'straight' | 'step' | 'arc';
  strokeDasharray?: string;
  strokeWidth: number;
  glowEffect?: 'neon-cyan' | 'neon-purple' | 'gold' | 'shadow-3d' | 'none';
  animated?: boolean;
  arrowType?: 'standard' | 'diamond' | 'both' | 'dot' | 'none';
  doubleLine?: boolean;
}

export interface CardStyleConfig {
  id: CardStyleId;
  name: string;
  category: 'classic' | 'modern' | 'creative' | 'dark' | 'custom';
  desc: string;
  isDarkCard: boolean;
  borderClass: string;
  bgClass: string;
  shadowClass: string;
  roundedClass: string;
  accentStyle: 'bar' | 'glow' | 'tag' | 'full' | 'ribbon' | 'minimal' | 'frame';
  /** Optional custom inline design properties */
  customBgColor?: string;
  customBorderColor?: string;
  customBorderWidth?: number;
  customBorderStyle?: 'solid' | 'dashed';
  customBorderRadius?: number;
}

export interface SavedCustomStyleScheme {
  id: string;
  name: string;
  desc: string;
  createdAt: number;
  bgConfig: BackgroundStyleConfig;
  lineConfig: LineStyleConfig;
  cardConfig: CardStyleConfig;
}

