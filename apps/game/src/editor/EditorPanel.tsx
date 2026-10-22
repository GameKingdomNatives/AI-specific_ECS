import { useEffect, useState } from 'react';
import type { AssetEntry } from '@itb/engine/data';
import { AssetBrowser } from './AssetBrowser.js';
import { Inspector } from './Inspector.js';
import { SceneTree } from './SceneTree.js';
import { loadAssetEntries } from './asset-entries.js';
import { useEditor } from './use-editor.js';

export function EditorPanel() {
  const editor = useEditor();
  const [entries, setEntries] = useState<readonly AssetEntry[]>([]);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    void loadAssetEntries().then(setEntries);
  }, []);
  if (!open) return null;
  const node = editor.scene?.nodes.find((entry) => entry.id === editor.selected) ?? null;
  return (
    <aside className="fixed right-3 top-3 bottom-3 z-50 w-[380px] overflow-auto rounded-lg border border-neutral-300 bg-neutral-50/95 p-3 text-xs shadow-xl">
      <header className="flex items-center justify-between border-b border-neutral-200 pb-2">
        <div>
          <strong className="text-sm text-neutral-900">场景编辑器</strong>
          <span className="ml-2 text-[11px] text-neutral-500">{editor.scene?.name ?? '加载中'}</span>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="rounded border border-neutral-300 px-1.5 py-0.5 text-[11px]">收起</button>
      </header>
      {editor.issue !== null ? <p className="mt-2 rounded bg-red-50 px-2 py-1 text-[11px] text-red-700">{editor.issue}</p> : null}
      {editor.scene !== null ? (
        <SceneTree scene={editor.scene} selected={editor.selected} onSelect={editor.select} onAdd={editor.addChild} onRemove={editor.removeSelected} />
      ) : null}
      {editor.scene !== null && node !== null ? (
        <Inspector
          scene={editor.scene}
          node={node}
          onRename={editor.renameSelected}
          onMove={editor.moveSelected}
          onField={editor.setField}
          onAddComp={editor.addComp}
          onAttachAsset={(slot, alias) => {
            if (alias === null) return;
            editor.attach(slot, editor.scene?.resources?.[alias] ?? alias);
          }}
        />
      ) : null}
      <AssetBrowser entries={entries} onAttach={editor.attach} />
      <footer className="mt-3 border-t border-neutral-200 pt-2 text-[10px] text-neutral-400">内存编辑 · 保存接口在 S5 接入（Vite 插件写回 scenes/*.json）</footer>
    </aside>
  );
}
