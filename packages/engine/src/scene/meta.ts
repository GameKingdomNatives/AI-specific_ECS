/** 编辑器表单元数据：组件字段的类型、范围与默认值，显示层与运行时共享。 */
export type MetaFieldKind = 'number' | 'boolean';

export interface MetaField {
  readonly key: string;
  readonly label: string;
  readonly kind: MetaFieldKind;
  readonly defaultValue: number | boolean;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}

export interface ComponentMeta {
  readonly name: string;
  readonly label: string;
  readonly fields: readonly MetaField[];
}

export function defaultsFor(meta: ComponentMeta): Record<string, number | boolean> {
  const values: Record<string, number | boolean> = {};
  for (const field of meta.fields) {
    values[field.key] = field.defaultValue;
  }
  return values;
}

/** 把 UI 输入收敛为组件列可接受的值：布尔取真值，数字夹到范围并处理非有限值。 */
export function coerceFieldValue(field: MetaField, raw: number | boolean): number | boolean {
  if (field.kind === 'boolean') return raw === true;
  const numeric = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(numeric)) return field.defaultValue;
  const clamped = Math.min(field.max ?? Number.POSITIVE_INFINITY, Math.max(field.min ?? Number.NEGATIVE_INFINITY, numeric));
  return field.step !== undefined && field.step > 0 ? Math.round(clamped / field.step) * field.step : clamped;
}

export function findComponentMeta(metas: readonly ComponentMeta[], name: string): ComponentMeta | undefined {
  return metas.find((meta) => meta.name === name);
}
