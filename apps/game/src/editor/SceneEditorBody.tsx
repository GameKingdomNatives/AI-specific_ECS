import type { AssetEntry } from 'agent-specific_ecs/data';
import type { Scene } from 'agent-specific_ecs/scene';
import { AssetBrowser } from './AssetBrowser.js';
import { Inspector } from './Inspector.js';
import { SceneTree } from './SceneTree.js';

export function SceneEditorBody(props: {
  scene: Scene;
  selected: string | null;
  entries: readonly AssetEntry[];
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: () => void;
  onRename: (name: string) => void;
  onMove: (parentId: string | null) => void;
  onField: (component: string, field: string, value: number | boolean) => void;
  onAddComp: (component: string) => void;
  onAttach: (slot: 'texture' | 'audio', name: string) => void;
}) {
  const node = props.scene.nodes.find((entry) => entry.id === props.selected) ?? null;
  return (
    <>
      <SceneTree scene={props.scene} selected={props.selected} onSelect={props.onSelect} onAdd={props.onAdd} onRemove={props.onRemove} />
      {node !== null ? (
        <Inspector
          scene={props.scene}
          node={node}
          onRename={props.onRename}
          onMove={props.onMove}
          onField={props.onField}
          onAddComp={props.onAddComp}
          onAttachAsset={(slot, alias) => {
            if (alias === null) return;
            props.onAttach(slot, props.scene.resources?.[alias] ?? alias);
          }}
        />
      ) : null}
      <AssetBrowser entries={props.entries} onAttach={props.onAttach} />
    </>
  );
}
