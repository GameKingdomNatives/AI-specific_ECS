import type { ComponentDef } from '../core/types.js';
import type { World } from '../core/world.js';

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

const bitsBuffer = new Float64Array(1);
const bitsView = new Uint32Array(bitsBuffer.buffer);

function mix(hash: number, value: number): number {
  let next = (hash ^ (value >>> 0)) >>> 0;
  next = Math.imul(next, FNV_PRIME) >>> 0;
  return next;
}

function mixString(hash: number, text: string): number {
  let next = hash;
  for (let index = 0; index < text.length; index += 1) {
    next = mix(next, text.charCodeAt(index));
  }
  return next;
}

function mixNumber(hash: number, value: number): number {
  bitsBuffer[0] = value;
  const withLow = mix(hash, bitsView[0] as number);
  return mix(withLow, bitsView[1] as number);
}

/**
 * 世界哈希：对「拥有全部给定组件」的实体按 id 升序计算。
 * 同一世界状态必须得到同一哈希；任一组件字段变化必须改变哈希。
 */
export function worldHash(world: World, defs: readonly ComponentDef[]): number {
  const entities = world.query(...defs);
  const sorted = [...entities].sort((left, right) => left - right);
  let hash = FNV_OFFSET;
  for (const entity of sorted) {
    hash = mix(hash, entity);
    for (const def of defs) {
      const values = world.get(entity, def);
      if (values === undefined) {
        hash = mix(hash, 0xffff);
        continue;
      }
      hash = mixString(hash, def.name);
      for (const field of Object.keys(def.fields)) {
        const value = values[field];
        if (value === undefined) {
          hash = mix(hash, 0xeeee);
          continue;
        }
        hash = typeof value === 'boolean' ? mix(hash, value ? 1 : 0) : mixNumber(hash, value);
      }
    }
  }
  return hash >>> 0;
}

/** 便于日志与回放对比的十六进制形式。 */
export function hashHex(hash: number): string {
  return (hash >>> 0).toString(16).padStart(8, '0');
}
