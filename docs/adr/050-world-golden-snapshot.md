# ADR-050 黄金样例：世界快照

- 状态：已接受
- 日期：2026-10-24
- 相关：`packages/engine/tests/world-golden.test.ts`

## 决策

1. 用**经人工审阅的字面快照**锁定 World 的序列化形状：
   - spawn 0/1、add GoldenPosition、despawn 0；
   - 断言 `nextIndex/liveCount/generations/alive/free/components` 全字段。
2. 第二个黄金样例验证 `snapshot → restore → snapshot` 稳定，且 restore 后组件值可读。
3. 黄金样例不替代属性测试：黄金抓“结构不能漂移”，属性抓“关系不能坏”。

## 验收

- `world-golden.test.js` 2/2 PASS。
- 测试基线 45；`删测试` drill 仍能变红。
- 全量 gate PASS。

## 边界

- 快照包含内部空闲列表/代数；这是有意为之（确定性/回放依赖它）。
- 若改变快照格式，必须同时更新本黄金样例并记录 ADR/评审。
