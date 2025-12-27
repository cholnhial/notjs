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

      // Skip keyframes but allow media queries
      if (rule.parent && rule.parent.type === 'atrule') {
        const parentName = rule.parent.name;
        if (parentName === 'keyframes' || parentName === 'property' || parentName === 'supports') {
          return;
        }
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

          // Handle .dark prefix - it should be on the same element as .notjs-root
          // Transform .dark .something to .dark .notjs-root .something
          if (trimmed.startsWith('.dark ')) {
            return `.dark .notjs-root ${trimmed.substring(6)}`;
          }

          // Handle media query dark mode: @media(prefers-color-scheme:dark){.dark\:...}
          // These should become .dark .notjs-root .utility
          if (trimmed.startsWith('.dark\\:')) {
            return `.dark .notjs-root .${trimmed.substring(7)}`;
          }

          // Handle hover and other pseudo-classes with dark
          if (trimmed.includes('.dark\\:')) {
            // Extract the base selector and transform it
            const parts = trimmed.split('.dark\\:');
            if (parts.length === 2) {
              return `.dark .notjs-root .${parts[0]}${parts[1]}`;
            }
          }

          // For other selectors, prefix with .notjs-root
          return `.notjs-root ${trimmed}`;
        })
        .join(',\n');
    }
  };
}

scopeStylesPlugin.postcss = true;