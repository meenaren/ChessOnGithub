import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
// import './index.css' // Vite's default global styles, can be removed if main.css covers all needs

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
