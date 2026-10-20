# 交接清单

> 每轮收尾更新。新会话先读本节，再读 `docs/00-最终指令.md`。

## 当前状态（2026-10-20 · 第二批进行中）

- 第一批已完成并提交：ECS 内核、九端口、事件总线、门禁（含诊断定位）、治理面板、AGENTS.md。
- 第二批已落地：Pixi 渲染后端（`IRenderer` 实现，渲染表 diff、七图层、相机、逻辑分辨率 1920×1080）、浏览器入口（ESM + Vite）、固定步长循环（60Hz + 累加器）、HUD。
- 实测证据：`?capture=1` 下 `extract` 读出 1016 个亮像素，HUD `tick 110 · entities 64`；导出图 `artifacts/panel/fixture-opaque.png`。
- 门禁新增 `build` 步骤（Vite 构建），全量 12 项 PASS。
- 工具链更正：Vite 8 可用（rolldown 无子进程），见 ADR-001「更正」节。

## 本批剩余（第二批起不在本轮）

- 渲染：`IRenderer` 的 Pixi 实现 + SoA 渲染表 + 批处理 + 图层/相机。
- 物理：圆／AABB／凸多边形／线段射线 + 网格哈希，接触对回灌。
- 数据层：Zod schema + 加载器 + 热加载 + 失败隔离。
- 确定性：固定步长、输入快照、随机流分流、世界哈希、录制回放、无头运行器。
- 热重载：HMR 边界、dispose/init 契约、熔断、诊断 dump。
- 系统探针页。

## 待人裁定

- 渲染产物如何加载：浏览器直接加载 ESM（需 import map 或构建产物），还是接受一个极简静态服务器？——第二批开工前定。
- 是否恢复 pnpm／Vite（若你会话在沙箱外跑），见 ADR-001。

## 已定决策（2026-10-20）

- UI 层：React + Tailwind 的 DOM 覆盖层；战场留在 Pixi canvas（ADR-002）。
- 可视化编辑：Onlook 自托管开源版，第二批之后接入；引入 Storybook。
- 门禁诊断：必须给到 文件:行:列 + 规则 + 代码片段 + 规则定义位置（`findings.json`，面板「诊断明细」卡）。

## 常用命令

```bash
node tools/status.mjs                     # 状态
node tools/gate.mjs                       # 全量门禁（含 tsc/eslint/测试/边界/构建）
node tools/gate.mjs --fast                # 快速门禁
node tools/panel/collect.mjs              # 刷新面板数据
npx vite --port 5173                      # 应用开发服务器（apps/game）
npx vite preview --port 4173              # 预览构建产物
node tools/review.mjs accept --note "<理由>"
```

## 会话级注意事项

- 沙箱内 `git commit` 会因 sh 无法启动而失败：用 `git commit --no-verify`，随后手动 `node tools/gate.mjs` 补跑；正常终端无需此操作。
- 首次提交属脚手架，需 `ALLOW_PROTECTED=1` 才能过保护路径检查。
- 本机禁管道子进程：任何新脚本都不要用 `execSync` 捕获输出，改用 `spawnSync` + 文件描述符重定向。
