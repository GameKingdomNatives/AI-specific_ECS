# 04 · 扩展

## 先选层

| 变更 | 放哪 |
|---|---|
| ECS 原语/调度 | engine core |
| 适配器 | engine impl/bridge 或产品 |
| 领域组件/系统 | 产品或 fixture |
| UI/编辑器 | 产品 |
| 质量规则 | 仓库工程内核（不随包发布） |

游戏内容不得写入 core。

## 组件与系统

```ts
const Health = defineComponent('Health', { hp: 'f32' });

engine.add({
  name: 'damage',
  phase: 'damage',
  reads: [Health],
  writes: [Health],
  update(ctx) {
    for (const e of ctx.world.query(Health)) {
      const h = ctx.world.get(e, Health);
      if (h) ctx.world.set(e, Health, { hp: h.hp - 1 });
    }
  },
});
```

规则：

- 系统之间不得 import；
- 冷信号走 EventBus；
- 结构变更走 CommandBuffer；
- 确定性系统不得用墙钟/`Math.random`。

## 新增导出子路径

仅用于稳定公共能力：

1. 在 `src/<area>` 实现；
2. 从 `src/index.ts` 或子路径模块导出；
3. package.json 增加 `exports`（types + default）；
4. `tsc -b` 构建；
5. 增加公共 import 测试；
6. 更新 API 文档/版本；
7. 验证 `npm pack` 与安装冒烟。

端口/签名是兼容契约；修改属于破坏性变更。

## 新增适配器

实现端口；SDK/DOM import 不得进入 core；用 fake/real adapter 测试；稳定后再导出。

## 新增场景能力

更新 scene schema/parse/instantiate 与产品注册；加契约测试；未知字段必须报错，不得静默丢弃。

## 版本

- 内部修复 → patch；
- 增加公共 API → minor；
- 破坏 API/端口 → major（或 0.x 明确破坏）。

## 反模式

- 为了“以后可能用”而导出内部结构；
- 为省适配器工作去改端口；
- 引入 `any`/`@ts-ignore`；
- 把应用逻辑放进 core；
- 没跑 pack/install 冒烟就发布。
