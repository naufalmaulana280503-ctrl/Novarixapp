import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, duration)
    return id
  }, [])

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  return (
    <ToastContext.Provider value={{ add, remove }}>
      {children}
      <div style={styles.container} aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} style={{ ...styles.toast, ...(toast.type === 'success' ? styles.success : styles.info) }}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const styles = {
  container: {
    position: 'fixed',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    pointerEvents: 'none',
  },
  toast: {
    minWidth: 240,
    maxWidth: 640,
    color: '#fff',
    padding: '10px 14px',
    borderRadius: 10,
    boxShadow: '0 8px 24px rgba(2,6,23,0.6)',
    fontWeight: 600,
    pointerEvents: 'auto',
    transition: 'transform 220ms ease, opacity 220ms ease',
    transform: 'translateY(-6px)',
    opacity: 1,
  },
  success: {
    background: 'linear-gradient(90deg,#10b981,#06b6d4)'
  },
  info: {
    background: 'linear-gradient(90deg,#0891b2,#06b6d4)'
  }
}
