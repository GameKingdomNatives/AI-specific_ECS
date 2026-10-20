import { CommandBuffer, EventBus, FixedClock, Scheduler, World } from '@itb/engine/core';
import { FALLBACK_BOXES, loadContent } from '@itb/engine/data';
import type { RenderItem } from '@itb/engine/ports';
import { Box, createMovementSystem, Position, spawnBoxes } from '@itb/engine/demo';
import { createPixiRenderer } from '@itb/engine/impl';

const WIDTH = 1920;
const HEIGHT = 1080;
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
const clock = new FixedClock(STEP_MS);

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
  const delta = now - last;
  last = now;
  const startTick = clock.tick;
  const steps = clock.advance(delta);
  for (let index = 0; index < steps; index += 1) {
    scheduler.run(world, bus, commands, startTick + index + 1);
  }
  renderer.submit(renderTable());
  if (hud !== null && clock.tick % 10 === 0) {
    hud.textContent = `tick ${clock.tick} · entities ${world.aliveCount} · ${dataStatus}`;
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
