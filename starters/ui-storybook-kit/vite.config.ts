import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/** 只有 Storybook 与 DOM 组件，没有游戏引擎。 */
export default defineConfig({
  plugins: [tailwindcss()],
});
