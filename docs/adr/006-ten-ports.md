# ADR 006 · 端口冻结数量改为 10（IModHost）

- 日期：2026-10-20
- 状态：已接受（用户批准）
- 影响：`docs/00-最终指令.md` §6、`AGENTS.md`、`tools/port-contract.json`（哈希随端口文件）

## 背景

规格原写「冻结 9 个端口」。开发到第三批时，为了让 mod 边界先有形状（而不是日后临时加），
在 `ports/index.ts` 中加入了 `IModHost { readonly apiVersion: string }`，只冻结形状、不实现加载器。

## 决定

- 端口冻结数量以 **10** 为准：`IRenderer / IInput / IAudio / IPhysics / IEventBusPort / IClock / IRandom / ILogger / IStorage / IModHost`。
- `IModHost` 保持最小占位；实现（扫描、依赖、沙箱）不在本阶段。
- 规格与宪法文案同步为「十个端口」，避免文档与代码对不上。

## 不做

- 不因此放开端口随意增长：新增端口仍需 HARD 审批与 ADR。
