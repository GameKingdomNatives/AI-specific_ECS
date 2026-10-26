# ADR-058 · 推送通道与失败处理

- 状态：已采纳（2026-10-25）
- 关联：`docs/runbooks/04-推送与网络策略.md`、`tools/push.mjs`、ADR-042

## 背景

`~/.ssh/config` 把 `github.com` 改写到 `ssh.github.com:443`；该通道在国内网络会被重置：

```
git push --follow-tags
Connection reset by 20.205.243.160 port 443
fatal: Could not read from remote repository.
```

同期 `github.com:22` 的 TCP 探测可用。此前工作流没有写"推送失败怎么判定、换哪条通道"，属于流程遗漏。

## 决策

1. 推送前用 `node tools/push.mjs` 体检：工作区、HEAD stamp、ssh 配置生效值、22/443 通道。
2. 只有"干净 + stamp"才允许 `--go`；推送失败不改门禁、不用 `--no-verify`。
3. 通道优先级：22 → 443(ssh) → HTTPS(PAT) → git bundle 离线搬运。
4. 失败原文（IP/端口/退出码）记入交接；通道结论当作环境事实维护。

## 后果

- 正面：把"策略失败"和"网络失败"分开，避免为了推上去而放宽门禁。
- 代价：多一个 tools/ 脚本（保护路径），需 ALLOW_PROTECTED 并记录在本 ADR。
