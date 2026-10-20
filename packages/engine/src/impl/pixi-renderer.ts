import { Application, Container, Graphics } from 'pixi.js';
import type { IRenderer, RenderItem } from '../ports/index.js';

const LAYER_COUNT = 7;
const LOGICAL_WIDTH = 1920;
const LOGICAL_HEIGHT = 1080;

interface View {
  readonly node: Graphics;
  layer: number;
}

export interface PixiRendererOptions {
  /** 截图/取像时开启：让 WebGL 保留绘制缓冲，代价是少量性能。 */
  readonly preserveDrawingBuffer?: boolean;
  /** 调试用：把 Pixi Application 挂到 globalThis.__pixiApp。 */
  readonly debugGlobal?: boolean;
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

function createCamera(layers: Container[]): {
  set: (x: number, y: number, zoom: number) => void;
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
    apply,
  };
}

function shapeFor(item: RenderItem): Graphics {
  const graphic = new Graphics();
  if (item.shape === 'circle') {
    graphic.circle(0, 0, 1).fill(0xffffff);
  } else if (item.shape === 'poly') {
    graphic.poly([-1, 1, 1, 1, 0, -1]).fill(0xffffff);
  } else {
    graphic.rect(-0.5, -0.5, 1, 1).fill(0xffffff);
  }
  return graphic;
}

function layerAt(layers: Container[], index: number): Container {
  return layers[index] ?? (layers[0] as Container);
}

function createViewLayer(layers: Container[]): {
  submit: (items: readonly RenderItem[]) => void;
} {
  const views = new Map<number, View>();
  const sync = (item: RenderItem, seen: Set<number>): void => {
    let view = views.get(item.id);
    if (view === undefined) {
      view = { node: shapeFor(item), layer: item.layer };
      views.set(item.id, view);
      layerAt(layers, item.layer).addChild(view.node);
    }
    if (view.layer !== item.layer) {
      view.node.removeFromParent();
      view.layer = item.layer;
      layerAt(layers, item.layer).addChild(view.node);
    }
    view.node.position.set(item.x, item.y);
    view.node.rotation = item.rot;
    view.node.scale.set(item.sx, item.sy);
    view.node.tint = item.tint;
    view.node.alpha = item.alpha;
    view.node.visible = item.visible;
    seen.add(item.id);
  };
  return {
    submit: (items) => {
      const seen = new Set<number>();
      for (const item of items) {
        sync(item, seen);
      }
      for (const [id, view] of views) {
        if (!seen.has(id)) {
          view.node.destroy();
          views.delete(id);
        }
      }
    },
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

/**
 * Pixi 渲染后端：只消费渲染表，不认识实体与组件。
 * 本轮用逐图元 Graphics 做技术夹具；3000 子弹级别会换成批处理的 Sprite/纹理图集。
 */
export async function createPixiRenderer(
  canvas: HTMLCanvasElement,
  options: PixiRendererOptions = {},
): Promise<IRenderer> {
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
  const viewLayer = createViewLayer(layers);
  const debugDraw = createDebugDraw(layers);
  camera.apply();

  return {
    submit(items: readonly RenderItem[]): void {
      viewLayer.submit(items);
      camera.apply();
    },
    setCamera(x: number, y: number, zoom: number): void {
      camera.set(x, y, zoom);
    },
    debugDraw,
    resize(width: number, height: number): void {
      app.renderer.resize(width, height);
      camera.apply();
    },
    destroy(): void {
      app.destroy(true);
    },
  };
}
