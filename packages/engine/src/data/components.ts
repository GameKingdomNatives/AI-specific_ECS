import { defineComponent } from '../core/index.js';

/**
 * 标准变换/尺寸组件：引擎自带的最小公共词汇表。
 *
 * 归属理由：位置、速度、包围盒不是「游戏内容」，也不是「测试替身」——
 * 渲染插值、物理桥、场景回放都按同一份定义取数。放在 data 层（纯数据，无副作用），
 * 由 `agent-specific_ecs/data` 导出；夹具与游戏都从这里引用，避免产品依赖测试替身。
 */

/** 世界坐标位置（像素，f64 保精度）。 */
export const Position = defineComponent('Position', { x: 'f64', y: 'f64' });

/** 每 tick 的位移增量（像素/tick）。 */
export const Velocity = defineComponent('Velocity', { x: 'f64', y: 'f64' });

/** 方形外观：尺寸与色调，渲染取包围盒、物理桥建矩形体都用它。 */
export const Box = defineComponent('Box', { size: 'f32', tint: 'u32' });
