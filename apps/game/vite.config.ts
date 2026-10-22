import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { sceneSavePlugin } from './scene-save-plugin.mjs';

/** 战场仍是 Pixi canvas；Tailwind 只服务于 DOM 覆盖层。 */
export default defineConfig({
  plugins: [tailwindcss(), sceneSavePlugin()],
});
