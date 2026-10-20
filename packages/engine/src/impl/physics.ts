import type { IPhysics, RayHit, ShapeHandle } from '../ports/index.js';
import type { Body } from './geometry.js';
import { boundsOf, overlapsCircle, rayHits } from './geometry.js';

const CELL = 64;

function cellKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

/** 均匀网格哈希做宽相；窄相按形状两两判定。坐标与渲染同源（世界坐标）。 */
export class PhysicsWorld {
  private readonly bodies = new Map<number, Body>();
  private readonly grid = new Map<string, Set<number>>();
  private nextId = 1;

  get bodyCount(): number {
    return this.bodies.size;
  }

  addCircle(entity: number, x: number, y: number, radius: number): ShapeHandle {
    return this.insert({ id: 0, entity, kind: 'circle', x, y, radius, hw: 0, hh: 0, points: null });
  }

  addBox(entity: number, x: number, y: number, halfWidth: number, halfHeight: number): ShapeHandle {
    return this.insert({ id: 0, entity, kind: 'box', x, y, radius: 0, hw: halfWidth, hh: halfHeight, points: null });
  }

  addPolygon(entity: number, x: number, y: number, points: readonly number[]): ShapeHandle {
    if (points.length < 6 || points.length % 2 !== 0) {
      throw new Error('多边形至少三个顶点，且坐标为偶数个');
    }
    return this.insert({ id: 0, entity, kind: 'polygon', x, y, radius: 0, hw: 0, hh: 0, points: [...points] });
  }

  remove(handle: ShapeHandle): boolean {
    const body = this.bodies.get(handle.id);
    if (body === undefined) {
      return false;
    }
    this.unindex(body);
    this.bodies.delete(handle.id);
    return true;
  }

  move(handle: ShapeHandle, x: number, y: number): void {
    const body = this.bodies.get(handle.id);
    if (body === undefined) {
      return;
    }
    this.unindex(body);
    body.x = x;
    body.y = y;
    this.index(body);
  }

  queryCircle(x: number, y: number, radius: number): number[] {
    const result: number[] = [];
    const seen = new Set<number>();
    for (const body of this.candidates(x, y, radius)) {
      if (seen.has(body.entity) || !overlapsCircle(body, x, y, radius)) {
        continue;
      }
      seen.add(body.entity);
      result.push(body.entity);
    }
    return result;
  }

  raycast(x: number, y: number, dx: number, dy: number, maxDistance: number): RayHit | null {
    const length = Math.hypot(dx, dy);
    if (length === 0) {
      return null;
    }
    const ux = dx / length;
    const uy = dy / length;
    let best: RayHit | null = null;
    for (const body of this.bodies.values()) {
      const t = rayHits(body, x, y, ux, uy, maxDistance);
      if (t !== null && (best === null || t < best.t)) {
        best = { entity: body.entity, t };
      }
    }
    return best;
  }

  private insert(body: Body): ShapeHandle {
    const id = this.nextId;
    this.nextId += 1;
    const placed: Body = { ...body, id };
    this.bodies.set(id, placed);
    this.index(placed);
    return { id };
  }

  private index(body: Body): void {
    const bounds = boundsOf(body);
    for (let cx = Math.floor(bounds.minX / CELL); cx <= Math.floor(bounds.maxX / CELL); cx += 1) {
      for (let cy = Math.floor(bounds.minY / CELL); cy <= Math.floor(bounds.maxY / CELL); cy += 1) {
        const key = cellKey(cx, cy);
        const bucket = this.grid.get(key) ?? new Set<number>();
        bucket.add(body.id);
        this.grid.set(key, bucket);
      }
    }
  }

  private unindex(body: Body): void {
    const bounds = boundsOf(body);
    for (let cx = Math.floor(bounds.minX / CELL); cx <= Math.floor(bounds.maxX / CELL); cx += 1) {
      for (let cy = Math.floor(bounds.minY / CELL); cy <= Math.floor(bounds.maxY / CELL); cy += 1) {
        const key = cellKey(cx, cy);
        const bucket = this.grid.get(key);
        if (bucket !== undefined) {
          bucket.delete(body.id);
          if (bucket.size === 0) {
            this.grid.delete(key);
          }
        }
      }
    }
  }

  private candidates(x: number, y: number, radius: number): Body[] {
    const out: Body[] = [];
    const seen = new Set<number>();
    for (let cx = Math.floor((x - radius) / CELL); cx <= Math.floor((x + radius) / CELL); cx += 1) {
      for (let cy = Math.floor((y - radius) / CELL); cy <= Math.floor((y + radius) / CELL); cy += 1) {
        for (const id of this.grid.get(cellKey(cx, cy)) ?? []) {
          if (seen.has(id)) {
            continue;
          }
          seen.add(id);
          const body = this.bodies.get(id);
          if (body !== undefined) {
            out.push(body);
          }
        }
      }
    }
    return out;
  }
}

/** 端口适配：当前 IPhysics 契约只暴露圆形刚体；多边形经 PhysicsWorld 直接使用。 */
export function createPhysicsPort(world: PhysicsWorld): IPhysics {
  return {
    addBody(entity, x, y, radius) {
      return world.addCircle(entity, x, y, radius);
    },
    removeBody(handle) {
      world.remove(handle);
    },
    queryCircle(x, y, radius) {
      return world.queryCircle(x, y, radius);
    },
    raycast(x, y, dx, dy, maxDistance) {
      return world.raycast(x, y, dx, dy, maxDistance);
    },
  };
}
