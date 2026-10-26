# demo.player

- 职责：玩家位置追踪指针（登录/演示夹具）。
- 输入：`Position`、输入快照指针、参数 `speed`（默认 10）。
- 输出：写 `Position`。
- 不变量：距离 <4 不移动；player 失效（-1）时安全跳过。
- 所有权：player 节点。
- 验证：`packages/engine/tests/demo.contract.test.ts`；浏览器按住左键移动。
