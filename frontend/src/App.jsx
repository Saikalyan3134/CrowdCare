import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './index.css'
import HospitalManager from './components/HospitalManager'

function App() {
  const [count, setCount] = useState(0)

  return (
    <HospitalManager />
  )
}

export default App
