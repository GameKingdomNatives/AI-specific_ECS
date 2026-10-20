import type { Preview } from '@storybook/react-vite';
import '../src/styles.css';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'canvas',
      values: [{ name: 'canvas', value: '#111111' }],
    },
  },
};

export default preview;
