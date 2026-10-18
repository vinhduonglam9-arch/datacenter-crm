import type { Relationship, Person, VisitRecord } from '../types/crm.ts';

export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const STAGE_LABELS: Record<string, string> = {
  hot: '热力铁杆',
  warm: '温和支持',
  exploring: '接触摸底',
  cold: '态度中立',
  blocked: '友商排他',
};

const ARROW_LABELS: Record<string, string> = {
  forward: '单向 ->',
  both: '双向 <->',
  none: '无箭头 --',
};

const LINE_STYLE_LABELS: Record<string, string> = {
  bezier: '平滑曲线',
  straight: '极简直连',
  step: '正交折线',
  arc: '大圆弧线',
};

export function exportRelationshipsToCsvString(
  relationships: Relationship[],
  people: Person[]
): string {
  const peopleMap = new Map<string, Person>();
  for (const p of people) {
    peopleMap.set(p.id, p);
  }

  const headers = [
    '关系ID',
    '起点人物姓名',
    '起点职位',
    '起点单位',
    '起点电话',
    '起点关系阶段',
    '关系类型标签',
    '箭头方向',
    '连线几何样式',
    '终点人物姓名',
    '终点职位',
    '终点单位',
    '终点电话',
    '终点关系阶段',
    '连接描述备注',
    '关系背景说明',
    '创建时间',
  ];

  const rows: string[] = [headers.map(escapeCsvField).join(',')];

  for (const rel of relationships) {
    const source = peopleMap.get(rel.sourceId);
    const target = peopleMap.get(rel.targetId);

    const createdTimeStr = rel.createdAt
      ? new Date(rel.createdAt).toLocaleString('zh-CN', { hour12: false })
      : '';

    const rowData = [
      rel.id,
      source ? source.name : rel.sourceId,
      source?.title || '',
      source?.company || '',
      source?.phone || '',
      source?.relationshipStage ? STAGE_LABELS[source.relationshipStage] || source.relationshipStage : '',
      rel.label || '',
      rel.arrow ? ARROW_LABELS[rel.arrow] || rel.arrow : ARROW_LABELS.forward,
      rel.lineStyle ? LINE_STYLE_LABELS[rel.lineStyle] || rel.lineStyle : LINE_STYLE_LABELS.bezier,
      target ? target.name : rel.targetId,
      target?.title || '',
      target?.company || '',
      target?.phone || '',
      target?.relationshipStage ? STAGE_LABELS[target.relationshipStage] || target.relationshipStage : '',
      rel.description || '',
      rel.notes || '',
      createdTimeStr,
    ];

    rows.push(rowData.map(escapeCsvField).join(','));
  }

  return '\uFEFF' + rows.join('\r\n');
}

export function downloadRelationshipsCsv(
  relationships: Relationship[],
  people: Person[],
  visitsOrPrefix: VisitRecord[] | string = 'dc-crm-relationships'
): void {
  const filenamePrefix = typeof visitsOrPrefix === 'string' ? visitsOrPrefix : 'dc-crm-relationships';
  const csvContent = exportRelationshipsToCsvString(relationships, people);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}-${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
