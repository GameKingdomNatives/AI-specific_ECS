import type { Contact, DebugShape } from '../ports/index.js';
import type { Body } from './geometry.js';
import { overlaps } from './overlap.js';
import type { SpatialGrid } from './spatial-grid.js';

/** 每帧一份有序重叠对：顺序稳定，供伤害系统按命令缓冲结算。 */
export function collectContacts(grid: SpatialGrid): Contact[] {
  const seen = new Set<string>();
  const found: Contact[] = [];
  for (const bucket of grid.buckets()) {
    const list = [...bucket].sort((left, right) => left.id - right.id);
    for (let index = 0; index < list.length; index += 1) {
      for (let other = index + 1; other < list.length; other += 1) {
        const a = list[index] as Body;
        const b = list[other] as Body;
        const low = Math.min(a.entity, b.entity);
        const high = Math.max(a.entity, b.entity);
        const key = `${low}:${high}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        if (overlaps(a, b)) {
          found.push({ a: low, b: high });
        }
      }
    }
  }
  return found.sort((left, right) => left.a - right.a || left.b - right.b);
}

export function collectDebugShapes(bodies: Map<number, Body>): DebugShape[] {
  return [...bodies.values()].map((body) => ({
    entity: body.entity,
    kind: body.kind,
    x: body.x,
    y: body.y,
    rotation: body.rotation,
    radius: body.radius,
    points: [...body.points],
  }));
}
