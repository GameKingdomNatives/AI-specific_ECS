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

/** 系统参数元数据：与组件字段分开，允许 string（参数可写枚举/名字）。 */
export type ParamValue = number | boolean | string;
export type ParamKind = 'number' | 'boolean' | 'string';

export interface ParamField {
  readonly key: string;
  readonly label: string;
  readonly kind: ParamKind;
  readonly defaultValue: ParamValue;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}

export interface SystemMeta {
  readonly id: string;
  readonly label: string;
  readonly params: readonly ParamField[];
}

export function coerceParamValue(field: ParamField, raw: ParamValue): ParamValue {
  if (field.kind === 'boolean') return raw === true || raw === 'true';
  if (field.kind === 'string') return String(raw);
  const numeric = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(numeric)) return field.defaultValue;
  const clamped = Math.min(field.max ?? Number.POSITIVE_INFINITY, Math.max(field.min ?? Number.NEGATIVE_INFINITY, numeric));
  return field.step !== undefined && field.step > 0 ? Math.round(clamped / field.step) * field.step : clamped;
}

function validateUnknownKeys(meta: SystemMeta, params: Readonly<Record<string, ParamValue>>, fields: ReadonlyMap<string, ParamField>): string[] {
  return Object.keys(params).filter((key) => !fields.has(key)).map((key) => `${meta.id}.params.${key} 不是已声明参数`);
}

function validateNumberField(meta: SystemMeta, field: ParamField, value: ParamValue): string[] {
  if (typeof value !== 'number' || !Number.isFinite(value)) return [`${meta.id}.params.${field.key} 应为有限数字`];
  const below = field.min !== undefined && value < field.min;
  const above = field.max !== undefined && value > field.max;
  return below || above ? [`${meta.id}.params.${field.key} 超出范围 ${field.min ?? '-∞'}..${field.max ?? '+∞'}`] : [];
}

function validateField(meta: SystemMeta, field: ParamField, value: ParamValue): string[] {
  if (value === undefined) return [];
  if (field.kind === 'boolean') return typeof value === 'boolean' ? [] : [`${meta.id}.params.${field.key} 应为 boolean`];
  if (field.kind === 'string') return typeof value === 'string' ? [] : [`${meta.id}.params.${field.key} 应为 string`];
  return validateNumberField(meta, field, value);
}

/** 校验参数对象：未知 key、类型不符、越界都返回可读消息（空数组=通过）。 */
export function validateSystemParams(meta: SystemMeta, params: Readonly<Record<string, ParamValue>>): string[] {
  const fields = new Map(meta.params.map((field) => [field.key, field]));
  const issues = validateUnknownKeys(meta, params, fields);
  for (const field of meta.params) {
    const value = params[field.key];
    if (value === undefined) continue;
    issues.push(...validateField(meta, field, value));
  }
  return issues;
}
