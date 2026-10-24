import type { AssetEntry } from 'agent-specific_ecs/data';

export function AssetBrowser(props: {
  entries: readonly AssetEntry[];
  onAttach: (slot: 'texture' | 'audio', name: string) => void;
}) {
  return (
    <section className="mt-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">资源 · manifest {props.entries.length}</h3>
      <ul className="mt-1.5 max-h-36 overflow-auto rounded border border-neutral-200 bg-white">
        {props.entries.map((entry) => (
          <li key={entry.name} className="flex items-center justify-between gap-2 border-b border-neutral-100 px-2 py-1 last:border-0">
            <span className="min-w-0 truncate text-xs text-neutral-700">
              {entry.name} <span className="text-[10px] text-neutral-400">{entry.file} · {entry.width}×{entry.height}</span>
            </span>
            <span className="flex shrink-0 gap-1">
              <button type="button" onClick={() => props.onAttach('texture', entry.name)} className="rounded border border-neutral-300 px-1 py-0.5 text-[10px]">贴到选中</button>
            </span>
          </li>
        ))}
        {props.entries.length === 0 ? <li className="px-2 py-1 text-xs text-neutral-400">manifest 未加载</li> : null}
      </ul>
    </section>
  );
}
