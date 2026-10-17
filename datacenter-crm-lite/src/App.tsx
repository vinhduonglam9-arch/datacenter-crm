import React, { useState, useEffect, useCallback } from 'react';
import {
  Person,
  Relationship,
  AnchorPosition,
  RELATION_TEMPLATES,
  VisitRecord,
  RelationshipStage,
  GroupFrame,
  ProjectMap,
  LayerAction,
} from './types/crm.ts';
import {
  loadProjects,
  saveProjects,
  getActiveProjectId,
  setActiveProjectId,
  loadSavedPeople,
  savePeople,
  loadSavedRelationships,
  saveRelationships,
  loadSavedGroupFrames,
  saveGroupFrames,
  loadSavedVisitRecords,
  saveVisitRecords,
  loadSidebarCollapsed,
  saveSidebarCollapsed,
  loadSavedStylePreferences,
  saveStylePreferences,
} from './utils/storage.ts';
import {
  INITIAL_PEOPLE,
  INITIAL_RELATIONSHIPS,
  INITIAL_GROUP_FRAMES,
  INITIAL_VISIT_RECORDS,
  PROJECT_INITIAL_DATA,
} from './utils/sample-data.ts';
import {
  calculateFactionLayoutFull,
  calculateHierarchyLayoutFull,
  alignSelectedPeople,
  AlignmentType,
} from './utils/graph-algorithms.ts';
import { CARD_WIDTH, CARD_HEIGHT } from './utils/graph-math.ts';
import { downloadRelationshipsCsv } from './utils/csv-export.ts';
import { BackgroundStyleId, LineStyleId, CardStyleId } from './types/styles.ts';
import {
  CuratedThemeBundle,
  BACKGROUND_STYLES,
  LINE_STYLES,
  CARD_STYLES,
} from './utils/theme-presets.ts';

import { TopNav } from './components/TopNav.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Canvas } from './components/Canvas.tsx';
import { ProjectDashboard } from './components/ProjectDashboard.tsx';
import { PersonModal } from './components/PersonModal.tsx';
import { RelationModal } from './components/RelationModal.tsx';
import { GroupFrameModal } from './components/GroupFrameModal.tsx';
import { QuickHelpModal } from './components/QuickHelpModal.tsx';
import { ConfirmModal } from './components/ConfirmModal.tsx';
import { InfluencePathModal } from './components/InfluencePathModal.tsx';
import { TimelineDrawer } from './components/TimelineDrawer.tsx';
import { StyleCenterModal } from './components/StyleCenterModal.tsx';
import { ExportModal } from './components/ExportModal.tsx';
import { LayerItemKind } from './components/LayerManagerPanel.tsx';

interface HistorySnapshot {
  people: Person[];
  relationships: Relationship[];
  groupFrames: GroupFrame[];
}

export default function App() {
  const [activeView, setActiveView] = useState<'dashboard' | 'canvas'>('canvas');
  const [projects, setProjects] = useState<ProjectMap[]>(() => loadProjects());
  const [activeProjectId, setActiveProjectIdState] = useState<string>(() => getActiveProjectId());

  const activeProject = React.useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0];
  }, [projects, activeProjectId]);

  const [people, setPeople] = useState<Person[]>(() => loadSavedPeople(activeProjectId));
  const [relationships, setRelationships] = useState<Relationship[]>(() =>
    loadSavedRelationships(activeProjectId)
  );
  const [groupFrames, setGroupFrames] = useState<GroupFrame[]>(() =>
    loadSavedGroupFrames(activeProjectId)
  );
  const [visits, setVisits] = useState<VisitRecord[]>(() =>
    loadSavedVisitRecords(activeProjectId)
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => loadSidebarCollapsed());
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState<boolean>(false);

  // Canvas & Export Synchronized Visual Switches
  const [showStrengthHeatmap, setShowStrengthHeatmap] = useState<boolean>(true);
  const [showGroupFrames, setShowGroupFrames] = useState<boolean>(true);
  const [fitViewTrigger, setFitViewTrigger] = useState<number>(0);

  // Non-blocking Toast Message
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Undo / Redo History
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);

  // Focus Mode & Influence Path Highlighting
  const [focusedPersonId, setFocusedPersonId] = useState<string | null>(null);
  const [highlightedPathIds, setHighlightedPathIds] = useState<string[] | null>(null);

  // Modals & Drawers
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [pendingNewPersonCoords, setPendingNewPersonCoords] = useState<{ x: number; y: number } | null>(null);

  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false);
  const [editingRelation, setEditingRelation] = useState<Relationship | null>(null);

  const [isFrameModalOpen, setIsFrameModalOpen] = useState(false);
  const [editingFrame, setEditingFrame] = useState<GroupFrame | null>(null);

  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [ocrInitialFile, setOcrInitialFile] = useState<File | null>(null);
  const [ocrPendingCoords, setOcrPendingCoords] = useState<{ x: number; y: number } | null>(null);

  const [isQuickHelpOpen, setIsQuickHelpOpen] = useState(false);
  const [isConfirmSampleOpen, setIsConfirmSampleOpen] = useState(false);
  const [isInfluencePathOpen, setIsInfluencePathOpen] = useState(false);
  const [influencePathTargetId, setInfluencePathTargetId] = useState<string | null>(null);
  const [timelinePerson, setTimelinePerson] = useState<Person | null>(null);
  const [isStyleCenterOpen, setIsStyleCenterOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [stylePrefs, setStylePrefs] = useState(() => loadSavedStylePreferences());

  const activeBgConfig = React.useMemo(() => {
    return BACKGROUND_STYLES.find((b) => b.id === stylePrefs.bgStyleId) || BACKGROUND_STYLES[0];
  }, [stylePrefs.bgStyleId]);

  const activeLineConfig = React.useMemo(() => {
    return LINE_STYLES.find((l) => l.id === stylePrefs.lineStyleId) || LINE_STYLES[0];
  }, [stylePrefs.lineStyleId]);

  const activeCardConfig = React.useMemo(() => {
    return CARD_STYLES.find((c) => c.id === stylePrefs.cardStyleId) || CARD_STYLES[0];
  }, [stylePrefs.cardStyleId]);

  // Helper to push history
  const recordHistory = useCallback(() => {
    setHistory((prev) => [...prev.slice(-25), { people, relationships, groupFrames }]);
    setFuture([]);
  }, [people, relationships, groupFrames]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prevSnapshot = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [{ people, relationships, groupFrames }, ...prev]);
    setPeople(prevSnapshot.people);
    setRelationships(prevSnapshot.relationships);
    setGroupFrames(prevSnapshot.groupFrames);
  }, [history, people, relationships, groupFrames]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const nextSnapshot = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, { people, relationships, groupFrames }]);
    setPeople(nextSnapshot.people);
    setRelationships(nextSnapshot.relationships);
    setGroupFrames(nextSnapshot.groupFrames);
  }, [future, people, relationships, groupFrames]);

  // Global hotkeys for Undo / Redo
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndo, handleRedo]);

  // Sync state to LocalStorage per active project
  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    savePeople(people, activeProjectId);
  }, [people, activeProjectId]);

  useEffect(() => {
    saveRelationships(relationships, activeProjectId);
  }, [relationships, activeProjectId]);

  useEffect(() => {
    saveGroupFrames(groupFrames, activeProjectId);
  }, [groupFrames, activeProjectId]);

  useEffect(() => {
    saveVisitRecords(visits, activeProjectId);
  }, [visits, activeProjectId]);

  useEffect(() => {
    saveSidebarCollapsed(sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    saveStylePreferences(stylePrefs);
  }, [stylePrefs]);

  // Switch Data Center Project
  const handleSelectProject = (projectId: string) => {
    if (projectId === activeProjectId) return;
    setActiveProjectId(projectId);
    setActiveProjectIdState(projectId);
    setPeople(loadSavedPeople(projectId));
    setRelationships(loadSavedRelationships(projectId));
    setGroupFrames(loadSavedGroupFrames(projectId));
    setVisits(loadSavedVisitRecords(projectId));
    setHistory([]);
    setFuture([]);
    setFocusedPersonId(null);
    setHighlightedPathIds(null);
    setTimelinePerson(null);
    setFitViewTrigger((prev) => prev + 1);
    const targetProj = projects.find((p) => p.id === projectId);
    if (targetProj) {
      showToast(`已切换至项目：${targetProj.name}`);
    }
  };

  // Create New Project from Dashboard
  const handleCreateProject = (projData: Omit<ProjectMap, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newId = `proj-${Date.now()}`;
    const newProj: ProjectMap = {
      ...projData,
      id: newId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const defaultFrames: GroupFrame[] = [
      {
        id: `frame-our-${newId}`,
        title: '我方铁三角作战组',
        subtitle: 'AR 客户经理 / SR 架构师 / FR 交付',
        x: -120,
        y: 100,
        width: 270,
        height: 460,
        color: '#3B82F6',
        zIndex: 10,
      },
      {
        id: `frame-owner-${newId}`,
        title: `业主核心决策链 (${projData.companyName})`,
        subtitle: '投资拍板 · 技术定标 · 商务招采',
        x: 220,
        y: 80,
        width: 500,
        height: 520,
        color: '#8B5CF6',
        zIndex: 12,
      },
    ];
    const defaultPeople: Person[] = [
      {
        id: `p-owner-${newId}`,
        name: '王总指挥',
        title: '智算基建部总经理',
        company: projData.companyName,
        bio: `全面负责 ${projData.name} 立项审批与技术定标拍板。`,
        tags: ['拍板决策人', '业主方', '高管'],
        specialty: '算力投资与总包决策',
        relationshipStage: 'exploring',
        cardColor: '#8B5CF6',
        x: 340,
        y: 150,
        onCanvas: true,
        zIndex: 110,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: `p-ar-${newId}`,
        name: '李晓峰',
        title: '大客户销售总监 (AR)',
        company: '我方智算基建事业部',
        bio: '我方项目主责铁三角 AR。',
        tags: ['我方团队', '铁三角AR'],
        specialty: '算力投资与总包决策',
        relationshipStage: 'hot',
        cardColor: '#3B82F6',
        x: -95,
        y: 180,
        onCanvas: true,
        zIndex: 112,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
    const defaultRels: Relationship[] = [
      {
        id: `rel-init-${newId}`,
        sourceId: `p-ar-${newId}`,
        targetId: `p-owner-${newId}`,
        sourceAnchor: 'right',
        targetAnchor: 'left',
        templateKey: 'decision_maker',
        label: '高层建联',
        color: '#8B5CF6',
        offsetX: 0,
        offsetY: 0,
        zIndex: 60,
        createdAt: Date.now(),
      },
    ];

    savePeople(defaultPeople, newId);
    saveRelationships(defaultRels, newId);
    saveGroupFrames(defaultFrames, newId);
    saveVisitRecords([], newId);

    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newId);
    setActiveProjectIdState(newId);
    setPeople(defaultPeople);
    setRelationships(defaultRels);
    setGroupFrames(defaultFrames);
    setVisits([]);
    showToast(`已创建新项目：${newProj.name}`);
  };

  const handleUpdateProject = (id: string, data: Partial<ProjectMap>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p))
    );
    showToast('项目工程参数已更新');
  };

  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) return;
    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);
    if (activeProjectId === id) {
      handleSelectProject(remaining[0].id);
    }
    showToast('项目已删除');
  };

  // Style Selection Handlers
  const handleSelectBgStyle = (id: BackgroundStyleId) => {
    setStylePrefs((prev) => ({ ...prev, bgStyleId: id }));
  };
  const handleSelectLineStyle = (id: LineStyleId) => {
    setStylePrefs((prev) => ({ ...prev, lineStyleId: id }));
  };
  const handleSelectCardStyle = (id: CardStyleId) => {
    setStylePrefs((prev) => ({ ...prev, cardStyleId: id }));
  };
  const handleApplyBundle = (bundle: CuratedThemeBundle) => {
    setStylePrefs({
      bgStyleId: bundle.bgId,
      lineStyleId: bundle.lineId,
      cardStyleId: bundle.cardId,
    });
  };
  const handleResetDefaults = () => {
    setStylePrefs({
      bgStyleId: 'grid-dots-slate',
      lineStyleId: 'bezier-smooth',
      cardStyleId: 'classic-white',
    });
  };

  // Visit Records Handlers
  const handleAddVisit = (record: Omit<VisitRecord, 'id' | 'createdAt'>) => {
    const newRecord: VisitRecord = {
      ...record,
      id: `visit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    setVisits((prev) => [newRecord, ...prev]);
    showToast('已添加拜访跟进记录');
  };

  const handleDeleteVisit = (id: string) => {
    setVisits((prev) => prev.filter((v) => v.id !== id));
  };

  const handleUpdateStage = (personId: string, relationshipStage: RelationshipStage) => {
    setPeople((prev) =>
      prev.map((p) => (p.id === personId ? { ...p, relationshipStage, updatedAt: Date.now() } : p))
    );
    setTimelinePerson((prev) =>
      prev && prev.id === personId ? { ...prev, relationshipStage } : prev
    );
  };

  // Layer Z-Index Management across People, GroupFrames, and Relationships
  const getGlobalZBounds = useCallback(() => {
    const allZ: number[] = [
      ...people.filter((p) => p.onCanvas).map((p) => p.zIndex ?? 100),
      ...groupFrames.map((f) => f.zIndex ?? 10),
      ...relationships.map((r) => r.zIndex ?? 60),
    ];
    const minZ = allZ.length > 0 ? Math.min(...allZ) : 5;
    const maxZ = allZ.length > 0 ? Math.max(...allZ) : 150;
    return { minZ, maxZ };
  }, [people, groupFrames, relationships]);

  const computeNextZ = (currentZ: number, action: LayerAction, minZ: number, maxZ: number) => {
    switch (action) {
      case 'front':
        return maxZ + 2;
      case 'forward':
        return currentZ + 5;
      case 'backward':
        return Math.max(1, currentZ - 5);
      case 'back':
        return Math.max(1, minZ - 2);
    }
  };

  const handleMoveLayer = (kind: LayerItemKind, id: string, action: LayerAction) => {
    recordHistory();
    const { minZ, maxZ } = getGlobalZBounds();
    if (kind === 'person') {
      setPeople((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, zIndex: computeNextZ(p.zIndex ?? 100, action, minZ, maxZ) }
            : p
        )
      );
    } else if (kind === 'frame') {
      setGroupFrames((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, zIndex: computeNextZ(f.zIndex ?? 10, action, minZ, maxZ) }
            : f
        )
      );
    } else if (kind === 'relationship') {
      setRelationships((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, zIndex: computeNextZ(r.zIndex ?? 60, action, minZ, maxZ) }
            : r
        )
      );
    }
  };

  const handleBatchMoveLayer = (
    personIds: string[],
    frameIds: string[],
    action: LayerAction
  ) => {
    recordHistory();
    const { minZ, maxZ } = getGlobalZBounds();
    if (personIds.length > 0) {
      const pSet = new Set(personIds);
      setPeople((prev) =>
        prev.map((p) =>
          pSet.has(p.id)
            ? { ...p, zIndex: computeNextZ(p.zIndex ?? 100, action, minZ, maxZ) }
            : p
        )
      );
    }
    if (frameIds.length > 0) {
      const fSet = new Set(frameIds);
      setGroupFrames((prev) =>
        prev.map((f) =>
          fSet.has(f.id)
            ? { ...f, zIndex: computeNextZ(f.zIndex ?? 10, action, minZ, maxZ) }
            : f
        )
      );
    }
    showToast('已更新选中要素图层顺序');
  };

  const handleToggleLockItem = (kind: LayerItemKind, id: string) => {
    if (kind === 'person') {
      setPeople((prev) =>
        prev.map((p) => (p.id === id ? { ...p, locked: !p.locked } : p))
      );
    } else if (kind === 'frame') {
      setGroupFrames((prev) =>
        prev.map((f) => (f.id === id ? { ...f, locked: !f.locked } : f))
      );
    } else if (kind === 'relationship') {
      setRelationships((prev) =>
        prev.map((r) => (r.id === id ? { ...r, locked: !r.locked } : r))
      );
    }
  };

  const handleToggleHideItem = (kind: LayerItemKind, id: string) => {
    if (kind === 'person') {
      setPeople((prev) =>
        prev.map((p) => (p.id === id ? { ...p, hidden: !p.hidden } : p))
      );
    } else if (kind === 'frame') {
      setGroupFrames((prev) =>
        prev.map((f) => (f.id === id ? { ...f, hidden: !f.hidden } : f))
      );
    } else if (kind === 'relationship') {
      setRelationships((prev) =>
        prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r))
      );
    }
  };

  // Position & Batch Updates
  const handleUpdatePersonPosition = (id: string, x: number, y: number) => {
    setPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, x, y, updatedAt: Date.now() } : p))
    );
  };

  const handleBatchUpdatePositions = useCallback(
    (
      personMoves: { id: string; x: number; y: number }[],
      frameMoves: { id: string; x: number; y: number }[]
    ) => {
      if (personMoves.length > 0) {
        const moveMap = new Map(personMoves.map((m) => [m.id, m]));
        setPeople((prev) =>
          prev.map((p) => {
            const m = moveMap.get(p.id);
            return m ? { ...p, x: m.x, y: m.y, updatedAt: Date.now() } : p;
          })
        );
      }
      if (frameMoves.length > 0) {
        const fMap = new Map(frameMoves.map((m) => [m.id, m]));
        setGroupFrames((prev) =>
          prev.map((f) => {
            const m = fMap.get(f.id);
            return m ? { ...f, x: m.x, y: m.y } : f;
          })
        );
      }
    },
    []
  );

  const handleAlignPeople = (personIds: string[], alignment: AlignmentType) => {
    if (personIds.length < 2) return;
    recordHistory();
    const idSet = new Set(personIds);
    const targetPeople = people.filter((p) => idSet.has(p.id));
    const aligned = alignSelectedPeople(targetPeople, alignment);
    const posMap = new Map(aligned.map((a) => [a.id, a]));
    setPeople((prev) =>
      prev.map((p) => {
        const nextPos = posMap.get(p.id);
        return nextPos ? { ...p, x: nextPos.x, y: nextPos.y, updatedAt: Date.now() } : p;
      })
    );
    showToast('已完成批量对齐排版');
  };

  const handleBatchUpdatePeople = (personIds: string[], updates: Partial<Person>) => {
    recordHistory();
    const idSet = new Set(personIds);
    setPeople((prev) =>
      prev.map((p) => (idSet.has(p.id) ? { ...p, ...updates, updatedAt: Date.now() } : p))
    );
    showToast(`已批量更新 ${personIds.length} 位干系人属性`);
  };

  const handleDuplicatePeople = (personIds: string[], offsetX = 36, offsetY = 36) => {
    if (personIds.length === 0) return;
    recordHistory();
    const idSet = new Set(personIds);
    const { maxZ } = getGlobalZBounds();
    const clones: Person[] = [];
    people.forEach((p, idx) => {
      if (idSet.has(p.id)) {
        clones.push({
          ...p,
          id: `person-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          name: `${p.name} (副本)`,
          x: p.x + offsetX,
          y: p.y + offsetY,
          onCanvas: true,
          locked: false,
          zIndex: maxZ + 2 + idx,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    });
    setPeople((prev) => [...clones, ...prev]);
    showToast(`已复制 ${clones.length} 张人物卡片`);
  };

  const handleBatchRemoveFromCanvas = (personIds: string[]) => {
    recordHistory();
    const idSet = new Set(personIds);
    setPeople((prev) =>
      prev.map((p) => (idSet.has(p.id) ? { ...p, onCanvas: false, updatedAt: Date.now() } : p))
    );
    showToast(`已将 ${personIds.length} 位人物移出画布`);
  };

  const handleBatchDeletePeople = (personIds: string[]) => {
    recordHistory();
    const idSet = new Set(personIds);
    setPeople((prev) => prev.filter((p) => !idSet.has(p.id)));
    setRelationships((prev) =>
      prev.filter((r) => !idSet.has(r.sourceId) && !idSet.has(r.targetId))
    );
    showToast(`已彻底删除 ${personIds.length} 位人物档案`);
  };

  // Group Frame Handlers
  const handleCreateFrameAt = (frameData: Omit<GroupFrame, 'id'>) => {
    recordHistory();
    const newFrame: GroupFrame = {
      ...frameData,
      id: `frame-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setGroupFrames((prev) => [...prev, newFrame]);
    showToast('已创建新阵营分组框');
  };

  const handleUpdateFrame = (id: string, updates: Partial<GroupFrame>) => {
    setGroupFrames((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleDeleteFrame = (id: string) => {
    recordHistory();
    setGroupFrames((prev) => prev.filter((f) => f.id !== id));
    showToast('已删除阵营分组框');
  };

  const handleGroupPeopleIntoFrame = (personIds: string[]) => {
    const idSet = new Set(personIds);
    const selected = people.filter((p) => idSet.has(p.id) && p.onCanvas);
    if (selected.length === 0) return;

    recordHistory();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    selected.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + CARD_WIDTH);
      maxY = Math.max(maxY, p.y + CARD_HEIGHT);
    });

    const pad = 28;
    const newFrame: GroupFrame = {
      id: `frame-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${selected[0].company || '专项协同'}决策阵营 (${selected.length}人)`,
      subtitle: '框选自动成组',
      x: Math.round(minX - pad),
      y: Math.round(minY - pad - 10),
      width: Math.round(maxX - minX + pad * 2),
      height: Math.round(maxY - minY + pad * 2 + 16),
      color: selected[0].cardColor || '#8B5CF6',
      zIndex: 15,
    };
    setGroupFrames((prev) => [...prev, newFrame]);
    setEditingFrame(newFrame);
    setIsFrameModalOpen(true);
    showToast(`已为 ${selected.length} 位人物生成外围阵营分组框`);
  };

  // Add person from library to canvas
  const handleAddToCanvas = (personId: string, customX?: number, customY?: number) => {
    recordHistory();
    const { maxZ } = getGlobalZBounds();
    setPeople((prev) =>
      prev.map((p) => {
        if (p.id === personId) {
          return {
            ...p,
            onCanvas: true,
            hidden: false,
            x: customX !== undefined ? customX : p.x,
            y: customY !== undefined ? customY : p.y,
            zIndex: maxZ + 2,
            updatedAt: Date.now(),
          };
        }
        return p;
      })
    );
  };

  const handleRemoveFromCanvas = (personId: string) => {
    recordHistory();
    setPeople((prev) =>
      prev.map((p) => (p.id === personId ? { ...p, onCanvas: false, updatedAt: Date.now() } : p))
    );
  };

  // Save Person (create or edit)
  const handleSavePerson = (personData: Partial<Person>) => {
    recordHistory();
    if (editingPerson) {
      setPeople((prev) =>
        prev.map((p) =>
          p.id === editingPerson.id ? { ...p, ...personData, updatedAt: Date.now() } : p
        )
      );
      showToast(`已更新干系人：${personData.name || editingPerson.name}`);
    } else {
      const { maxZ } = getGlobalZBounds();
      const newPerson: Person = {
        id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: personData.name || '新干系人',
        title: personData.title || '业务负责人',
        company: personData.company || activeProject.companyName,
        bio: personData.bio || '',
        tags: personData.tags || ['业主方'],
        avatarUrl: personData.avatarUrl,
        cardColor: personData.cardColor || '#3B82F6',
        relationshipStage: personData.relationshipStage || 'exploring',
        specialty: personData.specialty || '液冷与暖通系统 (CDU/冷机)',
        vendorPreference: personData.vendorPreference || '',
        x: pendingNewPersonCoords?.x ?? 360,
        y: pendingNewPersonCoords?.y ?? 240,
        onCanvas: true,
        zIndex: maxZ + 2,
        phone: personData.phone,
        email: personData.email,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setPeople((prev) => [newPerson, ...prev]);
      setPendingNewPersonCoords(null);
      showToast(`已新建并上画：${newPerson.name}`);
    }
  };

  const handleDeletePerson = (personId: string) => {
    recordHistory();
    setPeople((prev) => prev.filter((p) => p.id !== personId));
    setRelationships((prev) =>
      prev.filter((r) => r.sourceId !== personId && r.targetId !== personId)
    );
  };

  // Connect two persons
  const handleConnect = (
    sourceId: string,
    targetId: string,
    sourceAnchor: AnchorPosition,
    targetAnchor: AnchorPosition
  ) => {
    if (sourceId === targetId) return;
    const existing = relationships.find(
      (r) =>
        (r.sourceId === sourceId && r.targetId === targetId) ||
        (r.sourceId === targetId && r.targetId === sourceId)
    );
    if (existing) {
      setEditingRelation(existing);
      setIsRelationModalOpen(true);
      return;
    }

    recordHistory();
    const defaultTemplate = RELATION_TEMPLATES[0];
    const newRelation: Relationship = {
      id: `rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceId,
      targetId,
      sourceAnchor,
      targetAnchor,
      templateKey: defaultTemplate.key,
      label: defaultTemplate.label,
      color: defaultTemplate.color,
      offsetX: 0,
      offsetY: 0,
      arrow: 'forward',
      zIndex: 75,
      createdAt: Date.now(),
    };
    setRelationships((prev) => [...prev, newRelation]);
    setEditingRelation(newRelation);
    setIsRelationModalOpen(true);
  };

  const handleSaveRelationship = (updatedData: Partial<Relationship>) => {
    if (!editingRelation) return;
    recordHistory();
    setRelationships((prev) =>
      prev.map((r) => (r.id === editingRelation.id ? { ...r, ...updatedData } : r))
    );
  };

  const handleUpdateRelationship = (id: string, updates: Partial<Relationship>) => {
    recordHistory();
    setRelationships((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const handleUpdateRelationshipOffset = (id: string, offsetX: number, offsetY: number) => {
    setRelationships((prev) =>
      prev.map((r) => (r.id === id ? { ...r, offsetX, offsetY } : r))
    );
  };

  const handleDeleteRelationship = (id: string) => {
    recordHistory();
    setRelationships((prev) => prev.filter((r) => r.id !== id));
  };

  // Confirm OCR Result
  const handleConfirmOcr = (personData: Partial<Person>, addToCanvas: boolean) => {
    recordHistory();
    const { maxZ } = getGlobalZBounds();
    const newPerson: Person = {
      id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: personData.name || '新识别联系人',
      title: personData.title || '业务负责人',
      company: personData.company || activeProject.companyName,
      bio: personData.bio || '',
      tags: personData.tags || ['OCR识别'],
      specialty: personData.specialty || '算力投资与总包决策',
      relationshipStage: 'exploring',
      avatarUrl: personData.avatarUrl,
      cardColor: personData.cardColor || '#8B5CF6',
      x: ocrPendingCoords?.x ?? 360,
      y: ocrPendingCoords?.y ?? 260,
      onCanvas: addToCanvas,
      zIndex: maxZ + 2,
      phone: personData.phone,
      email: personData.email,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setPeople((prev) => [newPerson, ...prev]);
    setOcrPendingCoords(null);
    showToast(`名片识别成功：${newPerson.name}`);
  };

  // Load Sample Data for Current Project
  const handleLoadSampleData = () => {
    recordHistory();
    const preset = PROJECT_INITIAL_DATA[activeProjectId];
    if (preset) {
      setPeople(preset.people);
      setRelationships(preset.relationships);
      setGroupFrames(preset.frames);
      setVisits(preset.visits);
    } else {
      setPeople(INITIAL_PEOPLE);
      setRelationships(INITIAL_RELATIONSHIPS);
      setGroupFrames(INITIAL_GROUP_FRAMES);
      setVisits(INITIAL_VISIT_RECORDS);
    }
    setFitViewTrigger((prev) => prev + 1);
    showToast('已重置当前算力项目示例数据');
  };

  // Export & Import JSON / CSV
  const handleExportJson = () => {
    const backupData = {
      version: '5.0',
      exportDate: new Date().toISOString(),
      project: activeProject,
      people,
      relationships,
      groupFrames,
      visits,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dc-crm-${activeProject.code || 'backup'}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('项目 JSON 备份已下载');
  };

  const handleImportJson = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.people) && Array.isArray(data.relationships)) {
        recordHistory();
        setPeople(data.people);
        setRelationships(data.relationships);
        if (Array.isArray(data.groupFrames)) setGroupFrames(data.groupFrames);
        if (Array.isArray(data.visits)) setVisits(data.visits);
        showToast('项目备份恢复成功');
      } else {
        showToast('备份格式有误：缺少 people 或 relationships 字段');
      }
    } catch {
      showToast('无效的 JSON 备份文件');
    }
  };

  const handleExportCsv = () => {
    if (relationships.length === 0) {
      showToast('当前项目暂无关系连线可导出');
      return;
    }
    downloadRelationshipsCsv(relationships, people, visits);
    showToast('已导出关系台账 CSV');
  };

  // Auto Layouts (AAAAA-Grade Non-Overlapping Faction Swimlanes & Executive Hierarchy Pyramid)
  const handleAutoLayoutFaction = () => {
    recordHistory();
    const { peoplePositions, groupFrames: nextFrames, relationshipUpdates } =
      calculateFactionLayoutFull(people, relationships, activeProject.companyName);

    const posMap = new Map<string, { x: number; y: number }>();
    peoplePositions.forEach((pos) => posMap.set(pos.id, { x: pos.x, y: pos.y }));

    const relMap = new Map(relationshipUpdates.map((u) => [u.id, u]));

    setPeople((prev) =>
      prev.map((p) => {
        const newPos = posMap.get(p.id);
        return newPos ? { ...p, x: newPos.x, y: newPos.y, updatedAt: Date.now() } : p;
      })
    );
    setGroupFrames(nextFrames);
    setShowGroupFrames(true);
    setRelationships((prev) =>
      prev.map((r) => {
        const u = relMap.get(r.id);
        return u
          ? {
              ...r,
              sourceAnchor: u.sourceAnchor,
              targetAnchor: u.targetAnchor,
              offsetX: u.offsetX,
              offsetY: u.offsetY,
            }
          : r;
      })
    );
    setFitViewTrigger((prev) => prev + 1);
    showToast('已应用阵营分栏自动排版（四泳道零遮挡智能对齐）');
  };

  const handleAutoLayoutHierarchy = () => {
    recordHistory();
    const { peoplePositions, groupFrames: nextFrames, relationshipUpdates } =
      calculateHierarchyLayoutFull(people, relationships, activeProject.companyName);

    const posMap = new Map<string, { x: number; y: number }>();
    peoplePositions.forEach((pos) => posMap.set(pos.id, { x: pos.x, y: pos.y }));

    const relMap = new Map(relationshipUpdates.map((u) => [u.id, u]));

    setPeople((prev) =>
      prev.map((p) => {
        const newPos = posMap.get(p.id);
        return newPos ? { ...p, x: newPos.x, y: newPos.y, updatedAt: Date.now() } : p;
      })
    );
    setGroupFrames(nextFrames);
    setShowGroupFrames(true);
    setRelationships((prev) =>
      prev.map((r) => {
        const u = relMap.get(r.id);
        return u
          ? {
              ...r,
              sourceAnchor: u.sourceAnchor,
              targetAnchor: u.targetAnchor,
              offsetX: u.offsetX,
              offsetY: u.offsetY,
            }
          : r;
      })
    );
    setFitViewTrigger((prev) => prev + 1);
    showToast('已应用汇报层级树自动排版（四层战略金字塔）');
  };

  const relationSource = editingRelation
    ? people.find((p) => p.id === editingRelation.sourceId)
    : undefined;
  const relationTarget = editingRelation
    ? people.find((p) => p.id === editingRelation.targetId)
    : undefined;

  const focusedPerson = focusedPersonId ? people.find((p) => p.id === focusedPersonId) : null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-slate-900 font-sans">
      {/* Non-blocking Toast Banner */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg text-xs font-medium pointer-events-none">
          {toastMsg}
        </div>
      )}

      {/* Top Navigation & Data Center Project Engineering Bar */}
      <TopNav
        activeView={activeView}
        onChangeView={(v) => setActiveView(v)}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        isLayerPanelOpen={isLayerPanelOpen}
        onToggleLayerPanel={() => setIsLayerPanelOpen((prev) => !prev)}
        focusedPersonName={
          focusedPerson
            ? focusedPerson.name
            : highlightedPathIds
            ? `突破路径 (${highlightedPathIds.length} 节点)`
            : null
        }
        onClearFocus={() => {
          setFocusedPersonId(null);
          setHighlightedPathIds(null);
        }}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAutoLayoutFaction={handleAutoLayoutFaction}
        onAutoLayoutHierarchy={handleAutoLayoutHierarchy}
        onOpenInfluencePath={() => {
          setInfluencePathTargetId(null);
          setIsInfluencePathOpen(true);
        }}
        onOpenOcrModal={() => {
          setOcrInitialFile(null);
          setIsOcrModalOpen(true);
        }}
        onOpenStyleCenter={() => setIsStyleCenterOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenQuickHelp={() => setIsQuickHelpOpen(true)}
        onOpenNewPerson={() => {
          setEditingPerson(null);
          setPendingNewPersonCoords(null);
          setIsPersonModalOpen(true);
        }}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
      />

      {/* Main Viewport: Either Project Dashboard OR Interactive Topology Canvas */}
      <div className="flex flex-1 h-[calc(100vh-5.5rem)] w-full overflow-hidden relative">
        {activeView === 'dashboard' ? (
          <ProjectDashboard
            projects={projects}
            activeProject={activeProject}
            people={people}
            relationships={relationships}
            groupFrames={groupFrames}
            visits={visits}
            onSelectProject={handleSelectProject}
            onEnterCanvas={(projId, focusId) => {
              if (projId && projId !== activeProjectId) {
                handleSelectProject(projId);
              }
              setActiveView('canvas');
              if (focusId) {
                setTimeout(() => setFocusedPersonId(focusId), 60);
              }
            }}
            onCreateProject={handleCreateProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onEditPerson={(person) => {
              setEditingPerson(person);
              setIsPersonModalOpen(true);
            }}
            onOpenNewPerson={() => {
              setEditingPerson(null);
              setPendingNewPersonCoords(null);
              setIsPersonModalOpen(true);
            }}
            onOpenTimeline={(person) => setTimelinePerson(person)}
            onOpenInfluencePath={() => {
              setInfluencePathTargetId(null);
              setIsInfluencePathOpen(true);
            }}
          />
        ) : (
          <>
            <Sidebar
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
              people={people}
              onNewPerson={() => {
                setEditingPerson(null);
                setPendingNewPersonCoords(null);
                setIsPersonModalOpen(true);
              }}
              onSelectPerson={(person) => {
                if (!person.onCanvas) {
                  handleAddToCanvas(person.id);
                } else {
                  setFocusedPersonId((prev) => (prev === person.id ? null : person.id));
                }
              }}
              onEditPerson={(person) => {
                setEditingPerson(person);
                setIsPersonModalOpen(true);
              }}
              onAddToCanvas={(id) => handleAddToCanvas(id)}
              onRemoveFromCanvas={handleRemoveFromCanvas}
              onLoadSampleData={() => setIsConfirmSampleOpen(true)}
            />

            <Canvas
              people={people}
              relationships={relationships}
              visits={visits}
              groupFrames={groupFrames}
              showGroupFrames={showGroupFrames}
              onToggleGroupFrames={() => setShowGroupFrames((prev) => !prev)}
              showStrengthHeatmap={showStrengthHeatmap}
              onToggleStrengthHeatmap={() => setShowStrengthHeatmap((prev) => !prev)}
              isLayerPanelOpen={isLayerPanelOpen}
              onToggleLayerPanel={() => setIsLayerPanelOpen((prev) => !prev)}
              focusedPersonId={focusedPersonId}
              onSetFocusedPersonId={(id) => {
                setFocusedPersonId(id);
                if (id) setHighlightedPathIds(null);
              }}
              highlightedPathIds={highlightedPathIds}
              onOpenTimeline={(p) => setTimelinePerson(p)}
              onUpdatePersonPosition={handleUpdatePersonPosition}
              onBatchUpdatePositions={handleBatchUpdatePositions}
              onAlignPeople={handleAlignPeople}
              onBatchUpdatePeople={handleBatchUpdatePeople}
              onDuplicatePeople={handleDuplicatePeople}
              onBatchRemoveFromCanvas={handleBatchRemoveFromCanvas}
              onBatchDeletePeople={handleBatchDeletePeople}
              onCreatePersonAt={(x, y) => {
                setEditingPerson(null);
                setPendingNewPersonCoords({ x, y });
                setIsPersonModalOpen(true);
              }}
              onCreateFrameAt={handleCreateFrameAt}
              onEditFrame={(frame) => {
                setEditingFrame(frame);
                setIsFrameModalOpen(true);
              }}
              onUpdateFrame={handleUpdateFrame}
              onDeleteFrame={handleDeleteFrame}
              onGroupPeopleIntoFrame={handleGroupPeopleIntoFrame}
              onMoveLayer={handleMoveLayer}
              onBatchMoveLayer={handleBatchMoveLayer}
              onToggleLockItem={handleToggleLockItem}
              onToggleHideItem={handleToggleHideItem}
              onDropPersonToCanvas={(id, x, y) => handleAddToCanvas(id, x, y)}
              onDropImageFile={(file, x, y) => {
                setOcrInitialFile(file);
                setOcrPendingCoords({ x, y });
                setIsOcrModalOpen(true);
              }}
              onOpenOcrAt={(x, y) => {
                setOcrInitialFile(null);
                setOcrPendingCoords({ x, y });
                setIsOcrModalOpen(true);
              }}
              onConnect={handleConnect}
              onEditPerson={(person) => {
                setEditingPerson(person);
                setIsPersonModalOpen(true);
              }}
              onEditRelationship={(rel) => {
                setEditingRelation(rel);
                setIsRelationModalOpen(true);
              }}
              onUpdateRelationship={handleUpdateRelationship}
              onUpdateRelationshipOffset={handleUpdateRelationshipOffset}
              onDeleteRelationship={handleDeleteRelationship}
              onOpenInfluencePathWithPerson={(personId) => {
                setInfluencePathTargetId(personId);
                setIsInfluencePathOpen(true);
              }}
              onAutoLayoutFaction={handleAutoLayoutFaction}
              onAutoLayoutHierarchy={handleAutoLayoutHierarchy}
              fitViewTrigger={fitViewTrigger}
              bgStyleId={stylePrefs.bgStyleId as BackgroundStyleId}
              lineStyleId={stylePrefs.lineStyleId as LineStyleId}
              cardStyleId={stylePrefs.cardStyleId as CardStyleId}
              onOpenStyleCenter={() => setIsStyleCenterOpen(true)}
            />
          </>
        )}
      </div>

      {/* Person Edit / Create Modal */}
      <PersonModal
        isOpen={isPersonModalOpen}
        person={editingPerson}
        onClose={() => {
          setIsPersonModalOpen(false);
          setEditingPerson(null);
          setPendingNewPersonCoords(null);
        }}
        onSave={handleSavePerson}
        onRemoveFromCanvas={handleRemoveFromCanvas}
        onDeletePerson={handleDeletePerson}
      />

      {/* Relationship Edit Modal */}
      <RelationModal
        isOpen={isRelationModalOpen}
        relation={editingRelation}
        sourcePerson={relationSource}
        targetPerson={relationTarget}
        onClose={() => {
          setIsRelationModalOpen(false);
          setEditingRelation(null);
        }}
        onSave={handleSaveRelationship}
        onDelete={handleDeleteRelationship}
      />

      {/* GroupFrame Edit Modal */}
      <GroupFrameModal
        isOpen={isFrameModalOpen}
        frame={editingFrame}
        onClose={() => {
          setIsFrameModalOpen(false);
          setEditingFrame(null);
        }}
        onSave={(data) => {
          if (editingFrame) {
            handleUpdateFrame(editingFrame.id, data);
            showToast('阵营分组框已更新');
          }
        }}
        onDelete={handleDeleteFrame}
      />


      {/* Quick Help Modal */}
      <QuickHelpModal
        isOpen={isQuickHelpOpen}
        onClose={() => setIsQuickHelpOpen(false)}
      />

      {/* Confirm Load Sample Data Modal */}
      <ConfirmModal
        isOpen={isConfirmSampleOpen}
        title="重置当前项目示例数据"
        message={`确定要将「${activeProject.name}」的节点与关系恢复为初始演示数据吗？当前未导出的修改将被覆盖。`}
        confirmLabel="确认重置"
        cancelLabel="取消"
        isDanger={false}
        onConfirm={handleLoadSampleData}
        onClose={() => setIsConfirmSampleOpen(false)}
      />

      {/* Influence Path Modal */}
      <InfluencePathModal
        isOpen={isInfluencePathOpen}
        people={people}
        relationships={relationships}
        initialTargetId={influencePathTargetId}
        onClose={() => {
          setIsInfluencePathOpen(false);
          setInfluencePathTargetId(null);
        }}
        onApplyPathFocus={(path) => {
          setActiveView('canvas');
          setHighlightedPathIds(path);
          setFocusedPersonId(null);
        }}
      />

      {/* CRM Customer Interaction & Visit Timeline Drawer */}
      <TimelineDrawer
        isOpen={!!timelinePerson}
        person={timelinePerson}
        visits={visits}
        onClose={() => setTimelinePerson(null)}
        onAddVisit={handleAddVisit}
        onDeleteVisit={handleDeleteVisit}
        onUpdateStage={handleUpdateStage}
      />

      {/* Style Center Modal (20 Backgrounds x 20 Lines x 20 Cards) */}
      <StyleCenterModal
        isOpen={isStyleCenterOpen}
        onClose={() => setIsStyleCenterOpen(false)}
        bgStyleId={stylePrefs.bgStyleId as BackgroundStyleId}
        lineStyleId={stylePrefs.lineStyleId as LineStyleId}
        cardStyleId={stylePrefs.cardStyleId as CardStyleId}
        onSelectBgStyle={handleSelectBgStyle}
        onSelectLineStyle={handleSelectLineStyle}
        onSelectCardStyle={handleSelectCardStyle}
        onApplyBundle={handleApplyBundle}
        onResetDefaults={handleResetDefaults}
      />

      {/* 100% Style-Faithful Export Center Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        people={people}
        relationships={relationships}
        visits={visits}
        groupFrames={groupFrames}
        showGroupFrames={showGroupFrames}
        onToggleGroupFrames={(val) => setShowGroupFrames(val)}
        showStrengthHeatmap={showStrengthHeatmap}
        onToggleStrengthHeatmap={(val) => setShowStrengthHeatmap(val)}
        project={activeProject}
        projectName={activeProject.name}
        bgConfig={activeBgConfig}
        lineConfig={activeLineConfig}
        cardConfig={activeCardConfig}
        onExportJson={handleExportJson}
      />
    </div>
  );
}
