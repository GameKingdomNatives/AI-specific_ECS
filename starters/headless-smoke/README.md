# Headless starter

无浏览器、无渲染器的最小消费示例：只验证 `agent-specific_ecs` 的 `createEngine` 能在独立进程里创建、step、advance、dispose。

```bash
node tools/smoke/engine-starter.mjs
```

门禁中的 `starter-smoke` 会跑它；它依赖 `packages/engine` 已构建的 `dist/src`。
