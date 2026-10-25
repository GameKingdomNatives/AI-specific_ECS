# 工作流（Workflow）

> 一个容器、两个平级项目；流程只定义"怎么推进"，不定义"做什么"。

## 读什么

| 文件 | 用途 |
|---|---|
| `full-workflow.md` | **完整操作手册**：从开工到交付、失败处理矩阵、命令速查 |
| `iteration-workflow.md` | 迭代流程定义：证据分层、人的在场规则、收尾清单 |
| `templates/iteration.md` | 迭代记录模板 |
| `templates/start-checklist.md` | 开工检查清单 |
| `templates/finish-checklist.md` | 收尾检查清单 |
| `templates/direction-correction.md` | 方向校正记录模板 |
| `iterations/` | 已发生的迭代记录（事实，不是计划） |
| `records/` | 方向校正 / 回顾 / 一次性复盘 |

## 目录结构

```text
docs/workflow/
  README.md                  ← 本文件（入口）
  full-workflow.md           ← 完整操作手册
  iteration-workflow.md      ← 迭代流程定义
  templates/
    iteration.md
    start-checklist.md
    finish-checklist.md
    direction-correction.md
  iterations/
    README.md                ← 命名与索引
    iter-001-flux-core.md
    iter-002-three-weapon-slots.md
  records/
    README.md
```

## 启动一次迭代

```text
1. node tools/status.mjs          # HEAD、脏文件、上次门禁
2. 读 docs/handoff.md 顶部        # 当前状态、待人裁定
3. 选 1–2 个目标                  # 对照 00-最终指令 与 边界
4. 复制 templates/iteration.md    # 写成 iterations/iter-NNN-<slug>.md
5. 单点串行做检查点               # 每个 30min–2h
6. node tools/flow.mjs ship       # 门禁、回执、深检、合并、推送
7. 收尾：handoff / quality-log / commit /（验收后）tag
```

## 与其他目录的关系

- `docs/adr/`：为什么这样决定。
- `docs/quality-log.md`：每轮一行，看趋势。
- `docs/game/`：游戏侧切片、操作、引擎反馈清单。
- `contracts/`：机器可读契约；`tools/`：执行这些契约的检查。
- `docs/runbooks/`：具体操作（推送通道、分支生命周期）。
