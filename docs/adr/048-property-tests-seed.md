# ADR-048 属性测试起步（无外部依赖）

- 状态：已接受
- 日期：2026-10-24
- 相关：`packages/engine/tests/engine-properties.test.ts`

## 背景

计划用 fast-check，但 `npm install --save-dev fast-check` 因 npm arborist `Invalid Version` 失败（vite workspace 解析），没有写入依赖。属性测试不应被一个安装问题阻塞。

## 决策

1. 先用**自带 LCG** 做确定性属性测试：500 个随机 `realMs` 验证 `advance` 不变量；100 次 `step` 验证只推进一个 tick。
2. 断言的是可证明的不变量，不是快照：
   - tick 增量 = 返回步数；
   - 0 ≤ steps ≤ maxStepsPerFrame；
   - alpha ∈ [0,1]（饱和时为 1）。
3. 测试文件仍走 `node:test`，不引入新依赖；未来 fast-check 可用时替换 LCG，保留同一组不变量。

## 验收

- `engine-properties.test.js` 2/2 PASS。
- 测试基线 44；`删测试` drill 仍能变红。
- 全量 gate PASS。

## 边界

- 这是“属性测试起步”，不是完整 fast-check 生成器；失败时不能自动 shrink。
- LCG 种子固定，可复现；覆盖的是 `advance/step` 的边界行为，不覆盖全部系统。
