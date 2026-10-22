import { useState } from 'react';
import type { Scene } from '@itb/engine/scene';

type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'ok'; bytes: number } | { kind: 'error'; message: string };

export function SaveButton(props: { scene: Scene | null; onSaved?: () => void }) {
  const [state, setState] = useState<SaveState>({ kind: 'idle' });
  const save = (): void => {
    if (props.scene === null) return;
    setState({ kind: 'saving' });
    fetch('/__scene/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ file: 'demo.scene.json', scene: props.scene }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as { ok?: boolean; error?: string; bytes?: number };
        if (response.ok && payload.ok === true) {
          // 保存成功后直接应用到运行时；不依赖 watcher 事件是否到达。
          const applied = globalThis.__itbApplyScene?.(props.scene);
          if (applied !== undefined && !applied.ok) {
            setState({ kind: 'error', message: applied.issues[0] ?? '运行时应用失败' });
            return;
          }
          setState({ kind: 'ok', bytes: payload.bytes ?? 0 });
          props.onSaved?.();
        } else setState({ kind: 'error', message: payload.error ?? `HTTP ${response.status}` });
      })
      .catch((error: unknown) => setState({ kind: 'error', message: String(error) }));
  };
  const label = state.kind === 'saving' ? '保存中…' : state.kind === 'ok' ? '已保存' : state.kind === 'error' ? '保存失败' : '保存';
  return (
    <span className="flex items-center gap-1">
      <button type="button" onClick={save} className={`rounded border px-1.5 py-0.5 text-[11px] ${state.kind === 'error' ? 'border-red-300 text-red-600' : 'border-neutral-300 text-neutral-700'}`}>
        {label}
      </button>
      {state.kind === 'ok' ? <span className="text-[10px] text-emerald-700">{state.bytes}B</span> : null}
      {state.kind === 'error' ? <span className="max-w-24 truncate text-[10px] text-red-600" title={state.message}>{state.message}</span> : null}
    </span>
  );
}
