import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Building2,
  Move,
  Link2,
  GitFork,
  Map as MapIcon,
  Clock,
  Palette,
  Activity,
  Frame,
  MousePointer,
  Hand,
  BoxSelect,
  Lasso,
  UserPlus,
  Layers,
  Lock,
  Unlock,
  Copy,
  Trash2,
  Edit2,
  ArrowUpToLine,
  ArrowUp,
  ArrowDown,
  ArrowDownToLine,
  AlignLeft,
  AlignCenterHorizontal,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Columns,
  Rows,
  Compass,
  Sparkles,
  LayoutGrid,
  Check,
  GripVertical,
} from 'lucide-react';
import {
  Person,
  Relationship,
  AnchorPosition,
  VisitRecord,
  GroupFrame,
  CanvasToolMode,
  LayerAction,
  RelationshipStage,
  STAGE_LIST,
  CARD_COLORS,
} from '../types/crm.ts';
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  Point,
  getAnchorPoint,
  getClosestAnchor,
  calculateBezierPath,
  calculateConnectionPath,
  screenToCanvas,
  isRectIntersecting,
  isPointInPolygon,
} from '../utils/graph-math.ts';
import {
  BACKGROUND_STYLES,
  LINE_STYLES,
  CARD_STYLES,
} from '../utils/theme-presets.ts';
import {
  BackgroundStyleId,
  LineStyleId,
  CardStyleId,
} from '../types/styles.ts';
import { calculateRelationshipStrength } from '../utils/relationship-strength.ts';
import { AlignmentType } from '../utils/graph-algorithms.ts';
import { LayerManagerPanel, LayerItemKind } from './LayerManagerPanel.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { loadToolbarPosition, saveToolbarPosition } from '../utils/storage.ts';

interface ContextMenuState {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
  targetType: 'canvas' | 'person' | 'frame' | 'relationship';
  targetId?: string;
}

interface CanvasProps {
  people: Person[];
  relationships: Relationship[];
  visits?: VisitRecord[];
  groupFrames?: GroupFrame[];
  showGroupFrames?: boolean;
  onToggleGroupFrames?: () => void;
  showStrengthHeatmap?: boolean;
  onToggleStrengthHeatmap?: () => void;
  isLayerPanelOpen: boolean;
  onToggleLayerPanel: () => void;
  focusedPersonId?: string | null;
  onSetFocusedPersonId?: (id: string | null) => void;
  highlightedPathIds?: string[] | null;
  onOpenTimeline?: (person: Person) => void;
  onUpdatePersonPosition: (id: string, x: number, y: number) => void;
  onBatchUpdatePositions: (
    personMoves: { id: string; x: number; y: number }[],
    frameMoves: { id: string; x: number; y: number }[]
  ) => void;
  onAlignPeople: (personIds: string[], alignment: AlignmentType) => void;
  onBatchUpdatePeople: (personIds: string[], updates: Partial<Person>) => void;
  onDuplicatePeople: (personIds: string[], offsetX?: number, offsetY?: number) => void;
  onBatchRemoveFromCanvas: (personIds: string[]) => void;
  onBatchDeletePeople: (personIds: string[]) => void;
  onCreatePersonAt: (x: number, y: number) => void;
  onCreateFrameAt: (frameData: Omit<GroupFrame, 'id'>) => void;
  onEditFrame: (frame: GroupFrame) => void;
  onUpdateFrame: (id: string, updates: Partial<GroupFrame>) => void;
  onDeleteFrame: (id: string) => void;
  onGroupPeopleIntoFrame: (personIds: string[]) => void;
  onMoveLayer: (kind: LayerItemKind, id: string, action: LayerAction) => void;
  onBatchMoveLayer: (personIds: string[], frameIds: string[], action: LayerAction) => void;
  onToggleLockItem: (kind: LayerItemKind, id: string) => void;
  onToggleHideItem: (kind: LayerItemKind, id: string) => void;
  onDropPersonToCanvas: (personId: string, canvasX: number, canvasY: number) => void;
  onDropImageFile: (file: File, canvasX: number, canvasY: number) => void;
  onOpenOcrAt: (canvasX: number, canvasY: number) => void;
  onConnect: (
    sourceId: string,
    targetId: string,
    sourceAnchor: AnchorPosition,
    targetAnchor: AnchorPosition
  ) => void;
  onEditPerson: (person: Person) => void;
  onEditRelationship: (relation: Relationship) => void;
  onUpdateRelationship: (id: string, updates: Partial<Relationship>) => void;
  onUpdateRelationshipOffset: (id: string, offsetX: number, offsetY: number) => void;
  onDeleteRelationship: (id: string) => void;
  onOpenInfluencePathWithPerson?: (personId: string, asTarget: boolean) => void;
  onAutoLayoutFaction?: () => void;
  onAutoLayoutHierarchy?: () => void;
  fitViewTrigger?: number;
  bgStyleId?: BackgroundStyleId;
  lineStyleId?: LineStyleId;
  cardStyleId?: CardStyleId;
  onOpenStyleCenter?: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  people,
  relationships,
  visits = [],
  groupFrames = [],
  showGroupFrames = true,
  onToggleGroupFrames,
  showStrengthHeatmap: propShowStrengthHeatmap,
  onToggleStrengthHeatmap,
  isLayerPanelOpen,
  onToggleLayerPanel,
  focusedPersonId,
  onSetFocusedPersonId,
  highlightedPathIds,
  onOpenTimeline,
  onBatchUpdatePositions,
  onAlignPeople,
  onBatchUpdatePeople,
  onDuplicatePeople,
  onBatchRemoveFromCanvas,
  onBatchDeletePeople,
  onCreatePersonAt,
  onCreateFrameAt,
  onEditFrame,
  onUpdateFrame,
  onDeleteFrame,
  onGroupPeopleIntoFrame,
  onMoveLayer,
  onBatchMoveLayer,
  onToggleLockItem,
  onToggleHideItem,
  onDropPersonToCanvas,
  onDropImageFile,
  onOpenOcrAt,
  onConnect,
  onEditPerson,
  onEditRelationship,
  onUpdateRelationship,
  onUpdateRelationshipOffset,
  onDeleteRelationship,
  onOpenInfluencePathWithPerson,
  onAutoLayoutFaction,
  onAutoLayoutHierarchy,
  fitViewTrigger = 0,
  bgStyleId = 'grid-dots-slate',
  lineStyleId = 'bezier-smooth',
  cardStyleId = 'classic-white',
  onOpenStyleCenter,
}) => {
  const { t, language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport Pan & Zoom
  const [pan, setPan] = useState<Point>({ x: 180, y: 75 });
  const [zoom, setZoom] = useState<number>(0.85);
  const panRef = useRef<Point>(pan);
  panRef.current = pan;
  const zoomRef = useRef<number>(zoom);
  zoomRef.current = zoom;
  const [showMiniMap, setShowMiniMap] = useState<boolean>(false);

  // Zoom to target scale anchored at cursor or viewport center
  const zoomToLevel = useCallback((targetZoom: number, anchorX?: number, anchorY?: number) => {
    const container = containerRef.current;
    const clampedZoom = Math.min(2.5, Math.max(0.2, Number(targetZoom.toFixed(4))));
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;

    if (!container) {
      zoomRef.current = clampedZoom;
      setZoom(clampedZoom);
      return;
    }

    const rect = container.getBoundingClientRect();
    const ptX = anchorX !== undefined ? anchorX : rect.width / 2;
    const ptY = anchorY !== undefined ? anchorY : rect.height / 2;

    const newPanX = ptX - (ptX - currentPan.x) * (clampedZoom / currentZoom);
    const newPanY = ptY - (ptY - currentPan.y) * (clampedZoom / currentZoom);

    zoomRef.current = clampedZoom;
    panRef.current = { x: newPanX, y: newPanY };
    setZoom(clampedZoom);
    setPan({ x: newPanX, y: newPanY });
  }, []);

  // Active Drawing / Interaction Tool Mode
  const [toolMode, setToolMode] = useState<CanvasToolMode>('select');
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  // Draggable Floating Menu Bar State
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number; orientation: 'vertical' | 'horizontal' }>(() => {
    const saved = loadToolbarPosition();
    return {
      x: saved?.x ?? 20,
      y: saved?.y ?? 140,
      orientation: saved?.orientation ?? 'vertical',
    };
  });
  const toolbarPosRef = useRef(toolbarPos);
  toolbarPosRef.current = toolbarPos;
  const [isDraggingToolbar, setIsDraggingToolbar] = useState<boolean>(false);
  const toolbarDragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Multi-Selection State
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [selectedFrameIds, setSelectedFrameIds] = useState<string[]>([]);
  const [selectedRelIds, setSelectedRelIds] = useState<string[]>([]);

  // Clipboard for Copy/Paste
  const [copiedPersonIds, setCopiedPersonIds] = useState<string[]>([]);

  // Batch Dragging State
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const dragStartMouseRef = useRef<Point>({ x: 0, y: 0 });
  const initialPersonPositionsRef = useRef<Map<string, Point>>(new Map());
  const initialFramePositionsRef = useRef<Map<string, Point>>(new Map());

  // GroupFrame Resizing State
  const [resizingFrameId, setResizingFrameId] = useState<string | null>(null);
  const resizeStartMouseRef = useRef<Point>({ x: 0, y: 0 });
  const resizeInitialSizeRef = useRef<{ width: number; height: number }>({ width: 300, height: 300 });

  // Drawing a New GroupFrame State (when toolMode === 'frame')
  const [drawingNewFrame, setDrawingNewFrame] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Rectangle Marquee Selection State
  const [marqueeBox, setMarqueeBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    append: boolean;
  } | null>(null);

  // Freehand Lasso Selection State
  const [lassoPoints, setLassoPoints] = useState<Point[] | null>(null);
  const lassoAppendRef = useRef<boolean>(false);

  // Canvas Panning State
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<Point>({ x: 0, y: 0 });

  // Anchor Drawing Connection State
  const [drawingConnection, setDrawingConnection] = useState<{
    sourceId: string;
    sourceAnchor: AnchorPosition;
    currentPoint: Point;
    targetId?: string;
    targetAnchor?: AnchorPosition;
  } | null>(null);

  // Click-to-Connect Source State
  const [connectModeSourceId, setConnectModeSourceId] = useState<string | null>(null);

  // Relationship Label Dragging State
  const [draggingLabelRelationId, setDraggingLabelRelationId] = useState<string | null>(null);
  const labelDragStartMouseRef = useRef<Point>({ x: 0, y: 0 });
  const labelDragInitialOffsetRef = useRef<Point>({ x: 0, y: 0 });
  const labelHasMovedRef = useRef<boolean>(false);

  // Hover & Context Menu State
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [hoveredRelId, setHoveredRelId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const [localShowHeatmap, setLocalShowHeatmap] = useState<boolean>(true);
  const showStrengthHeatmap =
    propShowStrengthHeatmap !== undefined ? propShowStrengthHeatmap : localShowHeatmap;

  // Visible canvas elements
  const canvasPeople = useMemo(
    () => people.filter((p) => p.onCanvas && !p.hidden),
    [people]
  );
  const visibleFrames = useMemo(
    () => (showGroupFrames ? groupFrames.filter((f) => !f.hidden) : []),
    [groupFrames, showGroupFrames]
  );
  const visibleRelationships = useMemo(
    () => relationships.filter((r) => !r.hidden),
    [relationships]
  );

  const peopleMap = useMemo(() => {
    const m = new Map<string, Person>();
    canvasPeople.forEach((p) => m.set(p.id, p));
    return m;
  }, [canvasPeople]);

  // Determine connected IDs for focus mode
  const connectedIds = useMemo(() => {
    if (!focusedPersonId) return null;
    const set = new Set<string>([focusedPersonId]);
    for (const r of visibleRelationships) {
      if (r.sourceId === focusedPersonId) set.add(r.targetId);
      if (r.targetId === focusedPersonId) set.add(r.sourceId);
    }
    return set;
  }, [focusedPersonId, visibleRelationships]);

  // Determine path edges for influence path analysis
  const isRelInPath = useMemo(() => {
    if (!highlightedPathIds || highlightedPathIds.length < 2) return null;
    const set = new Set<string>();
    for (let i = 0; i < highlightedPathIds.length - 1; i++) {
      const a = highlightedPathIds[i];
      const b = highlightedPathIds[i + 1];
      set.add(`${a}->${b}`);
      set.add(`${b}->${a}`);
    }
    return set;
  }, [highlightedPathIds]);

  const activeBgConfig = useMemo(() => {
    return BACKGROUND_STYLES.find((b) => b.id === bgStyleId) || BACKGROUND_STYLES[0];
  }, [bgStyleId]);

  const activeLineConfig = useMemo(() => {
    return LINE_STYLES.find((l) => l.id === lineStyleId) || LINE_STYLES[0];
  }, [lineStyleId]);

  const activeCardConfig = useMemo(() => {
    return CARD_STYLES.find((c) => c.id === cardStyleId) || CARD_STYLES[0];
  }, [cardStyleId]);

  // Fit view to all visible elements while respecting floating toolbar and HUD safe insets
  const handleFitView = useCallback(() => {
    if (canvasPeople.length === 0 && visibleFrames.length === 0) {
      setPan({ x: 200, y: 150 });
      setZoom(1);
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    canvasPeople.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + CARD_WIDTH);
      maxY = Math.max(maxY, p.y + CARD_HEIGHT);
    });

    visibleFrames.forEach((f) => {
      minX = Math.min(minX, f.x);
      minY = Math.min(minY, f.y - 16);
      maxX = Math.max(maxX, f.x + f.width);
      maxY = Math.max(maxY, f.y + f.height);
    });

    const containerWidth = containerRef.current?.clientWidth || 1200;
    const containerHeight = containerRef.current?.clientHeight || 760;

    // Safe viewport margins so neither floating toolbar nor layer panel nor bottom HUD obscures elements
    const leftInset = toolbarPos.orientation === 'vertical' && toolbarPos.x < 160 ? 92 : 36;
    const rightInset = isLayerPanelOpen ? 316 : 36;
    const topInset = toolbarPos.orientation === 'horizontal' && toolbarPos.y < 100 ? 84 : 36;
    const bottomInset = 68;

    const usableWidth = Math.max(360, containerWidth - leftInset - rightInset);
    const usableHeight = Math.max(260, containerHeight - topInset - bottomInset);

    const worldWidth = Math.max(240, maxX - minX);
    const worldHeight = Math.max(180, maxY - minY);

    const scaleX = usableWidth / (worldWidth + 64);
    const scaleY = usableHeight / (worldHeight + 64);
    const newZoom = Math.min(1.05, Math.max(0.32, Math.min(scaleX, scaleY)));

    const safeCenterX = leftInset + usableWidth / 2;
    const safeCenterY = topInset + usableHeight / 2;

    const newPanX = Math.round(safeCenterX - ((minX + maxX) / 2) * newZoom);
    const newPanY = Math.round(safeCenterY - ((minY + maxY) / 2) * newZoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [canvasPeople, visibleFrames, toolbarPos.orientation, toolbarPos.x, toolbarPos.y, isLayerPanelOpen]);

  // Auto-fit when fitViewTrigger increments (e.g., after Auto-Layout or Project Switch) or on initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitView();
    }, 30);
    return () => clearTimeout(timer);
  }, [fitViewTrigger]);

  // Center on a specific coordinate or person
  const centerOnCoords = useCallback(
    (worldX: number, worldY: number) => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      setPan({
        x: containerWidth / 2 - worldX * zoom,
        y: containerHeight / 2 - worldY * zoom,
      });
    },
    [zoom]
  );

  useEffect(() => {
    if (focusedPersonId) {
      const target = peopleMap.get(focusedPersonId);
      if (target) {
        centerOnCoords(target.x + CARD_WIDTH / 2, target.y + CARD_HEIGHT / 2);
        setSelectedPersonIds([target.id]);
      }
    }
  }, [focusedPersonId]);

  // Draggable Toolbar Mouse Down handler
  const handleToolbarGripMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingToolbar(true);
    toolbarDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: toolbarPos.x,
      startY: toolbarPos.y,
    };
  };

  const toggleToolbarOrientation = () => {
    setToolbarPos((prev) => {
      const nextOrientation: 'vertical' | 'horizontal' = prev.orientation === 'horizontal' ? 'vertical' : 'horizontal';
      const next = {
        ...prev,
        orientation: nextOrientation,
      };
      toolbarPosRef.current = next;
      saveToolbarPosition(next);
      return next;
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const isInputFocused = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;

      if (e.code === 'Space' && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      if (e.key === 'Escape') {
        setContextMenu(null);
        setConnectModeSourceId(null);
        if (toolMode !== 'select') {
          setToolMode('select');
        } else {
          setSelectedPersonIds([]);
          setSelectedFrameIds([]);
          setSelectedRelIds([]);
        }
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'v') setToolMode('select');
        else if (k === 'h') setToolMode('pan');
        else if (k === 'm') setToolMode('marquee');
        else if (k === 'l') setToolMode('lasso');
        else if (k === 'c') setToolMode('connect');
        else if (k === 'f') setToolMode('frame');
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedPersonIds(canvasPeople.map((p) => p.id));
        setSelectedFrameIds(visibleFrames.map((f) => f.id));
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedPersonIds.length > 0) {
          setCopiedPersonIds(selectedPersonIds);
        }
        return;
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'v')
      ) {
        const targetIds =
          e.key.toLowerCase() === 'd'
            ? selectedPersonIds
            : copiedPersonIds.length > 0
            ? copiedPersonIds
            : selectedPersonIds;
        if (targetIds.length > 0) {
          e.preventDefault();
          onDuplicatePeople(targetIds, 36, 36);
        }
        return;
      }

      // Ctrl/Cmd + / - / 0 for keyboard zoom in/out/reset
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomToLevel(zoomRef.current * 1.12);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        zoomToLevel(zoomRef.current / 1.12);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        zoomToLevel(1);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedPersonIds.length > 0) {
          e.preventDefault();
          onBatchRemoveFromCanvas(selectedPersonIds);
          setSelectedPersonIds([]);
        }
        if (selectedRelIds.length > 0) {
          e.preventDefault();
          selectedRelIds.forEach((id) => onDeleteRelationship(id));
          setSelectedRelIds([]);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    isSpacePressed,
    toolMode,
    canvasPeople,
    visibleFrames,
    selectedPersonIds,
    selectedRelIds,
    copiedPersonIds,
    onDuplicatePeople,
    onBatchRemoveFromCanvas,
    onDeleteRelationship,
    zoomToLevel,
  ]);

  // Native non-passive wheel listener so holding Ctrl + Mouse Wheel smoothly zooms in/out
  // centered at the mouse cursor without triggering browser page zoom.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      const isInsideLayerPanel = Boolean(target?.closest?.('[data-layer-panel="true"]'));

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu(null);

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const rawDelta =
          e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 100 : e.deltaY;
        if (rawDelta === 0) return;

        const zoomFactor =
          Math.abs(rawDelta) >= 40
            ? rawDelta < 0
              ? 1.12
              : 1 / 1.12
            : Math.pow(0.992, rawDelta);

        zoomToLevel(zoomRef.current * zoomFactor, mouseX, mouseY);
        return;
      }

      if (isInsideLayerPanel) {
        return;
      }

      e.preventDefault();
      setContextMenu(null);

      const deltaX = e.deltaMode === 1 ? e.deltaX * 33 : e.deltaX;
      const deltaY = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      const panDeltaX = e.shiftKey && deltaX === 0 ? deltaY : deltaX;
      const panDeltaY = e.shiftKey && deltaX === 0 ? 0 : deltaY;

      const nextPan = {
        x: panRef.current.x - panDeltaX,
        y: panRef.current.y - panDeltaY,
      };
      panRef.current = nextPan;
      setPan(nextPan);
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
    };
  }, [zoomToLevel]);

  // Start interactions on background mouse down
  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    setContextMenu(null);

    if (e.button === 1 || (e.button === 0 && (isSpacePressed || toolMode === 'pan'))) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (e.button !== 0) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const pt = screenToCanvas(e.clientX, e.clientY, rect, pan.x, pan.y, zoom);

    if (toolMode === 'frame') {
      setDrawingNewFrame({
        startX: pt.x,
        startY: pt.y,
        currentX: pt.x,
        currentY: pt.y,
      });
      return;
    }

    if (toolMode === 'lasso') {
      lassoAppendRef.current = e.shiftKey || e.ctrlKey || e.metaKey;
      if (!lassoAppendRef.current) {
        setSelectedPersonIds([]);
        setSelectedFrameIds([]);
        setSelectedRelIds([]);
      }
      setLassoPoints([pt]);
      return;
    }

    const append = e.shiftKey || e.ctrlKey || e.metaKey;
    if (!append) {
      setSelectedPersonIds([]);
      setSelectedFrameIds([]);
      setSelectedRelIds([]);
    }
    setMarqueeBox({
      startX: pt.x,
      startY: pt.y,
      currentX: pt.x,
      currentY: pt.y,
      append,
    });
  };

  // Global mousemove & mouseup for gestures and draggable menu bar
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 0. Dragging the Floating Menu Bar
      if (isDraggingToolbar && containerRef.current) {
        const deltaX = e.clientX - toolbarDragStartRef.current.mouseX;
        const deltaY = e.clientY - toolbarDragStartRef.current.mouseY;
        const rect = containerRef.current.getBoundingClientRect();
        const isHoriz = toolbarPosRef.current.orientation === 'horizontal';
        const barW = isHoriz ? 410 : 54;
        const barH = isHoriz ? 54 : 410;
        const nextX = Math.max(10, Math.min(rect.width - barW - 10, toolbarDragStartRef.current.startX + deltaX));
        const nextY = Math.max(10, Math.min(rect.height - barH - 10, toolbarDragStartRef.current.startY + deltaY));
        const updated = { ...toolbarPosRef.current, x: nextX, y: nextY };
        setToolbarPos(updated);
        toolbarPosRef.current = updated;
        return;
      }

      // 1. Panning canvas
      if (isPanning) {
        setPan({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
        return;
      }

      // 2. Resizing GroupFrame
      if (resizingFrameId) {
        const deltaX = (e.clientX - resizeStartMouseRef.current.x) / zoom;
        const deltaY = (e.clientY - resizeStartMouseRef.current.y) / zoom;
        const newW = Math.max(180, Math.round(resizeInitialSizeRef.current.width + deltaX));
        const newH = Math.max(140, Math.round(resizeInitialSizeRef.current.height + deltaY));
        onUpdateFrame(resizingFrameId, { width: newW, height: newH });
        return;
      }

      // 3. Batch dragging selected Person cards & GroupFrames
      if (isDraggingSelection) {
        const deltaX = (e.clientX - dragStartMouseRef.current.x) / zoom;
        const deltaY = (e.clientY - dragStartMouseRef.current.y) / zoom;

        const personMoves: { id: string; x: number; y: number }[] = [];
        initialPersonPositionsRef.current.forEach((initPos, id) => {
          personMoves.push({
            id,
            x: Math.round(initPos.x + deltaX),
            y: Math.round(initPos.y + deltaY),
          });
        });

        const frameMoves: { id: string; x: number; y: number }[] = [];
        initialFramePositionsRef.current.forEach((initPos, id) => {
          frameMoves.push({
            id,
            x: Math.round(initPos.x + deltaX),
            y: Math.round(initPos.y + deltaY),
          });
        });

        if (personMoves.length > 0 || frameMoves.length > 0) {
          onBatchUpdatePositions(personMoves, frameMoves);
        }
        return;
      }

      // 4. Drawing a new GroupFrame
      if (drawingNewFrame && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const pt = screenToCanvas(e.clientX, e.clientY, rect, pan.x, pan.y, zoom);
        setDrawingNewFrame((prev) => (prev ? { ...prev, currentX: pt.x, currentY: pt.y } : null));
        return;
      }

      // 5. Rectangle Marquee Selection
      if (marqueeBox && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const pt = screenToCanvas(e.clientX, e.clientY, rect, pan.x, pan.y, zoom);
        setMarqueeBox((prev) => (prev ? { ...prev, currentX: pt.x, currentY: pt.y } : null));

        const boxRect = {
          x: Math.min(marqueeBox.startX, pt.x),
          y: Math.min(marqueeBox.startY, pt.y),
          width: Math.abs(pt.x - marqueeBox.startX),
          height: Math.abs(pt.y - marqueeBox.startY),
        };

        if (boxRect.width > 4 || boxRect.height > 4) {
          const hitPeople = canvasPeople
            .filter((p) =>
              isRectIntersecting(boxRect, {
                x: p.x,
                y: p.y,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
              })
            )
            .map((p) => p.id);

          const hitFrames = visibleFrames
            .filter(
              (f) =>
                !f.locked &&
                isRectIntersecting(boxRect, {
                  x: f.x,
                  y: f.y,
                  width: f.width,
                  height: f.height,
                })
            )
            .map((f) => f.id);

          if (marqueeBox.append) {
            setSelectedPersonIds((prev) => Array.from(new Set([...prev, ...hitPeople])));
            setSelectedFrameIds((prev) => Array.from(new Set([...prev, ...hitFrames])));
          } else {
            setSelectedPersonIds(hitPeople);
            setSelectedFrameIds(hitFrames);
          }
        }
        return;
      }

      // 6. Freehand Lasso Selection
      if (lassoPoints && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const pt = screenToCanvas(e.clientX, e.clientY, rect, pan.x, pan.y, zoom);
        setLassoPoints((prev) => {
          if (!prev) return null;
          const last = prev[prev.length - 1];
          if (Math.hypot(pt.x - last.x, pt.y - last.y) < 6) return prev;
          const next = [...prev, pt];

          if (next.length >= 3) {
            const hitPeople = canvasPeople
              .filter((p) =>
                isPointInPolygon(
                  { x: p.x + CARD_WIDTH / 2, y: p.y + CARD_HEIGHT / 2 },
                  next
                )
              )
              .map((p) => p.id);

            const hitFrames = visibleFrames
              .filter(
                (f) =>
                  !f.locked &&
                  isPointInPolygon(
                    { x: f.x + f.width / 2, y: f.y + f.height / 2 },
                    next
                  )
              )
              .map((f) => f.id);

            if (lassoAppendRef.current) {
              setSelectedPersonIds((prevIds) => Array.from(new Set([...prevIds, ...hitPeople])));
              setSelectedFrameIds((prevIds) => Array.from(new Set([...prevIds, ...hitFrames])));
            } else {
              setSelectedPersonIds(hitPeople);
              setSelectedFrameIds(hitFrames);
            }
          }
          return next;
        });
        return;
      }

      // 7. Drawing connection from anchor
      if (drawingConnection && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const currentCanvasPoint = screenToCanvas(e.clientX, e.clientY, rect, pan.x, pan.y, zoom);

        let targetId: string | undefined = undefined;
        let targetAnchor: AnchorPosition | undefined = undefined;

        for (const person of canvasPeople) {
          if (person.id === drawingConnection.sourceId) continue;
          if (
            currentCanvasPoint.x >= person.x - 18 &&
            currentCanvasPoint.x <= person.x + CARD_WIDTH + 18 &&
            currentCanvasPoint.y >= person.y - 18 &&
            currentCanvasPoint.y <= person.y + CARD_HEIGHT + 18
          ) {
            targetId = person.id;
            targetAnchor = getClosestAnchor(currentCanvasPoint, {
              x: person.x,
              y: person.y,
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
            });
            break;
          }
        }

        setDrawingConnection((prev) =>
          prev ? { ...prev, currentPoint: currentCanvasPoint, targetId, targetAnchor } : null
        );
        return;
      }

      // 8. Dragging relationship label offset
      if (draggingLabelRelationId) {
        const deltaX = (e.clientX - labelDragStartMouseRef.current.x) / zoom;
        const deltaY = (e.clientY - labelDragStartMouseRef.current.y) / zoom;
        if (Math.hypot(deltaX, deltaY) > 3) {
          labelHasMovedRef.current = true;
        }
        const newOffsetX = Math.round(labelDragInitialOffsetRef.current.x + deltaX);
        const newOffsetY = Math.round(labelDragInitialOffsetRef.current.y + deltaY);
        onUpdateRelationshipOffset(draggingLabelRelationId, newOffsetX, newOffsetY);
        return;
      }
    };

    const handleMouseUp = () => {
      if (isDraggingToolbar) {
        setIsDraggingToolbar(false);
        saveToolbarPosition(toolbarPosRef.current);
      }
      if (isPanning) setIsPanning(false);
      if (resizingFrameId) setResizingFrameId(null);
      if (isDraggingSelection) setIsDraggingSelection(false);

      if (drawingNewFrame) {
        const x = Math.round(Math.min(drawingNewFrame.startX, drawingNewFrame.currentX));
        const y = Math.round(Math.min(drawingNewFrame.startY, drawingNewFrame.currentY));
        const w = Math.round(Math.abs(drawingNewFrame.currentX - drawingNewFrame.startX));
        const h = Math.round(Math.abs(drawingNewFrame.currentY - drawingNewFrame.startY));
        onCreateFrameAt({
          title: language === 'zh' ? '新建阵营分组区' : 'New Group Frame',
          subtitle: language === 'zh' ? '核心决策与协同组' : 'Decision & Core Team',
          x,
          y,
          width: Math.max(260, w),
          height: Math.max(200, h),
          color: '#8B5CF6',
          zIndex: 15,
        });
        setDrawingNewFrame(null);
        setToolMode('select');
      }

      if (marqueeBox) {
        setMarqueeBox(null);
      }

      if (lassoPoints) {
        setLassoPoints(null);
      }

      if (drawingConnection) {
        if (drawingConnection.targetId && drawingConnection.targetAnchor) {
          onConnect(
            drawingConnection.sourceId,
            drawingConnection.targetId,
            drawingConnection.sourceAnchor,
            drawingConnection.targetAnchor
          );
        }
        setDrawingConnection(null);
      }

      if (draggingLabelRelationId) {
        setDraggingLabelRelationId(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isDraggingToolbar,
    toolbarPos,
    isPanning,
    resizingFrameId,
    isDraggingSelection,
    drawingNewFrame,
    marqueeBox,
    lassoPoints,
    drawingConnection,
    draggingLabelRelationId,
    zoom,
    pan,
    canvasPeople,
    visibleFrames,
    language,
    onBatchUpdatePositions,
    onUpdateFrame,
    onCreateFrameAt,
    onConnect,
    onUpdateRelationshipOffset,
  ]);

  // Initiate dragging on a Person Card
  const handleCardMouseDown = (e: React.MouseEvent, person: Person) => {
    setContextMenu(null);
    if (e.button !== 0) return;
    e.stopPropagation();

    if (isSpacePressed || toolMode === 'pan') {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (toolMode === 'connect') {
      if (!connectModeSourceId) {
        setConnectModeSourceId(person.id);
      } else if (connectModeSourceId !== person.id) {
        const sourcePerson = peopleMap.get(connectModeSourceId);
        if (sourcePerson) {
          const sAnchor = getClosestAnchor(
            { x: person.x, y: person.y },
            { x: sourcePerson.x, y: sourcePerson.y, width: CARD_WIDTH, height: CARD_HEIGHT }
          );
          const tAnchor = getClosestAnchor(
            { x: sourcePerson.x, y: sourcePerson.y },
            { x: person.x, y: person.y, width: CARD_WIDTH, height: CARD_HEIGHT }
          );
          onConnect(connectModeSourceId, person.id, sAnchor, tAnchor);
        }
        setConnectModeSourceId(null);
      }
      return;
    }

    let nextSelectedPeople = selectedPersonIds;
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (selectedPersonIds.includes(person.id)) {
        nextSelectedPeople = selectedPersonIds.filter((id) => id !== person.id);
      } else {
        nextSelectedPeople = [...selectedPersonIds, person.id];
      }
      setSelectedPersonIds(nextSelectedPeople);
    } else if (!selectedPersonIds.includes(person.id)) {
      nextSelectedPeople = [person.id];
      setSelectedPersonIds([person.id]);
      setSelectedFrameIds([]);
      setSelectedRelIds([]);
    }

    if (person.locked) return;

    const pMap = new Map<string, Point>();
    nextSelectedPeople.forEach((id) => {
      const p = peopleMap.get(id);
      if (p && !p.locked) {
        pMap.set(id, { x: p.x, y: p.y });
      }
    });

    const fMap = new Map<string, Point>();
    selectedFrameIds.forEach((id) => {
      const f = visibleFrames.find((fr) => fr.id === id);
      if (f && !f.locked) {
        fMap.set(id, { x: f.x, y: f.y });
      }
    });

    initialPersonPositionsRef.current = pMap;
    initialFramePositionsRef.current = fMap;
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    setIsDraggingSelection(true);
  };

  // Initiate dragging on a GroupFrame
  const handleFrameMouseDown = (e: React.MouseEvent, frame: GroupFrame) => {
    setContextMenu(null);
    if (e.button !== 0) return;
    e.stopPropagation();

    if (isSpacePressed || toolMode === 'pan') {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    let nextSelectedFrames = selectedFrameIds;
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (selectedFrameIds.includes(frame.id)) {
        nextSelectedFrames = selectedFrameIds.filter((id) => id !== frame.id);
      } else {
        nextSelectedFrames = [...selectedFrameIds, frame.id];
      }
      setSelectedFrameIds(nextSelectedFrames);
    } else if (!selectedFrameIds.includes(frame.id)) {
      nextSelectedFrames = [frame.id];
      setSelectedFrameIds([frame.id]);
      setSelectedPersonIds([]);
      setSelectedRelIds([]);
    }

    if (frame.locked) return;

    const pMap = new Map<string, Point>();
    selectedPersonIds.forEach((id) => {
      const p = peopleMap.get(id);
      if (p && !p.locked) pMap.set(id, { x: p.x, y: p.y });
    });

    if (!e.altKey) {
      canvasPeople.forEach((p) => {
        if (
          !p.locked &&
          p.x >= frame.x &&
          p.x + CARD_WIDTH <= frame.x + frame.width &&
          p.y >= frame.y &&
          p.y + CARD_HEIGHT <= frame.y + frame.height
        ) {
          pMap.set(p.id, { x: p.x, y: p.y });
        }
      });
    }

    const fMap = new Map<string, Point>();
    nextSelectedFrames.forEach((id) => {
      const f = visibleFrames.find((fr) => fr.id === id);
      if (f && !f.locked) {
        fMap.set(id, { x: f.x, y: f.y });
      }
    });

    initialPersonPositionsRef.current = pMap;
    initialFramePositionsRef.current = fMap;
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    setIsDraggingSelection(true);
  };

  // Anchor Mouse Down
  const handleAnchorMouseDown = (
    e: React.MouseEvent,
    personId: string,
    anchor: AnchorPosition
  ) => {
    e.stopPropagation();
    setContextMenu(null);
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const startPoint = screenToCanvas(e.clientX, e.clientY, rect, pan.x, pan.y, zoom);

    setDrawingConnection({
      sourceId: personId,
      sourceAnchor: anchor,
      currentPoint: startPoint,
    });
  };

  // Label Mouse Down
  const handleLabelMouseDown = (e: React.MouseEvent, rel: Relationship) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setContextMenu(null);
    setSelectedRelIds([rel.id]);
    if (rel.locked) return;
    setDraggingLabelRelationId(rel.id);
    labelDragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    labelDragInitialOffsetRef.current = { x: rel.offsetX || 0, y: rel.offsetY || 0 };
    labelHasMovedRef.current = false;
  };

  const handleLabelClick = (e: React.MouseEvent, rel: Relationship) => {
    e.stopPropagation();
    if (!labelHasMovedRef.current) {
      onEditRelationship(rel);
    }
  };

  // Custom Context Menu Handler
  const openContextMenu = (
    e: React.MouseEvent,
    targetType: 'canvas' | 'person' | 'frame' | 'relationship',
    targetId?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const canvasPt = screenToCanvas(e.clientX, e.clientY, rect, pan.x, pan.y, zoom);

    if (targetType === 'person' && targetId) {
      if (!selectedPersonIds.includes(targetId)) {
        setSelectedPersonIds([targetId]);
        setSelectedFrameIds([]);
        setSelectedRelIds([]);
      }
    } else if (targetType === 'frame' && targetId) {
      if (!selectedFrameIds.includes(targetId)) {
        setSelectedFrameIds([targetId]);
        setSelectedPersonIds([]);
        setSelectedRelIds([]);
      }
    } else if (targetType === 'relationship' && targetId) {
      setSelectedRelIds([targetId]);
      setSelectedPersonIds([]);
      setSelectedFrameIds([]);
    }

    const menuX = Math.min(e.clientX - rect.left, rect.width - 250);
    const menuY = Math.min(e.clientY - rect.top, rect.height - 350);

    setContextMenu({
      x: Math.max(12, menuX),
      y: Math.max(12, menuY),
      canvasX: Math.round(canvasPt.x),
      canvasY: Math.round(canvasPt.y),
      targetType,
      targetId,
    });
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const canvasPoint = screenToCanvas(e.clientX, e.clientY, rect, pan.x, pan.y, zoom);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onDropImageFile(
          file,
          Math.round(canvasPoint.x - CARD_WIDTH / 2),
          Math.round(canvasPoint.y - CARD_HEIGHT / 2)
        );
        return;
      }
    }

    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.personId) {
          onDropPersonToCanvas(
            parsed.personId,
            Math.round(canvasPoint.x - CARD_WIDTH / 2),
            Math.round(canvasPoint.y - CARD_HEIGHT / 2)
          );
        }
      }
    } catch (err) {
      console.warn('Canvas drop parse error:', err);
    }
  };

  const handleSelectCardsInFrame = (frame: GroupFrame) => {
    const insideIds = canvasPeople
      .filter(
        (p) =>
          p.x + CARD_WIDTH / 2 >= frame.x &&
          p.x + CARD_WIDTH / 2 <= frame.x + frame.width &&
          p.y + CARD_HEIGHT / 2 >= frame.y &&
          p.y + CARD_HEIGHT / 2 <= frame.y + frame.height
      )
      .map((p) => p.id);
    setSelectedPersonIds(insideIds);
    setSelectedFrameIds([frame.id]);
  };

  const handleSelectLayerItem = (kind: LayerItemKind, id: string) => {
    if (kind === 'person') {
      setSelectedPersonIds([id]);
      setSelectedFrameIds([]);
      setSelectedRelIds([]);
      const p = people.find((item) => item.id === id);
      if (p) centerOnCoords(p.x + CARD_WIDTH / 2, p.y + CARD_HEIGHT / 2);
    } else if (kind === 'frame') {
      setSelectedFrameIds([id]);
      setSelectedPersonIds([]);
      setSelectedRelIds([]);
      const f = groupFrames.find((item) => item.id === id);
      if (f) centerOnCoords(f.x + f.width / 2, f.y + f.height / 2);
    } else if (kind === 'relationship') {
      setSelectedRelIds([id]);
      setSelectedPersonIds([]);
      setSelectedFrameIds([]);
      const r = relationships.find((item) => item.id === id);
      if (r) {
        const s = peopleMap.get(r.sourceId);
        const t = peopleMap.get(r.targetId);
        if (s && t) {
          centerOnCoords((s.x + t.x) / 2 + CARD_WIDTH / 2, (s.y + t.y) / 2 + CARD_HEIGHT / 2);
        }
      }
    }
  };

  const totalSelectedCount =
    selectedPersonIds.length + selectedFrameIds.length + selectedRelIds.length;

  const cursorClass =
    isPanning || isSpacePressed || toolMode === 'pan'
      ? 'cursor-grab active:cursor-grabbing'
      : toolMode === 'marquee' || toolMode === 'lasso' || toolMode === 'frame' || toolMode === 'connect'
      ? 'cursor-crosshair'
      : 'cursor-default';

  return (
    <div
      ref={containerRef}
      onMouseDown={handleBackgroundMouseDown}
      onContextMenu={(e) => openContextMenu(e, 'canvas')}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
      className={`relative flex-1 h-full w-full overflow-hidden select-none transition-colors duration-200 ${cursorClass}`}
      style={{
        backgroundColor: activeBgConfig.backgroundColor,
        backgroundImage: activeBgConfig.backgroundImage,
        backgroundSize:
          activeBgConfig.backgroundSize === 'auto'
            ? 'auto'
            : `${(parseInt(activeBgConfig.backgroundSize || '24') || 24) * zoom}px ${(parseInt(activeBgConfig.backgroundSize || '24') || 24) * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Draggable BoardMix-Style Menu Bar / Toolbar Dock */}
      <div
        style={{ left: `${toolbarPos.x}px`, top: `${toolbarPos.y}px` }}
        className={`absolute z-25 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl p-1.5 flex ${
          toolbarPos.orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col items-center'
        } gap-1 text-slate-600 transition-shadow ${
          isDraggingToolbar ? 'shadow-2xl ring-2 ring-blue-500/30' : ''
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Minimalist Drag Handle Grip */}
        <div
          onMouseDown={handleToolbarGripMouseDown}
          onDoubleClick={() => {
            const reset = { x: 20, y: 140, orientation: toolbarPos.orientation };
            setToolbarPos(reset);
            toolbarPosRef.current = reset;
            saveToolbarPosition(reset);
          }}
          className={`${
            toolbarPos.orientation === 'horizontal' ? 'px-1.5 py-2' : 'w-full py-1'
          } flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors`}
          title={`${t('toolDragHandle')} · ${t('toolResetPosition')}`}
        >
          <GripVertical
            className={`w-3.5 h-3.5 ${toolbarPos.orientation === 'horizontal' ? '' : 'rotate-90'}`}
            strokeWidth={1.5}
          />
        </div>

        {[
          { mode: 'select' as CanvasToolMode, label: t('toolSelect'), icon: MousePointer },
          { mode: 'pan' as CanvasToolMode, label: t('toolPan'), icon: Hand },
          { mode: 'marquee' as CanvasToolMode, label: t('toolMarquee'), icon: BoxSelect },
          { mode: 'lasso' as CanvasToolMode, label: t('toolLasso'), icon: Lasso },
          { mode: 'connect' as CanvasToolMode, label: t('toolConnect'), icon: Link2 },
          { mode: 'frame' as CanvasToolMode, label: t('toolFrame'), icon: Frame },
        ].map((item) => {
          const Icon = item.icon;
          const active = toolMode === item.mode;
          return (
            <button
              key={item.mode}
              type="button"
              onClick={() => {
                setToolMode(item.mode);
                setConnectModeSourceId(null);
              }}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} />
            </button>
          );
        })}

        <div
          className={
            toolbarPos.orientation === 'horizontal'
              ? 'w-[1px] h-6 bg-slate-200 mx-0.5'
              : 'w-6 h-[1px] bg-slate-200 my-0.5'
          }
        />

        {/* Quick Create Person at Viewport Center */}
        <button
          type="button"
          onClick={() => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const centerPt = screenToCanvas(
              rect.left + rect.width / 2,
              rect.top + rect.height / 2,
              rect,
              pan.x,
              pan.y,
              zoom
            );
            onCreatePersonAt(
              Math.round(centerPt.x - CARD_WIDTH / 2),
              Math.round(centerPt.y - CARD_HEIGHT / 2)
            );
          }}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title={t('toolAddPersonCenter')}
        >
          <UserPlus className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
        </button>

        {/* Toggle Layer Manager Panel */}
        <button
          type="button"
          onClick={onToggleLayerPanel}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            isLayerPanelOpen
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
          title={t('toolLayerPanel')}
        >
          <Layers className="w-4 h-4" strokeWidth={1.5} />
        </button>

        {/* Toggle Horizontal / Vertical Orientation */}
        <button
          type="button"
          onClick={toggleToolbarOrientation}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          title={`${t('toolOrientationToggle')} (${toolbarPos.orientation === 'horizontal' ? t('orientationHorizontal') : t('orientationVertical')})`}
        >
          <Columns
            className={`w-4 h-4 ${toolbarPos.orientation === 'horizontal' ? 'rotate-90' : ''}`}
            strokeWidth={1.5}
          />
        </button>
      </div>

      {/* Top Banner for Connect / Lasso / Frame Tool Modes */}
      {toolMode === 'connect' && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white px-4 py-1.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Link2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>
            {connectModeSourceId
              ? t('bannerConnectSourceSelected', { name: peopleMap.get(connectModeSourceId)?.name || '' })
              : t('bannerConnectIdle')}
          </span>
          <button
            type="button"
            onClick={() => {
              setConnectModeSourceId(null);
              setToolMode('select');
            }}
            className="ml-2 bg-blue-700 hover:bg-blue-800 px-2 py-0.5 rounded text-[11px] cursor-pointer"
          >
            {t('exitEsc')}
          </button>
        </div>
      )}

      {toolMode === 'lasso' && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-indigo-600 text-white px-4 py-1.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Lasso className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>{t('bannerLasso')}</span>
          <button
            type="button"
            onClick={() => setToolMode('select')}
            className="ml-2 bg-indigo-700 hover:bg-indigo-800 px-2 py-0.5 rounded text-[11px] cursor-pointer"
          >
            {t('switchBackSelect')}
          </button>
        </div>
      )}

      {toolMode === 'frame' && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-purple-600 text-white px-4 py-1.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Frame className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>{t('bannerFrame')}</span>
          <button
            type="button"
            onClick={() => setToolMode('select')}
            className="ml-2 bg-purple-700 hover:bg-purple-800 px-2 py-0.5 rounded text-[11px] cursor-pointer"
          >
            {t('cancelEsc')}
          </button>
        </div>
      )}

      {/* Floating Multi-Selection Batch Action Bar */}
      {totalSelectedCount > 0 && toolMode !== 'connect' && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white/98 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl px-3 py-1.5 flex items-center gap-2 text-xs text-slate-700 max-w-[92vw] overflow-x-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span className="font-bold text-blue-600 whitespace-nowrap font-mono tabular-nums px-1">
            {t('selectedCount', { count: totalSelectedCount })}
          </span>

          <div className="h-4 w-[1px] bg-slate-200 shrink-0" />

          {/* Alignment & Distribution Tools when 2+ Person cards are selected */}
          {selectedPersonIds.length >= 2 && (
            <>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onAlignPeople(selectedPersonIds, 'left')}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer"
                  title={t('alignLeft')}
                >
                  <AlignLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => onAlignPeople(selectedPersonIds, 'center-h')}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer"
                  title={t('alignCenterH')}
                >
                  <AlignCenterHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => onAlignPeople(selectedPersonIds, 'right')}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer"
                  title={t('alignRight')}
                >
                  <AlignRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => onAlignPeople(selectedPersonIds, 'top')}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer"
                  title={t('alignTop')}
                >
                  <AlignStartVertical className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => onAlignPeople(selectedPersonIds, 'center-v')}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer"
                  title={t('alignCenterV')}
                >
                  <AlignCenterVertical className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => onAlignPeople(selectedPersonIds, 'bottom')}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer"
                  title={t('alignBottom')}
                >
                  <AlignEndVertical className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                {selectedPersonIds.length >= 3 && (
                  <>
                    <button
                      type="button"
                      onClick={() => onAlignPeople(selectedPersonIds, 'distribute-h')}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer"
                      title={t('distributeH')}
                    >
                      <Columns className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onAlignPeople(selectedPersonIds, 'distribute-v')}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer"
                      title={t('distributeV')}
                    >
                      <Rows className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </>
                )}
              </div>

              <div className="h-4 w-[1px] bg-slate-200 shrink-0" />

              {/* Group Selected People into a New GroupFrame */}
              <button
                type="button"
                onClick={() => onGroupPeopleIntoFrame(selectedPersonIds)}
                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-semibold flex items-center gap-1 shrink-0 cursor-pointer whitespace-nowrap"
                title={t('packIntoFrameTip')}
              >
                <Frame className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>{t('packIntoFrame')}</span>
              </button>

              <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
            </>
          )}

          {/* Layer Z-Order Controls */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onBatchMoveLayer(selectedPersonIds, selectedFrameIds, 'front')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 cursor-pointer"
              title={t('bringToFront')}
            >
              <ArrowUpToLine className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => onBatchMoveLayer(selectedPersonIds, selectedFrameIds, 'forward')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 cursor-pointer"
              title={t('bringForward')}
            >
              <ArrowUp className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => onBatchMoveLayer(selectedPersonIds, selectedFrameIds, 'backward')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 cursor-pointer"
              title={t('sendBackward')}
            >
              <ArrowDown className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => onBatchMoveLayer(selectedPersonIds, selectedFrameIds, 'back')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 cursor-pointer"
              title={t('sendToBack')}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Quick Color Swatches */}
          {selectedPersonIds.length > 0 && (
            <>
              <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
              <div className="flex items-center gap-1 shrink-0">
                {CARD_COLORS.slice(0, 6).map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => onBatchUpdatePeople(selectedPersonIds, { cardColor: c.value })}
                    className="w-4 h-4 rounded-full border border-white shadow-2xs hover:scale-120 transition-transform cursor-pointer"
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>

              <div className="h-4 w-[1px] bg-slate-200 shrink-0" />

              {/* Duplicate & Remove */}
              <button
                type="button"
                onClick={() => onDuplicatePeople(selectedPersonIds, 36, 36)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer"
                title={t('duplicateCards')}
              >
                <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => {
                  onBatchRemoveFromCanvas(selectedPersonIds);
                  setSelectedPersonIds([]);
                }}
                className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600 cursor-pointer"
                title={t('removeCardsFromCanvas')}
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Shared SVG Filter Defs */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="line-glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#06b6d4" floodOpacity="0.85" />
          </filter>
          <filter id="line-glow-purple" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#9333ea" floodOpacity="0.9" />
          </filter>
          <filter id="line-glow-gold" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#d97706" floodOpacity="0.85" />
          </filter>
          <filter id="line-shadow-3d" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="1.5" dy="3.5" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.35" />
          </filter>
          <linearGradient id="line-grad-twilight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="50%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>

      {/* World Container with Pan & Zoom Transform */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* 1. Interactive Faction Group Frames */}
        {visibleFrames.map((frame) => {
          const isFrameSelected = selectedFrameIds.includes(frame.id);
          return (
            <div
              key={frame.id}
              style={{
                transform: `translate3d(${frame.x}px, ${frame.y}px, 0)`,
                width: frame.width,
                height: frame.height,
                zIndex: frame.zIndex ?? 10,
                borderColor: isFrameSelected ? '#2563EB' : `${frame.color}77`,
                backgroundColor: `${frame.color}0B`,
              }}
              onMouseDown={(e) => handleFrameMouseDown(e, frame)}
              onContextMenu={(e) => openContextMenu(e, 'frame', frame.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onEditFrame(frame);
              }}
              className={`absolute top-0 left-0 rounded-2xl border-2 border-dashed pointer-events-auto select-none transition-shadow ${
                isFrameSelected ? 'ring-3 ring-blue-500/30 shadow-lg' : ''
              } ${frame.locked ? 'cursor-default' : 'cursor-move'}`}
            >
              {/* Frame Title Bar */}
              <div
                style={{
                  borderColor: `${frame.color}88`,
                  color: frame.color,
                  backgroundColor: activeBgConfig.isDark ? '#0f172a' : '#ffffff',
                }}
                className="absolute -top-3.5 left-3.5 px-2.5 py-0.5 rounded-md border text-[11px] font-bold shadow-2xs flex items-center gap-1.5"
              >
                {frame.locked && <Lock className="w-3 h-3 opacity-70" strokeWidth={1.5} />}
                <span>{frame.title}</span>
                {frame.subtitle && (
                  <span className="text-[10px] font-normal opacity-75">· {frame.subtitle}</span>
                )}
              </div>

              {/* Bottom-Right Resize Handle */}
              {!frame.locked && (
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setResizingFrameId(frame.id);
                    resizeStartMouseRef.current = { x: e.clientX, y: e.clientY };
                    resizeInitialSizeRef.current = {
                      width: frame.width,
                      height: frame.height,
                    };
                  }}
                  className="absolute bottom-1 right-1 w-4 h-4 rounded-sm bg-white/90 border border-slate-400 cursor-nwse-resize flex items-center justify-center opacity-60 hover:opacity-100 hover:border-blue-600 transition-opacity"
                  title="调整分组框尺寸"
                >
                  <div className="w-1.5 h-1.5 border-r border-b border-slate-600" />
                </div>
              )}
            </div>
          );
        })}

        {/* 2. Established Relationships */}
        {visibleRelationships.map((rel) => {
          const source = peopleMap.get(rel.sourceId);
          const target = peopleMap.get(rel.targetId);
          if (!source || !target) return null;

          const isPathEdge = isRelInPath?.has(`${rel.sourceId}->${rel.targetId}`) || false;
          const isRelHighlighted = isRelInPath
            ? isPathEdge
            : !connectedIds || (connectedIds.has(rel.sourceId) && connectedIds.has(rel.targetId));
          const isRelSelected = selectedRelIds.includes(rel.id);

          const p1 = getAnchorPoint(
            { x: source.x, y: source.y, width: CARD_WIDTH, height: CARD_HEIGHT },
            rel.sourceAnchor || 'right'
          );
          const p2 = getAnchorPoint(
            { x: target.x, y: target.y, width: CARD_WIDTH, height: CARD_HEIGHT },
            rel.targetAnchor || 'left'
          );

          const effectiveLineType = rel.lineStyle || activeLineConfig.lineType;
          const { path, midPoint } = calculateConnectionPath(
            p1,
            p2,
            rel.sourceAnchor || 'right',
            rel.targetAnchor || 'left',
            effectiveLineType,
            rel.offsetX || 0,
            rel.offsetY || 0
          );

          const strength = calculateRelationshipStrength(rel, source, target, visits);

          const isTwilight = activeLineConfig.id === 'gradient-twilight';
          const baseStrokeColor = isPathEdge
            ? '#6366F1'
            : showStrengthHeatmap
            ? strength.color
            : isTwilight
            ? 'url(#line-grad-twilight)'
            : activeLineConfig.glowEffect === 'neon-cyan'
            ? '#06B6D4'
            : activeLineConfig.glowEffect === 'neon-purple'
            ? '#A855F7'
            : activeLineConfig.glowEffect === 'gold'
            ? '#D97706'
            : rel.color || '#3B82F6';

          const strokeFilter =
            activeLineConfig.glowEffect === 'neon-cyan'
              ? 'url(#line-glow-cyan)'
              : activeLineConfig.glowEffect === 'neon-purple'
              ? 'url(#line-glow-purple)'
              : activeLineConfig.glowEffect === 'gold'
              ? 'url(#line-glow-gold)'
              : activeLineConfig.glowEffect === 'shadow-3d'
              ? 'url(#line-shadow-3d)'
              : undefined;

          const strokeWidth = isPathEdge
            ? 4.2
            : isRelSelected
            ? 4.0
            : showStrengthHeatmap
            ? isRelHighlighted && connectedIds
              ? Math.max(strength.strokeWidth + 1.0, 3.4)
              : strength.strokeWidth
            : isRelHighlighted && connectedIds
            ? Math.max(activeLineConfig.strokeWidth + 0.8, 3.2)
            : activeLineConfig.strokeWidth;

          const dashArray = rel.lineStyle ? undefined : activeLineConfig.strokeDasharray;

          const labelX = midPoint.x + (rel.offsetX || 0);
          const labelY = midPoint.y + (rel.offsetY || 0);
          const badgeText = showStrengthHeatmap
            ? `${rel.label} · ${strength.score}`
            : rel.label;

          const rawDesc = (rel.description ?? '').trim();
          const showDescOnLine = rel.showDescriptionOnCanvas !== false && rawDesc.length > 0;
          const displayDesc = rawDesc.length > 24 ? `${rawDesc.slice(0, 23)}…` : rawDesc;

          const measureVisualWidth = (text: string, fontPx: number) => {
            let w = 0;
            for (let i = 0; i < text.length; i++) {
              w += text.charCodeAt(i) > 255 ? fontPx * 1.04 : fontPx * 0.62;
            }
            return w;
          };

          const mainTextW = measureVisualWidth(badgeText, 11) + 22;
          const descTextW = showDescOnLine ? measureVisualWidth(displayDesc, 9.5) + 24 : 0;
          const badgeWidth = Math.max(72, Math.ceil(Math.max(mainTextW, descTextW)));
          const badgeHeight = showDescOnLine ? 42 : 24;

          const isRiskDesc = /(风险|预警|冲标|卡点|排他|受阻|博弈|Risk|Alert|Blocker)/i.test(rawDesc);
          const isProgressDesc = /(审批|进度|通过|会签|过会|完成|批复|认可|Approval|Approved)/i.test(rawDesc);
          const descTextColor = isRiskDesc
            ? activeBgConfig.isDark
              ? '#fbbf24'
              : '#d97706'
            : isProgressDesc
            ? activeBgConfig.isDark
              ? '#34d399'
              : '#059669'
            : activeBgConfig.isDark
            ? '#cbd5e1'
            : '#475569';

          const descPillBg = isRiskDesc
            ? activeBgConfig.isDark
              ? 'rgba(245, 158, 11, 0.16)'
              : '#fffbeb'
            : isProgressDesc
            ? activeBgConfig.isDark
              ? 'rgba(16, 185, 129, 0.16)'
              : '#ecfdf5'
            : activeBgConfig.isDark
            ? 'rgba(148, 163, 184, 0.14)'
            : '#f8fafc';

          const isHovered = hoveredRelId === rel.id;
          const extraTooltipLines: string[] = [];
          if (rawDesc) {
            extraTooltipLines.push(rawDesc.length > 32 ? `${rawDesc.slice(0, 31)}…` : rawDesc);
          }
          if (rel.notes && rel.notes.trim() && rel.notes.trim() !== rawDesc) {
            const cleanNotes = rel.notes.trim();
            extraTooltipLines.push(cleanNotes.length > 32 ? `${cleanNotes.slice(0, 31)}…` : cleanNotes);
          }
          const tooltipHeight = 44 + extraTooltipLines.length * 15;
          const tooltipWidth = Math.max(
            236,
            ...extraTooltipLines.map((line) => Math.ceil(measureVisualWidth(line, 9.5) + 32))
          );

          return (
            <svg
              key={rel.id}
              className="absolute top-0 left-0 overflow-visible pointer-events-none"
              style={{
                width: 1,
                height: 1,
                zIndex: isHovered ? 950 : (rel.zIndex ?? 60),
              }}
            >
              <g
                className="group pointer-events-auto transition-opacity duration-200"
                opacity={isRelHighlighted ? 1 : 0.14}
                onMouseEnter={() => setHoveredRelId(rel.id)}
                onMouseLeave={() => setHoveredRelId(null)}
                onContextMenu={(e) => openContextMenu(e, 'relationship', rel.id)}
              >
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={22}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRelIds([rel.id]);
                    onEditRelationship(rel);
                  }}
                />

                <path
                  d={path}
                  fill="none"
                  stroke={baseStrokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={dashArray}
                  strokeLinecap="round"
                  filter={strokeFilter}
                  className={`transition-colors duration-200 ${
                    isPathEdge
                      ? 'animate-pulse'
                      : activeLineConfig.animated
                      ? 'animate-flow-dash'
                      : 'group-hover:opacity-90'
                  }`}
                />

                {activeLineConfig.doubleLine && (
                  <path
                    d={path}
                    fill="none"
                    stroke={activeBgConfig.isDark ? '#0a0f1d' : '#ffffff'}
                    strokeWidth={strokeWidth * 0.4}
                    strokeLinecap="round"
                  />
                )}

                {activeLineConfig.arrowType === 'diamond' ? (
                  <polygon
                    points={`${p2.x},${p2.y - 5} ${p2.x + 5},${p2.y} ${p2.x},${p2.y + 5} ${p2.x - 5},${p2.y}`}
                    fill={isPathEdge ? '#6366F1' : baseStrokeColor}
                  />
                ) : activeLineConfig.arrowType === 'both' || rel.arrow === 'both' ? (
                  <>
                    <circle
                      cx={p1.x}
                      cy={p1.y}
                      r={Math.max(3.5, strokeWidth * 0.85)}
                      fill={isPathEdge ? '#6366F1' : baseStrokeColor}
                    />
                    <circle
                      cx={p2.x}
                      cy={p2.y}
                      r={Math.max(4, strokeWidth * 0.95)}
                      fill={isPathEdge ? '#6366F1' : baseStrokeColor}
                    />
                  </>
                ) : rel.arrow === 'none' ? null : (
                  <circle
                    cx={p2.x}
                    cy={p2.y}
                    r={isPathEdge ? 5 : Math.max(3.5, strokeWidth * 0.85)}
                    fill={isPathEdge ? '#6366F1' : baseStrokeColor}
                  />
                )}

                <g
                  transform={`translate(${labelX}, ${labelY})`}
                  className="cursor-move select-none"
                  onMouseDown={(e) => handleLabelMouseDown(e, rel)}
                  onClick={(e) => handleLabelClick(e, rel)}
                >
                  <rect
                    x={-badgeWidth / 2}
                    y={-badgeHeight / 2}
                    width={badgeWidth}
                    height={badgeHeight}
                    rx={7}
                    fill={activeBgConfig.isDark ? '#1e293b' : '#ffffff'}
                    stroke={isRelSelected ? '#2563EB' : baseStrokeColor}
                    strokeWidth={isRelSelected ? 2.2 : 1.6}
                    className="shadow-xs hover:shadow-md transition-shadow"
                  />
                  {showDescOnLine ? (
                    <>
                      <text
                        x={0}
                        y={-5}
                        textAnchor="middle"
                        fill={activeBgConfig.isDark ? '#f8fafc' : baseStrokeColor}
                        fontSize={11}
                        fontWeight={600}
                        className="pointer-events-none"
                      >
                        {badgeText}
                      </text>
                      <rect
                        x={-badgeWidth / 2 + 4}
                        y={1}
                        width={badgeWidth - 8}
                        height={16}
                        rx={4}
                        fill={descPillBg}
                        className="pointer-events-none"
                      />
                      <text
                        x={0}
                        y={12}
                        textAnchor="middle"
                        fill={descTextColor}
                        fontSize={9.5}
                        fontWeight={500}
                        className="pointer-events-none"
                      >
                        {displayDesc}
                      </text>
                    </>
                  ) : (
                    <text
                      x={0}
                      y={4}
                      textAnchor="middle"
                      fill={activeBgConfig.isDark ? '#f8fafc' : baseStrokeColor}
                      fontSize={11}
                      fontWeight={600}
                      className="pointer-events-none"
                    >
                      {badgeText}
                    </text>
                  )}
                </g>

                {isHovered && (
                  <g
                    transform={`translate(${labelX}, ${labelY - badgeHeight / 2 - tooltipHeight / 2 - 10})`}
                    className="pointer-events-none select-none"
                  >
                    <rect
                      x={-tooltipWidth / 2}
                      y={-tooltipHeight / 2}
                      width={tooltipWidth}
                      height={tooltipHeight}
                      rx="8"
                      fill={activeBgConfig.isDark ? '#0f172a' : '#1e293b'}
                      stroke={baseStrokeColor}
                      strokeWidth="1.2"
                      filter="url(#line-shadow-3d)"
                    />
                    <text
                      x="0"
                      y={-tooltipHeight / 2 + 16}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {strength.levelLabel} · {strength.score} ({rel.label})
                    </text>
                    <text
                      x="0"
                      y={-tooltipHeight / 2 + 31}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="8.5"
                    >
                      {strength.breakdown.templateLabel} | {strength.breakdown.visitsCount} visits | {strength.breakdown.stageLabel}
                    </text>
                    {extraTooltipLines.map((line, idx) => (
                      <text
                        key={idx}
                        x="0"
                        y={-tooltipHeight / 2 + 46 + idx * 15}
                        textAnchor="middle"
                        fill={idx === 0 && rawDesc ? '#38bdf8' : '#cbd5e1'}
                        fontSize="9"
                        fontWeight={idx === 0 && rawDesc ? '600' : '400'}
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                )}
              </g>
            </svg>
          );
        })}

        {/* 3. Person Cards Layer */}
        {canvasPeople.map((person) => {
          const isSelected = selectedPersonIds.includes(person.id);
          const isSelectedInConnect = connectModeSourceId === person.id;
          const isTargetInDrawing = drawingConnection?.targetId === person.id;
          const isCardDimmed =
            (connectedIds && !connectedIds.has(person.id)) ||
            (highlightedPathIds && !highlightedPathIds.includes(person.id));
          const isCardFocused = focusedPersonId === person.id;
          const isCardInPath = highlightedPathIds && highlightedPathIds.includes(person.id);
          const isDarkCard = activeCardConfig.isDarkCard;

          return (
            <div
              key={person.id}
              style={{
                transform: `translate3d(${person.x}px, ${person.y}px, 0)`,
                width: CARD_WIDTH,
                minHeight: CARD_HEIGHT,
                zIndex: isCardFocused || isCardInPath ? 900 : (person.zIndex ?? 100),
                backgroundColor:
                  activeCardConfig.accentStyle === 'full'
                    ? `${person.cardColor || '#3B82F6'}15`
                    : undefined,
                borderColor:
                  activeCardConfig.accentStyle === 'frame'
                    ? person.cardColor || '#3B82F6'
                    : undefined,
              }}
              onMouseEnter={() => setHoveredCardId(person.id)}
              onMouseLeave={() => setHoveredCardId(null)}
              onMouseDown={(e) => handleCardMouseDown(e, person)}
              onContextMenu={(e) => openContextMenu(e, 'person', person.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onEditPerson(person);
              }}
              className={`absolute top-0 left-0 border transition-shadow pointer-events-auto group ${
                person.locked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
              } ${activeCardConfig.roundedClass} ${activeCardConfig.bgClass} ${activeCardConfig.shadowClass} ${
                isCardFocused
                  ? 'ring-3 ring-blue-500 ring-offset-2 border-blue-500 shadow-lg'
                  : isCardInPath
                  ? 'ring-3 ring-indigo-500 ring-offset-2 border-indigo-500 shadow-xl scale-102'
                  : isSelected
                  ? 'ring-2 ring-blue-600 ring-offset-1 border-blue-600 shadow-md'
                  : isSelectedInConnect
                  ? 'ring-2 ring-blue-600 ring-offset-2 border-blue-600 shadow-md'
                  : isTargetInDrawing
                  ? 'ring-2 ring-emerald-500 ring-offset-2 border-emerald-500 shadow-md'
                  : isCardDimmed
                  ? 'opacity-25 filter grayscale-[40%] hover:opacity-80'
                  : activeCardConfig.borderClass
              }`}
            >
              {activeCardConfig.accentStyle === 'bar' && (
                <div
                  className="h-1.5 w-full rounded-t-xl"
                  style={{ backgroundColor: person.cardColor || '#3B82F6' }}
                />
              )}
              {activeCardConfig.accentStyle === 'glow' && (
                <div
                  className="h-1 w-full opacity-80"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${person.cardColor || '#06b6d4'}, transparent)`,
                  }}
                />
              )}

              {activeCardConfig.accentStyle === 'ribbon' && (
                <div className="absolute top-1 right-2 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400 text-amber-950 uppercase tracking-wider shadow-2xs">
                  VIP
                </div>
              )}

              <div className="p-3">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`relative w-11 h-11 rounded-lg overflow-hidden shrink-0 border flex items-center justify-center ${
                      isDarkCard
                        ? 'bg-slate-800 border-slate-700'
                        : 'bg-slate-100 border-slate-200/80'
                    }`}
                  >
                    {person.avatarUrl ? (
                      <img
                        src={person.avatarUrl}
                        alt={person.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span
                        className="text-sm font-bold text-white w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: person.cardColor || '#3B82F6' }}
                      >
                        {person.name.slice(0, 1)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 min-w-0">
                        <span
                          className={`text-xs font-bold truncate ${
                            isDarkCard ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {person.name}
                        </span>
                        {person.locked && (
                          <Lock className="w-2.5 h-2.5 text-amber-500 shrink-0" strokeWidth={1.5} />
                        )}
                      </div>

                      <div className="flex items-center gap-0.5">
                        {onOpenTimeline && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTimeline(person);
                            }}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isDarkCard
                                ? 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100'
                            }`}
                            title={t('ctxTimeline')}
                          >
                            <Clock className="w-3 h-3" strokeWidth={1.5} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetFocusedPersonId?.(focusedPersonId === person.id ? null : person.id);
                          }}
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            isCardFocused
                              ? 'text-blue-500 bg-blue-500/20'
                              : isDarkCard
                              ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-800'
                              : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                          }`}
                          title={isCardFocused ? t('ctxUnfocusNetwork') : t('ctxFocusNetwork')}
                        >
                          <GitFork className="w-3 h-3" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>

                    <div
                      className={`text-[11px] font-semibold truncate mt-0.5 ${
                        isDarkCard ? 'text-cyan-400' : 'text-blue-600'
                      }`}
                    >
                      {person.title}
                    </div>

                    {person.company && (
                      <div
                        className={`text-[10px] truncate flex items-center gap-1 mt-0.5 ${
                          isDarkCard ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        <Building2 className="w-2.5 h-2.5 opacity-70 shrink-0" strokeWidth={1.5} />
                        <span className="truncate">{person.company}</span>
                      </div>
                    )}
                  </div>
                </div>

                {person.bio && (
                  <p
                    className={`text-[10px] line-clamp-2 mt-2 leading-relaxed border-t pt-1.5 ${
                      isDarkCard
                        ? 'text-slate-400 border-slate-800'
                        : 'text-slate-500 border-slate-100'
                    }`}
                  >
                    {person.bio}
                  </p>
                )}

                <div
                  className={`mt-1.5 text-[9.5px] font-medium truncate ${
                    isDarkCard ? 'text-cyan-400/90' : 'text-blue-600/90'
                  }`}
                >
                  {person.specialty ? `${person.specialty} · ` : ''}
                  {person.relationshipStage === 'hot'
                    ? '🔥' + (language === 'zh' ? '热力铁杆' : 'Champion')
                    : person.relationshipStage === 'warm'
                    ? '🤝' + (language === 'zh' ? '温和支持' : 'Supporter')
                    : person.relationshipStage === 'cold'
                    ? '🧊' + (language === 'zh' ? '态度中立' : 'Neutral')
                    : person.relationshipStage === 'blocked'
                    ? '⛔' + (language === 'zh' ? '友商排他' : 'Competitor')
                    : '🧭' + (language === 'zh' ? '接触摸底' : 'Exploring')}
                </div>
              </div>

              {/* 4 Blue Glowing Anchors on Hover */}
              {(hoveredCardId === person.id || drawingConnection?.sourceId === person.id) && (
                <>
                  <button
                    type="button"
                    onMouseDown={(e) => handleAnchorMouseDown(e, person.id, 'top')}
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm hover:scale-130 hover:bg-blue-600 transition-transform cursor-crosshair z-30"
                    title={t('ctxConnectFromNode')}
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => handleAnchorMouseDown(e, person.id, 'right')}
                    className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm hover:scale-130 hover:bg-blue-600 transition-transform cursor-crosshair z-30"
                    title={t('ctxConnectFromNode')}
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => handleAnchorMouseDown(e, person.id, 'bottom')}
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm hover:scale-130 hover:bg-blue-600 transition-transform cursor-crosshair z-30"
                    title={t('ctxConnectFromNode')}
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => handleAnchorMouseDown(e, person.id, 'left')}
                    className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm hover:scale-130 hover:bg-blue-600 transition-transform cursor-crosshair z-30"
                    title={t('ctxConnectFromNode')}
                  />
                </>
              )}
            </div>
          );
        })}

        {/* 4. Interactive Overlay SVG Layer */}
        <svg
          className="absolute top-0 left-0 overflow-visible pointer-events-none"
          style={{ width: 1, height: 1, zIndex: 999 }}
        >
          {drawingConnection &&
            (() => {
              const source = peopleMap.get(drawingConnection.sourceId);
              if (!source) return null;
              const p1 = getAnchorPoint(
                { x: source.x, y: source.y, width: CARD_WIDTH, height: CARD_HEIGHT },
                drawingConnection.sourceAnchor
              );
              const p2 = drawingConnection.currentPoint;
              const { path } = calculateBezierPath(
                p1,
                p2,
                drawingConnection.sourceAnchor,
                drawingConnection.targetAnchor || 'left'
              );
              return (
                <g>
                  <path
                    d={path}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    strokeDasharray="6,4"
                  />
                  <circle cx={p2.x} cy={p2.y} r={5} fill="#2563EB" />
                </g>
              );
            })()}

          {marqueeBox &&
            (() => {
              const x = Math.min(marqueeBox.startX, marqueeBox.currentX);
              const y = Math.min(marqueeBox.startY, marqueeBox.currentY);
              const w = Math.abs(marqueeBox.currentX - marqueeBox.startX);
              const h = Math.abs(marqueeBox.currentY - marqueeBox.startY);
              if (w < 3 && h < 3) return null;
              return (
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={4}
                  fill="rgba(37, 99, 235, 0.10)"
                  stroke="#2563EB"
                  strokeWidth={1.5 / zoom}
                  strokeDasharray={`${5 / zoom},${3 / zoom}`}
                />
              );
            })()}

          {lassoPoints && lassoPoints.length > 1 && (
            <polygon
              points={lassoPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="rgba(79, 70, 229, 0.12)"
              stroke="#4F46E5"
              strokeWidth={2 / zoom}
              strokeDasharray={`${6 / zoom},${4 / zoom}`}
            />
          )}

          {drawingNewFrame &&
            (() => {
              const x = Math.min(drawingNewFrame.startX, drawingNewFrame.currentX);
              const y = Math.min(drawingNewFrame.startY, drawingNewFrame.currentY);
              const w = Math.abs(drawingNewFrame.currentX - drawingNewFrame.startX);
              const h = Math.abs(drawingNewFrame.currentY - drawingNewFrame.startY);
              return (
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={16}
                  fill="rgba(139, 92, 246, 0.10)"
                  stroke="#8B5CF6"
                  strokeWidth={2 / zoom}
                  strokeDasharray={`${8 / zoom},${4 / zoom}`}
                />
              );
            })()}
        </svg>
      </div>

      {/* Layer Manager Panel */}
      <LayerManagerPanel
        isOpen={isLayerPanelOpen}
        onClose={onToggleLayerPanel}
        people={people}
        relationships={relationships}
        groupFrames={groupFrames}
        selectedPersonIds={selectedPersonIds}
        selectedFrameIds={selectedFrameIds}
        selectedRelIds={selectedRelIds}
        onSelectLayerItem={handleSelectLayerItem}
        onMoveLayer={onMoveLayer}
        onToggleLock={onToggleLockItem}
        onToggleHide={onToggleHideItem}
      />

      {/* Comprehensive Custom Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute z-50 w-60 bg-white/98 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl py-1.5 text-xs text-slate-700 select-none"
        >
          {/* Target: Person Card */}
          {contextMenu.targetType === 'person' &&
            contextMenu.targetId &&
            (() => {
              const targetPerson = people.find((p) => p.id === contextMenu.targetId);
              if (!targetPerson) return null;
              const targetIds = selectedPersonIds.includes(targetPerson.id)
                ? selectedPersonIds
                : [targetPerson.id];

              return (
                <>
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate">
                      {targetIds.length > 1
                        ? (language === 'zh' ? `已选 ${targetIds.length} 位干系人` : `${targetIds.length} selected`)
                        : targetPerson.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Z:{targetPerson.zIndex ?? 100}
                    </span>
                  </div>

                  {targetIds.length === 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setContextMenu(null);
                          onEditPerson(targetPerson);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                        <span>{t('ctxEditPerson')}</span>
                      </button>

                      {onOpenTimeline && (
                        <button
                          type="button"
                          onClick={() => {
                            setContextMenu(null);
                            onOpenTimeline(targetPerson);
                          }}
                          className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                          <span>{t('ctxTimeline')}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setContextMenu(null);
                          onSetFocusedPersonId?.(
                            focusedPersonId === targetPerson.id ? null : targetPerson.id
                          );
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <GitFork className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                        <span>
                          {focusedPersonId === targetPerson.id ? t('ctxUnfocusNetwork') : t('ctxFocusNetwork')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setContextMenu(null);
                          setToolMode('connect');
                          setConnectModeSourceId(targetPerson.id);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Link2 className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                        <span>{t('ctxConnectFromNode')}</span>
                      </button>

                      {onOpenInfluencePathWithPerson && (
                        <button
                          type="button"
                          onClick={() => {
                            setContextMenu(null);
                            onOpenInfluencePathWithPerson(targetPerson.id, true);
                          }}
                          className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                          <span>{t('ctxSetAsTarget')}</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* Layer Order */}
                  <div className="my-1 border-t border-slate-100 pt-1 px-3">
                    <div className="text-[10px] text-slate-400 mb-1">{t('layerOrdering')}</div>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { action: 'front' as LayerAction, label: language === 'zh' ? '顶层' : 'Front', icon: ArrowUpToLine },
                        { action: 'forward' as LayerAction, label: language === 'zh' ? '上移' : 'Up', icon: ArrowUp },
                        { action: 'backward' as LayerAction, label: language === 'zh' ? '下移' : 'Down', icon: ArrowDown },
                        { action: 'back' as LayerAction, label: language === 'zh' ? '底层' : 'Back', icon: ArrowDownToLine },
                      ].map((btn) => {
                        const Icon = btn.icon;
                        return (
                          <button
                            key={btn.action}
                            type="button"
                            onClick={() => {
                              onBatchMoveLayer(targetIds, [], btn.action);
                              setContextMenu(null);
                            }}
                            className="py-1 rounded border border-slate-200 hover:bg-slate-100 flex flex-col items-center gap-0.5 text-[10px] cursor-pointer"
                          >
                            <Icon className="w-3 h-3 text-slate-600" strokeWidth={1.5} />
                            <span>{btn.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stage Switcher */}
                  <div className="my-1 border-t border-slate-100 pt-1 px-3">
                    <div className="text-[10px] text-slate-400 mb-1">{t('batchSetStage')}</div>
                    <div className="grid grid-cols-5 gap-1">
                      {STAGE_LIST.map((st) => (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => {
                            onBatchUpdatePeople(targetIds, {
                              relationshipStage: st.key as RelationshipStage,
                            });
                            setContextMenu(null);
                          }}
                          className="py-1 rounded border border-slate-200 hover:bg-slate-100 flex flex-col items-center text-[10px] cursor-pointer"
                          title={st.label}
                        >
                          <span>{st.emoji}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card Color */}
                  <div className="my-1 border-t border-slate-100 pt-1 px-3">
                    <div className="text-[10px] text-slate-400 mb-1">{t('batchCardColor')}</div>
                    <div className="flex items-center justify-between">
                      {CARD_COLORS.slice(0, 7).map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => {
                            onBatchUpdatePeople(targetIds, { cardColor: c.value });
                            setContextMenu(null);
                          }}
                          className="w-4 h-4 rounded-full border border-slate-200 hover:scale-120 transition-transform cursor-pointer"
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setContextMenu(null);
                      onGroupPeopleIntoFrame(targetIds);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Frame className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                    <span>{t('ctxGroupIntoFrame')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setContextMenu(null);
                      onDuplicatePeople(targetIds, 36, 36);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                    <span>{t('ctxDuplicateCard')}</span>
                  </button>

                  {targetIds.length === 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setContextMenu(null);
                        onToggleLockItem('person', targetPerson.id);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      {targetPerson.locked ? (
                        <>
                          <Unlock className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.5} />
                          <span>{t('ctxUnlockPosition')}</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                          <span>{t('ctxLockPosition')}</span>
                        </>
                      )}
                    </button>
                  )}

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setContextMenu(null);
                      onBatchRemoveFromCanvas(targetIds);
                      setSelectedPersonIds([]);
                    }}
                    className="w-full px-3 py-1.5 text-left text-amber-600 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>{t('ctxRemoveFromCanvas')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setContextMenu(null);
                      onBatchDeletePeople(targetIds);
                      setSelectedPersonIds([]);
                    }}
                    className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>{t('ctxDeletePersonPermanent')}</span>
                  </button>
                </>
              );
            })()}

          {/* Target: GroupFrame */}
          {contextMenu.targetType === 'frame' &&
            contextMenu.targetId &&
            (() => {
              const frame = groupFrames.find((f) => f.id === contextMenu.targetId);
              if (!frame) return null;
              return (
                <>
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate">{frame.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Z:{frame.zIndex ?? 10}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setContextMenu(null);
                      onEditFrame(frame);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                    <span>{t('ctxEditFrame')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setContextMenu(null);
                      handleSelectCardsInFrame(frame);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <BoxSelect className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                    <span>{t('ctxSelectCardsInFrame')}</span>
                  </button>

                  <div className="my-1 border-t border-slate-100 pt-1 px-3">
                    <div className="text-[10px] text-slate-400 mb-1">{t('layerOrdering')}</div>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { action: 'front' as LayerAction, label: language === 'zh' ? '顶层' : 'Front', icon: ArrowUpToLine },
                        { action: 'forward' as LayerAction, label: language === 'zh' ? '上移' : 'Up', icon: ArrowUp },
                        { action: 'backward' as LayerAction, label: language === 'zh' ? '下移' : 'Down', icon: ArrowDown },
                        { action: 'back' as LayerAction, label: language === 'zh' ? '底层' : 'Back', icon: ArrowDownToLine },
                      ].map((btn) => {
                        const Icon = btn.icon;
                        return (
                          <button
                            key={btn.action}
                            type="button"
                            onClick={() => {
                              onMoveLayer('frame', frame.id, btn.action);
                              setContextMenu(null);
                            }}
                            className="py-1 rounded border border-slate-200 hover:bg-slate-100 flex flex-col items-center gap-0.5 text-[10px] cursor-pointer"
                          >
                            <Icon className="w-3 h-3 text-slate-600" strokeWidth={1.5} />
                            <span>{btn.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setContextMenu(null);
                      onToggleLockItem('frame', frame.id);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    {frame.locked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.5} />
                        <span>{t('ctxUnlockFrame')}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                        <span>{t('ctxLockFrame')}</span>
                      </>
                    )}
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setContextMenu(null);
                      onDeleteFrame(frame.id);
                    }}
                    className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>{t('ctxDeleteFrame')}</span>
                  </button>
                </>
              );
            })()}

          {/* Target: Relationship Line */}
          {contextMenu.targetType === 'relationship' &&
            contextMenu.targetId &&
            (() => {
              const rel = relationships.find((r) => r.id === contextMenu.targetId);
              if (!rel) return null;
              return (
                <>
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate">
                      {rel.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Z:{rel.zIndex ?? 60}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setContextMenu(null);
                      onEditRelationship(rel);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                    <span>{t('ctxEditRelation')}</span>
                  </button>

                  <div className="my-1 border-t border-slate-100 pt-1 px-3">
                    <div className="text-[10px] text-slate-400 mb-1">{t('ctxQuickLineGeometry')}</div>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { key: 'bezier', label: t('geomBezier') },
                        { key: 'straight', label: t('geomStraight') },
                        { key: 'step', label: t('geomStep') },
                        { key: 'arc', label: t('geomArc') },
                      ].map((g) => (
                        <button
                          key={g.key}
                          type="button"
                          onClick={() => {
                            onUpdateRelationship(rel.id, { lineStyle: g.key as any });
                            setContextMenu(null);
                          }}
                          className={`py-1 rounded border text-[10px] cursor-pointer ${
                            rel.lineStyle === g.key
                              ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="my-1 border-t border-slate-100 pt-1 px-3">
                    <div className="text-[10px] text-slate-400 mb-1">{t('layerOrdering')}</div>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { action: 'front' as LayerAction, label: language === 'zh' ? '顶层' : 'Front', icon: ArrowUpToLine },
                        { action: 'forward' as LayerAction, label: language === 'zh' ? '上移' : 'Up', icon: ArrowUp },
                        { action: 'backward' as LayerAction, label: language === 'zh' ? '下移' : 'Down', icon: ArrowDown },
                        { action: 'back' as LayerAction, label: language === 'zh' ? '底层' : 'Back', icon: ArrowDownToLine },
                      ].map((btn) => {
                        const Icon = btn.icon;
                        return (
                          <button
                            key={btn.action}
                            type="button"
                            onClick={() => {
                              onMoveLayer('relationship', rel.id, btn.action);
                              setContextMenu(null);
                            }}
                            className="py-1 rounded border border-slate-200 hover:bg-slate-100 flex flex-col items-center gap-0.5 text-[10px] cursor-pointer"
                          >
                            <Icon className="w-3 h-3 text-slate-600" strokeWidth={1.5} />
                            <span>{btn.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setContextMenu(null);
                      onUpdateRelationshipOffset(rel.id, 0, 0);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.5} />
                    <span>{t('ctxResetLabelOffset')}</span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setContextMenu(null);
                      onDeleteRelationship(rel.id);
                    }}
                    className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>{t('ctxDeleteRelation')}</span>
                  </button>
                </>
              );
            })()}

          {/* Target: Canvas Background */}
          {contextMenu.targetType === 'canvas' && (
            <>
              <div className="px-3 py-1 border-b border-slate-100 text-[10px] font-semibold text-slate-400">
                {t('ctxCanvasMenu')} ({contextMenu.canvasX}, {contextMenu.canvasY})
              </div>

              <button
                type="button"
                onClick={() => {
                  const { canvasX, canvasY } = contextMenu;
                  setContextMenu(null);
                  onCreatePersonAt(canvasX - CARD_WIDTH / 2, canvasY - CARD_HEIGHT / 2);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 font-medium text-slate-800 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.5} />
                <span>{t('ctxCreatePersonHere')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const { canvasX, canvasY } = contextMenu;
                  setContextMenu(null);
                  onCreateFrameAt({
                    title: language === 'zh' ? '新阵营分组区域' : 'New Group Frame',
                    subtitle: language === 'zh' ? '核心决策与协同组' : 'Core Decision Team',
                    x: canvasX - 180,
                    y: canvasY - 160,
                    width: 360,
                    height: 360,
                    color: '#8B5CF6',
                    zIndex: 15,
                  });
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Frame className="w-3.5 h-3.5 text-purple-600" strokeWidth={1.5} />
                <span>{t('ctxCreateFrameHere')}</span>
              </button>


              {copiedPersonIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setContextMenu(null);
                    onDuplicatePeople(copiedPersonIds, 40, 40);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
                  <span>{t('ctxPasteCards', { count: copiedPersonIds.length })}</span>
                </button>
              )}

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  setSelectedPersonIds(canvasPeople.map((p) => p.id));
                  setSelectedFrameIds(visibleFrames.map((f) => f.id));
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                <span>{t('ctxSelectAll')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  onToggleLayerPanel();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                <span>{t('ctxToggleLayerManager')}</span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  onAutoLayoutFaction?.();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                <span>{t('ctxAutoLayoutFaction')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  onAutoLayoutHierarchy?.();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <GitFork className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                <span>{t('ctxAutoLayoutHierarchy')}</span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  handleFitView();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                <span>{t('ctxFitView')}</span>
              </button>

              {onOpenStyleCenter && (
                <button
                  type="button"
                  onClick={() => {
                    setContextMenu(null);
                    onOpenStyleCenter();
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Palette className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
                  <span>{t('ctxSwitchTheme')}</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Floating Style Studio Trigger */}
      {onOpenStyleCenter && (
        <button
          type="button"
          onClick={onOpenStyleCenter}
          className="hidden md:flex absolute bottom-5 left-5 z-20 items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl shadow-lg hover:shadow-xl hover:border-slate-300 text-slate-700 transition-all text-xs font-semibold group cursor-pointer"
          title={t('styleCenterTip')}
        >
          <div className="w-5 h-5 rounded-md bg-slate-800 text-white flex items-center justify-center transition-transform shadow-2xs">
            <Palette className="w-3.5 h-3.5" strokeWidth={1.5} />
          </div>
          <span className="text-slate-800 font-bold">{t('hudStyleStudio')}</span>
          <span className="text-[10px] text-slate-500 font-mono">
            20×20×20
          </span>
        </button>
      )}

      {/* Floating Canvas Navigation HUD (Bottom Right) */}
      <div
        className="absolute bottom-5 right-5 z-20 flex items-center bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl shadow-lg p-1 gap-1 text-slate-700"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => zoomToLevel(zoomRef.current - 0.1)}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 cursor-pointer"
          title={`${t('hudZoomOut')} (Ctrl + 滚轮向下)`}
          aria-label={t('hudZoomOut')}
        >
          <ZoomOut className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => zoomToLevel(1)}
          className="px-2 py-1 hover:bg-slate-100 rounded-lg text-xs font-mono tabular-nums text-slate-700 font-semibold cursor-pointer"
          title={`${t('hudReset100')} (Ctrl + 滚轮缩放)`}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => zoomToLevel(zoomRef.current + 0.1)}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 cursor-pointer"
          title={`${t('hudZoomIn')} (Ctrl + 滚轮向上)`}
          aria-label={t('hudZoomIn')}
        >
          <ZoomIn className="w-4 h-4" strokeWidth={1.5} />
        </button>

        <div className="w-[1px] h-4 bg-slate-200 my-auto mx-0.5" />

        <button
          onClick={handleFitView}
          className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-700 transition-colors cursor-pointer"
          title={t('hudFitScreen')}
        >
          <Maximize2 className="w-3.5 h-3.5 text-slate-600" strokeWidth={1.5} />
          <span>{t('hudFitScreen')}</span>
        </button>

        <button
          onClick={() => setShowMiniMap(!showMiniMap)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            showMiniMap
              ? 'bg-blue-50 text-blue-600 font-semibold'
              : 'hover:bg-slate-100 text-slate-600'
          }`}
          title={t('hudMinimap')}
          aria-label={t('hudMinimap')}
        >
          <MapIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>

        <button
          type="button"
          onClick={() => {
            if (onToggleStrengthHeatmap) {
              onToggleStrengthHeatmap();
            } else {
              setLocalShowHeatmap((prev) => !prev);
            }
          }}
          className={`px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer ${
            showStrengthHeatmap
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'hover:bg-slate-100 text-slate-600'
          }`}
          title={showStrengthHeatmap ? t('hudHeatmapOn') : t('hudHeatmapOff')}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
          <span className="hidden sm:inline">{t('hudHeatmap')}</span>
        </button>

        {onToggleGroupFrames && (
          <button
            type="button"
            onClick={onToggleGroupFrames}
            className={`px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer ${
              showGroupFrames
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
            title={showGroupFrames ? t('hudFramesHide') : t('hudFramesShow')}
          >
            <Frame className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.5} />
            <span className="hidden sm:inline">{t('hudFrames')}</span>
          </button>
        )}

        <button
          onClick={() => {
            setPan({ x: 220, y: 110 });
            setZoom(0.85);
          }}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 cursor-pointer"
          title={t('hudResetView')}
          aria-label={t('hudResetView')}
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Floating MiniMap Overlay */}
      {showMiniMap &&
        canvasPeople.length > 0 &&
        (() => {
          const miniW = 180;
          const miniH = 120;
          const padding = 20;
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          canvasPeople.forEach((p) => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x + CARD_WIDTH);
            maxY = Math.max(maxY, p.y + CARD_HEIGHT);
          });
          const worldW = Math.max(1, maxX - minX);
          const worldH = Math.max(1, maxY - minY);
          const scale = Math.min((miniW - padding * 2) / worldW, (miniH - padding * 2) / worldH);
          const mapOffsetX = (miniW - worldW * scale) / 2;
          const mapOffsetY = (miniH - worldH * scale) / 2;

          const containerW = containerRef.current?.clientWidth || 1000;
          const containerH = containerRef.current?.clientHeight || 700;
          const viewLeft = (-pan.x / zoom - minX) * scale + mapOffsetX;
          const viewTop = (-pan.y / zoom - minY) * scale + mapOffsetY;
          const viewW = (containerW / zoom) * scale;
          const viewH = (containerH / zoom) * scale;

          const handleMiniMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            const targetWorldX = (clickX - mapOffsetX) / scale + minX;
            const targetWorldY = (clickY - mapOffsetY) / scale + minY;
            setPan({
              x: containerW / 2 - targetWorldX * zoom,
              y: containerH / 2 - targetWorldY * zoom,
            });
          };

          return (
            <div
              onClick={handleMiniMapClick}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute bottom-18 right-5 z-20 w-45 h-30 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-xl shadow-xl overflow-hidden cursor-pointer select-none"
              title={t('hudMinimapTitle')}
            >
              <div className="absolute top-1 left-2 text-[9px] font-semibold text-slate-400 pointer-events-none">
                {t('hudMinimap')}
              </div>
              {canvasPeople.map((p) => {
                const nx = (p.x - minX) * scale + mapOffsetX;
                const ny = (p.y - minY) * scale + mapOffsetY;
                const nw = Math.max(4, CARD_WIDTH * scale);
                const nh = Math.max(3, CARD_HEIGHT * scale);
                return (
                  <div
                    key={p.id}
                    style={{
                      position: 'absolute',
                      left: `${nx}px`,
                      top: `${ny}px`,
                      width: `${nw}px`,
                      height: `${nh}px`,
                      backgroundColor: p.cardColor || '#3B82F6',
                      borderRadius: '2px',
                      opacity: 0.85,
                    }}
                  />
                );
              })}
              <div
                style={{
                  position: 'absolute',
                  left: `${viewLeft}px`,
                  top: `${viewTop}px`,
                  width: `${viewW}px`,
                  height: `${viewH}px`,
                  border: '1.5px solid #2563eb',
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          );
        })()}

      {/* Drag & Drop Prompt when empty */}
      {canvasPeople.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400">
          <div className="p-5 rounded-2xl border-2 border-dashed border-slate-300 bg-white/80 max-w-sm text-center">
            <Move className="w-8 h-8 mx-auto mb-2 text-slate-300" strokeWidth={1.5} />
            <div className="text-sm font-semibold text-slate-700">{t('canvasEmptyPrompt')}</div>
            <div className="text-xs text-slate-400 mt-1">
              {t('canvasEmptySub')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
