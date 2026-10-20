import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/** 战场仍是 Pixi canvas；Tailwind 只服务于 DOM 覆盖层。 */
export default defineConfig({
  plugins: [tailwindcss()],
});
