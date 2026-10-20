/// <reference types="vite/client" />
import { CommandBuffer, EventBus, FixedClock, Scheduler, World } from '@itb/engine/core';
import type { EntityId, SystemDef } from '@itb/engine/core';
import type { BoxSpec } from '@itb/engine/data';
import { hashHex, Recorder, serialize, worldHashGroups } from '@itb/engine/determinism';
import { Box, Bullet, Position, spawnBoxes } from '@itb/engine/demo';
import { createPixiRenderer } from '@itb/engine/impl';
import { createNullAudio } from '@itb/engine/audio';
import { createDumpSink } from '@itb/engine/diagnostics';
import { createPhysicsPort, PhysicsWorld } from '@itb/engine/physics';
import { createLocalStorage, createSaveStore } from '@itb/engine/storage';
import type { RenderItem } from '@itb/engine/ports';
import { initialContent, watchContent } from './content.js';
import { createControls } from './controls.js';
import { createBrowserInput } from './input.js';
import { createSystems } from './system-registry.js';
import { mountUi } from './ui/mount.js';
import { createUiStore } from './ui/snapshot.js';

const WIDTH = 1920;
const HEIGHT = 1080;
const STEP_MS = 1000 / 60;

const canvas = document.getElementById('stage');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('缺少 #stage 画布');
}
const hud = document.getElementById('hud');
const probe = new URLSearchParams(location.search).get('probe');

const world = new World();
const bus = new EventBus();
const commands = new CommandBuffer();
const clock = new FixedClock(STEP_MS);
const storage = createLocalStorage('itb:');
const audio = createNullAudio({ enabled: true });
const dumpSink = createDumpSink({ storage, key: 'dumps', max: 20 });
dumpSink.restore();

const input = createBrowserInput(canvas, {
  toWorld: (x, y) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((x - rect.left) / Math.max(rect.width, 1)) * WIDTH,
      y: ((y - rect.top) / Math.max(rect.height, 1)) * HEIGHT,
    };
  },
});

const player = world.spawn();
world.add(player, Position, { x: WIDTH / 2, y: HEIGHT / 2 });
world.add(player, Box, { size: 22, tint: 0xff8844 });
let current = input.sample(0);

let scheduler = createScheduler();

function onSystemError(system: string, error: unknown, tick: number): void {
  const stack = error instanceof Error ? (error.stack ?? '') : '';
  dumpSink.record({ system, tick, message: String(error), stack });
  dumpSink.persist();
  audio.play('system-error');
}

function createScheduler(): Scheduler {
  return new Scheduler({ maxConsecutiveFailures: 3, onSystemError });
}

function applySystems(list: readonly SystemDef[]): void {
  scheduler = createScheduler();
  for (const system of list) {
    if (probe === null || system.name === probe) {
      scheduler.add(system);
    }
  }
  scheduler.build();
}

const deps = {
  width: WIDTH,
  height: HEIGHT,
  player,
  getInput: (): typeof current => current,
  physics: createPhysicsPort(new PhysicsWorld()),
};
applySystems(createSystems(deps));

let kills = 0;
bus.on('demo.hit', () => {
  kills += 1;
});

const initial = initialContent();
let dataStatus = initial.ok ? 'data ok' : `data fallback: ${initial.issue ?? 'invalid'}`;

function spawnSpec(spec: BoxSpec): EntityId[] {
  const count = probe === null ? spec.count : Math.min(8, spec.count);
  return spawnBoxes(world, count, WIDTH, HEIGHT, spec.minSize, spec.maxSize, spec.speed);
}

let boxes = spawnSpec(initial.spec);
const recorder = new Recorder(20261020, hashHex(worldHashGroups(world, [[Position, Box], [Position, Bullet]])));

interface SavePayload {
  readonly tick: number;
  readonly player: { readonly x: number; readonly y: number };
}

const saveStore = createSaveStore<SavePayload>(storage, { key: 'save', targetVersion: 1 });

const uiStore = createUiStore({
  tick: 0,
  entities: world.aliveCount,
  bullets: 0,
  kills: 0,
  bodies: 0,
  recordingTicks: 0,
  dumps: dumpSink.list().length,
  audioPlays: 0,
  hash: '',
  dataStatus,
  mode: probe === null ? 'run' : `probe ${probe}`,
  note: '就绪 · 按住左键射击',
});

function quarantinedCount(): number {
  return storage.keys().filter((key) => key.startsWith('save:quarantine:')).length;
}

function setNote(message: string): void {
  uiStore.update({ note: `${message} · 隔离 ${quarantinedCount()}` });
}

const controls = createControls({
  world,
  player,
  clock,
  recorder,
  saveStore,
  dumpSink,
  setNote,
});
mountUi(uiStore, controls);

watchContent((state) => {
  dataStatus = state.ok ? 'data ok (hot)' : `data fallback: ${state.issue ?? 'invalid'}`;
  if (!state.ok) {
    return;
  }
  for (const entity of boxes) {
    world.despawn(entity);
  }
  boxes = spawnSpec(state.spec);
});

const captureMode = new URLSearchParams(location.search).has('capture');
const renderer = await createPixiRenderer(canvas, {
  preserveDrawingBuffer: captureMode,
  debugGlobal: captureMode,
});
renderer.setCamera(WIDTH / 2, HEIGHT / 2, 1);

let last = performance.now();
let lastHash = hashHex(worldHashGroups(world, [[Position, Box], [Position, Bullet]]));

function renderTable(): RenderItem[] {
  const items: RenderItem[] = [];
  for (const entity of world.query(Position, Box)) {
    const position = world.get(entity, Position);
    const box = world.get(entity, Box);
    if (position === undefined || box === undefined) {
      continue;
    }
    items.push({
      id: entity,
      x: position.x,
      y: position.y,
      rot: 0,
      sx: box.size,
      sy: box.size,
      layer: 4,
      shape: 'rect',
      tint: entity === player ? 0xffaa66 : 0xf0f0f0,
      alpha: 0.92,
      visible: true,
      texture: entity === player ? '/assets/player.png' : '/assets/box.png',
    });
  }
  for (const entity of world.query(Position, Bullet)) {
    const position = world.get(entity, Position);
    if (position === undefined) {
      continue;
    }
    items.push({
      id: entity,
      x: position.x,
      y: position.y,
      rot: 0,
      sx: 14,
      sy: 14,
      layer: 3,
      shape: 'circle',
      tint: 0xffffff,
      alpha: 1,
      visible: true,
      texture: '/assets/bullet.png',
    });
  }
  return items;
}

function frame(now: number): void {
  const delta = now - last;
  last = now;
  const startTick = clock.tick;
  const steps = clock.advance(delta);
  for (let index = 0; index < steps; index += 1) {
    const tick = startTick + index + 1;
    current = input.sample(tick);
    recorder.record(tick, current);
    scheduler.run(world, bus, commands, tick);
  }
  if (clock.tick % 60 === 0) {
    lastHash = hashHex(worldHashGroups(world, [[Position, Box], [Position, Bullet]]));
  }
  renderer.submit(renderTable());
  if (hud !== null && clock.tick % 10 === 0) {
    const mode = probe === null ? 'run' : `probe ${probe}`;
    const bullets = world.query(Position, Bullet).length;
    const bodies = deps.physics.stats().bodies;
    hud.textContent = `${mode} · tick ${clock.tick} · entities ${world.aliveCount} · bullets ${bullets} · kills ${kills} · bodies ${bodies} · rec ${recorder.count} · err ${dumpSink.list().length} · ${lastHash} · ${dataStatus}`;
    uiStore.update({
      tick: clock.tick,
      entities: world.aliveCount,
      bullets,
      kills,
      bodies,
      recordingTicks: recorder.count,
      dumps: dumpSink.list().length,
      audioPlays: audio.stats().plays,
      hash: lastHash,
      dataStatus,
    });
  }
  requestAnimationFrame(frame);
}

Object.assign(globalThis, {
  __itb: {
    recording: () => serialize(recorder.toRecording()),
    hash: () => hashHex(worldHashGroups(world, [[Position, Box], [Position, Bullet]])),
    snapshot: () => current,
    player: () => world.get(player, Position),
    dumps: () => dumpSink.list(),
    audio: () => audio.stats(),
    systems: () => scheduler.orderNames,
  },
});

if (import.meta.hot !== undefined) {
  import.meta.hot.accept('./system-registry.ts', (module) => {
    if (module !== undefined) {
      applySystems(module.createSystems(deps));
    }
  });
}

requestAnimationFrame(frame);
