/**
 * 复盘面板的 DOM 骨架：标题栏 / 画面 / 时间轴条 / 控制条 / 读数字。
 *
 * 纯结构，不含播放逻辑——面板逻辑只拿这里返回的引用去改文本与数值，
 * 于是样式与交互可以各自改而不互相牵动。
 */

import type { BattleEvent } from './game/battle-review.js';
import { REPLAY_SPEEDS } from './game/replay-cursor.js';
import type { ReplayInput } from './game/replay-inputs.js';

export const VIEW_WIDTH = 1100;
export const VIEW_HEIGHT = 619;

export interface PanelDom {
  readonly root: HTMLDivElement;
  readonly stage: HTMLCanvasElement;
  readonly timeline: HTMLCanvasElement;
  readonly slider: HTMLInputElement;
  readonly playLabel: HTMLSpanElement;
  readonly readout: HTMLDivElement;
  readonly summary: HTMLDivElement;
  readonly inputs: HTMLDivElement;
  readonly events: HTMLDivElement;
  readonly speedButtons: HTMLButtonElement[];
}

const COLORS = { bg: '#14110e', border: '#2a2521', text: '#e7e5e4', muted: '#a8a29e', accent: '#fb923c', dim: '#1b1713' } as const;
const MONO = 'ui-monospace, Consolas, monospace';

function el<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, css: string, text = ''): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  node.style.cssText = css;
  if (text !== '') node.textContent = text;
  return node;
}

function button(doc: Document, label: string, onClick: () => void): HTMLButtonElement {
  const css = 'background:' + COLORS.dim + ';color:' + COLORS.text + ';border:1px solid ' + COLORS.border + ';border-radius:6px;padding:4px 10px;font:500 12px ' + MONO + ';cursor:pointer;';
  const node = el(doc, 'button', css, label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

function buildHeader(doc: Document, root: HTMLDivElement): HTMLDivElement {
  const bar = el(doc, 'div', 'display:flex;align-items:center;gap:12px;');
  bar.append(el(doc, 'span', 'color:' + COLORS.accent + ';font:600 13px ' + MONO + ';letter-spacing:0.08em;', '对局复盘'));
  bar.append(el(doc, 'span', 'color:' + COLORS.muted + ';font:12px ' + MONO + ';', 'R 关闭 · 空格 播放/暂停 · ←/→ 逐帧（Shift ×60）'));
  const close = button(doc, '关闭 ×', () => { root.hidden = true; });
  close.style.marginLeft = 'auto';
  bar.append(close);
  return bar;
}

function buildStage(doc: Document): { wrap: HTMLDivElement; stage: HTMLCanvasElement; timeline: HTMLCanvasElement } {
  const wrap = el(doc, 'div', 'display:flex;flex-direction:column;gap:6px;');
  const stage = doc.createElement('canvas');
  stage.width = VIEW_WIDTH;
  stage.height = VIEW_HEIGHT;
  stage.style.cssText = 'width:100%;height:auto;display:block;border:1px solid ' + COLORS.border + ';border-radius:6px;background:#0d0c0b;';
  const timeline = doc.createElement('canvas');
  timeline.width = VIEW_WIDTH;
  timeline.height = 34;
  timeline.style.cssText = 'width:100%;height:34px;display:block;border:1px solid ' + COLORS.border + ';border-radius:4px;cursor:pointer;';
  wrap.append(stage, timeline);
  return { wrap, stage, timeline };
}

function buildControls(doc: Document, actions: Record<string, () => void>, onSpeed: (value: number) => void): { row: HTMLDivElement; slider: HTMLInputElement; playLabel: HTMLSpanElement; speedButtons: HTMLButtonElement[] } {
  const row = el(doc, 'div', 'display:flex;align-items:center;gap:8px;flex-wrap:nowrap;');
  const play = button(doc, '', () => actions.play?.());
  const playLabel = el(doc, 'span', '', '播放');
  play.append(playLabel);
  row.append(button(doc, '⏮', () => actions.first?.()), button(doc, '◀', () => actions.prev?.()), play, button(doc, '▶', () => actions.next?.()), button(doc, '⏭', () => actions.last?.()));
  const speedButtons = REPLAY_SPEEDS.map((speed) => {
    const node = button(doc, speed + '×', () => onSpeed(speed));
    node.dataset.speed = String(speed);
    return node;
  });
  row.append(...speedButtons);
  const slider = doc.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '0';
  slider.step = '1';
  slider.style.cssText = 'flex:1;accent-color:#fb923c;min-width:160px;';
  row.append(slider);
  return { row, slider, playLabel, speedButtons };
}

export function buildReplayDom(doc: Document, actions: Record<string, () => void>, onSpeed: (value: number) => void): PanelDom {
  const css = 'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:60;width:min(1140px,96vw);display:flex;flex-direction:column;gap:8px;padding:12px;background:' + COLORS.bg + ';color:' + COLORS.text + ';border:1px solid ' + COLORS.border + ';border-radius:10px;box-shadow:0 18px 48px rgba(0,0,0,0.55);';
  const root = el(doc, 'div', css);
  root.hidden = true;
  root.dataset.replay = 'panel';
  const stage = buildStage(doc);
  const controls = buildControls(doc, actions, onSpeed);
  const meta = 'color:' + COLORS.muted + ';font:12px ' + MONO + ';';
  const readout = el(doc, 'div', meta + 'display:flex;justify-content:space-between;gap:12px;');
  const summary = el(doc, 'div', meta);
  const inputs = el(doc, 'div', 'color:' + COLORS.accent + ';font:12px ' + MONO + ';min-height:16px;');
  const events = el(doc, 'div', meta + 'height:84px;overflow:hidden;white-space:pre;line-height:1.45;border-top:1px solid ' + COLORS.border + ';padding-top:6px;');
  root.append(buildHeader(doc, root), stage.wrap, controls.row, readout, summary, inputs, events);
  doc.body.append(root);
  return { root, stage: stage.stage, timeline: stage.timeline, slider: controls.slider, playLabel: controls.playLabel, readout, summary, inputs, events, speedButtons: controls.speedButtons };
}

export function formatEvent(event: BattleEvent): string {
  const mark = String(event.tick).padStart(6, ' ') + '  ' + event.kind.padEnd(8, ' ');
  const damage = event.damage === undefined ? '' : ' -' + event.damage;
  const slot = event.slot === undefined ? '' : ' 槽' + event.slot;
  const shield = event.shielded === true ? ' 穿盾' : '';
  return mark + ' e' + event.entity + slot + damage + shield;
}

export function formatInput(input: ReplayInput | null): string {
  if (input === null) return '按键：—（该 tick 还没记录）';
  const keys = input.keys.length === 0 ? '—' : input.keys.join('+');
  const buttons = input.buttons.length === 0 ? '—' : input.buttons.join(',');
  return '按键 ' + keys + ' · 鼠标 ' + Math.round(input.x) + ',' + Math.round(input.y) + ' · 按钮 ' + buttons;
}

export const REPLAY_ACCENT = COLORS.accent;
export const REPLAY_BORDER = COLORS.border;
export const REPLAY_TEXT = COLORS.text;
