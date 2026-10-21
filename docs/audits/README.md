# Audits · 引擎差异与进度

本目录存放**判断类文档**：与目标架构的差异、完成度、缺口排序。与操作手册（`docs/runbooks/`）、决策记录（`docs/adr/`）、教训（`docs/lessons/`）分开。

## 文件

| 文件 | 内容 |
|---|---|
| [engine-diff-and-progress.md](<E:\个人游戏项目\IntoTheBattlefiel深入战火\docs\audits\engine-diff-and-progress.md>) | 规格章节 × 现状 × 差异 × 证据；完成度估计；剩余差异按风险排序 |
| [next-direction.md](<E:\个人游戏项目\IntoTheBattlefiel深入战火\docs\audits\next-direction.md>) | 源码取证后的方向判定（R1 渲染规模化 → R2 确定性快照 → R3 端口补全），含范围、验收、风险与暂缓项 |

## 怎么刷新（每次里程碑或收尾）

只读事实，不做推测：

```powershell
node tools/status.mjs
git rev-list --count HEAD
git ls-files | Measure-Object -Line
node tools/gate.mjs
```

需要更新的数字：

| 数字 | 来源 |
|---|---|
| 提交数 / 文件数 | `git rev-list --count HEAD`、`git ls-files` |
| 各目录文件数 | `git ls-files -- <目录>` |
| 测试文件数 | `packages/engine/tests/*.test.ts` |
| 门禁步骤数 | 最新 `artifacts/gate/<run>/codes.txt` 行数 |
| 逻辑帧 / 基线 | 最新 `artifacts/gate/<run>/bench.log` |

## 维护约定

- 差异条目必须带**证据路径**（文件、测试或门禁产物），否则不算；
- 「完成度」是估计值，旁边写明依据的层次，不写单一总分；
- Onlook / Figma Dev Mode 等已排除项不重复列入缺口，只在「已接受偏差」里保留一句。
