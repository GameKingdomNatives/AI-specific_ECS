import { useEffect, useState } from 'react';
import { parseScene } from '@itb/engine/scene';
import type { Scene } from '@itb/engine/scene';
import {
  addComponent,
  addNode,
  ensureResource,
  moveNode,
  nextNodeId,
  removeNode,
  renameNode,
  setAsset,
  setComponentField,
} from '@itb/engine/scene';
import { COMPONENT_KINDS } from './component-kinds.js';
import { scheduleActions } from './schedule-actions.js';
import type { ScheduleActions } from './schedule-actions.js';

export interface EditorApi {
  readonly scene: Scene | null;
  readonly selected: string | null;
  readonly issue: string | null;
  select(id: string | null): void;
  addChild(): void;
  removeSelected(): void;
  renameSelected(name: string): void;
  moveSelected(parentId: string | null): void;
  setField(component: string, field: string, value: number | boolean): void;
  addComp(component: string): void;
  attach(slot: 'texture' | 'audio', assetName: string): void;
  readonly schedule: ScheduleActions;
}

type Apply = (next: Scene, select?: string | null) => void;

function defaultsFor(component: string): Record<string, number | boolean> {
  const values: Record<string, number | boolean> = {};
  for (const field of COMPONENT_KINDS[component] ?? []) {
    values[field.key] = field.kind === 'boolean' ? false : 0;
  }
  return values;
}

function nodeActions(scene: Scene | null, selected: string | null, apply: Apply, setIssue: (issue: string) => void) {
  return {
    addChild(): void {
      if (scene === null) return;
      apply(addNode(scene, selected, 'node'), nextNodeId(scene));
    },
    removeSelected(): void {
      if (scene === null || selected === null) return;
      const next = removeNode(scene, selected);
      apply(next, next.nodes[0]?.id ?? null);
    },
    renameSelected(name: string): void {
      if (scene !== null && selected !== null) apply(renameNode(scene, selected, name));
    },
    moveSelected(parentId: string | null): void {
      if (scene === null || selected === null) return;
      const moved = moveNode(scene, selected, parentId);
      if (moved.issue !== null) setIssue(moved.issue);
      else apply(moved.scene);
    },
  };
}

function dataActions(scene: Scene | null, selected: string | null, apply: Apply) {
  return {
    setField(component: string, field: string, value: number | boolean): void {
      if (scene !== null && selected !== null) apply(setComponentField(scene, selected, component, field, value));
    },
    addComp(component: string): void {
      if (scene !== null && selected !== null) apply(addComponent(scene, selected, component, defaultsFor(component)));
    },
    attach(slot: 'texture' | 'audio', assetName: string): void {
      if (scene === null || selected === null) return;
      const ensured = ensureResource(scene, assetName);
      apply(setAsset(ensured.scene, selected, slot, ensured.alias));
    },
  };
}

export function useEditor(): EditorApi {
  const [scene, setScene] = useState<Scene | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [issue, setIssue] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/scenes/demo.scene.json')
      .then((response) => response.json())
      .then((raw: unknown) => {
        if (!alive) return;
        const parsed = parseScene(raw);
        if (parsed.ok) {
          setScene(parsed.value);
          setSelected(parsed.value.nodes[0]?.id ?? null);
        } else setIssue(parsed.issues[0]?.message ?? '场景不合法');
      })
      .catch((error: unknown) => { if (alive) setIssue(String(error)); });
    return () => { alive = false; };
  }, []);

  const apply: Apply = (next, select) => {
    const parsed = parseScene(next);
    if (!parsed.ok) {
      setIssue(parsed.issues[0]?.message ?? '场景不合法');
      return;
    }
    setIssue(null);
    setScene(parsed.value);
    if (select !== undefined) setSelected(select);
  };

  return {
    scene,
    selected,
    issue,
    select: setSelected,
    ...nodeActions(scene, selected, apply, setIssue),
    ...dataActions(scene, selected, apply),
    schedule: scheduleActions(scene, apply),
  };
}
