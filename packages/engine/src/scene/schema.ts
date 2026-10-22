import { z } from 'zod';
import { PHASES } from '../core/scheduler.js';

const ID_PATTERN = /^[A-Za-z][A-Za-z0-9._-]*$/;
const FIELD_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const scalarValue = z.union([z.number().finite(), z.boolean(), z.string().max(256)]);

export const sceneAssetsSchema = z.object({
  texture: z.string().min(1).max(200).optional(),
  audio: z.string().min(1).max(200).optional(),
});

export const sceneNodeSchema = z.object({
  id: z.string().min(1).max(64).regex(ID_PATTERN, '节点 id 只能使用字母/数字/._-，且以字母开头'),
  name: z.string().min(1).max(64),
  parentId: z.string().min(1).max(64).nullable().optional(),
  assets: sceneAssetsSchema.optional(),
  components: z.record(
    z.string().regex(ID_PATTERN, '组件名不合法'),
    z.record(z.string().regex(FIELD_PATTERN, '字段名不合法'), scalarValue),
  ).optional(),
});

export const sceneSystemSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[A-Za-z][A-Za-z0-9._-]*$/, '系统 id 不合法'),
  phase: z.enum(PHASES),
  enabled: z.boolean().optional(),
  after: z.array(z.string().min(1).max(80)).optional(),
  params: z.record(z.string().regex(FIELD_PATTERN), scalarValue).optional(),
});

export const sceneSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(80),
  resources: z.record(z.string().regex(ID_PATTERN, '资源别名不合法'), z.string().min(1).max(200)).optional(),
  nodes: z.array(sceneNodeSchema).min(1),
  systems: z.array(sceneSystemSchema).optional(),
});

export type SceneNode = z.infer<typeof sceneNodeSchema>;
export type SceneSystem = z.infer<typeof sceneSystemSchema>;
export type SceneAssets = z.infer<typeof sceneAssetsSchema>;
export type Scene = z.infer<typeof sceneSchema>;

export interface SceneIssue {
  readonly path: string;
  readonly message: string;
}

export type SceneResult =
  | { readonly ok: true; readonly value: Scene; readonly issues: readonly [] }
  | { readonly ok: false; readonly value: null; readonly issues: readonly SceneIssue[] };

function validateNodes(nodes: readonly SceneNode[], resources: Readonly<Record<string, string>> | undefined): SceneIssue[] {
  const issues: SceneIssue[] = [];
  const ids = new Set<string>();
  const parents = new Map<string, string | null>();
  nodes.forEach((node, index) => {
    if (ids.has(node.id)) {
      issues.push({ path: `nodes.${index}.id`, message: `节点 id 重复：${node.id}` });
    }
    ids.add(node.id);
    parents.set(node.id, node.parentId ?? null);
    for (const [slot, alias] of Object.entries(node.assets ?? {})) {
      if (alias !== undefined && (resources === undefined || resources[alias] === undefined)) {
        issues.push({ path: `nodes.${index}.assets.${slot}`, message: `资源别名不存在：${alias}` });
      }
    }
  });
  nodes.forEach((node, index) => {
    const parent = node.parentId ?? null;
    if (parent !== null && !ids.has(parent)) {
      issues.push({ path: `nodes.${index}.parentId`, message: `父节点不存在：${parent}` });
    }
    if (parent === node.id) {
      issues.push({ path: `nodes.${index}.parentId`, message: `节点不能以自身为父：${node.id}` });
    }
  });
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (id: string): boolean => {
    const current = state.get(id);
    if (current === 'visiting') return true;
    if (current === 'done') return false;
    state.set(id, 'visiting');
    const parent = parents.get(id) ?? null;
    if (parent !== null && parents.has(parent) && visit(parent)) return true;
    state.set(id, 'done');
    return false;
  };
  for (const id of parents.keys()) {
    if (visit(id)) {
      issues.push({ path: 'nodes', message: '节点父子关系存在环' });
      break;
    }
  }
  return issues;
}

function validateSystems(systems: readonly SceneSystem[]): SceneIssue[] {
  const issues: SceneIssue[] = [];
  const ids = new Set<string>();
  systems.forEach((system, index) => {
    if (ids.has(system.id)) {
      issues.push({ path: `systems.${index}.id`, message: `系统 id 重复：${system.id}` });
    }
    ids.add(system.id);
  });
  systems.forEach((system, index) => {
    for (const [afterIndex, after] of (system.after ?? []).entries()) {
      if (after === system.id) {
        issues.push({ path: `systems.${index}.after.${afterIndex}`, message: `系统不能依赖自身：${system.id}` });
      } else if (!ids.has(after)) {
        issues.push({ path: `systems.${index}.after.${afterIndex}`, message: `after 引用的系统不存在：${after}` });
      }
    }
  });
  return issues;
}

/** 场景校验唯一入口：非法场景返回问题清单，不抛异常。 */
export function parseScene(raw: unknown): SceneResult {
  const parsed = sceneSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      value: null,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.') || '$',
        message: issue.message,
      })),
    };
  }
  const semantic = [
    ...validateNodes(parsed.data.nodes, parsed.data.resources),
    ...validateSystems(parsed.data.systems ?? []),
  ];
  if (semantic.length > 0) {
    return { ok: false, value: null, issues: semantic };
  }
  return { ok: true, value: parsed.data, issues: [] };
}
