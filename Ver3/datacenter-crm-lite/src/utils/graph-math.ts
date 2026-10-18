/**
 * Pure math and geometry utilities for relationship graph, marquee box selection, and freehand lasso
 */

export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left';

export const CARD_WIDTH = 236;
export const CARD_HEIGHT = 148;

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Returns exact coordinates for an anchor on a given card rectangle
 */
export function getAnchorPoint(rect: Rect, anchor: AnchorPosition): Point {
  switch (anchor) {
    case 'top':
      return { x: rect.x + rect.width / 2, y: rect.y };
    case 'right':
      return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
    case 'bottom':
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
    case 'left':
      return { x: rect.x, y: rect.y + rect.height / 2 };
  }
}

/**
 * Determines closest anchor to a target point
 */
export function getClosestAnchor(fromPoint: Point, targetRect: Rect): AnchorPosition {
  const anchors: AnchorPosition[] = ['top', 'right', 'bottom', 'left'];
  let bestAnchor: AnchorPosition = 'left';
  let minDistance = Infinity;

  for (const anchor of anchors) {
    const p = getAnchorPoint(targetRect, anchor);
    const distSq = (p.x - fromPoint.x) ** 2 + (p.y - fromPoint.y) ** 2;
    if (distSq < minDistance) {
      minDistance = distSq;
      bestAnchor = anchor;
    }
  }
  return bestAnchor;
}

/**
 * Generate smooth cubic Bezier SVG path between two anchors with proper tangents and optional midpoint deflection
 */
export function calculateBezierPath(
  p1: Point,
  p2: Point,
  a1: AnchorPosition,
  a2: AnchorPosition,
  offsetX: number = 0,
  offsetY: number = 0
): { path: string; midPoint: Point } {
  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);
  const curvature = Math.max(48, Math.min(180, Math.hypot(dx, dy) * 0.42));

  const cp1 = { ...p1 };
  const cp2 = { ...p2 };

  switch (a1) {
    case 'top':
      cp1.y -= curvature;
      break;
    case 'bottom':
      cp1.y += curvature;
      break;
    case 'left':
      cp1.x -= curvature;
      break;
    case 'right':
      cp1.x += curvature;
      break;
  }

  switch (a2) {
    case 'top':
      cp2.y -= curvature;
      break;
    case 'bottom':
      cp2.y += curvature;
      break;
    case 'left':
      cp2.x -= curvature;
      break;
    case 'right':
      cp2.x += curvature;
      break;
  }

  const t = 0.5;
  const mt = 1 - t;
  const midX =
    mt * mt * mt * p1.x +
    3 * mt * mt * t * cp1.x +
    3 * mt * t * t * cp2.x +
    t * t * t * p2.x;
  const midY =
    mt * mt * mt * p1.y +
    3 * mt * mt * t * cp1.y +
    3 * mt * t * t * cp2.y +
    t * t * t * p2.y;

  const bentCp1X = cp1.x + (offsetX * 4) / 3;
  const bentCp1Y = cp1.y + (offsetY * 4) / 3;
  const bentCp2X = cp2.x + (offsetX * 4) / 3;
  const bentCp2Y = cp2.y + (offsetY * 4) / 3;

  const path = `M ${p1.x} ${p1.y} C ${bentCp1X} ${bentCp1Y}, ${bentCp2X} ${bentCp2Y}, ${p2.x} ${p2.y}`;
  return {
    path,
    midPoint: { x: midX, y: midY },
  };
}

/**
 * Generate flexible SVG path between two anchors based on line type (bezier, straight, step, arc)
 */
export function calculateConnectionPath(
  p1: Point,
  p2: Point,
  a1: AnchorPosition,
  a2: AnchorPosition,
  lineType: 'bezier' | 'straight' | 'step' | 'arc' = 'bezier',
  offsetX: number = 0,
  offsetY: number = 0
): { path: string; midPoint: Point } {
  if (lineType === 'straight') {
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    if (offsetX !== 0 || offsetY !== 0) {
      return {
        path: `M ${p1.x} ${p1.y} Q ${midX + offsetX * 2} ${midY + offsetY * 2} ${p2.x} ${p2.y}`,
        midPoint: { x: midX, y: midY },
      };
    }
    return {
      path: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`,
      midPoint: { x: midX, y: midY },
    };
  }

  if (lineType === 'step') {
    const isHorizontalOrigin = a1 === 'left' || a1 === 'right';
    let path = '';
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    if (isHorizontalOrigin) {
      const stepX = midX + offsetX;
      path = `M ${p1.x} ${p1.y} L ${stepX} ${p1.y} L ${stepX} ${p2.y} L ${p2.x} ${p2.y}`;
    } else {
      const stepY = midY + offsetY;
      path = `M ${p1.x} ${p1.y} L ${p1.x} ${stepY} L ${p2.x} ${stepY} L ${p2.x} ${p2.y}`;
    }

    return {
      path,
      midPoint: { x: midX, y: midY },
    };
  }

  if (lineType === 'arc') {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);
    const radius = Math.max(dist * 0.85, 120);
    const path = `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 0 1 ${p2.x} ${p2.y}`;
    const midX = (p1.x + p2.x) / 2 - dy * 0.08;
    const midY = (p1.y + p2.y) / 2 + dx * 0.08;
    return {
      path,
      midPoint: { x: midX, y: midY },
    };
  }

  return calculateBezierPath(p1, p2, a1, a2, offsetX, offsetY);
}

/**
 * Converts screen client coordinates to canvas world coordinates
 */
export function screenToCanvas(
  clientX: number,
  clientY: number,
  canvasContainerRect: DOMRect,
  panX: number,
  panY: number,
  zoom: number
): Point {
  const relativeX = clientX - canvasContainerRect.left;
  const relativeY = clientY - canvasContainerRect.top;
  return {
    x: (relativeX - panX) / zoom,
    y: (relativeY - panY) / zoom,
  };
}

/**
 * Converts canvas coordinates to screen coordinates
 */
export function canvasToScreen(
  worldX: number,
  worldY: number,
  panX: number,
  panY: number,
  zoom: number
): Point {
  return {
    x: worldX * zoom + panX,
    y: worldY * zoom + panY,
  };
}

/**
 * Checks whether two axis-aligned rectangles intersect
 */
export function isRectIntersecting(r1: Rect, r2: Rect): boolean {
  return !(
    r2.x > r1.x + r1.width ||
    r2.x + r2.width < r1.x ||
    r2.y > r1.y + r1.height ||
    r2.y + r2.height < r1.y
  );
}

/**
 * Ray-casting algorithm to check if a point is inside a polygon (for freehand lasso selection)
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 1e-10) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Perpendicular distance from a point to a line segment
 */
function perpendicularDistance(pt: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const mag = Math.hypot(dx, dy);
  if (mag < 1e-6) return Math.hypot(pt.x - lineStart.x, pt.y - lineStart.y);
  const u = ((pt.x - lineStart.x) * dx + (pt.y - lineStart.y) * dy) / (mag * mag);
  const clampedU = Math.max(0, Math.min(1, u));
  const projX = lineStart.x + clampedU * dx;
  const projY = lineStart.y + clampedU * dy;
  return Math.hypot(pt.x - projX, pt.y - projY);
}

/**
 * Ramer-Douglas-Peucker (RDP) algorithm to simplify freehand stroke points
 */
export function simplifyPointsRDP(points: Point[], epsilon: number = 2.2): Point[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > maxDist) {
      index = i;
      maxDist = d;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPointsRDP(points.slice(0, index + 1), epsilon);
    const right = simplifyPointsRDP(points.slice(index), epsilon);
    return [...left.slice(0, left.length - 1), ...right];
  }
  return [points[0], points[end]];
}

/**
 * Generates a smooth quadratic Bezier SVG path from world coordinates
 */
export function generateSmoothSvgPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} L ${(p.x + 0.5).toFixed(1)} ${(p.y + 0.5).toFixed(1)}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

/**
 * Generates a smooth quadratic Bezier SVG path from normalized (0..1) points and a bounding box
 */
export function generateSmoothSvgPathFromNormalized(
  normPoints: Point[] | undefined,
  x: number,
  y: number,
  width: number,
  height: number
): string {
  if (!normPoints || normPoints.length === 0) return '';
  const worldPts = normPoints.map((np) => ({
    x: x + np.x * width,
    y: y + np.y * height,
  }));
  return generateSmoothSvgPath(worldPts);
}

/**
 * Normalizes raw world stroke points into a bounding box + 0..1 relative points
 */
export function normalizeStrokePoints(points: Point[]): {
  x: number;
  y: number;
  width: number;
  height: number;
  normalizedPoints: Point[];
} {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 20, height: 20, normalizedPoints: [{ x: 0, y: 0 }] };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const rawW = maxX - minX;
  const rawH = maxY - minY;
  const width = Math.max(16, Math.round(rawW));
  const height = Math.max(16, Math.round(rawH));

  const normalizedPoints = points.map((p) => ({
    x: rawW < 1e-3 ? 0.5 : Number(((p.x - minX) / width).toFixed(4)),
    y: rawH < 1e-3 ? 0.5 : Number(((p.y - minY) / height).toFixed(4)),
  }));

  return {
    x: Math.round(minX),
    y: Math.round(minY),
    width,
    height,
    normalizedPoints,
  };
}

/**
 * Heuristic single-stroke Smart Shape recognizer:
 * Classifies a hand-drawn stroke into 'line', 'arrow', 'ellipse', or 'rect' when confident,
 * or returns null if the stroke is an arbitrary freehand curve.
 */
export function recognizeSmartShape(points: Point[]): {
  shapeType: 'rect' | 'ellipse' | 'line' | 'arrow';
  x: number;
  y: number;
  width: number;
  height: number;
  normalizedPoints?: Point[];
} | null {
  if (points.length < 5) return null;

  let pathLength = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
    if (i > 0) {
      pathLength += Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y);
    }
  }

  const start = points[0];
  const end = points[points.length - 1];
  const directDist = Math.hypot(end.x - start.x, end.y - start.y);
  const boxW = maxX - minX;
  const boxH = maxY - minY;
  const diag = Math.hypot(boxW, boxH);

  if (pathLength < 36 || diag < 28) return null;

  // 1. Check Straight Line: pathLength very close to directDist
  if (directDist > 36 && pathLength / directDist < 1.14) {
    const norm = normalizeStrokePoints([start, end]);
    return {
      shapeType: 'line',
      x: norm.x,
      y: norm.y,
      width: norm.width,
      height: norm.height,
      normalizedPoints: norm.normalizedPoints,
    };
  }

  // 2. Check Single-Stroke Arrow: main shaft (first 75% of points) is straight,
  // and the tail hook bends sharply at the end
  const shaftEndIdx = Math.floor(points.length * 0.76);
  if (shaftEndIdx >= 4) {
    const shaftPoint = points[shaftEndIdx];
    const shaftDirect = Math.hypot(shaftPoint.x - start.x, shaftPoint.y - start.y);
    let shaftLen = 0;
    for (let i = 1; i <= shaftEndIdx; i++) {
      shaftLen += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    const hookLen = pathLength - shaftLen;
    if (
      shaftDirect > 45 &&
      shaftLen / shaftDirect < 1.15 &&
      hookLen > 12 &&
      hookLen < shaftDirect * 0.55
    ) {
      const v1x = shaftPoint.x - start.x;
      const v1y = shaftPoint.y - start.y;
      const v2x = end.x - shaftPoint.x;
      const v2y = end.y - shaftPoint.y;
      const dot = (v1x * v2x + v1y * v2y) / (Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y) + 1e-6);
      // Hook turns back or sideways (dot < 0.35)
      if (dot < 0.35) {
        const norm = normalizeStrokePoints([start, shaftPoint]);
        return {
          shapeType: 'arrow',
          x: norm.x,
          y: norm.y,
          width: norm.width,
          height: norm.height,
          normalizedPoints: norm.normalizedPoints,
        };
      }
    }
  }

  // 3. Check Closed Shapes (Circle/Ellipse vs Rectangle)
  const isClosed = directDist < Math.max(68, pathLength * 0.28);
  if (isClosed && boxW >= 34 && boxH >= 34) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = boxW / 2;
    const ry = boxH / 2;

    // Measure radial deviation from an ideal ellipse and corner proximity for a rectangle
    let ellipseErrSum = 0;
    let rectEdgeDistSum = 0;
    for (const p of points) {
      const normRx = (p.x - cx) / (rx || 1);
      const normRy = (p.y - cy) / (ry || 1);
      const r = Math.hypot(normRx, normRy);
      ellipseErrSum += Math.abs(r - 1);

      const dLeft = Math.abs(p.x - minX) / boxW;
      const dRight = Math.abs(maxX - p.x) / boxW;
      const dTop = Math.abs(p.y - minY) / boxH;
      const dBottom = Math.abs(maxY - p.y) / boxH;
      rectEdgeDistSum += Math.min(dLeft, dRight, dTop, dBottom);
    }

    const avgEllipseErr = ellipseErrSum / points.length;
    const avgRectEdgeErr = rectEdgeDistSum / points.length;

    if (avgEllipseErr < 0.22 || avgRectEdgeErr < 0.16) {
      const shapeType = avgEllipseErr <= avgRectEdgeErr * 1.35 ? 'ellipse' : 'rect';
      return {
        shapeType,
        x: Math.round(minX),
        y: Math.round(minY),
        width: Math.round(boxW),
        height: Math.round(boxH),
      };
    }
  }

  return null;
}

/**
 * Checks if two line segments (p1-p2) and (p3-p4) intersect
 */
export function doLineSegmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const ccw = (A: Point, B: Point, C: Point) =>
    (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

/**
 * Checks if a user's polyline gesture (e.g. Lasso Knife or Eraser) intersects a relationship curve
 * approximated by sampling points between p1, midPoint, and p2
 */
export function doesPolylineIntersectCurve(
  gesturePoints: Point[],
  p1: Point,
  midPoint: Point,
  p2: Point
): boolean {
  if (gesturePoints.length < 2) return false;
  // Approximate the curve with 8 segments using quadratic Bezier through midPoint
  const controlX = 2 * midPoint.x - 0.5 * (p1.x + p2.x);
  const controlY = 2 * midPoint.y - 0.5 * (p1.y + p2.y);
  const curveSamples: Point[] = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    curveSamples.push({
      x: mt * mt * p1.x + 2 * mt * t * controlX + t * t * p2.x,
      y: mt * mt * p1.y + 2 * mt * t * controlY + t * t * p2.y,
    });
  }

  for (let i = 0; i < gesturePoints.length - 1; i++) {
    const a1 = gesturePoints[i];
    const a2 = gesturePoints[i + 1];
    for (let j = 0; j < curveSamples.length - 1; j++) {
      if (doLineSegmentsIntersect(a1, a2, curveSamples[j], curveSamples[j + 1])) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Samples points along a relationship curve between p1 and p2 with midpoint offset
 */
export function sampleRelationshipPoints(
  p1: Point,
  p2: Point,
  offsetX: number = 0,
  offsetY: number = 0,
  steps: number = 10
): Point[] {
  const midX = (p1.x + p2.x) / 2 + offsetX;
  const midY = (p1.y + p2.y) / 2 + offsetY;
  const controlX = 2 * midX - 0.5 * (p1.x + p2.x);
  const controlY = 2 * midY - 0.5 * (p1.y + p2.y);
  const samples: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    samples.push({
      x: mt * mt * p1.x + 2 * mt * t * controlX + t * t * p2.x,
      y: mt * mt * p1.y + 2 * mt * t * controlY + t * t * p2.y,
    });
  }
  return samples;
}

/**
 * Checks if any point of a polyline is inside a polygon or intersects its edges
 */
export function isPolylineIntersectingPolygon(polyline: Point[], polygon: Point[]): boolean {
  if (polyline.length === 0 || polygon.length < 3) return false;
  for (const pt of polyline) {
    if (isPointInPolygon(pt, polygon)) return true;
  }
  for (let i = 0; i < polyline.length - 1; i++) {
    for (let j = 0; j < polygon.length; j++) {
      const nextJ = (j + 1) % polygon.length;
      if (doLineSegmentsIntersect(polyline[i], polyline[i + 1], polygon[j], polygon[nextJ])) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Checks if a world point is near a vector annotation or inside its bounds (used by Eraser tool)
 */
export function isPointNearAnnotation(
  pt: Point,
  ann: {
    kind: string;
    x: number;
    y: number;
    width: number;
    height: number;
    points?: Point[];
  },
  threshold: number = 18
): boolean {
  // Fast bounding-box check with margin
  if (
    pt.x < ann.x - threshold ||
    pt.x > ann.x + ann.width + threshold ||
    pt.y < ann.y - threshold ||
    pt.y > ann.y + ann.height + threshold
  ) {
    return false;
  }

  if (
    ann.kind === 'sticky' ||
    ann.kind === 'text' ||
    (ann.kind === 'shape' && (!ann.points || ann.points.length === 0))
  ) {
    return (
      pt.x >= ann.x - threshold * 0.5 &&
      pt.x <= ann.x + ann.width + threshold * 0.5 &&
      pt.y >= ann.y - threshold * 0.5 &&
      pt.y <= ann.y + ann.height + threshold * 0.5
    );
  }

  if (ann.points && ann.points.length > 0) {
    const worldPts = ann.points.map((np) => ({
      x: ann.x + np.x * ann.width,
      y: ann.y + np.y * ann.height,
    }));
    if (worldPts.length === 1) {
      return Math.hypot(pt.x - worldPts[0].x, pt.y - worldPts[0].y) <= threshold;
    }
    for (let i = 0; i < worldPts.length - 1; i++) {
      if (perpendicularDistance(pt, worldPts[i], worldPts[i + 1]) <= threshold) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Removes tiny accidental mouse-release / mouse-press micro-hooks at the ends of a raw stroke
 * so that freehand curves end smoothly along their natural trajectory.
 */
export function cleanStrokeEndpoints(points: Point[]): Point[] {
  if (points.length <= 3) return points;
  let pts = [...points];

  // Trim trailing micro-hooks (within last 6px if angle deviates sharply from preceding trajectory)
  for (let pass = 0; pass < 2 && pts.length > 3; pass++) {
    const n = pts.length;
    const last = pts[n - 1];
    const prev1 = pts[n - 2];
    const prev2 = pts[Math.max(0, n - 4)];
    const tailSegLen = Math.hypot(last.x - prev1.x, last.y - prev1.y);
    const bodySegLen = Math.hypot(prev1.x - prev2.x, prev1.y - prev2.y);
    if (tailSegLen < 6.5 && bodySegLen > 4) {
      const v1x = (prev1.x - prev2.x) / bodySegLen;
      const v1y = (prev1.y - prev2.y) / bodySegLen;
      const v2x = (last.x - prev1.x) / (tailSegLen || 1);
      const v2y = (last.y - prev1.y) / (tailSegLen || 1);
      const dot = v1x * v2x + v1y * v2y;
      if (dot < 0.65) {
        pts.pop();
      }
    }
  }

  // Trim leading micro-hooks at start
  for (let pass = 0; pass < 2 && pts.length > 3; pass++) {
    const first = pts[0];
    const next1 = pts[1];
    const next2 = pts[Math.min(pts.length - 1, 3)];
    const headSegLen = Math.hypot(first.x - next1.x, first.y - next1.y);
    const bodySegLen = Math.hypot(next1.x - next2.x, next1.y - next2.y);
    if (headSegLen < 6.5 && bodySegLen > 4) {
      const v1x = (next1.x - next2.x) / bodySegLen;
      const v1y = (next1.y - next2.y) / bodySegLen;
      const v2x = (first.x - next1.x) / (headSegLen || 1);
      const v2y = (first.y - next1.y) / (headSegLen || 1);
      const dot = v1x * v2x + v1y * v2y;
      if (dot < 0.65) {
        pts.shift();
      }
    }
  }

  return pts;
}

/**
 * Interpolates a point along a polyline at a specified arc-length distance from either 'end' or 'start'.
 */
function samplePointAtArcDistanceFromEnd(
  pts: Point[],
  targetDist: number,
  fromEnd: 'end' | 'start'
): Point {
  if (pts.length === 0) return { x: 0, y: 0 };
  if (pts.length === 1) return pts[0];

  let accumulated = 0;
  if (fromEnd === 'end') {
    for (let i = pts.length - 1; i > 0; i--) {
      const curr = pts[i];
      const prev = pts[i - 1];
      const segLen = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      if (segLen < 1e-4) continue;
      if (accumulated + segLen >= targetDist) {
        const remain = targetDist - accumulated;
        const ratio = remain / segLen;
        return {
          x: curr.x + (prev.x - curr.x) * ratio,
          y: curr.y + (prev.y - curr.y) * ratio,
        };
      }
      accumulated += segLen;
    }
    return pts[0];
  } else {
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const segLen = Math.hypot(next.x - curr.x, next.y - curr.y);
      if (segLen < 1e-4) continue;
      if (accumulated + segLen >= targetDist) {
        const remain = targetDist - accumulated;
        const ratio = remain / segLen;
        return {
          x: curr.x + (next.x - curr.x) * ratio,
          y: curr.y + (next.y - curr.y) * ratio,
        };
      }
      accumulated += segLen;
    }
    return pts[pts.length - 1];
  }
}

/**
 * Computes a natural, tangent-aligned swept arrowhead for freehand or straight strokes.
 * Walks along the actual arc-length of the curve (blending near and medium lookback distances)
 * so the arrow direction always matches the natural flow of the line at its endpoint.
 */
export function computeNaturalArrowhead(
  worldPts: Point[],
  strokeWidth: number,
  whichEnd: 'end' | 'start' = 'end'
): {
  tip: Point;
  leftWing: Point;
  notch: Point;
  rightWing: Point;
  angle: number;
  polygonPoints: string;
} | null {
  if (!worldPts || worldPts.length < 2) return null;

  let totalLen = 0;
  for (let i = 1; i < worldPts.length; i++) {
    totalLen += Math.hypot(
      worldPts[i].x - worldPts[i - 1].x,
      worldPts[i].y - worldPts[i - 1].y
    );
  }
  if (totalLen < 2) return null;

  const anchor = whichEnd === 'end' ? worldPts[worldPts.length - 1] : worldPts[0];

  // Sample two points along the curve's arc length from the endpoint to get a stable, natural tangent
  const nearDist = Math.min(totalLen * 0.45, Math.max(8, strokeWidth * 2.2));
  const midDist = Math.min(totalLen * 0.75, Math.max(18, strokeWidth * 4.5));

  const nearPt = samplePointAtArcDistanceFromEnd(worldPts, nearDist, whichEnd);
  const midPt = samplePointAtArcDistanceFromEnd(worldPts, midDist, whichEnd);

  const vNearX = anchor.x - nearPt.x;
  const vNearY = anchor.y - nearPt.y;
  const lenNear = Math.hypot(vNearX, vNearY) || 1;

  const vMidX = anchor.x - midPt.x;
  const vMidY = anchor.y - midPt.y;
  const lenMid = Math.hypot(vMidX, vMidY) || 1;

  // Blend 65% local tangent + 35% medium-range tangent for smooth curve alignment without micro-jitter
  const dirX = (vNearX / lenNear) * 0.65 + (vMidX / lenMid) * 0.35;
  const dirY = (vNearY / lenNear) * 0.65 + (vMidY / lenMid) * 0.35;
  const angle = Math.atan2(dirY, dirX);

  const headLen = Math.max(13, strokeWidth * 3.4);
  const wingAngle = Math.PI / 6.4; // ~28 degrees sleek swept wing

  // Extend the tip slightly forward along the tangent so the stroke's round cap is tucked inside the arrowhead
  const tipAdvance = Math.max(2, strokeWidth * 0.55);
  const tip = {
    x: anchor.x + Math.cos(angle) * tipAdvance,
    y: anchor.y + Math.sin(angle) * tipAdvance,
  };

  const leftWing = {
    x: tip.x - headLen * Math.cos(angle - wingAngle),
    y: tip.y - headLen * Math.sin(angle - wingAngle),
  };

  const rightWing = {
    x: tip.x - headLen * Math.cos(angle + wingAngle),
    y: tip.y - headLen * Math.sin(angle + wingAngle),
  };

  // Swept-back inner notch for a crisp, natural tactical arrowhead look
  const notchDepth = headLen * 0.74;
  const notch = {
    x: tip.x - notchDepth * Math.cos(angle),
    y: tip.y - notchDepth * Math.sin(angle),
  };

  const polygonPoints = `${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${leftWing.x.toFixed(1)},${leftWing.y.toFixed(1)} ${notch.x.toFixed(1)},${notch.y.toFixed(1)} ${rightWing.x.toFixed(1)},${rightWing.y.toFixed(1)}`;

  return {
    tip,
    leftWing,
    notch,
    rightWing,
    angle,
    polygonPoints,
  };
}

/**
 * Returns the 8 key pickable points on a rectangular box:
 * 4 corners (左上/右上/右下/左下角点) + 4 edge midpoints (上/右/下/左中点).
 */
export function getBoxCornerAndEdgePoints(box: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { nx: number; ny: number; x: number; y: number; isCorner: boolean; labelZh: string }[] {
  const norms = [
    { nx: 0, ny: 0, isCorner: true, labelZh: '左上角点' },
    { nx: 0.5, ny: 0, isCorner: false, labelZh: '上边中点' },
    { nx: 1, ny: 0, isCorner: true, labelZh: '右上角点' },
    { nx: 1, ny: 0.5, isCorner: false, labelZh: '右边中点' },
    { nx: 1, ny: 1, isCorner: true, labelZh: '右下角点' },
    { nx: 0.5, ny: 1, isCorner: false, labelZh: '下边中点' },
    { nx: 0, ny: 1, isCorner: true, labelZh: '左下角点' },
    { nx: 0, ny: 0.5, isCorner: false, labelZh: '左边中点' },
  ];
  return norms.map((n) => ({
    ...n,
    x: box.x + n.nx * box.width,
    y: box.y + n.ny * box.height,
  }));
}

/**
 * Snaps a world point to the perimeter of a box, prioritizing its 4 corners and 4 edge midpoints.
 */
export function snapPointToBoxPerimeter(
  pt: Point,
  box: { x: number; y: number; width: number; height: number },
  snapRadius: number = 20
): { nx: number; ny: number; x: number; y: number; snappedKeyPoint: boolean } {
  const keyPts = getBoxCornerAndEdgePoints(box);
  let bestKey = keyPts[0];
  let bestKeyDist = Infinity;
  for (const kp of keyPts) {
    // Give corners a slight priority bonus so picking corners feels crisp
    const rawDist = Math.hypot(pt.x - kp.x, pt.y - kp.y);
    const weightedDist = kp.isCorner ? rawDist * 0.85 : rawDist;
    if (weightedDist < bestKeyDist) {
      bestKeyDist = weightedDist;
      bestKey = kp;
    }
  }

  if (Math.hypot(pt.x - bestKey.x, pt.y - bestKey.y) <= snapRadius) {
    return {
      nx: bestKey.nx,
      ny: bestKey.ny,
      x: bestKey.x,
      y: bestKey.y,
      snappedKeyPoint: true,
    };
  }

  // Project onto the closest edge of the box
  const clampedX = Math.max(box.x, Math.min(box.x + box.width, pt.x));
  const clampedY = Math.max(box.y, Math.min(box.y + box.height, pt.y));
  const dLeft = Math.abs(clampedX - box.x);
  const dRight = Math.abs(box.x + box.width - clampedX);
  const dTop = Math.abs(clampedY - box.y);
  const dBottom = Math.abs(box.y + box.height - clampedY);
  const minEdge = Math.min(dLeft, dRight, dTop, dBottom);

  let edgeX = clampedX;
  let edgeY = clampedY;
  if (minEdge === dLeft) edgeX = box.x;
  else if (minEdge === dRight) edgeX = box.x + box.width;
  else if (minEdge === dTop) edgeY = box.y;
  else edgeY = box.y + box.height;

  const nx = Number(((edgeX - box.x) / (box.width || 1)).toFixed(3));
  const ny = Number(((edgeY - box.y) / (box.height || 1)).toFixed(3));
  return {
    nx: Math.max(0, Math.min(1, nx)),
    ny: Math.max(0, Math.min(1, ny)),
    x: edgeX,
    y: edgeY,
    snappedKeyPoint: false,
  };
}

/**
 * Computes the geometry of a Sticky Note's Callout Leader Line (引出线),
 * supporting corner/edge origin picking, movable/editable intermediate corner vertices (折角点),
 * and target corner/anchor snapping.
 */
export function computeStickyCalloutGeometry(
  ann: {
    x: number;
    y: number;
    width: number;
    height: number;
    calloutStartNorm?: { x: number; y: number };
    calloutElbows?: { x: number; y: number }[];
    calloutOffsetX?: number;
    calloutOffsetY?: number;
  },
  targetPointOverride?: Point
): {
  startPt: Point;
  startNorm: { x: number; y: number };
  elbowPts: Point[];
  elbowOffsets: { x: number; y: number }[];
  endPt: Point;
  allPoints: Point[];
  segmentMidpoints: { x: number; y: number; insertIndex: number }[];
  controlPt: Point;
  pathD: string;
  arrowhead: {
    tip: Point;
    leftWing: Point;
    notch: Point;
    rightWing: Point;
    angle: number;
    polygonPoints: string;
  };
} {
  const endPt: Point = targetPointOverride || {
    x: ann.x + (ann.calloutOffsetX ?? -85),
    y: ann.y + (ann.calloutOffsetY ?? Math.round(ann.height + 48)),
  };

  // Determine startNorm & startPt on sticky note perimeter (corners or edge midpoints)
  let startNorm = ann.calloutStartNorm;
  let startPt: Point;

  if (startNorm) {
    startPt = {
      x: ann.x + startNorm.x * ann.width,
      y: ann.y + startNorm.y * ann.height,
    };
  } else {
    // Pick the closest among the 8 corners & edge midpoints toward the first bend or target
    const refTarget =
      ann.calloutElbows && ann.calloutElbows.length > 0
        ? { x: ann.x + ann.calloutElbows[0].x, y: ann.y + ann.calloutElbows[0].y }
        : endPt;
    const keyPts = getBoxCornerAndEdgePoints(ann);
    let best = keyPts[6]; // default bottom-left corner
    let bestDist = Infinity;
    for (const kp of keyPts) {
      const d = Math.hypot(refTarget.x - kp.x, refTarget.y - kp.y);
      if (d < bestDist) {
        bestDist = d;
        best = kp;
      }
    }
    startNorm = { x: best.nx, y: best.ny };
    startPt = { x: best.x, y: best.y };
  }

  // Resolve intermediate corner/elbow vertices (折角点)
  let elbowOffsets: { x: number; y: number }[];
  if (ann.calloutElbows !== undefined) {
    elbowOffsets = ann.calloutElbows;
  } else {
    // Default 1 CAD-style elbow vertex between startPt and endPt so user can immediately see & drag the corner
    const defaultElbowWorldX = Math.round(startPt.x + (endPt.x - startPt.x) * 0.45);
    const defaultElbowWorldY = Math.round(endPt.y);
    elbowOffsets = [
      {
        x: defaultElbowWorldX - ann.x,
        y: defaultElbowWorldY - ann.y,
      },
    ];
  }

  const elbowPts: Point[] = elbowOffsets.map((off) => ({
    x: ann.x + off.x,
    y: ann.y + off.y,
  }));

  const allPoints: Point[] = [startPt, ...elbowPts, endPt];

  const segmentMidpoints: { x: number; y: number; insertIndex: number }[] = [];
  for (let i = 0; i < allPoints.length - 1; i++) {
    const a = allPoints[i];
    const b = allPoints[i + 1];
    if (Math.hypot(b.x - a.x, b.y - a.y) >= 28) {
      segmentMidpoints.push({
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        insertIndex: i,
      });
    }
  }

  const pathD = allPoints
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');

  const prevPt = allPoints[Math.max(0, allPoints.length - 2)];
  const controlPt = prevPt;

  const arrowhead = computeNaturalArrowhead([prevPt, endPt], 2.2, 'end') || {
    tip: endPt,
    leftWing: { x: endPt.x - 10, y: endPt.y - 5 },
    notch: { x: endPt.x - 7, y: endPt.y },
    rightWing: { x: endPt.x - 10, y: endPt.y + 5 },
    angle: 0,
    polygonPoints: `${endPt.x},${endPt.y} ${endPt.x - 10},${endPt.y - 5} ${endPt.x - 7},${endPt.y} ${endPt.x - 10},${endPt.y + 5}`,
  };

  return {
    startPt,
    startNorm,
    elbowPts,
    elbowOffsets,
    endPt,
    allPoints,
    segmentMidpoints,
    controlPt,
    pathD,
    arrowhead,
  };
}

/**
 * Generates crisp SVG path data for all 12 common geometric shapes so they can be rendered
 * uniformly in Canvas.tsx, SVG export, and Canvas2D Path2D export.
 */
export function buildCommonShapeSvgPath(
  shapeType: string,
  width: number,
  height: number,
  strokeWidth: number = 2
): { mainPath: string; detailPath?: string } {
  const w = Math.max(16, width);
  const h = Math.max(16, height);
  const pad = Math.max(2, strokeWidth / 2 + 1);
  const x0 = pad;
  const y0 = pad;
  const x1 = w - pad;
  const y1 = h - pad;
  const bw = Math.max(4, x1 - x0);
  const bh = Math.max(4, y1 - y0);
  const cx = w / 2;
  const cy = h / 2;

  switch (shapeType) {
    case 'rect': {
      const r = Math.min(4, bw * 0.04, bh * 0.04);
      return {
        mainPath: `M ${x0 + r} ${y0} H ${x1 - r} Q ${x1} ${y0} ${x1} ${y0 + r} V ${y1 - r} Q ${x1} ${y1} ${x1 - r} ${y1} H ${x0 + r} Q ${x0} ${y1} ${x0} ${y1 - r} V ${y0 + r} Q ${x0} ${y0} ${x0 + r} ${y0} Z`,
      };
    }
    case 'rounded-rect': {
      const r = Math.min(22, bw * 0.24, bh * 0.24);
      return {
        mainPath: `M ${x0 + r} ${y0} H ${x1 - r} Q ${x1} ${y0} ${x1} ${y0 + r} V ${y1 - r} Q ${x1} ${y1} ${x1 - r} ${y1} H ${x0 + r} Q ${x0} ${y1} ${x0} ${y1 - r} V ${y0 + r} Q ${x0} ${y0} ${x0 + r} ${y0} Z`,
      };
    }
    case 'ellipse': {
      const rx = bw / 2;
      const ry = bh / 2;
      return {
        mainPath: `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`,
      };
    }
    case 'diamond': {
      return {
        mainPath: `M ${cx} ${y0} L ${x1} ${cy} L ${cx} ${y1} L ${x0} ${cy} Z`,
      };
    }
    case 'triangle': {
      return {
        mainPath: `M ${cx} ${y0} L ${x1} ${y1} L ${x0} ${y1} Z`,
      };
    }
    case 'parallelogram': {
      const skew = Math.min(bw * 0.2, 28);
      return {
        mainPath: `M ${x0 + skew} ${y0} L ${x1} ${y0} L ${x1 - skew} ${y1} L ${x0} ${y1} Z`,
      };
    }
    case 'hexagon': {
      const inset = Math.min(bw * 0.22, 32);
      return {
        mainPath: `M ${x0 + inset} ${y0} L ${x1 - inset} ${y0} L ${x1} ${cy} L ${x1 - inset} ${y1} L ${x0 + inset} ${y1} L ${x0} ${cy} Z`,
      };
    }
    case 'cylinder': {
      const rx = bw / 2;
      const ry = Math.min(18, bh * 0.16);
      const topY = y0 + ry;
      const botY = y1 - ry;
      const mainPath = `M ${x0} ${topY} A ${rx} ${ry} 0 0 1 ${x1} ${topY} V ${botY} A ${rx} ${ry} 0 0 1 ${x0} ${botY} Z`;
      const detailPath = `M ${x0} ${topY} A ${rx} ${ry} 0 0 0 ${x1} ${topY}`;
      return { mainPath, detailPath };
    }
    case 'cloud': {
      // Normalized smooth cloud contour scaled to [x0..x1, y0..y1]
      const px = (nx: number) => (x0 + nx * bw).toFixed(1);
      const py = (ny: number) => (y0 + ny * bh).toFixed(1);
      return {
        mainPath: [
          `M ${px(0.25)} ${py(0.78)}`,
          `C ${px(0.08)} ${py(0.78)} ${px(0.02)} ${py(0.62)} ${px(0.11)} ${py(0.48)}`,
          `C ${px(0.07)} ${py(0.30)} ${px(0.22)} ${py(0.16)} ${px(0.38)} ${py(0.23)}`,
          `C ${px(0.46)} ${py(0.06)} ${px(0.70)} ${py(0.08)} ${px(0.77)} ${py(0.26)}`,
          `C ${px(0.93)} ${py(0.26)} ${px(0.99)} ${py(0.46)} ${px(0.90)} ${py(0.62)}`,
          `C ${px(0.96)} ${py(0.74)} ${px(0.85)} ${py(0.84)} ${px(0.72)} ${py(0.80)}`,
          `Z`,
        ].join(' '),
      };
    }
    case 'star': {
      const outerRx = bw / 2;
      const outerRy = bh / 2;
      const innerRx = outerRx * 0.42;
      const innerRy = outerRy * 0.42;
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const rx = i % 2 === 0 ? outerRx : innerRx;
        const ry = i % 2 === 0 ? outerRy : innerRy;
        const sx = cx + Math.cos(angle) * rx;
        const sy = cy + Math.sin(angle) * ry;
        pts.push(`${i === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`);
      }
      pts.push('Z');
      return { mainPath: pts.join(' ') };
    }
    case 'callout-bubble': {
      const r = Math.min(14, bw * 0.14, bh * 0.16);
      const bodyBottom = y0 + bh * 0.78;
      const tailX1 = x0 + bw * 0.22;
      const tailTipX = x0 + bw * 0.14;
      const tailX2 = x0 + bw * 0.38;
      return {
        mainPath: [
          `M ${x0 + r} ${y0}`,
          `H ${x1 - r}`,
          `Q ${x1} ${y0} ${x1} ${y0 + r}`,
          `V ${bodyBottom - r}`,
          `Q ${x1} ${bodyBottom} ${x1 - r} ${bodyBottom}`,
          `H ${tailX2}`,
          `L ${tailTipX} ${y1}`,
          `L ${tailX1} ${bodyBottom}`,
          `H ${x0 + r}`,
          `Q ${x0} ${bodyBottom} ${x0} ${bodyBottom - r}`,
          `V ${y0 + r}`,
          `Q ${x0} ${y0} ${x0 + r} ${y0}`,
          `Z`,
        ].join(' '),
      };
    }
    case 'arrow-block': {
      const shaftTop = y0 + bh * 0.26;
      const shaftBot = y0 + bh * 0.74;
      const headX = x0 + bw * 0.64;
      return {
        mainPath: `M ${x0} ${shaftTop} L ${headX} ${shaftTop} L ${headX} ${y0} L ${x1} ${cy} L ${headX} ${y1} L ${headX} ${shaftBot} L ${x0} ${shaftBot} Z`,
      };
    }
    default: {
      return {
        mainPath: `M ${x0} ${y0} H ${x1} V ${y1} H ${x0} Z`,
      };
    }
  }
}


