import type { ComponentDef, EntityId } from '../core/types.js';
import type { World } from '../core/world.js';
import { SceneParent } from './components.js';
import type { Scene, SceneAssets, SceneIssue } from './schema.js';

export type ComponentLookup = (name: string) => ComponentDef | undefined;

export interface SceneInstantiationOptions {
  readonly lookup: ComponentLookup;
  /** 覆盖父子关系组件（默认 SceneParent）。 */
  readonly parent?: ComponentDef;
}

export interface SceneInstantiation {
  readonly entities: ReadonlyMap<string, EntityId>;
  readonly assets: ReadonlyMap<EntityId, SceneAssets>;
  readonly issues: readonly SceneIssue[];
}

function writeComponents(
  world: World,
  entity: EntityId,
  nodeIndex: number,
  node: Scene['nodes'][number],
  lookup: ComponentLookup,
  issues: SceneIssue[],
): void {
  for (const [componentName, fields] of Object.entries(node.components ?? {})) {
    const def = lookup(componentName);
    if (def === undefined) {
      issues.push({ path: `nodes.${nodeIndex}.components.${componentName}`, message: `组件未注册：${componentName}` });
      continue;
    }
    const values: Record<string, number | boolean> = {};
    for (const [field, value] of Object.entries(fields)) {
      if (!(field in def.fields)) {
        issues.push({ path: `nodes.${nodeIndex}.components.${componentName}.${field}`, message: `组件 ${componentName} 没有字段 ${field}` });
        continue;
      }
      if (typeof value === 'string') {
        issues.push({ path: `nodes.${nodeIndex}.components.${componentName}.${field}`, message: '字符串不能写入 ECS 列；资源请使用 node.assets' });
        continue;
      }
      values[field] = value;
    }
    if (Object.keys(values).length > 0) {
      // 字段类型在 schema 层已收窄为 number/boolean；走与命令缓冲同一条写入路径。
      world.addRow(entity, def, values);
    }
  }
}

function addParent(
  world: World,
  entity: EntityId,
  nodeIndex: number,
  node: Scene['nodes'][number],
  parentDef: ComponentDef,
  entities: ReadonlyMap<string, EntityId>,
  issues: SceneIssue[],
): void {
  if (node.parentId === null || node.parentId === undefined) {
    return;
  }
  const parent = entities.get(node.parentId);
  if (parent === undefined) {
    issues.push({ path: `nodes.${nodeIndex}.parentId`, message: `父节点未实例化：${node.parentId}` });
    return;
  }
  world.addRow(entity, parentDef, { parent });
}

function resolveAssets(scene: Scene, nodeIndex: number, node: Scene['nodes'][number], issues: SceneIssue[]): SceneAssets | undefined {
  const resolved: SceneAssets = {};
  for (const [slot, alias] of Object.entries(node.assets ?? {})) {
    if (alias === undefined) {
      continue;
    }
    const resource = scene.resources?.[alias];
    if (resource === undefined) {
      issues.push({ path: `nodes.${nodeIndex}.assets.${slot}`, message: `资源别名不存在：${alias}` });
      continue;
    }
    if (slot === 'texture') resolved.texture = resource;
    if (slot === 'audio') resolved.audio = resource;
  }
  return resolved.texture === undefined && resolved.audio === undefined ? undefined : resolved;
}

/**
 * 场景实例化：节点→实体、组件值写入、父子关系、资源别名解析。
 * 校验失败不抛异常，问题进 issues；调用方决定保留旧场景还是展示问题。
 */
export function instantiateScene(world: World, scene: Scene, options: SceneInstantiationOptions): SceneInstantiation {
  const issues: SceneIssue[] = [];
  const entities = new Map<string, EntityId>();
  const assets = new Map<EntityId, SceneAssets>();
  for (const node of scene.nodes) {
    entities.set(node.id, world.spawn());
  }
  const parentDef = options.parent ?? SceneParent;
  scene.nodes.forEach((node, index) => {
    const entity = entities.get(node.id);
    if (entity === undefined) {
      return;
    }
    writeComponents(world, entity, index, node, options.lookup, issues);
    addParent(world, entity, index, node, parentDef, entities, issues);
    const resolved = resolveAssets(scene, index, node, issues);
    if (resolved !== undefined) {
      assets.set(entity, resolved);
    }
  });
  return { entities, assets, issues };
}
