/**
 * Application bootstrap entry point.
 *
 * Mounts `<App />` into the #root element under React StrictMode, which also
 * surfaces potential double-render issues during development.
 *
 * @module main
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
