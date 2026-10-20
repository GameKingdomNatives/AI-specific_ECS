以下是一套可以直接在 Git Bash 里执行的 **`bootstrap.sh`**。它不做“框架选择”，只做一件事：**在 30 秒内把“AI 可以自由写，但无法写坏”的骨架立起来**——目录边界、契约占位、架构检查门禁、Agent 指令文件，一步到位。

---

## 最终形态：执行一条命令

把下面脚本保存为 `bootstrap.sh`，在 Git Bash 中执行：

```bash
bash bootstrap.sh my-game
```

它会在当前目录创建 `my-game/`，结构如下：

```
my-game/
├── AGENTS.md              # Agent 的项目宪法（AI 唯一需要读的约束文件）
├── CLAUDE.md -> AGENTS.md # 软链，兼容 Claude Code / Cursor 等
├── .gitignore
├── .pre-commit            # Git 钩子：提交前强制跑架构检查
├── package.json           # 仅用于挂 scripts，不引入运行时依赖
├── scripts/
│   ├── arch-check.sh      # 架构约束检查（依赖方向、跨层引用）
│   └── init-agent.sh      # 可选：启动 DSH 并提示运行 /init
├── proto/                 # 契约唯一事实源（.proto 占位）
│   └── domain/
│       └── core.proto
├── src/
│   ├── domain/            # 核心逻辑：不依赖任何外层
│   ├── application/       # 用例编排：只能依赖 domain
│   ├── interface/         # 入口（API/UI/命令）：只能依赖 application
│   └── infrastructure/    # 实现（存储/外部服务）：实现 domain 定义的端口
└── tests/
    └── arch/              # 预留：架构测试可在此扩展
```

---

## `bootstrap.sh` 完整脚本

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT="${1:-my-project}"
ROOT="$(pwd)/$PROJECT"

# ---------- 0. 前置检查 ----------
command -v node >/dev/null || { echo "需要 Node.js（DSH 依赖 Node >=22）"; exit 1; }
NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
[ "$NODE_MAJOR" -ge 22 ] || { echo "Node 版本需 >=22，当前 $(node -v)"; exit 1; }

mkdir -p "$ROOT" && cd "$ROOT"

# ---------- 1. 分层目录 ----------
mkdir -p proto/domain src/{domain,application,interface,infrastructure} scripts tests/arch

# ---------- 2. 契约占位 ----------
cat > proto/domain/core.proto <<'EOF'
syntax = "proto3";
package domain;

// 唯一事实源：所有跨模块数据结构先在这里定义。
// Agent 不得绕过契约直接共享内部类型。
message EntityId { string value = 1; }
message Command {
  EntityId target = 1;
  string action = 2;
  map<string, string> payload = 3;
}
EOF

cat > buf.yaml <<'EOF'
version: v2
modules:
  - path: proto
lint:
  use: [STANDARD]
breaking:
  use: [FILE]
EOF

cat > buf.gen.yaml <<'EOF'
version: v2
clean: true
plugins:
  - local: protoc-gen-ts
    out: src/contracts
EOF

# ---------- 3. 架构约束检查 ----------
cat > scripts/arch-check.sh <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
fail=0
check() {
  local from="$1" forbidden="$2"
  if grep -RIn --include='*.ts' --include='*.js' --include='*.py' --include='*.cs' \
       -E "from ['\"].*${forbidden}|require\(['\"].*${forbidden}|using .*${forbidden}" "$from" 2>/dev/null; then
    echo "[ARCH VIOLATION] $from 不得引用 $forbidden"
    fail=1
  fi
}
check src/domain        'src/(application|interface|infrastructure)'
check src/application   'src/(interface|infrastructure)'
check src/interface     'src/infrastructure'
exit $fail
SCRIPT
chmod +x scripts/arch-check.sh

# ---------- 4. Agent 指令文件 ----------
cat > AGENTS.md <<'AGENT'
# 项目宪法（Agent 必读）

## 唯一事实源
- 跨模块数据结构定义在 `proto/`。不得在 `src/` 中私自定义共享类型。
- 修改契约需人类确认；内部实现可自由修改。

## 分层与依赖方向（违反即拒绝）
- `src/domain/`        → 不依赖任何其他 src 层
- `src/application/`   → 只可依赖 domain
- `src/interface/`     → 只可依赖 application
- `src/infrastructure/`→ 实现 domain 端口，可依赖 domain

## Agent 权限边界
- AUTO：模块内部实现、单元测试、纯重构。
- SOFT：新增模块边界、增量契约变更（异步审查）。
- HARD：修改 proto/ 中已有字段、改变分层依赖方向（必须人类批准）。

## 提交前必须通过
`bash scripts/arch-check.sh`
AGENT
ln -sf AGENTS.md CLAUDE.md

# ---------- 5. Git + pre-commit 门禁 ----------
cat > .gitignore <<'EOF'
node_modules/
dist/
.env
.DS_Store
EOF

git init -q
cat > .pre-commit <<'EOF'
#!/usr/bin/env bash
bash scripts/arch-check.sh || { echo "架构检查失败，提交被拒绝。"; exit 1; }
EOF
chmod +x .pre-commit
cp .pre-commit .git/hooks/pre-commit

# ---------- 6. package.json（只挂 scripts） ----------
cat > package.json <<'EOF'
{
  "name": "my-project",
  "private": true,
  "scripts": {
    "check": "bash scripts/arch-check.sh",
    "init": "bash scripts/init-agent.sh"
  }
}
EOF

cat > scripts/init-agent.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
echo "启动 DSH Web 界面..."
echo "在 DSH 中打开本目录作为工作区，然后对 Agent 输入：/init"
echo "dsh-init 会根据 AGENTS.md 和当前项目结构，补全 CLAUDE.md / AGENTS.md 的细节。"
npx -y @deepseek-ai/dsh web
EOF
chmod +x scripts/init-agent.sh

echo "✅ 完成。进入项目：cd $PROJECT"
echo "   启动 Agent：npm run init（或 npx -y @deepseek-ai/dsh web）"
echo "   手动检查架构：npm run check"
```

---

## 这个脚本具体约束了什么

**第一，契约是 Agent 唯一允许触碰的“共享表面”。** `proto/` 里的定义是跨模块数据结构的唯一来源。Agent 可以自由实现 `src/domain/` 内部的逻辑，但不能在两个模块之间偷偷共享一个未定义的 TypeScript 类型——这从源头上消灭了“AI 写了能跑但耦合严重的代码”最常见的那条路径。

**第二，架构约束变成了提交前的硬门禁。** `arch-check.sh` 检查的是依赖方向：`domain` 不能引用 `application/interface/infrastructure`，`application` 不能引用 `interface/infrastructure`，`interface` 不能直接引用 `infrastructure`。它被挂进 `.git/hooks/pre-commit`，AI 生成的代码如果越界，**提交直接被拒绝**，而不是等到人类 review 时才发现。这是“让违规的代价不为零”的最小实现。

**第三，`AGENTS.md` 是 Agent 的运行时约束。** DSH 在每一轮会话中都会读取项目级的 `AGENTS.md`。脚本写入的 `AGENTS.md` 明确告诉 Agent：契约在哪里、分层方向是什么、哪些操作需要人类批准。`CLAUDE.md` 是指向它的软链，所以无论 DSH、Cursor 还是 Codex，读到的都是同一份事实来源。

**第四，`dsh-init` 负责在 Agent 启动后“补全宪法”。** 脚本本身写入的 `AGENTS.md` 是骨架；当你首次启动 DSH 并对 Agent 说 `/init` 时，`dsh-init` 会通过“侦查代码库 → 补缺口 → 写文件”的工作流，在现有骨架基础上生成更精确的 `CLAUDE.md` / `AGENTS.md`，**不覆盖、只补充**，已有文件走 diff。也就是说：**脚本立规矩，Agent 填细节**。

---

## 日常使用方式

| 你要做的事 | 执行 |
|---|---|
| 启动 Agent 开始开发 | `npm run init`，在 DSH 中选择本项目目录，输入 `/init` |
| 提交前手动检查 | `npm run check` |
| 让 Agent 新增功能 | 直接描述需求；它在 `AGENTS.md` 约束下工作，越界提交会被 pre-commit 拦截 |
| 修改契约 | 编辑 `proto/` 中的 `.proto`，人类确认后提交；Agent 只消费，不擅自改 |

这套环境不引入构建工具链、不绑定语言运行时，只依赖 **Git Bash + Node.js（≥22）**。它把此前讨论的“契约驱动、架构约束自动化、Agent 在边界内自由”压缩成了一个可以在现有终端里立刻执行的最小起点。后续无论你选择 TypeScript、Go、Rust 还是 C# 来实现 `src/` 内部，这套边界和门禁都不需要重写。