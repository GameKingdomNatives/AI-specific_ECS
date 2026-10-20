export type ShapeKind = 'circle' | 'box' | 'polygon';

export interface Body {
  id: number;
  entity: number;
  kind: ShapeKind;
  x: number;
  y: number;
  radius: number;
  hw: number;
  hh: number;
  points: number[] | null;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsOf(body: Body): Bounds {
  if (body.kind === 'circle') {
    return { minX: body.x - body.radius, minY: body.y - body.radius, maxX: body.x + body.radius, maxY: body.y + body.radius };
  }
  if (body.kind === 'box') {
    return { minX: body.x - body.hw, minY: body.y - body.hh, maxX: body.x + body.hw, maxY: body.y + body.hh };
  }
  const points = body.points ?? [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < points.length; index += 2) {
    minX = Math.min(minX, body.x + (points[index] as number));
    maxX = Math.max(maxX, body.x + (points[index] as number));
    minY = Math.min(minY, body.y + (points[index + 1] as number));
    maxY = Math.max(maxY, body.y + (points[index + 1] as number));
  }
  return { minX, minY, maxX, maxY };
}

export function overlapsCircle(body: Body, x: number, y: number, radius: number): boolean {
  if (body.kind === 'circle') {
    return Math.hypot(body.x - x, body.y - y) <= body.radius + radius;
  }
  if (body.kind === 'box') {
    const nx = Math.max(body.x - body.hw, Math.min(x, body.x + body.hw));
    const ny = Math.max(body.y - body.hh, Math.min(y, body.y + body.hh));
    return Math.hypot(nx - x, ny - y) <= radius;
  }
  return circlePolygon(body, x, y, radius);
}

function circlePolygon(body: Body, x: number, y: number, radius: number): boolean {
  const points = body.points ?? [];
  let inside = true;
  let minDistance = Infinity;
  for (let index = 0; index < points.length; index += 2) {
    const ax = body.x + (points[index] as number);
    const ay = body.y + (points[index + 1] as number);
    const nextIndex = (index + 2) % points.length;
    const bx = body.x + (points[nextIndex] as number);
    const by = body.y + (points[nextIndex + 1] as number);
    if ((bx - ax) * (y - ay) - (by - ay) * (x - ax) < 0) {
      inside = false;
    }
    minDistance = Math.min(minDistance, distanceToSegment(x, y, ax, ay, bx, by));
  }
  return inside || minDistance <= radius;
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function rayHits(body: Body, x: number, y: number, ux: number, uy: number, maxDistance: number): number | null {
  if (body.kind === 'circle') {
    return rayCircle(body, x, y, ux, uy, maxDistance);
  }
  if (body.kind === 'box') {
    const box = [-body.hw, -body.hh, body.hw, -body.hh, body.hw, body.hh, -body.hw, body.hh];
    return rayConvex(body.x, body.y, box, x, y, ux, uy, maxDistance);
  }
  return rayConvex(body.x, body.y, body.points ?? [], x, y, ux, uy, maxDistance);
}

function rayCircle(body: Body, x: number, y: number, ux: number, uy: number, maxDistance: number): number | null {
  const ox = x - body.x;
  const oy = y - body.y;
  const b = ox * ux + oy * uy;
  const c = ox * ox + oy * oy - body.radius * body.radius;
  const discriminant = b * b - c;
  if (discriminant < 0) {
    return null;
  }
  const t = -b - Math.sqrt(discriminant);
  if (t >= 0 && t <= maxDistance) {
    return t;
  }
  return c <= 0 ? 0 : null;
}

/** 凸多边形按边法线做区间裁剪（slab），返回最近入射距离。 */
function rayConvex(
  originX: number,
  originY: number,
  points: readonly number[],
  x: number,
  y: number,
  ux: number,
  uy: number,
  maxDistance: number,
): number | null {
  let tMin = 0;
  let tMax = maxDistance;
  for (let index = 0; index < points.length; index += 2) {
    const ax = originX + (points[index] as number);
    const ay = originY + (points[index + 1] as number);
    const nextIndex = (index + 2) % points.length;
    const bx = originX + (points[nextIndex] as number);
    const by = originY + (points[nextIndex + 1] as number);
    const nx = by - ay;
    const ny = -(bx - ax);
    const denominator = nx * ux + ny * uy;
    const distance = nx * (x - ax) + ny * (y - ay);
    if (Math.abs(denominator) < 1e-9) {
      if (distance > 0) {
        return null;
      }
      continue;
    }
    const t = -distance / denominator;
    if (denominator < 0) {
      tMin = Math.max(tMin, t);
    } else {
      tMax = Math.min(tMax, t);
    }
    if (tMin > tMax) {
      return null;
    }
  }
  return tMin <= maxDistance ? tMin : null;
}
