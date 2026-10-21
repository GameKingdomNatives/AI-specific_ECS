# ADR-012 输入映射数据化（键位 -> 动作）

- 状态：已接受
- 日期：2026-10-21
- 相关：ADR-009（工具链）、`docs/audits/next-direction.md` R3b

## 背景

浏览器适配层直接把物理键（`KeyW`、`ArrowUp`…）写进 `InputSnapshot.keys`，系统无法只依赖「意图」。改键位意味着改代码与录制内容；没有数据化入口。

## 决策

1. **schema**：`data/input-map.ts` 定义 `$schemaVersion: 1` + `actions[]`（`name` 唯一、`keys` 至少一个）；`parseInputMap` 校验版本、动作名唯一、按键不重复（新增 schema 字段属 SOFT，提交信息注明）。
2. **解析**：`resolveActions(map, pressedKeys)` 返回动作名集合，未绑定键丢弃；纯函数、可单测。
3. **应用**：`apps/game/src/data/input-map.json` 提供 up/down/left/right/fire；`createBrowserInput` 接受可选 `map`，快照里的 `keys` 变为动作名。录制因此存「意图」而非物理键，回放不受键位调整影响。
4. **鼠标**：`InputSnapshot.buttons` 仍是 `Set<number>`（端口冻结），本轮不重映射；把鼠标按钮映射为动作需要改端口（HARD），留待 ADR 单独决策。当前 `fire` 动作已可被读取，按钮仍按原样记录。
5. **工具**：`tools/render-bench.mjs` 同时调整了采样方法（9 轮含 2 轮预热、取中位、容差 2.0），理由与影响记录在 ADR-010 修订段。

## 后果

- 正面：键位改 JSON 即生效；录制/回放与物理键解耦；动作名可被系统读取。
- 代价：录制里的 `keys` 语义变了（旧录制仍是物理键，仍可回放，只是不映射）；`v1` 录制与新录制不能逐字节比较（哈希不受影响，输入参与运动的是 pointer）。
- 端口：未变更。

## 验收

- `tests/input-map.test.ts`：合法/版本/重复/解析 4 例通过；
- 浏览器实测：按 `KeyW` 后最后一条录制 `keys: ["up"]`；
- 全量门禁 PASS。
