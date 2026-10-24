/// <reference types="vite/client" />
import raw from './data/demo.boxes.json' with { type: 'json' };
import { FALLBACK_BOXES, parseContent } from 'agent-specific_ecs/data';
import type { BoxSpec } from 'agent-specific_ecs/data';

export interface ContentState {
  readonly ok: boolean;
  readonly spec: BoxSpec;
  readonly issue: string | null;
}

export function toState(input: unknown): ContentState {
  const result = parseContent(input);
  if (result.ok && result.value !== null) {
    return { ok: true, spec: result.value.boxes, issue: null };
  }
  return { ok: false, spec: FALLBACK_BOXES, issue: result.issues[0]?.message ?? 'invalid' };
}

export function initialContent(): ContentState {
  return toState(raw);
}

/**
 * 内容热加载：JSON 模块更新时重新校验。
 * 校验失败不应用新值（回滚到上一版），只把问题抛给调用方展示。
 */
export function watchContent(onChange: (state: ContentState) => void): void {
  if (import.meta.hot !== undefined) {
    import.meta.hot.accept('./data/demo.boxes.json', (module) => {
      onChange(toState((module as { default?: unknown } | undefined)?.default ?? raw));
    });
  }
}
