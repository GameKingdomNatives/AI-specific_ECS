# ADR-048 属性测试：fast-check 4.10.2 + npm 安装绕行

- 状态：已接受
- 日期：2026-10-24
- 相关：`packages/engine/tests/engine-properties.test.ts`、`package.json`

## 背景

`npm view fast-check version` = **4.10.2**（MIT，Node >=12.17，依赖 pure-rand）。直接 `npm install --save-dev fast-check` 在 npm 11.20 / 10.9.4 都报 `Invalid Version:`（arborist `Node.canDedupe`，vite workspace 解析），但包本身可用。

## 决策

1. 用 `npm install --save-dev --workspaces=false --package-lock=false fast-check` 绕开 workspace lock 解析，安装 **fast-check 4.10.2 + pure-rand**；`package.json` 写入 `^4.10.2`。
2. `engine-properties.test.ts` 改用 `fc.assert(fc.property(...))`：
   - 200 个整数毫秒验证 advance 不变量；
   - 100 个步数验证 step 只推进一 tick；
   - 100 组 spawn/despawn 序列验证 World aliveCount 与存活集合一致、句柄不重复；
   - 100 组随机 set 序列验证 CommandBuffer 按登记顺序 flush、最终值等于最后一次 set；
   - 100 组随机事件序列验证 EventBus 同步按订阅顺序、deferred 按入队顺序；
   - 100 组依赖链验证 Scheduler 按 after 顺序执行。
3. **npm `Invalid Version` 已定位并修复**：`package-lock.json` 里有空壳条目（`apps/game/node_modules/vite`、`packages/engine/node_modules/{pixi.js,@pixi/sound,zod}` 只有 `{}`/`dev:true`，没有 version），arborist `canDedupe` 读到空版本。删除这些占位条目后，`npm install --package-lock-only --ignore-scripts --workspaces=false` 成功；**真实 `npm ci` 已重装 315 个包**，随后全量 gate PASS。
4. 原始 LCG 版本作为历史记录保留在 git 历史；不再作为测试实现。

## 验收

- `engine-properties.test.js` 6/6 PASS。
- **真实 `npm ci` PASS：added 315 packages**；随后全量 gate PASS。
- `npm ci --dry-run` PASS（修复前验证用）。
- 测试基线 45；`删测试` drill 仍能变红。
- 全量 gate PASS。

## 边界

- fast-check 只覆盖 `advance/step` 的边界行为，不覆盖全部系统。
- `package-lock.json` 未更新（npm 同一条 Invalid Version）；`npm ci` 前必须补 lock，否则不要在 CI 上假设可复现安装。
- 当前 `node_modules` 已有 fast-check 4.10.2；本地 gate 可跑。
