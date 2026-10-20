export type ShapeKind = 'circle' | 'capsule' | 'polygon';

export interface Body {
  id: number;
  entity: number;
  kind: ShapeKind;
  layer: number;
  mask: number;
  trigger: boolean;
  x: number;
  y: number;
  rotation: number;
  radius: number;
  halfLength: number;
  points: number[];
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** 多边形顶点是世界坐标（局部点已按 rotation 旋转并平移）。 */
export function worldPoints(body: Body): number[] {
  const cos = Math.cos(body.rotation);
  const sin = Math.sin(body.rotation);
  const out: number[] = [];
  for (let index = 0; index < body.points.length; index += 2) {
    const px = body.points[index] as number;
    const py = body.points[index + 1] as number;
    out.push(body.x + px * cos - py * sin, body.y + px * sin + py * cos);
  }
  return out;
}

export function capsuleEnds(body: Body): readonly [number, number, number, number] {
  const dx = Math.cos(body.rotation) * body.halfLength;
  const dy = Math.sin(body.rotation) * body.halfLength;
  return [body.x - dx, body.y - dy, body.x + dx, body.y + dy];
}

export function boundsOf(body: Body): Bounds {
  if (body.kind === 'circle') {
    return { minX: body.x - body.radius, minY: body.y - body.radius, maxX: body.x + body.radius, maxY: body.y + body.radius };
  }
  if (body.kind === 'capsule') {
    const [ax, ay, bx, by] = capsuleEnds(body);
    return {
      minX: Math.min(ax, bx) - body.radius,
      minY: Math.min(ay, by) - body.radius,
      maxX: Math.max(ax, bx) + body.radius,
      maxY: Math.max(ay, by) + body.radius,
    };
  }
  const points = worldPoints(body);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < points.length; index += 2) {
    minX = Math.min(minX, points[index] as number);
    maxX = Math.max(maxX, points[index] as number);
    minY = Math.min(minY, points[index + 1] as number);
    maxY = Math.max(maxY, points[index + 1] as number);
  }
  return { minX, minY, maxX, maxY };
}

export function pointSegDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function segSegDistance(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): number {
  if (segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) {
    return 0;
  }
  return Math.min(
    pointSegDistance(ax, ay, cx, cy, dx, dy),
    pointSegDistance(bx, by, cx, cy, dx, dy),
    pointSegDistance(cx, cy, ax, ay, bx, by),
    pointSegDistance(dx, dy, ax, ay, bx, by),
  );
}

export function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): boolean {
  const d1 = cross(cx, cy, dx, dy, ax, ay);
  const d2 = cross(cx, cy, dx, dy, bx, by);
  const d3 = cross(ax, ay, bx, by, cx, cy);
  const d4 = cross(ax, ay, bx, by, dx, dy);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

function cross(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
  return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
}

export function pointInPolygon(x: number, y: number, points: readonly number[]): boolean {
  let inside = false;
  for (let index = 0, prev = points.length - 2; index < points.length; prev = index, index += 2) {
    const xi = points[index] as number;
    const yi = points[index + 1] as number;
    const xj = points[prev] as number;
    const yj = points[prev + 1] as number;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
