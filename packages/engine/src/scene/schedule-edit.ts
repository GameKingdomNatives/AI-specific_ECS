import type { Phase } from '../core/scheduler.js';
import type { Scene, SceneSystem } from './schema.js';
import { cloneScene } from './edit.js';

function findSystem(next: Scene, id: string): SceneSystem | undefined {
  return next.systems?.find((system) => system.id === id);
}

export function addSystem(scene: Scene, id: string, phase: Phase): Scene {
  const next = cloneScene(scene);
  next.systems = [...(next.systems ?? []), { id, phase }];
  return next;
}

export function removeSystem(scene: Scene, id: string): Scene {
  const next = cloneScene(scene);
  next.systems = (next.systems ?? []).filter((system) => system.id !== id);
  return next;
}

export function updateSystemPhase(scene: Scene, id: string, phase: Phase): Scene {
  const next = cloneScene(scene);
  const system = findSystem(next, id);
  if (system !== undefined) system.phase = phase;
  return next;
}

export function setSystemEnabled(scene: Scene, id: string, enabled: boolean): Scene {
  const next = cloneScene(scene);
  const system = findSystem(next, id);
  if (system !== undefined) system.enabled = enabled;
  return next;
}

/** after 去重并去掉自引用；不存在的 id 保留，交由 schema 报错。 */
export function setSystemAfter(scene: Scene, id: string, after: readonly string[]): Scene {
  const next = cloneScene(scene);
  const system = findSystem(next, id);
  if (system !== undefined) {
    system.after = [...new Set(after.filter((entry) => entry.length > 0 && entry !== id))];
  }
  return next;
}

export function setSystemParam(
  scene: Scene,
  id: string,
  key: string,
  value: number | string | boolean | null,
): Scene {
  const next = cloneScene(scene);
  const system = findSystem(next, id);
  if (system === undefined) return next;
  const params = { ...(system.params ?? {}) };
  if (value === null) delete params[key];
  else if (key.length > 0) params[key] = value;
  system.params = Object.keys(params).length > 0 ? params : undefined;
  return next;
}
