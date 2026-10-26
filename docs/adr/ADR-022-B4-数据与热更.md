# ADR-022 B4 数据与热更（manifest 接入 / schema 指纹降级）

- 状态：已接受
- 日期：2026-10-22
- 相关：§10 资源与数据、§11 热重载、parity PG-09/PG-10

## 背景

应用此前硬编码 `/assets/player.png` 等路径，没有清单校验；HMR 只热替换系统，没有「组件 schema 变化不可热更」的判定。

## 决策

1. **资源清单（PG-09）**
   - `data/assets-manifest.ts`：zod schema `{version:1, generatedAt?, assets:[{name,file,width,height}]}`，`superRefine` 拒绝重复 name；`parseAssetManifest` 返回 discriminated union（ok/value/issues），非法清单不抛异常；`assetUrl(manifest,name)` 解析 `/assets/<file>`。
   - 应用 `apps/game/src/assets.ts::loadTextureUrls`：启动时 `AssetLoader.json('/assets/manifest.json')` → 校验 → 名字到 URL；失败回退 `/assets/<name>.png` 约定并记录 issue。
   - `main.ts` 的玩家/箱子/子弹贴图全部改走清单；清单缺名字时返回空串，渲染器退回几何图形。
2. **schema 指纹（PG-10）**
   - `core/schema-fingerprint.ts`：对「组件名 + 字段名=字段类型」排序后做 FNV-1a；`World.schemaFingerprint()` 汇总当前 store 的组件定义。
   - 应用 `hmr-guard.ts::createSchemaGuard(world)`：启动时记录指纹；每次系统 HMR 前比对，不一致则 `console.warn` 并 `location.reload()`，阻止把旧组件布局套到新定义上（返回 false 表示已降级）。
   - 指纹是观测数据，不写世界、不进哈希。

## 验收

- 单测：manifest 合法/版本错误/尺寸非法/重复名/空清单/非对象；指纹对顺序不敏感、组件集合/字段/字段类型变化均改变。
- 浏览器：`/assets/manifest.json` 200，`version=1`、3 个资源（player/box/bullet）；应用启动无错误，`vis 66/66` 正常渲染（贴图经清单 URL 解析）。
- HMR 降级路径为薄封装（指纹比较 + reload），由指纹单测覆盖核心判定；浏览器不做真实的组件定义变更（会破坏运行中世界）。

## 后果

- 正面：资源来源单一（清单），清单错误可展示；组件 schema 变化有明确降级路径而不是静默错乱。
- 代价：启动多一次 manifest 请求（已走 AssetLoader 缓存）；清单成为新增数据契约，需要与 assets 目录同步。
- 回退：删除 `textures` 注入即回到硬编码路径；`schemaGuard` 不调用则无降级。
