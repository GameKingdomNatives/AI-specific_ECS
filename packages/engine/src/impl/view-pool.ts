import { Graphics, Sprite, Text } from 'pixi.js';
import type { Container, Texture } from 'pixi.js';
import type { RenderShape } from '../ports/index.js';
import { resolveTextStyle, textKey } from './text-style.js';

/**
 * 视图池：按「形状」或「贴图 URL」复用 Container，避免实体反复增删时
 * 每帧 new/destroy。池内节点不挂在场景里，取出后再 addChild。
 */
const pools = new Map<string, Container[]>();

function drawShape(graphic: Graphics, shape: RenderShape): void {
  graphic.clear();
  if (shape === 'circle') {
    graphic.circle(0, 0, 1).fill(0xffffff);
  } else if (shape === 'poly') {
    graphic.poly([-1, 1, 1, 1, 0, -1]).fill(0xffffff);
  } else {
    graphic.rect(-0.5, -0.5, 1, 1).fill(0xffffff);
  }
}

export function shapePoolKey(shape: RenderShape): string {
  return `shape:${shape}`;
}

export function spritePoolKey(textureKey: string): string {
  return `tex:${textureKey}`;
}

/** 文本视图：Pixi Text 自身走 Canvas 纹理缓存；池键由内容/字体/字号/颜色决定。 */
export function acquireText(
  text: string,
  font: string | undefined,
  fontSize: number | undefined,
  tint: number,
): Container {
  const key = textKey(text, font, fontSize, tint);
  const reused = pools.get(key)?.pop();
  if (reused instanceof Text) {
    return reused;
  }
  const style = resolveTextStyle(font, fontSize);
  const node = new Text({
    text,
    style: { fontFamily: style.font, fontSize: style.size, fill: tint },
  });
  node.anchor.set(0.5);
  return node;
}

export function acquireShape(shape: RenderShape): Container {
  const key = shapePoolKey(shape);
  const reused = pools.get(key)?.pop();
  if (reused instanceof Graphics) {
    drawShape(reused, shape);
    return reused;
  }
  const created = new Graphics();
  drawShape(created, shape);
  return created;
}

export function acquireSprite(texture: Texture, textureKey: string): Container {
  const reused = pools.get(spritePoolKey(textureKey))?.pop();
  if (reused instanceof Sprite) {
    reused.texture = texture;
    return reused;
  }
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  return sprite;
}

export function releaseView(poolKey: string, node: Container): void {
  const pool = pools.get(poolKey);
  if (pool === undefined) {
    pools.set(poolKey, [node]);
    return;
  }
  pool.push(node);
}

export function poolSize(): number {
  let total = 0;
  for (const pool of pools.values()) {
    total += pool.length;
  }
  return total;
}

export function destroyPools(): void {
  for (const pool of pools.values()) {
    for (const node of pool) {
      node.destroy();
    }
  }
  pools.clear();
}
