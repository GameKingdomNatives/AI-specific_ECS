# UI Storybook Starter

一个**可独立复制**的 UI 起步工程：React 19 + Tailwind 4 + Storybook 10，本地运行、MIT 许可、免费商用。没有游戏引擎、没有后端、没有云服务。

它的用途：让新加入的开发者（或设计协作方）在 **10 分钟内**跑起来、看懂一个组件怎么被拆成「组件 + 状态故事」，并形成一个可交付给设计的静态页面。

---

## 我该怎么起步（10 分钟）

前提：Node ≥ 22、npm。

```bash
cd starters/ui-storybook-kit
npm install          # 在仓库内可省略：根目录已装好依赖
npm run storybook    # 打开 http://localhost:6006
```

只想要一个能发给别人的静态页面：

```bash
npm run build        # 产物在 storybook-static/
npm run serve        # 打开 http://localhost:7007
```

你会看到 4 组故事：

- `基础组件/Button`：默认 / 主色 / 禁用
- `基础组件/StatusNote`：信息 / 弱化 / 错误
- `基础组件/StatRow`：有数据 / 空状态
- `设计/Token 总览`：颜色、字号、间距、圆角

---

## 目录结构

```
starters/ui-storybook-kit/
├── package.json          依赖与三个脚本（storybook / build / serve）
├── tsconfig.json         TS 配置（jsx react-jsx、Bundler 解析）
├── vite.config.ts        Tailwind 插件（Storybook 用同一份 Vite 配置）
├── .storybook/
│   ├── main.ts           故事从哪里来：src/**/*.stories.tsx
│   └── preview.ts        全局装饰：布局、背景色、引入 styles.css
├── src/
│   ├── styles.css        @import "tailwindcss"
│   ├── tokens.ts         设计 token（颜色/字号/间距/圆角）
│   └── components/
│       ├── Button.tsx            组件（纯展示 + props）
│       ├── Button.stories.tsx    状态故事（默认/主色/禁用）
│       ├── StatusNote.tsx        …
│       ├── StatRow.tsx           …
│       └── Tokens.stories.tsx    token 活文档
├── scripts/serve.mjs     零依赖静态服务器
└── docs/                 你正在读的这套说明
```

---

## 你需要知道的三个概念

1. **Story = 组件在某个状态下的快照。**
   不是「示例页面」，而是「这个组件在 `disabled=true` 时长什么样」。所以一个组件通常有 3–5 个 story，而不是 1 个。
2. **Args = 可变输入。**
   story 里写 `args: { label: '存档' }`，Storybook 会生成 Controls 面板，改参数实时看效果；这就是设计和开发对话的接口。
3. **静态包 = 交付物。**
   `npm run build` 产出的 `storybook-static/` 可以直接发给设计或合作方，对方用浏览器打开即可，不需要装任何东西。

---

## 为什么这里没有 Onlook

简短结论：**它不是一个能可靠交付的本地工具**。我们完整试过自托管与桌面版：

- 自托管要 Bun + Supabase CLI + Docker + 数据库迁移，在 Windows 上连续卡在四个环节；
- 上游仓库存在配置与源码不一致（`config.toml` 引用未跟踪的函数）；
- 稳定产物只有 2025-07 的桌面安装包，能力未验证；
- 对使用者（设计师）来说，这是把工程环境成本转嫁给了他。

完整时间线与代价见 [docs/00-为什么不用-Onlook.md](docs/00-为什么不用-Onlook.md)。

---

## Storybook 与 Figma 怎么接

Figma 是**画设计稿**的地方，Storybook 是**看真实组件**的地方；两者不是替代关系。我们从 Figma 只取三样东西：布局、token、状态清单；其余以代码为准。

- 对照与迁移方法：[docs/01-Storybook-与-Figma.md](docs/01-Storybook-与-Figma.md)
- 从现有 Figma 稿迁移的步骤：[docs/03-从Figma迁移.md](docs/03-从Figma迁移.md)

不需要 Figma 付费席位，不需要 Dev Mode，也不需要任何云服务。

---

## 学习路径

按天拆好的练习（story/args → controls/decorators → play/a11y → 构建与交付）：
[docs/02-学习路径.md](docs/02-学习路径.md)

新项目起步检查单：[CHECKLIST.md](CHECKLIST.md)

---

## 常见问题

| 现象 | 处理 |
|---|---|
| 端口被占用 | `npm run storybook -- --port 6007` |
| 改样式不生效 | 确认 `src/styles.css` 被 `preview.ts` 引入；改 `vite.config.ts` 后重启 |
| 静态包打开白屏 | 用 `npm run serve`，不要 `file://` 直接打开 |
| 想加新组件 | 组件放 `src/components/`，同目录加 `*.stories.tsx`，至少三个状态 |

## 许可证

React、Tailwind、Storybook、Vite 均为 MIT，可免费商用；本 starter 随主仓库一起使用。
