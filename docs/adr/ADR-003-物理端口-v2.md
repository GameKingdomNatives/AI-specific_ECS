# ADR 003 · 物理端口 v2（HARD 变更）

- 日期：2026-10-20
- 状态：已接受（人已批准扩端口，含 capsule）
- 影响：`packages/engine/src/ports/index.ts`、`tools/port-contract.json`

## 背景

v1 的 `IPhysics` 只有 `addBody(entity,x,y,radius)` + `queryCircle` + `raycast`，只够圆形子弹。第二批要做机甲（长条）、护盾（多边形）、命中点法线、防穿透、僚机扇形索敌，v1 装不下。

## 决定

1. 形状扩为：圆、盒（按多边形实现，带旋转）、**胶囊**、凸多边形。
2. 全部查询带 `ShapeFilter`（层掩码 + 排除实体）。
3. `raycast` 返回 `{ entity, t, x, y, nx, ny }`；新增 `sweepCircle`（连续检测）。
4. 新增 `queryAabb` / `queryCone` / `nearest`。
5. 新增 `contacts()`：每帧一份有序重叠对，替代回调。
6. 新增 `debugShapes()` / `stats()`，接调试叠层与性能探针。
7. 帧同步：`beginFrame` / `endFrame` + `setTransform`，帧末统一重建格子。
8. `removeByEntity` 让实体销毁不依赖句柄回传。

## 不做（写入契约注释）

- 刚体求解/关节/受力：会产生第二真值源，直接破坏确定性回放。
- 碰撞回调：改为每帧有序 contacts。
- 旋转动力学：俯视 2D 不需要。

## 兼容性

- 旧 `addBody/removeBody` 已移除，调用方改为 `addCircle/removeByEntity`。
- 旧测试已重写为 10 个用例，覆盖形状、过滤、批处理同步、射线、扫掠、扇形、接触、调试与端口一致性。
- 冻结哈希已通过 `node tools/checks/registry.mjs --accept-ports` 更新。
