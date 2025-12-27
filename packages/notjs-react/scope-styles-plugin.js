/**
 * PostCSS plugin to scope all styles to .notjs-root
 * This prevents NotJS styles from affecting the parent page
 */
export default function scopeStylesPlugin() {
  return {
    postcssPlugin: 'scope-notjs-styles',
    Rule(rule) {
      // Skip xterm styles and already scoped styles
      if (rule.selector.includes('.xterm') || rule.selector.includes('.notjs-root')) {
        return;
      }

      // Skip keyframes and other at-rules
      if (rule.parent && rule.parent.type === 'atrule') {
        return;
      }

      // Scope all other rules to .notjs-root
      rule.selector = rule.selector
        .split(',')
        .map(selector => {
          const trimmed = selector.trim();

          // Skip :root, html, body, *, ::before, ::after pseudo-elements at root
          if (
            trimmed === ':root' ||
            trimmed === 'html' ||
            trimmed === 'body' ||
            trimmed.startsWith('*') ||
            trimmed === '::before' ||
            trimmed === '::after' ||
            trimmed === '::backdrop'
          ) {
            return `.notjs-root${trimmed === '*' ? ' *' : ''}`;
          }

          // For other selectors, prefix with .notjs-root
          return `.notjs-root ${trimmed}`;
        })
        .join(',\n');
    }
  };
}

scopeStylesPlugin.postcss = true;