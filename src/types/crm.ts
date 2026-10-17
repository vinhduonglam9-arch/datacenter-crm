export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left';

export type RelationshipStage = 'hot' | 'warm' | 'exploring' | 'cold' | 'blocked';

export type VisitInteractionType =
  | 'meeting'
  | 'call'
  | 'wechat'
  | 'demo'
  | 'dinner'
  | 'site_survey';

export type CanvasToolMode = 'select' | 'pan' | 'marquee' | 'lasso' | 'connect' | 'frame';

export type LayerAction = 'front' | 'forward' | 'backward' | 'back';

export interface VisitRecord {
  id: string;
  personId: string;
  date: string;         // YYYY-MM-DD
  type: VisitInteractionType;
  summary: string;
  nextAction?: string;
  createdAt: number;
}

export interface GroupFrame {
  id: string;
  title: string;
  subtitle?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  zIndex?: number;      // 图层层级顺序 (默认 10~40)
  locked?: boolean;     // 是否锁定位置与尺寸
  hidden?: boolean;     // 是否隐藏图层
}

export interface ProjectMap {
  id: string;
  code?: string;          // 项目工程编号 (e.g. AIDC-SG-2026-01)
  name: string;           // 算力/数据中心项目全称
  companyName: string;    // 业主/投资主体名称
  description?: string;   // 项目建设内容与技术概述
  scaleMw?: string;       // 算力规模与机柜数 (e.g. 32 MW · 4,200 机柜)
  targetPue?: string;     // 设计 PUE 指标 (e.g. PUE ≤ 1.15)
  tierLevel?: string;     // 等级标准 (e.g. 国标 A级 / Tier III+)
  coolingType?: string;   // 制冷架构 (e.g. 冷板式液冷 + 氟泵自然冷)
  contractBudget?: string;// 标段合同预算 (e.g. ¥ 4.85 亿)
  biddingStage?: string;  // 当前招采阶段 (e.g. 技术封标前夕)
  winProbability?: number;// 赢单把握度 (0-100)
  ownerLead?: string;     // 我方项目主责铁三角 AR
  createdAt: number;
  updatedAt: number;
}

export interface Person {
  id: string;
  name: string;
  title: string;          // 职位头衔 (e.g. 智算基建部总经理)
  company?: string;       // 所属单位/公司
  bio: string;            // 核心职责与技术关注点
  tags: string[];         // 阵营与角色标签 (e.g. ["拍板决策人", "业主方", "高管"])
  avatarUrl?: string;     // 头像 Base64 或 URL
  cardColor: string;      // 卡片主题色
  x: number;              // 画布 X 坐标
  y: number;              // 画布 Y 坐标
  onCanvas: boolean;      // 是否已放置在画布上
  zIndex?: number;        // 图层顺序 (默认 100+)
  locked?: boolean;       // 是否锁定位置
  hidden?: boolean;       // 是否隐藏图层
  relationshipStage?: RelationshipStage; // 关系推进温度阶段
  specialty?: string;     // 数据中心专业分管模块
  vendorPreference?: string; // 品牌倾向与历史偏好
  phone?: string;         // 联系电话
  email?: string;         // 电子邮箱
  createdAt: number;
  updatedAt: number;
}

export interface RelationTemplate {
  key: string;
  label: string;
  desc: string;
  color: string;
}

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  sourceAnchor: AnchorPosition;
  targetAnchor: AnchorPosition;
  templateKey?: string;
  label: string;
  color: string;
  offsetX: number;      // 标签拖拽偏移 X
  offsetY: number;      // 标签拖拽偏移 Y
  lineStyle?: 'bezier' | 'straight' | 'step' | 'arc';
  arrow?: 'forward' | 'both' | 'none';
  description?: string;              // 连接描述备注（如：审批进度、商务风险等）
  showDescriptionOnCanvas?: boolean; // 是否在画布连线上显示连接描述（默认 true）
  notes?: string;
  zIndex?: number;      // 图层顺序 (默认 50~90)
  locked?: boolean;
  hidden?: boolean;
  createdAt: number;
}

export interface CanvasState {
  panX: number;
  panY: number;
  zoom: number;
}

export const RELATION_TEMPLATES: RelationTemplate[] = [
  { key: 'decision_maker', label: '拍板决策', desc: '最终商务与技术定标拍板', color: '#8B5CF6' },
  { key: 'influencer', label: '技术影响', desc: '核心技术规范与评分制定', color: '#EC4899' },
  { key: 'customer', label: '核心业主', desc: '甲方关键业务接口负责人', color: '#3B82F6' },
  { key: 'prospect', label: '潜在突破', desc: '尚在接触摸底的潜在干系人', color: '#10B981' },
  { key: 'liaison', label: '内线支持', desc: '传递标书动向与内部情报', color: '#EAB308' },
  { key: 'partner', label: '生态盟友', desc: 'EPC总包或设计院协同伙伴', color: '#06B6D4' },
  { key: 'referrer', label: '高层引荐', desc: '帮助引见业主核心决策层', color: '#F97316' },
  { key: 'competitor', label: '友商控标', desc: '倾向竞争对手或设置排他参数', color: '#EF4444' },
  { key: 'superior', label: '直属汇报', desc: '组织架构上下级管理汇报', color: '#14B8A6' },
  { key: 'subordinate', label: '业务协同', desc: '跨部门机电/DCIM技术协同', color: '#64748B' },
];

export const DC_SPECIALTY_MODULES = [
  '液冷与暖通系统 (CDU/冷机)',
  '供配电系统 (HVDC/UPS)',
  '算力投资与总包决策',
  '商务招采与供应链',
  'EPC 总包与机电施工',
  '规划设计与图审顾问',
  '智能化与 DCIM 运维',
];

export interface StageMeta {
  key: RelationshipStage;
  label: string;
  emoji: string;
  color: string;
}

export const STAGE_LIST: StageMeta[] = [
  { key: 'hot', label: '热力铁杆', emoji: '🔥', color: '#EF4444' },
  { key: 'warm', label: '温和支持', emoji: '🤝', color: '#10B981' },
  { key: 'exploring', label: '接触摸底', emoji: '🧭', color: '#3B82F6' },
  { key: 'cold', label: '态度中立', emoji: '🧊', color: '#F59E0B' },
  { key: 'blocked', label: '友商排他', emoji: '⛔', color: '#64748B' },
];

export const CARD_COLORS = [
  { name: '科技蓝', value: '#3B82F6' },
  { name: '液冷青', value: '#06B6D4' },
  { name: '决策紫', value: '#8B5CF6' },
  { name: '绿电翠', value: '#10B981' },
  { name: '攻坚粉', value: '#EC4899' },
  { name: '引荐橙', value: '#F97316' },
  { name: '商务金', value: '#D97706' },
  { name: '预警红', value: '#EF4444' },
  { name: '协同青', value: '#14B8A6' },
  { name: '极客灰', value: '#475569' },
];
