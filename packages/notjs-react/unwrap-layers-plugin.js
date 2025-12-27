/**
 * PostCSS plugin to unwrap @layer directives
 * This removes the @layer wrappers while preserving the content inside them
 */
export default function unwrapLayersPlugin() {
  return {
    postcssPlugin: 'unwrap-layers',
    AtRule: {
      layer(atRule) {
        // Get all the nodes inside the @layer block
        const nodes = atRule.nodes || [];

        // Replace the @layer with its contents
        atRule.replaceWith(nodes);
      }
    }
  };
}

unwrapLayersPlugin.postcss = true;