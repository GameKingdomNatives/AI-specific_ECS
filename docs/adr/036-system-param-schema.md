# ADR-036 系统参数 schema 与运行时消费（P0-2）

- 状态：已接受
- 日期：2026-10-22
- 相关：ADR-034/035、`docs/audits/engine-spec-audit-2026-10-22.md` P0-2

## 背景

scene 的 `systems[].params` 是通用 key/value，编辑器只能显示原始键值，无法声明类型/范围/默认值；运行时 `createSystems` 也不消费参数。参数写错只有运行到系统时才可能暴露。

## 决策

1. **引擎元数据**（`packages/engine/src/scene/meta.ts`）新增 `ParamField`/`SystemMeta`、`coerceParamValue`、`validateSystemParams`：
   - `kind: number|boolean|string`，可选 `min/max/step`；
   - 未知 key、类型不符、越界返回可读消息；
   - 3 组单测（`tests/scene-param-meta.test.ts`）。
2. **应用登记**（`apps/game/src/editor/system-meta.ts`）：`demo.player.speed`、`demo.weapon.cooldownTicks/speed` 带默认值与范围；`validateSceneSystemParams(scene)` 汇总为 `{path,message}`。
3. **校验接入**：编辑器 `apply` 与运行时 `applySceneDocument` 在 parse 后调用同一校验，非法参数不进入世界。
4. **表单接入**：调度编辑器对已登记系统渲染 `params · schema` 字段（数字/布尔/字符串，按 label/min/max/step），值经 `coerceParamValue` 收敛；未登记系统保留原 key/value 表单并标注「未登记 schema」。
5. **运行时消费**：`createSystems(deps, params)` 读取 `demo.player.speed` 与 `demo.weapon.cooldownTicks/speed`；`createSceneSystems(deps, scene)` 从 scene.systems 提取参数传入。默认值保持 10/6/14，无参数时行为不变。

## 验收

- 单元：`node --test packages/engine/tests/scene-param-meta.test.ts` 通过（收敛/未知 key/类型/越界）。
- 浏览器：调度页选中 demo.weapon 显示「冷却 tick / 弹速」；把冷却改为 10 并保存，文件 `systems[demo.weapon].params={"cooldownTicks":10}`。
- 浏览器：直接 `__itbApplyScene` 一个 `cooldownTicks:999` 的 scene → `ok:false`，issue「超出范围 1..120」；合法 12/20 → `ok:true`。
- 全量门禁 PASS。

## 代价/边界

- 参数 schema 目前只登记两个演示系统；新增系统必须同步 `system-meta.ts`，否则回退到通用表单（不会静默丢弃）。
- 未在 schema 中声明的 key 会被拒绝；这是有意的严格化，旧 scene 若带未知参数需迁移或先登记。
- `params` 仍存在 scene JSON 中，schema 保持通用记录，不改变冻结端口。
