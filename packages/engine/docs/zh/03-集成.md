# 03 · 集成

## 这是库，不是后端

本包是运行时内核，没有 HTTP 服务、数据库、鉴权或网络 API。

```text
产品 UI / 应用
      │
      ▼
端口 + 适配器（渲染/输入/物理/音频/存储）
      │
      ▼
agent-specific_ecs 运行时
```

## 前端

产品自己负责：

- UI/框架；
- 渲染器/输入；
- 场景文件 I/O；
- 持久化与网络。

引擎不得 import React、Pixi、DOM 或应用代码。

## 后端

产品需要后端时，放在内核之外：

```text
产品后端 ──HTTP/WS──▶ 产品前端
                          │
                          ▼
                  agent-specific_ecs
```

不要把服务端调用写进系统。

## 适配器

实现 `agent-specific_ecs/ports`：

- `IRenderer`：绘制 `RenderItem`；
- `IInput`：输入快照；
- `IPhysics`：只查询；位置真值仍在 ECS；
- `IAudio`、`IStorage`、`ILogger`。

## Fixture

`@itb/fixture` 是 private，不在本 tarball 内。外部产品需：

- 复制示例组件/系统到产品；或
- 自建 fixture。

## 场景数据

`agent-specific_ecs/scene` 负责解析/校验/实例化；文件加载/保存与重建由应用负责。

## 本仓库

`apps/game` 是浏览器集成样例：

- `main.ts` 创建 `createEngine` 并驱动循环；
- `render-table.ts` 把 ECS 映射为 `RenderItem`；
- `scene-save-plugin.mjs` 只是开发期 Vite 中间件。

它不属于 npm 包。

## 安全边界

- 不要提交 token/恢复码/TOTP 密钥；
- npm 发布是发布动作，不是引擎 API；
- passkey/OTP 属于发布流程，不属于运行时。
