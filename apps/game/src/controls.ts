import type { EntityId, FixedClock, World } from '@itb/engine/core';
import { Position } from '@itb/engine/demo';
import type { Recorder } from '@itb/engine/determinism';
import { serialize } from '@itb/engine/determinism';
import type { DumpSink } from '@itb/engine/diagnostics';
import type { SaveStore } from '@itb/engine/storage';
import type { UiIntents } from './ui/App.js';

export interface SavePayload {
  readonly tick: number;
  readonly player: { readonly x: number; readonly y: number };
}

export interface ControlsDeps {
  readonly world: World;
  readonly player: EntityId;
  readonly clock: FixedClock;
  readonly recorder: Recorder;
  readonly saveStore: SaveStore<SavePayload>;
  readonly dumpSink: DumpSink;
  readonly setNote: (message: string) => void;
}

function download(name: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function positionOf(world: World, entity: EntityId): { x: number; y: number } {
  const position = world.get(entity, Position);
  return {
    x: typeof position?.x === 'number' ? position.x : 0,
    y: typeof position?.y === 'number' ? position.y : 0,
  };
}

/** 意图实现：存档/读档/导出等副作用集中在这里，React 只负责调用。 */
export function createControls(deps: ControlsDeps): UiIntents {
  return {
    save(): void {
      deps.saveStore.save({ tick: deps.clock.tick, player: positionOf(deps.world, deps.player) });
      deps.setNote(`已存档 @ tick ${deps.clock.tick}`);
    },
    load(): void {
      const outcome = deps.saveStore.load();
      if (!outcome.ok || outcome.payload === null) {
        deps.setNote(`读档失败：${outcome.issue ?? '未知'}`);
        return;
      }
      deps.world.set(deps.player, Position, {
        x: outcome.payload.player.x,
        y: outcome.payload.player.y,
      });
      deps.setNote(`已读档 @ tick ${outcome.payload.tick}`);
    },
    clear(): void {
      deps.saveStore.clear();
      deps.setNote('已清除存档');
    },
    exportRecording(): void {
      download('app-recording.json', serialize(deps.recorder.toRecording()));
      deps.setNote(`已导出录制 ${deps.recorder.count} tick`);
    },
    exportDumps(): void {
      download('dumps.json', deps.dumpSink.toJson());
      deps.setNote(`已导出诊断 ${deps.dumpSink.list().length} 条`);
    },
  };
}
