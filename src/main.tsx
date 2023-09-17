import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import './styles.css'
import { I18nProvider } from './ui/i18n'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
)
