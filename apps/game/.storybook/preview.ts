import type { Preview } from '@storybook/react-vite';
import '../src/ui/app.css';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'battlefield',
      values: [{ name: 'battlefield', value: '#111111' }],
    },
  },
};

export default preview;
