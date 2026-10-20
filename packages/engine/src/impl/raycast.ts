import type { Body } from './geometry.js';
import { worldPoints } from './geometry.js';
import { circleAgainst } from './overlap.js';

export interface LocalHit {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly nx: number;
  readonly ny: number;
}

export function rayHit(body: Body, ox: number, oy: number, ux: number, uy: number, max: number): LocalHit | null {
  if (body.kind === 'circle') {
    return rayCircle(body.x, body.y, body.radius, ox, oy, ux, uy, max);
  }
  if (body.kind === 'capsule') {
    return rayCapsule(body, ox, oy, ux, uy, max);
  }
  return rayPolygon(worldPoints(body), ox, oy, ux, uy, max);
}

export function rayCircle(
  cx: number,
  cy: number,
  radius: number,
  ox: number,
  oy: number,
  ux: number,
  uy: number,
  max: number,
): LocalHit | null {
  const dx = ox - cx;
  const dy = oy - cy;
  const b = dx * ux + dy * uy;
  const c = dx * dx + dy * dy - radius * radius;
  const discriminant = b * b - c;
  if (discriminant < 0) {
    return null;
  }
  const root = Math.sqrt(discriminant);
  let t = -b - root;
  if (t < 0) {
    t = c <= 0 ? 0 : -b + root;
  }
  if (t < 0 || t > max) {
    return null;
  }
  const px = ox + ux * t;
  const py = oy + uy * t;
  const length = Math.hypot(px - cx, py - cy) || 1;
  return { t, x: px, y: py, nx: (px - cx) / length, ny: (py - cy) / length };
}

function rayPolygon(points: readonly number[], ox: number, oy: number, ux: number, uy: number, max: number): LocalHit | null {
  let tMin = 0;
  let tMax = max;
  let nx = 0;
  let ny = 0;
  for (let index = 0; index < points.length; index += 2) {
    const next = (index + 2) % points.length;
    const ax = points[index] as number;
    const ay = points[index + 1] as number;
    const bx = points[next] as number;
    const by = points[next + 1] as number;
    const ex = by - ay;
    const ey = -(bx - ax);
    const denominator = ex * ux + ey * uy;
    const distance = ex * (ox - ax) + ey * (oy - ay);
    if (Math.abs(denominator) < 1e-9) {
      if (distance > 0) {
        return null;
      }
      continue;
    }
    const t = -distance / denominator;
    if (denominator < 0) {
      if (t > tMin) {
        const length = Math.hypot(ex, ey) || 1;
        nx = ex / length;
        ny = ey / length;
      }
      tMin = Math.max(tMin, t);
    } else {
      tMax = Math.min(tMax, t);
    }
    if (tMin > tMax) {
      return null;
    }
  }
  return tMin <= max ? { t: tMin, x: ox + ux * tMin, y: oy + uy * tMin, nx, ny } : null;
}

function rayCapsule(body: Body, ox: number, oy: number, ux: number, uy: number, max: number): LocalHit | null {
  const cos = Math.cos(-body.rotation);
  const sin = Math.sin(-body.rotation);
  const rx = ox - body.x;
  const ry = oy - body.y;
  const localOx = rx * cos - ry * sin;
  const localOy = rx * sin + ry * cos;
  const localUx = ux * cos - uy * sin;
  const localUy = ux * sin + uy * cos;
  const half = body.halfLength;
  const radius = body.radius;
  const box = [-half, -radius, half, -radius, half, radius, -half, radius];
  const boxHit = rayPolygon(box, localOx, localOy, localUx, localUy, max);
  const capA = rayCircle(-half, 0, radius, localOx, localOy, localUx, localUy, max);
  const capB = rayCircle(half, 0, radius, localOx, localOy, localUx, localUy, max);
  let best: LocalHit | null = boxHit;
  for (const candidate of [capA, capB]) {
    if (candidate !== null && (best === null || candidate.t < best.t)) {
      best = candidate;
    }
  }
  if (best === null) {
    return null;
  }
  return toWorldHit(best, body, ox, oy);
}

function toWorldHit(hit: LocalHit, body: Body, _ox: number, _oy: number): LocalHit {  const cos = Math.cos(body.rotation);
  const sin = Math.sin(body.rotation);
  return {
    t: hit.t,
    x: body.x + hit.x * cos - hit.y * sin,
    y: body.y + hit.x * sin + hit.y * cos,
    nx: hit.nx * cos - hit.ny * sin,
    ny: hit.nx * sin + hit.ny * cos,
  };
}

/** 圆扫掠：圆与胶囊按半径膨胀后做射线；多边形用步进近似（足够小步长，成本可控）。 */
export function sweepHit(
  body: Body,
  ox: number,
  oy: number,
  ux: number,
  uy: number,
  radius: number,
  max: number,
): LocalHit | null {
  if (body.kind !== 'polygon') {
    const inflated: Body = { ...body, radius: body.radius + radius };
    return rayHit(inflated, ox, oy, ux, uy, max);
  }
  const step = Math.max(0.5, radius * 0.5);
  for (let t = 0; t <= max; t += step) {
    if (circleAgainst(body, ox + ux * t, oy + uy * t, radius)) {
      return { t, x: ox + ux * t, y: oy + uy * t, nx: 0, ny: 0 };
    }
  }
  return null;
}
