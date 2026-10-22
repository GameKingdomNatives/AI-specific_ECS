import type { Scene, SceneNode } from './schema.js';

/** 编辑器文档操作：全部返回新 scene，不修改输入。 */
export function cloneScene(scene: Scene): Scene {
  return structuredClone(scene);
}

export function nextNodeId(scene: Scene, base = 'node'): string {
  const ids = new Set(scene.nodes.map((node) => node.id));
  if (!ids.has(base)) return base;
  let index = 2;
  while (ids.has(`${base}${index}`)) index += 1;
  return `${base}${index}`;
}

export function addNode(scene: Scene, parentId: string | null, name = 'node'): Scene {
  const next = cloneScene(scene);
  const id = nextNodeId(next);
  const node: SceneNode = { id, name, ...(parentId === null ? {} : { parentId }) };
  next.nodes.push(node);
  return next;
}

export function removeNode(scene: Scene, nodeId: string): Scene {
  const next = cloneScene(scene);
  const target = next.nodes.find((node) => node.id === nodeId);
  if (target === undefined) return next;
  const parentId = target.parentId ?? null;
  for (const node of next.nodes) {
    if (node.parentId === nodeId) {
      node.parentId = parentId;
    }
  }
  next.nodes = next.nodes.filter((node) => node.id !== nodeId);
  return next;
}

export function renameNode(scene: Scene, nodeId: string, name: string): Scene {
  const next = cloneScene(scene);
  const node = next.nodes.find((entry) => entry.id === nodeId);
  if (node !== undefined) node.name = name;
  return next;
}

export interface MoveResult {
  readonly scene: Scene;
  readonly issue: string | null;
}

/** 改父节点；拒绝把节点挂到自己的后代下（形成环）。 */
export function moveNode(scene: Scene, nodeId: string, parentId: string | null): MoveResult {
  const next = cloneScene(scene);
  const node = next.nodes.find((entry) => entry.id === nodeId);
  if (node === undefined) return { scene: next, issue: `节点不存在：${nodeId}` };
  if (parentId !== null) {
    const byId = new Map(next.nodes.map((entry) => [entry.id, entry]));
    if (!byId.has(parentId)) return { scene: next, issue: `父节点不存在：${parentId}` };
    let cursor: string | null = parentId;
    while (cursor !== null) {
      if (cursor === nodeId) return { scene: next, issue: '不能把节点移动到自己的后代下' };
      cursor = byId.get(cursor)?.parentId ?? null;
    }
    node.parentId = parentId;
  } else {
    delete node.parentId;
  }
  return { scene: next, issue: null };
}

export function setComponentField(
  scene: Scene,
  nodeId: string,
  component: string,
  field: string,
  value: number | boolean,
): Scene {
  const next = cloneScene(scene);
  const node = next.nodes.find((entry) => entry.id === nodeId);
  const fields = node?.components?.[component];
  if (fields !== undefined) fields[field] = value;
  return next;
}

export function addComponent(scene: Scene, nodeId: string, component: string, values: Record<string, number | boolean>): Scene {
  const next = cloneScene(scene);
  const node = next.nodes.find((entry) => entry.id === nodeId);
  if (node !== undefined) {
    node.components = { ...(node.components ?? {}), [component]: { ...values } };
  }
  return next;
}

export function setAsset(scene: Scene, nodeId: string, slot: 'texture' | 'audio', alias: string | null): Scene {
  const next = cloneScene(scene);
  const node = next.nodes.find((entry) => entry.id === nodeId);
  if (node === undefined) return next;
  if (alias === null) {
    const assets = { ...(node.assets ?? {}) };
    delete assets[slot];
    node.assets = Object.keys(assets).length > 0 ? assets : undefined;
    return next;
  }
  node.assets = { ...(node.assets ?? {}), [slot]: alias };
  return next;
}

/** 为 manifest 资源名准备一个 scene 别名；已有同名映射则复用，不产生新副本。 */
export function ensureResource(scene: Scene, name: string): { scene: Scene; alias: string } {
  for (const [alias, value] of Object.entries(scene.resources ?? {})) {
    if (value === name) return { scene, alias };
  }
  const base = name.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^[^A-Za-z]+/, '');
  const resources = { ...(scene.resources ?? {}) };
  let alias = base.length > 0 ? base : 'asset';
  let index = 2;
  while (resources[alias] !== undefined) {
    alias = `${base}${index}`;
    index += 1;
  }
  resources[alias] = name;
  const next = cloneScene(scene);
  next.resources = resources;
  return { scene: next, alias };
}
