import { defineComponent } from '../core/types.js';
import type { SystemDef } from '../core/scheduler.js';
import type { EntityId } from '../core/types.js';
import type { World } from '../core/world.js';
import type { InputSnapshot } from '../ports/index.js';

/** 技术夹具用组件：不是游戏内容，只用来证明管线通。 */
export const Position = defineComponent('Position', { x: 'f64', y: 'f64' });
export const Velocity = defineComponent('Velocity', { x: 'f64', y: 'f64' });
export const Box = defineComponent('Box', { size: 'f32', tint: 'u32' });
export const Bullet = defineComponent('Bullet', { damage: 'f32' });

export function createMovementSystem(worldWidth: number, worldHeight: number): SystemDef {
  return {
    name: 'demo.movement',
    phase: 'movement',
    reads: [Velocity],
    writes: [Position],
    update: (ctx) => {
      const entities = ctx.world.query(Position, Velocity, Box);
      for (const entity of entities) {
        const position = ctx.world.get(entity, Position);
        const velocity = ctx.world.get(entity, Velocity);
        if (position === undefined || velocity === undefined) {
          continue;
        }
        const nextX = bounce(position.x + velocity.x, worldWidth);
        const nextY = bounce(position.y + velocity.y, worldHeight);
        ctx.world.set(entity, Position, { x: nextX, y: nextY });
        if (nextX !== position.x + velocity.x) {
          ctx.world.set(entity, Velocity, { x: -velocity.x });
        }
        if (nextY !== position.y + velocity.y) {
          ctx.world.set(entity, Velocity, { y: -velocity.y });
        }
      }
    },
  };
}

function bounce(value: number, limit: number): number {
  if (value < 0) {
    return -value;
  }
  if (value > limit) {
    return limit - (value - limit);
  }
  return value;
}

export function spawnBoxes(
  world: World,
  count: number,
  width: number,
  height: number,
  minSize = 8,
  maxSize = 14,
  speed = 1,
): EntityId[] {
  const spawned: EntityId[] = [];
  for (let index = 0; index < count; index += 1) {
    const entity = world.spawn();
    spawned.push(entity);
    world.add(entity, Position, {
      x: (index * 37) % width,
      y: (index * 61) % height,
    });
    world.add(entity, Velocity, { x: (1 + (index % 3)) * speed, y: (0.5 + (index % 2)) * speed });
    world.add(entity, Box, { size: Math.min(maxSize, minSize + (index % 3) * 2), tint: 0xffffff });
  }
  return spawned;
}

export interface WeaponOptions {
  readonly player: EntityId;
  readonly getInput: () => InputSnapshot;
  readonly speed?: number;
  readonly cooldownTicks?: number;
  /** 与玩家移动系统同阶段时的显式顺序；单独使用时可不填。 */
  readonly after?: readonly string[];
}

/** 临时鼠标交互：按住左键（button 0）朝指针方向连射，冷却以 tick 计。 */
export function createWeaponSystem(options: WeaponOptions): SystemDef {
  const speed = options.speed ?? 14;
  const cooldownTicks = options.cooldownTicks ?? 6;
  let cooldown = 0;
  return {
    name: 'demo.weapon',
    phase: 'ai',
    reads: [Position],
    writes: [],
    ...(options.after === undefined ? {} : { after: options.after }),
    update: (ctx) => {
      cooldown = Math.max(0, cooldown - 1);
      const input = options.getInput();
      if (!input.buttons.has(0) || cooldown > 0) {
        return;
      }
      const position = ctx.world.get(options.player, Position);
      if (position === undefined) {
        return;
      }
      const dx = input.pointer.x - position.x;
      const dy = input.pointer.y - position.y;
      const length = Math.hypot(dx, dy);
      if (length < 1) {
        return;
      }
      cooldown = cooldownTicks;
      ctx.commands.spawn([
        [Position, { x: position.x, y: position.y }],
        [Velocity, { x: (dx / length) * speed, y: (dy / length) * speed }],
        [Bullet, { damage: 1 }],
      ]);
    },
  };
}

export interface BulletMovementOptions {
  /** 与方块移动系统同阶段时的显式顺序；单独使用时可不填。 */
  readonly after?: readonly string[];
}

/** 子弹直线飞行、出界即回收；不与会反弹的方块共用移动系统。 */
export function createBulletMovementSystem(
  width: number,
  height: number,
  options: BulletMovementOptions = {},
): SystemDef {
  return {
    name: 'demo.bulletMovement',
    phase: 'movement',
    reads: [Velocity, Bullet],
    writes: [Position],
    ...(options.after === undefined ? {} : { after: options.after }),
    update: (ctx) => {
      for (const entity of ctx.world.query(Position, Velocity, Bullet)) {
        const position = ctx.world.get(entity, Position);
        const velocity = ctx.world.get(entity, Velocity);
        if (position === undefined || velocity === undefined) {
          continue;
        }
        const nextX = position.x + velocity.x;
        const nextY = position.y + velocity.y;
        if (nextX < -32 || nextX > width + 32 || nextY < -32 || nextY > height + 32) {
          ctx.commands.despawn(entity);
          continue;
        }
        ctx.world.set(entity, Position, { x: nextX, y: nextY });
      }
    },
  };
}

/** 飞出世界边界即回收，避免弹幕实体无限增长。 */
export function createBulletCleanupSystem(width: number, height: number): SystemDef {
  return {
    name: 'demo.bulletCleanup',
    phase: 'cleanup',
    reads: [Position, Bullet],
    writes: [],
    update: (ctx) => {
      for (const entity of ctx.world.query(Position, Bullet)) {
        const position = ctx.world.get(entity, Position);
        if (position === undefined) {
          continue;
        }
        if (position.x < -32 || position.x > width + 32 || position.y < -32 || position.y > height + 32) {
          ctx.commands.despawn(entity);
        }
      }
    },
  };
}
