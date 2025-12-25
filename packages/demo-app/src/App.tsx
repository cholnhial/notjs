import { NotJS } from 'notjs-react'

function App() {
  return (
    <NotJS
      apiBaseUrl="https://notjsapi.chol.dev/api"
      websocketUrl="ws://notjsapi.chol.dev/terminal"
      initialLanguage="java"
      initialVersion="25"
      initialDarkMode={true}
      hideHeader={false}
    />
  )
}

export default App
