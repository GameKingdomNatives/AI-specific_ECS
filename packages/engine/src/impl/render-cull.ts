export interface CameraState {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

export interface ViewBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export const LOGICAL_SIZE = { width: 1920, height: 1080 } as const;

/**
 * 相机可见区域（世界坐标）。与 `pixi-renderer` 的相机变换保持同一口径：
 * fit = min(视口宽/逻辑宽, 视口高/逻辑高)，scale = fit * zoom，
 * 可见半宽 = 视口宽 / (2 * scale)。
 */
export function computeViewBounds(
  camera: CameraState,
  viewport: ViewportSize,
  logical: ViewportSize = LOGICAL_SIZE,
): ViewBounds {
  const width = Math.max(viewport.width, 1);
  const height = Math.max(viewport.height, 1);
  const fit = Math.min(width / logical.width, height / logical.height);
  const scale = Math.max(fit * camera.zoom, 0.0001);
  const halfWidth = width / (2 * scale);
  const halfHeight = height / (2 * scale);
  return {
    minX: camera.x - halfWidth,
    minY: camera.y - halfHeight,
    maxX: camera.x + halfWidth,
    maxY: camera.y + halfHeight,
  };
}

/** 以中心点为锚的 AABB 可见性；margin 用于容纳旋转/描边等溢出。 */
export function isVisible(
  bounds: ViewBounds,
  x: number,
  y: number,
  sx: number,
  sy: number,
  margin = 0,
): boolean {
  const halfX = Math.abs(sx) / 2 + margin;
  const halfY = Math.abs(sy) / 2 + margin;
  return x + halfX >= bounds.minX
    && x - halfX <= bounds.maxX
    && y + halfY >= bounds.minY
    && y - halfY <= bounds.maxY;
}
