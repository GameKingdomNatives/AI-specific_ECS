import type { ComponentDef, EntityId, FieldMap, RowValues, Values } from './types.js';
import { defineComponent, isBoolField } from './types.js';
import {
  entityGeneration,
  entityIndex,
  growColumn,
  packEntity,
  readCell,
  takeSnapshot,
  worldCapacity,
  writeCell,
} from './world-state.js';
import type { Column, StoreView, WorldSnapshot } from './world-state.js';

export { entityGeneration, entityIndex } from './world-state.js';
export type { ComponentSnapshot, WorldSnapshot } from './world-state.js';

interface Store extends StoreView {
  readonly slots: Map<EntityId, number>;
}

function createStore(def: ComponentDef): Store {
  const columns = new Map<string, Column>();
  for (const [field, kind] of Object.entries(def.fields)) {
    columns.set(field, isBoolField(kind) ? new Uint8Array(8) : new Float64Array(8));
  }
  return { def, entities: [], slots: new Map<EntityId, number>(), columns };
}

/** 世界：实体表 + 每种组件一张稀疏集（稠密实体数组 + 列式字段数组）。 */
export class World {
  private generations: Uint32Array = new Uint32Array(1024);
  private alive: Uint8Array = new Uint8Array(1024);
  private readonly free: number[] = [];
  private nextIndex = 0;
  private readonly stores = new Map<string, Store>();
  private liveCount = 0;

  get aliveCount(): number {
    return this.liveCount;
  }

  isAlive(entity: EntityId): boolean {
    const index = entityIndex(entity);
    if (index >= this.generations.length) {
      return false;
    }
    return this.alive[index] === 1 && this.generations[index] === entityGeneration(entity);
  }

  spawn(): EntityId {
    const index = this.free.length > 0 ? (this.free.pop() as number) : this.nextIndex++;
    this.ensureEntityCapacity(index + 1);
    const generation = this.generations[index] ?? 0;
    this.alive[index] = 1;
    this.liveCount += 1;
    return packEntity(index, generation);
  }

  despawn(entity: EntityId): boolean {
    if (!this.isAlive(entity)) {
      return false;
    }
    const index = entityIndex(entity);
    for (const store of this.stores.values()) {
      this.detach(store, entity);
    }
    this.alive[index] = 0;
    this.generations[index] = ((entityGeneration(entity) + 1) & ((1 << 11) - 1)) >>> 0;
    this.free.push(index);
    this.liveCount -= 1;
    return true;
  }

  has<F extends FieldMap>(entity: EntityId, def: ComponentDef<F>): boolean {
    const store = this.stores.get(def.name);
    return store !== undefined && store.slots.has(entity);
  }

  add<F extends FieldMap>(entity: EntityId, def: ComponentDef<F>, values: Partial<Values<F>>): void {
    this.addRow(entity, def, values as RowValues);
  }

  /** @internal 命令缓冲使用：绕过字段级类型，仍走同一条写入路径。 */
  addRow(entity: EntityId, def: ComponentDef, values: RowValues): void {
    if (!this.isAlive(entity)) {
      throw new Error(`实体已失效，无法添加组件 ${def.name}`);
    }
    const store = this.storeFor(def);
    if (store.slots.has(entity)) {
      throw new Error(`实体已拥有组件 ${def.name}`);
    }
    this.attach(store, entity, values);
  }

  remove<F extends FieldMap>(entity: EntityId, def: ComponentDef<F>): boolean {
    const store = this.stores.get(def.name);
    if (store === undefined) {
      return false;
    }
    return this.detach(store, entity);
  }

  get<F extends FieldMap>(entity: EntityId, def: ComponentDef<F>): Values<F> | undefined {
    const store = this.stores.get(def.name);
    if (store === undefined || !this.isAlive(entity)) {
      return undefined;
    }
    const slot = store.slots.get(entity);
    if (slot === undefined) {
      return undefined;
    }
    const out: RowValues = {};
    for (const [field, column] of store.columns) {
      out[field] = readCell(column, slot);
    }
    return out as Values<F>;
  }

  set<F extends FieldMap>(entity: EntityId, def: ComponentDef<F>, values: Partial<Values<F>>): void {
    this.setRow(entity, def, values as RowValues);
  }

  /** @internal 命令缓冲使用。 */
  setRow(entity: EntityId, def: ComponentDef, values: RowValues): void {
    const store = this.stores.get(def.name);
    const slot = store?.slots.get(entity);
    if (store === undefined || slot === undefined) {
      throw new Error(`实体没有组件 ${def.name}`);
    }
    for (const [field, value] of Object.entries(values)) {
      const column = store.columns.get(field);
      if (column === undefined) {
        throw new Error(`组件 ${def.name} 没有字段 ${field}`);
      }
      writeCell(column, slot, value);
    }
  }

  /** 导出可 JSON 化的完整状态；随机流状态需单独快照。 */
  snapshot(): WorldSnapshot {
    return takeSnapshot({
      nextIndex: this.nextIndex,
      liveCount: this.liveCount,
      free: this.free,
      generations: this.generations,
      alive: this.alive,
      stores: this.stores.values(),
    });
  }

  /** 用快照替换当前状态；组件按名字与字段重建 store。 */
  restore(snapshot: WorldSnapshot): void {
    if (snapshot.alive.length !== snapshot.generations.length) {
      throw new Error('世界快照长度不一致');
    }
    const capacity = worldCapacity(snapshot);
    this.generations = new Uint32Array(capacity);
    this.alive = new Uint8Array(capacity);
    this.generations.set(snapshot.generations);
    this.alive.set(snapshot.alive);
    this.nextIndex = snapshot.nextIndex;
    this.liveCount = snapshot.liveCount;
    this.free.length = 0;
    this.free.push(...snapshot.free);
    this.stores.clear();
    for (const component of snapshot.components) {
      if (component.entities.length !== component.rows.length) {
        throw new Error(`组件快照长度不一致：${component.name}`);
      }
      const store = this.storeFor(defineComponent(component.name, component.fields));
      for (let slot = 0; slot < component.entities.length; slot += 1) {
        this.attach(store, component.entities[slot] as EntityId, component.rows[slot] ?? {});
      }
    }
  }

  query(...defs: ReadonlyArray<ComponentDef>): EntityId[] {
    const base = this.smallestStore(defs);
    if (base === undefined) {
      return [];
    }
    return base.entities.filter((entity) => this.isAlive(entity) && this.hasAll(entity, defs));
  }

  private smallestStore(defs: ReadonlyArray<ComponentDef>): Store | undefined {
    let smallest: Store | undefined;
    for (const def of defs) {
      const store = this.stores.get(def.name);
      if (store === undefined || store.entities.length === 0) {
        return undefined;
      }
      if (smallest === undefined || store.entities.length < smallest.entities.length) {
        smallest = store;
      }
    }
    return smallest;
  }

  private hasAll(entity: EntityId, defs: ReadonlyArray<ComponentDef>): boolean {
    for (const def of defs) {
      const other = this.stores.get(def.name);
      if (other === undefined || !other.slots.has(entity)) {
        return false;
      }
    }
    return true;
  }

  private ensureEntityCapacity(capacity: number): void {
    if (this.generations.length >= capacity) {
      return;
    }
    const next = Math.max(capacity, this.generations.length * 2);
    const generations = new Uint32Array(next);
    generations.set(this.generations);
    const alive = new Uint8Array(next);
    alive.set(this.alive);
    this.generations = generations;
    this.alive = alive;
  }

  private storeFor(def: ComponentDef): Store {
    const existing = this.stores.get(def.name);
    if (existing !== undefined) {
      return existing;
    }
    const created = createStore(def);
    this.stores.set(def.name, created);
    return created;
  }

  private attach(store: Store, entity: EntityId, values: RowValues): void {
    const slot = store.entities.length;
    store.entities.push(entity);
    store.slots.set(entity, slot);
    for (const [field, column] of store.columns) {
      const grown = growColumn(column, slot + 1);
      if (grown !== column) {
        store.columns.set(field, grown);
      }
      writeCell(grown, slot, values[field] ?? 0);
    }
  }

  private detach(store: Store, entity: EntityId): boolean {
    const slot = store.slots.get(entity);
    if (slot === undefined) {
      return false;
    }
    const lastIndex = store.entities.length - 1;
    const lastEntity = store.entities[lastIndex] as EntityId;
    store.entities[slot] = lastEntity;
    store.slots.set(lastEntity, slot);
    store.entities.pop();
    store.slots.delete(entity);
    for (const [field, column] of store.columns) {
      const grown = growColumn(column, lastIndex + 1);
      if (grown !== column) {
        store.columns.set(field, grown);
      }
      writeCell(grown, slot, readCell(grown, lastIndex));
    }
    return true;
  }
}
