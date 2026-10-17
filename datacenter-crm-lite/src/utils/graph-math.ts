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
