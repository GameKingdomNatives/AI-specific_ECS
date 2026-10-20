---
AIGC:
    Label: "1"
    ContentProducer: 001191110102MACQD9K64018705
    ProduceID: 7634567395088171274-data_volume/files/所有对话/主对话/工具脚本/项目策划文档模板/迭代开发/协议/Git工作流规范.md
    ReservedCode1: ""
    ContentPropagator: 001191110102MACQD9K64028705
    PropagateID: 63149826658540#1792413027383
    ReservedCode2: ""
---
# Git工作流规范 v1.2

## 为什么需要Git

指南针式框架下，AI不再按预定步骤执行，每次迭代可能走不同方向。这带来一个关键问题：**AI改了什么、怎么回滚、怎么追溯**。

Git解决三个核心问题：
1. **回滚能力**：AI失控时随时回到上一个已知好的状态
2. **变更追踪**：`git diff` 比"AI自己记"可靠一万倍
3. **状态文档同步**：部分状态信息可以从git log自动生成

分工原则：**Git管代码事实，文档管设计意图**，两者不重叠。

---

## 仓库初始化

项目根目录下初始化：

```bash
cd /项目路径
git init
git add .
git commit -m "项目初始化"
```

### .gitignore 建议

```
node_modules/
dist/
build/
*.log
.DS_Store
.env
```

---

## Commit规则

### Commit时机

1. **每次迭代完成后** — 必须commit
2. **每个功能完成后** — 建议commit（参照《迭代开发AI执行协议》步骤7）
3. **重要实验开始前** — 建议commit（方便回滚）
4. **方向校正后** — 必须commit

### Commit message格式

```
[类型] 迭代XXX: 简述

详细说明（可选）
```

类型：
- `feat`: 新功能
- `fix`: 修复
- `refactor`: 重构（不改变行为）
- `exp`: 实验性改动（可能回滚）
- `reset`: 方向校正后的提交
- `docs`: 仅文档变更

示例：
```
[feat] 迭代003: 实现敌人基础追踪AI

- 添加EnemyAIComponent和EnemyAISystem
- 直线追踪逻辑，不含规避
- 检查点3-1-1和3-1-2完成
```

### Commit内容规范

- 一次commit只包含**当前检查点/功能**的改动
- 不要把多个功能的改动混在一个commit里
- 不要提交编译产物（dist/build）
- 文档变更和代码变更可以混在同一个commit里

---

## Tag规则

### 何时打Tag

1. **迭代完成且验收通过** → `iter/XXX`
2. **方向校正** → `pivot/YYYY-MM-DD`
3. **可玩里程碑** → `milestone/名称`（如 `milestone/first-playable`）
4. **发布版本** → `vX.Y.Z`

示例：
```bash
git tag iter/003 -m "迭代003: 敌人基础AI"
git tag pivot/2026-06-15 -m "从纯射击转向射击+肉鸽"
git tag milestone/first-playable -m "首次可玩demo"
```

---

## 分支策略

独立游戏+AI开发的场景下，保持简单：

### 主分支：main

所有稳定的迭代结果都直接在main上提交。不设长期开发分支。

### 实验分支：exp/描述

当想验证一个不确定的想法时：
1. 从main切出 `exp/xxx`
2. 在实验分支上随便折腾
3. 结果好 → 合并回main，删除实验分支
4. 结果不好 → 直接删除实验分支

### 分支规则

- 实验分支存活时间不超过1个迭代
- 不要在实验分支上做超过2个功能
- 合并前必须自检验收
- 不设release/hotfix等分支，对独立游戏过度工程

---

## 与状态文档的协同

### 状态文档中的Git字段

当前状态文档中有以下Git相关字段，每次迭代后更新：

- **Git最新commit**：commit hash前7位 + message
- **代码地图**：可以部分从git log提炼

### 用Git辅助状态更新

迭代完成后，用git log快速回顾做了什么：

```bash
git log iter/002..iter/003 --oneline
git log --follow src/system/gameLogic/EnemyAISystem.ts
git diff iter/002 iter/003 --stat
```

### 状态文档 vs Git信息

| 信息类型 | 状态文档 | Git |
|----------|----------|-----|
| 功能是否实现 | ✅ | ✅ |
| 代码位置 | ✅ | ✅ |
| 设计意图/原因 | ✅ | ❌ |
| 已知问题 | ✅ | ❌ |
| 架构决策 | ✅ | ❌ |
| 具体代码变更 | ❌ | ✅ |
| 回滚能力 | ❌ | ✅ |

两者互补，不重复。

---

## 异常处理

### AI改坏了代码

```bash
git diff HEAD~1
git reset --hard iter/XXX
# 或只回滚某个文件
git checkout iter/XXX -- src/某个文件.ts
```

### 不确定改了什么

```bash
git diff
git status
```

### 实验搞砸了

```bash
git checkout main
git branch -D exp/xxx
```

---

## 禁止行为

1. ❌ `git push --force`
2. ❌ 删除或覆盖tag
3. ❌ 在main上做实验性改动（用分支）
4. ❌ 提交编译产物或node_modules
5. ❌ 一次commit包含多个功能的改动
6. ❌ 迭代完成后不commit

---

## 版本信息

- v1.2（2026-06-11）：并入项目策划文档模板包，目录结构引用统一
- v1.1（2026-06-09）：统一到游戏迭代开发框架
- v1.0（2026-06-09）：初始版本

---

> 本内容由 Coze AI 生成，请遵循相关法律法规及《人工智能生成合成内容标识办法》使用与传播。
