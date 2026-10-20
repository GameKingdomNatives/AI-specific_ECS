import type { World } from './world.js';
import type { ComponentDef, EntityId, FieldMap, RowValues, Values } from './types.js';

type Op =
  | { readonly kind: 'spawn'; readonly specs: ReadonlyArray<readonly [ComponentDef, RowValues]> }
  | { readonly kind: 'despawn'; readonly entity: EntityId }
  | { readonly kind: 'add'; readonly entity: EntityId; readonly def: ComponentDef; readonly values: RowValues }
  | { readonly kind: 'set'; readonly entity: EntityId; readonly def: ComponentDef; readonly values: RowValues }
  | { readonly kind: 'remove'; readonly entity: EntityId; readonly def: ComponentDef };

/**
 * 命令缓冲：系统只登记意图，阶段末按登记顺序统一执行。
 * 顺序即确定性的一部分——同一条命令序列必须产生同一个世界。
 */
export class CommandBuffer {
  private readonly ops: Op[] = [];

  get size(): number {
    return this.ops.length;
  }

  spawn(specs: ReadonlyArray<readonly [ComponentDef, RowValues]>): void {
    this.ops.push({ kind: 'spawn', specs });
  }

  despawn(entity: EntityId): void {
    this.ops.push({ kind: 'despawn', entity });
  }

  add<F extends FieldMap>(entity: EntityId, def: ComponentDef<F>, values: Partial<Values<F>>): void {
    this.ops.push({ kind: 'add', entity, def, values: values as RowValues });
  }

  set<F extends FieldMap>(entity: EntityId, def: ComponentDef<F>, values: Partial<Values<F>>): void {
    this.ops.push({ kind: 'set', entity, def, values: values as RowValues });
  }

  remove<F extends FieldMap>(entity: EntityId, def: ComponentDef<F>): void {
    this.ops.push({ kind: 'remove', entity, def });
  }

  /** 按登记顺序执行；执行完即清空。任何一步失败都会保留剩余命令以便诊断。 */
  flush(world: World): number {
    let applied = 0;
    while (this.ops.length > 0) {
      const op = this.ops.shift() as Op;
      this.apply(world, op);
      applied += 1;
    }
    return applied;
  }

  private apply(world: World, op: Op): void {
    switch (op.kind) {
      case 'spawn': {
        const entity = world.spawn();
        for (const [def, values] of op.specs) {
          world.addRow(entity, def, values);
        }
        return;
      }
      case 'despawn':
        world.despawn(op.entity);
        return;
      case 'add':
        world.addRow(op.entity, op.def, op.values);
        return;
      case 'set':
        world.setRow(op.entity, op.def, op.values);
        return;
      case 'remove':
        world.remove(op.entity, op.def);
        return;
    }
  }
}
