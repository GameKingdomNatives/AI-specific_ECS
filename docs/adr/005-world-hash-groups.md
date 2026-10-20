# ADR 005 · 分组世界哈希（附加性 API）

- 日期：2026-10-20
- 状态：已接受
- 影响：`packages/engine/src/determinism/hash.ts`（新增函数，不改既有算法）

## 背景

`worldHash(world, defs)` 的语义是「拥有**全部**给定组件的实体」。加入子弹后，方块有 `Position+Box`、子弹有 `Position+Bullet`，两类实体互斥——用 `[Position, Box, Bullet]` 做哈希会得到空集（FNV 基值 `811c9dc5`），确定性校验形同虚设。

## 决定

新增 `worldHashGroups(world, groups: ComponentDef[][])`：

- 每组内部调用既有 `worldHash`，再按组序混入组长度与组哈希；
- 既有 `worldHash` 算法、字段混合顺序完全不变（旧哈希值不受影响）；
- 使用方：浏览器 `__itb.hash()`、录制 `startHash`、`tools/replay.mjs --app` 统一为
  `[[Position, Box], [Position, Bullet]]`。

## 不做

- 不修改 `worldHash` 语义（那会改变全部历史哈希，属 HARD 且无必要）。
- 不把「分组」做成隐式的：调用方显式写出组，避免两套真相。

## 验证

- `tests/determinism.test.ts` 覆盖：空组等于基值、组序影响结果、子弹变化只影响子弹组。
- 浏览器录制 → 无头重演，哈希一致（见 handoff）。
