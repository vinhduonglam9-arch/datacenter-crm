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
  CanvasAnnotation,
  ProjectSnapshot,
  CameraBookmark,
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
  loadSavedAnnotations,
  saveAnnotations,
  loadSidebarCollapsed,
  saveSidebarCollapsed,
  loadSavedStylePreferences,
  saveStylePreferences,
  loadProjectSnapshots,
  saveProjectSnapshots,
  loadCameraBookmarks,
  saveCameraBookmarks,
  buildDefaultBaselineSnapshots,
  syncFromSqlite,
} from './utils/storage.ts';
import {
  INITIAL_PEOPLE,
  INITIAL_RELATIONSHIPS,
  INITIAL_GROUP_FRAMES,
  INITIAL_VISIT_RECORDS,
  INITIAL_ANNOTATIONS,
  INITIAL_CAMERA_BOOKMARKS,
  PROJECT_INITIAL_DATA,
} from './utils/sample-data.ts';
import {
  calculateFactionLayoutFull,
  calculateHierarchyLayoutFull,
  alignSelectedPeople,
  alignUnifiedElements,
  AlignableElementBox,
  AlignmentType,
} from './utils/graph-algorithms.ts';
import { CARD_WIDTH, CARD_HEIGHT } from './utils/graph-math.ts';
import { downloadRelationshipsCsv } from './utils/csv-export.ts';
import {
  BackgroundStyleId,
  LineStyleId,
  CardStyleId,
  BackgroundStyleConfig,
  LineStyleConfig,
  CardStyleConfig,
  SavedCustomStyleScheme,
} from './types/styles.ts';
import {
  CuratedThemeBundle,
  BACKGROUND_STYLES,
  LINE_STYLES,
  CARD_STYLES,
  DEFAULT_CUSTOM_BG,
  DEFAULT_CUSTOM_LINE,
  DEFAULT_CUSTOM_CARD,
} from './utils/theme-presets.ts';

import { TopNav } from './components/TopNav.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Canvas } from './components/Canvas.tsx';
import { ProjectDashboard } from './components/ProjectDashboard.tsx';
import { PersonModal } from './components/PersonModal.tsx';
import { RelationModal } from './components/RelationModal.tsx';
import { GroupFrameModal } from './components/GroupFrameModal.tsx';
import { OcrModal } from './components/OcrModal.tsx';
import { QuickHelpModal } from './components/QuickHelpModal.tsx';
import { ConfirmModal } from './components/ConfirmModal.tsx';
import { SnapshotDiffDrawer } from './components/SnapshotDiffDrawer.tsx';
import { TimelineDrawer } from './components/TimelineDrawer.tsx';
import { StyleCenterModal } from './components/StyleCenterModal.tsx';
import { ExportModal } from './components/ExportModal.tsx';
import { LayerItemKind } from './components/LayerManagerPanel.tsx';
import { computeSnapshotDiff } from './utils/snapshot-diff.ts';

interface HistorySnapshot {
  people: Person[];
  relationships: Relationship[];
  groupFrames: GroupFrame[];
  annotations: CanvasAnnotation[];
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
  const [annotations, setAnnotations] = useState<CanvasAnnotation[]>(() =>
    loadSavedAnnotations(activeProjectId)
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => loadSidebarCollapsed());
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState<boolean>(false);

  // Canvas & Export Synchronized Visual Switches
  const [showStrengthHeatmap, setShowStrengthHeatmap] = useState<boolean>(true);
  const [showGroupFrames, setShowGroupFrames] = useState<boolean>(true);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
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

  // Focus Mode
  const [focusedPersonId, setFocusedPersonId] = useState<string | null>(null);

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

  // Module 1.3: Timeline & Snapshot Diff State
  const [isSnapshotDrawerOpen, setIsSnapshotDrawerOpen] = useState(false);
  const [projectSnapshots, setProjectSnapshots] = useState<ProjectSnapshot[]>(() =>
    loadProjectSnapshots(activeProjectId)
  );
  const [activeSnapshotDiffId, setActiveSnapshotDiffId] = useState<string | null>(null);

  // Module 2.3: Presentation & Spotlight Mode State
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [cameraBookmarks, setCameraBookmarks] = useState<CameraBookmark[]>(() =>
    loadCameraBookmarks(activeProjectId)
  );

  const [timelinePerson, setTimelinePerson] = useState<Person | null>(null);
  const [isStyleCenterOpen, setIsStyleCenterOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const activeSnapshotDiffResult = React.useMemo(() => {
    if (!activeSnapshotDiffId) return null;
    const baseSnap = projectSnapshots.find((s) => s.id === activeSnapshotDiffId);
    if (!baseSnap) return null;
    return computeSnapshotDiff(baseSnap, {
      people,
      relationships,
      frames: groupFrames,
      annotations,
    });
  }, [activeSnapshotDiffId, projectSnapshots, people, relationships, groupFrames, annotations]);

  const activeSnapshotTitle = React.useMemo(() => {
    if (!activeSnapshotDiffId) return null;
    return projectSnapshots.find((s) => s.id === activeSnapshotDiffId)?.title || null;
  }, [activeSnapshotDiffId, projectSnapshots]);

  const [stylePrefs, setStylePrefs] = useState(() => loadSavedStylePreferences());

  const activeBgConfig = React.useMemo(() => {
    if (stylePrefs.bgStyleId === 'custom-bg') {
      return stylePrefs.customBgConfig || DEFAULT_CUSTOM_BG;
    }
    return BACKGROUND_STYLES.find((b) => b.id === stylePrefs.bgStyleId) || BACKGROUND_STYLES[0];
  }, [stylePrefs.bgStyleId, stylePrefs.customBgConfig]);

  const activeLineConfig = React.useMemo(() => {
    if (stylePrefs.lineStyleId === 'custom-line') {
      return stylePrefs.customLineConfig || DEFAULT_CUSTOM_LINE;
    }
    return LINE_STYLES.find((l) => l.id === stylePrefs.lineStyleId) || LINE_STYLES[0];
  }, [stylePrefs.lineStyleId, stylePrefs.customLineConfig]);

  const activeCardConfig = React.useMemo(() => {
    if (stylePrefs.cardStyleId === 'custom-card') {
      return stylePrefs.customCardConfig || DEFAULT_CUSTOM_CARD;
    }
    return CARD_STYLES.find((c) => c.id === stylePrefs.cardStyleId) || CARD_STYLES[0];
  }, [stylePrefs.cardStyleId, stylePrefs.customCardConfig]);

  // Helper to push history
  const recordHistory = useCallback(() => {
    setHistory((prev) => [
      ...prev.slice(-25),
      { people, relationships, groupFrames, annotations },
    ]);
    setFuture([]);
  }, [people, relationships, groupFrames, annotations]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prevSnapshot = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [{ people, relationships, groupFrames, annotations }, ...prev]);
    setPeople(prevSnapshot.people);
    setRelationships(prevSnapshot.relationships);
    setGroupFrames(prevSnapshot.groupFrames);
    setAnnotations(prevSnapshot.annotations || []);
  }, [history, people, relationships, groupFrames, annotations]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const nextSnapshot = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, { people, relationships, groupFrames, annotations }]);
    setPeople(nextSnapshot.people);
    setRelationships(nextSnapshot.relationships);
    setGroupFrames(nextSnapshot.groupFrames);
    setAnnotations(nextSnapshot.annotations || []);
  }, [future, people, relationships, groupFrames, annotations]);

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

  // Startup: Sync latest data from SQLite if available
  useEffect(() => {
    syncFromSqlite().then((hasSynced) => {
      if (hasSynced) {
        setProjects(loadProjects());
        setPeople(loadSavedPeople(activeProjectId));
        setRelationships(loadSavedRelationships(activeProjectId));
        setGroupFrames(loadSavedGroupFrames(activeProjectId));
        setVisits(loadSavedVisitRecords(activeProjectId));
        setAnnotations(loadSavedAnnotations(activeProjectId));
        setProjectSnapshots(loadProjectSnapshots(activeProjectId));
        setCameraBookmarks(loadCameraBookmarks(activeProjectId));
        setStylePrefs(loadSavedStylePreferences());
      }
    });
  }, [activeProjectId]);

  // Sync state to LocalStorage & SQLite per active project
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
    saveAnnotations(annotations, activeProjectId);
  }, [annotations, activeProjectId]);

  useEffect(() => {
    saveSidebarCollapsed(sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    saveStylePreferences(stylePrefs);
  }, [stylePrefs]);

  useEffect(() => {
    saveProjectSnapshots(projectSnapshots, activeProjectId);
  }, [projectSnapshots, activeProjectId]);

  useEffect(() => {
    saveCameraBookmarks(cameraBookmarks, activeProjectId);
  }, [cameraBookmarks, activeProjectId]);

  // Switch Data Center Project
  const handleSelectProject = (projectId: string) => {
    if (projectId === activeProjectId) return;
    setActiveProjectId(projectId);
    setActiveProjectIdState(projectId);
    setPeople(loadSavedPeople(projectId));
    setRelationships(loadSavedRelationships(projectId));
    setGroupFrames(loadSavedGroupFrames(projectId));
    setVisits(loadSavedVisitRecords(projectId));
    setAnnotations(loadSavedAnnotations(projectId));
    setProjectSnapshots(loadProjectSnapshots(projectId));
    setCameraBookmarks(loadCameraBookmarks(projectId));
    setHistory([]);
    setFuture([]);
    setFocusedPersonId(null);
    setActiveSnapshotDiffId(null);
    setTimelinePerson(null);
    setFitViewTrigger((prev) => prev + 1);
    const targetProj = projects.find((p) => p.id === projectId);
    if (targetProj) {
      showToast(`已切换至项目：${targetProj.name}`);
    }
  };

  // Module 1.3: Snapshot Handlers
  const handleCreateSnapshot = (title: string, note?: string) => {
    const newSnap: ProjectSnapshot = {
      id: `snap-${Date.now()}`,
      projectId: activeProjectId,
      title,
      note,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      people: JSON.parse(JSON.stringify(people)),
      relationships: JSON.parse(JSON.stringify(relationships)),
      frames: JSON.parse(JSON.stringify(groupFrames)),
      annotations: JSON.parse(JSON.stringify(annotations)),
    };
    setProjectSnapshots((prev) => [newSnap, ...prev]);
    setActiveSnapshotDiffId(newSnap.id);
    showToast(`已保存历史快照：「${title}」`);
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    setProjectSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
    if (activeSnapshotDiffId === snapshotId) {
      setActiveSnapshotDiffId(null);
    }
    showToast('已删除该历史快照');
  };

  const handleRestoreSnapshot = (snapshot: ProjectSnapshot) => {
    recordHistory();
    setPeople(JSON.parse(JSON.stringify(snapshot.people)));
    setRelationships(JSON.parse(JSON.stringify(snapshot.relationships)));
    setGroupFrames(JSON.parse(JSON.stringify(snapshot.frames || [])));
    if (snapshot.annotations) {
      setAnnotations(JSON.parse(JSON.stringify(snapshot.annotations)));
    }
    setActiveSnapshotDiffId(null);
    setIsSnapshotDrawerOpen(false);
    showToast(`已回滚画布至历史快照：「${snapshot.title}」`);
  };

  // Module 2.2: Group / Ungroup / Lock Selected Elements
  const handleGroupSelectedElements = (
    personIds: string[],
    frameIds: string[],
    annotationIds: string[]
  ) => {
    if (personIds.length + frameIds.length + annotationIds.length < 2) return;
    recordHistory();
    const newGroupId = `grp-${Date.now()}`;
    const pSet = new Set(personIds);
    const fSet = new Set(frameIds);
    const aSet = new Set(annotationIds);
    if (pSet.size > 0) {
      setPeople((prev) =>
        prev.map((p) => (pSet.has(p.id) ? { ...p, groupId: newGroupId } : p))
      );
    }
    if (fSet.size > 0) {
      setGroupFrames((prev) =>
        prev.map((f) => (fSet.has(f.id) ? { ...f, groupId: newGroupId } : f))
      );
    }
    if (aSet.size > 0) {
      setAnnotations((prev) =>
        prev.map((a) => (aSet.has(a.id) ? { ...a, groupId: newGroupId } : a))
      );
    }
    showToast(
      `已将 ${personIds.length + frameIds.length + annotationIds.length} 个元素设为组合 (Ctrl+G)`
    );
  };

  const handleUngroupSelectedElements = (
    personIds: string[],
    frameIds: string[],
    annotationIds: string[]
  ) => {
    recordHistory();
    const pSet = new Set(personIds);
    const fSet = new Set(frameIds);
    const aSet = new Set(annotationIds);
    setPeople((prev) =>
      prev.map((p) => (pSet.has(p.id) ? { ...p, groupId: undefined } : p))
    );
    setGroupFrames((prev) =>
      prev.map((f) => (fSet.has(f.id) ? { ...f, groupId: undefined } : f))
    );
    setAnnotations((prev) =>
      prev.map((a) => (aSet.has(a.id) ? { ...a, groupId: undefined } : a))
    );
    showToast('已解除组合编组 (Ctrl+Shift+G)');
  };

  const handleToggleLockSelectedElements = (
    personIds: string[],
    frameIds: string[],
    annotationIds: string[]
  ) => {
    recordHistory();
    const pSet = new Set(personIds);
    const fSet = new Set(frameIds);
    const aSet = new Set(annotationIds);

    const anyUnlocked =
      people.some((p) => pSet.has(p.id) && !p.locked) ||
      groupFrames.some((f) => fSet.has(f.id) && !f.locked) ||
      annotations.some((a) => aSet.has(a.id) && !a.locked);
    const nextLocked = anyUnlocked;

    if (pSet.size > 0) {
      setPeople((prev) =>
        prev.map((p) => (pSet.has(p.id) ? { ...p, locked: nextLocked } : p))
      );
    }
    if (fSet.size > 0) {
      setGroupFrames((prev) =>
        prev.map((f) => (fSet.has(f.id) ? { ...f, locked: nextLocked } : f))
      );
    }
    if (aSet.size > 0) {
      setAnnotations((prev) =>
        prev.map((a) => (aSet.has(a.id) ? { ...a, locked: nextLocked } : a))
      );
    }
    showToast(nextLocked ? '已锁定选中元素 (普通框选将自动忽略)' : '已解锁选中元素');
  };

  // Module 2.3: Camera Bookmark Handlers
  const handleAddCameraBookmark = (title: string, panX: number, panY: number, zoom: number) => {
    const newBm: CameraBookmark = {
      id: `bm-${Date.now()}`,
      title,
      panX,
      panY,
      zoom,
    };
    setCameraBookmarks((prev) => [...prev, newBm]);
    showToast(`已保存汇报镜头书签：「${title}」`);
  };

  const handleDeleteCameraBookmark = (id: string) => {
    setCameraBookmarks((prev) => prev.filter((b) => b.id !== id));
    showToast('已删除汇报书签');
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
    saveAnnotations([], newId);

    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newId);
    setActiveProjectIdState(newId);
    setPeople(defaultPeople);
    setRelationships(defaultRels);
    setGroupFrames(defaultFrames);
    setVisits([]);
    setAnnotations([]);
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

  // Style Selection & Custom Designer Handlers
  const handleSelectBgStyle = (id: BackgroundStyleId) => {
    setStylePrefs((prev) => ({ ...prev, bgStyleId: id }));
  };
  const handleSelectLineStyle = (id: LineStyleId) => {
    setStylePrefs((prev) => ({ ...prev, lineStyleId: id }));
  };
  const handleSelectCardStyle = (id: CardStyleId) => {
    setStylePrefs((prev) => ({ ...prev, cardStyleId: id }));
  };
  const handleApplyCustomBg = (config: BackgroundStyleConfig) => {
    setStylePrefs((prev) => ({
      ...prev,
      bgStyleId: 'custom-bg',
      customBgConfig: config,
    }));
    showToast('已应用自定义画布背景');
  };
  const handleApplyCustomLine = (config: LineStyleConfig) => {
    setStylePrefs((prev) => ({
      ...prev,
      lineStyleId: 'custom-line',
      customLineConfig: config,
    }));
    showToast('已应用自定义连线样式');
  };
  const handleApplyCustomCard = (config: CardStyleConfig) => {
    setStylePrefs((prev) => ({
      ...prev,
      cardStyleId: 'custom-card',
      customCardConfig: config,
    }));
    showToast('已应用自定义节点卡片样式');
  };
  const handleSaveCustomScheme = (scheme: SavedCustomStyleScheme) => {
    setStylePrefs((prev) => ({
      ...prev,
      bgStyleId: 'custom-bg',
      lineStyleId: 'custom-line',
      cardStyleId: 'custom-card',
      customBgConfig: scheme.bgConfig,
      customLineConfig: scheme.lineConfig,
      customCardConfig: scheme.cardConfig,
      savedCustomSchemes: [
        scheme,
        ...(prev.savedCustomSchemes || []).filter((s) => s.id !== scheme.id),
      ],
    }));
    showToast(`已保存并应用自定义方案：${scheme.name}`);
  };
  const handleApplyCustomScheme = (scheme: SavedCustomStyleScheme) => {
    setStylePrefs((prev) => ({
      ...prev,
      bgStyleId: 'custom-bg',
      lineStyleId: 'custom-line',
      cardStyleId: 'custom-card',
      customBgConfig: scheme.bgConfig,
      customLineConfig: scheme.lineConfig,
      customCardConfig: scheme.cardConfig,
    }));
    showToast(`已切换至方案：${scheme.name}`);
  };
  const handleDeleteCustomScheme = (id: string) => {
    setStylePrefs((prev) => ({
      ...prev,
      savedCustomSchemes: (prev.savedCustomSchemes || []).filter((s) => s.id !== id),
    }));
    showToast('已删除自定义方案');
  };
  const handleApplyBundle = (bundle: CuratedThemeBundle) => {
    setStylePrefs((prev) => ({
      ...prev,
      bgStyleId: bundle.bgId,
      lineStyleId: bundle.lineId,
      cardStyleId: bundle.cardId,
    }));
  };
  const handleResetDefaults = () => {
    setStylePrefs((prev) => ({
      ...prev,
      bgStyleId: 'grid-dots-slate',
      lineStyleId: 'bezier-smooth',
      cardStyleId: 'classic-white',
    }));
    showToast('已恢复默认样式');
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

  // Layer Z-Index Management across People, GroupFrames, Relationships, and Annotations
  const getGlobalZBounds = useCallback(() => {
    const allZ: number[] = [
      ...people.filter((p) => p.onCanvas).map((p) => p.zIndex ?? 100),
      ...groupFrames.map((f) => f.zIndex ?? 10),
      ...relationships.map((r) => r.zIndex ?? 60),
      ...annotations.map((a) => a.zIndex ?? 120),
    ];
    const minZ = allZ.length > 0 ? Math.min(...allZ) : 5;
    const maxZ = allZ.length > 0 ? Math.max(...allZ) : 150;
    return { minZ, maxZ };
  }, [people, groupFrames, relationships, annotations]);

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
    } else if (kind === 'annotation') {
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, zIndex: computeNextZ(a.zIndex ?? 120, action, minZ, maxZ), updatedAt: Date.now() }
            : a
        )
      );
    }
  };

  const handleBatchMoveLayer = (
    personIds: string[],
    frameIds: string[],
    action: LayerAction,
    annotationIds?: string[]
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
    if (annotationIds && annotationIds.length > 0) {
      const aSet = new Set(annotationIds);
      setAnnotations((prev) =>
        prev.map((a) =>
          aSet.has(a.id)
            ? { ...a, zIndex: computeNextZ(a.zIndex ?? 120, action, minZ, maxZ), updatedAt: Date.now() }
            : a
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
    } else if (kind === 'annotation') {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, locked: !a.locked, updatedAt: Date.now() } : a))
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
    } else if (kind === 'annotation') {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, hidden: !a.hidden, updatedAt: Date.now() } : a))
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
      frameMoves: { id: string; x: number; y: number }[],
      annotationMoves?: { id: string; x: number; y: number; points?: { x: number; y: number }[] }[]
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
      if (annotationMoves && annotationMoves.length > 0) {
        const aMap = new Map(annotationMoves.map((m) => [m.id, m]));
        setAnnotations((prev) =>
          prev.map((a) => {
            const m = aMap.get(a.id);
            return m
              ? {
                  ...a,
                  x: m.x,
                  y: m.y,
                  ...(m.points ? { points: m.points } : {}),
                  updatedAt: Date.now(),
                }
              : a;
          })
        );
      }
    },
    []
  );

  // Annotation CRUD Handlers
  const handleCreateAnnotation = (
    annData: Omit<CanvasAnnotation, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    recordHistory();
    const { maxZ } = getGlobalZBounds();
    const newAnn: CanvasAnnotation = {
      ...annData,
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      zIndex: annData.zIndex ?? Math.max(120, maxZ + 2),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setAnnotations((prev) => [...prev, newAnn]);
  };

  const handleUpdateAnnotation = (id: string, updates: Partial<CanvasAnnotation>) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: Date.now() } : a))
    );
  };

  const handleDeleteAnnotations = (ids: string[]) => {
    if (ids.length === 0) return;
    recordHistory();
    const idSet = new Set(ids);
    setAnnotations((prev) => prev.filter((a) => !idSet.has(a.id)));
  };

  const handleAlignPeople = (personIds: string[], alignment: AlignmentType) => {
    if (personIds.length < 2) return;
    recordHistory();
    const idSet = new Set(personIds);
    const targetPeople = people.filter((p) => idSet.has(p.id) && !p.locked);
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

  const handleAlignElements = (
    personIds: string[],
    frameIds: string[],
    annotationIds: string[],
    alignment: AlignmentType
  ) => {
    const pSet = new Set(personIds);
    const fSet = new Set(frameIds);
    const aSet = new Set(annotationIds);

    const boxes: AlignableElementBox[] = [];

    people.forEach((p) => {
      if (pSet.has(p.id) && !p.locked) {
        boxes.push({
          kind: 'person',
          id: p.id,
          x: p.x,
          y: p.y,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
        });
      }
    });

    groupFrames.forEach((f) => {
      if (fSet.has(f.id) && !f.locked) {
        boxes.push({
          kind: 'frame',
          id: f.id,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
        });
      }
    });

    annotations.forEach((a) => {
      if (aSet.has(a.id) && !a.locked) {
        boxes.push({
          kind: 'annotation',
          id: a.id,
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height,
        });
      }
    });

    if (boxes.length < 2) return;

    recordHistory();
    const aligned = alignUnifiedElements(boxes, alignment);

    const pMoveMap = new Map<string, { x: number; y: number }>();
    const fMoveMap = new Map<string, { x: number; y: number }>();
    const aMoveMap = new Map<string, { x: number; y: number }>();

    aligned.forEach((item) => {
      if (item.kind === 'person') pMoveMap.set(item.id, { x: item.x, y: item.y });
      else if (item.kind === 'frame') fMoveMap.set(item.id, { x: item.x, y: item.y });
      else if (item.kind === 'annotation') aMoveMap.set(item.id, { x: item.x, y: item.y });
    });

    if (pMoveMap.size > 0) {
      setPeople((prev) =>
        prev.map((p) => {
          const next = pMoveMap.get(p.id);
          return next ? { ...p, x: next.x, y: next.y, updatedAt: Date.now() } : p;
        })
      );
    }

    if (fMoveMap.size > 0) {
      setGroupFrames((prev) =>
        prev.map((f) => {
          const next = fMoveMap.get(f.id);
          return next ? { ...f, x: next.x, y: next.y } : f;
        })
      );
    }

    if (aMoveMap.size > 0) {
      setAnnotations((prev) =>
        prev.map((a) => {
          const next = aMoveMap.get(a.id);
          return next ? { ...a, x: next.x, y: next.y, updatedAt: Date.now() } : a;
        })
      );
    }

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
      setAnnotations(preset.annotations ?? []);
      setCameraBookmarks(preset.cameraBookmarks ?? []);
    } else {
      setPeople(INITIAL_PEOPLE);
      setRelationships(INITIAL_RELATIONSHIPS);
      setGroupFrames(INITIAL_GROUP_FRAMES);
      setVisits(INITIAL_VISIT_RECORDS);
      setAnnotations(INITIAL_ANNOTATIONS);
      setCameraBookmarks(INITIAL_CAMERA_BOOKMARKS);
    }
    setProjectSnapshots(buildDefaultBaselineSnapshots(activeProjectId));
    setActiveSnapshotDiffId(null);
    setFitViewTrigger((prev) => prev + 1);
    showToast('已重置当前算力项目全要素示例数据');
  };

  // Export & Import JSON / CSV
  const handleExportJson = () => {
    const backupData = {
      version: '5.1',
      exportDate: new Date().toISOString(),
      project: activeProject,
      people,
      relationships,
      groupFrames,
      visits,
      annotations,
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
        if (Array.isArray(data.annotations)) setAnnotations(data.annotations);
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

      {/* Top Navigation & Data Center Project Engineering Bar (Hidden in Presentation Mode) */}
      {!isPresentationMode && (
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
          focusedPersonName={focusedPerson ? focusedPerson.name : null}
          onClearFocus={() => {
            setFocusedPersonId(null);
          }}
          canUndo={history.length > 0}
          canRedo={future.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onAutoLayoutFaction={handleAutoLayoutFaction}
          onAutoLayoutHierarchy={handleAutoLayoutHierarchy}
          onOpenSnapshotDiff={() => setIsSnapshotDrawerOpen(true)}
          hasActiveSnapshotDiff={Boolean(activeSnapshotDiffId)}
          isPresentationMode={isPresentationMode}
          onTogglePresentationMode={() => {
            setIsPresentationMode(true);
            setActiveView('canvas');
            setIsSnapshotDrawerOpen(false);
            setTimelinePerson(null);
            setTimeout(() => setFitViewTrigger((prev) => prev + 1), 40);
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
      )}

      {/* Main Viewport: Either Project Dashboard OR Interactive Topology Canvas */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
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
          />
        ) : (
          <>
            {!isPresentationMode && (
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
            )}

            <Canvas
              people={people}
              relationships={relationships}
              visits={visits}
              groupFrames={groupFrames}
              annotations={annotations}
              showGroupFrames={showGroupFrames}
              onToggleGroupFrames={() => setShowGroupFrames((prev) => !prev)}
              showStrengthHeatmap={showStrengthHeatmap}
              onToggleStrengthHeatmap={() => setShowStrengthHeatmap((prev) => !prev)}
              showAnnotations={showAnnotations}
              onToggleAnnotations={() => setShowAnnotations((prev) => !prev)}
              onCreateAnnotation={handleCreateAnnotation}
              onUpdateAnnotation={handleUpdateAnnotation}
              onDeleteAnnotations={handleDeleteAnnotations}
              isLayerPanelOpen={isLayerPanelOpen}
              onToggleLayerPanel={() => setIsLayerPanelOpen((prev) => !prev)}
              focusedPersonId={focusedPersonId}
              onSetFocusedPersonId={(id) => {
                setFocusedPersonId(id);
              }}
              snapshotDiffResult={activeSnapshotDiffResult}
              activeSnapshotTitle={activeSnapshotTitle}
              onClearSnapshotDiff={() => setActiveSnapshotDiffId(null)}
              isPresentationMode={isPresentationMode}
              onExitPresentationMode={() => {
                setIsPresentationMode(false);
                setTimeout(() => setFitViewTrigger((prev) => prev + 1), 40);
              }}
              cameraBookmarks={cameraBookmarks}
              onAddCameraBookmark={handleAddCameraBookmark}
              onDeleteCameraBookmark={handleDeleteCameraBookmark}
              onBeforeInlineEdit={recordHistory}
              onGroupSelectedElements={handleGroupSelectedElements}
              onUngroupSelectedElements={handleUngroupSelectedElements}
              onToggleLockSelectedElements={handleToggleLockSelectedElements}
              onOpenTimeline={(p) => setTimelinePerson(p)}
              onUpdatePersonPosition={handleUpdatePersonPosition}
              onBatchUpdatePositions={handleBatchUpdatePositions}
              onAlignPeople={handleAlignPeople}
              onAlignElements={handleAlignElements}
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
              onAutoLayoutFaction={handleAutoLayoutFaction}
              onAutoLayoutHierarchy={handleAutoLayoutHierarchy}
              fitViewTrigger={fitViewTrigger}
              bgStyleId={stylePrefs.bgStyleId as BackgroundStyleId}
              lineStyleId={stylePrefs.lineStyleId as LineStyleId}
              cardStyleId={stylePrefs.cardStyleId as CardStyleId}
              bgConfig={activeBgConfig}
              lineConfig={activeLineConfig}
              cardConfig={activeCardConfig}
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

      {/* OCR Photo / Business Card Import Modal */}
      <OcrModal
        isOpen={isOcrModalOpen}
        initialImageFile={ocrInitialFile}
        onClose={() => {
          setIsOcrModalOpen(false);
          setOcrInitialFile(null);
          setOcrPendingCoords(null);
        }}
        onConfirm={handleConfirmOcr}
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

      {/* Module 1.3: Timeline & Snapshot Diff Drawer */}
      <SnapshotDiffDrawer
        isOpen={isSnapshotDrawerOpen}
        projectId={activeProjectId}
        snapshots={projectSnapshots}
        currentPeople={people}
        currentRelationships={relationships}
        currentFrames={groupFrames}
        currentAnnotations={annotations}
        activeDiffSnapshotId={activeSnapshotDiffId}
        onClose={() => setIsSnapshotDrawerOpen(false)}
        onCreateSnapshot={handleCreateSnapshot}
        onDeleteSnapshot={handleDeleteSnapshot}
        onToggleCanvasDiff={(snapId) => {
          setActiveSnapshotDiffId(snapId);
          if (snapId) {
            setActiveView('canvas');
          }
        }}
        onRestoreSnapshot={handleRestoreSnapshot}
        onFocusPersonOnCanvas={(personId) => {
          setActiveView('canvas');
          setFocusedPersonId(personId);
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

      {/* Style Center & Custom Style Studio Modal */}
      <StyleCenterModal
        isOpen={isStyleCenterOpen}
        onClose={() => setIsStyleCenterOpen(false)}
        bgStyleId={stylePrefs.bgStyleId as BackgroundStyleId}
        lineStyleId={stylePrefs.lineStyleId as LineStyleId}
        cardStyleId={stylePrefs.cardStyleId as CardStyleId}
        activeBgConfig={activeBgConfig}
        activeLineConfig={activeLineConfig}
        activeCardConfig={activeCardConfig}
        savedCustomSchemes={stylePrefs.savedCustomSchemes || []}
        onSelectBgStyle={handleSelectBgStyle}
        onSelectLineStyle={handleSelectLineStyle}
        onSelectCardStyle={handleSelectCardStyle}
        onApplyCustomBg={handleApplyCustomBg}
        onApplyCustomLine={handleApplyCustomLine}
        onApplyCustomCard={handleApplyCustomCard}
        onSaveCustomScheme={handleSaveCustomScheme}
        onApplyCustomScheme={handleApplyCustomScheme}
        onDeleteCustomScheme={handleDeleteCustomScheme}
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
        annotations={annotations}
        showGroupFrames={showGroupFrames}
        onToggleGroupFrames={(val) => setShowGroupFrames(val)}
        showStrengthHeatmap={showStrengthHeatmap}
        onToggleStrengthHeatmap={(val) => setShowStrengthHeatmap(val)}
        showAnnotations={showAnnotations}
        onToggleAnnotations={(val) => setShowAnnotations(val)}
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
