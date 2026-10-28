/**
 * 复盘面板：把「帧流 + 操作流 + 事件流」按同一条时间轴摆给玩家看。
 *
 * 打开即暂停世界（isOpen() 由主循环读取），于是看的是这一局已经发生过的历史：
 * 拖时间轴、逐帧步进、0.5×–4× 播放，画面与当时的按键、鼠标位置完全对齐。
 * 不重演物理，所以永远不会出现「回放和当时不一样」。
 */

import type { EntityId } from 'agent-specific_ecs/core';
import { drawReplayFrame, drawReplayTimeline } from './replay-draw.js';
import type { ReplayLog } from './replay-host.js';
import type { ReplayInput } from './game/replay-inputs.js';
import { buildReplayDom, formatEvent, formatInput, REPLAY_ACCENT, REPLAY_BORDER, REPLAY_TEXT, type PanelDom } from './replay-panel-dom.js';

export interface ReplayPanel {
  open(): void;
  close(): void;
  toggle(): void;
  /** 面板开着时主循环应暂停世界（历史不再增长，时间轴才稳定）。 */
  isOpen(): boolean;
  destroy(): void;
}

export interface ReplayPanelOptions {
  readonly worldWidth?: number;
  readonly worldHeight?: number;
}

interface PanelState {
  readonly doc: Document;
  readonly log: ReplayLog;
  readonly options: ReplayPanelOptions;
  readonly dom: PanelDom;
  raf: number;
  lastFrame: number;
  pulse: number;
}

function syncSlider(state: PanelState): void {
  const count = state.log.frames.frames;
  state.dom.slider.max = String(Math.max(0, count - 1));
  const index = state.log.cursor.index();
  state.dom.slider.value = String(index < 0 ? 0 : index);
}

function paintSummary(state: PanelState): void {
  const frames = state.log.frames;
  if (frames.frames === 0) {
    state.dom.summary.textContent = '还没有可复盘的画面：开始一局后回来。';
    return;
  }
  const summary = state.log.summary(frames.lastTick);
  state.dom.summary.textContent = '开火 ' + summary.playerShots + ' · 命中 ' + summary.playerHits + ' · 造成 ' + summary.damageDealt + ' · 承受 ' + summary.damageTaken + ' · 击毁 ' + summary.kills + ' · 过载 ' + summary.overloads + ' · 排散 ' + summary.vents;
}

const BUTTON_NAMES: Readonly<Record<number, string>> = { 0: '左键', 1: '中键', 2: '右键' };

/** 这一秒的操作：按键与鼠标按钮，贴在玩家机甲上方。 */
function chipsOf(input: ReplayInput | null): string[] {
  if (input === null) return [];
  const buttons = input.buttons.map((button) => BUTTON_NAMES[button] ?? String(button));
  return [...input.keys, ...buttons];
}

function paintStage(state: PanelState): void {
  const frame = state.log.cursor.frame();
  const ctx = state.dom.stage.getContext('2d');
  if (ctx === null || frame === null) return;
  const player: EntityId = frame.player >= 0 ? frame.player : -1;
  const tick = state.log.cursor.tick;
  const input = state.log.inputAt(tick);
  drawReplayFrame(ctx, frame, {
    worldWidth: state.options.worldWidth ?? 1920,
    worldHeight: state.options.worldHeight ?? 1080,
    player,
    tick,
    events: state.log.events,
    chips: chipsOf(input),
    ...(input === null ? {} : { pointer: { x: input.x, y: input.y } }),
  });
}

function paintTimeline(state: PanelState): void {
  const frames = state.log.frames;
  const ctx = state.dom.timeline.getContext('2d');
  if (ctx === null || frames.frames === 0) return;
  drawReplayTimeline(ctx, { events: state.log.events, firstTick: frames.firstTick, lastTick: frames.lastTick, tick: state.log.cursor.tick });
}

function paintReadout(state: PanelState): void {
  const frames = state.log.frames;
  const cursor = state.log.cursor;
  const next = cursor.playing ? '暂停' : '播放';
  if (state.dom.playLabel.textContent !== next) state.dom.playLabel.textContent = next;
  state.dom.readout.textContent = frames.frames === 0 ? 'tick —' : 'tick ' + cursor.tick + ' / ' + frames.firstTick + '–' + frames.lastTick + ' · 记录 ' + frames.frames + ' 帧 · 事件 ' + state.log.events.length;
  state.dom.inputs.textContent = formatInput(state.log.inputAt(cursor.tick));
}

function paintSpeeds(state: PanelState): void {
  const speed = state.log.cursor.speed;
  for (const node of state.dom.speedButtons) {
    const active = Number(node.dataset.speed) === speed;
    node.style.borderColor = active ? REPLAY_ACCENT : REPLAY_BORDER;
    node.style.color = active ? REPLAY_ACCENT : REPLAY_TEXT;
  }
}

function paintEvents(state: PanelState): void {
  const tick = state.log.cursor.tick;
  const recent = state.log.events.filter((event) => event.tick <= tick).slice(-6).map(formatEvent);
  state.dom.events.textContent = recent.length === 0 ? '（此刻之前还没有战斗事件）' : recent.join(String.fromCharCode(10));
}

function paint(state: PanelState): void {
  paintStage(state);
  paintTimeline(state);
  syncSlider(state);
  paintReadout(state);
  paintSpeeds(state);
  paintEvents(state);
}

function loop(state: PanelState, now: number): void {
  const delta = state.lastFrame === 0 ? 0 : now - state.lastFrame;
  state.lastFrame = now;
  if (state.log.cursor.playing) state.log.cursor.advance(delta);
  paint(state);
  state.pulse += 1;
  if (state.pulse >= 30) {
    state.pulse = 0;
    paintSummary(state);
  }
  state.raf = state.doc.defaultView?.requestAnimationFrame((next) => loop(state, next)) ?? 0;
}

function openPanel(state: PanelState): void {
  if (!state.dom.root.hidden) return;
  state.dom.root.hidden = false;
  const cursor = state.log.cursor;
  cursor.refresh();
  cursor.seek(state.log.frames.lastTick);
  cursor.pause();
  state.lastFrame = 0;
  paintSummary(state);
  paint(state);
  state.raf = state.doc.defaultView?.requestAnimationFrame((now) => loop(state, now)) ?? 0;
}

function closePanel(state: PanelState): void {
  if (state.dom.root.hidden) return;
  state.dom.root.hidden = true;
  state.log.cursor.pause();
  const view = state.doc.defaultView;
  if (view !== null && state.raf !== 0) view.cancelAnimationFrame(state.raf);
  state.raf = 0;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

function handlePlaybackKey(state: PanelState, event: KeyboardEvent): boolean {
  const cursor = state.log.cursor;
  const frames = state.log.frames;
  if (event.key === 'Escape') { closePanel(state); return true; }
  if (event.key === ' ') { event.preventDefault(); cursor.toggle(); paint(state); return true; }
  if (event.key === 'ArrowLeft') { cursor.step(event.shiftKey ? -60 : -1); paint(state); return true; }
  if (event.key === 'ArrowRight') { cursor.step(event.shiftKey ? 60 : 1); paint(state); return true; }
  if (event.key === 'Home') { cursor.seek(frames.firstTick); paint(state); return true; }
  if (event.key === 'End') { cursor.seek(frames.lastTick); paint(state); return true; }
  return false;
}

function handleKey(state: PanelState, event: KeyboardEvent): void {
  if (isTyping(event.target)) return;
  if (event.key === 'r' || event.key === 'R') {
    if (state.dom.root.hidden) openPanel(state);
    else closePanel(state);
    return;
  }
  if (state.dom.root.hidden) return;
  handlePlaybackKey(state, event);
}

function onSlider(state: PanelState): void {
  state.log.cursor.seek(state.log.frames.tickAt(Number(state.dom.slider.value)));
  paint(state);
}

function onTimelineClick(state: PanelState, event: MouseEvent): void {
  const rect = state.dom.timeline.getBoundingClientRect();
  const ratio = rect.width <= 0 ? 0 : Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const frames = state.log.frames;
  state.log.cursor.seek(frames.firstTick + ratio * Math.max(0, frames.lastTick - frames.firstTick));
  paint(state);
}

export function mountReplayPanel(doc: Document, log: ReplayLog, options: ReplayPanelOptions = {}): ReplayPanel {
  const cursor = log.cursor;
  const frames = log.frames;
  const actions: Record<string, () => void> = {
    play: () => cursor.toggle(),
    first: () => { cursor.seek(frames.firstTick); },
    last: () => { cursor.seek(frames.lastTick); },
    prev: () => { cursor.step(-1); },
    next: () => { cursor.step(1); },
  };
  const state: PanelState = { doc, log, options, dom: buildReplayDom(doc, actions, (speed) => cursor.setSpeed(speed)), raf: 0, lastFrame: 0, pulse: 0 };
  state.dom.slider.addEventListener('input', () => onSlider(state));
  state.dom.timeline.addEventListener('click', (event) => onTimelineClick(state, event));
  const keyHandler = (event: KeyboardEvent): void => { handleKey(state, event); };
  doc.addEventListener('keydown', keyHandler);
  return {
    open: () => openPanel(state),
    close: () => closePanel(state),
    toggle: () => { if (state.dom.root.hidden) openPanel(state); else closePanel(state); },
    isOpen: () => !state.dom.root.hidden,
    destroy(): void {
      closePanel(state);
      doc.removeEventListener('keydown', keyHandler);
      state.dom.root.remove();
    },
  };
}
