import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext()

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,8)
    const t = { id, type: toast.type || 'info', text: toast.text || '', duration: toast.duration ?? 4000 }
    setToasts((prev) => [t, ...prev])
    if (t.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter(x => x.id !== id))
      }, t.duration)
    }
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter(x => x.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div style={containerStyle} aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} style={{ ...toastStyle, ...(t.type==='success'? successStyle : t.type==='error'? errorStyle : infoStyle) }}>
            {t.text}
            <button onClick={() => removeToast(t.id)} style={closeBtnStyle}>✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// styles
const containerStyle = {
  position: 'fixed',
  right: 20,
  bottom: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  zIndex: 9999,
}
const toastStyle = {
  minWidth: 240,
  maxWidth: 420,
  padding: '10px 14px',
  borderRadius: 10,
  color: '#0b0b0b',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  boxShadow: '0 6px 18px rgba(0,0,0,0.6)',
  fontWeight: 600,
}
const successStyle = { background: '#a7f3d0', color:'#064e3b' }
const errorStyle = { background: '#fecaca', color:'#7f1d1d' }
const infoStyle = { background: '#e0e7ff', color:'#3730a3' }
const closeBtnStyle = { marginLeft: 12, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700 }
