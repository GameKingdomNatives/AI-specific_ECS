# ADR-039 UI store 接 useSyncExternalStore（P1）

- 状态：已接受
- 日期：2026-10-22
- 相关：`docs/00-最终指令.md` §22.1、`docs/audits/引擎实际能力与规范偏差审计.md` P1-13

## 背景

`mountUi` 之前用 `store.subscribe(render)` + 手动 `root.render(<App snapshot={store.get()} …/>)`：每次引擎降频更新都整体重渲染根，订阅生命周期与 React 脱节，也不符合 §22.1「React 用 useSyncExternalStore 订阅」。

## 决策

1. `ui/mount.tsx` 新增 `UiRoot`：`useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` 读取 `UiStore`。
   - `subscribe` 用 `useCallback` 绑定 store，避免每次渲染重订阅；
   - `getSnapshot = store.get`（返回不可变快照对象，`update` 时替换引用）；
   - 服务端快照同 `get`（离线/无 DOM 环境安全）。
2. `mountUi` 只 `root.render(<UiRoot …/>)` 一次；卸载由 React 统一处理，不再手动 unsubscribe。
3. 引擎侧仍降频 `uiStore.update(patch)`，UI 只读；DOM 不参与逻辑 tick。

## 验收

- 浏览器：HUD tick 从 0 持续更新（观察 700→1810），实体/刚体/rec 同步。
- 点击「清除」→ 面板显示「已清除存档 · 隔离 0」，HUD 继续更新（订阅未断）。
- 全量门禁 PASS（含 Storybook 构建）。

## 边界

- 每次 `update` 都替换快照引用，React 每次通知都重渲染 `App`；当前 10Hz 可接受。若后续高频，可在 store 增加「仅字段变化」选择器。
- `App` 仍接收完整快照，不直接访问 store；UI 不写世界。
