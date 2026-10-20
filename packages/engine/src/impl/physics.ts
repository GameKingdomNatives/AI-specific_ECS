import type {
  Contact,
  DebugShape,
  IPhysics,
  PhysicsBodyOptions,
  PhysicsStats,
  RayHit,
  ShapeFilter,
  ShapeHandle,
} from '../ports/index.js';
import type { Body } from './geometry.js';
import { boundsOf } from './geometry.js';
import { circleAgainst } from './overlap.js';
import { passes, uniqueSorted } from './filters.js';
import { collectContacts, collectDebugShapes } from './physics-report.js';
import { rayHit, sweepHit } from './raycast.js';
import { SpatialGrid } from './spatial-grid.js';

const ALL_LAYERS = 0xffffffff;

/** 均匀网格宽相 + 形状窄相；结果排序稳定，供确定性回放使用。 */
export class PhysicsWorld implements IPhysics {
  private readonly bodies = new Map<number, Body>();
  private readonly grid = new SpatialGrid();
  private nextId = 1;
  private batching = false;
  private readonly dirty = new Set<number>();
  private candidatesChecked = 0;

  get bodyCount(): number {
    return this.bodies.size;
  }

  addCircle(entity: number, x: number, y: number, radius: number, options?: PhysicsBodyOptions): ShapeHandle {
    return this.insert(entity, 'circle', x, y, 0, radius, 0, [], options);
  }

  addBox(
    entity: number,
    x: number,
    y: number,
    halfWidth: number,
    halfHeight: number,
    rotation = 0,
    options?: PhysicsBodyOptions,
  ): ShapeHandle {
    const points = [-halfWidth, -halfHeight, halfWidth, -halfHeight, halfWidth, halfHeight, -halfWidth, halfHeight];
    return this.insert(entity, 'polygon', x, y, rotation, 0, 0, points, options);
  }

  addCapsule(
    entity: number,
    x: number,
    y: number,
    halfLength: number,
    radius: number,
    rotation = 0,
    options?: PhysicsBodyOptions,
  ): ShapeHandle {
    return this.insert(entity, 'capsule', x, y, rotation, radius, halfLength, [], options);
  }

  addPolygon(
    entity: number,
    x: number,
    y: number,
    points: readonly number[],
    rotation = 0,
    options?: PhysicsBodyOptions,
  ): ShapeHandle {
    if (points.length < 6 || points.length % 2 !== 0) {
      throw new Error('多边形至少三个顶点，且坐标为偶数个');
    }
    return this.insert(entity, 'polygon', x, y, rotation, 0, 0, [...points], options);
  }
  remove(handle: ShapeHandle): boolean {
    const body = this.bodies.get(handle.id);
    if (body === undefined) {
      return false;
    }
    this.grid.remove(body);
    this.bodies.delete(handle.id);
    return true;
  }
  removeByEntity(entity: number): number {
    let removed = 0;
    for (const body of [...this.bodies.values()]) {
      if (body.entity === entity && this.remove({ id: body.id })) {
        removed += 1;
      }
    }
    return removed;
  }
  setTransform(handle: ShapeHandle, x: number, y: number, rotation = 0): void {
    const body = this.bodies.get(handle.id);
    if (body === undefined) {
      return;
    }
    this.grid.remove(body);
    body.x = x;
    body.y = y;
    body.rotation = rotation;
    if (this.batching) {
      this.dirty.add(handle.id);
      return;
    }
    this.grid.insert(body);
  }
  beginFrame(): void {
    this.batching = true;
    this.dirty.clear();
  }

  endFrame(): void {
    for (const id of this.dirty) {
      const body = this.bodies.get(id);
      if (body !== undefined) {
        this.grid.insert(body);
      }
    }
    this.dirty.clear();
    this.batching = false;
  }

  queryCircle(x: number, y: number, radius: number, filter?: ShapeFilter): number[] {
    const found: number[] = [];
    for (const body of this.grid.candidates(x, y, radius)) {
      if (passes(body, filter) && circleAgainst(body, x, y, radius)) {
        found.push(body.entity);
      }
    }
    return uniqueSorted(found);
  }

  queryAabb(minX: number, minY: number, maxX: number, maxY: number, filter?: ShapeFilter): number[] {
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const radius = Math.hypot(maxX - minX, maxY - minY) / 2 + 1;
    const found: number[] = [];
    for (const body of this.grid.candidates(centerX, centerY, radius)) {
      const bounds = boundsOf(body);
      if (!passes(body, filter)) {
        continue;
      }
      const hit = !(bounds.maxX < minX || bounds.minX > maxX || bounds.maxY < minY || bounds.minY > maxY);
      if (hit) {
        found.push(body.entity);
      }
    }
    return uniqueSorted(found);
  }

  queryCone(
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    halfAngleRadians: number,
    radius: number,
    filter?: ShapeFilter,
  ): number[] {
    const length = Math.hypot(dirX, dirY);
    if (length === 0) {
      return [];
    }
    const ux = dirX / length;
    const uy = dirY / length;
    const cosLimit = Math.cos(halfAngleRadians);
    const found: number[] = [];
    for (const body of this.grid.candidates(x, y, radius)) {
      if (!passes(body, filter)) {
        continue;
      }
      const dx = body.x - x;
      const dy = body.y - y;
      const distance = Math.hypot(dx, dy);
      if (distance === 0 || (dx * ux + dy * uy) / distance >= cosLimit) {
        found.push(body.entity);
      }
    }
    return uniqueSorted(found);
  }

  nearest(x: number, y: number, maxRadius: number, filter?: ShapeFilter): number | null {
    let best: number | null = null;
    let bestDistance = Infinity;
    for (const body of this.grid.candidates(x, y, maxRadius)) {
      if (!passes(body, filter)) {
        continue;
      }
      const distance = Math.hypot(body.x - x, body.y - y);
      const better = distance < bestDistance || (distance === bestDistance && (best === null || body.entity < best));
      if (distance <= maxRadius && better) {
        best = body.entity;
        bestDistance = distance;
      }
    }
    return best;
  }

  raycast(x: number, y: number, dx: number, dy: number, maxDistance: number, filter?: ShapeFilter): RayHit | null {
    const length = Math.hypot(dx, dy);
    if (length === 0) {
      return null;
    }
    const ux = dx / length;
    const uy = dy / length;
    let best: RayHit | null = null;
    for (const body of this.bodies.values()) {
      if (!passes(body, filter)) {
        continue;
      }
      const hit = rayHit(body, x, y, ux, uy, maxDistance);
      if (hit !== null && (best === null || hit.t < best.t)) {
        best = { entity: body.entity, t: hit.t, x: hit.x, y: hit.y, nx: hit.nx, ny: hit.ny };
      }
    }
    return best;
  }

  sweepCircle(
    x: number,
    y: number,
    dx: number,
    dy: number,
    radius: number,
    maxDistance: number,
    filter?: ShapeFilter,
  ): RayHit | null {
    const length = Math.hypot(dx, dy);
    if (length === 0) {
      return null;
    }
    const ux = dx / length;
    const uy = dy / length;
    let best: RayHit | null = null;
    for (const body of this.bodies.values()) {
      if (!passes(body, filter)) {
        continue;
      }
      const hit = sweepHit(body, x, y, ux, uy, radius, maxDistance);
      if (hit !== null && (best === null || hit.t < best.t)) {
        best = { entity: body.entity, t: hit.t, x: hit.x, y: hit.y, nx: hit.nx, ny: hit.ny };
      }
    }
    return best;
  }

  contacts(): Contact[] {
    return collectContacts(this.grid);
  }

  debugShapes(): DebugShape[] {
    return collectDebugShapes(this.bodies);
  }

  stats(): PhysicsStats {
    return { bodies: this.bodies.size, cells: this.grid.size, candidates: this.candidatesChecked };
  }

  private insert(
    entity: number,
    kind: Body['kind'],
    x: number,
    y: number,
    rotation: number,
    radius: number,
    halfLength: number,
    points: number[],
    options?: PhysicsBodyOptions,
  ): ShapeHandle {
    const id = this.nextId;
    this.nextId += 1;
    const body: Body = {
      id,
      entity,
      kind,
      layer: options?.layer ?? 1,
      mask: options?.mask ?? ALL_LAYERS,
      trigger: options?.trigger ?? false,
      x,
      y,
      rotation,
      radius,
      halfLength,
      points,
    };
    this.bodies.set(id, body);
    this.grid.insert(body);
    this.candidatesChecked = this.grid.candidates(x, y, 0).length;
    return { id };
  }
}

/** 端口实现即内核本身：PhysicsWorld 已满足 IPhysics 契约。 */
export function createPhysicsPort(world: PhysicsWorld): IPhysics {
  return world;
}
