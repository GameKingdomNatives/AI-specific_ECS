import { Assets, Graphics, Sprite } from 'pixi.js';
import type { Container, Texture } from 'pixi.js';
import type { RenderItem } from '../ports/index.js';

interface View {
  node: Container;
  layer: number;
  textureKey: string | null;
}

const textures = new Map<string, Texture>();
const pending = new Set<string>();

/** 贴图按需异步加载；失败静默回退到几何图形，不阻塞渲染循环。 */
function ensureTexture(url: string): Texture | null {
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

function shapeNode(item: RenderItem): Container {
  const graphic = new Graphics();
  if (item.shape === 'circle') {
    graphic.circle(0, 0, 1).fill(0xffffff);
  } else if (item.shape === 'poly') {
    graphic.poly([-1, 1, 1, 1, 0, -1]).fill(0xffffff);
  } else {
    graphic.rect(-0.5, -0.5, 1, 1).fill(0xffffff);
  }
  return graphic;
}

function textureNode(texture: Texture, item: RenderItem): Container {
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  sprite.width = item.sx;
  sprite.height = item.sy;
  return sprite;
}

function buildNode(item: RenderItem): { node: Container; textureKey: string | null } {
  const key = item.texture ?? null;
  const texture = key === null ? null : ensureTexture(key);
  if (key !== null && texture !== null) {
    return { node: textureNode(texture, item), textureKey: key };
  }
  return { node: shapeNode(item), textureKey: null };
}

function applyTransform(view: View, item: RenderItem): void {
  view.node.position.set(item.x, item.y);
  view.node.rotation = item.rot;
  if (view.textureKey === null) {
    view.node.scale.set(item.sx, item.sy);
  }
  view.node.tint = item.tint;
  view.node.alpha = item.alpha;
  view.node.visible = item.visible;
}

function layerAt(layers: Container[], index: number): Container {
  return layers[index] ?? (layers[0] as Container);
}

/** 同步一个可见项：必要时重建/换层，然后写入变换。 */
function syncView(views: Map<number, View>, layers: Container[], item: RenderItem, seen: Set<number>): void {
  const desiredKey = item.texture ?? null;
  let view = views.get(item.id);
  if (view === undefined || view.textureKey !== desiredKey) {
    view?.node.destroy();
    const built = buildNode(item);
    view = { node: built.node, layer: item.layer, textureKey: built.textureKey };
    views.set(item.id, view);
    layerAt(layers, item.layer).addChild(view.node);
  }
  if (view.layer !== item.layer) {
    view.node.removeFromParent();
    view.layer = item.layer;
    layerAt(layers, item.layer).addChild(view.node);
  }
  applyTransform(view, item);
  seen.add(item.id);
}

function destroyUnseen(views: Map<number, View>, seen: Set<number>): void {
  for (const [id, view] of views) {
    if (!seen.has(id)) {
      view.node.destroy();
      views.delete(id);
    }
  }
}

export function createViewLayer(layers: Container[]): {
  submit: (items: readonly RenderItem[], isItemVisible?: (item: RenderItem) => boolean) => void;
  size: () => number;
} {
  const views = new Map<number, View>();

  return {
    submit(items, isItemVisible) {
      const seen = new Set<number>();
      for (const item of items) {
        const visible = isItemVisible === undefined ? true : isItemVisible(item);
        if (!visible) {
          const hidden = views.get(item.id);
          if (hidden !== undefined) {
            hidden.node.visible = false;
            seen.add(item.id);
          }
          continue;
        }
        syncView(views, layers, item, seen);
      }
      destroyUnseen(views, seen);
    },
    size(): number {
      return views.size;
    },
  };
}
