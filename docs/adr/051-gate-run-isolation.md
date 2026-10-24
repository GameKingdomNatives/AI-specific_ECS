# ADR-051 门禁运行目录隔离与 lock 保护

- 状态：已接受
- 日期：2026-10-24
- 相关：`tools/gate.mjs`、`tools/checks/gitfacts.mjs`、`tools/drill.mjs`
- 来源：DSH 独立审计 §9（G10/G12）

## 背景

1. **G10**：`gate` 的 run id 只到秒；主开发会话与 DSH 审计同秒启动时共用 `artifacts/gate/<timestamp>`，后写入者整文件覆盖前者，出现“报告 PASS 但证据是另一个进程”的情况。
2. **G12**：`package-lock.json` 不在保护路径；依赖锁被改动既不触发批准也不会在 gitfacts 里被记录。

## 决策

1. `gate` run id 改为 `timestamp-pid-random`，每次运行独立目录，不再覆盖。
2. `gitfacts` 的保护路径加入 `package-lock.json`；锁修改必须 `ALLOW_PROTECTED=1`。
3. 新增 `改依赖锁` drill：临时改 lock，跑 gitfacts，必须命中“受保护路径”。

## 验收

- 两次 gate 同秒启动得到不同目录；报告头 run id 唯一。
- `改依赖锁` drill PASS。
- 全量 gate PASS；stamp 与 receipt 路径无冲突。

## 边界

- run id 变长；历史报告路径规则变化，旧报告仍保留。
- 保护路径只是本地门禁；远端 required checks 仍未启用。
