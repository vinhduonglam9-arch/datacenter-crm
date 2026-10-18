export interface ContextMenuState {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
  targetType: 'canvas' | 'person' | 'frame' | 'relationship' | 'annotation';
  targetId?: string;
}

export const PEN_TACTICAL_COLORS = [
  { name: '战术红', value: '#EF4444' },
  { name: '橙焰色', value: '#F97316' },
  { name: '琥珀黄', value: '#F59E0B' },
  { name: '翡翠绿', value: '#10B981' },
  { name: '液冷青', value: '#06B6D4' },
  { name: '算力蓝', value: '#2563EB' },
  { name: '霓虹紫', value: '#8B5CF6' },
  { name: '极客黑', value: '#0F172A' },
];

export const EXTENDED_COLOR_PALETTE = [
  '#EF4444', '#DC2626', '#F97316', '#EA580C', '#F59E0B', '#EAB308',
  '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#2563EB', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#64748B', '#334155', '#0F172A', '#FFFFFF',
];

export const STICKY_BG_PALETTE = [
  { name: '珊瑚浅粉', value: '#FEF2F2' },
  { name: '暖阳米黄', value: '#FFFBEB' },
  { name: '柠檬亮黄', value: '#FEF9C3' },
  { name: '薄荷浅绿', value: '#ECFDF5' },
  { name: '极光浅青', value: '#ECFEFF' },
  { name: '晴空浅蓝', value: '#EFF6FF' },
  { name: '丁香浅紫', value: '#FAF5FF' },
  { name: '云母纯白', value: '#FFFFFF' },
];

export const PEN_STROKE_WIDTHS = [2, 4, 6, 12];
