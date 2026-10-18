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
  PenTool,
  Highlighter,
  Wand2,
  StickyNote,
  Eraser,
  Scissors,
  Zap,
  MoveRight,
  MoveHorizontal,
  Minus,
  Shapes,
  Type,
  RotateCw,
  ChevronDown,
} from 'lucide-react';
import {
  Person,
  Relationship,
  AnchorPosition,
  VisitRecord,
  GroupFrame,
  CanvasAnnotation,
  TacticalStampType,
  TACTICAL_STAMPS,
  CanvasToolMode,
  LayerAction,
  RelationshipStage,
  STAGE_LIST,
  CARD_COLORS,
  SmartShapeType,
  COMMON_SHAPE_ITEMS,
  CameraBookmark,
} from '../types/crm.ts';
import type { SnapshotDiffResult } from '../utils/snapshot-diff.ts';
import { PresentationHud } from './canvas/PresentationHud.tsx';
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
  simplifyPointsRDP,
  normalizeStrokePoints,
  generateSmoothSvgPath,
  generateSmoothSvgPathFromNormalized,
  recognizeSmartShape,
  sampleRelationshipPoints,
  isPolylineIntersectingPolygon,
  isPointNearAnnotation,
  cleanStrokeEndpoints,
  computeNaturalArrowhead,
  getBoxCornerAndEdgePoints,
  snapPointToBoxPerimeter,
  computeStickyCalloutGeometry,
  buildCommonShapeSvgPath,
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
  BackgroundStyleConfig,
  LineStyleConfig,
  CardStyleConfig,
} from '../types/styles.ts';
import { calculateRelationshipStrength } from '../utils/relationship-strength.ts';
import {
  AlignmentType,
  SmartGuideLine,
  computeSmartSnapGuides,
} from '../utils/graph-algorithms.ts';
import { LayerManagerPanel, LayerItemKind } from './LayerManagerPanel.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { loadToolbarPosition, saveToolbarPosition } from '../utils/storage.ts';
import { ContextMenuState } from './canvas/canvas-constants.ts';
import { SmartGuidesLayer } from './canvas/SmartGuidesLayer.tsx';
import { CanvasFloatingToolbar } from './canvas/CanvasFloatingToolbar.tsx';
import { CanvasPropertyBar } from './canvas/CanvasPropertyBar.tsx';
import { CanvasContextMenu } from './canvas/CanvasContextMenu.tsx';
import {
  StickyNoteInlineEditor,
  ShapeTextInlineEditor,
} from './canvas/InlineAnnotationEditor.tsx';

interface CanvasProps {
  people: Person[];
  relationships: Relationship[];
  visits?: VisitRecord[];
  groupFrames?: GroupFrame[];
  annotations?: CanvasAnnotation[];
  showGroupFrames?: boolean;
  onToggleGroupFrames?: () => void;
  showAnnotations?: boolean;
  onToggleAnnotations?: () => void;
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
    frameMoves: { id: string; x: number; y: number }[],
    annotationMoves?: { id: string; x: number; y: number }[]
  ) => void;
  onAlignPeople: (personIds: string[], alignment: AlignmentType) => void;
  onAlignElements?: (
    personIds: string[],
    frameIds: string[],
    annotationIds: string[],
    alignment: AlignmentType
  ) => void;
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
  onCreateAnnotation?: (
    annData: Omit<CanvasAnnotation, 'id' | 'createdAt' | 'updatedAt'>
  ) => CanvasAnnotation | void;
  onUpdateAnnotation?: (id: string, updates: Partial<CanvasAnnotation>) => void;
  onDeleteAnnotations?: (ids: string[]) => void;
  onMoveLayer: (kind: LayerItemKind, id: string, action: LayerAction) => void;
  onBatchMoveLayer: (
    personIds: string[],
    frameIds: string[],
    action: LayerAction,
    annotationIds?: string[]
  ) => void;
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
  bgConfig?: BackgroundStyleConfig;
  lineConfig?: LineStyleConfig;
  cardConfig?: CardStyleConfig;
  onOpenStyleCenter?: () => void;
  snapshotDiffResult?: SnapshotDiffResult | null;
  activeSnapshotTitle?: string | null;
  onClearSnapshotDiff?: () => void;
  isPresentationMode?: boolean;
  onExitPresentationMode?: () => void;
  cameraBookmarks?: CameraBookmark[];
  onAddCameraBookmark?: (title: string, panX: number, panY: number, zoom: number) => void;
  onDeleteCameraBookmark?: (id: string) => void;
  onBeforeInlineEdit?: () => void;
  onGroupSelectedElements?: (personIds: string[], frameIds: string[], annotationIds: string[]) => void;
  onUngroupSelectedElements?: (personIds: string[], frameIds: string[], annotationIds: string[]) => void;
  onToggleLockSelectedElements?: (personIds: string[], frameIds: string[], annotationIds: string[]) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  people,
  relationships,
  visits = [],
  groupFrames = [],
  annotations = [],
  showGroupFrames = true,
  onToggleGroupFrames,
  showAnnotations = true,
  onToggleAnnotations,
  showStrengthHeatmap: propShowStrengthHeatmap,
  onToggleStrengthHeatmap,
  isLayerPanelOpen,
  onToggleLayerPanel,
  focusedPersonId,
  onSetFocusedPersonId,
  highlightedPathIds,
  snapshotDiffResult = null,
  activeSnapshotTitle = null,
  onClearSnapshotDiff,
  isPresentationMode = false,
  onExitPresentationMode,
  cameraBookmarks = [],
  onAddCameraBookmark,
  onDeleteCameraBookmark,
  onBeforeInlineEdit,
  onGroupSelectedElements,
  onUngroupSelectedElements,
  onToggleLockSelectedElements,
  onOpenTimeline,
  onBatchUpdatePositions,
  onAlignPeople,
  onAlignElements,
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
  onCreateAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotations,
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
  bgConfig: propBgConfig,
  lineConfig: propLineConfig,
  cardConfig: propCardConfig,
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
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<string[]>([]);

  // Freehand Pen / Highlighter / Shape / Text / Arrow / Sticky / Lasso Sub-Mode States
  const [penColor, setPenColor] = useState<string>('#EF4444');
  const [penStrokeWidth, setPenStrokeWidth] = useState<number>(3);
  const [penArrowMode, setPenArrowMode] = useState<'none' | 'forward' | 'both'>('none');
  const [smartShapeEnabled, setSmartShapeEnabled] = useState<boolean>(true);
  const [activeShapeType, setActiveShapeType] = useState<SmartShapeType>('rect');
  const [showShapeDropdown, setShowShapeDropdown] = useState<boolean>(false);
  const [shapeBgColor, setShapeBgColor] = useState<string>('');
  const [shapeFontSize, setShapeFontSize] = useState<number>(14);
  const [drawingNewShape, setDrawingNewShape] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [lassoSubMode, setLassoSubMode] = useState<'select' | 'frame' | 'knife'>('select');
  const [stickyStamp, setStickyStamp] = useState<TacticalStampType>('breakthrough');
  const [stickyStampLabel, setStickyStampLabel] = useState<string>('重点突破');
  const [stickyColor, setStickyColor] = useState<string>('#EF4444');
  const [stickyBgColor, setStickyBgColor] = useState<string>('#FEF2F2');
  const [stickyCalloutMode, setStickyCalloutMode] = useState<'none' | 'solid' | 'dashed'>('solid');
  const [showColorPalettePopover, setShowColorPalettePopover] = useState<
    'pen' | 'sticky' | 'selection' | null
  >(null);

  // Active Drawing Stroke & Laser Pointer & Eraser States
  const [drawingStrokePoints, setDrawingStrokePoints] = useState<Point[] | null>(null);
  const [activeLaserPoints, setActiveLaserPoints] = useState<Point[] | null>(null);
  const [laserCursorPos, setLaserCursorPos] = useState<Point | null>(null);
  const [laserHoverTrail, setLaserHoverTrail] = useState<{ x: number; y: number; t: number }[]>([]);
  const [laserStrokes, setLaserStrokes] = useState<
    { id: string; points: Point[]; createdAt: number; color: string }[]
  >([]);
  const [eraserTrail, setEraserTrail] = useState<Point[] | null>(null);

  // Annotation 8-Point Perimeter Resizing, Rotation, Callout Corner/Vertex/Pin Dragging & Inline Text Editing States
  const [resizingAnnotationId, setResizingAnnotationId] = useState<string | null>(null);
  const [resizingAnnotationState, setResizingAnnotationState] = useState<{
    id: string;
    handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    rotation: number;
  } | null>(null);
  const [rotatingAnnotationState, setRotatingAnnotationState] = useState<{
    id: string;
    centerX: number;
    centerY: number;
  } | null>(null);
  const [draggingCalloutState, setDraggingCalloutState] = useState<{
    annotationId: string;
    handleType: 'start' | 'end' | 'elbow';
    elbowIndex?: number;
  } | null>(null);
  const resizeInitialAnnotationRef = useRef<{ width: number; height: number }>({
    width: 120,
    height: 120,
  });
  const [editingStickyId, setEditingStickyId] = useState<string | null>(null);

  // Clipboard for Copy/Paste
  const [copiedPersonIds, setCopiedPersonIds] = useState<string[]>([]);

  // Batch Dragging State & Smart Alignment Guides
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [activeSnapGuides, setActiveSnapGuides] = useState<SmartGuideLine[]>([]);
  const dragStartMouseRef = useRef<Point>({ x: 0, y: 0 });
  const initialPersonPositionsRef = useRef<Map<string, Point>>(new Map());
  const initialFramePositionsRef = useRef<Map<string, Point>>(new Map());
  const initialAnnotationPositionsRef = useRef<Map<string, Point>>(new Map());

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
  const lassoKnifeActiveRef = useRef<boolean>(false);

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
  const visibleAnnotations = useMemo(
    () => (showAnnotations ? annotations.filter((a) => !a.hidden) : []),
    [annotations, showAnnotations]
  );
  const visibleRelationships = useMemo(
    () => relationships.filter((r) => !r.hidden),
    [relationships]
  );

  // Laser strokes & hover comet trail auto-cleanup timer
  useEffect(() => {
    if (laserStrokes.length === 0 && laserHoverTrail.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setLaserStrokes((prev) => (prev.length > 0 ? prev.filter((s) => now - s.createdAt < 1400) : prev));
      setLaserHoverTrail((prev) => (prev.length > 0 ? prev.filter((pt) => now - pt.t < 520) : prev));
    }, 45);
    return () => clearInterval(interval);
  }, [laserStrokes.length, laserHoverTrail.length]);

  useEffect(() => {
    if (toolMode !== 'laser') {
      setLaserCursorPos(null);
      setLaserHoverTrail([]);
    }
    setShowColorPalettePopover(null);
  }, [toolMode]);

  const peopleMap = useMemo(() => {
    const m = new Map<string, Person>();
    canvasPeople.forEach((p) => m.set(p.id, p));
    return m;
  }, [canvasPeople]);

  const [activePresentationStopId, setActivePresentationStopId] = useState<string | null>(null);

  useEffect(() => {
    if (!isPresentationMode && toolMode === 'laser') {
      setToolMode('select');
    }
  }, [isPresentationMode, toolMode]);

  // Determine connected person IDs when focusing on a person's network
  const connectedIds = useMemo(() => {
    if (!focusedPersonId) return null;
    const set = new Set<string>([focusedPersonId]);
    for (const r of visibleRelationships) {
      if (r.sourceId === focusedPersonId) set.add(r.targetId);
      if (r.targetId === focusedPersonId) set.add(r.sourceId);
    }
    return set;
  }, [focusedPersonId, visibleRelationships]);

  const pathNodeOrderMap = useMemo(() => {
    if (!highlightedPathIds || highlightedPathIds.length === 0) return null;
    const map = new Map<string, number>();
    highlightedPathIds.forEach((id, idx) => map.set(id, idx + 1));
    return map;
  }, [highlightedPathIds]);

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
    if (propBgConfig) return propBgConfig;
    return BACKGROUND_STYLES.find((b) => b.id === bgStyleId) || BACKGROUND_STYLES[0];
  }, [propBgConfig, bgStyleId]);

  const activeLineConfig = useMemo(() => {
    if (propLineConfig) return propLineConfig;
    return LINE_STYLES.find((l) => l.id === lineStyleId) || LINE_STYLES[0];
  }, [propLineConfig, lineStyleId]);

  const activeCardConfig = useMemo(() => {
    if (propCardConfig) return propCardConfig;
    return CARD_STYLES.find((c) => c.id === cardStyleId) || CARD_STYLES[0];
  }, [propCardConfig, cardStyleId]);

  // Fit view to all visible elements while respecting floating toolbar and HUD safe insets
  const handleFitView = useCallback(() => {
    if (canvasPeople.length === 0 && visibleFrames.length === 0 && visibleAnnotations.length === 0) {
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

    visibleAnnotations.forEach((a) => {
      minX = Math.min(minX, a.x);
      minY = Math.min(minY, a.y);
      maxX = Math.max(maxX, a.x + a.width);
      maxY = Math.max(maxY, a.y + a.height);
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
  }, [
    canvasPeople,
    visibleFrames,
    visibleAnnotations,
    toolbarPos.orientation,
    toolbarPos.x,
    toolbarPos.y,
    isLayerPanelOpen,
  ]);

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

      // Spacebar is the default shortcut for Select & Box Selection (选择与框选)
      if (e.code === 'Space') {
        e.preventDefault();
        setToolMode('select');
        setConnectModeSourceId(null);
        setShowColorPalettePopover(null);
        return;
      }

      if (e.key === 'Escape') {
        setContextMenu(null);
        setConnectModeSourceId(null);
        setEditingStickyId(null);
        setShowColorPalettePopover(null);
        if (toolMode !== 'select') {
          setToolMode('select');
        } else {
          setSelectedPersonIds([]);
          setSelectedFrameIds([]);
          setSelectedRelIds([]);
          setSelectedAnnotationIds([]);
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
        else if (k === 'p') setToolMode('pen');
        else if (k === 'g') setToolMode('highlighter');
        else if (k === 'r') setToolMode('shape');
        else if (k === 't') setToolMode('text');
        else if (k === 'z') setToolMode('laser');
        else if (k === 'n' || k === 's') setToolMode('sticky');
        else if (k === 'e') setToolMode('eraser');
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedPersonIds(canvasPeople.map((p) => p.id));
        setSelectedFrameIds(visibleFrames.map((f) => f.id));
        setSelectedAnnotationIds(visibleAnnotations.filter((a) => !a.locked).map((a) => a.id));
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

      // Group / Ungroup Shortcuts (Ctrl/Cmd + G, Ctrl/Cmd + Shift + G)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          onUngroupSelectedElements?.(selectedPersonIds, selectedFrameIds, selectedAnnotationIds);
        } else if (
          selectedPersonIds.length + selectedFrameIds.length + selectedAnnotationIds.length >=
          2
        ) {
          onGroupSelectedElements?.(selectedPersonIds, selectedFrameIds, selectedAnnotationIds);
        }
        return;
      }

      // Lock / Unlock Shortcut (Ctrl/Cmd + L)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        if (
          selectedPersonIds.length + selectedFrameIds.length + selectedAnnotationIds.length >
          0
        ) {
          e.preventDefault();
          onToggleLockSelectedElements?.(
            selectedPersonIds,
            selectedFrameIds,
            selectedAnnotationIds
          );
          return;
        }
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
        if (selectedAnnotationIds.length > 0) {
          e.preventDefault();
          onDeleteAnnotations?.(selectedAnnotationIds);
          setSelectedAnnotationIds([]);
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
    visibleAnnotations,
    selectedPersonIds,
    selectedRelIds,
    selectedAnnotationIds,
    copiedPersonIds,
    onDuplicatePeople,
    onBatchRemoveFromCanvas,
    onDeleteRelationship,
    onDeleteAnnotations,
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
    setEditingStickyId(null);
    setShowColorPalettePopover(null);
    setShowShapeDropdown(false);

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

    if (toolMode === 'pen' || toolMode === 'highlighter') {
      setDrawingStrokePoints([pt]);
      return;
    }

    if (toolMode === 'shape') {
      setDrawingNewShape({
        startX: pt.x,
        startY: pt.y,
        currentX: pt.x,
        currentY: pt.y,
      });
      return;
    }

    if (toolMode === 'text') {
      const created = onCreateAnnotation?.({
        kind: 'text',
        x: Math.round(pt.x - 95),
        y: Math.round(pt.y - 26),
        width: 190,
        height: 54,
        rotation: 0,
        fontSize: shapeFontSize || 15,
        color: penColor,
        bgColor: shapeBgColor || 'transparent',
        strokeWidth: 1.5,
        opacity: 1,
        text: '',
        zIndex: 152,
      });
      if (created && created.id) {
        setSelectedAnnotationIds([created.id]);
        setEditingStickyId(created.id);
      }
      setToolMode('select');
      return;
    }

    if (toolMode === 'laser') {
      setLaserCursorPos(pt);
      setActiveLaserPoints([pt]);
      return;
    }

    if (toolMode === 'sticky') {
      const created = onCreateAnnotation?.({
        kind: 'sticky',
        x: Math.round(pt.x - 105),
        y: Math.round(pt.y - 68),
        width: 210,
        height: 136,
        color: stickyColor,
        bgColor: stickyBgColor,
        strokeWidth: 2,
        opacity: 1,
        stamp: stickyStamp,
        stampLabel: stickyStampLabel.trim() || '重点突破',
        calloutEnabled: stickyCalloutMode !== 'none',
        calloutStyle: stickyCalloutMode === 'dashed' ? 'dashed' : 'solid',
        calloutStartNorm: { x: 0, y: 1 },
        calloutElbows: [{ x: -38, y: 180 }],
        calloutOffsetX: -88,
        calloutOffsetY: 180,
        text: language === 'zh' ? '请填写关键推进动作或防冲标卡点…' : 'Enter tactical note or action item...',
        zIndex: 155,
      });
      if (created && created.id) {
        setSelectedAnnotationIds([created.id]);
        setEditingStickyId(created.id);
      }
      setToolMode('select');
      return;
    }

    if (toolMode === 'eraser') {
      setEraserTrail([pt]);
      const hitIds = visibleAnnotations
        .filter((a) => !a.locked && isPointNearAnnotation(pt, a, 16 / zoom))
        .map((a) => a.id);
      if (hitIds.length > 0) {
        onDeleteAnnotations?.(hitIds);
      }
      return;
    }

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
      lassoKnifeActiveRef.current = lassoSubMode === 'knife' || e.altKey;
      if (!lassoAppendRef.current && !lassoKnifeActiveRef.current) {
        setSelectedPersonIds([]);
        setSelectedFrameIds([]);
        setSelectedRelIds([]);
        setSelectedAnnotationIds([]);
      }
      setLassoPoints([pt]);
      return;
    }

    const append = e.shiftKey || e.ctrlKey || e.metaKey;
    if (!append) {
      setSelectedPersonIds([]);
      setSelectedFrameIds([]);
      setSelectedRelIds([]);
      setSelectedAnnotationIds([]);
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
      // 0. Dragging the Floating Menu Bar (auto-transforms between horizontal & vertical based on screen zone)
      if (isDraggingToolbar && containerRef.current) {
        const deltaX = e.clientX - toolbarDragStartRef.current.mouseX;
        const deltaY = e.clientY - toolbarDragStartRef.current.mouseY;
        const rect = containerRef.current.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;

        const distTopBottom = Math.min(relY, rect.height - relY);
        const distLeftRight = Math.min(relX, rect.width - relX);

        let nextOrientation = toolbarPosRef.current.orientation;
        if (distTopBottom < 105 && distTopBottom < distLeftRight) {
          nextOrientation = 'horizontal';
        } else if (distLeftRight < 160 || (relY >= 105 && relY <= rect.height - 105)) {
          nextOrientation = 'vertical';
        }

        const isHoriz = nextOrientation === 'horizontal';
        const barW = isHoriz ? 440 : 52;
        const barH = isHoriz ? 52 : 440;
        const nextX = Math.max(12, Math.min(rect.width - barW - 12, toolbarDragStartRef.current.startX + deltaX));
        const nextY = Math.max(12, Math.min(rect.height - barH - 12, toolbarDragStartRef.current.startY + deltaY));
        const updated = { x: nextX, y: nextY, orientation: nextOrientation };
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

      // Track Laser Pointer Red Dot & Comet Tail in real-time whenever in laser mode
      if (toolMode === 'laser' && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const isInside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;
        if (isInside) {
          const pt = screenToCanvas(e.clientX, e.clientY, rect, pan.x, pan.y, zoom);
          setLaserCursorPos(pt);
          const now = Date.now();
          setLaserHoverTrail((prev) => {
            const recent = prev.filter((item) => now - item.t < 520);
            const last = recent[recent.length - 1];
            if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < 1.8) return recent;
            return [...recent.slice(-42), { x: pt.x, y: pt.y, t: now }];
          });
        } else {
          setLaserCursorPos(null);
        }
      }

      // 1b. Active Freehand Pen or Highlighter Stroke
      if (drawingStrokePoints && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const pt = screenToCanvas(e.clientX, e.clientY, rect, pan.x, pan.y, zoom);
        setDrawingStrokePoints((prev) => {
          if (!prev) return null;
          const last = prev[prev.length - 1];
          if (Math.hypot(pt.x - last.x, pt.y - last.y) < 2.2) return prev;
          return [...prev, pt];
        });
        return;
      }

      // 1c. Active Presentation Laser Pointer Dragging
      if (activeLaserPoints && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const pt = screenToCanvas(e.clientX, e.clientY, rect, pan.x, pan.y, zoom);
        setActiveLaserPoints((prev) => {
          if (!prev) return null;
          const last = prev[prev.length - 1];
          if (Math.hypot(pt.x - last.x, pt.y - last.y) < 2) return prev;
          return [...prev.slice(-65), pt];
        });
        return;
      }

      // 1d. Vector Eraser Swipe
      if (eraserTrail && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const pt = screenToCanvas(e.clientX, e.clientY, rect, pan.x, pan.y, zoom);
        setEraserTrail((prev) => (prev ? [...prev.slice(-18), pt] : [pt]));
        const hitIds = visibleAnnotations
          .filter((a) => !a.locked && isPointNearAnnotation(pt, a, 16 / zoom))
          .map((a) => a.id);
        if (hitIds.length > 0) {
          onDeleteAnnotations?.(hitIds);
        }
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

      // 2b. Rotating CanvasAnnotation around its center
      if (rotatingAnnotationState && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const pt = screenToCanvas(e.clientX, e.clientY, rect, pan.x, pan.y, zoom);
        let deg =
          (Math.atan2(
            pt.y - rotatingAnnotationState.centerY,
            pt.x - rotatingAnnotationState.centerX
          ) *
            180) /
            Math.PI +
          90;
        deg = ((deg % 360) + 360) % 360;
        if (deg > 180) deg -= 360;
        if (e.shiftKey) {
          deg = Math.round(deg / 15) * 15;
        } else {
          // Subtle snap to 0°, ±90°, ±180° within 3°
          for (const snapAngle of [0, 90, -90, 180, -180]) {
            if (Math.abs(deg - snapAngle) <= 3) {
              deg = snapAngle === -180 ? 180 : snapAngle;
              break;
            }
          }
        }
        onUpdateAnnotation?.(rotatingAnnotationState.id, { rotation: Math.round(deg) });
        return;
      }

      // 2c. 8-Point Perimeter Corner/Edge Resizing on CanvasAnnotation
      if (resizingAnnotationState) {
        const rawDx = (e.clientX - resizingAnnotationState.startMouseX) / zoom;
        const rawDy = (e.clientY - resizingAnnotationState.startMouseY) / zoom;
        const rad = (-resizingAnnotationState.rotation * Math.PI) / 180;
        const localDx = rawDx * Math.cos(rad) - rawDy * Math.sin(rad);
        const localDy = rawDx * Math.sin(rad) + rawDy * Math.cos(rad);

        const minW = 40;
        const minH = 32;
        let nextX = resizingAnnotationState.startX;
        let nextY = resizingAnnotationState.startY;
        let nextW = resizingAnnotationState.startW;
        let nextH = resizingAnnotationState.startH;
        const hType = resizingAnnotationState.handle;

        if (hType.includes('e')) {
          nextW = Math.max(minW, Math.round(resizingAnnotationState.startW + localDx));
        }
        if (hType.includes('w')) {
          nextW = Math.max(minW, Math.round(resizingAnnotationState.startW - localDx));
          nextX = Math.round(
            resizingAnnotationState.startX + (resizingAnnotationState.startW - nextW)
          );
        }
        if (hType.includes('s')) {
          nextH = Math.max(minH, Math.round(resizingAnnotationState.startH + localDy));
        }
        if (hType.includes('n')) {
          nextH = Math.max(minH, Math.round(resizingAnnotationState.startH - localDy));
          nextY = Math.round(
            resizingAnnotationState.startY + (resizingAnnotationState.startH - nextH)
          );
        }

        onUpdateAnnotation?.(resizingAnnotationState.id, {
          x: nextX,
          y: nextY,
          width: nextW,
          height: nextH,
        });
        return;
      }

      // Legacy fallback bottom-right resize
      if (resizingAnnotationId) {
        const deltaX = (e.clientX - resizeStartMouseRef.current.x) / zoom;
        const deltaY = (e.clientY - resizeStartMouseRef.current.y) / zoom;
        const newW = Math.max(36, Math.round(resizeInitialAnnotationRef.current.width + deltaX));
        const newH = Math.max(36, Math.round(resizeInitialAnnotationRef.current.height + deltaY));
        onUpdateAnnotation?.(resizingAnnotationId, { width: newW, height: newH });
        return;
      }

      // 2d. Dragging Sticky Note Callout Origin Corner, Elbow Corner Vertex, or Target Pin
      if (draggingCalloutState && containerRef.current) {
        const targetAnn = annotations.find((a) => a.id === draggingCalloutState.annotationId);
        if (targetAnn) {
          const rect = containerRef.current.getBoundingClientRect();
          const pt = screenToCanvas(e.clientX, e.clientY, rect, pan.x, pan.y, zoom);

          if (draggingCalloutState.handleType === 'start') {
            // Snap origin point to the sticky note's 4 corners or 4 edge midpoints (or perimeter)
            const snapped = snapPointToBoxPerimeter(
              pt,
              {
                x: targetAnn.x,
                y: targetAnn.y,
                width: targetAnn.width,
                height: targetAnn.height,
              },
              24 / zoom
            );
            onUpdateAnnotation?.(targetAnn.id, {
              calloutStartNorm: { x: snapped.nx, y: snapped.ny },
            });
          } else if (
            draggingCalloutState.handleType === 'elbow' &&
            draggingCalloutState.elbowIndex !== undefined
          ) {
            // Move intermediate corner/elbow vertex with smart orthogonal (90°) alignment snapping
            const currentGeometry = computeStickyCalloutGeometry(targetAnn);
            const currentElbows = [...currentGeometry.elbowOffsets];
            const idx = draggingCalloutState.elbowIndex;
            if (idx >= 0 && idx < currentElbows.length) {
              let snapWorldX = pt.x;
              let snapWorldY = pt.y;
              const prevNeighbor =
                idx === 0
                  ? currentGeometry.startPt
                  : {
                      x: targetAnn.x + currentElbows[idx - 1].x,
                      y: targetAnn.y + currentElbows[idx - 1].y,
                    };
              const nextNeighbor =
                idx === currentElbows.length - 1
                  ? currentGeometry.endPt
                  : {
                      x: targetAnn.x + currentElbows[idx + 1].x,
                      y: targetAnn.y + currentElbows[idx + 1].y,
                    };

              const orthoThreshold = 7 / zoom;
              if (Math.abs(snapWorldX - prevNeighbor.x) <= orthoThreshold) {
                snapWorldX = prevNeighbor.x;
              } else if (Math.abs(snapWorldX - nextNeighbor.x) <= orthoThreshold) {
                snapWorldX = nextNeighbor.x;
              }
              if (Math.abs(snapWorldY - prevNeighbor.y) <= orthoThreshold) {
                snapWorldY = prevNeighbor.y;
              } else if (Math.abs(snapWorldY - nextNeighbor.y) <= orthoThreshold) {
                snapWorldY = nextNeighbor.y;
              }

              currentElbows[idx] = {
                x: Math.round(snapWorldX - targetAnn.x),
                y: Math.round(snapWorldY - targetAnn.y),
              };
              onUpdateAnnotation?.(targetAnn.id, {
                calloutElbows: currentElbows,
              });
            }
          } else if (draggingCalloutState.handleType === 'end') {
            // Snap target pin to Person card corners/anchors or GroupFrame corners
            let snappedPersonId: string | undefined = undefined;
            let snappedTargetNorm: { x: number; y: number } | undefined = undefined;
            let resolvedPt: Point = pt;

            for (const person of canvasPeople) {
              if (
                pt.x >= person.x - 22 &&
                pt.x <= person.x + CARD_WIDTH + 22 &&
                pt.y >= person.y - 22 &&
                pt.y <= person.y + CARD_HEIGHT + 22
              ) {
                const snapped = snapPointToBoxPerimeter(
                  pt,
                  {
                    x: person.x,
                    y: person.y,
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                  },
                  26 / zoom
                );
                snappedPersonId = person.id;
                snappedTargetNorm = { x: snapped.nx, y: snapped.ny };
                resolvedPt = { x: snapped.x, y: snapped.y };
                break;
              }
            }

            if (!snappedPersonId) {
              for (const frame of visibleFrames) {
                const nearPerimeter =
                  pt.x >= frame.x - 18 &&
                  pt.x <= frame.x + frame.width + 18 &&
                  pt.y >= frame.y - 18 &&
                  pt.y <= frame.y + frame.height + 18;
                if (nearPerimeter) {
                  const snappedFrame = snapPointToBoxPerimeter(
                    pt,
                    {
                      x: frame.x,
                      y: frame.y,
                      width: frame.width,
                      height: frame.height,
                    },
                    22 / zoom
                  );
                  if (snappedFrame.snappedKeyPoint) {
                    resolvedPt = { x: snappedFrame.x, y: snappedFrame.y };
                    break;
                  }
                }
              }
            }

            onUpdateAnnotation?.(targetAnn.id, {
              calloutOffsetX: Math.round(resolvedPt.x - targetAnn.x),
              calloutOffsetY: Math.round(resolvedPt.y - targetAnn.y),
              calloutTargetPersonId: snappedPersonId,
              calloutTargetNorm: snappedTargetNorm,
            });
          }
        }
        return;
      }

      // 3. Batch dragging selected Person cards, GroupFrames & Annotations (with real-time Smart Alignment Guides)
      if (isDraggingSelection) {
        const rawDeltaX = (e.clientX - dragStartMouseRef.current.x) / zoom;
        const rawDeltaY = (e.clientY - dragStartMouseRef.current.y) / zoom;

        // Compute proposed union bounding box of all dragged items
        let dragMinX = Infinity;
        let dragMinY = Infinity;
        let dragMaxX = -Infinity;
        let dragMaxY = -Infinity;

        initialPersonPositionsRef.current.forEach((initPos) => {
          const px = initPos.x + rawDeltaX;
          const py = initPos.y + rawDeltaY;
          dragMinX = Math.min(dragMinX, px);
          dragMinY = Math.min(dragMinY, py);
          dragMaxX = Math.max(dragMaxX, px + CARD_WIDTH);
          dragMaxY = Math.max(dragMaxY, py + CARD_HEIGHT);
        });

        initialFramePositionsRef.current.forEach((initPos, id) => {
          const f = visibleFrames.find((fr) => fr.id === id);
          const fw = f ? f.width : 300;
          const fh = f ? f.height : 240;
          const fx = initPos.x + rawDeltaX;
          const fy = initPos.y + rawDeltaY;
          dragMinX = Math.min(dragMinX, fx);
          dragMinY = Math.min(dragMinY, fy);
          dragMaxX = Math.max(dragMaxX, fx + fw);
          dragMaxY = Math.max(dragMaxY, fy + fh);
        });

        initialAnnotationPositionsRef.current.forEach((initPos, id) => {
          const a = visibleAnnotations.find((an) => an.id === id);
          const aw = a ? a.width : 140;
          const ah = a ? a.height : 90;
          const ax = initPos.x + rawDeltaX;
          const ay = initPos.y + rawDeltaY;
          dragMinX = Math.min(dragMinX, ax);
          dragMinY = Math.min(dragMinY, ay);
          dragMaxX = Math.max(dragMaxX, ax + aw);
          dragMaxY = Math.max(dragMaxY, ay + ah);
        });

        let finalDeltaX = rawDeltaX;
        let finalDeltaY = rawDeltaY;

        // Default: Smart Guides enabled; holding Alt temporarily disables magnetic snapping
        if (!e.altKey && Number.isFinite(dragMinX) && Number.isFinite(dragMinY)) {
          const movingBox = {
            x: dragMinX,
            y: dragMinY,
            width: Math.max(1, dragMaxX - dragMinX),
            height: Math.max(1, dragMaxY - dragMinY),
          };

          const staticBoxes: { x: number; y: number; width: number; height: number }[] = [];

          canvasPeople.forEach((p) => {
            if (!initialPersonPositionsRef.current.has(p.id)) {
              staticBoxes.push({
                x: p.x,
                y: p.y,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
              });
            }
          });

          visibleFrames.forEach((f) => {
            if (!initialFramePositionsRef.current.has(f.id)) {
              staticBoxes.push({
                x: f.x,
                y: f.y,
                width: f.width,
                height: f.height,
              });
            }
          });

          visibleAnnotations.forEach((a) => {
            if (!initialAnnotationPositionsRef.current.has(a.id)) {
              staticBoxes.push({
                x: a.x,
                y: a.y,
                width: a.width,
                height: a.height,
              });
            }
          });

          const snapRes = computeSmartSnapGuides(movingBox, staticBoxes, 6 / zoom);
          finalDeltaX = rawDeltaX + snapRes.snappedDeltaX;
          finalDeltaY = rawDeltaY + snapRes.snappedDeltaY;
          setActiveSnapGuides(snapRes.guides);
        } else {
          setActiveSnapGuides([]);
        }

        const personMoves: { id: string; x: number; y: number }[] = [];
        initialPersonPositionsRef.current.forEach((initPos, id) => {
          personMoves.push({
            id,
            x: Math.round(initPos.x + finalDeltaX),
            y: Math.round(initPos.y + finalDeltaY),
          });
        });

        const frameMoves: { id: string; x: number; y: number }[] = [];
        initialFramePositionsRef.current.forEach((initPos, id) => {
          frameMoves.push({
            id,
            x: Math.round(initPos.x + finalDeltaX),
            y: Math.round(initPos.y + finalDeltaY),
          });
        });

        const annotationMoves: { id: string; x: number; y: number }[] = [];
        initialAnnotationPositionsRef.current.forEach((initPos, id) => {
          annotationMoves.push({
            id,
            x: Math.round(initPos.x + finalDeltaX),
            y: Math.round(initPos.y + finalDeltaY),
          });
        });

        if (personMoves.length > 0 || frameMoves.length > 0 || annotationMoves.length > 0) {
          onBatchUpdatePositions(personMoves, frameMoves, annotationMoves);
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

      // 4b. Drawing a new Geometric Shape
      if (drawingNewShape && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const pt = screenToCanvas(e.clientX, e.clientY, rect, pan.x, pan.y, zoom);
        setDrawingNewShape((prev) => {
          if (!prev) return null;
          if (e.shiftKey) {
            const dx = pt.x - prev.startX;
            const dy = pt.y - prev.startY;
            const size = Math.max(Math.abs(dx), Math.abs(dy));
            return {
              ...prev,
              currentX: prev.startX + Math.sign(dx || 1) * size,
              currentY: prev.startY + Math.sign(dy || 1) * size,
            };
          }
          return { ...prev, currentX: pt.x, currentY: pt.y };
        });
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
            .filter(
              (p) =>
                !p.locked &&
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

          const hitAnnotations = visibleAnnotations
            .filter(
              (a) =>
                !a.locked &&
                isRectIntersecting(boxRect, {
                  x: a.x,
                  y: a.y,
                  width: a.width,
                  height: a.height,
                })
            )
            .map((a) => a.id);

          if (marqueeBox.append) {
            setSelectedPersonIds((prev) => Array.from(new Set([...prev, ...hitPeople])));
            setSelectedFrameIds((prev) => Array.from(new Set([...prev, ...hitFrames])));
            setSelectedAnnotationIds((prev) => Array.from(new Set([...prev, ...hitAnnotations])));
          } else {
            setSelectedPersonIds(hitPeople);
            setSelectedFrameIds(hitFrames);
            setSelectedAnnotationIds(hitAnnotations);
          }
        }
        return;
      }

      // 6. Freehand Lasso Selection / Frame / Knife
      if (lassoPoints && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const pt = screenToCanvas(e.clientX, e.clientY, rect, pan.x, pan.y, zoom);
        lassoKnifeActiveRef.current = lassoSubMode === 'knife' || e.altKey;

        setLassoPoints((prev) => {
          if (!prev) return null;
          const last = prev[prev.length - 1];
          if (Math.hypot(pt.x - last.x, pt.y - last.y) < 5) return prev;
          const next = [...prev, pt];

          if (next.length >= 3 && lassoSubMode === 'select' && !lassoKnifeActiveRef.current) {
            const hitPeople = canvasPeople
              .filter(
                (p) =>
                  !p.locked &&
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

            const hitAnnotations = visibleAnnotations
              .filter(
                (a) =>
                  !a.locked &&
                  isPointInPolygon(
                    { x: a.x + a.width / 2, y: a.y + a.height / 2 },
                    next
                  )
              )
              .map((a) => a.id);

            if (lassoAppendRef.current) {
              setSelectedPersonIds((prevIds) => Array.from(new Set([...prevIds, ...hitPeople])));
              setSelectedFrameIds((prevIds) => Array.from(new Set([...prevIds, ...hitFrames])));
              setSelectedAnnotationIds((prevIds) => Array.from(new Set([...prevIds, ...hitAnnotations])));
            } else {
              setSelectedPersonIds(hitPeople);
              setSelectedFrameIds(hitFrames);
              setSelectedAnnotationIds(hitAnnotations);
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
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const cur = toolbarPosRef.current;
          const isHoriz = cur.orientation === 'horizontal';
          const barW = isHoriz ? 440 : 52;
          const barH = isHoriz ? 52 : 440;
          let snappedX = cur.x;
          let snappedY = cur.y;
          if (!isHoriz) {
            if (cur.x < 42) snappedX = 16;
            else if (cur.x > rect.width - barW - 42) snappedX = Math.max(16, rect.width - barW - 16);
          } else {
            if (cur.y < 42) snappedY = 16;
            else if (cur.y > rect.height - barH - 42) snappedY = Math.max(16, rect.height - barH - 16);
          }
          const finalPos = { x: snappedX, y: snappedY, orientation: cur.orientation };
          setToolbarPos(finalPos);
          toolbarPosRef.current = finalPos;
          saveToolbarPosition(finalPos);
        } else {
          saveToolbarPosition(toolbarPosRef.current);
        }
      }
      if (isPanning) setIsPanning(false);
      if (resizingFrameId) setResizingFrameId(null);
      if (resizingAnnotationId) setResizingAnnotationId(null);
      if (resizingAnnotationState) setResizingAnnotationState(null);
      if (rotatingAnnotationState) setRotatingAnnotationState(null);
      if (draggingCalloutState) setDraggingCalloutState(null);
      if (isDraggingSelection) {
        setIsDraggingSelection(false);
        setActiveSnapGuides([]);
      }
      if (activeSnapGuides.length > 0) setActiveSnapGuides([]);
      if (eraserTrail) setEraserTrail(null);

      // Finalize Drawing a New Geometric Shape
      if (drawingNewShape) {
        const rawW = Math.abs(drawingNewShape.currentX - drawingNewShape.startX);
        const rawH = Math.abs(drawingNewShape.currentY - drawingNewShape.startY);
        const shapeMeta =
          COMMON_SHAPE_ITEMS.find((s) => s.key === activeShapeType) || COMMON_SHAPE_ITEMS[0];
        const isClickPlacement = rawW < 12 && rawH < 12;
        const finalW = isClickPlacement ? shapeMeta.defaultW : Math.max(54, Math.round(rawW));
        const finalH = isClickPlacement ? shapeMeta.defaultH : Math.max(42, Math.round(rawH));
        const finalX = isClickPlacement
          ? Math.round(drawingNewShape.startX - finalW / 2)
          : Math.round(Math.min(drawingNewShape.startX, drawingNewShape.currentX));
        const finalY = isClickPlacement
          ? Math.round(drawingNewShape.startY - finalH / 2)
          : Math.round(Math.min(drawingNewShape.startY, drawingNewShape.currentY));

        const created = onCreateAnnotation?.({
          kind: 'shape',
          shapeType: activeShapeType,
          x: finalX,
          y: finalY,
          width: finalW,
          height: finalH,
          rotation: 0,
          fontSize: shapeFontSize || 14,
          color: penColor,
          bgColor: shapeBgColor || undefined,
          strokeWidth: penStrokeWidth,
          opacity: 1,
          text: '',
          zIndex: 148,
        });
        if (created && created.id) {
          setSelectedAnnotationIds([created.id]);
          setSelectedPersonIds([]);
          setSelectedFrameIds([]);
          setSelectedRelIds([]);
        }
        setDrawingNewShape(null);
        setToolMode('select');
        return;
      }

      // Finalize Freehand Pen / Highlighter / Smart Shape
      if (drawingStrokePoints) {
        const cleanedPts = cleanStrokeEndpoints(drawingStrokePoints);
        if (cleanedPts.length >= 2) {
          if (toolMode === 'pen' && smartShapeEnabled && cleanedPts.length >= 4) {
            const recognized = recognizeSmartShape(cleanedPts);
            if (recognized) {
              const resolvedArrow: 'none' | 'forward' | 'both' =
                penArrowMode !== 'none'
                  ? penArrowMode
                  : recognized.shapeType === 'arrow'
                  ? 'forward'
                  : 'none';
              const resolvedShapeType =
                (recognized.shapeType === 'line' || recognized.shapeType === 'arrow') &&
                resolvedArrow !== 'none'
                  ? 'arrow'
                  : recognized.shapeType;
              onCreateAnnotation?.({
                kind: 'shape',
                shapeType: resolvedShapeType,
                x: recognized.x,
                y: recognized.y,
                width: recognized.width,
                height: recognized.height,
                points: recognized.normalizedPoints,
                arrowStart: recognized.normalizedPoints?.[0],
                arrowEnd: recognized.normalizedPoints?.[1],
                arrow: resolvedArrow,
                color: penColor,
                strokeWidth: penStrokeWidth,
                opacity: 1,
                zIndex: 145,
              });
              setDrawingStrokePoints(null);
              return;
            }
          }

          const simplified = simplifyPointsRDP(cleanedPts, 1.5);
          const normalized = normalizeStrokePoints(simplified);
          const isHighlighter = toolMode === 'highlighter';
          onCreateAnnotation?.({
            kind: isHighlighter ? 'highlighter' : 'pen',
            x: normalized.x,
            y: normalized.y,
            width: normalized.width,
            height: normalized.height,
            points: normalized.normalizedPoints,
            arrow: isHighlighter ? 'none' : penArrowMode,
            color: penColor,
            strokeWidth: isHighlighter ? Math.max(16, penStrokeWidth * 3.5) : penStrokeWidth,
            opacity: isHighlighter ? 0.36 : 1,
            zIndex: isHighlighter ? 135 : 145,
          });
        }
        setDrawingStrokePoints(null);
      }

      // Finalize Laser Pointer Stroke
      if (activeLaserPoints) {
        if (activeLaserPoints.length >= 2) {
          setLaserStrokes((prev) => [
            ...prev,
            {
              id: `laser-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              points: activeLaserPoints,
              createdAt: Date.now(),
              color: penColor,
            },
          ]);
        }
        setActiveLaserPoints(null);
      }

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

      // Finalize Lasso (Select / Frame / Knife)
      if (lassoPoints) {
        if (lassoPoints.length >= 2 && lassoKnifeActiveRef.current) {
          // Knife mode: slice relationships intersected by lasso polyline
          const cutRelIds: string[] = [];
          visibleRelationships.forEach((rel) => {
            if (rel.locked) return;
            const s = peopleMap.get(rel.sourceId);
            const t = peopleMap.get(rel.targetId);
            if (!s || !t) return;
            const p1 = getAnchorPoint(
              { x: s.x, y: s.y, width: CARD_WIDTH, height: CARD_HEIGHT },
              rel.sourceAnchor || 'right'
            );
            const p2 = getAnchorPoint(
              { x: t.x, y: t.y, width: CARD_WIDTH, height: CARD_HEIGHT },
              rel.targetAnchor || 'left'
            );
            const sampled = sampleRelationshipPoints(
              p1,
              p2,
              rel.offsetX || 0,
              rel.offsetY || 0,
              24
            );
            if (isPolylineIntersectingPolygon(lassoPoints, sampled)) {
              cutRelIds.push(rel.id);
            }
          });
          cutRelIds.forEach((id) => onDeleteRelationship(id));
        } else if (lassoPoints.length >= 3 && lassoSubMode === 'frame') {
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          lassoPoints.forEach((p) => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          });
          if (maxX - minX > 50 && maxY - minY > 50) {
            onCreateFrameAt({
              title: language === 'zh' ? '套索圈定作战阵营' : 'Lasso Group Frame',
              subtitle: language === 'zh' ? '自由圈选生成' : 'Lasso Enclosed Group',
              x: Math.round(minX),
              y: Math.round(minY),
              width: Math.max(220, Math.round(maxX - minX)),
              height: Math.max(160, Math.round(maxY - minY)),
              color: '#8B5CF6',
              zIndex: 15,
            });
          }
        }
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
    resizingAnnotationId,
    resizingAnnotationState,
    rotatingAnnotationState,
    draggingCalloutState,
    annotations,
    isDraggingSelection,
    drawingStrokePoints,
    drawingNewShape,
    activeShapeType,
    shapeBgColor,
    shapeFontSize,
    activeLaserPoints,
    eraserTrail,
    drawingNewFrame,
    marqueeBox,
    lassoPoints,
    lassoSubMode,
    drawingConnection,
    draggingLabelRelationId,
    zoom,
    pan,
    toolMode,
    penColor,
    penStrokeWidth,
    penArrowMode,
    smartShapeEnabled,
    canvasPeople,
    visibleFrames,
    visibleAnnotations,
    visibleRelationships,
    peopleMap,
    activeLineConfig.lineType,
    language,
    onBatchUpdatePositions,
    onUpdateFrame,
    onCreateFrameAt,
    onCreateAnnotation,
    onUpdateAnnotation,
    onDeleteAnnotations,
    onConnect,
    onUpdateRelationshipOffset,
    onDeleteRelationship,
  ]);

  // Initiate dragging on a Person Card
  const handleCardMouseDown = (e: React.MouseEvent, person: Person) => {
    setContextMenu(null);
    setEditingStickyId(null);
    if (e.button !== 0) return;
    e.stopPropagation();

    if (isSpacePressed || toolMode === 'pan') {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (isPresentationMode) {
      if (toolMode === 'laser') {
        return;
      }
      onSetFocusedPersonId?.(focusedPersonId === person.id ? null : person.id);
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
    let nextSelectedFrames = selectedFrameIds;
    let nextSelectedAnnotations = selectedAnnotationIds;

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (selectedPersonIds.includes(person.id)) {
        nextSelectedPeople = selectedPersonIds.filter((id) => id !== person.id);
      } else {
        nextSelectedPeople = [...selectedPersonIds, person.id];
      }
      setSelectedPersonIds(nextSelectedPeople);
    } else if (!selectedPersonIds.includes(person.id)) {
      if (person.groupId && !e.altKey) {
        const gId = person.groupId;
        nextSelectedPeople = canvasPeople
          .filter((p) => p.groupId === gId && !p.locked)
          .map((p) => p.id);
        if (!nextSelectedPeople.includes(person.id)) nextSelectedPeople.push(person.id);
        nextSelectedFrames = visibleFrames
          .filter((f) => f.groupId === gId && !f.locked)
          .map((f) => f.id);
        nextSelectedAnnotations = visibleAnnotations
          .filter((a) => a.groupId === gId && !a.locked)
          .map((a) => a.id);
        setSelectedPersonIds(nextSelectedPeople);
        setSelectedFrameIds(nextSelectedFrames);
        setSelectedAnnotationIds(nextSelectedAnnotations);
        setSelectedRelIds([]);
      } else {
        nextSelectedPeople = [person.id];
        nextSelectedFrames = [];
        nextSelectedAnnotations = [];
        setSelectedPersonIds([person.id]);
        setSelectedFrameIds([]);
        setSelectedRelIds([]);
        setSelectedAnnotationIds([]);
      }
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
    nextSelectedFrames.forEach((id) => {
      const f = visibleFrames.find((fr) => fr.id === id);
      if (f && !f.locked) {
        fMap.set(id, { x: f.x, y: f.y });
      }
    });

    const aMap = new Map<string, Point>();
    nextSelectedAnnotations.forEach((id) => {
      const a = visibleAnnotations.find((an) => an.id === id);
      if (a && !a.locked) {
        aMap.set(id, { x: a.x, y: a.y });
      }
    });

    initialPersonPositionsRef.current = pMap;
    initialFramePositionsRef.current = fMap;
    initialAnnotationPositionsRef.current = aMap;
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    setIsDraggingSelection(true);
  };

  // Initiate dragging on a GroupFrame
  const handleFrameMouseDown = (e: React.MouseEvent, frame: GroupFrame) => {
    setContextMenu(null);
    setEditingStickyId(null);
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
      setSelectedAnnotationIds([]);
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

    const aMap = new Map<string, Point>();
    selectedAnnotationIds.forEach((id) => {
      const a = visibleAnnotations.find((an) => an.id === id);
      if (a && !a.locked) {
        aMap.set(id, { x: a.x, y: a.y });
      }
    });

    initialPersonPositionsRef.current = pMap;
    initialFramePositionsRef.current = fMap;
    initialAnnotationPositionsRef.current = aMap;
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    setIsDraggingSelection(true);
  };

  // Initiate dragging or erasing on a CanvasAnnotation
  const handleAnnotationMouseDown = (e: React.MouseEvent, ann: CanvasAnnotation) => {
    setContextMenu(null);
    if (e.button !== 0) return;

    if (toolMode === 'eraser') {
      e.stopPropagation();
      if (!ann.locked) {
        onDeleteAnnotations?.([ann.id]);
      }
      return;
    }

    if (
      toolMode === 'pen' ||
      toolMode === 'highlighter' ||
      toolMode === 'laser' ||
      toolMode === 'shape' ||
      toolMode === 'text'
    ) {
      // Let background handle drawing over existing annotations
      return;
    }

    e.stopPropagation();
    if (editingStickyId && editingStickyId !== ann.id) {
      setEditingStickyId(null);
    }

    if (isSpacePressed || toolMode === 'pan') {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    let nextSelectedAnnotations = selectedAnnotationIds;
    let nextSelectedPeople = selectedPersonIds;
    let nextSelectedFrames = selectedFrameIds;

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (selectedAnnotationIds.includes(ann.id)) {
        nextSelectedAnnotations = selectedAnnotationIds.filter((id) => id !== ann.id);
      } else {
        nextSelectedAnnotations = [...selectedAnnotationIds, ann.id];
      }
      setSelectedAnnotationIds(nextSelectedAnnotations);
    } else if (!selectedAnnotationIds.includes(ann.id)) {
      if (ann.groupId && !e.altKey) {
        const gId = ann.groupId;
        nextSelectedPeople = canvasPeople
          .filter((p) => p.groupId === gId && !p.locked)
          .map((p) => p.id);
        nextSelectedFrames = visibleFrames
          .filter((f) => f.groupId === gId && !f.locked)
          .map((f) => f.id);
        nextSelectedAnnotations = visibleAnnotations
          .filter((a) => a.groupId === gId && !a.locked)
          .map((a) => a.id);
        if (!nextSelectedAnnotations.includes(ann.id)) nextSelectedAnnotations.push(ann.id);
        setSelectedAnnotationIds(nextSelectedAnnotations);
        setSelectedPersonIds(nextSelectedPeople);
        setSelectedFrameIds(nextSelectedFrames);
        setSelectedRelIds([]);
      } else {
        nextSelectedAnnotations = [ann.id];
        nextSelectedPeople = [];
        nextSelectedFrames = [];
        setSelectedAnnotationIds([ann.id]);
        setSelectedPersonIds([]);
        setSelectedFrameIds([]);
        setSelectedRelIds([]);
      }
    }

    if (ann.locked) return;

    const pMap = new Map<string, Point>();
    nextSelectedPeople.forEach((id) => {
      const p = peopleMap.get(id);
      if (p && !p.locked) pMap.set(id, { x: p.x, y: p.y });
    });

    const fMap = new Map<string, Point>();
    nextSelectedFrames.forEach((id) => {
      const f = visibleFrames.find((fr) => fr.id === id);
      if (f && !f.locked) fMap.set(id, { x: f.x, y: f.y });
    });

    const aMap = new Map<string, Point>();
    nextSelectedAnnotations.forEach((id) => {
      const a = visibleAnnotations.find((an) => an.id === id);
      if (a && !a.locked) aMap.set(id, { x: a.x, y: a.y });
    });

    initialPersonPositionsRef.current = pMap;
    initialFramePositionsRef.current = fMap;
    initialAnnotationPositionsRef.current = aMap;
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
    targetType: 'canvas' | 'person' | 'frame' | 'relationship' | 'annotation',
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
        setSelectedAnnotationIds([]);
      }
    } else if (targetType === 'frame' && targetId) {
      if (!selectedFrameIds.includes(targetId)) {
        setSelectedFrameIds([targetId]);
        setSelectedPersonIds([]);
        setSelectedRelIds([]);
        setSelectedAnnotationIds([]);
      }
    } else if (targetType === 'relationship' && targetId) {
      setSelectedRelIds([targetId]);
      setSelectedPersonIds([]);
      setSelectedFrameIds([]);
      setSelectedAnnotationIds([]);
    } else if (targetType === 'annotation' && targetId) {
      if (!selectedAnnotationIds.includes(targetId)) {
        setSelectedAnnotationIds([targetId]);
        setSelectedPersonIds([]);
        setSelectedFrameIds([]);
        setSelectedRelIds([]);
      }
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
      setSelectedAnnotationIds([]);
      const p = people.find((item) => item.id === id);
      if (p) centerOnCoords(p.x + CARD_WIDTH / 2, p.y + CARD_HEIGHT / 2);
    } else if (kind === 'frame') {
      setSelectedFrameIds([id]);
      setSelectedPersonIds([]);
      setSelectedRelIds([]);
      setSelectedAnnotationIds([]);
      const f = groupFrames.find((item) => item.id === id);
      if (f) centerOnCoords(f.x + f.width / 2, f.y + f.height / 2);
    } else if (kind === 'relationship') {
      setSelectedRelIds([id]);
      setSelectedPersonIds([]);
      setSelectedFrameIds([]);
      setSelectedAnnotationIds([]);
      const r = relationships.find((item) => item.id === id);
      if (r) {
        const s = peopleMap.get(r.sourceId);
        const t = peopleMap.get(r.targetId);
        if (s && t) {
          centerOnCoords((s.x + t.x) / 2 + CARD_WIDTH / 2, (s.y + t.y) / 2 + CARD_HEIGHT / 2);
        }
      }
    } else if (kind === 'annotation') {
      setSelectedAnnotationIds([id]);
      setSelectedPersonIds([]);
      setSelectedFrameIds([]);
      setSelectedRelIds([]);
      const a = annotations.find((item) => item.id === id);
      if (a) centerOnCoords(a.x + a.width / 2, a.y + a.height / 2);
    }
  };

  const alignableSelectedCount =
    selectedPersonIds.length + selectedFrameIds.length + selectedAnnotationIds.length;

  const totalSelectedCount = alignableSelectedCount + selectedRelIds.length;

  const triggerUnifiedAlign = (alignment: AlignmentType) => {
    if (onAlignElements) {
      onAlignElements(selectedPersonIds, selectedFrameIds, selectedAnnotationIds, alignment);
    } else if (selectedPersonIds.length >= 2) {
      onAlignPeople(selectedPersonIds, alignment);
    }
  };

  const cursorClass =
    toolMode === 'laser'
      ? 'cursor-none'
      : isPanning || toolMode === 'pan'
      ? 'cursor-grab active:cursor-grabbing'
      : toolMode === 'text'
      ? 'cursor-text'
      : toolMode === 'marquee' ||
        toolMode === 'lasso' ||
        toolMode === 'frame' ||
        toolMode === 'connect' ||
        toolMode === 'pen' ||
        toolMode === 'highlighter' ||
        toolMode === 'shape' ||
        toolMode === 'sticky' ||
        toolMode === 'eraser'
      ? 'cursor-crosshair'
      : 'cursor-default';

  return (
    <div
      ref={containerRef}
      onMouseDown={handleBackgroundMouseDown}
      onMouseLeave={() => {
        setLaserCursorPos(null);
        setLaserHoverTrail([]);
      }}
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
      {/* Draggable BoardMix-Style Menu Bar / Toolbar Dock (Auto-switches Horizontal/Vertical based on position) */}
      {!isPresentationMode && (
        <CanvasFloatingToolbar
          toolbarPos={toolbarPos}
          isDraggingToolbar={isDraggingToolbar}
        toolMode={toolMode}
        activeShapeType={activeShapeType}
        showShapeDropdown={showShapeDropdown}
        containerWidth={containerRef.current?.clientWidth || 1000}
        containerHeight={containerRef.current?.clientHeight || 700}
        onGripMouseDown={handleToolbarGripMouseDown}
        onResetToolbarPos={() => {
          const reset = { x: 20, y: 140, orientation: 'vertical' as const };
          setToolbarPos(reset);
          toolbarPosRef.current = reset;
          saveToolbarPosition(reset);
        }}
        onSelectToolMode={(mode) => {
          setToolMode(mode);
          setConnectModeSourceId(null);
          setShowShapeDropdown(false);
        }}
        onToggleShapeDropdown={() => {
          if (toolMode !== 'shape') {
            setToolMode('shape');
            setShowShapeDropdown(true);
          } else {
            setShowShapeDropdown((prev) => !prev);
          }
          setConnectModeSourceId(null);
        }}
        onSelectShapeType={(shKey) => {
          setActiveShapeType(shKey);
          setToolMode('shape');
          setShowShapeDropdown(false);
        }}
      />
      )}

      {/* Top Context Property Bars & Multi-Selection Batch Action Bar */}
      {!isPresentationMode && (
      <CanvasPropertyBar
        toolMode={toolMode}
        setToolMode={setToolMode}
        connectModeSourceId={connectModeSourceId}
        setConnectModeSourceId={setConnectModeSourceId}
        peopleMap={peopleMap}
        lassoSubMode={lassoSubMode}
        setLassoSubMode={setLassoSubMode}
        penColor={penColor}
        setPenColor={setPenColor}
        penStrokeWidth={penStrokeWidth}
        setPenStrokeWidth={setPenStrokeWidth}
        penArrowMode={penArrowMode}
        setPenArrowMode={setPenArrowMode}
        smartShapeEnabled={smartShapeEnabled}
        setSmartShapeEnabled={setSmartShapeEnabled}
        showColorPalettePopover={showColorPalettePopover}
        setShowColorPalettePopover={setShowColorPalettePopover}
        toolbarPos={toolbarPos}
        activeShapeType={activeShapeType}
        shapeBgColor={shapeBgColor}
        setShapeBgColor={setShapeBgColor}
        shapeFontSize={shapeFontSize}
        setShapeFontSize={setShapeFontSize}
        stickyStamp={stickyStamp}
        setStickyStamp={setStickyStamp}
        stickyStampLabel={stickyStampLabel}
        setStickyStampLabel={setStickyStampLabel}
        stickyColor={stickyColor}
        setStickyColor={setStickyColor}
        stickyBgColor={stickyBgColor}
        setStickyBgColor={setStickyBgColor}
        stickyCalloutMode={stickyCalloutMode}
        setStickyCalloutMode={setStickyCalloutMode}
        totalSelectedCount={totalSelectedCount}
        alignableSelectedCount={alignableSelectedCount}
        selectedPersonIds={selectedPersonIds}
        selectedFrameIds={selectedFrameIds}
        selectedAnnotationIds={selectedAnnotationIds}
        annotations={annotations}
        hasGroupedSelection={
          people.some((p) => selectedPersonIds.includes(p.id) && Boolean(p.groupId)) ||
          groupFrames.some((f) => selectedFrameIds.includes(f.id) && Boolean(f.groupId)) ||
          annotations.some((a) => selectedAnnotationIds.includes(a.id) && Boolean(a.groupId))
        }
        hasLockedSelection={
          people.some((p) => selectedPersonIds.includes(p.id) && Boolean(p.locked)) ||
          groupFrames.some((f) => selectedFrameIds.includes(f.id) && Boolean(f.locked)) ||
          annotations.some((a) => selectedAnnotationIds.includes(a.id) && Boolean(a.locked))
        }
        onTriggerUnifiedAlign={triggerUnifiedAlign}
        onGroupPeopleIntoFrame={onGroupPeopleIntoFrame}
        onGroupSelectedElements={() =>
          onGroupSelectedElements?.(selectedPersonIds, selectedFrameIds, selectedAnnotationIds)
        }
        onUngroupSelectedElements={() =>
          onUngroupSelectedElements?.(selectedPersonIds, selectedFrameIds, selectedAnnotationIds)
        }
        onToggleLockSelectedElements={() =>
          onToggleLockSelectedElements?.(selectedPersonIds, selectedFrameIds, selectedAnnotationIds)
        }
        onBatchMoveLayer={onBatchMoveLayer}
        onUpdateAnnotation={onUpdateAnnotation}
        onDeleteAnnotations={onDeleteAnnotations}
        onClearSelectedAnnotations={() => setSelectedAnnotationIds([])}
        onBatchUpdatePeople={onBatchUpdatePeople}
        onDuplicatePeople={onDuplicatePeople}
        onBatchRemoveFromCanvas={onBatchRemoveFromCanvas}
        onClearSelectedPeople={() => setSelectedPersonIds([])}
      />
      )}

      {/* Module 1.3: Snapshot Diff Floating Comparison Status Banner */}
      {snapshotDiffResult && !isPresentationMode && (
        <div
          className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2 rounded-2xl shadow-2xl border border-amber-500/40"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            ⏱ 历史快照对比中：{activeSnapshotTitle || '历史基线'}
          </span>
          <div className="flex items-center gap-2 text-[11px] font-mono border-l border-r border-slate-700 px-3">
            <span className="text-emerald-400 font-bold">
              +{snapshotDiffResult.addedPeople.length} 新增人物
            </span>
            <span className="text-emerald-300 font-bold">
              ↑{snapshotDiffResult.attitudeUpgraded.length} 态度升温
            </span>
            <span className="text-rose-400 font-bold">
              ↓{snapshotDiffResult.attitudeDowngraded.length} 态度降温
            </span>
          </div>
          {onClearSnapshotDiff && (
            <button
              type="button"
              onClick={onClearSnapshotDiff}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors cursor-pointer"
            >
              退出对比高亮
            </button>
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
                className={`group absolute top-0 left-0 rounded-2xl border-2 border-dashed pointer-events-auto select-none transition-shadow ${
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

              {/* Hover Unlock Button in Top-Right Corner when Frame is Locked (Module 2.2) */}
              {frame.locked && (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLockItem('frame', frame.id);
                  }}
                  className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-amber-500/90 hover:bg-amber-600 text-white text-[10px] font-bold shadow-md flex items-center gap-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
                  style={{ opacity: isFrameSelected ? 1 : undefined }}
                  title="点击解锁此阵营框 (Ctrl+L)"
                >
                  <Lock className="w-3 h-3" />
                  <span>已锁定 · 点击解锁</span>
                </button>
              )}

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

                {isPathEdge && (
                  <path
                    d={path}
                    fill="none"
                    stroke="#818CF8"
                    strokeWidth={strokeWidth + 6}
                    strokeLinecap="round"
                    opacity={0.28}
                    className="animate-pulse"
                  />
                )}

                {snapshotDiffResult?.addedRelIdSet.has(rel.id) && (
                  <path
                    d={path}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth={strokeWidth + 5}
                    strokeLinecap="round"
                    opacity={0.35}
                  />
                )}

                <path
                  d={path}
                  fill="none"
                  stroke={
                    snapshotDiffResult?.addedRelIdSet.has(rel.id)
                      ? '#10B981'
                      : baseStrokeColor
                  }
                  strokeWidth={strokeWidth}
                  strokeDasharray={isPathEdge ? '10,6' : dashArray}
                  strokeLinecap="round"
                  filter={strokeFilter}
                  className={`transition-colors duration-200 ${
                    isPathEdge || activeLineConfig.animated
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
                    ? `${person.cardColor || '#3B82F6'}18`
                    : activeCardConfig.customBgColor || undefined,
                borderColor:
                  activeCardConfig.accentStyle === 'frame'
                    ? person.cardColor || '#3B82F6'
                    : activeCardConfig.customBorderColor || undefined,
                borderWidth:
                  activeCardConfig.customBorderWidth !== undefined
                    ? `${activeCardConfig.customBorderWidth}px`
                    : undefined,
                borderStyle: activeCardConfig.customBorderStyle || undefined,
                borderRadius:
                  activeCardConfig.customBorderRadius !== undefined
                    ? `${activeCardConfig.customBorderRadius}px`
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
              {/* Module 1.1: Breakthrough Path Node Order Badge */}
              {pathNodeOrderMap?.has(person.id) && (
                <div className="absolute -top-3 -left-3 z-30 flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold shadow-lg ring-2 ring-white">
                  <span>#{pathNodeOrderMap.get(person.id)}</span>
                  <span>
                    {pathNodeOrderMap.get(person.id) === 1
                      ? '起点'
                      : pathNodeOrderMap.get(person.id) === highlightedPathIds?.length
                      ? '目标'
                      : '引荐'}
                  </span>
                </div>
              )}

              {/* Module 1.3: Snapshot Diff Visual Badges on Person Card */}
              {snapshotDiffResult?.personDiffMap.has(person.id) &&
                (() => {
                  const diffBadge = snapshotDiffResult.personDiffMap.get(person.id)!;
                  return (
                    <div
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 z-30 px-2 py-0.5 rounded-full text-white text-[10px] font-extrabold shadow-md ring-2 whitespace-nowrap ${
                        diffBadge.status === 'downgraded'
                          ? 'bg-rose-600 ring-rose-200'
                          : 'bg-emerald-600 ring-emerald-200'
                      }`}
                    >
                      {diffBadge.badgeText}
                    </div>
                  );
                })()}

              {/* Hover Unlock Button when Person is Locked */}
              {person.locked && (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLockItem('person', person.id);
                  }}
                  className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-30"
                  title="点击解锁此人物卡 (Ctrl+L)"
                >
                  <Lock className="w-3 h-3" />
                </button>
              )}

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

        {/* 3b. Vector Freehand Strokes, Highlighters, Smart Shapes & Tactical Sticky Notes */}
        {visibleAnnotations.map((ann) => {
          const isAnnSelected = selectedAnnotationIds.includes(ann.id);

          if (ann.kind === 'sticky') {
            const stampMeta =
              TACTICAL_STAMPS.find((s) => s.key === ann.stamp) || TACTICAL_STAMPS[0];
            const isEditing = editingStickyId === ann.id;
            const displayStampLabel =
              ann.stampLabel && ann.stampLabel.trim()
                ? ann.stampLabel.trim()
                : language === 'zh'
                ? stampMeta.labelZh
                : stampMeta.labelEn;
            const displayAccentColor = ann.color || stampMeta.color;
            const displayBgColor = ann.bgColor || stampMeta.bg;

            return (
              <div
                key={ann.id}
                style={{
                  transform: `translate3d(${ann.x}px, ${ann.y}px, 0)`,
                  width: ann.width,
                  minHeight: ann.height,
                  zIndex: ann.zIndex ?? 155,
                  borderColor: isAnnSelected ? '#2563EB' : displayAccentColor,
                  backgroundColor: displayBgColor,
                }}
                onMouseDown={(e) => handleAnnotationMouseDown(e, ann)}
                onContextMenu={(e) => openContextMenu(e, 'annotation', ann.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (!ann.locked) {
                    onBeforeInlineEdit?.();
                    setEditingStickyId(ann.id);
                  }
                }}
                className={`absolute top-0 left-0 rounded-xl border-2 shadow-md pointer-events-auto select-none flex flex-col justify-between p-3 transition-shadow ${
                  isAnnSelected ? 'ring-3 ring-blue-500/30 shadow-xl' : ''
                } ${ann.locked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-2">
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-2xs truncate max-w-[165px]"
                      style={{ backgroundColor: displayAccentColor }}
                    >
                      {displayStampLabel}
                    </span>
                    {ann.locked && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Lock className="w-3 h-3 text-amber-600" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <StickyNoteInlineEditor
                      ann={ann}
                      defaultStampLabel={language === 'zh' ? stampMeta.labelZh : stampMeta.labelEn}
                      displayAccentColor={displayAccentColor}
                      displayBgColor={displayBgColor}
                      onUpdateAnnotation={onUpdateAnnotation}
                      onFinishEditing={() => setEditingStickyId(null)}
                    />
                  ) : (
                    <p className="text-xs font-medium text-slate-800 whitespace-pre-wrap break-words leading-relaxed">
                      {ann.text || (language === 'zh' ? '双击输入批注内容…' : 'Double-click to edit...')}
                    </p>
                  )}
                </div>

                {!ann.locked && (
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingAnnotationId(ann.id);
                      resizeStartMouseRef.current = { x: e.clientX, y: e.clientY };
                      resizeInitialAnnotationRef.current = {
                        width: ann.width,
                        height: ann.height,
                      };
                    }}
                    className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-xs bg-white/90 border border-slate-400 cursor-nwse-resize flex items-center justify-center opacity-60 hover:opacity-100 hover:border-blue-600"
                    title={language === 'zh' ? '拖拽缩放便签' : 'Resize sticky note'}
                  >
                    <div className="w-1.5 h-1.5 border-r border-b border-slate-600" />
                  </div>
                )}
              </div>
            );
          }

          // Vector SVG / Shape / Text Annotation: supports rotation, 8-point perimeter corner/edge stretching, and double-click multiline text input (Shift+Enter for newline)
          const isPointerInteractive =
            toolMode === 'select' ||
            toolMode === 'eraser' ||
            toolMode === 'marquee' ||
            toolMode === 'lasso';

          const boxW = Math.max(24, ann.width);
          const boxH = Math.max(24, ann.height);
          const isEditingShapeOrText = editingStickyId === ann.id;
          const rotDeg = ann.rotation || 0;

          return (
            <div
              key={ann.id}
              style={{
                transform: `translate3d(${ann.x}px, ${ann.y}px, 0) rotate(${rotDeg}deg)`,
                transformOrigin: 'center center',
                width: boxW,
                height: boxH,
                zIndex: ann.zIndex ?? (ann.kind === 'highlighter' ? 135 : 148),
                mixBlendMode: ann.kind === 'highlighter' ? 'multiply' : 'normal',
              }}
              onMouseDown={(e) => handleAnnotationMouseDown(e, ann)}
              onContextMenu={(e) => openContextMenu(e, 'annotation', ann.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (!ann.locked && (ann.kind === 'shape' || ann.kind === 'text')) {
                  onBeforeInlineEdit?.();
                  setSelectedAnnotationIds([ann.id]);
                  setEditingStickyId(ann.id);
                }
              }}
              className={`absolute top-0 left-0 select-none ${
                isPointerInteractive ? 'pointer-events-auto' : 'pointer-events-none'
              } ${
                toolMode === 'eraser'
                  ? 'cursor-crosshair hover:opacity-60'
                  : ann.locked
                  ? 'cursor-default'
                  : 'cursor-move'
              } ${
                isAnnSelected
                  ? 'ring-2 ring-blue-500 ring-offset-1 rounded-sm bg-blue-500/5'
                  : ''
              }`}
            >
              {/* SVG Layer for Pen, Highlighter, and Geometric Shapes */}
              {ann.kind !== 'text' && (
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox={`0 0 ${boxW} ${boxH}`}
                >
                  {(ann.kind === 'pen' || ann.kind === 'highlighter') && ann.points && (
                    <>
                      <path
                        d={generateSmoothSvgPathFromNormalized(
                          ann.points,
                          0,
                          0,
                          boxW,
                          boxH
                        )}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={Math.max(18, ann.strokeWidth + 10)}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d={generateSmoothSvgPathFromNormalized(
                          ann.points,
                          0,
                          0,
                          boxW,
                          boxH
                        )}
                        fill="none"
                        stroke={ann.color}
                        strokeWidth={ann.strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={ann.opacity}
                      />
                      {ann.kind === 'pen' &&
                        (ann.arrow === 'forward' || ann.arrow === 'both') &&
                        ann.points.length >= 2 &&
                        (() => {
                          const localPts = ann.points.map((np) => ({
                            x: np.x * boxW,
                            y: np.y * boxH,
                          }));
                          const endArrow = computeNaturalArrowhead(
                            localPts,
                            ann.strokeWidth,
                            'end'
                          );
                          const startArrow =
                            ann.arrow === 'both'
                              ? computeNaturalArrowhead(localPts, ann.strokeWidth, 'start')
                              : null;
                          return (
                            <>
                              {endArrow && (
                                <polygon
                                  points={endArrow.polygonPoints}
                                  fill={ann.color}
                                  opacity={ann.opacity}
                                />
                              )}
                              {startArrow && (
                                <polygon
                                  points={startArrow.polygonPoints}
                                  fill={ann.color}
                                  opacity={ann.opacity}
                                />
                              )}
                            </>
                          );
                        })()}
                    </>
                  )}

                  {ann.kind === 'shape' &&
                    ann.shapeType !== 'line' &&
                    ann.shapeType !== 'arrow' &&
                    (() => {
                      const { mainPath, detailPath } = buildCommonShapeSvgPath(
                        ann.shapeType || 'rect',
                        boxW,
                        boxH,
                        ann.strokeWidth
                      );
                      const fillCol = ann.bgColor ? ann.bgColor : `${ann.color}16`;
                      return (
                        <g>
                          <path
                            d={mainPath}
                            fill={fillCol}
                            stroke={ann.color}
                            strokeWidth={ann.strokeWidth}
                            strokeLinejoin="round"
                          />
                          {detailPath && (
                            <path
                              d={detailPath}
                              fill="none"
                              stroke={ann.color}
                              strokeWidth={ann.strokeWidth}
                              strokeLinejoin="round"
                            />
                          )}
                        </g>
                      );
                    })()}

                  {ann.kind === 'shape' &&
                    (ann.shapeType === 'line' || ann.shapeType === 'arrow') &&
                    (() => {
                      const startPt = ann.arrowStart || ann.points?.[0] || { x: 0, y: 0.5 };
                      const endPt = ann.arrowEnd || ann.points?.[1] || { x: 1, y: 0.5 };
                      const sx = startPt.x * boxW;
                      const sy = startPt.y * boxH;
                      const ex = endPt.x * boxW;
                      const ey = endPt.y * boxH;
                      const segPts = [
                        { x: sx, y: sy },
                        { x: ex, y: ey },
                      ];

                      const showEndArrow =
                        ann.arrow === 'forward' ||
                        ann.arrow === 'both' ||
                        (!ann.arrow && ann.shapeType === 'arrow');
                      const showStartArrow = ann.arrow === 'both';

                      const endArrow = showEndArrow
                        ? computeNaturalArrowhead(segPts, ann.strokeWidth, 'end')
                        : null;
                      const startArrow = showStartArrow
                        ? computeNaturalArrowhead(segPts, ann.strokeWidth, 'start')
                        : null;

                      return (
                        <g>
                          <line
                            x1={sx}
                            y1={sy}
                            x2={ex}
                            y2={ey}
                            stroke="transparent"
                            strokeWidth={20}
                          />
                          <line
                            x1={sx}
                            y1={sy}
                            x2={ex}
                            y2={ey}
                            stroke={ann.color}
                            strokeWidth={ann.strokeWidth}
                            strokeLinecap="round"
                          />
                          {endArrow && (
                            <polygon
                              points={endArrow.polygonPoints}
                              fill={ann.color}
                            />
                          )}
                          {startArrow && (
                            <polygon
                              points={startArrow.polygonPoints}
                              fill={ann.color}
                            />
                          )}
                        </g>
                      );
                    })()}
                </svg>
              )}

              {/* Double-Click Inline Text Editor & Auto-Wrapping Text Overlay for Shapes and Text Annotations */}
              {(ann.kind === 'shape' || ann.kind === 'text') &&
                ann.shapeType !== 'line' &&
                ann.shapeType !== 'arrow' && (
                  <div
                    style={{
                      backgroundColor:
                        ann.kind === 'text' && ann.bgColor && ann.bgColor !== 'transparent'
                          ? ann.bgColor
                          : undefined,
                    }}
                    className={`absolute inset-0 flex items-center justify-center p-2.5 overflow-hidden ${
                      ann.kind === 'text'
                        ? 'rounded-lg border border-dashed border-transparent hover:border-slate-300/80'
                        : ''
                    }`}
                  >
                    {isEditingShapeOrText ? (
                      <ShapeTextInlineEditor
                        ann={ann}
                        onUpdateAnnotation={onUpdateAnnotation}
                        onFinishEditing={() => setEditingStickyId(null)}
                      />
                    ) : (
                      <div
                        style={{
                          color: ann.color,
                          fontSize: `${ann.fontSize || 14}px`,
                        }}
                        className={`w-full max-h-full overflow-hidden font-semibold leading-snug whitespace-pre-wrap break-words pointer-events-none ${
                          ann.kind === 'text' ? 'text-left' : 'text-center'
                        }`}
                      >
                        {ann.text ||
                          (ann.kind === 'text'
                            ? language === 'zh'
                              ? '双击输入文本…'
                              : 'Double-click to type...'
                            : '')}
                      </div>
                    )}
                  </div>
                )}

              {/* Rotation Handle & 8 Perimeter Corner/Edge Stretch Handles when selected */}
              {isAnnSelected && !ann.locked && (
                <>
                  {/* Top Rotation Stem & Handle */}
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center z-30">
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setRotatingAnnotationState({
                          id: ann.id,
                          centerX: ann.x + boxW / 2,
                          centerY: ann.y + boxH / 2,
                        });
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onUpdateAnnotation?.(ann.id, { rotation: 0 });
                      }}
                      className="w-5 h-5 rounded-full bg-white border-2 border-blue-600 shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-blue-50 hover:scale-110 transition-transform"
                      title={
                        language === 'zh'
                          ? `拖拽旋转角度 (当前 ${Math.round(rotDeg)}° · Shift锁定15° · 双击归零)`
                          : `Drag to rotate (${Math.round(rotDeg)}° · Double-click to reset)`
                      }
                    >
                      <RotateCw className="w-2.5 h-2.5 text-blue-600" strokeWidth={2.2} />
                    </div>
                    <div className="w-[1.5px] h-2 bg-blue-500" />
                    {(rotatingAnnotationState?.id === ann.id || rotDeg !== 0) && (
                      <div className="absolute -top-5 px-1.5 py-0.2 bg-slate-900 text-white text-[9px] font-mono rounded shadow-xs whitespace-nowrap pointer-events-none">
                        {Math.round(rotDeg)}°
                      </div>
                    )}
                  </div>

                  {/* 8 Perimeter Corner & Edge Stretch Handles (nw, n, ne, e, se, s, sw, w) */}
                  {(
                    [
                      { key: 'nw', posClass: '-top-1.5 -left-1.5', cursor: 'cursor-nwse-resize' },
                      { key: 'n', posClass: '-top-1.5 left-1/2 -translate-x-1/2', cursor: 'cursor-ns-resize' },
                      { key: 'ne', posClass: '-top-1.5 -right-1.5', cursor: 'cursor-nesw-resize' },
                      { key: 'e', posClass: 'top-1/2 -right-1.5 -translate-y-1/2', cursor: 'cursor-ew-resize' },
                      { key: 'se', posClass: '-bottom-1.5 -right-1.5', cursor: 'cursor-nwse-resize' },
                      { key: 's', posClass: '-bottom-1.5 left-1/2 -translate-x-1/2', cursor: 'cursor-ns-resize' },
                      { key: 'sw', posClass: '-bottom-1.5 -left-1.5', cursor: 'cursor-nesw-resize' },
                      { key: 'w', posClass: 'top-1/2 -left-1.5 -translate-y-1/2', cursor: 'cursor-ew-resize' },
                    ] as const
                  ).map((h) => (
                    <div
                      key={h.key}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setResizingAnnotationState({
                          id: ann.id,
                          handle: h.key,
                          startMouseX: e.clientX,
                          startMouseY: e.clientY,
                          startX: ann.x,
                          startY: ann.y,
                          startW: boxW,
                          startH: boxH,
                          rotation: rotDeg,
                        });
                      }}
                      className={`absolute ${h.posClass} w-3 h-3 rounded-xs bg-white border-2 border-blue-600 shadow-2xs hover:bg-blue-600 hover:scale-125 transition-transform z-20 ${h.cursor}`}
                      title={language === 'zh' ? '拖拽角点或边点自由拉伸尺寸' : 'Drag handle to stretch'}
                    />
                  ))}
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
          {/* Sticky Note Callout Leader Lines (作战便签引出线：支持四角/边中点拾取、多折角点拖拽移动与编辑、人物/分组框角点磁吸) */}
          {visibleAnnotations
            .filter((ann) => ann.kind === 'sticky' && ann.calloutEnabled)
            .map((ann) => {
              const stampMeta =
                TACTICAL_STAMPS.find((s) => s.key === ann.stamp) || TACTICAL_STAMPS[0];
              const accentColor = ann.color || stampMeta.color;

              let targetOverride: Point | undefined = undefined;
              let linkedPersonName: string | undefined = undefined;
              if (ann.calloutTargetPersonId) {
                const targetPerson = peopleMap.get(ann.calloutTargetPersonId);
                if (targetPerson && targetPerson.onCanvas && !targetPerson.hidden) {
                  linkedPersonName = targetPerson.name;
                  if (ann.calloutTargetNorm) {
                    targetOverride = {
                      x: targetPerson.x + ann.calloutTargetNorm.x * CARD_WIDTH,
                      y: targetPerson.y + ann.calloutTargetNorm.y * CARD_HEIGHT,
                    };
                  } else {
                    const stickyCenter = {
                      x: ann.x + ann.width / 2,
                      y: ann.y + ann.height / 2,
                    };
                    const anchor = getClosestAnchor(stickyCenter, {
                      x: targetPerson.x,
                      y: targetPerson.y,
                      width: CARD_WIDTH,
                      height: CARD_HEIGHT,
                    });
                    targetOverride = getAnchorPoint(
                      {
                        x: targetPerson.x,
                        y: targetPerson.y,
                        width: CARD_WIDTH,
                        height: CARD_HEIGHT,
                      },
                      anchor
                    );
                  }
                }
              }

              const callout = computeStickyCalloutGeometry(ann, targetOverride);
              const isSelected =
                selectedAnnotationIds.includes(ann.id) ||
                editingStickyId === ann.id ||
                draggingCalloutState?.annotationId === ann.id;
              const isDraggingStart =
                draggingCalloutState?.annotationId === ann.id &&
                draggingCalloutState?.handleType === 'start';
              const isDraggingEnd =
                draggingCalloutState?.annotationId === ann.id &&
                draggingCalloutState?.handleType === 'end';
              const stickyKeyPoints = getBoxCornerAndEdgePoints(ann);

              return (
                <g key={`sticky-callout-${ann.id}`}>
                  {/* Subtle glow under callout line */}
                  <path
                    d={callout.pathD}
                    fill="none"
                    stroke={accentColor}
                    strokeWidth={isSelected ? 5.5 : 3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.18}
                  />
                  {/* Main Callout Multi-Vertex Leader Path (without front arrowhead) */}
                  <path
                    d={callout.pathD}
                    fill="none"
                    stroke={accentColor}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={ann.calloutStyle === 'dashed' ? '6,4' : undefined}
                  />

                  {/* Pickable 4 Corners & 4 Edge Midpoints on Sticky Note when selected or dragging start */}
                  {!ann.locked &&
                    (isSelected || isDraggingStart) &&
                    stickyKeyPoints.map((kp, kpIdx) => {
                      const isCurrentOrigin =
                        Math.hypot(callout.startNorm.x - kp.nx, callout.startNorm.y - kp.ny) <
                        0.05;
                      return (
                        <g
                          key={`sticky-kp-${ann.id}-${kpIdx}`}
                          className="pointer-events-auto cursor-pointer"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedAnnotationIds([ann.id]);
                            onUpdateAnnotation?.(ann.id, {
                              calloutStartNorm: { x: kp.nx, y: kp.ny },
                            });
                            setDraggingCalloutState({
                              annotationId: ann.id,
                              handleType: 'start',
                            });
                          }}
                        >
                          <circle cx={kp.x} cy={kp.y} r={9} fill="transparent" />
                          {kp.isCorner ? (
                            <rect
                              x={kp.x - (isCurrentOrigin ? 4.5 : 3.5)}
                              y={kp.y - (isCurrentOrigin ? 4.5 : 3.5)}
                              width={isCurrentOrigin ? 9 : 7}
                              height={isCurrentOrigin ? 9 : 7}
                              rx={1.5}
                              transform={`rotate(45 ${kp.x} ${kp.y})`}
                              fill={isCurrentOrigin ? accentColor : '#FFFFFF'}
                              stroke={accentColor}
                              strokeWidth={1.8}
                              opacity={isCurrentOrigin || isDraggingStart ? 1 : 0.75}
                            />
                          ) : (
                            <circle
                              cx={kp.x}
                              cy={kp.y}
                              r={isCurrentOrigin ? 4.2 : 3}
                              fill={isCurrentOrigin ? accentColor : '#FFFFFF'}
                              stroke={accentColor}
                              strokeWidth={1.6}
                              opacity={isCurrentOrigin || isDraggingStart ? 1 : 0.65}
                            />
                          )}
                          <title>
                            {language === 'zh'
                              ? `点击或拖拽拾取便签${kp.labelZh}作为引出线起点`
                              : `Pick sticky note ${kp.isCorner ? 'corner' : 'edge midpoint'} as callout origin`}
                          </title>
                        </g>
                      );
                    })}

                  {/* When dragging Target Pin, show pickable 4 Corners & 4 Edge Midpoints on nearby Person cards */}
                  {isDraggingEnd &&
                    canvasPeople.map((person) => {
                      const nearPerson =
                        callout.endPt.x >= person.x - 90 &&
                        callout.endPt.x <= person.x + CARD_WIDTH + 90 &&
                        callout.endPt.y >= person.y - 90 &&
                        callout.endPt.y <= person.y + CARD_HEIGHT + 90;
                      if (!nearPerson) return null;
                      const personKeyPts = getBoxCornerAndEdgePoints({
                        x: person.x,
                        y: person.y,
                        width: CARD_WIDTH,
                        height: CARD_HEIGHT,
                      });
                      return (
                        <g key={`target-snap-person-${person.id}`}>
                          {personKeyPts.map((pkp, idx) => {
                            const isSnappedHere =
                              ann.calloutTargetPersonId === person.id &&
                              ann.calloutTargetNorm &&
                              Math.hypot(
                                ann.calloutTargetNorm.x - pkp.nx,
                                ann.calloutTargetNorm.y - pkp.ny
                              ) < 0.05;
                            return (
                              <circle
                                key={idx}
                                cx={pkp.x}
                                cy={pkp.y}
                                r={isSnappedHere ? 6 : pkp.isCorner ? 4.5 : 3.5}
                                fill={isSnappedHere ? accentColor : '#FFFFFF'}
                                stroke={accentColor}
                                strokeWidth={2}
                                opacity={0.9}
                              />
                            );
                          })}
                        </g>
                      );
                    })}

                  {/* Draggable Origin Handle on Sticky Note Perimeter */}
                  {!ann.locked && (
                    <g
                      className="pointer-events-auto cursor-grab active:cursor-grabbing"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedAnnotationIds([ann.id]);
                        setDraggingCalloutState({
                          annotationId: ann.id,
                          handleType: 'start',
                        });
                      }}
                    >
                      <circle
                        cx={callout.startPt.x}
                        cy={callout.startPt.y}
                        r={10}
                        fill="transparent"
                      />
                      <circle
                        cx={callout.startPt.x}
                        cy={callout.startPt.y}
                        r={isSelected ? 5 : 4}
                        fill="#FFFFFF"
                        stroke={accentColor}
                        strokeWidth={2.2}
                      />
                      <title>
                        {language === 'zh'
                          ? '拖拽沿便签边缘移动引出线起点（自动磁吸四个角点与边中点）'
                          : 'Drag along sticky note perimeter to move origin (snaps to 4 corners & edge midpoints)'}
                      </title>
                    </g>
                  )}

                  {/* Movable & Editable Intermediate Corner/Elbow Vertices (折角点手柄) */}
                  {callout.elbowPts.map((elbowPt, elbowIdx) => (
                    <g
                      key={`callout-elbow-${ann.id}-${elbowIdx}`}
                      className={
                        ann.locked
                          ? 'pointer-events-none'
                          : 'pointer-events-auto cursor-move'
                      }
                      onMouseDown={(e) => {
                        if (ann.locked) return;
                        e.stopPropagation();
                        setSelectedAnnotationIds([ann.id]);
                        setDraggingCalloutState({
                          annotationId: ann.id,
                          handleType: 'elbow',
                          elbowIndex: elbowIdx,
                        });
                      }}
                      onDoubleClick={(e) => {
                        if (ann.locked) return;
                        e.stopPropagation();
                        const nextElbows = callout.elbowOffsets.filter(
                          (_, i) => i !== elbowIdx
                        );
                        onUpdateAnnotation?.(ann.id, {
                          calloutElbows: nextElbows,
                        });
                      }}
                      onContextMenu={(e) => {
                        if (ann.locked) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const nextElbows = callout.elbowOffsets.filter(
                          (_, i) => i !== elbowIdx
                        );
                        onUpdateAnnotation?.(ann.id, {
                          calloutElbows: nextElbows,
                        });
                      }}
                    >
                      <circle cx={elbowPt.x} cy={elbowPt.y} r={11} fill="transparent" />
                      {isSelected ? (
                        <rect
                          x={elbowPt.x - 4.5}
                          y={elbowPt.y - 4.5}
                          width={9}
                          height={9}
                          rx={1.5}
                          transform={`rotate(45 ${elbowPt.x} ${elbowPt.y})`}
                          fill="#FFFFFF"
                          stroke={accentColor}
                          strokeWidth={2.2}
                        />
                      ) : (
                        <circle
                          cx={elbowPt.x}
                          cy={elbowPt.y}
                          r={3.2}
                          fill="#FFFFFF"
                          stroke={accentColor}
                          strokeWidth={1.8}
                        />
                      )}
                      <title>
                        {language === 'zh'
                          ? '拖拽移动引出线折角点（支持90°正交磁吸）；双击或右键删除该折角点'
                          : 'Drag to move corner vertex (snaps 90°); double-click or right-click to remove corner'}
                      </title>
                    </g>
                  ))}

                  {/* Segment Midpoint "+" Handles to Insert New Corner Vertex (点击或拖拽线段中点新增折角点) */}
                  {!ann.locked &&
                    isSelected &&
                    callout.segmentMidpoints.map((mid, midIdx) => (
                      <g
                        key={`callout-mid-${ann.id}-${midIdx}`}
                        className="pointer-events-auto cursor-pointer opacity-75 hover:opacity-100"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const nextElbows = [...callout.elbowOffsets];
                          const newOffset = {
                            x: Math.round(mid.x - ann.x),
                            y: Math.round(mid.y - ann.y),
                          };
                          nextElbows.splice(mid.insertIndex, 0, newOffset);
                          onUpdateAnnotation?.(ann.id, {
                            calloutElbows: nextElbows,
                          });
                          setSelectedAnnotationIds([ann.id]);
                          setDraggingCalloutState({
                            annotationId: ann.id,
                            handleType: 'elbow',
                            elbowIndex: mid.insertIndex,
                          });
                        }}
                      >
                        <circle cx={mid.x} cy={mid.y} r={9} fill="transparent" />
                        <circle
                          cx={mid.x}
                          cy={mid.y}
                          r={4.8}
                          fill="#FFFFFF"
                          stroke={accentColor}
                          strokeWidth={1.5}
                          strokeDasharray="2,1"
                        />
                        <line
                          x1={mid.x - 2.4}
                          y1={mid.y}
                          x2={mid.x + 2.4}
                          y2={mid.y}
                          stroke={accentColor}
                          strokeWidth={1.5}
                        />
                        <line
                          x1={mid.x}
                          y1={mid.y - 2.4}
                          x2={mid.x}
                          y2={mid.y + 2.4}
                          stroke={accentColor}
                          strokeWidth={1.5}
                        />
                        <title>
                          {language === 'zh'
                            ? '点击或拖拽在此处新增一个引出线折角点'
                            : 'Click or drag to insert a new corner vertex here'}
                        </title>
                      </g>
                    ))}

                  {/* Draggable Target Pin Handle */}
                  {!ann.locked && (
                    <g
                      className="pointer-events-auto cursor-grab active:cursor-grabbing"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedAnnotationIds([ann.id]);
                        setDraggingCalloutState({
                          annotationId: ann.id,
                          handleType: 'end',
                        });
                      }}
                    >
                      <circle
                        cx={callout.endPt.x}
                        cy={callout.endPt.y}
                        r={12}
                        fill="transparent"
                      />
                      <circle
                        cx={callout.endPt.x}
                        cy={callout.endPt.y}
                        r={isSelected || linkedPersonName ? 6.5 : 4.5}
                        fill={linkedPersonName ? accentColor : '#FFFFFF'}
                        stroke={accentColor}
                        strokeWidth={2}
                        opacity={isSelected ? 1 : 0.85}
                      />
                      {linkedPersonName && (
                        <circle
                          cx={callout.endPt.x}
                          cy={callout.endPt.y}
                          r={2.2}
                          fill="#FFFFFF"
                        />
                      )}
                      <title>
                        {language === 'zh'
                          ? `拖拽引出线终点指向任意位置或拾取人物卡片/分组框角点${
                              linkedPersonName ? ` (已关联: ${linkedPersonName})` : ''
                            }`
                          : 'Drag callout arrow to point anywhere or snap to person card / frame corners'}
                      </title>
                    </g>
                  )}
                </g>
              );
            })}

          {/* Active Freehand Pen or Highlighter Stroke Preview (with natural live arrowheads for Pen only) */}
          {drawingStrokePoints && drawingStrokePoints.length > 1 && (
            <g>
              <path
                d={generateSmoothSvgPath(drawingStrokePoints)}
                fill="none"
                stroke={penColor}
                strokeWidth={
                  toolMode === 'highlighter' ? Math.max(16, penStrokeWidth * 3.5) : penStrokeWidth
                }
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={toolMode === 'highlighter' ? 0.38 : 0.95}
              />
              {toolMode === 'pen' &&
                (penArrowMode === 'forward' || penArrowMode === 'both') &&
                drawingStrokePoints.length >= 2 &&
                (() => {
                  const cleaned = cleanStrokeEndpoints(drawingStrokePoints);
                  const endArrow = computeNaturalArrowhead(cleaned, penStrokeWidth, 'end');
                  const startArrow =
                    penArrowMode === 'both'
                      ? computeNaturalArrowhead(cleaned, penStrokeWidth, 'start')
                      : null;

                  return (
                    <>
                      {endArrow && (
                        <polygon
                          points={endArrow.polygonPoints}
                          fill={penColor}
                          opacity={0.95}
                        />
                      )}
                      {startArrow && (
                        <polygon
                          points={startArrow.polygonPoints}
                          fill={penColor}
                          opacity={0.95}
                        />
                      )}
                    </>
                  );
                })()}
            </g>
          )}

          {/* Fading Presentation Laser Pointer Trails (drawn strokes) */}
          {laserStrokes.map((ls) => {
            const age = Date.now() - ls.createdAt;
            const alpha = Math.max(0, 1 - age / 1400);
            const d = generateSmoothSvgPath(ls.points);
            return (
              <g key={ls.id} opacity={alpha}>
                <path
                  d={d}
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth={14 / zoom}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.25}
                />
                <path
                  d={d}
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth={7 / zoom}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.65}
                />
                <path
                  d={d}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={2.5 / zoom}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.95}
                />
              </g>
            );
          })}

          {/* Active Laser Pointer Dragging Trail */}
          {activeLaserPoints && activeLaserPoints.length > 1 && (
            <g>
              <path
                d={generateSmoothSvgPath(activeLaserPoints)}
                fill="none"
                stroke="#EF4444"
                strokeWidth={15 / zoom}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.28}
              />
              <path
                d={generateSmoothSvgPath(activeLaserPoints)}
                fill="none"
                stroke="#EF4444"
                strokeWidth={7.5 / zoom}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.75}
              />
              <path
                d={generateSmoothSvgPath(activeLaserPoints)}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={2.8 / zoom}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* Live Laser Pointer Red Dot & Tapered Comet Tail on Hover/Move */}
          {toolMode === 'laser' && (
            <g>
              {/* Tapered Comet Tail Segments */}
              {laserHoverTrail.length > 1 &&
                laserHoverTrail.map((pt, idx) => {
                  if (idx === 0) return null;
                  const prev = laserHoverTrail[idx - 1];
                  const now = Date.now();
                  const ageRatio = Math.max(0, 1 - (now - pt.t) / 360);
                  const prog = (idx / laserHoverTrail.length) * ageRatio;
                  if (prog <= 0.02) return null;
                  return (
                    <g key={`comet-${idx}`}>
                      <line
                        x1={prev.x}
                        y1={prev.y}
                        x2={pt.x}
                        y2={pt.y}
                        stroke="#EF4444"
                        strokeWidth={(14 * prog) / zoom}
                        strokeLinecap="round"
                        opacity={0.32 * prog}
                      />
                      <line
                        x1={prev.x}
                        y1={prev.y}
                        x2={pt.x}
                        y2={pt.y}
                        stroke="#FB7185"
                        strokeWidth={(6.5 * prog) / zoom}
                        strokeLinecap="round"
                        opacity={0.78 * prog}
                      />
                      <line
                        x1={prev.x}
                        y1={prev.y}
                        x2={pt.x}
                        y2={pt.y}
                        stroke="#FFFFFF"
                        strokeWidth={(2.2 * prog) / zoom}
                        strokeLinecap="round"
                        opacity={0.9 * prog}
                      />
                    </g>
                  );
                })}

              {/* Glowing Red Laser Pointer Dot */}
              {laserCursorPos && (
                <g>
                  <circle
                    cx={laserCursorPos.x}
                    cy={laserCursorPos.y}
                    r={14 / zoom}
                    fill="#EF4444"
                    opacity={0.22}
                  />
                  <circle
                    cx={laserCursorPos.x}
                    cy={laserCursorPos.y}
                    r={8.5 / zoom}
                    fill="#EF4444"
                    opacity={0.48}
                  />
                  <circle
                    cx={laserCursorPos.x}
                    cy={laserCursorPos.y}
                    r={5.2 / zoom}
                    fill="#EF4444"
                    stroke="#FFFFFF"
                    strokeWidth={1.6 / zoom}
                  />
                  <circle
                    cx={laserCursorPos.x}
                    cy={laserCursorPos.y}
                    r={1.8 / zoom}
                    fill="#FFFFFF"
                  />
                </g>
              )}
            </g>
          )}

          {/* Vector Eraser Swipe Trail */}
          {eraserTrail && eraserTrail.length > 1 && (
            <path
              d={generateSmoothSvgPath(eraserTrail)}
              fill="none"
              stroke="rgba(244, 63, 94, 0.45)"
              strokeWidth={22 / zoom}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

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
            lassoKnifeActiveRef.current ? (
              <polyline
                points={lassoPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#E11D48"
                strokeWidth={2.5 / zoom}
                strokeDasharray={`${5 / zoom},${3 / zoom}`}
              />
            ) : (
              <polygon
                points={lassoPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill={
                  lassoSubMode === 'frame'
                    ? 'rgba(139, 92, 246, 0.14)'
                    : 'rgba(79, 70, 229, 0.12)'
                }
                stroke={lassoSubMode === 'frame' ? '#8B5CF6' : '#4F46E5'}
                strokeWidth={2 / zoom}
                strokeDasharray={`${6 / zoom},${4 / zoom}`}
              />
            )
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

          {/* Live Preview when dragging to draw a new Shape */}
          {drawingNewShape &&
            (() => {
              const x = Math.min(drawingNewShape.startX, drawingNewShape.currentX);
              const y = Math.min(drawingNewShape.startY, drawingNewShape.currentY);
              const w = Math.max(24, Math.abs(drawingNewShape.currentX - drawingNewShape.startX));
              const h = Math.max(24, Math.abs(drawingNewShape.currentY - drawingNewShape.startY));
              const previewPaths = buildCommonShapeSvgPath(activeShapeType, w, h, penStrokeWidth);
              return (
                <g transform={`translate(${x}, ${y})`}>
                  <path
                    d={previewPaths.mainPath}
                    fill={shapeBgColor ? shapeBgColor : `${penColor}18`}
                    stroke={penColor}
                    strokeWidth={penStrokeWidth}
                    strokeLinejoin="round"
                    strokeDasharray="6,3"
                  />
                  {previewPaths.detailPath && (
                    <path
                      d={previewPaths.detailPath}
                      fill="none"
                      stroke={penColor}
                      strokeWidth={penStrokeWidth}
                      strokeLinejoin="round"
                      strokeDasharray="6,3"
                    />
                  )}
                </g>
              );
            })()}

          {/* Active Real-Time Magnetic Smart Alignment Guides (Smart Guides) */}
          <SmartGuidesLayer guides={activeSnapGuides} zoom={zoom} />
        </svg>
      </div>

      {/* Layer Manager Panel */}
      <LayerManagerPanel
        isOpen={isLayerPanelOpen && !isPresentationMode}
        onClose={onToggleLayerPanel}
        people={people}
        relationships={relationships}
        groupFrames={groupFrames}
        annotations={annotations}
        selectedPersonIds={selectedPersonIds}
        selectedFrameIds={selectedFrameIds}
        selectedRelIds={selectedRelIds}
        selectedAnnotationIds={selectedAnnotationIds}
        onSelectLayerItem={handleSelectLayerItem}
        onMoveLayer={onMoveLayer}
        onToggleLock={onToggleLockItem}
        onToggleHide={onToggleHideItem}
      />

      {/* Comprehensive Custom Right-Click Context Menu */}
      <CanvasContextMenu
        contextMenu={contextMenu}
        onCloseContextMenu={() => setContextMenu(null)}
        people={people}
        canvasPeople={canvasPeople}
        relationships={relationships}
        groupFrames={groupFrames}
        visibleFrames={visibleFrames}
        annotations={annotations}
        visibleAnnotations={visibleAnnotations}
        selectedPersonIds={selectedPersonIds}
        focusedPersonId={focusedPersonId}
        copiedPersonIds={copiedPersonIds}
        stickyColor={stickyColor}
        stickyBgColor={stickyBgColor}
        stickyStamp={stickyStamp}
        stickyStampLabel={stickyStampLabel}
        stickyCalloutMode={stickyCalloutMode}
        onEditPerson={onEditPerson}
        onOpenTimeline={onOpenTimeline}
        onSetFocusedPersonId={onSetFocusedPersonId}
        onStartConnectFromNode={(personId) => {
          setToolMode('connect');
          setConnectModeSourceId(personId);
        }}
        onBatchMoveLayer={onBatchMoveLayer}
        onBatchUpdatePeople={onBatchUpdatePeople}
        onGroupPeopleIntoFrame={onGroupPeopleIntoFrame}
        onDuplicatePeople={onDuplicatePeople}
        onToggleLockItem={onToggleLockItem}
        onBatchRemoveFromCanvas={onBatchRemoveFromCanvas}
        onBatchDeletePeople={onBatchDeletePeople}
        onClearSelectedPeople={() => setSelectedPersonIds([])}
        onEditFrame={onEditFrame}
        onSelectCardsInFrame={handleSelectCardsInFrame}
        onMoveLayer={onMoveLayer}
        onDeleteFrame={onDeleteFrame}
        onEditRelationship={onEditRelationship}
        onUpdateRelationship={onUpdateRelationship}
        onUpdateRelationshipOffset={onUpdateRelationshipOffset}
        onDeleteRelationship={onDeleteRelationship}
        onUpdateAnnotation={onUpdateAnnotation}
        onDeleteAnnotations={onDeleteAnnotations}
        onClearSelectedAnnotations={() => setSelectedAnnotationIds([])}
        onCreatePersonAt={onCreatePersonAt}
        onCreateFrameAt={onCreateFrameAt}
        onCreateAnnotation={onCreateAnnotation}
        onSelectAndEditAnnotation={(id) => {
          setSelectedAnnotationIds([id]);
          setEditingStickyId(id);
        }}
        onOpenOcrAt={onOpenOcrAt}
        onSelectAllOnCanvas={() => {
          setSelectedPersonIds(canvasPeople.map((p) => p.id));
          setSelectedFrameIds(visibleFrames.map((f) => f.id));
          setSelectedAnnotationIds(
            visibleAnnotations.filter((a) => !a.locked).map((a) => a.id)
          );
        }}
        onToggleLayerPanel={onToggleLayerPanel}
        onAutoLayoutFaction={onAutoLayoutFaction}
        onAutoLayoutHierarchy={onAutoLayoutHierarchy}
        onFitView={handleFitView}
        onOpenStyleCenter={onOpenStyleCenter}
      />

      {/* Floating Iconized Canvas Navigation HUD (Bottom Right - Hidden in Presentation Mode) */}
      {!isPresentationMode && (
      <div
        className="absolute bottom-5 right-5 z-20 flex items-center bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl shadow-lg p-1 gap-0.5 text-slate-700"
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
          className="px-1.5 py-1 hover:bg-slate-100 rounded-lg text-xs font-mono tabular-nums text-slate-700 font-semibold cursor-pointer"
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
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title={t('hudFitScreen')}
          aria-label={t('hudFitScreen')}
        >
          <Maximize2 className="w-4 h-4" strokeWidth={1.5} />
        </button>

        <button
          onClick={() => setShowMiniMap(!showMiniMap)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            showMiniMap
              ? 'bg-blue-50 text-blue-600'
              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
          title={t('hudMinimap')}
          aria-label={t('hudMinimap')}
        >
          <MapIcon className="w-4 h-4" strokeWidth={1.5} />
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
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            showStrengthHeatmap
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
          title={showStrengthHeatmap ? t('hudHeatmapOn') : t('hudHeatmapOff')}
          aria-label={t('hudHeatmap')}
        >
          <Activity className="w-4 h-4" strokeWidth={1.5} />
        </button>

        {onToggleGroupFrames && (
          <button
            type="button"
            onClick={onToggleGroupFrames}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              showGroupFrames
                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title={showGroupFrames ? t('hudFramesHide') : t('hudFramesShow')}
            aria-label={t('hudFrames')}
          >
            <Frame className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}

        {onToggleAnnotations && (
          <button
            type="button"
            onClick={onToggleAnnotations}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              showAnnotations
                ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title={showAnnotations ? t('hudAnnotationsHide') : t('hudAnnotationsShow')}
            aria-label={t('hudAnnotations')}
          >
            <PenTool className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}

        <button
          onClick={() => {
            setPan({ x: 220, y: 110 });
            setZoom(0.85);
          }}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
          title={t('hudResetView')}
          aria-label={t('hudResetView')}
        >
          <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
      )}

      {/* Floating MiniMap Overlay (Hidden in Presentation Mode) */}
      {!isPresentationMode &&
        showMiniMap &&
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

      {/* Module 2.3: Executive Presentation HUD */}
      {isPresentationMode && onExitPresentationMode && (
        <PresentationHud
          groupFrames={visibleFrames}
          cameraBookmarks={cameraBookmarks}
          activeStopId={activePresentationStopId}
          toolMode={toolMode}
          hasFocusedPerson={Boolean(focusedPersonId)}
          focusedPersonName={focusedPersonId ? peopleMap.get(focusedPersonId)?.name : null}
          onSelectStop={(stop) => {
            setActivePresentationStopId(stop.id);
            const containerW = containerRef.current?.clientWidth || 1200;
            const containerH = containerRef.current?.clientHeight || 800;
            if (stop.kind === 'bookmark' && stop.panX !== undefined && stop.panY !== undefined && stop.zoom !== undefined) {
              setZoom(stop.zoom);
              setPan({ x: stop.panX, y: stop.panY });
            } else if (stop.width && stop.height && stop.x !== undefined && stop.y !== undefined) {
              const pad = 120;
              const targetZoom = Math.min(
                1.25,
                Math.max(
                  0.45,
                  Math.min(
                    (containerW - pad * 2) / stop.width,
                    (containerH - pad * 2) / stop.height
                  )
                )
              );
              const centerX = stop.x + stop.width / 2;
              const centerY = stop.y + stop.height / 2;
              setZoom(targetZoom);
              setPan({
                x: Math.round(containerW / 2 - centerX * targetZoom),
                y: Math.round(containerH / 2 - centerY * targetZoom),
              });
            }
          }}
          onFitAll={() => {
            setActivePresentationStopId(null);
            handleFitView();
          }}
          onToggleLaser={() => setToolMode(toolMode === 'laser' ? 'select' : 'laser')}
          onClearSpotlight={() => onSetFocusedPersonId?.(null)}
          onSaveCurrentBookmark={(title) => {
            onAddCameraBookmark?.(title, pan.x, pan.y, zoom);
          }}
          onDeleteBookmark={(id) => onDeleteCameraBookmark?.(id)}
          onExitPresentation={onExitPresentationMode}
        />
      )}
    </div>
  );
};
