import type { Body } from './geometry.js';
import { boundsOf } from './geometry.js';

const CELL = 64;

/** 均匀网格哈希：只负责宽相候选，不做任何形状判定。 */
export class SpatialGrid {
  private readonly cells = new Map<string, Set<Body>>();

  get size(): number {
    return this.cells.size;
  }

  insert(body: Body): void {
    forEachCell(boundsOf(body), (key) => {
      const bucket = this.cells.get(key) ?? new Set<Body>();
      bucket.add(body);
      this.cells.set(key, bucket);
    });
  }

  remove(body: Body): void {
    forEachCell(boundsOf(body), (key) => {
      const bucket = this.cells.get(key);
      if (bucket === undefined) {
        return;
      }
      bucket.delete(body);
      if (bucket.size === 0) {
        this.cells.delete(key);
      }
    });
  }

  candidates(x: number, y: number, radius: number): Body[] {
    const out: Body[] = [];
    const seen = new Set<Body>();
    forEachCell({ minX: x - radius, minY: y - radius, maxX: x + radius, maxY: y + radius }, (key) => {
      for (const body of this.cells.get(key) ?? []) {
        if (!seen.has(body)) {
          seen.add(body);
          out.push(body);
        }
      }
    });
    return out;
  }

  buckets(): Iterable<Set<Body>> {
    return this.cells.values();
  }
}

function forEachCell(bounds: { minX: number; minY: number; maxX: number; maxY: number }, visit: (key: string) => void): void {
  for (let cx = Math.floor(bounds.minX / CELL); cx <= Math.floor(bounds.maxX / CELL); cx += 1) {
    for (let cy = Math.floor(bounds.minY / CELL); cy <= Math.floor(bounds.maxY / CELL); cy += 1) {
      visit(`${cx},${cy}`);
    }
  }
}
