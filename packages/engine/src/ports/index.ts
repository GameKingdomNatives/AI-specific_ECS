/**
 * 端口契约：引擎对外唯一稳定表面。
 * 本文件只允许纯类型与常量，不得依赖任何实现或第三方库。
 * 修改任一行即触发端口冻结哈希校验，必须走 HARD 审批。
 */

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface InputSnapshot {
  readonly tick: number;
  readonly keys: ReadonlySet<string>;
  readonly pointer: Vec2;
  readonly buttons: ReadonlySet<number>;
}

export type RenderShape = 'rect' | 'circle' | 'poly';

export interface RenderItem {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly rot: number;
  readonly sx: number;
  readonly sy: number;
  readonly layer: number;
  readonly shape: RenderShape;
  readonly tint: number;
  readonly alpha: number;
  readonly visible: boolean;
}

export interface IRenderer {
  submit(items: readonly RenderItem[]): void;
  setCamera(x: number, y: number, zoom: number): void;
  debugDraw(commands: readonly string[]): void;
  resize(width: number, height: number): void;
  destroy(): void;
}

export interface IInput {
  sample(tick: number): InputSnapshot;
}

export interface IAudio {
  play(id: string, volume?: number): void;
  stop(id: string): void;
  setVolume(volume: number): void;
}

export interface ShapeHandle {
  readonly id: number;
}

export interface RayHit {
  readonly entity: number;
  readonly t: number;
}

export interface IPhysics {
  addBody(entity: number, x: number, y: number, radius: number): ShapeHandle;
  removeBody(handle: ShapeHandle): void;
  queryCircle(x: number, y: number, radius: number): number[];
  raycast(x: number, y: number, dx: number, dy: number, maxDistance: number): RayHit | null;
}

export interface IEventBusPort {
  emit(type: string, payload: Record<string, unknown>): void;
  on(type: string, handler: (payload: Record<string, unknown>) => void): () => void;
}

export interface IClock {
  readonly tick: number;
  advance(realMs: number): number;
  setPaused(paused: boolean): void;
  setScale(scale: number): void;
}

export interface IRandom {
  next(): number;
  int(maxExclusive: number): number;
  fork(streamName: string): IRandom;
}

export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface IStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  delete(key: string): void;
  keys(): string[];
}

/** 占位：本轮不实现 mod 加载器，只冻结边界形状。 */
export interface IModHost {
  readonly apiVersion: string;
}

export const PORT_NAMES = [
  'IRenderer',
  'IInput',
  'IAudio',
  'IPhysics',
  'IEventBusPort',
  'IClock',
  'IRandom',
  'ILogger',
  'IStorage',
] as const;
