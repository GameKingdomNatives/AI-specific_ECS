# demo.bulletCleanup

- 职责：回收飞出世界边界的子弹。
- 输入：`Position`/`Bullet`、世界宽高。
- 输出：CommandBuffer 销毁。
- 不变量：只处理已存在子弹；边界外留 margin 防止误杀。
- 所有权：无。
- 验证：`packages/engine/tests/demo.contract.test.ts`；浏览器长时间射击实体数稳定。
