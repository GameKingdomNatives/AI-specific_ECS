import { CommandBuffer, EventBus, FixedClock, Scheduler, World } from '@itb/engine/core';
import { FALLBACK_BOXES, loadContent } from '@itb/engine/data';
import { hashHex, Recorder, serialize, worldHash } from '@itb/engine/determinism';
import { Box, createMovementSystem, Position, spawnBoxes } from '@itb/engine/demo';
import { createPixiRenderer } from '@itb/engine/impl';
import type { RenderItem } from '@itb/engine/ports';
import { createBrowserInput } from './input.js';

const WIDTH = 1920;
const HEIGHT = 1080;
const STEP_MS = 1000 / 60;
const PLAYER_SPEED = 10;

const canvas = document.getElementById('stage');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('缺少 #stage 画布');
}
const hud = document.getElementById('hud');

const world = new World();
const bus = new EventBus();
const commands = new CommandBuffer();
const scheduler = new Scheduler();
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

scheduler.add(createMovementSystem(WIDTH, HEIGHT));
scheduler.add({
  name: 'demo.player',
  phase: 'ai',
  reads: [Position],
  writes: [Position],
  update: (ctx) => {
    const position = ctx.world.get(player, Position);
    if (position === undefined) {
      return;
    }
    const dx = current.pointer.x - position.x;
    const dy = current.pointer.y - position.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 4) {
      return;
    }
    ctx.world.set(player, Position, {
      x: position.x + (dx / distance) * PLAYER_SPEED,
      y: position.y + (dy / distance) * PLAYER_SPEED,
    });
  },
});
scheduler.build();

const content = await loadContent('/content/demo.boxes.json');
const spec = content.ok && content.value !== null ? content.value.boxes : FALLBACK_BOXES;
spawnBoxes(world, spec.count, WIDTH, HEIGHT, spec.minSize, spec.maxSize, spec.speed);
const dataStatus = content.ok ? 'data ok' : `data fallback: ${content.issues[0]?.message ?? 'invalid'}`;

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
    const hue = box.tint & 0xffffff;
    items.push({
      id: entity,
      x: position.x,
      y: position.y,
      rot: 0,
      sx: box.size,
      sy: box.size,
      layer: 4,
      shape: 'rect',
      tint: 0xffffff - (hue % 0x333333),
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
    hud.textContent = `tick ${clock.tick} · entities ${world.aliveCount} · keys ${current.keys.size} · rec ${recorder.count} · ${lastHash} · ${dataStatus}`;
  }
  requestAnimationFrame(frame);
}

Object.assign(globalThis, {
  __itb: {
    recording: () => serialize(recorder.toRecording()),
    hash: () => hashHex(worldHash(world, [Position, Box])),
    snapshot: () => current,
    player: () => world.get(player, Position),
  },
});

requestAnimationFrame(frame);
