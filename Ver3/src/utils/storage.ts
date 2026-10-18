import {
  Person,
  Relationship,
  GroupFrame,
  VisitRecord,
  ProjectMap,
  CanvasAnnotation,
  ProjectSnapshot,
  CameraBookmark,
} from '../types/crm.ts';
import type {
  BackgroundStyleConfig,
  LineStyleConfig,
  CardStyleConfig,
  SavedCustomStyleScheme,
} from '../types/styles.ts';
import {
  INITIAL_PEOPLE,
  INITIAL_RELATIONSHIPS,
  INITIAL_GROUP_FRAMES,
  INITIAL_VISIT_RECORDS,
  INITIAL_PROJECTS,
  INITIAL_ANNOTATIONS,
  INITIAL_CAMERA_BOOKMARKS,
  PROJECT_INITIAL_DATA,
} from './sample-data.ts';

const STORAGE_KEY_PROJECTS = 'dc_crm_projects_v7';
const STORAGE_KEY_ACTIVE_PROJECT = 'dc_crm_active_project_v7';
const STORAGE_KEY_SIDEBAR = 'dc_crm_sidebar_collapsed_v5';

// SQLite 远程后端异步持久化
let syncTimer: any = null;
const pendingSyncQueue: Record<string, any> = {};

export function syncToSqlite(key: string, value: any): void {
  pendingSyncQueue[key] = value;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    const items = { ...pendingSyncQueue };
    for (const k of Object.keys(pendingSyncQueue)) {
      delete pendingSyncQueue[k];
    }
    try {
      await fetch('/api/storage/batch-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
    } catch (e) {
      // 离线模式下保留 localStorage 即可，忽略网络错误
    }
  }, 400);
}

/**
 * 启动时从 SQLite 数据库拉取数据并补齐/同步到本地 (仅同步 v7 及当前版本键)
 */
export async function syncFromSqlite(): Promise<boolean> {
  try {
    const res = await fetch('/api/storage/all');
    if (!res.ok) return false;
    const body = await res.json();
    if (body.success && body.data) {
      const hasV7Data = Object.keys(body.data).some((k) => k.includes('_v7'));
      if (hasV7Data) {
        for (const [k, v] of Object.entries(body.data)) {
          if (k.includes('_v7') || k.includes('_v6') || k.includes('_v5')) {
            try {
              localStorage.setItem(k, JSON.stringify(v));
            } catch {}
          }
        }
        return true;
      }
    }
  } catch (err) {
    // 离线或开发环境直接走本地
  }
  return false;
}

export function loadProjects(): ProjectMap[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse projects from localStorage:', err);
  }
  return INITIAL_PROJECTS;
}

export function saveProjects(projects: ProjectMap[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
    syncToSqlite(STORAGE_KEY_PROJECTS, projects);
  } catch (err) {
    console.warn('Failed to save projects:', err);
  }
}

export function getActiveProjectId(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_PROJECT);
    if (raw) {
      // Remove extra quotes if JSON.stringify was used
      return raw.replace(/^"|"$/g, '');
    }
  } catch {}
  return 'proj-huayun';
}

export function setActiveProjectId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_PROJECT, id);
  } catch {}
}

export function loadSavedPeople(projectId: string = 'proj-huayun'): Person[] {
  try {
    const raw = localStorage.getItem(`dc_crm_people_v7_${projectId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse saved people:', err);
  }
  return PROJECT_INITIAL_DATA[projectId]?.people || INITIAL_PEOPLE;
}

export function savePeople(people: Person[], projectId: string = 'proj-huayun'): void {
  try {
    const key = `dc_crm_people_v7_${projectId}`;
    localStorage.setItem(key, JSON.stringify(people));
    syncToSqlite(key, people);
  } catch (err) {
    console.warn('Failed to save people to localStorage:', err);
  }
}

export function loadSavedRelationships(projectId: string = 'proj-huayun'): Relationship[] {
  const defaultRels = PROJECT_INITIAL_DATA[projectId]?.relationships || INITIAL_RELATIONSHIPS;
  try {
    const raw = localStorage.getItem(`dc_crm_relationships_v7_${projectId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const defaultMap = new Map<string, Relationship>();
        defaultRels.forEach((d) => defaultMap.set(d.id, d));
        return parsed.map((r: Relationship) => {
          const def = defaultMap.get(r.id);
          if (r.description === undefined && def?.description) {
            return {
              ...r,
              description: def.description,
              showDescriptionOnCanvas: def.showDescriptionOnCanvas ?? true,
            };
          }
          return r;
        });
      }
    }
  } catch (err) {
    console.warn('Failed to parse saved relationships:', err);
  }
  return defaultRels;
}

export function saveRelationships(
  relationships: Relationship[],
  projectId: string = 'proj-huayun'
): void {
  try {
    const key = `dc_crm_relationships_v7_${projectId}`;
    localStorage.setItem(key, JSON.stringify(relationships));
    syncToSqlite(key, relationships);
  } catch (err) {
    console.warn('Failed to save relationships to localStorage:', err);
  }
}

export function loadSavedGroupFrames(projectId: string = 'proj-huayun'): GroupFrame[] {
  try {
    const raw = localStorage.getItem(`dc_crm_frames_v7_${projectId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse saved group frames:', err);
  }
  return PROJECT_INITIAL_DATA[projectId]?.frames || INITIAL_GROUP_FRAMES;
}

export function saveGroupFrames(frames: GroupFrame[], projectId: string = 'proj-huayun'): void {
  try {
    const key = `dc_crm_frames_v7_${projectId}`;
    localStorage.setItem(key, JSON.stringify(frames));
    syncToSqlite(key, frames);
  } catch (err) {
    console.warn('Failed to save group frames:', err);
  }
}

export function loadSavedAnnotations(projectId: string = 'proj-huayun'): CanvasAnnotation[] {
  try {
    const raw = localStorage.getItem(`dc_crm_annotations_v7_${projectId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse saved annotations:', err);
  }
  return PROJECT_INITIAL_DATA[projectId]?.annotations ?? INITIAL_ANNOTATIONS;
}

export function saveAnnotations(
  annotations: CanvasAnnotation[],
  projectId: string = 'proj-huayun'
): void {
  try {
    const key = `dc_crm_annotations_v7_${projectId}`;
    localStorage.setItem(key, JSON.stringify(annotations));
    syncToSqlite(key, annotations);
  } catch (err) {
    console.warn('Failed to save annotations:', err);
  }
}

export function loadSavedVisitRecords(projectId: string = 'proj-huayun'): VisitRecord[] {
  try {
    const raw = localStorage.getItem(`dc_crm_visits_v7_${projectId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse saved visits:', err);
  }
  return PROJECT_INITIAL_DATA[projectId]?.visits || INITIAL_VISIT_RECORDS;
}

export function saveVisitRecords(records: VisitRecord[], projectId: string = 'proj-huayun'): void {
  try {
    const key = `dc_crm_visits_v7_${projectId}`;
    localStorage.setItem(key, JSON.stringify(records));
    syncToSqlite(key, records);
  } catch (err) {
    console.warn('Failed to save visits:', err);
  }
}

export function loadSidebarCollapsed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SIDEBAR);
    if (raw !== null) return JSON.parse(raw) === true;
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_SIDEBAR, JSON.stringify(collapsed));
  } catch (err) {
    console.warn('Failed to save sidebar state:', err);
  }
}

export interface StylePreferences {
  bgStyleId: string;
  lineStyleId: string;
  cardStyleId: string;
  customBgConfig?: BackgroundStyleConfig;
  customLineConfig?: LineStyleConfig;
  customCardConfig?: CardStyleConfig;
  savedCustomSchemes?: SavedCustomStyleScheme[];
}

const STORAGE_KEY_BG_STYLE = 'dc_crm_bg_style_v5';
const STORAGE_KEY_LINE_STYLE = 'dc_crm_line_style_v5';
const STORAGE_KEY_CARD_STYLE = 'dc_crm_card_style_v5';
const STORAGE_KEY_CUSTOM_STYLE_CONFIGS = 'dc_crm_custom_style_configs_v6';

export function loadSavedStylePreferences(): StylePreferences {
  try {
    const bg = localStorage.getItem(STORAGE_KEY_BG_STYLE);
    const line = localStorage.getItem(STORAGE_KEY_LINE_STYLE);
    const card = localStorage.getItem(STORAGE_KEY_CARD_STYLE);
    const rawCustom = localStorage.getItem(STORAGE_KEY_CUSTOM_STYLE_CONFIGS);
    const parsedCustom = rawCustom ? JSON.parse(rawCustom) : {};
    return {
      bgStyleId: bg || 'grid-dots-slate',
      lineStyleId: line || 'bezier-smooth',
      cardStyleId: card || 'classic-white',
      customBgConfig: parsedCustom?.customBgConfig,
      customLineConfig: parsedCustom?.customLineConfig,
      customCardConfig: parsedCustom?.customCardConfig,
      savedCustomSchemes: Array.isArray(parsedCustom?.savedCustomSchemes)
        ? parsedCustom.savedCustomSchemes
        : [],
    };
  } catch {
    return {
      bgStyleId: 'grid-dots-slate',
      lineStyleId: 'bezier-smooth',
      cardStyleId: 'classic-white',
      savedCustomSchemes: [],
    };
  }
}

export function saveStylePreferences(prefs: StylePreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY_BG_STYLE, prefs.bgStyleId);
    localStorage.setItem(STORAGE_KEY_LINE_STYLE, prefs.lineStyleId);
    localStorage.setItem(STORAGE_KEY_CARD_STYLE, prefs.cardStyleId);
    const customPayload = {
      customBgConfig: prefs.customBgConfig,
      customLineConfig: prefs.customLineConfig,
      customCardConfig: prefs.customCardConfig,
      savedCustomSchemes: prefs.savedCustomSchemes || [],
    };
    localStorage.setItem(STORAGE_KEY_CUSTOM_STYLE_CONFIGS, JSON.stringify(customPayload));
    syncToSqlite(STORAGE_KEY_CUSTOM_STYLE_CONFIGS, customPayload);
  } catch (err) {
    console.warn('Failed to save style preferences:', err);
  }
}

const STORAGE_KEY_TOOLBAR_POS = 'dc_crm_toolbar_pos_v1';

export interface ToolbarPosition {
  x: number;
  y: number;
  orientation?: 'vertical' | 'horizontal';
}

export function loadToolbarPosition(): ToolbarPosition | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TOOLBAR_POS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
        return {
          x: parsed.x,
          y: parsed.y,
          orientation: parsed.orientation === 'horizontal' ? 'horizontal' : 'vertical',
        };
      }
    }
  } catch {}
  return null;
}

export function saveToolbarPosition(pos: ToolbarPosition): void {
  try {
    localStorage.setItem(STORAGE_KEY_TOOLBAR_POS, JSON.stringify(pos));
  } catch {}
}

/**
 * 构建默认基线历史快照（方便用户开箱即用体验「时间轴与版本快照增量对比」）
 */
export function buildDefaultBaselineSnapshots(projectId: string): ProjectSnapshot[] {
  const basePeople = PROJECT_INITIAL_DATA[projectId]?.people || loadSavedPeople(projectId);
  const baseRels = PROJECT_INITIAL_DATA[projectId]?.relationships || loadSavedRelationships(projectId);
  const baseFrames = PROJECT_INITIAL_DATA[projectId]?.frames || loadSavedGroupFrames(projectId);
  if (basePeople.length < 2) return [];

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  // 快照 2 (14天前)：二阶段「设计院落图与POC样机测试前夕」
  // 当时友商B (p-he) 与机电分包商 (p-sub-epc) 尚未入局，咨询公司罗婉清尚在接触摸底 (exploring)，客户周浩然尚在温和支持 (warm)
  const midExcludedIds = new Set(['p-he', 'p-sub-epc']);
  const midPeople: Person[] = basePeople
    .filter((p) => !midExcludedIds.has(p.id))
    .map((p) => {
      if (p.id === 'p-luo') return { ...p, relationshipStage: 'exploring' };
      if (p.id === 'p-zhou') return { ...p, relationshipStage: 'warm' };
      if (p.id === 'p-lin') return { ...p, relationshipStage: 'cold' };
      return { ...p };
    });
  const midPersonIdSet = new Set(midPeople.map((p) => p.id));
  const midRels: Relationship[] = baseRels.filter(
    (r) => midPersonIdSet.has(r.sourceId) && midPersonIdSet.has(r.targetId)
  );

  // 快照 1 (30天前)：一阶段「立项可研初期摸底基线」
  // 初期仅摸排出客户核心层与设计院，我方分包商 (p-sub-cdu, p-sub-epc)、咨询公司 (p-luo) 及友商B (p-he) 均未建档，且客户高层尚处于接触摸底或温和阶段
  const earlyExcludedIds = new Set(['p-sub-cdu', 'p-sub-epc', 'p-luo', 'p-he']);
  const earlyPeople: Person[] = basePeople
    .filter((p) => !earlyExcludedIds.has(p.id))
    .slice(0, Math.max(2, basePeople.length - 2))
    .map((p, idx) => {
      let earlyStage = p.relationshipStage;
      if (p.tags?.includes('我方团队')) {
        earlyStage = 'hot';
      } else if (p.relationshipStage === 'hot') {
        earlyStage = 'warm';
      } else if (p.relationshipStage === 'warm') {
        earlyStage = 'exploring';
      } else if (p.relationshipStage === 'exploring' && idx % 2 === 0) {
        earlyStage = 'cold';
      }
      return {
        ...p,
        relationshipStage: earlyStage,
      };
    });

  const earlyPersonIdSet = new Set(earlyPeople.map((p) => p.id));
  const earlyRels: Relationship[] = baseRels
    .filter((r) => earlyPersonIdSet.has(r.sourceId) && earlyPersonIdSet.has(r.targetId))
    .slice(0, Math.max(1, baseRels.length - 4));

  return [
    {
      id: `snap-stage2-${projectId}`,
      projectId,
      title: '二阶段：设计院落图与POC测试前夕',
      createdAt: `${fourteenDaysAgo} 16:30`,
      note: '邮电设计院完成可研落图，华擎液冷分包进场准备 40kW 样机 POC；尚未锁定中建数科机电分包，友商B尚未介入参数阻击',
      people: midPeople,
      relationships: midRels,
      frames: baseFrames.filter((f) => f.id !== 'frame-subcontractors'),
      annotations: [],
    },
    {
      id: `snap-init-${projectId}`,
      projectId,
      title: '一阶段：可研立项初期摸底基线',
      createdAt: `${thirtyDaysAgo} 10:00`,
      note: '项目立项初期初次摸排的客户决策链与设计院基线存档（尚未引入我方分包商联合体与赛迪全过程咨询）',
      people: earlyPeople,
      relationships: earlyRels,
      frames: baseFrames.filter(
        (f) => f.id !== 'frame-subcontractors' && f.id !== 'frame-competitors-alert'
      ),
      annotations: [],
    },
  ];
}

export function loadProjectSnapshots(projectId: string = 'proj-huayun'): ProjectSnapshot[] {
  try {
    const raw = localStorage.getItem(`dc_crm_snapshots_v7_${projectId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load project snapshots:', err);
  }
  return buildDefaultBaselineSnapshots(projectId);
}

export function saveProjectSnapshots(
  snapshots: ProjectSnapshot[],
  projectId: string = 'proj-huayun'
): void {
  try {
    const key = `dc_crm_snapshots_v7_${projectId}`;
    localStorage.setItem(key, JSON.stringify(snapshots));
    syncToSqlite(key, snapshots);
  } catch (err) {
    console.warn('Failed to save project snapshots:', err);
  }
}

export function loadCameraBookmarks(projectId: string = 'proj-huayun'): CameraBookmark[] {
  try {
    const raw = localStorage.getItem(`dc_crm_camera_bookmarks_v7_${projectId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return PROJECT_INITIAL_DATA[projectId]?.cameraBookmarks || INITIAL_CAMERA_BOOKMARKS;
}

export function saveCameraBookmarks(
  bookmarks: CameraBookmark[],
  projectId: string = 'proj-huayun'
): void {
  try {
    const key = `dc_crm_camera_bookmarks_v7_${projectId}`;
    localStorage.setItem(key, JSON.stringify(bookmarks));
    syncToSqlite(key, bookmarks);
  } catch {}
}

