# ADR-041 录制的 configHash（§9）

- 状态：已接受
- 日期：2026-10-22
- 相关：`docs/00-最终指令.md` §9、`docs/audits/引擎实际能力与规范偏差审计.md` P1-07

## 背景

规范要求录制包含 `{seed,inputLog,tickCount,configHash}`；当前记录只有 seed/startHash/ticks/events，无法区分「同一 seed 但不同 scene/系统配置」的录制。

## 决策

1. `Recording` 增加可选 `configHash?: string`；`Recorder(seed, startHash?, configHash?)` 保存并在 `toRecording` 输出。
2. `serialize`/`deserialize` 固定键序带上 `configHash`，旧录制无此字段仍可读。
3. 应用 `configHashFor(scene)`（`apps/game/src/runtime-config.ts`）：
   - 对 scene 名、resources、systems、节点 id/parent/assets/组件 key 做 FNV-1a 64?（实现为 32 位 FNV-1a）短哈希；
   - **不含组件值**（组件值是世界状态，不是配置）；
   - 整重建与轻量应用创建 Recorder 时都传入。
4. 不改变 replay 算法/哈希算法，不触碰冻结端口。

## 验收

- 单测：`configHash` 随录制 `toRecording → serialize → deserialize` 往返一致（determinism.test.ts）。
- 旧录制（无 configHash）反序列化不报错。
- 全量门禁 PASS。

## 未完成/边界

- **压缩存储未做**：当前仍是 JSON 文本；先量体积再决定压缩格式（需跨浏览器/Node 可解）。
- `configHash` 只覆盖 scene 配置；端口/构建版本指纹后续可另加字段。
