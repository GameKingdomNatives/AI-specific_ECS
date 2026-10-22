import { useEffect, useState } from 'react';
import type { AssetEntry } from '@itb/engine/data';
import { SceneEditorBody } from './SceneEditorBody.js';
import { ScheduleEditor } from './ScheduleEditor.js';
import { SaveButton } from './SaveButton.js';
import { loadAssetEntries } from './asset-entries.js';
import { useEditor } from './use-editor.js';

import type { EditorApi } from './use-editor.js';

function EditorBody(props: { tab: 'scene' | 'schedule'; editor: EditorApi; entries: readonly AssetEntry[] }) {
  if (props.editor.scene === null) return null;
  if (props.tab === 'scene') {
    return (
      <SceneEditorBody
        scene={props.editor.scene}
        selected={props.editor.selected}
        entries={props.entries}
        onSelect={props.editor.select}
        onAdd={props.editor.addChild}
        onRemove={props.editor.removeSelected}
        onRename={props.editor.renameSelected}
        onMove={props.editor.moveSelected}
        onField={props.editor.setField}
        onAddComp={props.editor.addComp}
        onAttach={props.editor.attach}
      />
    );
  }
  return <ScheduleEditor scene={props.editor.scene} actions={props.editor.schedule} />;
}

export function EditorPanel() {
  const editor = useEditor();
  const [entries, setEntries] = useState<readonly AssetEntry[]>([]);
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<'scene' | 'schedule'>('scene');
  useEffect(() => {
    void loadAssetEntries().then(setEntries);
  }, []);
  if (!open) return null;
  return (
    <aside className="fixed right-3 top-3 bottom-3 z-50 w-[380px] overflow-auto rounded-lg border border-neutral-300 bg-neutral-50/95 p-3 text-xs shadow-xl">
      <header className="flex items-center justify-between border-b border-neutral-200 pb-2">
        <div>
          <strong className="text-sm text-neutral-900">场景编辑器</strong>
          <span className="ml-2 text-[11px] text-neutral-500">{editor.scene?.name ?? '加载中'}</span>
        </div>
        <div className="flex items-center gap-1">
          <label className="flex items-center gap-1 text-[10px] text-neutral-500" title="编辑时防抖应用到运行时，不写盘">
            <input type="checkbox" checked={editor.preview} onChange={(event) => editor.setPreview(event.target.checked)} />
            实时
          </label>
          <button type="button" onClick={() => editor.applyNow()} className="rounded border border-neutral-300 px-1.5 py-0.5 text-[10px]">应用</button>
          <SaveButton scene={editor.scene} onSaved={editor.reload} />
          <button type="button" onClick={() => setOpen(false)} className="rounded border border-neutral-300 px-1.5 py-0.5 text-[11px]">收起</button>
        </div>
      </header>
      <nav className="mt-2 flex gap-1">
        <button type="button" onClick={() => setTab('scene')} className={`rounded px-2 py-0.5 text-[11px] ${tab === 'scene' ? 'bg-neutral-800 text-white' : 'border border-neutral-300 text-neutral-600'}`}>场景</button>
        <button type="button" onClick={() => setTab('schedule')} className={`rounded px-2 py-0.5 text-[11px] ${tab === 'schedule' ? 'bg-neutral-800 text-white' : 'border border-neutral-300 text-neutral-600'}`}>调度</button>
      </nav>
      {editor.issue !== null ? <p className="mt-2 rounded bg-red-50 px-2 py-1 text-[11px] text-red-700">{editor.issue}</p> : null}
      <EditorBody tab={tab} editor={editor} entries={entries} />
      <footer className="mt-3 border-t border-neutral-200 pt-2 text-[10px] text-neutral-400">内存编辑 · 保存接口在 S5 接入（Vite 插件写回 scenes/*.json）</footer>
    </aside>
  );
}
