import type { UiSnapshot } from './snapshot.js';
import type { UiIntents } from './types.js';
import { Button } from './Button.js';
import { InfoRow } from './InfoRow.js';
import { StatusText } from './StatusText.js';

export type ControlAction = keyof UiIntents;

export interface ControlBarProps {
  readonly snapshot: UiSnapshot;
  readonly intents: UiIntents;
  /** 按动作禁用按钮；未列出的动作默认可用。 */
  readonly disabled?: Partial<Record<ControlAction, boolean>>;
}

const actions: ReadonlyArray<{ readonly key: ControlAction; readonly label: string }> = [
  { key: 'save', label: '存档' },
  { key: 'load', label: '读档' },
  { key: 'clear', label: '清除' },
  { key: 'exportRecording', label: '导出录制' },
  { key: 'exportDumps', label: '导出诊断' },
];

/** 控制条：五个意图按钮 + 状态一行，计数一行，只读快照。 */
export function ControlBar({ snapshot, intents, disabled = {} }: ControlBarProps) {
  return (
    <div className="flex flex-col gap-1 font-mono text-[13px] text-stone-200">
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <Button
            key={action.key}
            label={action.label}
            onClick={intents[action.key]}
            disabled={disabled[action.key] ?? false}
          />
        ))}
        <StatusText tone={snapshot.note.includes('失败') ? 'error' : 'info'}>{snapshot.note}</StatusText>
      </div>
      <InfoRow
        items={[
          { label: 'tick', value: snapshot.tick },
          { label: '实体', value: snapshot.entities },
          { label: '弹', value: snapshot.bullets },
          { label: '击杀', value: snapshot.kills },
          { label: '刚体', value: snapshot.bodies },
          { label: '诊断', value: snapshot.dumps },
        ]}
      />
    </div>
  );
}
