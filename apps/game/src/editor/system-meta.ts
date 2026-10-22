import type { Scene, SystemMeta } from '@itb/engine/scene';
import { validateSystemParams } from '@itb/engine/scene';

/** 系统参数元数据：编辑器表单与保存校验共用同一份声明。 */
export const SYSTEM_META: readonly SystemMeta[] = [
  {
    id: 'demo.player',
    label: '玩家移动',
    params: [{ key: 'speed', label: '速度', kind: 'number', defaultValue: 10, min: 1, max: 60, step: 0.5 }],
  },
  {
    id: 'demo.weapon',
    label: '武器',
    params: [
      { key: 'cooldownTicks', label: '冷却 tick', kind: 'number', defaultValue: 6, min: 1, max: 120, step: 1 },
      { key: 'speed', label: '弹速', kind: 'number', defaultValue: 14, min: 1, max: 80, step: 0.5 },
    ],
  },
];

export const SYSTEM_META_BY_ID = new Map(SYSTEM_META.map((meta) => [meta.id, meta]));

export interface SystemParamIssue {
  readonly path: string;
  readonly message: string;
}

/** 对整个 scene 的系统参数做元数据校验；未登记的系统跳过。 */
export function validateSceneSystemParams(scene: Scene): SystemParamIssue[] {
  const issues: SystemParamIssue[] = [];
  for (const system of scene.systems ?? []) {
    const meta = SYSTEM_META_BY_ID.get(system.id);
    if (meta === undefined || system.params === undefined) continue;
    for (const message of validateSystemParams(meta, system.params)) {
      issues.push({ path: `systems.${system.id}.params`, message });
    }
  }
  return issues;
}
