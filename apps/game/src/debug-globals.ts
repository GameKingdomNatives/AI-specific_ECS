import type { World } from 'agent-specific_ecs/core';

/** 调试入口：浏览器控制台里用的 __itb，不参与游戏逻辑。 */
export interface DebugSources {
  recording: () => string;
  hash: () => string;
  snapshot: () => unknown;
  player: () => unknown;
  flux: () => unknown;
  hull: () => unknown;
  dumps: () => unknown;
  logs: () => unknown;
  audio: () => unknown;
  worldSnapshot: () => unknown;
  restoreWorld: (snapshot: Parameters<World['restore']>[0]) => unknown;
  render: () => unknown;
  setCulling: (enabled: boolean) => void;
  camera: (x: number, y: number, zoom: number) => void;
  systems: () => readonly string[];
  valid: () => boolean;
  debugLines: () => readonly unknown[];
  shake: (amplitude?: number, durationMs?: number) => void;
  timings: () => unknown;
}

export function installDebugGlobals(sources: DebugSources): void {
  Object.assign(globalThis, {
    __itb: {
      recording: sources.recording,
      hash: sources.hash,
      snapshot: sources.snapshot,
      player: sources.player,
      flux: sources.flux,
      hull: sources.hull,
      dumps: sources.dumps,
      logs: sources.logs,
      audio: sources.audio,
      worldSnapshot: sources.worldSnapshot,
      restoreWorld: sources.restoreWorld,
      render: sources.render,
      setCulling: sources.setCulling,
      camera: sources.camera,
      systems: sources.systems,
      valid: sources.valid,
      debugLines: sources.debugLines,
      shake: sources.shake,
      timings: sources.timings,
    },
  });
}
