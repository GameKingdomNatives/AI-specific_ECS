export interface FieldSpec {
  readonly key: string;
  readonly kind: 'number' | 'boolean';
}

/** 编辑器已知组件字段；未知组件只读展示，避免编辑器猜测组件语义。 */
export const COMPONENT_KINDS: Readonly<Record<string, readonly FieldSpec[]>> = {
  Position: [
    { key: 'x', kind: 'number' },
    { key: 'y', kind: 'number' },
  ],
  Box: [{ key: 'size', kind: 'number' }],
};
