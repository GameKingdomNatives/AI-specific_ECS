import type { EntityId, SystemDef } from 'agent-specific_ecs/core';
import type { InputSnapshot } from 'agent-specific_ecs/ports';
import { Position } from '@itb/fixture';
import { Aim, Flux, Shield, Vent } from '../components.js';
import { performanceFactor } from '../flux-model.js';

export interface MechaControlOptions {
  readonly player: EntityId;
  readonly getInput: () => InputSnapshot;
  readonly width: number;
  readonly height: number;
  readonly speed?: number;
  readonly margin?: number;
}

export function movementOf(input: InputSnapshot): { x: number; y: number } {
  const x = (input.keys.has('right') ? 1 : 0) - (input.keys.has('left') ? 1 : 0);
  const y = (input.keys.has('down') ? 1 : 0) - (input.keys.has('up') ? 1 : 0);
  return { x, y };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * 旗舰操控：WASD 位移、指针朝向、空格护盾、V 排散。
 * 红线区用同一个性能系数同时降低移动与装填，不另开第二套真相。
 */
export function createMechaControlSystem(options: MechaControlOptions): SystemDef {
  const speed = options.speed ?? 7;
  const margin = options.margin ?? 40;
  return {
    name: 'game.player',
    phase: 'ai',
    reads: [Position, Flux],
    writes: [Position, Aim, Shield, Vent],
    update: (ctx) => {
      const entity = options.player;
      const position = ctx.world.get(entity, Position);
      if (position === undefined) return;
      const flux = ctx.world.get(entity, Flux);
      const factor = flux === undefined ? 1 : performanceFactor(flux);
      const overloaded = flux !== undefined && flux.overloadTicks > 0;
      const input = options.getInput();
      const move = movementOf(input);
      const length = Math.hypot(move.x, move.y);
      if (length > 0 && factor > 0) {
        const step = (speed * factor) / length;
        ctx.world.set(entity, Position, {
          x: clamp(position.x + move.x * step, margin, options.width - margin),
          y: clamp(position.y + move.y * step, margin, options.height - margin),
        });
      }
      ctx.world.set(entity, Aim, {
        angle: Math.atan2(input.pointer.y - position.y, input.pointer.x - position.x),
      });
      ctx.world.set(entity, Shield, { active: input.keys.has('shield') && !overloaded });
      ctx.world.set(entity, Vent, { active: input.keys.has('vent') && !overloaded });
    },
  };
}
