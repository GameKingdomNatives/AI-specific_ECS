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

export function scheduleActions(scene: Scene | null, apply: Apply): ScheduleActions {
  return {
    add(id, phase) {
      if (scene !== null) apply(addSystem(scene, id, phase));
    },
    remove(id) {
      if (scene !== null) apply(removeSystem(scene, id));
    },
    setPhase(id, phase) {
      if (scene !== null) apply(updateSystemPhase(scene, id, phase));
    },
    setEnabled(id, enabled) {
      if (scene !== null) apply(setSystemEnabled(scene, id, enabled));
    },
    setAfter(id, value) {
      if (scene !== null) apply(setSystemAfter(scene, id, parseAfter(value)));
    },
    setParam(id, key, value) {
      if (scene !== null) apply(setSystemParam(scene, id, key, value));
    },
  };
}
