# ADR 004 · RenderItem 增加可选 texture（HARD，附加性变更）

- 日期：2026-10-20
- 状态：已接受（用户要求素材走代码生成，需渲染层支持贴图）
- 影响：`packages/engine/src/ports/index.ts`、`tools/port-contract.json`

## 背景

素材改为 Node 程序化生成（`tools/gen-assets.mjs` 自带最小 PNG 编码器），产物在 `apps/game/public/assets/`。渲染表原本只有 `shape`（rect/circle/poly），无法表达贴图。

## 决定

- `RenderItem` 增加**可选**字段 `texture?: string`（URL）。
- 兼容性：不填的条目行为完全不变；填了但加载失败时退回 `shape` 几何图形。
- 渲染实现：`pixi-views.ts` 按 URL 缓存 `Texture`，有贴图用 `Sprite`（anchor 0.5，尺寸取 `sx/sy`），否则用 `Graphics`。
- 素材生成确定性：形状坐标固定，不依赖随机；`manifest.json` 记录尺寸供门禁校验。

## 不做

- 不引入图像库（PNG 由 `zlib` + 手写 CRC32 编码）。
- 不做图集打包：本轮三张小图各自独立，等素材量上来再上图集。

## 流程

端口为 HARD 区：已运行 `node tools/checks/registry.mjs --accept-ports` 更新冻结哈希；门禁新增 `assets` 步骤校验签名、尺寸与清单。
