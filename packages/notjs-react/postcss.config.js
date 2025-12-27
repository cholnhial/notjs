import postcssImport from 'postcss-import';
import tailwindcss from '@tailwindcss/postcss';
import unwrapLayersPlugin from './unwrap-layers-plugin.js';
import scopeStylesPlugin from './scope-styles-plugin.js';

export default {
  plugins: [
    postcssImport(),
    tailwindcss(),
    unwrapLayersPlugin(),
    scopeStylesPlugin(),
  ],
}