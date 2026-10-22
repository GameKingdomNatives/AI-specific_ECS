import type { Phase } from '@itb/engine/core';
import type { Scene } from '@itb/engine/scene';
import {
  addSystem,
  removeSystem,
  setSystemAfter,
  setSystemEnabled,
  setSystemParam,
  updateSystemPhase,
} from '@itb/engine/scene';
import type { SceneDocRef } from './doc-ref.js';

export interface ScheduleActions {
  add(id: string, phase: Phase): void;
  remove(id: string): void;
  setPhase(id: string, phase: Phase): void;
  setEnabled(id: string, enabled: boolean): void;
  setAfter(id: string, value: string): void;
  setParam(id: string, key: string, value: number | string | boolean | null): void;
}

type Apply = (next: Scene, select?: string | null) => void;

function parseAfter(value: string): string[] {
  return value.split(',').map((entry) => entry.trim()).filter((entry) => entry.length > 0);
}

/** 调度编辑动作：每次从 doc.current 读取最新文档，避免同 tick 连续操作使用旧状态。 */
export function scheduleActions(doc: SceneDocRef, apply: Apply): ScheduleActions {
  const current = (): Scene | null => doc.current;
  return {
    add(id, phase) {
      const scene = current();
      if (scene !== null) apply(addSystem(scene, id, phase));
    },
    remove(id) {
      const scene = current();
      if (scene !== null) apply(removeSystem(scene, id));
    },
    setPhase(id, phase) {
      const scene = current();
      if (scene !== null) apply(updateSystemPhase(scene, id, phase));
    },
    setEnabled(id, enabled) {
      const scene = current();
      if (scene !== null) apply(setSystemEnabled(scene, id, enabled));
    },
    setAfter(id, value) {
      const scene = current();
      if (scene !== null) apply(setSystemAfter(scene, id, parseAfter(value)));
    },
    setParam(id, key, value) {
      const scene = current();
      if (scene !== null) apply(setSystemParam(scene, id, key, value));
    },
  };
}
