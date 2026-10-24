import { buildSchedule, instantiateScene, parseScene } from 'agent-specific_ecs/scene';
import type { ComponentDef, EntityId, SystemDef, World } from 'agent-specific_ecs/core';
import type { Scene, SceneAssets, SceneIssue } from 'agent-specific_ecs/scene';
import { currentSceneFile, sceneUrl } from './scene-file.js';

export interface LoadedScene {
  readonly scene: Scene;
  readonly entities: ReadonlyMap<string, EntityId>;
  readonly assets: ReadonlyMap<EntityId, SceneAssets>;
}

export interface SceneState {
  readonly loaded: LoadedScene;
  readonly issues: readonly SceneIssue[];
}

declare global {
  var __itbScene:
    | {
        name: string;
        nodes: number;
        systems: number;
        issues: number;
        entities: Record<string, number>;
        player: number | null;
        spawned: Record<string, number>;
      }
    | undefined;
  var __itbApplyScene: ((raw: unknown) => { ok: boolean; issues: string[] }) | undefined;
  var __itbSceneFile: string | undefined;
}

/** 把 scene 实例化进 world，并发布运行时快照（编辑器/调试可读）。 */
export function instantiateSceneState(
  world: World,
  scene: Scene,
  lookup: (name: string) => ComponentDef | undefined,
): SceneState {
  const instance = instantiateScene(world, scene, { lookup });
  globalThis.__itbScene = {
    name: scene.name,
    nodes: scene.nodes.length,
    systems: scene.systems?.length ?? 0,
    issues: instance.issues.length,
    entities: Object.fromEntries(instance.entities),
    player: instance.entities.get('player') ?? null,
    spawned: {},
  };
  return { loaded: { scene, entities: instance.entities, assets: instance.assets }, issues: instance.issues };
}

/** 运行时当前 scene 地址（含 URL/编辑器选择）。 */
export function currentSceneUrl(): string {
  return sceneUrl(currentSceneFile());
}

/** 运行时读 scene 文件并实例化；失败返回 issues，调用方保留旧路径降级。 */
export async function loadSceneRuntime(
  world: World,
  lookup: (name: string) => ComponentDef | undefined,
): Promise<{ loaded: LoadedScene | null; issues: readonly SceneIssue[] }> {
  try {
    const raw: unknown = await (await fetch(currentSceneUrl())).json();
    const parsed = parseScene(raw);
    if (!parsed.ok) {
      return { loaded: null, issues: parsed.issues };
    }
    const state = instantiateSceneState(world, parsed.value, lookup);
    return { loaded: state.loaded, issues: state.issues };
  } catch (error) {
    return { loaded: null, issues: [{ path: '$', message: String(error) }] };
  }
}

/** 用 scene 的系统清单重排已有系统定义；未知 id / after 环进 issues。 */
export function buildSceneSchedule(scene: Scene, systems: readonly SystemDef[]) {
  const byId = new Map(systems.map((system) => [system.name, system]));
  return buildSchedule(scene, (id) => byId.get(id));
}
