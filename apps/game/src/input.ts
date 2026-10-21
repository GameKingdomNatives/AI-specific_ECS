import type { IInput, InputSnapshot } from '@itb/engine/ports';
import type { InputMap } from '@itb/engine/data';
import { resolveActions } from '@itb/engine/data';

export interface BrowserInput extends IInput {
  dispose(): void;
}

export interface BrowserInputOptions {
  /** 把页面坐标换算成世界坐标，保证录制里存的是尺度无关的意图。 */
  readonly toWorld?: (x: number, y: number) => { x: number; y: number };
  /** 键位映射：提供时快照里的 keys 是动作名，未绑定键被丢弃。 */
  readonly map?: InputMap;
}

interface InputState {
  readonly keys: Set<string>;
  readonly buttons: Set<number>;
  pointerX: number;
  pointerY: number;
}

function createHandlers(state: InputState) {
  return {
    onKeyDown: (event: KeyboardEvent): void => {
      state.keys.add(event.code);
    },
    onKeyUp: (event: KeyboardEvent): void => {
      state.keys.delete(event.code);
    },
    onPointerMove: (event: PointerEvent): void => {
      state.pointerX = event.clientX;
      state.pointerY = event.clientY;
    },
    onPointerDown: (event: PointerEvent): void => {
      state.buttons.add(event.button);
    },
    onPointerUp: (event: PointerEvent): void => {
      state.buttons.delete(event.button);
    },
    onBlur: (): void => {
      state.keys.clear();
      state.buttons.clear();
    },
  };
}

type Handlers = ReturnType<typeof createHandlers>;
type Target = HTMLElement;

function attach(target: Target, handlers: Handlers): void {
  window.addEventListener('keydown', handlers.onKeyDown);
  window.addEventListener('keyup', handlers.onKeyUp);
  target.addEventListener('pointermove', handlers.onPointerMove);
  target.addEventListener('pointerdown', handlers.onPointerDown);
  window.addEventListener('pointerup', handlers.onPointerUp);
  window.addEventListener('blur', handlers.onBlur);
}

function detach(target: Target, handlers: Handlers): void {
  window.removeEventListener('keydown', handlers.onKeyDown);
  window.removeEventListener('keyup', handlers.onKeyUp);
  target.removeEventListener('pointermove', handlers.onPointerMove);
  target.removeEventListener('pointerdown', handlers.onPointerDown);
  window.removeEventListener('pointerup', handlers.onPointerUp);
  window.removeEventListener('blur', handlers.onBlur);
}

/**
 * 浏览器输入适配：只做采样，不解释语义。
 * 每个逻辑 tick 取一次快照；键与按钮都排序，保证录制可 diff。
 */
export function createBrowserInput(target: Target, options: BrowserInputOptions = {}): BrowserInput {
  const state: InputState = { keys: new Set(), buttons: new Set(), pointerX: 0, pointerY: 0 };
  const handlers = createHandlers(state);
  attach(target, handlers);
  return {
    sample(tick: number): InputSnapshot {
      const point = options.toWorld !== undefined ? options.toWorld(state.pointerX, state.pointerY) : { x: state.pointerX, y: state.pointerY };
      const rawKeys = [...state.keys].sort();
      const keys = options.map === undefined ? new Set(rawKeys) : resolveActions(options.map, rawKeys);
      return {
        tick,
        keys,
        buttons: new Set([...state.buttons].sort((left, right) => left - right)),
        pointer: point,
      };
    },
    dispose(): void {
      detach(target, handlers);
    },
  };
}
