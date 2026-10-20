import { CommandBuffer, EventBus, Scheduler, World } from '@itb/engine/core';
import type { RenderItem } from '@itb/engine/ports';
import { Box, createMovementSystem, Position, spawnBoxes } from '@itb/engine/demo';
import { createPixiRenderer } from '@itb/engine/impl';

const WIDTH = 1920;
const HEIGHT = 1080;
const BOXES = 64;
const STEP_MS = 1000 / 60;

const canvas = document.getElementById('stage');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('缺少 #stage 画布');
}
const hud = document.getElementById('hud');

const world = new World();
const bus = new EventBus();
const commands = new CommandBuffer();
const scheduler = new Scheduler();
scheduler.add(createMovementSystem(WIDTH, HEIGHT));
scheduler.build();
spawnBoxes(world, BOXES, WIDTH, HEIGHT);

const captureMode = new URLSearchParams(location.search).has('capture');
const renderer = await createPixiRenderer(canvas, {
  preserveDrawingBuffer: captureMode,
  debugGlobal: captureMode,
});

let tick = 0;
let last = performance.now();
let accumulator = 0;

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
      alpha: 0.9,
      visible: true,
    });
  }
  return items;
}

function frame(now: number): void {
  accumulator += Math.min(now - last, 100);
  last = now;
  while (accumulator >= STEP_MS) {
    scheduler.run(world, bus, commands, tick);
    tick += 1;
    accumulator -= STEP_MS;
  }
  renderer.submit(renderTable());
  if (hud !== null && tick % 10 === 0) {
    hud.textContent = `tick ${tick} · entities ${world.aliveCount}`;
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
