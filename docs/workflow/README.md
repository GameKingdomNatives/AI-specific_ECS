# 工作流（Workflow）

> 一个容器、两个平级项目；流程只定义"怎么推进"，不定义"做什么"。

## 读什么

1. `iteration-workflow.md` —— **本仓库的迭代工作流**（开工到收尾的完整顺序、证据分层、人的在场规则）。
2. `templates/iteration.md` —— 迭代记录模板。
3. `iterations/` —— 已发生的迭代记录（事实，不是计划）。
4. `../handoff.md` —— 当前状态与交接（每次收尾更新）。
5. `../00-最终指令.md` 与 `../../AGENTS.md` —— 方向与护栏。

## 启动一次迭代

```
1. node tools/status.mjs          # HEAD、脏文件、上次门禁
2. 读 docs/handoff.md 顶部        # 当前状态、待人裁定
3. 选 1–2 个目标                  # 对照 00-最终指令 与 边界
4. 复制 templates/iteration.md    # 写成 iterations/iter-NNN-<slug>.md
5. 单点串行做检查点               # 每个 30min–2h
6. node tools/gate.mjs            # 证据分层，L3 不算 PASS
7. 收尾：handoff / quality-log / commit /（验收后）tag
```

## 与其他目录的关系

- `docs/adr/`：为什么这样决定。
- `docs/quality-log.md`：每轮一行，看趋势。
- `docs/game/`：游戏侧切片、操作、引擎反馈清单。
- `contracts/`：机器可读契约；`tools/`：执行这些契约的检查。
