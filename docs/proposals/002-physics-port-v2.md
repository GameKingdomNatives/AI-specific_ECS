# 物理端口 v2（已落地）

- 日期：2026-10-20
- 状态：**已写入代码**（`packages/engine/src/ports/index.ts`），冻结哈希已更新
- 决策记录：`docs/adr/003-physics-port-v2.md`

## 一句话

物理只做**查询**：形状登记、区域/射线/扫掠查询、每帧接触对；位置真值永远在 ECS 组件里。

## 完整契约（与代码一致）

```ts
export type PhysicsLayer = number;

export interface ShapeFilter {
  readonly mask?: number;
  readonly exclude?: readonly number[];
}

export interface PhysicsBodyOptions {
  readonly layer?: PhysicsLayer;
  readonly mask?: number;
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

export interface IPhysics {
  addCircle(entity: number, x: number, y: number, radius: number, options?: PhysicsBodyOptions): ShapeHandle;
  addBox(entity: number, x: number, y: number, halfWidth: number, halfHeight: number,
         rotation?: number, options?: PhysicsBodyOptions): ShapeHandle;
  addCapsule(entity: number, x: number, y: number, halfLength: number, radius: number,
             rotation?: number, options?: PhysicsBodyOptions): ShapeHandle;
  addPolygon(entity: number, x: number, y: number, points: readonly number[],
             rotation?: number, options?: PhysicsBodyOptions): ShapeHandle;

  remove(handle: ShapeHandle): boolean;
  removeByEntity(entity: number): number;

  setTransform(handle: ShapeHandle, x: number, y: number, rotation?: number): void;
  beginFrame(): void;
  endFrame(): void;

  queryCircle(x: number, y: number, radius: number, filter?: ShapeFilter): number[];
  queryAabb(minX: number, minY: number, maxX: number, maxY: number, filter?: ShapeFilter): number[];
  queryCone(x: number, y: number, dirX: number, dirY: number,
            halfAngleRadians: number, radius: number, filter?: ShapeFilter): number[];
  nearest(x: number, y: number, maxRadius: number, filter?: ShapeFilter): number | null;

  raycast(x: number, y: number, dx: number, dy: number, maxDistance: number,
          filter?: ShapeFilter): RayHit | null;
  sweepCircle(x: number, y: number, dx: number, dy: number, radius: number,
              maxDistance: number, filter?: ShapeFilter): RayHit | null;

  contacts(): Contact[];
  debugShapes(): DebugShape[];
  stats(): PhysicsStats;
}
```

## 语义约定

| 项 | 约定 |
|---|---|
| 坐标 | 世界坐标，与 `Transform` 组件同源 |
| 层 | `1 << n` 的位；查询 `mask` 与之一与即可见；省略 = 全部 |
| 旋转 | 弧度；`addBox`/`addPolygon` 的顶点是**局部坐标**，查询时按 `rotation` 旋转 |
| 确定性 | 查询结果按 entity 升序；`contacts` 按 `(a,b)` 升序；`nearest` 距离相同取小 entity |
| 同步 | 每 tick `beginFrame()` → 逐实体 `setTransform()` → `endFrame()`；帧内只记脏，帧末重建格子 |
| 销毁 | 实体经命令缓冲销毁时调 `removeByEntity(entity)`，不依赖句柄回传 |
| 触发器 | `trigger` 只影响下游语义（是否应结算伤害），查询与接触照常返回 |

## 明确不做

- 刚体求解、受力、关节：会让物理库持有位置真值，破坏确定性；需要时接 matter.js 旁路。
- 碰撞回调：只给每帧有序 `contacts`，由伤害系统走命令缓冲。
- 旋转动力学：俯视 2D，朝向由 AI/输入决定。

## 当前实现文件

| 文件 | 职责 |
|---|---|
| `packages/engine/src/ports/index.ts` | 契约（本文件定义的接口） |
| `packages/engine/src/impl/physics.ts` | `PhysicsWorld`：登记、同步、查询、接触 |
| `packages/engine/src/impl/geometry.ts` | 形状基础运算（点/线段/多边形/包围盒） |
| `packages/engine/src/impl/overlap.ts` | 重叠判定（圆/胶囊/多边形 SAT） |
| `packages/engine/src/impl/raycast.ts` | 射线与扫掠 |
| `packages/engine/src/impl/spatial-grid.ts` | 均匀网格宽相 |
| `packages/engine/src/impl/physics-report.ts` | contacts / debugShapes |
| `packages/engine/src/impl/filters.ts` | 层掩码与结果排序 |

## 如何应用（改动端口后）

```bash
# 1. 改契约（packages/engine/src/ports/index.ts）
# 2. 更新冻结哈希
node tools/checks/registry.mjs --accept-ports
# 3. 补一篇 ADR（docs/adr/）
# 4. 跑全量门禁
node tools/gate.mjs
```

端口哈希变化时门禁会失败并提示 —— 这是**设计如此**：改契约必须显式承认。
