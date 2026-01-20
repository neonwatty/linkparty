import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// FastClick-style touch handler for Capacitor iOS WebView
// Converts touch events to click events for buttons that may not receive clicks properly
// Skip buttons with data-touch-handled attribute (they manage their own touch events)
document.addEventListener('touchend', (e) => {
  const target = e.target as HTMLElement
  if (target.tagName === 'BUTTON' || target.closest('button')) {
    const button = target.tagName === 'BUTTON' ? target : target.closest('button')
    if (button && !button.hasAttribute('data-touch-handled')) {
      e.preventDefault()
      button.click()
    }
  }
}, { passive: false })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
