# NotJS Component

A React component for running compiled languages (Java, C, C++, Go, Rust) in the browser with a Monaco code editor and real-time console output.

## Features

- 🎨 **Monaco Editor** - Full-featured code editor with syntax highlighting
- 🔌 **WebSocket Integration** - Real-time communication with execution backend
- 🌓 **Dark/Light Mode** - Toggle between themes
- 📋 **Copy to Clipboard** - Copy code and console output
- ▶️ **Run/Restart Controls** - Execute and restart programs
- 🔄 **Language & Version Selection** - Choose from multiple languages and versions
- 📊 **Live Console Output** - See program output in real-time
- 💅 **Tailwind CSS Styled** - Beautiful, responsive UI

## Installation

```bash
npm install @monaco-editor/react lucide-react
# Tailwind CSS is required
```

## Usage

### Basic Usage

```tsx
import NotJS from './components/NotJS'

function App() {
  return <NotJS />
}
```

### With Custom Configuration

```tsx
import NotJS from './components/NotJS'

const customCode = `void main() {
    System.out.println("Custom starter code!");
}`

function App() {
  return (
    <NotJS
      websocketUrl="ws://localhost:8080/terminal"
      apiBaseUrl="http://localhost:8080/api"
      initialCode={customCode}
      initialLanguage="java"
    />
  )
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `websocketUrl` | `string` | `'ws://localhost:8080/terminal'` | WebSocket endpoint for code execution |
| `apiBaseUrl` | `string` | `'http://localhost:8080/api'` | REST API base URL for language info |
| `initialCode` | `string` | Default Java code | Initial code in the editor |
| `initialLanguage` | `string` | `'java'` | Initially selected language |

## Backend Requirements

The component expects the following API endpoints:

### 1. Get Supported Languages
```
GET /api/language/supported
Response: ["java", "c", "cpp", ...]
```

### 2. Get Language Info
```
GET /api/language/info/{language}
Response: {
  "language": "java",
  "availableVersions": ["8", "11", "17", "21", "25"],
  "defaultVersion": "25"
}
```

### 3. WebSocket Execution
The WebSocket endpoint should accept this format for the first message:

```json
{
  "language": "java",
  "code": "void main() { ... }",
  "version": "25",
  "arguments": []
}
```

Subsequent messages are sent as stdin input to the running process.

## Styling

The component uses Tailwind CSS and includes custom scrollbar styling. Make sure your project has Tailwind configured with the `dark` mode class strategy:

```js
// tailwind.config.js
export default {
  darkMode: 'class',
  // ...
}
```

Also include the custom scrollbar utilities in your CSS:

```css
/* See index.css for scrollbar-custom class definition */
```

## Features Overview

### Editor Panel (Left)
- Monaco editor with language-specific syntax highlighting
- Line numbers and code folding
- Word wrap enabled
- Custom theme matching light/dark mode

### Console Panel (Right)
- Real-time output streaming
- Auto-scroll to latest output
- Custom scrollbar matching editor style
- Copy entire console output

### Controls
- **Play Button** (Green) - Start execution (shown initially)
- **Restart Button** (Orange) - Restart the running program
- **Copy Buttons** - Copy code or console output to clipboard
- **Language Selector** - Choose programming language
- **Version Selector** - Select language version
- **Theme Toggle** - Switch between light and dark modes

## TypeScript

The component exports TypeScript types:

```typescript
export interface ExecutionRequest {
  language: string
  code: string
  version: string | null
  arguments: string[]
}

export interface NotJSProps {
  websocketUrl?: string
  apiBaseUrl?: string
  initialCode?: string
  initialLanguage?: string
}
```

## License

See project LICENSE file.