# ADR-026 场景编辑器 UI 第一版（S3）

- 状态：已接受（S3）
- 日期：2026-10-22
- 相关：`docs/audits/scene-editor-plan.md` S3、ADR-024

## 背景

S0–S2 已有 scene 数据契约、实例化与调度构造，但还没有可视化编辑入口；本阶段交付「场景树 + 节点检查器 + 资源浏览器」，先把传统节点-场景的编辑手感做出来，保存链路留到 S5。

## 决策

1. **入口与挂载**：`?editor=1` 时由 `mountUi` 动态 `import('../editor/mount-editor.js')`，创建独立 `#editor-root`；主循环与核心代码不需要知道编辑器存在（main.ts 零改动）。
2. **数据来源**：编辑器启动 `fetch('/scenes/demo.scene.json')` → `parseScene`，非法场景只展示问题、不进入编辑；文档 `apps/game/scenes/demo.scene.json` 是首个真实样例（3 节点 + 3 资源别名 + 5 系统）。
3. **编辑模型**：所有操作走引擎纯函数 `scene/edit.ts`（不可变、返回新 scene），每次 `apply` 再用 `parseScene` 复验；非法结果（如删掉最后一个节点）保留旧文档并提示。
4. **场景树**：按 `parentId` 递归展开；支持选中、+ 子节点（自动唯一 id）、删除（子节点交给祖父）。重命名/换父在检查器完成；`moveNode` 拒绝移到自身后代。
5. **检查器**：名称、父节点、`texture/audio` 资源下拉；组件编辑只对 `COMPONENT_KINDS`（Position/Box）开放，未知组件不渲染（避免猜测语义）。
6. **资源浏览器**：直接读 `/assets/manifest.json`，列出名字/文件/尺寸；「贴到选中」时用 `ensureResource` 复用或新建别名，再写 `node.assets`。
7. **保存**：本阶段只做内存编辑；S5 由 Vite 插件 `POST /__scene/save` 校验后原子写回。

## 验收

- 浏览器 `?editor=1`：面板渲染（场景树/检查器/资源浏览器）；「+ 子节点」节点数 3→4；重命名 root→enemy 生效；「+ Position」出现 x/y 输入；「贴到选中」后树中出现「贴图」标记；无校验错误提示。
- 纯函数单测：add/remove/rename/move/component/asset/ensureResource。
- 全量门禁 PASS。

## 已知限制

- 同一事件循环内连续触发两个动作时，第二个动作可能基于旧文档覆盖第一个（React 闭包）；真实点击是分开的事件，暂不引入文档 reducer，S5 保存前再做一致性收口。
- 资源浏览器目前只做贴图挂载；音频别名可手工在 resources 里加（S4/S5 补音频清单）。
- 不支持拖拽排序/多选/撤销。
