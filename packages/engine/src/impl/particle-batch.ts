import { Particle, ParticleContainer } from 'pixi.js';
import type { Container, Texture } from 'pixi.js';
import type { RenderItem } from '../ports/index.js';
import { ensureTexture } from './texture-cache.js';

interface Entry {
  particle: Particle;
  texture: string | null;
  layer: number;
  bucketKey: string;
  lastSeen: number;
}

interface Bucket {
  container: ParticleContainer;
  texture: Texture;
}

interface BatchState {
  entries: Map<number, Entry>;
  buckets: Map<string, Bucket>;
  layers: Container[];
}

const bucketKeyOf = (item: RenderItem): string => `${item.layer}:${item.texture ?? ''}`;

/** 取（或建）该 (layer, texture) 的批容器；贴图未就绪或层级缺失返回 null。 */
function bucketFor(state: BatchState, item: RenderItem): Bucket | null {
  const key = bucketKeyOf(item);
  const existing = state.buckets.get(key);
  if (existing !== undefined) {
    return existing;
  }
  if (item.texture === undefined) {
    return null;
  }
  const texture = ensureTexture(item.texture);
  const layer = state.layers[item.layer] ?? state.layers[0];
  if (texture === null || layer === undefined) {
    return null;
  }
  const container = new ParticleContainer({
    dynamicProperties: { position: true, rotation: true, color: true },
  });
  layer.addChild(container);
  const bucket: Bucket = { container, texture };
  state.buckets.set(key, bucket);
  return bucket;
}

function spawnParticle(bucket: Bucket, item: RenderItem): Particle {
  const particle = new Particle({
    texture: bucket.texture,
    x: item.x,
    y: item.y,
    anchorX: 0.5,
    anchorY: 0.5,
    rotation: item.rot,
    tint: item.tint,
    alpha: item.alpha,
  });
  bucket.container.addParticle(particle);
  return particle;
}

function updateParticle(particle: Particle, item: RenderItem): void {
  particle.x = item.x;
  particle.y = item.y;
  particle.rotation = item.rot;
  particle.tint = item.tint;
  particle.alpha = item.alpha;
}

function detach(state: BatchState, entry: Entry): void {
  state.buckets.get(entry.bucketKey)?.container.removeParticle(entry.particle);
}

/** 同步一个带贴图的项；贴图路径不可用返回 false，由调用方回退 Sprite。 */
function syncItem(state: BatchState, item: RenderItem, frame: number): boolean {
  const texture = item.texture ?? null;
  const entry = state.entries.get(item.id);
  if (entry !== undefined && entry.texture === texture && entry.layer === item.layer) {
    updateParticle(entry.particle, item);
    entry.lastSeen = frame;
    return true;
  }
  if (texture === null) {
    if (entry !== undefined) {
      detach(state, entry);
      state.entries.delete(item.id);
    }
    return false;
  }
  const bucket = bucketFor(state, item);
  if (bucket === null) {
    return false;
  }
  if (entry !== undefined) {
    detach(state, entry);
    state.entries.delete(item.id);
  }
  const particle = spawnParticle(bucket, item);
  state.entries.set(item.id, { particle, texture, layer: item.layer, bucketKey: bucketKeyOf(item), lastSeen: frame });
  return true;
}

function hideItem(state: BatchState, id: number, frame: number): boolean {
  const entry = state.entries.get(id);
  if (entry === undefined) {
    return false;
  }
  entry.particle.alpha = 0;
  entry.lastSeen = frame;
  return true;
}

function releaseUnseenItems(state: BatchState, frame: number): void {
  for (const [id, entry] of state.entries) {
    if (entry.lastSeen !== frame) {
      detach(state, entry);
      state.entries.delete(id);
    }
  }
}

/**
 * 合批路径：带贴图的项按 (layer, texture) 分到各自的 ParticleContainer。
 * ParticleContainer 要求同容器共享 base texture，故按贴图分组；
 * 可见语义与 Sprite 路径一致（缩放交给贴图本身，不读 sx/sy）。
 */
export function createBatchLayer(layers: Container[]): {
  sync: (item: RenderItem, frame: number) => boolean;
  hide: (id: number, frame: number) => boolean;
  releaseUnseen: (frame: number) => void;
  size: () => number;
} {
  const state: BatchState = { entries: new Map(), buckets: new Map(), layers };
  return {
    sync: (item, frame) => syncItem(state, item, frame),
    hide: (id, frame) => hideItem(state, id, frame),
    releaseUnseen: (frame) => releaseUnseenItems(state, frame),
    size: () => state.entries.size,
  };
}
