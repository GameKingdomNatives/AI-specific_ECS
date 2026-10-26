# ADR-014 渲染提交耗时读数与基准

- 状态：已接受
- 日期：2026-10-22
- 相关：§13 性能目标、R5 渲染收尾、`tools/submit-bench.mjs`

## 背景

§13 要求「单帧渲染提交 ≤1ms」，但门禁只有剔除基准（`render-bench`，万项 0.45ms），从未测过真正把渲染表转成视图的提交耗时。R5 需要一条可复现的读数，作为是否合批的依据。

## 决策

1. **渲染器内计时**：`createSubmitter` 用 `performance.now()` 包住「剔除判定 + 视图簿记 + 相机应用」，写入 `createFrameStats(60)` 环形窗口；`RenderStats` 增 `submitMs / submitAvgMs / submitP95Ms`，HUD 显示平均值，`__itb.render()` 可读。
2. **Node 侧下限基准**：`tools/submit-bench.mjs` 复刻「剔除 + Map 代际簿记 + 遍历」的 JS 路径，3000 项全可见，9 轮取中位数（2 轮预热），绝对预算 2ms、历史基线容差 2 倍；基线 `tools/submit-bench-baseline.json`（当前 0.432ms），进全量门禁为 `submit-bench` 步骤。
3. **浏览器读数**：`apps/game/?stress=3000` 用技术夹具生成 3000 个方块（不含游戏内容），直接读 `__itb.render()`。
4. **口径边界**：`submitMs` 是 JS 侧耗时，**不含 GPU 绘制与合批**；Node 基准更只是下限。两者一起用：Node 防遍历回归，浏览器看真实趋势。

## 实测（2026-10-22）

| 场景 | 读数 |
|---|---|
| Node 簿记基准（3000 项，全可见） | 中位 **0.432ms**（预算 2ms） |
| 浏览器提交（3001 项，含 Pixi 视图更新） | avg **0.95ms**、p95 **1.4ms**、last 1.3ms；首帧冷启动 14.05ms |

结论：平均值压线达标（≤1ms），**p95 超预算**；3000 个独立 Sprite 的逐项变换仍是主要成本。是否合批由 R5c 原型验证决定，不在本 ADR 预先承诺。

## 后果

- 正面：提交耗时成为可读事实，HUD/调试接口/基准三处一致；合批有基线可比。
- 代价：环形窗口只保留 60 帧；`performance.now()` 精度受浏览器限制（读数取 0.1ms 量级即可）。
- 回退：删除 `submit-bench` 步骤与 `submitMs` 字段不影响渲染。

## 验收

- `node tools/gate.mjs` 含 `submit-bench PASS`；
- HUD 出现 `sub x.xxms`，`__itb.render()` 返回三个 submit 字段；
- `?stress=3000` 下实体 3001、`submitted 3001/3001`。
