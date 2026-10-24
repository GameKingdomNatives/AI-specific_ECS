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
   - 100 组随机 set 序列验证 CommandBuffer 按登记顺序 flush、最终值等于最后一次 set。
3. **已知限制**：`package-lock.json` 未随 fast-check 更新（同一条 npm 错误），`npm ci` 前需要人工补 lock 或修 npm 环境；当前本地 `node_modules` 可用。
4. 原始 LCG 版本作为历史记录保留在 git 历史；不再作为测试实现。

## 验收

- `engine-properties.test.js` 4/4 PASS。
- 测试基线 44；`删测试` drill 仍能变红。
- 全量 gate PASS。

## 边界

- fast-check 只覆盖 `advance/step` 的边界行为，不覆盖全部系统。
- `package-lock.json` 未更新（npm 同一条 Invalid Version）；`npm ci` 前必须补 lock，否则不要在 CI 上假设可复现安装。
- 当前 `node_modules` 已有 fast-check 4.10.2；本地 gate 可跑。
