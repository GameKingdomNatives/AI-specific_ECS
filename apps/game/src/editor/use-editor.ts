import { useEffect, useRef, useState } from 'react';
import { defaultsFor, parseScene } from 'agent-specific_ecs/scene';
import type { Scene } from 'agent-specific_ecs/scene';
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
} from 'agent-specific_ecs/scene';
import { COMPONENT_META_BY_NAME } from './component-meta.js';
import type { SceneDocRef, SelectionRef } from './doc-ref.js';
import { usePreview } from './use-preview.js';
import type { ApplyResult, PreviewApi } from './use-preview.js';
import { scheduleActions } from './schedule-actions.js';
import type { ScheduleActions } from './schedule-actions.js';
import { validateSceneSystemParams } from './system-meta.js';
import { currentSceneFile, sceneUrl } from '../scene-file.js';

export interface EditorApi {
  readonly scene: Scene | null;
  readonly selected: string | null;
  readonly issue: string | null;
  select(id: string | null): void;
  getScene(): Scene | null;
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
    const raw: unknown = await (await fetch(sceneUrl(currentSceneFile()))).json();
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

function nodeActions(doc: SceneDocRef, selected: SelectionRef, apply: Apply, setIssue: (issue: string) => void) {
  return {
    addChild(): void {
      const scene = doc.current;
      if (scene === null) return;
      apply(addNode(scene, selected.current, 'node'), nextNodeId(scene));
    },
    removeSelected(): void {
      const scene = doc.current;
      if (scene === null || selected.current === null) return;
      const next = removeNode(scene, selected.current);
      apply(next, next.nodes[0]?.id ?? null);
    },
    renameSelected(name: string): void {
      const scene = doc.current;
      if (scene !== null && selected.current !== null) apply(renameNode(scene, selected.current, name));
    },
    moveSelected(parentId: string | null): void {
      const scene = doc.current;
      if (scene === null || selected.current === null) return;
      const moved = moveNode(scene, selected.current, parentId);
      if (moved.issue !== null) setIssue(moved.issue);
      else apply(moved.scene);
    },
  };
}

function dataActions(doc: SceneDocRef, selected: SelectionRef, apply: Apply) {
  return {
    setField(component: string, field: string, value: number | boolean): void {
      const scene = doc.current;
      if (scene !== null && selected.current !== null) apply(setComponentField(scene, selected.current, component, field, value));
    },
    addComp(component: string): void {
      const scene = doc.current;
      if (scene !== null && selected.current !== null) apply(addComponent(scene, selected.current, component, defaultsForComponent(component)));
    },
    attach(slot: 'texture' | 'audio', assetName: string): void {
      const scene = doc.current;
      if (scene === null || selected.current === null) return;
      const ensured = ensureResource(scene, assetName);
      apply(setAsset(ensured.scene, selected.current, slot, ensured.alias));
    },
  };
}

function makeApplyNow(doc: SceneDocRef, previewApi: PreviewApi, setIssue: (issue: string | null) => void) {
  return (): ApplyResult => {
    const result = previewApi.applyNow(doc.current);
    setIssue(result.ok ? null : (result.issues[0] ?? '运行时应用失败'));
    return result;
  };
}

function makeApply(doc: SceneDocRef, selected: SelectionRef, setters: {
  setScene: (scene: Scene) => void;
  setSelected: (id: string | null) => void;
  setIssue: (issue: string | null) => void;
}, previewApi: PreviewApi): Apply {
  return (next, select) => {
    const parsed = parseScene(next);
    if (!parsed.ok) {
      setters.setIssue(parsed.issues[0]?.message ?? '场景不合法');
      return;
    }
    const paramIssues = validateSceneSystemParams(parsed.value);
    if (paramIssues.length > 0) {
      setters.setIssue(paramIssues[0]?.message ?? '系统参数不合法');
      return;
    }
    setters.setIssue(null);
    doc.current = parsed.value;
    setters.setScene(parsed.value);
    if (select !== undefined) {
      selected.current = select;
      setters.setSelected(select);
    }
    previewApi.schedule(parsed.value);
  };
}

function makeReload(doc: SceneDocRef, selected: SelectionRef, setters: {
  setScene: (scene: Scene) => void;
  setSelected: (id: string | null) => void;
  setIssue: (issue: string | null) => void;
}): () => void {
  return () => {
    void loadSceneDoc().then((result) => {
      if (result.scene === null) {
        setters.setIssue(result.issue);
        return;
      }
      setters.setIssue(null);
      doc.current = result.scene;
      selected.current = result.scene.nodes[0]?.id ?? null;
      setters.setScene(result.scene);
      setters.setSelected(selected.current);
    });
  };
}

export function useEditor(): EditorApi {
  const [scene, setScene] = useState<Scene | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const doc = useRef<Scene | null>(null);
  const selectedRef = useRef<string | null>(null);
  const previewApi = usePreview();

  useEffect(() => {
    let alive = true;
    void loadSceneDoc().then((result) => {
      if (!alive) return;
      if (result.scene === null) setIssue(result.issue);
      else {
        doc.current = result.scene;
        selectedRef.current = result.scene.nodes[0]?.id ?? null;
        setScene(result.scene);
        setSelected(selectedRef.current);
      }
    });
    return () => { alive = false; };
  }, []);

  const setters = { setScene, setSelected, setIssue };
  const apply = makeApply(doc, selectedRef, setters, previewApi);
  const select = (id: string | null): void => {
    selectedRef.current = id;
    setSelected(id);
  };
  const reload = makeReload(doc, selectedRef, setters);

  return {
    scene,
    selected,
    issue,
    select,
    getScene: () => doc.current,
    reload,
    preview: previewApi.preview,
    setPreview: previewApi.setPreview,
    applyNow: makeApplyNow(doc, previewApi, setIssue),
    ...nodeActions(doc, selectedRef, apply, setIssue),
    ...dataActions(doc, selectedRef, apply),
    schedule: scheduleActions(doc, apply),
  };
}
