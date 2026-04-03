import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './AuthContext'
import './index.css'
import App from './App.tsx'
import { applyTheme, getTheme, getPrefSize } from './SettingsMem.tsx'

const theme = getTheme()
applyTheme(theme)

const prefSize = getPrefSize()
document.documentElement.style.fontSize = `${prefSize}px`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
