import type { ComponentMeta } from '@itb/engine/scene';

/** demo 组件的编辑器元数据：标签、字段类型、范围、默认值。 */
export const COMPONENT_META: readonly ComponentMeta[] = [
  {
    name: 'Position',
    label: '位置',
    fields: [
      { key: 'x', label: 'X', kind: 'number', defaultValue: 960, step: 1 },
      { key: 'y', label: 'Y', kind: 'number', defaultValue: 540, step: 1 },
    ],
  },
  {
    name: 'Box',
    label: '方块',
    fields: [
      { key: 'size', label: '尺寸', kind: 'number', defaultValue: 24, min: 1, max: 512, step: 1 },
      { key: 'tint', label: '颜色', kind: 'number', defaultValue: 0xf0f0f0, min: 0, max: 0xffffff, step: 1 },
    ],
  },
  {
    name: 'BoxSpawner',
    label: '环境生成器',
    fields: [
      { key: 'count', label: '数量', kind: 'number', defaultValue: 64, min: 0, max: 2000, step: 1 },
      { key: 'minSize', label: '最小尺寸', kind: 'number', defaultValue: 8, min: 1, max: 512, step: 1 },
      { key: 'maxSize', label: '最大尺寸', kind: 'number', defaultValue: 14, min: 1, max: 512, step: 1 },
      { key: 'speed', label: '速度', kind: 'number', defaultValue: 1, min: 0, max: 100, step: 0.1 },
    ],
  },
];

export const COMPONENT_META_BY_NAME = new Map(COMPONENT_META.map((meta) => [meta.name, meta]));
