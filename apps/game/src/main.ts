/// <reference types="vite/client" />
import './ui/app.css';
import { CommandBuffer, EventBus, FixedClock, Scheduler, World, findBudgetBreach, type EntityId, type SystemDef } from '@itb/engine/core';
import type { BoxSpec } from '@itb/engine/data';
import { hashHex, Recorder, serialize, worldHashGroups } from '@itb/engine/determinism';
import { Box, BoxSpawner, Bullet, Position, spawnBoxes } from '@itb/engine/demo';
import { createPixiRenderer } from '@itb/engine/impl';
import { createGameAudio } from './sound.js';
import { createUiIntents } from './ui-intents.js';
import { createRunState } from './validity.js';
import { createDebugView } from './debug-view.js';
import { capturePoses } from './interpolation.js';
import { renderTable } from './render-table.js';
import { loadTextureUrls } from './assets.js';
import { createSchemaGuard } from './hmr-guard.js';
import { createDumpSink } from '@itb/engine/diagnostics';
import { createMemoryLogger } from '@itb/engine/logger';
import { createPhysicsPort, PhysicsWorld } from '@itb/engine/physics';
import { createLocalStorage, createSaveStore } from '@itb/engine/storage';
import { initialContent, watchContent } from './content.js';
import { createControls, type SavePayload } from './controls.js';
import { createBrowserInput } from './input.js';
import { parseInputMap } from '@itb/engine/data';
import inputMapRaw from './data/input-map.json' with { type: 'json' };
import { createSceneSystems } from './system-registry.js';
import { currentSceneFile } from './scene-file.js';
import { currentSceneUrl, instantiateSceneState, loadSceneRuntime } from './scene-runtime.js';
import { tryApplyComponentScene } from './scene-apply.js';
import { pickSystems, resolvePlayer } from './scene-bootstrap.js';
import { validateSceneSystemParams } from './editor/system-meta.js';
import { parseScene, type Scene } from '@itb/engine/scene';
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
const stress = Number(new URLSearchParams(location.search).get('stress') ?? '0');
let world = new World();
const textures = await loadTextureUrls();
const schemaGuard = createSchemaGuard(world);
const bus = new EventBus();
bus.startRecording();
const commands = new CommandBuffer();
const clock = new FixedClock(STEP_MS);
const storage = createLocalStorage('itb:');
const audio = createGameAudio(bus, canvas);
const dumpSink = createDumpSink({ storage, key: 'dumps', max: 20 });
dumpSink.restore();
const logger = createMemoryLogger({ max: 50 });

const inputMapParsed = parseInputMap(inputMapRaw);
const input = createBrowserInput(canvas, {
  toWorld: (x, y) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((x - rect.left) / Math.max(rect.width, 1)) * WIDTH,
      y: ((y - rect.top) / Math.max(rect.height, 1)) * HEIGHT,
    };
  },
  ...(inputMapParsed.value === null ? {} : { map: inputMapParsed.value }),
});

const componentLookup = (name: string) => (name === 'Position' ? Position : name === 'Box' ? Box : name === 'BoxSpawner' ? BoxSpawner : undefined);
let sceneResult: Awaited<ReturnType<typeof loadSceneRuntime>> = await loadSceneRuntime(world, componentLookup);
let player = resolvePlayer(world, sceneResult.loaded, { position: Position, box: Box }, WIDTH, HEIGHT) ?? -1;
let current = input.sample(0);

let scheduler = createScheduler();
let runState = createRunState();

function onSystemError(system: string, error: unknown, tick: number): void {
  const stack = error instanceof Error ? (error.stack ?? '') : '';
  logger.error('system failed', { system, tick, message: String(error) });
  dumpSink.record({ system, tick, message: String(error), stack });
  dumpSink.persist();
  audio.play('error');
}

function createScheduler(): Scheduler {
  return new Scheduler({ maxConsecutiveFailures: 3, onSystemError, enforceWrites: new URLSearchParams(location.search).has('guard') });
}
function applySystems(list: readonly SystemDef[]): void {
  scheduler.dispose();
  scheduler = createScheduler();
  for (const system of list) {
    if (probe === null || system.name === probe) {
      scheduler.add(system);
    }
  }
  scheduler.build();
}
let deps = {
  width: WIDTH,
  height: HEIGHT,
  player,
  getInput: (): typeof current => current,
  physics: createPhysicsPort(new PhysicsWorld()),
};
applySystems(pickSystems(sceneSystems(), sceneResult.loaded));
let kills = 0;
bus.on('demo.hit', () => { kills += 1; renderer.shake(10, 180); });
const initial = initialContent();
let dataStatus = `${initial.ok ? 'data ok' : `data fallback: ${initial.issue ?? 'invalid'}`} · scene ${sceneResult.loaded === null ? 'fallback' : sceneResult.loaded.scene.name} · player ${player < 0 ? 'missing' : 'ok'}`;
function spawnSpec(spec: BoxSpec): EntityId[] {
  const count = probe === null ? (stress > 0 ? stress : spec.count) : Math.min(8, spec.count);
  return spawnBoxes(world, count, WIDTH, HEIGHT, spec.minSize, spec.maxSize, spec.speed);
}
let boxes = sceneResult.loaded !== null ? [] : spawnSpec(initial.spec);
let recorder = new Recorder(20261020, hashHex(worldHashGroups(world, [[Position, Box], [Position, Bullet]])));
function sceneLabel(): string {
  return sceneResult.loaded === null ? 'fallback' : sceneResult.loaded.scene.name;
}
function playerLabel(): string {
  return player < 0 ? 'missing' : 'ok';
}
function depsFor(playerId: number) {
  return { width: WIDTH, height: HEIGHT, player: playerId, getInput: (): typeof current => current, physics: createPhysicsPort(new PhysicsWorld()) };
}
function sceneSystems(): SystemDef[] {
  return createSceneSystems(deps, sceneResult.loaded?.scene ?? null);
}
function rebuild(scene: Scene | null): { ok: boolean; issues: string[] } {
  scheduler.dispose();
  world = new World();
  const state = scene === null ? null : instantiateSceneState(world, scene, componentLookup);
  sceneResult = { loaded: state?.loaded ?? null, issues: state?.issues ?? [] };
  player = resolvePlayer(world, sceneResult.loaded, { position: Position, box: Box }, WIDTH, HEIGHT) ?? -1;
  deps = depsFor(player);
  scheduler = createScheduler();
  applySystems(pickSystems(sceneSystems(), sceneResult.loaded));
  boxes = sceneResult.loaded === null ? spawnSpec(initial.spec) : [];
  runState = createRunState();
  kills = 0;
  const hash = hashHex(worldHashGroups(world, [[Position, Box], [Position, Bullet]]));
  recorder = new Recorder(20261020, hash);
  lastHash = hash;
  dataStatus = `scene ${sceneLabel()} · player ${playerLabel()}`;
  return { ok: sceneResult.loaded !== null && sceneResult.issues.length === 0, issues: sceneResult.issues.map((issue) => issue.message) };
}
let lastAppliedScene = '';
function applySceneDocument(raw: unknown): { ok: boolean; issues: string[] } {
  const parsed = parseScene(raw);
  if (!parsed.ok) return { ok: false, issues: parsed.issues.map((issue) => issue.message) };
  const paramIssues = validateSceneSystemParams(parsed.value);
  if (paramIssues.length > 0) return { ok: false, issues: paramIssues.map((issue) => issue.message) };
  const json = JSON.stringify(parsed.value);
  if (json === lastAppliedScene) return { ok: true, issues: [] };
  const light = sceneResult.loaded === null ? null : tryApplyComponentScene(world, sceneResult.loaded, parsed.value, componentLookup);
  if (light !== null) {
    sceneResult = { loaded: light, issues: [] };
    lastAppliedScene = json;
    lastHash = hashHex(worldHashGroups(world, [[Position, Box], [Position, Bullet]]));
    recorder = new Recorder(20261020, lastHash);
    dataStatus = `scene ${sceneLabel()} · player ${playerLabel()}`;
    return { ok: true, issues: [] };
  }
  lastAppliedScene = json;
  return rebuild(parsed.value);
}
async function reloadSceneLive(): Promise<void> {
  try {
    const raw: unknown = await (await fetch(currentSceneUrl())).json();
    const result = applySceneDocument(raw);
    if (!result.ok) dataStatus = `scene invalid: ${result.issues[0] ?? 'unknown'}`;
  } catch (error) {
    dataStatus = `scene reload failed: ${String(error)}`;
  }
}
globalThis.__itbApplyScene = applySceneDocument;
if (import.meta.hot !== undefined) {
  import.meta.hot.on('itb:scene-changed', (data: unknown) => {
    const file = typeof data === 'object' && data !== null && 'file' in data && typeof data.file === 'string' ? data.file : undefined;
    if (file === undefined || file === currentSceneFile()) void reloadSceneLive();
  });
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
  world: () => world,
  player: () => player,
  clock,
  recorder,
  saveStore,
  dumpSink,
  setNote,
});
mountUi(uiStore, createUiIntents(controls, audio));
watchContent((state) => {
  dataStatus = state.ok ? 'data ok (hot)' : `data fallback: ${state.issue ?? 'invalid'}`;
  if (!state.ok || sceneResult.loaded !== null) return;
  for (const entity of boxes) {
    world.despawn(entity);
  }
  boxes = spawnSpec(state.spec);
});
const captureMode = new URLSearchParams(location.search).has('capture');
const budgetLimit = Number(new URLSearchParams(location.search).get('budget') ?? '2');
const batching = new URLSearchParams(location.search).get('batch') !== '0';
const debugView = createDebugView(new URLSearchParams(location.search).has('debug'));
const renderer = await createPixiRenderer(canvas, { preserveDrawingBuffer: captureMode, debugGlobal: captureMode, batching });
renderer.setCamera(WIDTH / 2, HEIGHT / 2, 1);
let last = performance.now();
let lastHash = hashHex(worldHashGroups(world, [[Position, Box], [Position, Bullet]]));
function updateHud(): void {
  if (hud === null || clock.tick % 10 !== 0) return;
  if (clock.tick % 60 === 0) {
    const breach = findBudgetBreach(scheduler.systemTimings(), budgetLimit);
    if (breach !== null) {
      logger.warn('system over budget', { system: breach.system, p95: breach.p95, limit: breach.limit });
      dumpSink.record({ system: breach.system, tick: clock.tick, message: `p95 ${breach.p95.toFixed(2)}ms > ${breach.limit}ms`, stack: '' });
      dumpSink.persist();
    }
  }
  const mode = probe === null ? 'run' : `probe ${probe}`;
  const bullets = world.query(Position, Bullet).length;
  const bodies = deps.physics.stats().bodies;
  const renderStats = renderer.stats();
  hud.textContent = `${mode} · tick ${clock.tick} · entities ${world.aliveCount} · bullets ${bullets} · kills ${kills} · bodies ${bodies} · vis ${renderStats.submitted}/${renderStats.total} · a ${clock.alpha.toFixed(2)} · sub ${renderStats.submitAvgMs.toFixed(2)}ms · rec ${recorder.count} · err ${dumpSink.list().length} · ${lastHash} · ${dataStatus}`;
  uiStore.update({ tick: clock.tick, entities: world.aliveCount, bullets, kills, bodies, recordingTicks: recorder.count, dumps: dumpSink.list().length, audioPlays: audio.stats().plays, hash: lastHash, dataStatus });
}
function frame(now: number): void {
  const delta = now - last;
  last = now;
  const startTick = clock.tick; const frameStart = capturePoses(world);
  const steps = clock.advance(delta);
  for (let index = 0; index < steps; index += 1) {
    const tick = startTick + index + 1;
    current = input.sample(tick);
    if (runState.valid) recorder.record(tick, current);
    scheduler.run(world, bus, commands, tick);
    if (scheduler.invalid && runState.markInvalid()) {
      recorder.markInvalid();
      logger.error('game invalid', { tick, disabled: scheduler.disabledSystems });
      dumpSink.persist();
    }
  }
  if (clock.tick % 60 === 0) lastHash = hashHex(worldHashGroups(world, [[Position, Box], [Position, Bullet]]));
  renderer.submit(renderTable(world, clock.alpha, frameStart, { player, kills, width: WIDTH, assets: sceneResult.loaded?.assets, url: textures.url }));
  renderer.debugDraw(debugView.enabled ? scheduler.collectDebug(world, bus, commands, clock.tick) : []);
  updateHud();
  requestAnimationFrame(frame);
}
Object.assign(globalThis, {
  __itb: {
    recording: () => {
      recorder.captureEvents(bus.snapshotRecording());
      return serialize(recorder.toRecording());
    },
    hash: () => hashHex(worldHashGroups(world, [[Position, Box], [Position, Bullet]])),
    snapshot: () => current,
    player: () => world.get(player, Position),
    dumps: () => dumpSink.list(),
    logs: () => logger.entries(),
    audio: () => audio.stats(),
    worldSnapshot: () => world.snapshot(),
    restoreWorld: (snapshot: Parameters<typeof world.restore>[0]) => world.restore(snapshot),
    render: () => renderer.stats(),
    setCulling: (enabled: boolean) => renderer.setCulling(enabled),
    camera: (x: number, y: number, zoom: number) => renderer.setCamera(x, y, zoom),
    systems: () => scheduler.orderNames,
    valid: () => runState.valid,
    debugLines: () => scheduler.collectDebug(world, bus, commands, clock.tick),
    shake: (amplitude = 10, durationMs = 180) => renderer.shake(amplitude, durationMs),
    timings: () => scheduler.systemTimings(),
  },
});
if (import.meta.hot !== undefined) {
  import.meta.hot.accept('./system-registry.ts', (module) => {
    if (module !== undefined && schemaGuard()) applySystems(module.createSystems(deps));
  });
}
requestAnimationFrame(frame);