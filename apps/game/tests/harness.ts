import { CommandBuffer, EventBus, World } from 'agent-specific_ecs/core';
import type { ComponentDef, EntityId, FieldMap, SystemContext, SystemDef } from 'agent-specific_ecs/core';

export interface Fixture {
  readonly world: World;
  readonly commands: CommandBuffer;
  readonly bus: EventBus;
  readonly ctx: SystemContext;
  /** 跑一个系统并把命令缓冲 flush 掉，便于断言“阶段末生效”。 */
  run(system: SystemDef): void;
  spawnWith(specs: ReadonlyArray<readonly [ComponentDef, Record<string, number | boolean>]>): EntityId;
}

export function createFixture(): Fixture {
  const world = new World();
  const commands = new CommandBuffer();
  const bus = new EventBus();
  const ctx: SystemContext = { world, commands, bus, tick: 1 };
  return {
    world,
    commands,
    bus,
    ctx,
    run(system: SystemDef): void {
      system.update(ctx);
      commands.flush(world);
    },
    spawnWith(specs: ReadonlyArray<readonly [ComponentDef, Record<string, number | boolean>]>): EntityId {
      const entity = world.spawn();
      for (const [def, values] of specs) {
        world.addRow(entity, def, values);
      }
      return entity;
    },
  };
}

export function addTo(world: World, entity: EntityId, def: ComponentDef<FieldMap>, values: Record<string, number | boolean>): void {
  world.addRow(entity, def, values);
}
