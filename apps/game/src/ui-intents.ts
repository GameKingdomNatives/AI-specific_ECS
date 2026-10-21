import type { UiIntents } from './ui/types.js';

interface AudioLike {
  play(id: string): void;
}

interface Controls {
  save(): void;
  load(): void;
  clear(): void;
  exportRecording(): void;
  exportDumps(): void;
}

/** 给 UI 意图套一层点击音效，不改变控制逻辑本身。 */
export function createUiIntents(controls: Controls, audio: AudioLike): UiIntents {
  return {
    save: () => {
      audio.play('click');
      controls.save();
    },
    load: () => {
      audio.play('click');
      controls.load();
    },
    clear: () => {
      audio.play('click');
      controls.clear();
    },
    exportRecording: () => {
      audio.play('confirm');
      controls.exportRecording();
    },
    exportDumps: () => {
      audio.play('confirm');
      controls.exportDumps();
    },
  };
}
