import { Person, Relationship, GroupFrame, VisitRecord, ProjectMap } from '../types/crm.ts';
import {
  INITIAL_PEOPLE,
  INITIAL_RELATIONSHIPS,
  INITIAL_GROUP_FRAMES,
  INITIAL_VISIT_RECORDS,
  INITIAL_PROJECTS,
  PROJECT_INITIAL_DATA,
} from './sample-data.ts';

const STORAGE_KEY_PROJECTS = 'dc_crm_projects_v5';
const STORAGE_KEY_ACTIVE_PROJECT = 'dc_crm_active_project_v5';
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
 * 启动时从 SQLite 数据库拉取数据并补齐/同步到本地
 */
export async function syncFromSqlite(): Promise<boolean> {
  try {
    const res = await fetch('/api/storage/all');
    if (!res.ok) return false;
    const body = await res.json();
    if (body.success && body.data) {
      const keys = Object.keys(body.data);
      if (keys.length > 0) {
        for (const [k, v] of Object.entries(body.data)) {
          try {
            localStorage.setItem(k, JSON.stringify(v));
          } catch {}
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
    if (raw) return raw;
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
    const raw = localStorage.getItem(`dc_crm_people_v6_${projectId}`);
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
    const key = `dc_crm_people_v6_${projectId}`;
    localStorage.setItem(key, JSON.stringify(people));
    syncToSqlite(key, people);
  } catch (err) {
    console.warn('Failed to save people to localStorage:', err);
  }
}

export function loadSavedRelationships(projectId: string = 'proj-huayun'): Relationship[] {
  const defaultRels = PROJECT_INITIAL_DATA[projectId]?.relationships || INITIAL_RELATIONSHIPS;
  try {
    const raw = localStorage.getItem(`dc_crm_relationships_v6_${projectId}`);
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
    const key = `dc_crm_relationships_v6_${projectId}`;
    localStorage.setItem(key, JSON.stringify(relationships));
    syncToSqlite(key, relationships);
  } catch (err) {
    console.warn('Failed to save relationships to localStorage:', err);
  }
}

export function loadSavedGroupFrames(projectId: string = 'proj-huayun'): GroupFrame[] {
  try {
    const raw = localStorage.getItem(`dc_crm_frames_v6_${projectId}`);
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
    const key = `dc_crm_frames_v6_${projectId}`;
    localStorage.setItem(key, JSON.stringify(frames));
    syncToSqlite(key, frames);
  } catch (err) {
    console.warn('Failed to save group frames:', err);
  }
}

export function loadSavedVisitRecords(projectId: string = 'proj-huayun'): VisitRecord[] {
  try {
    const raw = localStorage.getItem(`dc_crm_visits_v5_${projectId}`);
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
    const key = `dc_crm_visits_v5_${projectId}`;
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
}

const STORAGE_KEY_BG_STYLE = 'dc_crm_bg_style_v5';
const STORAGE_KEY_LINE_STYLE = 'dc_crm_line_style_v5';
const STORAGE_KEY_CARD_STYLE = 'dc_crm_card_style_v5';

export function loadSavedStylePreferences(): StylePreferences {
  try {
    const bg = localStorage.getItem(STORAGE_KEY_BG_STYLE);
    const line = localStorage.getItem(STORAGE_KEY_LINE_STYLE);
    const card = localStorage.getItem(STORAGE_KEY_CARD_STYLE);
    return {
      bgStyleId: bg || 'grid-dots-slate',
      lineStyleId: line || 'bezier-smooth',
      cardStyleId: card || 'classic-white',
    };
  } catch {
    return {
      bgStyleId: 'grid-dots-slate',
      lineStyleId: 'bezier-smooth',
      cardStyleId: 'classic-white',
    };
  }
}

export function saveStylePreferences(prefs: StylePreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY_BG_STYLE, prefs.bgStyleId);
    localStorage.setItem(STORAGE_KEY_LINE_STYLE, prefs.lineStyleId);
    localStorage.setItem(STORAGE_KEY_CARD_STYLE, prefs.cardStyleId);
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
