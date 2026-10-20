import type { StorybookConfig } from '@storybook/react-vite';

/** 组件画布：只覆盖 DOM 层，不渲染 Pixi 战场。 */
const config: StorybookConfig = {
  stories: ['../src/ui/**/*.stories.tsx'],
  addons: [],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
};

export default config;
