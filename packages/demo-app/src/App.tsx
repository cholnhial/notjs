import { NotJS } from 'notjs-react'

function App() {
  return (
    <NotJS
      apiBaseUrl="http://localhost:8080/api"
      websocketUrl="ws://localhost:8080/terminal"
      initialLanguage="java"
      initialVersion="25"
      initialDarkMode={true}
      hideHeader={false}
    />
  )
}

export default App
