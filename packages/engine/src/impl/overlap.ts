import type { Body } from './geometry.js';
import {
  capsuleEnds,
  pointInPolygon,
  pointSegDistance,
  segSegDistance,
  worldPoints,
} from './geometry.js';

/** 形状两两重叠判定；多边形按凸多边形处理（SAT）。 */
export function overlaps(a: Body, b: Body): boolean {
  if (a.kind === 'circle' && b.kind === 'circle') {
    return Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius;
  }
  if (a.kind === 'capsule' && b.kind === 'capsule') {
    const [ax, ay, bx, by] = capsuleEnds(a);
    const [cx, cy, dx, dy] = capsuleEnds(b);
    return segSegDistance(ax, ay, bx, by, cx, cy, dx, dy) <= a.radius + b.radius;
  }
  if (a.kind === 'polygon' && b.kind === 'polygon') {
    return satPolygons(worldPoints(a), worldPoints(b));
  }
  return mixed(a, b);
}

function mixed(a: Body, b: Body): boolean {
  if (a.kind === 'circle') {
    return circleAgainst(b, a.x, a.y, a.radius);
  }
  if (b.kind === 'circle') {
    return circleAgainst(a, b.x, b.y, b.radius);
  }
  if (a.kind === 'capsule' && b.kind === 'polygon') {
    return capsulePolygon(a, worldPoints(b));
  }
  return capsulePolygon(b, worldPoints(a));
}

export function circleAgainst(body: Body, x: number, y: number, radius: number): boolean {
  if (body.kind === 'circle') {
    return Math.hypot(body.x - x, body.y - y) <= body.radius + radius;
  }
  if (body.kind === 'capsule') {
    const [ax, ay, bx, by] = capsuleEnds(body);
    return pointSegDistance(x, y, ax, ay, bx, by) <= body.radius + radius;
  }
  const points = worldPoints(body);
  return pointInPolygon(x, y, points) || minEdgeDistance(x, y, points) <= radius;
}

function capsulePolygon(capsule: Body, polygon: readonly number[]): boolean {
  const [ax, ay, bx, by] = capsuleEnds(capsule);
  if (pointInPolygon(ax, ay, polygon) || pointInPolygon(bx, by, polygon)) {
    return true;
  }
  for (let index = 0; index < polygon.length; index += 2) {
    const next = (index + 2) % polygon.length;
    const cx = polygon[index] as number;
    const cy = polygon[index + 1] as number;
    const dx = polygon[next] as number;
    const dy = polygon[next + 1] as number;
    if (segSegDistance(ax, ay, bx, by, cx, cy, dx, dy) <= capsule.radius) {
      return true;
    }
  }
  return false;
}

function minEdgeDistance(x: number, y: number, points: readonly number[]): number {
  let best = Infinity;
  for (let index = 0; index < points.length; index += 2) {
    const next = (index + 2) % points.length;
    best = Math.min(
      best,
      pointSegDistance(
        x,
        y,
        points[index] as number,
        points[index + 1] as number,
        points[next] as number,
        points[next + 1] as number,
      ),
    );
  }
  return best;
}

function satPolygons(a: readonly number[], b: readonly number[]): boolean {
  return satAxes(a, a, b) && satAxes(b, a, b);
}

function satAxes(axesFrom: readonly number[], a: readonly number[], b: readonly number[]): boolean {
  for (let index = 0; index < axesFrom.length; index += 2) {
    const next = (index + 2) % axesFrom.length;
    const nx = -((axesFrom[next + 1] as number) - (axesFrom[index + 1] as number));
    const ny = (axesFrom[next] as number) - (axesFrom[index] as number);
    const aRange = project(a, nx, ny);
    const bRange = project(b, nx, ny);
    if (aRange.max < bRange.min || bRange.max < aRange.min) {
      return false;
    }
  }
  return true;
}

function project(points: readonly number[], nx: number, ny: number): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (let index = 0; index < points.length; index += 2) {
    const value = (points[index] as number) * nx + (points[index + 1] as number) * ny;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return { min, max };
}
