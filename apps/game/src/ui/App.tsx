import type { CSSProperties } from 'react';
import type { UiSnapshot } from './snapshot.js';

export interface UiIntents {
  readonly save: () => void;
  readonly load: () => void;
  readonly clear: () => void;
  readonly exportRecording: () => void;
  readonly exportDumps: () => void;
}

const bar: CSSProperties = {
  position: 'fixed',
  left: 16,
  top: 14,
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  font: '13px/1.4 Consolas, monospace',
  color: '#e8e2d8',
};

const button: CSSProperties = {
  background: '#1c1a18',
  color: '#e8e2d8',
  border: '1px solid #3a352f',
  borderRadius: 6,
  padding: '5px 10px',
  cursor: 'pointer',
};

const note: CSSProperties = { color: '#b7a992', marginLeft: 6 };
const stats: CSSProperties = { color: '#8f8579', marginLeft: 12, fontSize: 12 };

/** 纯展示：只读快照 + 意图回调，不持有引擎对象，也不直接改世界。 */
export function App({ snapshot, intents }: { snapshot: UiSnapshot; intents: UiIntents }) {
  return (
    <div style={bar}>
      <button style={button} onClick={intents.save}>存档</button>
      <button style={button} onClick={intents.load}>读档</button>
      <button style={button} onClick={intents.clear}>清除</button>
      <button style={button} onClick={intents.exportRecording}>导出录制</button>
      <button style={button} onClick={intents.exportDumps}>导出诊断</button>
      <span style={note}>{snapshot.note}</span>
      <span style={stats}>
        tick {snapshot.tick} · 实体 {snapshot.entities} · 弹 {snapshot.bullets} · 击杀 {snapshot.kills} · 刚体 {snapshot.bodies} · 诊断 {snapshot.dumps}
      </span>
    </div>
  );
}
