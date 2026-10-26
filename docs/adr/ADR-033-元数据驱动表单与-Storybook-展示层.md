# ADR-033 元数据驱动表单与 Storybook 展示层（D4）

- 状态：已接受（D4）
- 日期：2026-10-22
- 相关：`docs/audits/数据驱动运行时计划.md`、ADR-026

## 背景

S3/S4 的检查器把组件字段写死在 `component-kinds.ts`：字段名、类型、默认值、范围都在 UI 代码里，新增组件要改 UI；同时展示组件与运行时/取数耦合，无法在 Storybook 单独摆样。

## 决策

1. **引擎侧元数据类型**：`scene/meta.ts` 定义 `MetaField/ComponentMeta`，并提供：
   - `defaultsFor(meta)`：新增组件时的默认值；
   - `coerceFieldValue(field, input)`：布尔收敛、数字夹取 min/max、按 step 取整、非有限值回落默认；
   - `findComponentMeta`。单测 3 组。
2. **应用侧注册表**：`apps/game/src/editor/component-meta.ts` 登记 Position（X/Y）、Box（尺寸/颜色）、BoxSpawner（数量/最小/最大/速度），含中文标签、范围、步长、默认值。删除 `component-kinds.ts`。
3. **检查器**：`ComponentSection` 完全由 `COMPONENT_META` 渲染；添加组件按钮显示中文标签；字段显示 label，数字输入带 min/max/step，布尔为 checkbox；未登记组件只读展示。
4. **默认值**：`use-editor` 的 `addComp` 改用 `defaultsFor(meta)`，不再硬编码 0/false。
5. **Storybook 纯展示**：新增 `apps/game/src/editor/editor.stories.tsx`（SceneTree / Inspector / ScheduleEditor / AssetBrowser，静态 Scene + noop actions），`.storybook/main.ts` 的 stories glob 增加 `../src/editor/**/*.stories.tsx`；Storybook 构建纳入全量门禁。
6. **契约**：展示组件只吃 props（scene/node/entries/actions），不 fetch、不读全局；为后续 Figma 式 UI 协作提供稳定 props 边界。

## 验收

- 浏览器（`?editor=1`）：选择 player → 检查器显示「位置 · Position（X/Y）」「方块 · Box（尺寸/颜色）」；选择 spawner → 显示「环境生成器 · BoxSpawner（数量/最小尺寸/最大尺寸/速度）」；未登记组件只读。
- 单测：`scene-meta.test.ts` 3 组（默认值/夹取/布尔）。
- Storybook build PASS（全量门禁 storybook 步骤）；测试基线 39。
- 全量门禁 PASS。

## 后续

- 调度参数表单仍是通用 key/value（系统私有 schema 未定）；D5 可评估是否纳入同一元数据体系。
- Storybook 目前展示组件，不包含完整 EditorPanel（依赖 fetch/hook）；如需完整交互稿，后续加 MSW/静态数据容器。
