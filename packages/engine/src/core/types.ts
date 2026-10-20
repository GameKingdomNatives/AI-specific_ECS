/**
 * 组件定义与字段类型。
 * 组件只声明「有哪些数值字段」，存储层据此分配列式数组（SoA）。
 * 不接受函数、字符串、对象字段——保持可哈希、可回放、可序列化。
 */

export type EntityId = number;

export type FieldKind = 'f32' | 'f64' | 'i32' | 'u32' | 'bool';

export type FieldMap = Readonly<Record<string, FieldKind>>;

export interface ComponentDef<F extends FieldMap = FieldMap> {
  readonly name: string;
  readonly fields: F;
}

export type Values<F extends FieldMap> = {
  [K in keyof F]: F[K] extends 'bool' ? boolean : number;
};

/** 列级读写用的宽松负载：命令缓冲与存储层内部使用，不对外暴露。 */
export type RowValues = Record<string, number | boolean>;

const NAME_PATTERN = /^[A-Z][A-Za-z0-9]*$/;

export function defineComponent<F extends FieldMap>(name: string, fields: F): ComponentDef<F> {
  if (!NAME_PATTERN.test(name)) {
    throw new Error(`组件名必须是 PascalCase：${name}`);
  }
  if (Object.keys(fields).length === 0) {
    throw new Error(`组件 ${name} 至少需要一个字段`);
  }
  return Object.freeze({ name, fields });
}

export function isBoolField(kind: FieldKind): boolean {
  return kind === 'bool';
}
