import type { Container, Texture } from 'pixi.js';
import type { RenderItem } from '../ports/index.js';
import { createBatchLayer } from './particle-batch.js';
import { ensureTexture } from './texture-cache.js';
import {
  acquireShape,
  acquireSprite,
  releaseView,
  shapePoolKey,
  spritePoolKey,
} from './view-pool.js';

interface View {
  node: Container;
  layer: number;
  textureKey: string | null;
  poolKey: string;
  lastSeen: number;
}

export interface ViewLayerOptions {
  /** 带贴图的项走 ParticleContainer 合批；默认关闭，保持 Sprite 路径。 */
  readonly batching?: boolean;
}

function buildNode(item: RenderItem): { node: Container; textureKey: string | null; poolKey: string } {
  const key = item.texture ?? null;
  const texture: Texture | null = key === null ? null : ensureTexture(key);
  if (key !== null && texture !== null) {
    return { node: acquireSprite(texture, key), textureKey: key, poolKey: spritePoolKey(key) };
  }
  return { node: acquireShape(item.shape), textureKey: null, poolKey: shapePoolKey(item.shape) };
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
function syncView(
  views: Map<number, View>,
  layers: Container[],
  item: RenderItem,
  frame: number,
): void {
  const desiredKey = item.texture ?? null;
  let view = views.get(item.id);
  if (view === undefined || view.textureKey !== desiredKey) {
    if (view !== undefined) {
      view.node.removeFromParent();
      releaseView(view.poolKey, view.node);
    }
    const built = buildNode(item);
    view = {
      node: built.node,
      layer: item.layer,
      textureKey: built.textureKey,
      poolKey: built.poolKey,
      lastSeen: frame,
    };
    views.set(item.id, view);
    layerAt(layers, item.layer).addChild(view.node);
  }
  if (view.layer !== item.layer) {
    view.node.removeFromParent();
    view.layer = item.layer;
    layerAt(layers, item.layer).addChild(view.node);
  }
  applyTransform(view, item);
  view.lastSeen = frame;
}

/** 回收本帧没出现的视图到池，不销毁。 */
function releaseUnseen(views: Map<number, View>, frame: number): void {
  for (const [id, view] of views) {
    if (view.lastSeen !== frame) {
      view.node.removeFromParent();
      releaseView(view.poolKey, view.node);
      views.delete(id);
    }
  }
}

export function createViewLayer(
  layers: Container[],
  options: ViewLayerOptions = {},
): {
  submit: (items: readonly RenderItem[], isItemVisible?: (item: RenderItem) => boolean) => void;
  size: () => number;
  batchedSize: () => number;
} {
  const views = new Map<number, View>();
  const batch = options.batching === true ? createBatchLayer(layers) : null;
  let frame = 0;

  return {
    submit(items, isItemVisible) {
      frame += 1;
      for (const item of items) {
        const visible = isItemVisible === undefined ? true : isItemVisible(item);
        if (visible) {
          if (batch !== null && item.texture !== undefined && batch.sync(item, frame)) {
            continue;
          }
          syncView(views, layers, item, frame);
          continue;
        }
        const hidden = views.get(item.id);
        if (hidden !== undefined) {
          hidden.node.visible = false;
          hidden.lastSeen = frame;
        }
        batch?.hide(item.id, frame);
      }
      releaseUnseen(views, frame);
      batch?.releaseUnseen(frame);
    },
    size(): number {
      return views.size + (batch?.size() ?? 0);
    },
    batchedSize(): number {
      return batch?.size() ?? 0;
    },
  };
}
