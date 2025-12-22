import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';

const Terminal = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const inputBufferRef = useRef<string>('');

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
      rows: 24,
      cols: 80,
    });

    xtermRef.current = term;
    term.open(terminalRef.current);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/terminal`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      // Convert LF to CRLF for proper terminal display
      const data = event.data.replace(/\n/g, '\r\n');
      term.write(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      term.write('\r\nWebSocket error occurred\r\n');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      term.write('\r\nProgram complete.\r\n');
    };

    // Local line buffering: collect input and send complete line on Enter
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Handle backspace (ASCII 127 or 8)
        if (data === '\x7f' || data === '\b') {
          if (inputBufferRef.current.length > 0) {
            inputBufferRef.current = inputBufferRef.current.slice(0, -1);
            term.write('\b \b');
          }
        } else if (data === '\r') {
          // Send complete line with newline
          term.write('\r\n');
          ws.send(inputBufferRef.current + '\n');
          inputBufferRef.current = '';
        } else {
          // Add to buffer and echo
          inputBufferRef.current += data;
          term.write(data);
        }
      }
    });

    return () => {
      term.dispose();
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
    }}>
      <div
        ref={terminalRef}
        style={{
          padding: '20px',
          borderRadius: '8px',
          backgroundColor: '#1e1e1e',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        }}
      />
    </div>
  );
};

export default Terminal;