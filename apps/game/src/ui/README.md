# UI 模块（独立运行说明）

本目录是游戏的 DOM 覆盖层，可**脱离游戏**独立运行与验收（Storybook）。

## 目录

```
src/ui/
  snapshot.ts      UiSnapshot 类型 + 只读 store
  App.tsx          控制条（纯展示，props = snapshot + intents）
  App.stories.tsx  Storybook 故事（3 个状态）
  mount.tsx        createRoot 挂载
  app.css          @import "tailwindcss"
```

## 运行

```bash
# 全仓库根目录
npm run storybook         # http://localhost:6006
npm run storybook:build   # 静态包 → artifacts/storybook-static
npx serve artifacts/storybook-static   # 或用 node tools/serve-static.mjs
```

Storybook 不启动游戏、不加载 Pixi、不需要 Docker 或数据库。

## 依赖边界（门禁强制）

- 允许：`react`、本地类型。
- 禁止：`packages/**`、`apps/game/src/{main,input,content,system-registry,controls}`。
- 违规会被 depcruise 拦截（规则 `ui-no-engine-internals`）。

## 新增组件

1. 在 `src/ui/` 建 `Xxx.tsx`，props 只接受纯数据/回调；
2. 建 `Xxx.stories.tsx`，至少覆盖默认/禁用/错误三个状态；
3. 样式用 Tailwind 工具类，token 见 `docs/ui-final-plan.md` §5；
4. 跑 `node tools/gate.mjs`。

## 设计对接

- 设计稿在 Figma；组件命名与 `App` 的结构对应。
- 验收流程见 `docs/runbooks/05-设计师上手.md`。
