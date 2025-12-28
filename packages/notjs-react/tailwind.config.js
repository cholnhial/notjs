export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: ['class', '.notjs-container'],
  important: '.notjs-container', // Scope all utilities to .notjs-container
  corePlugins: {
    preflight: false, // Disable Tailwind's base reset styles
  },
}