# UI 模块（独立运行说明）

本目录是游戏的 DOM 覆盖层，可**脱离游戏**独立运行与验收（Storybook）。

## 目录

```
src/ui/
  snapshot.ts        UiSnapshot 类型 + 只读 store
  types.ts           UiIntents（组件只回调，不持引擎对象）
  App.tsx            页面装配：定位 + ControlBar
  App.stories.tsx    整页故事（3 个状态）
  ControlBar.tsx     控制条：五个意图按钮 + 状态 + 计数
  Button.tsx         按钮（tone/disabled/hover/focus-visible）
  StatusText.tsx     状态文字（info/muted/error，error 用 role=alert）
  InfoRow.tsx        「名称 + 数值」行（空数组显示「暂无数据」）
  *.stories.tsx      每个组件一组状态故事
  mount.tsx          createRoot 挂载
  app.css            @import "tailwindcss"
  tokens.ts          设计 token 唯一事实源
```

## 运行

```bash
# 全仓库根目录
npm run storybook         # http://localhost:6006
npm run storybook:build   # 静态包 → artifacts/storybook-static
npm run storybook:serve   # http://localhost:7007
```

Storybook 不启动游戏、不加载 Pixi、不需要 Docker 或数据库。

## 依赖边界（门禁强制）

- 允许：`react`、本地类型。
- 禁止：`packages/**`、`apps/game/src/{main,input,content,system-registry,controls}`。
- 违规会被 depcruise 拦截（规则 `ui-no-engine-internals`）。

## 新增组件

1. 在 `src/ui/` 建 `Xxx.tsx`，props 只接受纯数据/回调；
2. 建 `Xxx.stories.tsx`，至少覆盖默认/边界（空或错误）/禁用三个状态；
3. 样式用 Tailwind 工具类，token 见 `docs/ui-final-plan.md` §5；
4. 跑 `node tools/gate.mjs`（含 `storybook` 构建）。

## 设计对接

- 设计稿工具可选（免费版 Figma 即可）；验收以 Storybook 真实渲染为准。
- 验收流程见 `docs/runbooks/05-设计协作上手预案.md`。
