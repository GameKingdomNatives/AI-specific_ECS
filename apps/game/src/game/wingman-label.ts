/** 僚机状态标签：机甲上方一行字，回答「它现在在干什么」。 */
import type { EntityId, World } from 'agent-specific_ecs/core';
import type { RenderItem } from 'agent-specific_ecs/ports';
import { Wingman } from './components.js';
import { WING_ENGAGE, WING_FOLLOW, WING_VENT } from './wingman-model.js';

const NAMES: Readonly<Record<number, string>> = { [WING_FOLLOW]: '跟随', [WING_ENGAGE]: '交战', [WING_VENT]: '排散', 3: '待命' };
const COLORS: Readonly<Record<number, number>> = { [WING_FOLLOW]: 0xcfe6ff, [WING_ENGAGE]: 0xffd27a, [WING_VENT]: 0x6fb6ff, 3: 0xb8ada0 };

export function wingmanBadge(world: World, entity: EntityId, point: { readonly x: number; readonly y: number }, size: number): RenderItem | null {
  const wingman = world.get(entity, Wingman);
  if (wingman === undefined) return null;
  const mode = Number(wingman.mode);
  return { id: -900000 - entity, x: point.x, y: point.y - size - 16, rot: 0, sx: 1, sy: 1, layer: 6, shape: 'rect', tint: COLORS[mode] ?? 0xb8ada0, alpha: 0.95, visible: true, text: '僚机 ' + (NAMES[mode] ?? '待命'), font: 'monospace', fontSize: 14 };
}
