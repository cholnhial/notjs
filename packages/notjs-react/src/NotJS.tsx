import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Terminal as XTerm } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  RotateCcw,
  Copy,
  Moon,
  Sun,
  Check,
  AlertCircle
} from 'lucide-react'
import notjsLogo from './assets/notjslogo.png'

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
`,
  c: `#include <stdio.h>
#include <string.h>

int main() {
    printf("Hello from NotJS C!\\n");
    printf("Enter your name: ");

    char name[100];
    if (fgets(name, sizeof(name), stdin) != NULL) {
        // Remove trailing newline
        name[strcspn(name, "\\n")] = '\\0';
        printf("Hello, %s!\\n", name);
    }

    return 0;
}
`,
  rust: `use std::io::{self, Write};

fn main() {
    println!("Hello from NotJS Rust!");
    print!("Enter your name: ");
    io::stdout().flush().unwrap();

    let mut name = String::new();
    io::stdin()
        .read_line(&mut name)
        .expect("Failed to read line");

    let name = name.trim();
    println!("Hello, {}!", name);
}
`,
  go: `package main

import (
    "bufio"
    "fmt"
    "os"
    "strings"
)

func main() {
    fmt.Println("Hello from NotJS Go!")
    fmt.Print("Enter your name: ")

    reader := bufio.NewReader(os.Stdin)
    name, _ := reader.ReadString('\\n')

    // Remove trailing newline
    name = strings.TrimSpace(name)

    fmt.Printf("Hello, %s!\\n", name)
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
  initialVersion?: string
  initialDarkMode?: boolean
  hideHeader?: boolean
  editorWidthPercent?: number
}

export default function NotJS({
  websocketUrl = 'ws://localhost:8080/terminal',
  apiBaseUrl = 'http://localhost:8080/api',
  initialCode,
  initialLanguage = 'java',
  initialVersion = '25',
  initialDarkMode = true,
  hideHeader = false,
  editorWidthPercent = 50
}: NotJSProps) {
  // State
  const [code, setCode] = useState(initialCode || DEFAULT_CODE[initialLanguage] || DEFAULT_CODE.java)
  const [languages, setLanguages] = useState<string[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage)
  const [languageInfo, setLanguageInfo] = useState<{versions: string[], default: string | null, code: string}>({
    default: null,
    code: '',
    versions: []
  })
  const [versions, setVersions] = useState<string[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string | null>(initialVersion)
  const [defaultVersion, setDefaultVersion] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(initialDarkMode)
  const [codeCopied, setCodeCopied] = useState(false)
  const [consoleCopied, setConsoleCopied] = useState(false)
  const [leftPanelWidth, setLeftPanelWidth] = useState(editorWidthPercent) // percentage
  const [isResizing, setIsResizing] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Refs
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const inputBufferRef = useRef<string>('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Check API availability for initial language and version
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/language/info/${initialLanguage}`)
        if (!response.ok) {
          throw new Error('Language not supported')
        }
        const info = await response.json()

        if (!info.availableVersions.includes(initialVersion)) {
          setIsAvailable(false)
          setErrorMessage(
            `${initialLanguage.toUpperCase()} version ${initialVersion} is not available. Available versions: ${info.availableVersions.join(', ')}`
          )
        } else {
          setIsAvailable(true)
        }
      } catch (error) {
        setIsAvailable(false)
        setErrorMessage(
          `Failed to connect to NotJS API at ${apiBaseUrl}. Please ensure the Spring Boot backend is running.`
        )
      }
    }

    checkAvailability()
  }, [apiBaseUrl, initialLanguage, initialVersion])

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
        setSelectedVersion(info.defaultVersion)
        setLanguageInfo({
          default: info.defaultVersion,
          versions: info.availableVersions,
          code: DEFAULT_CODE[selectedLanguage]
        })
        setCode(DEFAULT_CODE[selectedLanguage])
      })
      .catch(err => {
        console.error('Failed to fetch language info:', err)
      })
  }, [selectedLanguage, apiBaseUrl])

  // Initialize xterm and WebSocket
  useEffect(() => {
    if (!terminalRef.current || isAvailable !== true) return

    // Wait for versions to be loaded before connecting
    // (except on initial mount where defaultVersion may not be set yet)
    if (defaultVersion === null && versions.length === 0) return

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
      term.write('\x1b[1;32m> Connected\x1b[0m\r\n')

      // Send initial execution request
      const executionRequest: ExecutionRequest = {
        language: selectedLanguage,
        code: languageInfo.code,
        version:  languageInfo.default || selectedVersion || null,
        arguments: []
      }

      ws.send(JSON.stringify(executionRequest))
      term.write(`\x1b[1;36m> Running ${selectedLanguage} ${languageInfo.default || defaultVersion || ''}...\x1b[0m\r\n`)
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
  }, [isAvailable, websocketUrl, languageInfo, isDarkMode])

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

    // Close existing connection and remove its handlers to prevent them from writing to terminal
    if (wsRef.current) {
      const oldWs = wsRef.current
      // Remove all event handlers before closing
      oldWs.onopen = null
      oldWs.onmessage = null
      oldWs.onerror = null
      oldWs.onclose = null
      oldWs.close()
    }

    // Clear terminal completely (including scrollback buffer)
    xtermRef.current.reset()
    xtermRef.current.clear()
    inputBufferRef.current = ''

    // Reconnect
    const ws = new WebSocket(websocketUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket reconnected')
      xtermRef.current?.write('\x1b[1;32m> Connected\x1b[0m\r\n')

      const executionRequest: ExecutionRequest = {
        language: selectedLanguage,
        code: code,
        version: selectedVersion || languageInfo.default || null,
        arguments: []
      }

      ws.send(JSON.stringify(executionRequest))
      xtermRef.current?.write(`\x1b[1;36m> Running ${selectedLanguage} ${selectedVersion || languageInfo.default || defaultVersion || ''}...\x1b[0m\r\n`)
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

  // Show error fallback if API is not available
  if (isAvailable === false) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-neutral-50 dark:bg-neutral-950 p-8">
        <div className="max-w-2xl w-full border-2 border-red-500 rounded-2xl p-8 bg-white dark:bg-neutral-900">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-500 mb-3">
                NotJS Configuration Error
              </h2>
              <p className="text-red-700 dark:text-red-400 text-lg leading-relaxed">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state while checking availability
  if (isAvailable === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="text-neutral-600 dark:text-neutral-400 text-lg">
          Loading NotJS...
        </div>
      </div>
    )
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <style>{`
        /* Custom scrollbar for xterm terminal */
        .xterm-viewport::-webkit-scrollbar {
          width: 12px;
        }

        .xterm-viewport::-webkit-scrollbar-track {
          background: transparent;
        }

        .xterm-viewport::-webkit-scrollbar-thumb {
          background: #a3a3a3;
          border-radius: 6px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .xterm-viewport::-webkit-scrollbar-thumb:hover {
          background: #8a8a8a;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        /* Dark mode scrollbar */
        .dark .xterm-viewport::-webkit-scrollbar-thumb {
          background: #525252;
          border-radius: 6px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .dark .xterm-viewport::-webkit-scrollbar-thumb:hover {
          background: #6b6b6b;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        /* Firefox scrollbar */
        .xterm-viewport {
          scrollbar-width: thin;
          scrollbar-color: #a3a3a3 transparent;
        }

        .dark .xterm-viewport {
          scrollbar-color: #525252 transparent;
        }
      `}</style>
      <div className="flex flex-col h-screen w-screen bg-neutral-50 dark:bg-neutral-950">
        {/* Header */}
        {!hideHeader && (
          <div className="flex items-center justify-between px-8 py-3 bg-white/80 dark:bg-neutral-900/80 backdrop-blur border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
                NotJS
              </h1>
              <img
                  src={notjsLogo}
                  alt="NotJS Logo"
                  className="h-10 object-contain rounded-xl"
              />
            </div>

            <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
            >
              {languages.map(lang => (
                  <option key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </option>
              ))}
            </select>

            {versions.length > 0 && (
                <select
                    value={selectedVersion || defaultVersion || ''}
                    onChange={(e) => setSelectedVersion(e.target.value || null)}
                    className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                >
                  {versions.map(version => (
                      <option key={version} value={version}>
                        v{version} {version === defaultVersion ? '(default)' : ''}
                      </option>
                  ))}
                </select>
            )}
          </div>

          <button
              onClick={toggleTheme}
              className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
          >
            {isDarkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
                <Moon className="w-5 h-5 text-neutral-700" />
            )}
          </button>
        </div>
        )}

        {/* Main Content */}
        <div ref={containerRef} className="flex flex-1 overflow-hidden relative">
          {/* Code Panel */}
          <div
              className="flex flex-col bg-white dark:bg-neutral-900"
              style={{ width: `${leftPanelWidth}%`, flexShrink: 0 }}
          >
            {/* Code Header */}
            <div className={`flex items-center justify-between px-8 bg-neutral-100/70 dark:bg-neutral-900 border-b border-black/5 dark:border-white/5 ${hideHeader ? 'py-2' : ''}`}>
              <h2 className="text-sm font-semibold tracking-wide text-neutral-600 dark:text-neutral-400">
                CODE
              </h2>

              <div className="flex items-center gap-2">
                {/* Restart */}
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                        onClick={handleRun}
                        className="p-1.5 rounded-lg transition bg-orange-500/90 hover:bg-orange-500 text-white"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                        className="rounded-lg bg-neutral-900 dark:bg-neutral-800 px-3 py-1.5 text-xs text-white shadow-lg"
                        sideOffset={5}
                    >
                      Restart program
                      <Tooltip.Arrow className="fill-neutral-900 dark:fill-neutral-800" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>

                {/* Copy Code */}
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                        onClick={() => copyToClipboard(code, 'code')}
                        className="p-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition"
                    >
                      {codeCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                          <Copy className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                      )}
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                        className="rounded-lg bg-neutral-900 dark:bg-neutral-800 px-3 py-1.5 text-xs text-white shadow-lg"
                        sideOffset={5}
                    >
                      Copy code
                      <Tooltip.Arrow className="fill-neutral-900 dark:fill-neutral-800" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </div>
            </div>

            <div className="flex-1 overflow-hidden rounded-b-2xl">
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
                    padding: { top: 12, bottom: 12 }
                  }}
              />
            </div>
          </div>

          {/* Resize Handle */}
          <div
              className={`w-1 shrink-0 bg-black/5 dark:bg-white/5 hover:bg-blue-500 cursor-col-resize transition ${
                  isResizing ? 'bg-blue-500' : ''
              }`}
              onMouseDown={handleMouseDown}
          />

          {/* Console Panel */}
          <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-neutral-950">
            <div className={`flex items-center justify-between px-8 bg-neutral-100/70 dark:bg-neutral-900 border-b border-black/5 dark:border-white/5 shrink-0 ${hideHeader ? 'py-2' : ''}`}>
              <h2 className="text-sm font-semibold tracking-wide text-neutral-600 dark:text-neutral-400">
                CONSOLE
              </h2>

              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                      onClick={copyConsoleOutput}
                      className="p-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition"
                  >
                    {consoleCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                        <Copy className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                    )}
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                      className="rounded-lg bg-neutral-900 dark:bg-neutral-800 px-3 py-1.5 text-xs text-white shadow-lg"
                      sideOffset={5}
                  >
                    Copy output
                    <Tooltip.Arrow className="fill-neutral-900 dark:fill-neutral-800" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>

            <div
                ref={terminalRef}
                className="flex-1 overflow-hidden rounded-b-2xl bg-white dark:bg-neutral-950 p-3"
            />
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  )
}