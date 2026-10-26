# ADR-020 文本渲染（HARD：RenderItem 文本字段）

- 状态：已接受（HARD 变更，2026-10-22 用户目标授权方向）
- 日期：2026-10-22
- 相关：§7「文本：Pixi 内 Canvas 纹理缓存」、parity PG-04

## 背景

规格要求渲染表支持文本并由 Pixi 的 Canvas 纹理缓存绘制；此前 `RenderItem` 只有图元/贴图，引擎无法在 canvas 内画字，HUD 只能走 DOM。

## 决策（HARD）

1. **端口变更**：`RenderItem` 增可选字段
   ```ts
   readonly text?: string;
   readonly font?: string;
   readonly fontSize?: number;
   ```
   `tint` 作为文本填充色；设置 `text` 时忽略 `sx/sy`。按项目宪法，端口签名变化走 HARD：本 ADR 记录变更，`node tools/checks/registry.mjs --accept-ports` 已更新 `tools/port-contract.json`。
2. **实现**：`view-pool.acquireText` 使用 Pixi `Text`（内部即 Canvas 纹理），按 `textKey(text,font,size,tint)` 池化复用；默认 `monospace/16`，字号取整且 ≥1；文本锚点 0.5（与其它图元一致）。`pixi-views` 优先处理 `text`，内容/字体/字号/颜色变化即重建视图，旧视图回池。
3. **纯逻辑抽取**：`impl/text-style.ts`（`resolveTextStyle/textKey`）不依赖 Pixi，可单测。
4. **应用夹具**：渲染表在顶部叠加一条 canvas 文本 `KILLS n`（layer 5），用于验证文本通道；不改游戏内容。

## 验收

- 单测：默认字体/字号、字号夹取与取整、池键包含内容/字体/字号/颜色。
- 浏览器（`?capture=1`）：`vis 66/66`（65 实体 + 1 文本）；OCR 截图读到 `KILLS 0`；射击至 29 击杀后 OCR 读到 `KILLS 29`，`vis 37/37`（36 实体 + 1 文本），文本随内容更新且无残留。
- 全量门禁 PASS（41 步），端口契约哈希已更新。

## 后果

- 正面：canvas 内文本可用，伤害数字/弹幕文字有了通道；文本与图元共用渲染表与池化。
- 代价：端口 HARD 变更（已记录）；文本更新会重建纹理，适合低频文本，不适合每帧大量变化。
- 回退：渲染项不带 `text` 即走原图元/贴图路径；字段为可选，不破坏旧调用。
