import type { ShapeFilter } from '../ports/index.js';
import type { Body } from './geometry.js';

/** 层掩码与排除列表：所有查询共用同一套过滤语义。 */
export function passes(body: Body, filter?: ShapeFilter): boolean {
  if (filter?.mask !== undefined && (body.layer & filter.mask) === 0) {
    return false;
  }
  if (filter?.exclude !== undefined && filter.exclude.includes(body.entity)) {
    return false;
  }
  return true;
}

/** 查询结果按实体升序去重，保证确定性回放时顺序一致。 */
export function uniqueSorted(entities: number[]): number[] {
  return [...new Set(entities)].sort((left, right) => left - right);
}
