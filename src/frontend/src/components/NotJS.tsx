import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Terminal as XTerm } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import {
  Play,
  RotateCcw,
  Copy,
  Moon,
  Sun,
  Check
} from 'lucide-react'

// Default code templates
const DEFAULT_CODE: Record<string, string> = {
  java: `void main() {
    System.out.println("Hello from NotJS!");
    System.out.println("Enter your name:");

    var scanner = new java.util.Scanner(System.in);
    var name = scanner.nextLine();

    System.out.println("Hello, " + name + "!");
}
`,
  cpp: `#include <iostream>
#include <string>

int main() {
    std::cout << "Hello from NotJS C++!" << std::endl;
    std::cout << "Enter your name: ";

    std::string name;
    std::getline(std::cin, name);

    std::cout << "Hello, " << name << "!" << std::endl;

    return 0;
}
`
}

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

export default function NotJS({
  websocketUrl = 'ws://localhost:8080/terminal',
  apiBaseUrl = 'http://localhost:8080/api',
  initialCode,
  initialLanguage = 'java'
}: NotJSProps) {
  // State
  const [code, setCode] = useState(initialCode || DEFAULT_CODE[initialLanguage] || DEFAULT_CODE.java)
  const [languages, setLanguages] = useState<string[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage)
  const [versions, setVersions] = useState<string[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [defaultVersion, setDefaultVersion] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [codeCopied, setCodeCopied] = useState(false)
  const [consoleCopied, setConsoleCopied] = useState(false)
  const [leftPanelWidth, setLeftPanelWidth] = useState(50) // percentage
  const [isResizing, setIsResizing] = useState(false)

  // Refs
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const inputBufferRef = useRef<string>('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch supported languages on mount
  useEffect(() => {
    fetch(`${apiBaseUrl}/language/supported`)
      .then(res => res.json())
      .then((langs: string[]) => {
        setLanguages(langs)
      })
      .catch(err => {
        console.error('Failed to fetch languages:', err)
      })
  }, [apiBaseUrl])

  // Fetch versions when language changes
  useEffect(() => {
    if (!selectedLanguage) return

    fetch(`${apiBaseUrl}/language/info/${selectedLanguage}`)
      .then(res => res.json())
      .then((info: { availableVersions: string[]; defaultVersion: string }) => {
        setVersions(info.availableVersions)
        setDefaultVersion(info.defaultVersion)
        setSelectedVersion(null) // Reset to default
      })
      .catch(err => {
        console.error('Failed to fetch language info:', err)
      })
  }, [selectedLanguage, apiBaseUrl])

  // Load default code when language changes
  useEffect(() => {
    if (DEFAULT_CODE[selectedLanguage]) {
      setCode(DEFAULT_CODE[selectedLanguage])
    }
  }, [selectedLanguage])

  // Initialize xterm and WebSocket
  useEffect(() => {
    if (!terminalRef.current) return

    // Create terminal
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: isDarkMode ? {
        background: '#0a0a0a',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
      } : {
        background: '#ffffff',
        foreground: '#000000',
        cursor: '#000000',
      },
      scrollback: 1000,
      convertEol: true,
    })

    xtermRef.current = term
    term.open(terminalRef.current)

    // Fit terminal to container
    const fitTerminal = () => {
      if (terminalRef.current && xtermRef.current) {
        const rect = terminalRef.current.getBoundingClientRect()
        const cols = Math.floor((rect.width - 20) / 9)
        const rows = Math.floor((rect.height - 20) / 17)
        xtermRef.current.resize(cols, rows)
      }
    }

    setTimeout(fitTerminal, 100)
    window.addEventListener('resize', fitTerminal)

    // Connect WebSocket
    const ws = new WebSocket(websocketUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      setIsRunning(true)
      term.write('\x1b[1;32m> Connected\x1b[0m\r\n')

      // Send initial execution request
      const executionRequest: ExecutionRequest = {
        language: selectedLanguage,
        code: code,
        version: selectedVersion || defaultVersion || null,
        arguments: []
      }

      ws.send(JSON.stringify(executionRequest))
      term.write(`\x1b[1;36m> Running ${selectedLanguage} ${selectedVersion || defaultVersion || ''}...\x1b[0m\r\n`)
    }

    ws.onmessage = (event) => {
      const data = event.data.replace(/\n/g, '\r\n')
      term.write(data)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      term.write('\x1b[1;31m\r\n[ERROR] WebSocket connection error\x1b[0m\r\n')
    }

    ws.onclose = () => {
      console.log('WebSocket closed')
      setIsRunning(false)
      term.write('\x1b[1;33m\r\n[DISCONNECTED]\x1b[0m\r\n')
    }

    // Handle terminal input
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        if (data === '\x7f' || data === '\b') {
          // Backspace
          if (inputBufferRef.current.length > 0) {
            inputBufferRef.current = inputBufferRef.current.slice(0, -1)
            term.write('\b \b')
          }
        } else if (data === '\r') {
          // Enter - send line
          term.write('\r\n')
          ws.send(inputBufferRef.current + '\n')
          inputBufferRef.current = ''
        } else if (data === '\x03') {
          // Ctrl+C
          term.write('^C\r\n')
          inputBufferRef.current = ''
        } else {
          // Normal character
          inputBufferRef.current += data
          term.write(data)
        }
      }
    })

    return () => {
      window.removeEventListener('resize', fitTerminal)
      term.dispose()
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, []) // Only run once on mount

  // Update terminal theme when dark mode changes
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = isDarkMode ? {
        background: '#0a0a0a',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
      } : {
        background: '#ffffff',
        foreground: '#000000',
        cursor: '#000000',
      }
    }
  }, [isDarkMode])

  // Handle run/restart
  const handleRun = () => {
    if (!xtermRef.current || !terminalRef.current) return

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close()
    }

    // Clear terminal
    xtermRef.current.clear()
    inputBufferRef.current = ''

    // Reconnect
    const ws = new WebSocket(websocketUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket reconnected')
      setIsRunning(true)
      xtermRef.current?.write('\x1b[1;32m> Connected\x1b[0m\r\n')

      const executionRequest: ExecutionRequest = {
        language: selectedLanguage,
        code: code,
        version: selectedVersion || defaultVersion || null,
        arguments: []
      }

      ws.send(JSON.stringify(executionRequest))
      xtermRef.current?.write(`\x1b[1;36m> Running ${selectedLanguage} ${selectedVersion || defaultVersion || ''}...\x1b[0m\r\n`)
    }

    ws.onmessage = (event) => {
      const data = event.data.replace(/\n/g, '\r\n')
      xtermRef.current?.write(data)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      xtermRef.current?.write('\x1b[1;31m\r\n[ERROR] WebSocket connection error\x1b[0m\r\n')
    }

    ws.onclose = () => {
      console.log('WebSocket closed')
      setIsRunning(false)
      xtermRef.current?.write('\x1b[1;33m\r\n[DISCONNECTED]\x1b[0m\r\n')
    }

    // Handle terminal input
    xtermRef.current?.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        if (data === '\x7f' || data === '\b') {
          if (inputBufferRef.current.length > 0) {
            inputBufferRef.current = inputBufferRef.current.slice(0, -1)
            xtermRef.current?.write('\b \b')
          }
        } else if (data === '\r') {
          xtermRef.current?.write('\r\n')
          ws.send(inputBufferRef.current + '\n')
          inputBufferRef.current = ''
        } else if (data === '\x03') {
          xtermRef.current?.write('^C\r\n')
          inputBufferRef.current = ''
        } else {
          inputBufferRef.current += data
          xtermRef.current?.write(data)
        }
      }
    })
  }

  // Handle copy to clipboard
  const copyToClipboard = (text: string, type: 'code' | 'console') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'code') {
        setCodeCopied(true)
        setTimeout(() => setCodeCopied(false), 2000)
      } else {
        setConsoleCopied(true)
        setTimeout(() => setConsoleCopied(false), 2000)
      }
    })
  }

  const copyConsoleOutput = () => {
    if (xtermRef.current) {
      const buffer = xtermRef.current.buffer.active
      let text = ''
      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i)
        if (line) {
          text += line.translateToString(true) + '\n'
        }
      }
      copyToClipboard(text, 'console')
    }
  }

  // Toggle theme
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev)
    if (isDarkMode) {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  }

  // Initialize dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  // Handle resizing panels
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return

      const container = containerRef.current
      const containerRect = container.getBoundingClientRect()
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

      // Constrain between 20% and 80%
      if (newLeftWidth >= 20 && newLeftWidth <= 80) {
        setLeftPanelWidth(newLeftWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  // Refit terminal when panel width changes
  useEffect(() => {
    if (xtermRef.current && terminalRef.current) {
      setTimeout(() => {
        if (terminalRef.current && xtermRef.current) {
          const rect = terminalRef.current.getBoundingClientRect()
          const cols = Math.floor((rect.width - 20) / 9)
          const rows = Math.floor((rect.height - 20) / 17)
          xtermRef.current.resize(cols, rows)
        }
      }, 10)
    }
  }, [leftPanelWidth])

  return (
    <div className="flex flex-col h-screen w-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">NotJS</h1>
            <img
              src="/notjslogo.png"
              alt="NotJS Logo"
              className="h-8 w-8 object-contain"
            />
          </div>

          {/* Language Selector */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {languages.map(lang => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Version Selector */}
          {versions.length > 0 && (
            <select
              value={selectedVersion || defaultVersion || ''}
              onChange={(e) => setSelectedVersion(e.target.value || null)}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {versions.map(version => (
                <option key={version} value={version}>
                  v{version} {version === defaultVersion ? '(default)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-gray-700" />
          )}
        </button>
      </div>

      {/* Main Content */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden relative">
        {/* Code Panel */}
        <div
          className="flex flex-col border-r border-gray-200 dark:border-gray-800"
          style={{ width: `${leftPanelWidth}%` }}
        >
          {/* Code Panel Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">CODE</h2>
            <div className="flex items-center gap-2">
              {/* Run/Restart Button */}
              <button
                onClick={handleRun}
                className={`p-2 rounded-md transition-colors ${
                  isRunning
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
                title={isRunning ? 'Restart program' : 'Run program'}
              >
                {isRunning ? (
                  <RotateCcw className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>

              {/* Copy Code Button */}
              <button
                onClick={() => copyToClipboard(code, 'code')}
                className="p-2 rounded-md bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                title="Copy code"
              >
                {codeCopied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                )}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={selectedLanguage}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme={isDarkMode ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                padding: { top: 10, bottom: 10 }
              }}
            />
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className={`w-1 bg-gray-300 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-600 cursor-col-resize transition-colors ${
            isResizing ? 'bg-blue-500 dark:bg-blue-600' : ''
          }`}
          onMouseDown={handleMouseDown}
        />

        {/* Console Panel */}
        <div className="flex-1 flex flex-col">
          {/* Console Panel Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">CONSOLE</h2>
            {/* Copy Console Button */}
            <button
              onClick={copyConsoleOutput}
              className="p-2 rounded-md bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
              title="Copy output"
            >
              {consoleCopied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </div>

          {/* XTerm Terminal */}
          <div
            ref={terminalRef}
            className="flex-1 overflow-hidden bg-white dark:bg-gray-950 p-2"
          />
        </div>
      </div>
    </div>
  )
}