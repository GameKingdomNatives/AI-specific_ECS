import { useEffect, useState } from 'react';
import { defaultsFor, parseScene } from '@itb/engine/scene';
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
import { COMPONENT_META_BY_NAME } from './component-meta.js';
import { usePreview } from './use-preview.js';
import type { ApplyResult, PreviewApi } from './use-preview.js';
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
  readonly preview: boolean;
  setPreview(next: boolean): void;
  applyNow(): ApplyResult;
  reload(): void;
}

type Apply = (next: Scene, select?: string | null) => void;

async function loadSceneDoc(): Promise<{ scene: Scene | null; issue: string | null }> {
  try {
    const raw: unknown = await (await fetch('/scenes/demo.scene.json')).json();
    const parsed = parseScene(raw);
    return parsed.ok ? { scene: parsed.value, issue: null } : { scene: null, issue: parsed.issues[0]?.message ?? '场景不合法' };
  } catch (error) {
    return { scene: null, issue: String(error) };
  }
}

function defaultsForComponent(component: string): Record<string, number | boolean> {
  const meta = COMPONENT_META_BY_NAME.get(component);
  return meta === undefined ? {} : defaultsFor(meta);
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
      if (scene !== null && selected !== null) apply(addComponent(scene, selected, component, defaultsForComponent(component)));
    },
    attach(slot: 'texture' | 'audio', assetName: string): void {
      if (scene === null || selected === null) return;
      const ensured = ensureResource(scene, assetName);
      apply(setAsset(ensured.scene, selected, slot, ensured.alias));
    },
  };
}

function makeApplyNow(scene: Scene | null, previewApi: PreviewApi, setIssue: (issue: string | null) => void) {
  return (): ApplyResult => {
    const result = previewApi.applyNow(scene);
    setIssue(result.ok ? null : (result.issues[0] ?? '运行时应用失败'));
    return result;
  };
}

export function useEditor(): EditorApi {
  const [scene, setScene] = useState<Scene | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const previewApi = usePreview();

  useEffect(() => {
    let alive = true;
    void loadSceneDoc().then((result) => {
      if (!alive) return;
      if (result.scene === null) setIssue(result.issue);
      else { setScene(result.scene); setSelected(result.scene.nodes[0]?.id ?? null); }
    });
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
    previewApi.schedule(parsed.value);
    if (select !== undefined) setSelected(select);
  };

  const reload = (): void => {
    void loadSceneDoc().then((result) => {
      if (result.scene === null) setIssue(result.issue);
      else { setIssue(null); setScene(result.scene); setSelected(result.scene.nodes[0]?.id ?? null); }
    });
  };

  return {
    scene,
    selected,
    issue,
    select: setSelected,
    reload,
    preview: previewApi.preview,
    setPreview: previewApi.setPreview,
    applyNow: makeApplyNow(scene, previewApi, setIssue),
    ...nodeActions(scene, selected, apply, setIssue),
    ...dataActions(scene, selected, apply),
    schedule: scheduleActions(scene, apply),
  };
}
