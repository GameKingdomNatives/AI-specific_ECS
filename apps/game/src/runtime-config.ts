import type { Scene } from 'agent-specific_ecs/scene';

/** 运行时配置指纹：scene 名/资源/系统/节点结构（不含组件值），用于录制归属。 */
export function configHashFor(scene: Scene | null): string {
  const nodes = (scene?.nodes ?? []).map((node) => ({
    id: node.id,
    parentId: node.parentId,
    assets: node.assets ?? null,
    components: Object.keys(node.components ?? {}).sort(),
  }));
  const raw = JSON.stringify({ name: scene?.name ?? null, resources: scene?.resources ?? {}, systems: scene?.systems ?? [], nodes });
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
