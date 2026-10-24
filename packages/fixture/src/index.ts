import { defineComponent } from '@itb/engine/core';
import type { EntityId, SystemDef, World } from '@itb/engine/core';
import type { InputSnapshot, IPhysics } from '@itb/engine/ports';

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
    writes: [Position, Velocity],
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

/** 场景 spawner 组件：ambient 箱子由节点数据生成，而不是代码写死数量。 */
export const BoxSpawner = defineComponent('BoxSpawner', {
  count: 'f64',
  minSize: 'f64',
  maxSize: 'f64',
  speed: 'f64',
});

export interface BoxSpawnerOptions {
  readonly width: number;
  readonly height: number;
  readonly onSpawn?: (node: EntityId, count: number) => void;
}

/**
 * 首个 tick 按 BoxSpawner 生成 ambient 箱子（CommandBuffer 阶段末 flush）。
 * 生成后不再重复；数量夹在 0..2000，避免坏数据拖垮世界。
 */
export function createBoxSpawnerSystem(options: BoxSpawnerOptions): SystemDef {
  let spawned = false;
  return {
    name: 'scene.spawner',
    phase: 'ai',
    reads: [BoxSpawner],
    writes: [],
    update: (ctx) => {
      if (spawned) return;
      spawned = true;
      for (const node of ctx.world.query(BoxSpawner)) {
        const spec = ctx.world.get(node, BoxSpawner);
        if (spec === undefined) continue;
        const count = Math.max(0, Math.min(2000, Math.floor(spec.count)));
        for (let index = 0; index < count; index += 1) {
          ctx.commands.spawn([
            [Position, { x: (index * 37) % options.width, y: (index * 61) % options.height }],
            [Velocity, { x: (1 + (index % 3)) * spec.speed, y: (0.5 + (index % 2)) * spec.speed }],
            [Box, { size: Math.min(spec.maxSize, spec.minSize + (index % 3) * 2), tint: 0xffffff }],
          ]);
        }
        options.onSpawn?.(node, count);
      }
    },
  };
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
    debugDraw: (ctx) => {
      const position = ctx.world.get(options.player, Position);
      if (position === undefined) {
        return [];
      }
      const arm = 28;
      return [
        `circle ${position.x},${position.y},42 #ff5a3c`,
        `line ${position.x - arm},${position.y},${position.x + arm},${position.y} #ffaa66`,
        `line ${position.x},${position.y - arm},${position.x},${position.y + arm} #ffaa66`,
      ];
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

export interface HitOptions {
  /** 玩家自己不会被子弹命中（夹具语义）。 */
  readonly player: EntityId;
  readonly radius?: number;
}

/**
 * 命中检测：子弹位置向物理端口查圆，命中即销毁子弹与目标并发事件。
 * 命中列表先排序再取第一个，保证确定性。
 */
export function createHitSystem(physics: IPhysics, options: HitOptions): SystemDef {
  const radius = options.radius ?? 5;
  return {
    name: 'demo.hit',
    phase: 'damage',
    reads: [Position, Bullet],
    writes: [],
    update: (ctx) => {
      for (const bullet of ctx.world.query(Position, Bullet)) {
        const position = ctx.world.get(bullet, Position);
        if (position === undefined) {
          continue;
        }
        const hits = physics
          .queryCircle(position.x, position.y, radius)
          .filter((entity) => entity !== bullet && entity !== options.player && ctx.world.isAlive(entity))
          .sort((left, right) => left - right);
        const target = hits[0];
        if (target === undefined) {
          continue;
        }
        ctx.commands.despawn(bullet);
        ctx.commands.despawn(target);
        ctx.bus.emit('demo.hit', { bullet, target, x: position.x, y: position.y });
      }
    },
  };
}
