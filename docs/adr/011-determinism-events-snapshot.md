# ADR-011 确定性事件级重演与世界快照

- 状态：已接受（事件级与快照均已落地，2026-10-21）
- 日期：2026-10-21
- 相关：ADR-005（分组哈希）、`docs/audits/next-direction.md`

## 背景

确定性目前只验证「输入 → 逐 tick 位置哈希」。事件总线已有 `startRecording/stopRecording`，但事件从未进入录制文件、也未参与重演；命中、回收、UI 反馈这类逻辑改坏了，哈希可能不变而事件已错。另外没有世界快照，无法做中途存档/回滚。

## 决策

1. **Recording v2**：`version: 2` 增加可选 `events`（`{tick, type, payload}` 顺序即发生顺序）；v1 保持可解析。空数组表示「明确录制了零事件」。新增 schema 字段属 SOFT，提交信息注明。
2. **录制器**：`Recorder.captureEvents(records)` 附加事件段；浏览器在导出时用 `EventBus.snapshotRecording()` 非破坏性读取。
3. **总线**：新增 `snapshotRecording()` 与 `drainRecording()`；`drain` 供逐 tick 比对使用，录制不中断。
4. **重演**：`ReplayHooks.events?` 取走自上次调用以来产生的事件；`ReplayResult.events` 带出；`firstEventDivergence` 按 tick/type/payload（JSON 口径）定位首个偏离。
5. **工具**：`tools/replay.mjs` 的 `--self-test` 与 `--app` 都比对事件序列；`--app` 在录制带 `events` 时输出 `事件对比 PASS/FAIL（tick N）`。该文件属保护路径，本次修改按 `ALLOW_PROTECTED=1` 执行并记录于本 ADR。
6. **快照（R2b）**：`World.snapshot()/restore()` 覆盖实体代际、空闲表、组件列；`Random.snapshotState()/restoreState()` 单独快照随机流；恢复后哈希一致。实现拆分见 `core/world-state.ts`（列操作与快照）与 `core/world.ts`（store 管理），以守住 300 行文件预算。

## 后果

- 正面：录制可复现「世界怎么变」而不只是「位置是多少」；回归能抓住只改事件不改位置的错误。
- 代价：录制文件变大（事件多时）；payload 必须可 JSON 化（总线契约本就要求纯数据）。
- 兼容：v1 录制仍可回放，只是不比对事件。
- 端口：未变更。

## 验收

- `node tools/replay.mjs --self-test --repeat 3` 输出事件一致 PASS；
- 浏览器导出 `version=2`，CLI `--app` 事件对比 PASS（实测 999 tick / 10 事件）；
- 快照→恢复→逐 tick 哈希一致（R2b 完成时补齐）。
