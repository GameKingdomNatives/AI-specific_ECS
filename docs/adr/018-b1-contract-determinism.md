# ADR-018 B1 契约与确定性修补（写入守卫 / invalid 入档 / 事件序号）

- 状态：已接受
- 日期：2026-10-22
- 相关：§4 所有权、§5 事件确定性、§9 脏局规则；parity 计划 B1

## 背景

parity 复核发现三处规格已写、实现缺失的点：

1. §4 要求「声明之外的写入在 dev 期由只读代理拦截」，实际只有启动期读写冲突校验；
2. §9 要求崩溃局 invalid、不进入哈希回归，实际只停了录制，录制文件没有 invalid 字段；
3. §5 要求「事件 id 单调递增，回放时按 id 校验」，实际序列化丢掉了 `seq`，比对只比 type/payload。

## 决策

1. **写入守卫**：`World.beginWriteScope(defs)/endWriteScope()`；`SchedulerOptions.enforceWrites`（默认关）在每个系统 update 前设置作用域，`add/remove/set` 越界即抛错，并走既有故障隔离。应用通过 `?guard=1` 在 dev/验收时开启，正式运行默认零开销。
2. **invalid 入档**：`Recording.invalid?: boolean`；`Recorder.markInvalid()/isInvalid`；序列化/反序列化保留；`replay` 对 invalid 录制直接返回 `{invalid:true, ticks:0, hashes:[]}`，不执行任何 tick；CLI 打印原因并退出 2；app 在 `RunState` 失效时标记录制。
3. **事件序号**：`SerializedEvent.seq?: number` 由 `EventRecord.seq` 写入；反序列化保留；`firstEventDivergence` 在两边都有 seq 时比较（旧 v2 无 seq 的录制仍按 type/payload 兼容）。
4. §6 端口表同步实际实现：`IAudio` WebAudio、`IStorage` localStorage（回退内存）。

## 后果

- 正面：越界写能在测试/dev 立刻暴露；脏局录制不会被误用于哈希回归；事件偏离可定位到序号。
- 代价：守卫开启时每次写入多一次 Set 查找（默认关）；旧 v2 录制仍无 seq，校验退化为 type/payload。
- 回退：`enforceWrites` 关即恢复；invalid 是附加字段，旧读取方忽略。

## 验收

- 单测：越界写触发 `onSystemError`、合法写放行；invalid 录制 serialize/deserialize 往返 + replay 零 tick 拒收；seq 不同触发事件偏离。
- 全量门禁 PASS（41 步）；应用 `?guard=1` 无系统报错。
