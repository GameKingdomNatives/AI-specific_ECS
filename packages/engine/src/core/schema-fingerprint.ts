/** 组件定义指纹：HMR 前后比对，schema 变化则整页降级。 */
export interface SchemaLike {
  readonly name: string;
  readonly fields: Readonly<Record<string, string>>;
}

function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function schemaFingerprint(defs: readonly SchemaLike[]): string {
  const parts = defs
    .map((def) => `${def.name}:${Object.keys(def.fields).sort().map((field) => `${field}=${def.fields[field]}`).join(',')}`)
    .sort();
  return fnv1a(parts.join(';'));
}
