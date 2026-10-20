# 交接清单

> 每轮收尾更新。新会话先读本节，再读 `docs/00-最终指令.md`。

## 当前状态（2026-10-20 · 第一批进行中）

- 仓库已初始化（`main`，本地无远端），钩子路径指向 `.githooks/`。
- 门禁已可跑通：`node tools/gate.mjs` → tsc、eslint、自定义校验、4 个测试文件、git 事实、依赖边界全部 PASS。
- 引擎内核已具备：实体（generation 防悬挂）、SparseSet + 列式组件存储、查询、命令缓冲（阶段末 flush）、依赖图调度（环检测 + 同阶段写冲突拒绝）、事件总线（同步/延迟/录制）、九个端口接口。
- 技术夹具：`demo.movement` 让方块在边界内反弹；4 个测试文件 17 个用例。
- 治理面板：`node tools/panel/collect.mjs` 生成 `artifacts/panel/snapshot.js`，双击 `tools/panel/panel.html` 查看；复制命令但不在网页执行。
- 工具链已按环境更正，见 `docs/adr/001-toolchain.md`。

## 本批剩余（第二批起不在本轮）

- 渲染：`IRenderer` 的 Pixi 实现 + SoA 渲染表 + 批处理 + 图层/相机。
- 物理：圆／AABB／凸多边形／线段射线 + 网格哈希，接触对回灌。
- 数据层：Zod schema + 加载器 + 热加载 + 失败隔离。
- 确定性：固定步长、输入快照、随机流分流、世界哈希、录制回放、无头运行器。
- 热重载：HMR 边界、dispose/init 契约、熔断、诊断 dump。
- 系统探针页。

## 待人裁定

- 渲染接入方式：浏览器直接加载 ESM（需 import map 或构建产物），还是接受一个极简静态服务器？——第二批开工前定。
- 是否恢复 pnpm／Vite（若你会话在沙箱外跑），见 ADR-001。

## 常用命令

```bash
node tools/status.mjs          # 状态
node tools/gate.mjs            # 全量门禁
node tools/gate.mjs --fast     # 快速门禁
node tools/panel/collect.mjs   # 刷新面板数据
node tools/review.mjs accept --note "<理由>"
```

## 会话级注意事项

- 沙箱内 `git commit` 会因 sh 无法启动而失败：用 `git commit --no-verify`，随后手动 `node tools/gate.mjs` 补跑；正常终端无需此操作。
- 首次提交属脚手架，需 `ALLOW_PROTECTED=1` 才能过保护路径检查。
- 本机禁管道子进程：任何新脚本都不要用 `execSync` 捕获输出，改用 `spawnSync` + 文件描述符重定向。
