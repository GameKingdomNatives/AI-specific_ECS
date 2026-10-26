# ADR-035 编辑器文档引用与同 tick 操作串行（P0）

- 状态：已接受
- 日期：2026-10-22
- 相关：ADR-034、`docs/audits/引擎实际能力与规范偏差审计.md` P0-1

## 背景

编辑器动作（删除、改名、改字段、保存）都从 React 渲染时捕获的 `scene/selected` 闭包计算。同一事件循环内连续操作（例如「删除 → 保存」）时，保存仍读到上一次渲染的文档，导致磁盘/运行时保存旧场景。浏览器实测：删除 target 后立刻保存，文件仍是删除前版本。

## 决策

1. **文档引用 `doc: useRef<Scene|null>` 与选中引用 `selectedRef`**：`apply` 在解析成功后**同步**写入 `doc.current`，再写 React state；`select` 同样先写 ref。
2. **动作读取最新值**：`nodeActions`/`dataActions`/`scheduleActions` 接收 ref，每次调用读取 `doc.current/selected.current`，不再使用渲染闭包。
3. **保存读取最新文档**：`SaveButton` 的 prop 从 `scene` 改为 `getScene()`，同一 tick 删除后立即保存也能拿到删除后的文档。
4. **加载/重载**同时更新 ref 与 state；预览仍走 `usePreview`，保存后直接 `__itbApplyScene` 并用 JSON 去重（ADR-034）。
5. **预览/应用仍是整世界重建**（记录于偏离）；本 ADR 只保证编辑状态一致，不改变重建语义。

## 验收

- 浏览器：选中 target → 同一次 `eval` 内点击「删除」再「保存」→ 文件节点 4→3（root/spawner/player），`__itbScene.nodes=3`，场景树 3，无 issue。
- 常规编辑/保存/预览路径不回归（ADR-034 证据保持）。
- 全量门禁 PASS。

## 后果

- 正面：同 tick 连续操作不再丢改动；保存总是当前文档。
- 代价：ref 与 React state 双写，需保持 `apply/select/reload` 三条路径都同步；后续可引入 reducer 统一。
- 回退：动作改回闭包会重新引入竞态，不建议。
