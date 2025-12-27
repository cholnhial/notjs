import tailwindcss from '@tailwindcss/postcss';
import unwrapLayersPlugin from './unwrap-layers-plugin.js';

export default {
  plugins: [
    tailwindcss(),
    unwrapLayersPlugin(),
  ],
}