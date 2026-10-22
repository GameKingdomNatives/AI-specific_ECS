import type { ComponentDef, World } from '@itb/engine/core';
import type { Scene, SceneNode } from '@itb/engine/scene';
import type { LoadedScene } from './scene-runtime.js';

/** 只有这两个组件的值变化可以原地写列；BoxSpawner 计数变化需要重建 spawner 状态。 */
const LIGHT_COMPONENTS = new Set(['Position', 'Box']);

type Lookup = (name: string) => ComponentDef | undefined;
type Pending = { entity: number; def: ComponentDef; fields: Record<string, number | boolean> };

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function sameKeys(a: SceneNode, b: SceneNode): boolean {
  return Object.keys(a.components ?? {}).sort().join(',') === Object.keys(b.components ?? {}).sort().join(',');
}

function sameNonLightComponents(a: SceneNode, b: SceneNode): boolean {
  for (const [name, fields] of Object.entries(a.components ?? {})) {
    if (!LIGHT_COMPONENTS.has(name) && !sameJson(fields, b.components?.[name])) return false;
  }
  return true;
}

function sameNode(a: SceneNode, b: SceneNode): boolean {
  return (
    a.id === b.id &&
    a.parentId === b.parentId &&
    a.name === b.name &&
    sameJson(a.assets, b.assets) &&
    sameKeys(a, b) &&
    sameNonLightComponents(a, b)
  );
}

function sameStructure(prev: Scene, next: Scene): boolean {
  if (prev.nodes.length !== next.nodes.length) return false;
  return prev.nodes.every((node, index) => {
    const other = next.nodes[index];
    return other !== undefined && sameNode(node, other);
  });
}

function narrowValues(fields: Readonly<Record<string, number | string | boolean>>): Record<string, number | boolean> | null {
  const values: Record<string, number | boolean> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string') return null;
    values[key] = value;
  }
  return values;
}

function collectWrites(loaded: LoadedScene, next: Scene, lookup: Lookup): Pending[] | null {
  const pending: Pending[] = [];
  for (const node of next.nodes) {
    const entity = loaded.entities.get(node.id);
    if (entity === undefined) return null;
    for (const [name, fields] of Object.entries(node.components ?? {})) {
      if (!LIGHT_COMPONENTS.has(name)) continue;
      const def = lookup(name);
      const values = narrowValues(fields);
      if (def === undefined || values === null) return null;
      pending.push({ entity, def, fields: values });
    }
  }
  return pending;
}

/** 组件值修改的轻量应用：不换世界、不重置 kills，只写 Position/Box 列。返回新 loaded 或 null（需整重建）。 */
export function tryApplyComponentScene(world: World, loaded: LoadedScene, next: Scene, lookup: Lookup): LoadedScene | null {
  const prev = loaded.scene;
  if (prev.name !== next.name || !sameJson(prev.resources, next.resources) || !sameJson(prev.systems, next.systems)) return null;
  if (!sameStructure(prev, next)) return null;
  const pending = collectWrites(loaded, next, lookup);
  if (pending === null) return null;
  for (const item of pending) world.setRow(item.entity, item.def, item.fields);
  return { ...loaded, scene: next };
}
