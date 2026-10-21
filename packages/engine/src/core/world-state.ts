import type { ComponentDef, EntityId, FieldMap, RowValues } from './types.js';

const INDEX_BITS = 20;
const INDEX_MASK = (1 << INDEX_BITS) - 1;
const GEN_BITS = 11;
const GEN_MASK = (1 << GEN_BITS) - 1;

export function entityIndex(entity: EntityId): number {
  return entity & INDEX_MASK;
}

export function entityGeneration(entity: EntityId): number {
  return (entity >>> INDEX_BITS) & GEN_MASK;
}

export function packEntity(index: number, generation: number): EntityId {
  return index | (generation << INDEX_BITS);
}

export type Column = Float64Array | Uint8Array;

/** 快照只读视图：store 的列与实体列表。 */
export interface StoreView {
  readonly def: ComponentDef;
  readonly entities: EntityId[];
  readonly columns: Map<string, Column>;
}

/** 单个组件的快照：实体与行值按槽位一一对应。 */
export interface ComponentSnapshot {
  readonly name: string;
  readonly fields: FieldMap;
  readonly entities: readonly EntityId[];
  readonly rows: readonly RowValues[];
}

/** 世界快照：实体表、代际、空闲表与全部组件列。纯数据，可 JSON 化。 */
export interface WorldSnapshot {
  readonly nextIndex: number;
  readonly liveCount: number;
  readonly generations: readonly number[];
  readonly alive: readonly number[];
  readonly free: readonly number[];
  readonly components: readonly ComponentSnapshot[];
}

export interface SnapshotState {
  readonly nextIndex: number;
  readonly liveCount: number;
  readonly free: readonly number[];
  readonly generations: Uint32Array;
  readonly alive: Uint8Array;
  readonly stores: Iterable<StoreView>;
}

export function writeCell(column: Column, slot: number, value: number | boolean): void {
  column[slot] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
}

export function readCell(column: Column, slot: number): number | boolean {
  return column instanceof Uint8Array ? column[slot] === 1 : (column[slot] as number);
}

export function growColumn(column: Column, capacity: number): Column {
  if (column.length >= capacity) {
    return column;
  }
  const next = column instanceof Uint8Array ? new Uint8Array(capacity) : new Float64Array(capacity);
  next.set(column);
  return next;
}

function worldCapacity(snapshot: WorldSnapshot): number {
  let max = snapshot.nextIndex;
  for (const component of snapshot.components) {
    for (const entity of component.entities) {
      max = Math.max(max, entityIndex(entity) + 1);
    }
  }
  return Math.max(max, 8);
}

export { worldCapacity };

/** 从世界内部状态生成快照；按 store 顺序输出组件段。 */
export function takeSnapshot(state: SnapshotState): WorldSnapshot {
  const alive: number[] = [];
  const generations: number[] = [];
  for (let index = 0; index < state.nextIndex; index += 1) {
    alive.push(state.alive[index] === 1 ? 1 : 0);
    generations.push(state.generations[index] ?? 0);
  }
  const components: ComponentSnapshot[] = [];
  for (const store of state.stores) {
    const rows: RowValues[] = [];
    for (let slot = 0; slot < store.entities.length; slot += 1) {
      const out: RowValues = {};
      for (const [field, column] of store.columns) {
        out[field] = readCell(column, slot);
      }
      rows.push(out);
    }
    components.push({
      name: store.def.name,
      fields: store.def.fields,
      entities: [...store.entities],
      rows,
    });
  }
  return {
    nextIndex: state.nextIndex,
    liveCount: state.liveCount,
    generations,
    alive,
    free: [...state.free],
    components,
  };
}
