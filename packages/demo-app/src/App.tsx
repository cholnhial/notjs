import { NotJS } from 'notjs-react'

const isProd = import.meta.env.MODE === 'production'

const API_CONFIG = {
  apiBaseUrl: isProd
    ? 'https://notjsapi.chol.dev/api'
    : 'http://localhost:8080/api',
  websocketUrl: isProd
    ? 'wss://notjsapi.chol.dev/terminal'
    : 'ws://localhost:8080/terminal'
}

function App() {
  return (
    <NotJS
      apiBaseUrl={API_CONFIG.apiBaseUrl}
      websocketUrl={API_CONFIG.websocketUrl}
      initialLanguage="java"
      initialVersion="25"
      initialDarkMode={true}
      hideHeader={false}
    />
  )
}

export default App
