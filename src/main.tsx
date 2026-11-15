import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import manifest from '../manifest.json'
import './index.css'
import App from './App.tsx'

declare global {
  interface Window {
    __agrune_manifest__?: unknown
    __agrune_quick_mode__?: {
      reloadRuntime?: () => void
    }
  }
}

window.__agrune_manifest__ = manifest
window.__agrune_quick_mode__?.reloadRuntime?.()

// /?reset=1 puts the demo back to its starting state: this browser's saved board, tab, filters and
// signed-in person (localStorage pm-*) and the server's likes, attachments and settings (POST /api/reset).
async function resetIfAsked() {
  const url = new URL(window.location.href)
  if (url.searchParams.get('reset') !== '1') return
  for (const key of Object.keys(window.localStorage)) {
    if (key.startsWith('pm-')) window.localStorage.removeItem(key)
  }
  await fetch('/api/reset', { method: 'POST' })
  url.searchParams.delete('reset')
  window.history.replaceState(null, '', url.pathname + url.search + url.hash)
}

resetIfAsked().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
