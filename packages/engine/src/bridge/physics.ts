import type { ComponentDef, EntityId } from '../core/types.js';
import type { SystemDef } from '../core/scheduler.js';
import type { IPhysics, ShapeHandle } from '../ports/index.js';

export interface PhysicsBridgeComponents {
  readonly position: ComponentDef;
  readonly box: ComponentDef;
}

/**
 * 物理桥：把 ECS 位置同步为查询用刚体。
 * 正式层（非夹具）——物理只做查询，实体位置始终是唯一真相。
 * 组件由调用方注入，桥本身不依赖任何具体组件或夹具。
 * 已销毁实体对应的刚体在下一 tick 移除，避免悬空句柄。
 */
export function createPhysicsBridge(
  physics: IPhysics,
  components: PhysicsBridgeComponents,
): SystemDef {
  const { position: Position, box: Box } = components;
  const handles = new Map<EntityId, ShapeHandle>();
  return {
    name: 'physics.bodySync',
    phase: 'collision',
    reads: [Position, Box],
    writes: [],
    update: (ctx) => {
      for (const entity of ctx.world.query(Position, Box)) {
        const position = ctx.world.get(entity, Position);
        const box = ctx.world.get(entity, Box);
        if (position === undefined || box === undefined) {
          continue;
        }
        const handle = handles.get(entity);
        const x = typeof position.x === 'number' ? position.x : 0;
        const y = typeof position.y === 'number' ? position.y : 0;
        const radius = typeof box.size === 'number' ? box.size / 2 : 4;
        if (handle === undefined) {
          handles.set(entity, physics.addCircle(entity, x, y, radius));
        } else {
          physics.setTransform(handle, x, y);
        }
      }
      for (const [entity, handle] of handles) {
        if (!ctx.world.isAlive(entity)) {
          physics.remove(handle);
          handles.delete(entity);
        }
      }
    },
  };
}
