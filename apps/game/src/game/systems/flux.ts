import type { SystemDef } from 'agent-specific_ecs/core';
import { Flux, Shield, Vent } from '../components.js';
import { isOverloaded, stepFlux } from '../flux-model.js';

/**
 * 每 tick 推进一步辐能：消散 → 排散 → 过载判定。
 * 过载期间强制关盾、停排散：玩家不能靠“同时按着”绕过惩罚。
 */
export function createFluxSystem(): SystemDef {
  return {
    name: 'game.flux',
    phase: 'ai',
    reads: [Flux, Shield, Vent],
    writes: [Flux, Shield, Vent],
    update: (ctx) => {
      for (const entity of ctx.world.query(Flux)) {
        const flux = ctx.world.get(entity, Flux);
        if (flux === undefined) continue;
        const shield = ctx.world.get(entity, Shield);
        const vent = ctx.world.get(entity, Vent);
        const next = stepFlux(flux, {
          shieldActive: shield?.active === true,
          venting: vent?.active === true,
        });
        ctx.world.set(entity, Flux, { soft: next.soft, hard: next.hard, overloadTicks: next.overloadTicks });
        if (isOverloaded(next)) {
          ctx.world.set(entity, Shield, { active: false });
          ctx.world.set(entity, Vent, { active: false });
        }
      }
    },
  };
}
