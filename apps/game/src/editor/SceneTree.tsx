import type { Scene, SceneNode } from '@itb/engine/scene';

interface Row {
  readonly node: SceneNode;
  readonly depth: number;
}

function flatten(scene: Scene): Row[] {
  const children = new Map<string | null, SceneNode[]>();
  for (const node of scene.nodes) {
    const parent = node.parentId ?? null;
    const list = children.get(parent) ?? [];
    list.push(node);
    children.set(parent, list);
  }
  const rows: Row[] = [];
  const walk = (parent: string | null, depth: number): void => {
    for (const node of children.get(parent) ?? []) {
      rows.push({ node, depth });
      walk(node.id, depth + 1);
    }
  };
  walk(null, 0);
  for (const node of scene.nodes) {
    if (!rows.some((row) => row.node.id === node.id)) rows.push({ node, depth: 0 });
  }
  return rows;
}

export function SceneTree(props: {
  scene: Scene;
  selected: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <section className="mt-3">
      <header className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        <span>场景树 · {props.scene.nodes.length}</span>
        <span className="flex gap-1">
          <button type="button" onClick={props.onAdd} className="rounded border border-neutral-300 px-1.5 py-0.5 text-[11px]">+ 子节点</button>
          <button type="button" onClick={props.onRemove} className="rounded border border-red-300 px-1.5 py-0.5 text-[11px] text-red-600">删除</button>
        </span>
      </header>
      <ul className="mt-1.5 max-h-48 overflow-auto rounded border border-neutral-200 bg-white">
        {flatten(props.scene).map(({ node, depth }) => (
          <li key={node.id}>
            <button
              type="button"
              onClick={() => props.onSelect(node.id)}
              style={{ paddingLeft: 8 + depth * 14 }}
              className={`block w-full py-1 text-left text-xs ${node.id === props.selected ? 'bg-amber-100 text-neutral-900' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              {node.name} <span className="text-[10px] text-neutral-400">{node.id}</span>
              {node.assets?.texture !== undefined ? <span className="ml-1 text-[10px] text-emerald-700">贴图</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
