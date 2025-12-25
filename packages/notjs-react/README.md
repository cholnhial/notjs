# notjs-react

A React component for interactive code execution with real-time WebSocket terminal support. Built with Monaco Editor and xterm.js.

## Prerequisites

**NotJS Server Required**: This component requires a NotJS server to handle code execution. You can self-host the server by following the instructions at [https://github.com/cholnhial/notjs](https://github.com/cholnhial/notjs)

## Installation

```bash
npm install notjs-react
```

## Usage

```tsx
import { NotJS } from 'notjs-react'
import 'notjs-react/styles.css'

function App() {
  return (
    <NotJS
      apiBaseUrl="http://localhost:8080/api"
      websocketUrl="ws://localhost:8080/terminal"
      initialLanguage="java"
      initialVersion="25"
      initialDarkMode={true}
    />
  )
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiBaseUrl` | `string` | `"http://localhost:8080/api"` | Base URL for the API |
| `websocketUrl` | `string` | `"ws://localhost:8080/terminal"` | WebSocket endpoint URL |
| `initialLanguage` | `string` | `"java"` | Initial programming language |
| `initialVersion` | `string` | `"25"` | Initial language version |
| `initialDarkMode` | `boolean` | `true` | Enable dark mode by default |
| `initialCode` | `string` | (language default) | Custom starting code |
| `hideHeader` | `boolean` | `false` | Hide header for embedding |

## Features

- 🎨 Monaco Editor integration for code editing
- 💻 Real-time terminal with xterm.js
- 🌓 Dark/Light mode support
- 📋 Copy code and console output
- ↔️ Resizable editor/console panels
- 🔌 WebSocket-based code execution
- 🎯 TypeScript support
- 📦 Zero configuration required

## License

MIT