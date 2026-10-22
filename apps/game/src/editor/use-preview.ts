import { useRef, useState } from 'react';
import type { Scene } from '@itb/engine/scene';

export interface ApplyResult {
  readonly ok: boolean;
  readonly issues: readonly string[];
}

export interface PreviewApi {
  readonly preview: boolean;
  setPreview(next: boolean): void;
  /** 用户编辑后防抖应用到运行时（不写盘）。 */
  schedule(scene: Scene): void;
  applyNow(scene: Scene | null): ApplyResult;
}

/** 实时预览：编辑文档防抖 300ms 应用到运行时；可关闭；与保存后的直接应用共用 __itbApplyScene。 */
export function usePreview(): PreviewApi {
  const [preview, setPreviewState] = useState(true);
  const enabled = useRef(true);
  const timer = useRef<number | null>(null);

  const schedule = (scene: Scene): void => {
    if (!enabled.current) return;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      globalThis.__itbApplyScene?.(scene);
    }, 300);
  };

  const setPreview = (next: boolean): void => {
    enabled.current = next;
    if (!next && timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setPreviewState(next);
  };

  const applyNow = (scene: Scene | null): ApplyResult => {
    if (scene === null) return { ok: false, issues: ['场景尚未加载'] };
    return globalThis.__itbApplyScene?.(scene) ?? { ok: false, issues: ['运行时未就绪'] };
  };

  return { preview, setPreview, schedule, applyNow };
}
