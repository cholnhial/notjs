# notjs-react

<p align="center">
  <img src="https://raw.githubusercontent.com/cholnhial/notjs/main/docs/images/notjslogo-transparent.png" alt="NotJS Logo" width="200"/>
</p>

A React component for interactive code playgrounds with real-time WebSocket terminal support. Built with Monaco Editor and xterm.js.

NotJS is a backend (Spring Boot) and React library for code playgrounds for compiled languages. It's intended to be used mainly on blogs where you want to demo language features. This is the React library component that connects to a NotJS server.

**[View Demo](https://notjs.chol.dev)** | **[Server Repository](https://github.com/cholnhial/notjs)**

## Prerequisites

**NotJS Server Required**: This component requires a NotJS server to handle code execution. You can self-host the server by following the instructions at [https://github.com/cholnhial/notjs](https://github.com/cholnhial/notjs)

### Supported Languages

- **Java** (versions 8, 11, 17, 21, 25)
- **C** (C89, C99, C11, C17, C23)
- **C++** (C++98, C++11, C++14, C++17, C++20, C++23)
- **Go** (version 1.19.8)
- **Rust** (version 1.63.0)

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

## Examples

### Basic Usage

```tsx
import { NotJS } from 'notjs-react'
import 'notjs-react/styles.css'

function MyBlogPost() {
  return (
    <div>
      <h1>Java Records Tutorial</h1>
      <p>Here's an example of Java records:</p>

      <NotJS
        apiBaseUrl="https://your-notjs-api.com/api"
        websocketUrl="wss://your-notjs-api.com/terminal"
        initialLanguage="java"
        initialVersion="21"
        initialCode={`public record Person(String name, int age) {}

public class Main {
    public static void main(String[] args) {
        Person person = new Person("Alice", 30);
        System.out.println(person);
    }
}`}
      />
    </div>
  )
}
```

### Embedding in MDX

Perfect for use in blog posts written with MDX:

```mdx
import { NotJS } from 'notjs-react'
import 'notjs-react/styles.css'

# Learning Rust

Try out this Rust example:

<NotJS
  apiBaseUrl="https://your-notjs-api.com/api"
  websocketUrl="wss://your-notjs-api.com/terminal"
  initialLanguage="rust"
  initialCode={`fn main() {
    println!("Hello from Rust!");
}`}
/>
```

### Minimal Embedded View

Hide the header for a cleaner embedded experience:

```tsx
<NotJS
  apiBaseUrl="https://your-notjs-api.com/api"
  websocketUrl="wss://your-notjs-api.com/terminal"
  initialLanguage="cpp"
  hideHeader={true}
  initialCode={`#include <iostream>

int main() {
    std::cout << "Hello World!" << std::endl;
    return 0;
}`}
/>
```

## Development

To develop the library locally:

1. Clone the repository:
```bash
git clone https://github.com/cholnhial/notjs
cd notjs/packages/notjs-react
```

2. Install dependencies:
```bash
npm install
```

3. Build the library in watch mode:
```bash
npm run dev
```

4. Link the library for local testing:
```bash
npm link
```

5. In your test project:
```bash
npm link notjs-react
```

## API

### Component Props

The `NotJS` component accepts the following props:

#### `apiBaseUrl` (optional)
- Type: `string`
- Default: `"http://localhost:8080/api"`
- Description: Base URL for the NotJS API server

#### `websocketUrl` (optional)
- Type: `string`
- Default: `"ws://localhost:8080/terminal"`
- Description: WebSocket endpoint URL for real-time communication

#### `initialLanguage` (optional)
- Type: `"java" | "c" | "cpp" | "go" | "rust"`
- Default: `"java"`
- Description: Programming language to start with

#### `initialVersion` (optional)
- Type: `string`
- Default: `"25"` (for Java)
- Description: Language version to use. Available versions depend on the language.

#### `initialDarkMode` (optional)
- Type: `boolean`
- Default: `true`
- Description: Whether to start in dark mode

#### `initialCode` (optional)
- Type: `string`
- Default: Language-specific default code
- Description: Code to display initially in the editor

#### `hideHeader` (optional)
- Type: `boolean`
- Default: `false`
- Description: Hide the header (language selector, version, theme toggle) for embedded views

## Architecture

The NotJS component architecture:

```
┌─────────────────────────────────────────────────────┐
│                 NotJS React Component                │
│  ┌────────────────┐         ┌──────────────────┐   │
│  │ Monaco Editor  │         │  xterm.js        │   │
│  │ (Code Input)   │         │  (Terminal)      │   │
│  └────────────────┘         └──────────────────┘   │
│         │                            │              │
│         │                            │              │
│         ▼                            ▼              │
│  ┌─────────────────────────────────────────────┐   │
│  │         WebSocket Connection                 │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  NotJS Server       │
         │  (Spring Boot)      │
         └─────────────────────┘
```

## Contributing

Contributions are welcome! Please visit the [main repository](https://github.com/cholnhial/notjs) to contribute.

## License

MIT

---

**Note**: This component requires a running NotJS server. For setup instructions, visit [https://github.com/cholnhial/notjs](https://github.com/cholnhial/notjs)