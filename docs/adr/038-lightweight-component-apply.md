# ADR-038 组件级轻量应用（P0-4）

- 状态：已接受
- 日期：2026-10-22
- 相关：ADR-034/035/037、`docs/audits/engine-spec-audit-2026-10-22.md` P0-4

## 背景

保存/实时预览原本一律 `rebuild()`：换世界、重建调度器/物理/recorder、kills 归零。改一个 Position 也像重开一局，连续编辑体验差。

## 决策

1. **先判定能否原地应用**（`apps/game/src/scene-apply.ts`）：
   - scene name/resources/systems 完全一致；
   - 节点数、id、parentId、name、assets、组件 key 集合一致；
   - 只有 `Position` / `Box` 的值变化；任何 `BoxSpawner`、组件增删、节点/资源/系统变化都走整重建。
2. **原地写列**：对每个节点 `world.setRow(entity, def, fields)`，不换 World、不重建 Scheduler/Physics，**不重置 kills/runState**。
3. **应用后更新**：`sceneResult.loaded.scene = next`；重算 `lastHash` 并换新 Recorder（避免把编辑边界前的输入日志伪装成可回放的一局）；`lastAppliedScene` 去重保持。
4. **整重建保留**：结构变化/系统参数/BoxSpawner 仍走 `rebuild()`；这是有意边界，不做半套差异同步。
5. **失败安全**：先收集所有待写项并校验 entity/def/值类型，再统一写入；任一不满足直接回落整重建。

## 验收

- 浏览器：target Position X 改为 1500（实时预览开）→ tick 从 780 继续到 2210（未换世界）、`__itbScene.entities` 保持 `{root:0,spawner:1,player:2,target:3}`、ambient `spawned=64`。
- 浏览器：spawner count 改 10 → 走整重建，`spawned=10`（结构/生成器语义变化必须重置）。
- 文件未保存时场景文件仍为 64，预览不写盘。
- 全量门禁 PASS。

## 边界与后续

- 轻量应用只覆盖 Position/Box；组件新类型需显式加入 `LIGHT_COMPONENTS`，否则自动整重建。
- Recorder 在轻量应用后重置：编辑前后不能算同一局回放；这是确定性诚实的代价。
- 物理/调度器等实例保持旧引用是安全的，因为结构未变；若未来组件影响物理 body 尺寸，需要同步物理层（当前 Box 修改后 bridge 下 tick 会同步）。
