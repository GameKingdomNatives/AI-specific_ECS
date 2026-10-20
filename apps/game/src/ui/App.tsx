import type { UiSnapshot } from './snapshot.js';

export interface UiIntents {
  readonly save: () => void;
  readonly load: () => void;
  readonly clear: () => void;
  readonly exportRecording: () => void;
  readonly exportDumps: () => void;
}

const buttonClass =
  'cursor-pointer rounded-md border border-stone-700 bg-stone-900 px-2.5 py-1 text-stone-200 hover:bg-stone-800';

/** 纯展示：只读快照 + 意图回调，不持有引擎对象，也不直接改世界。 */
export function App({ snapshot, intents }: { snapshot: UiSnapshot; intents: UiIntents }) {
  return (
    <div className="fixed left-4 top-3.5 flex items-center gap-2 font-mono text-[13px] text-stone-200">
      <button type="button" className={buttonClass} onClick={intents.save}>存档</button>
      <button type="button" className={buttonClass} onClick={intents.load}>读档</button>
      <button type="button" className={buttonClass} onClick={intents.clear}>清除</button>
      <button type="button" className={buttonClass} onClick={intents.exportRecording}>导出录制</button>
      <button type="button" className={buttonClass} onClick={intents.exportDumps}>导出诊断</button>
      <span className="ml-2 text-stone-400">{snapshot.note}</span>
      <span className="ml-3 text-xs text-stone-500">
        tick {snapshot.tick} · 实体 {snapshot.entities} · 弹 {snapshot.bullets} · 击杀 {snapshot.kills} · 刚体 {snapshot.bodies} · 诊断 {snapshot.dumps}
      </span>
    </div>
  );
}
