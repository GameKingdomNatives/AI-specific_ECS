# Storybook 起步套件

**一句话**：这是一个只做界面（UI）的小工程。它用 Storybook 把每个组件的每种状态摆出来给你看；**Storybook 就是这套东西的唯一事实源**——组件代码是素材，Storybook 里的每个画面是定义，导出的静态网页是交付物。

它**不依赖任何业务项目**：没有后端、没有数据库、没有游戏引擎、没有云服务。复制到任何目录，`npm install` 就能跑。

---

## 先用 30 秒理解 Storybook（不讲术语）

想象一张长桌，桌上摆着同一个按钮的五个版本：正常、鼠标悬停、按下、不可点、加载中。
你不用启动整个应用，就能挨个看、挨个改参数，还能把这张桌子拍成一本相册发给别人。

- **长桌 + 摆盘工具** = Storybook
- **每个版本的照片** = 一个 story
- **相册（导出成网页）** = 静态构建
- **改参数的面板** = Controls

故事（story）不是「剧情」，它只是「这个组件在某种输入下长什么样」的一张快照。

---

## 五分钟跑起来

前提：电脑上有 Node ≥ 22（在终端输入 `node -v` 能看到版本号即可）。

```bash
cd starters/ui-storybook-kit
npm install
npm run storybook
```

浏览器打开终端里显示的地址（通常是 `http://localhost:6006`）。

如果只是想把结果发给别人看：

```bash
npm run build     # 生成 storybook-static/ 目录
npm run serve     # 打开 http://localhost:7007
```

---

## 打开后会看到什么

```
┌──────────────┬──────────────────────────────┐
│ 左侧：目录     │ 中间：组件真实渲染            │
│ 基础组件       │                              │
│  · 按钮        │        [ 提交 ]              │
│  · 状态文字    │                              │
│  · 信息行      │                              │
│ 设计           │                              │
│  · 颜色与尺寸  ├──────────────────────────────┤
│              │ 下方：Controls（改参数）       │
└──────────────┴──────────────────────────────┘
```

- 点左侧任意一项，中间就换成那个状态；
- 下方 Controls 里改 `label`、`disabled` 等，画面立刻变；
- 右上角可切换背景、尺寸、全屏，方便截图对比。

---

## 术语表（全部用大白话）

| 你会看到的词 | 它到底指什么 | 类比 |
|---|---|---|
| **story** | 组件在某一组输入下的样子，一个文件里可以写很多个 | 一张产品照 |
| **args** | 传给组件的输入值（文字、开关、数字） | 拍照时的道具和布景 |
| **Controls** | 页面上让你现场改 args 的面板 | 相机的旋钮 |
| **argTypes** | 告诉 Controls 每个参数怎么调（输入框/单选/开关） | 旋钮的刻度说明 |
| **decorators** | 给一组 story 统一套一层外壳（比如统一背景） | 统一的拍摄背景板 |
| **parameters** | 全局或单个 story 的设置（布局、背景色） | 相机默认设置 |
| **addon** | 给 Storybook 加功能的插件（可访问性、文档页等） | 相机附件 |
| **static build** | 把整个 Storybook 导出成一组网页文件 | 把相册印成 PDF |
| **MDX** | 用 Markdown 写文档页（本套件暂未使用） | 相册里的说明页 |

> 记住一句就够：**story 是「状态快照」，不是「故事剧情」。**

---

## 文件怎么对应

```
starters/ui-storybook-kit/
├── package.json              依赖 + 三个命令（storybook / build / serve）
├── tsconfig.json             TypeScript 配置
├── vite.config.ts            构建配置（Tailwind 插件）
├── .storybook/
│   ├── main.ts               Storybook 去哪找 story（src/**/*.stories.tsx）
│   └── preview.ts            全局外观（背景色、引入样式）
├── src/
│   ├── styles.css            样式入口（Tailwind）
│   ├── tokens.ts             颜色/字号/间距/圆角（唯一事实源）
│   └── components/
│       ├── Button.tsx        「按钮」组件本身
│       ├── Button.stories.tsx  按钮的 3 个状态（默认/主色/禁用）
│       ├── StatusText.tsx / .stories.tsx   一行状态文字
│       ├── InfoRow.tsx / .stories.tsx      「名称 + 数值」一行
│       └── Tokens.stories.tsx  颜色与尺寸的可视化清单
├── scripts/serve.mjs         本地静态服务器（无需安装任何东西）
└── docs/                     延伸阅读（见文末）
```

规则：**一个组件一个 `.tsx`，旁边一个同名 `.stories.tsx`**。组件只接收参数、不写业务逻辑；状态写在 stories 里。

---

## 加一个组件：四步

以「标签（Tag）」为例。

**第 1 步**：建 `src/components/Tag.tsx`

```tsx
export function Tag({ text }: { text: string }) {
  return <span className="rounded bg-stone-800 px-2 py-0.5 text-xs text-stone-200">{text}</span>;
}
```

**第 2 步**：建 `src/components/Tag.stories.tsx`

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tag } from './Tag.js';

const meta = {
  title: '基础组件/标签',
  component: Tag,
  args: { text: '新功能' },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 默认: Story = {};
export const 长文字: Story = { args: { text: '这是一个很长很长很长很长的标签文字' } };
```

**第 3 步**：保存，Storybook 自动刷新，左侧出现「基础组件/标签」。

**第 4 步**：至少补三个状态（默认、边界、不可用/空），再提交。

---

## 交付给别人

| 你想给对方什么 | 做法 |
|---|---|
| 能交互的预览（对方也装了 Node） | 把整个目录打包给对方，`npm install && npm run storybook` |
| 只能看的成品（对方什么都不用装） | `npm run build`，把 `storybook-static/` 压缩成 zip 发过去；解压后用任意静态服务器打开 |
| 内网地址 | 在服务器上跑 `node scripts/serve.mjs storybook-static 7007` |

---

## 常见问题

| 现象 | 处理 |
|---|---|
| 端口被占用 | `npm run storybook -- --port 6007` |
| 改样式没反应 | 确认 `src/styles.css` 被 `.storybook/preview.ts` 引入；改 `vite.config.ts` 后要重启 |
| 静态包打开是白屏 | 不要双击 `index.html`（浏览器会拦截模块加载），用 `npm run serve` |
| 组件里能写接口请求吗 | 不建议；组件只接收参数，数据由外部传入，story 里用假数据 |
| 需要 Figma 才能用吗 | 不需要；Figma 只是可选的画草图工具 |

---

## 延伸阅读（都在 `docs/` 里）

- [为什么我们放弃了 Onlook](docs/00-为什么不用-Onlook.md)：一次可视化编辑器的评估记录与代价拆解
- [Storybook 与 Figma 各管什么](docs/01-Storybook-与-Figma.md)：概念对照表，怎么从设计稿翻译过来
- [四天学习路径](docs/02-学习路径.md)：每天 30–45 分钟，全部可动手
- [从设计稿迁移到 Storybook：七步](docs/03-从Figma迁移.md)
- [新项目检查单](CHECKLIST.md)

## 许可证

React、Tailwind、Storybook、Vite 均为 MIT，可免费商用。本套件可独立复制、独立发布。
