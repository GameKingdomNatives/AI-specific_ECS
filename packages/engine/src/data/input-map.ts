import { z } from 'zod';

export const inputBindingSchema = z.object({
  name: z.string().min(1),
  keys: z.array(z.string().min(1)).min(1),
});

export const inputMapSchema = z.object({
  $schemaVersion: z.literal(1),
  actions: z.array(inputBindingSchema).min(1),
});

export type InputBinding = z.infer<typeof inputBindingSchema>;
export type InputMap = z.infer<typeof inputMapSchema>;

export interface InputMapResult {
  readonly ok: boolean;
  readonly value: InputMap | null;
  readonly issues: readonly string[];
}

/**
 * 解析按键映射：动作名唯一、键绑定不重复。
 * 只做纯数据校验，不接触 DOM，也不改 InputSnapshot 形状。
 */
export function parseInputMap(raw: unknown): InputMapResult {
  const parsed = inputMapSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      value: null,
      issues: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    };
  }
  const issues: string[] = [];
  const seenNames = new Set<string>();
  const seenKeys = new Set<string>();
  for (const action of parsed.data.actions) {
    if (seenNames.has(action.name)) {
      issues.push(`动作重复：${action.name}`);
    }
    seenNames.add(action.name);
    for (const key of action.keys) {
      if (seenKeys.has(key)) {
        issues.push(`按键重复：${key}`);
      }
      seenKeys.add(key);
    }
  }
  return issues.length === 0
    ? { ok: true, value: parsed.data, issues: [] }
    : { ok: false, value: null, issues };
}

/** 把按下的物理键解析为动作集合；未绑定的键被丢弃。 */
export function resolveActions(map: InputMap, pressed: Iterable<string>): Set<string> {
  const down = new Set(pressed);
  const actions = new Set<string>();
  for (const action of map.actions) {
    if (action.keys.some((key) => down.has(key))) {
      actions.add(action.name);
    }
  }
  return actions;
}
