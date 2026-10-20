/// <reference types="vite/client" />
import { CommandBuffer, EventBus, FixedClock, Scheduler, World } from '@itb/engine/core';
import type { EntityId, SystemDef } from '@itb/engine/core';
import type { BoxSpec } from '@itb/engine/data';
import { hashHex, Recorder, serialize, worldHash } from '@itb/engine/determinism';
import { Box, Position, spawnBoxes } from '@itb/engine/demo';
import { createPixiRenderer } from '@itb/engine/impl';
import type { RenderItem } from '@itb/engine/ports';
import { initialContent, watchContent } from './content.js';
import { createBrowserInput } from './input.js';
import { createSystems } from './system-registry.js';

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
const recorder = new Recorder(20261020);

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

interface Dump {
  readonly system: string;
  readonly tick: number;
  readonly message: string;
  readonly stack: string;
}

const dumps: Dump[] = [];
let scheduler = createScheduler();

function onSystemError(system: string, error: unknown, tick: number): void {
  dumps.push({
    system,
    tick,
    message: String(error),
    stack: error instanceof Error ? (error.stack ?? '') : '',
  });
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

const deps = { width: WIDTH, height: HEIGHT, player, getInput: (): typeof current => current };
applySystems(createSystems(deps));

const initial = initialContent();
let dataStatus = initial.ok ? 'data ok' : `data fallback: ${initial.issue ?? 'invalid'}`;

function spawnSpec(spec: BoxSpec): EntityId[] {
  const count = probe === null ? spec.count : Math.min(8, spec.count);
  return spawnBoxes(world, count, WIDTH, HEIGHT, spec.minSize, spec.maxSize, spec.speed);
}

let boxes = spawnSpec(initial.spec);

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
let lastHash = hashHex(worldHash(world, [Position, Box]));

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
    lastHash = hashHex(worldHash(world, [Position, Box]));
  }
  renderer.submit(renderTable());
  if (hud !== null && clock.tick % 10 === 0) {
    const mode = probe === null ? 'run' : `probe ${probe}`;
    hud.textContent = `${mode} · tick ${clock.tick} · entities ${world.aliveCount} · rec ${recorder.count} · err ${dumps.length} · ${lastHash} · ${dataStatus}`;
  }
  requestAnimationFrame(frame);
}

Object.assign(globalThis, {
  __itb: {
    recording: () => serialize(recorder.toRecording()),
    hash: () => hashHex(worldHash(world, [Position, Box])),
    snapshot: () => current,
    player: () => world.get(player, Position),
    dumps: () => dumps,
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
