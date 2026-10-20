/**
 * 端口契约：引擎对外唯一稳定表面。
 * 本文件只允许纯类型与常量，不得依赖任何实现或第三方库。
 * 修改任一行即触发端口冻结哈希校验，必须走 HARD 审批。
 *
 * 物理定位：只做「查询」，不做「求解」。
 * 位置真值永远在 ECS 组件里；物理库不得持有第二份权威状态。
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

/** 物理层：单层用位表示（1<<0, 1<<1 …），查询用掩码组合。 */
export type PhysicsLayer = number;

export interface ShapeFilter {
  /** 允许的层掩码；省略表示全部。 */
  readonly mask?: number;
  /** 排除的实体（例如查询者自己）。 */
  readonly exclude?: readonly number[];
}

export interface PhysicsBodyOptions {
  readonly layer?: PhysicsLayer;
  readonly mask?: number;
  /** 触发器只产生接触，不参与弹出/阻挡（本引擎不做求解，语义仅影响下游系统）。 */
  readonly trigger?: boolean;
}

export interface RayHit {
  readonly entity: number;
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly nx: number;
  readonly ny: number;
}

export interface Contact {
  readonly a: number;
  readonly b: number;
}

export type DebugShapeKind = 'circle' | 'capsule' | 'polygon';

export interface DebugShape {
  readonly entity: number;
  readonly kind: DebugShapeKind;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly radius: number;
  readonly points: readonly number[];
}

export interface PhysicsStats {
  readonly bodies: number;
  readonly cells: number;
  readonly candidates: number;
}

/**
 * 物理端口。所有查询结果按实体 id 升序返回，contacts 按 (a,b) 升序，
 * 保证同一世界状态下查询顺序稳定——这是确定性回放的前提。
 */
export interface IPhysics {
  addCircle(entity: number, x: number, y: number, radius: number, options?: PhysicsBodyOptions): ShapeHandle;
  addBox(
    entity: number,
    x: number,
    y: number,
    halfWidth: number,
    halfHeight: number,
    rotation?: number,
    options?: PhysicsBodyOptions,
  ): ShapeHandle;
  addCapsule(
    entity: number,
    x: number,
    y: number,
    halfLength: number,
    radius: number,
    rotation?: number,
    options?: PhysicsBodyOptions,
  ): ShapeHandle;
  addPolygon(
    entity: number,
    x: number,
    y: number,
    points: readonly number[],
    rotation?: number,
    options?: PhysicsBodyOptions,
  ): ShapeHandle;

  remove(handle: ShapeHandle): boolean;
  removeByEntity(entity: number): number;

  /** 每 tick 同步位置与朝向；beginFrame/endFrame 之间只记脏，帧末统一重建格子。 */
  setTransform(handle: ShapeHandle, x: number, y: number, rotation?: number): void;
  beginFrame(): void;
  endFrame(): void;

  queryCircle(x: number, y: number, radius: number, filter?: ShapeFilter): number[];
  queryAabb(minX: number, minY: number, maxX: number, maxY: number, filter?: ShapeFilter): number[];
  queryCone(
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    halfAngleRadians: number,
    radius: number,
    filter?: ShapeFilter,
  ): number[];
  nearest(x: number, y: number, maxRadius: number, filter?: ShapeFilter): number | null;

  raycast(
    x: number,
    y: number,
    dx: number,
    dy: number,
    maxDistance: number,
    filter?: ShapeFilter,
  ): RayHit | null;
  sweepCircle(
    x: number,
    y: number,
    dx: number,
    dy: number,
    radius: number,
    maxDistance: number,
    filter?: ShapeFilter,
  ): RayHit | null;

  contacts(): Contact[];
  debugShapes(): DebugShape[];
  stats(): PhysicsStats;
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
