import { createAssetLoader, parseAssetManifest } from 'agent-specific_ecs/data';
import type { AssetEntry } from 'agent-specific_ecs/data';

/** 编辑器资源浏览器：直接读项目 manifest，显示名字/文件/尺寸。 */
export async function loadAssetEntries(): Promise<readonly AssetEntry[]> {
  const outcome = await createAssetLoader().json('/assets/manifest.json');
  if (!outcome.ok) {
    return [];
  }
  const parsed = parseAssetManifest(outcome.value);
  return parsed.ok ? parsed.value.assets : [];
}
