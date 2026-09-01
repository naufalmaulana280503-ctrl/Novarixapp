import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { NotificationProvider } from './context/NotificationContext'
import './index.css'
import './services/authPatch_v2'
import ErrorBoundary from './components/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <NotificationProvider>
          <AuthProvider>
            <LanguageProvider><App /></LanguageProvider>
          </AuthProvider>
        </NotificationProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)