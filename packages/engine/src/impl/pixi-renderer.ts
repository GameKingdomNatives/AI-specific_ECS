import { Application, Container, Graphics } from 'pixi.js';
import type { IRenderer, RenderItem } from '../ports/index.js';
import { createFrameStats } from './frame-stats.js';
import type { FrameTiming } from './frame-stats.js';
import { computeViewBounds, isVisible } from './render-cull.js';
import { createViewLayer } from './pixi-views.js';
import { destroyPools, poolSize } from './view-pool.js';

const LAYER_COUNT = 7;
const LOGICAL_WIDTH = 1920;
const LOGICAL_HEIGHT = 1080;
/** 剔除余量：容纳描边、旋转与贴图透明边。 */
const CULL_MARGIN = 24;

export interface PixiRendererOptions {
  /** 截图/取像时开启：让 WebGL 保留绘制缓冲，代价是少量性能。 */
  readonly preserveDrawingBuffer?: boolean;
  /** 调试用：把 Pixi Application 挂到 globalThis.__pixiApp。 */
  readonly debugGlobal?: boolean;
  /** 带贴图的项走 ParticleContainer 合批；默认关闭（ADR-015）。 */
  readonly batching?: boolean;
}

export interface RenderStats {
  readonly total: number;
  readonly submitted: number;
  readonly culled: number;
  readonly views: number;
  readonly pooled: number;
  /** 最近一次 submit 的耗时（毫秒，JS 侧，不含 GPU 绘制）。 */
  readonly submitMs: number;
  readonly submitAvgMs: number;
  readonly submitP95Ms: number;
  /** 是否启用了合批路径，以及本帧进入 ParticleContainer 的项数。 */
  readonly batching: boolean;
  readonly batched: number;
}

export interface PixiRenderer extends IRenderer {
  stats(): RenderStats;
  setCulling(enabled: boolean): void;
}

function createLayers(app: Application): Container[] {
  const layers: Container[] = [];
  for (let index = 0; index < LAYER_COUNT; index += 1) {
    const layer = new Container();
    layer.sortableChildren = false;
    layers.push(layer);
    app.stage.addChild(layer);
  }
  return layers;
}

function layerAt(layers: Container[], index: number): Container {
  return layers[index] ?? (layers[0] as Container);
}

function createCamera(layers: Container[]): {
  set: (x: number, y: number, zoom: number) => void;
  get: () => { x: number; y: number; zoom: number };
  apply: () => void;
} {
  let camera = { x: 0, y: 0, zoom: 1 };
  const apply = (): void => {
    const fit = Math.min(window.innerWidth / LOGICAL_WIDTH, window.innerHeight / LOGICAL_HEIGHT);
    const scale = fit * camera.zoom;
    for (const layer of layers) {
      layer.scale.set(scale);
      layer.position.set(window.innerWidth / 2 - camera.x * scale, window.innerHeight / 2 - camera.y * scale);
    }
  };
  return {
    set: (x, y, zoom) => {
      camera = { x, y, zoom };
      apply();
    },
    get: () => camera,
    apply,
  };
}

function createDebugDraw(layers: Container[]): (commands: readonly string[]) => void {
  let debug: Graphics | null = null;
  return (commands) => {
    if (debug === null) {
      debug = new Graphics();
      layerAt(layers, LAYER_COUNT - 1).addChild(debug);
    }
    debug.clear();
    for (const command of commands) {
      if (!command.startsWith('line ')) {
        continue;
      }
      const parts = command.slice(5).split(',').map(Number);
      if (parts.length === 4) {
        debug.moveTo(parts[0] as number, parts[1] as number).lineTo(parts[2] as number, parts[3] as number);
      }
    }
    debug.stroke({ width: 1, color: 0xff5a3c, alpha: 0.8 });
  };
}

interface CullingState {
  enabled: boolean;
}

function makeStats(
  total: number,
  submitted: number,
  views: number,
  pooled: number,
  timing: FrameTiming,
  batching: boolean,
  batched: number,
): RenderStats {
  return {
    total,
    submitted,
    culled: total - submitted,
    views,
    pooled,
    submitMs: timing.last,
    submitAvgMs: timing.avg,
    submitP95Ms: timing.p95,
    batching,
    batched,
  };
}

const EMPTY_TIMING: FrameTiming = { last: 0, avg: 0, p95: 0, count: 0 };

/** 剔除 + 统计：只决定提交哪些项，视图销毁由 viewLayer 的 seen 逻辑负责。 */
function createSubmitter(
  viewLayer: ReturnType<typeof createViewLayer>,
  camera: { get: () => { x: number; y: number; zoom: number }; apply: () => void },
  state: CullingState,
  batching: boolean,
): { submit: (items: readonly RenderItem[]) => void; stats: () => RenderStats } {
  const timings = createFrameStats(60);
  let stats: RenderStats = makeStats(0, 0, 0, 0, EMPTY_TIMING, batching, 0);
  const submit = (items: readonly RenderItem[]): void => {
    const started = performance.now();
    let submitted = 0;
    if (!state.enabled || items.length === 0) {
      viewLayer.submit(items);
      submitted = items.length;
    } else {
      const bounds = computeViewBounds(camera.get(), {
        width: window.innerWidth,
        height: window.innerHeight,
      });
      viewLayer.submit(items, (item) => {
        const visible = item.visible && isVisible(bounds, item.x, item.y, item.sx, item.sy, CULL_MARGIN);
        if (visible) {
          submitted += 1;
        }
        return visible;
      });
    }
    camera.apply();
    timings.push(performance.now() - started);
    stats = makeStats(items.length, submitted, viewLayer.size(), poolSize(), timings.get(), batching, viewLayer.batchedSize());
  };
  return { submit, stats: () => stats };
}

/**
 * Pixi 渲染后端：只消费渲染表，不认识实体与组件。
 * 有 texture 用 Sprite，没有就退回几何图形；贴图加载失败同样回退。
 * 剔除只影响提交与可见性，不销毁视图（视野外再回来不会重建）。
 */
export async function createPixiRenderer(
  canvas: HTMLCanvasElement,
  options: PixiRendererOptions = {},
): Promise<PixiRenderer> {
  const app = new Application();
  await app.init({
    canvas,
    background: 0x111111,
    antialias: false,
    resizeTo: window,
    preserveDrawingBuffer: options.preserveDrawingBuffer === true,
  });
  if (options.debugGlobal === true) {
    Object.assign(globalThis, { __pixiApp: app });
  }

  const layers = createLayers(app);
  const camera = createCamera(layers);
  const viewLayer = createViewLayer(layers, { batching: options.batching === true });
  const debugDraw = createDebugDraw(layers);
  const culling: CullingState = { enabled: true };
  const submitter = createSubmitter(viewLayer, camera, culling, options.batching === true);
  camera.apply();

  return {
    submit: submitter.submit,
    setCamera(x: number, y: number, zoom: number): void {
      camera.set(x, y, zoom);
    },
    stats: submitter.stats,
    setCulling(enabled: boolean): void {
      culling.enabled = enabled;
    },
    debugDraw,
    resize(width: number, height: number): void {
      app.renderer.resize(width, height);
      camera.apply();
    },
    destroy(): void {
      destroyPools();
      app.destroy(true);
    },
  };
}
