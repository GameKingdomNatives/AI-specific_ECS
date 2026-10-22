import { Assets } from 'pixi.js';
import type { Texture } from 'pixi.js';

const textures = new Map<string, Texture>();
const pending = new Set<string>();

/** 贴图按需异步加载；失败静默回退，不阻塞渲染循环。 */
export function ensureTexture(url: string): Texture | null {
  const cached = textures.get(url);
  if (cached !== undefined) {
    return cached;
  }
  if (!pending.has(url)) {
    pending.add(url);
    Assets.load(url)
      .then((texture: Texture) => {
        textures.set(url, texture);
        pending.delete(url);
      })
      .catch(() => {
        pending.delete(url);
      });
  }
  return null;
}
