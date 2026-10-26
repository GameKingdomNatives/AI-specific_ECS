import type { SystemContext, SystemDef } from 'agent-specific_ecs/core';
import { Box, Position } from '@itb/fixture';
import { Ai, Aim, Flux, Mecha, Run, Shield, Suppressed, Vent, Weapon } from '../components.js';
import { AI_VENT } from '../engagement.js';

/** 清场后到下一波入场的间隔：180 tick = 3 秒，给玩家一个喘息窗口。 */
export const WAVE_INTERVAL_TICKS = 180;
/** 敌机血量/护盾沿用场景里的先验值。 */
export const WAVE_ENEMY_HULL = 140;
export const WAVE_ENEMY_RADIUS = 54;

export interface WaveOptions {
  readonly width: number;
  readonly height: number;
  readonly perWave?: number;
}

/** 入场点按波次固定，保证可回放：第 2 波从左路进入，第 3 波从右路进入。 */
function spawnPoints(wave: number, width: number, height: number, count: number): { x: number; y: number }[] {
  const fromLeft = wave % 2 === 0;
  const x = fromLeft ? 220 : width - 220;
  const points: { x: number; y: number }[] = [];
  for (let index = 0; index < count; index += 1) {
    points.push({ x, y: height * ((index + 1) / (count + 1)) });
  }
  return points;
}

function spawnWave(ctx: SystemContext, wave: number, count: number, width: number, height: number): void {
  for (const point of spawnPoints(wave, width, height, count)) {
    ctx.commands.spawn([
      [Position, { x: point.x, y: point.y }],
      [Box, { size: 30, tint: 16777215 }],
      [Mecha, { faction: 1, hull: WAVE_ENEMY_HULL, maxHull: WAVE_ENEMY_HULL }],
      [Flux, { soft: 0, hard: 0, overloadTicks: 0 }],
      [Shield, { active: false, radius: WAVE_ENEMY_RADIUS }],
      [Weapon, { cooldown: 0 }],
      [Aim, { angle: wave % 2 === 0 ? 0 : Math.PI }],
      [Ai, { mode: AI_VENT, timer: 0 }],
      [Vent, { active: true }],
      [Suppressed, { ticks: 0 }],
    ]);
  }
}

/** 场上还活着的敌机数量（Mecha 阵营 1）。 */
export function aliveEnemies(ctx: SystemContext): number {
  let alive = 0;
  for (const entity of ctx.world.query(Mecha)) {
    const mecha = ctx.world.get(entity, Mecha);
    if (mecha !== undefined && mecha.faction !== 0) alive += 1;
  }
  return alive;
}

/**
 * 波次：清场后 3 秒补下一波，最多 maxWave 波（第 1 波由场景摆放）。
 * 状态放在玩家实体的 Run 组件里，不走模块级变量——否则回放不可复现。
 */
export function createWaveSystem(options: WaveOptions): SystemDef {
  const perWave = options.perWave ?? 2;
  return {
    name: 'game.waves',
    phase: 'cleanup',
    reads: [Run, Mecha],
    writes: [Run],
    update: (ctx) => {
      for (const entity of ctx.world.query(Run)) {
        const run = ctx.world.get(entity, Run);
        if (run === undefined) continue;
        if (run.spawnTicks > 0) {
          const spawnTicks = run.spawnTicks - 1;
          ctx.world.set(entity, Run, { wave: run.wave, maxWave: run.maxWave, spawnTicks });
          if (spawnTicks === 0) spawnWave(ctx, run.wave, perWave, options.width, options.height);
          continue;
        }
        if (aliveEnemies(ctx) > 0 || run.wave >= run.maxWave) continue;
        ctx.world.set(entity, Run, { wave: run.wave + 1, maxWave: run.maxWave, spawnTicks: WAVE_INTERVAL_TICKS });
      }
    },
  };
}
