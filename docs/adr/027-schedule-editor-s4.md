# ADR-027 调度图编辑器（S4）

- 状态：已接受（S4）
- 日期：2026-10-22
- 相关：`docs/audits/scene-editor-plan.md` S4、ADR-025

## 背景

S2 已有 `buildSchedule`，S3 的场景面板能编辑节点；但系统清单仍只能改 JSON。本阶段把「系统清单」做成可视化编辑：阶段泳道、系统卡片、after/enabled/params 表单，保存仍留 S5。

## 决策

1. **引擎原语**：`scene/schedule-edit.ts` 提供 `addSystem/removeSystem/updateSystemPhase/setSystemEnabled/setSystemAfter/setSystemParam`，全部不可变；`after` 去重、去自引用，未知 id 保留交由 schema 报错；参数空对象回落 `undefined`。
2. **UI 结构**：`ScheduleEditor` 按 `PHASES` 顺序渲染阶段分组（泳道语义），每阶段列出该系统卡片；卡片显示 id/phase/after/禁用标记。
3. **新增系统**：`AddSystemForm` 输入 `system.id` + 阶段；id 只做非空校验，其余交给 `parseScene`（重复/非法字符即时提示）。
4. **系统编辑**：选中卡片后可改阶段（下拉）、启用（复选框）、`after`（逗号分隔，失焦提交）、`params`（key/value 行，可增删；数字字符串保留 number）。
5. **校验**：所有操作仍经 `apply → parseScene`；非法结果保留旧文档并展示 issue（例如重复系统 id、after 引用不存在）。
6. **代价**：`params` 暂无逐系统 schema/表单类型，值以标量文本编辑；这属于 S5 之后的系统注册表增强。

## 验收

- 浏览器：切到「调度」页签，5 系统按 input/ai/movement/…/renderSync 分组；新增 `demo.extra` 后计数 5→6、AI 组出现卡片；选中后 after 设为 `demo.player` 卡片显示 `after: demo.player`；取消启用后显示「已禁用」；无校验错误。
- 单测：新增/删除、阶段/启用、after 去重与未知 id、参数增删/类型保留。
- 全量门禁 PASS。

## 后果

- 正面：调度顺序/阶段/启用/参数不再需要手写 JSON，编辑器与运行时共享同一份清单。
- 代价：after 以文本编辑而非连线画布（窄面板下更可控）；参数缺 schema；仍无撤销。
- 回退：不改 scene 时 `buildSchedule` 行为与 S2 完全一致。
