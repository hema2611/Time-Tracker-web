import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// No login gate for now — the app opens straight to the masters.
// Login/logout is a colleague's work in progress and lives in auth.jsx / pages/Login.jsx.
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter><App /></BrowserRouter>,
)
