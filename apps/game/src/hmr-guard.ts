import type { World } from 'agent-specific_ecs/core';

/** §11：组件 schema 变化时不能热替换，打印原因并整页重载。 */
export function createSchemaGuard(world: World): () => boolean {
  const expected = world.schemaFingerprint();
  return () => {
    const current = world.schemaFingerprint();
    if (current === expected) {
      return true;
    }
    console.warn(`组件 schema 已变化（${expected} → ${current}），降级为整页重载`);
    location.reload();
    return false;
  };
}
