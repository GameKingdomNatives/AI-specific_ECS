import type { Phase, SystemDef } from '../core/scheduler.js';
import type { Scene, SceneIssue, SceneSystem } from './schema.js';

/** 系统参数：只允许可序列化标量，保证 scene 可保存、可回放。 */
export type SystemParams = Readonly<Record<string, number | string | boolean>>;

/**
 * 系统工厂：由应用注册表提供，按 scene 里的 id/phase/params 构造 SystemDef。
 * 返回 undefined 表示该 id 未注册。
 */
export type SystemBuilder = (id: string, params: SystemParams, phase: Phase) => SystemDef | undefined;

export interface SceneSchedule {
  readonly systems: readonly SystemDef[];
  readonly issues: readonly SceneIssue[];
  /** scene 里 enabled=false 的系统（不加入调度器，但保留给编辑器显示）。 */
  readonly disabled: readonly string[];
}

function findCycle(systems: readonly SceneSystem[]): string[] | null {
  const byId = new Map(systems.map((system) => [system.id, system]));
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    const current = state.get(id);
    if (current === 'visiting') {
      return [...stack, id];
    }
    if (current === 'done') {
      return null;
    }
    state.set(id, 'visiting');
    stack.push(id);
    for (const dep of byId.get(id)?.after ?? []) {
      if (byId.has(dep)) {
        const found = visit(dep);
        if (found !== null) return found;
      }
    }
    stack.pop();
    state.set(id, 'done');
    return null;
  };
  for (const system of systems) {
    const found = visit(system.id);
    if (found !== null) return found;
  }
  return null;
}

function mergeAfter(system: SystemDef, sceneSystem: SceneSystem): readonly string[] {
  return [...new Set([...(system.after ?? []), ...(sceneSystem.after ?? [])])];
}

/**
 * 由 scene 的系统清单构造调度器输入：
 * - phase 以 scene 为准（编辑器可调整阶段）；
 * - after = 系统自带顺序 + scene 追加顺序；
 * - enabled=false 跳过但保留在 disabled；
 * - 未注册 id、工厂名不一致、scene 内 after 环都进 issues。
 */
export function buildSchedule(scene: Scene, build: SystemBuilder): SceneSchedule {
  const issues: SceneIssue[] = [];
  const disabled: string[] = [];
  const systems: SystemDef[] = [];
  const entries = scene.systems ?? [];
  const cycle = findCycle(entries);
  if (cycle !== null) {
    return { systems: [], disabled: [], issues: [{ path: 'systems', message: `系统 after 依赖存在环：${cycle.join(' → ')}` }] };
  }
  for (const entry of entries) {
    if (entry.enabled === false) {
      disabled.push(entry.id);
      continue;
    }
    const built = build(entry.id, entry.params ?? {}, entry.phase);
    if (built === undefined) {
      issues.push({ path: `systems.${entry.id}`, message: `系统未注册：${entry.id}` });
      continue;
    }
    if (built.name !== entry.id) {
      issues.push({ path: `systems.${entry.id}`, message: `系统工厂返回的 name 不一致：${built.name}` });
      continue;
    }
    systems.push({
      ...built,
      phase: entry.phase,
      after: mergeAfter(built, entry),
    });
  }
  return { systems, issues, disabled };
}
