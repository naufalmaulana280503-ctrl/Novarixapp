import React, { createContext, useContext, useState, useCallback } from 'react'
import InAppNotification from '../components/InAppNotification'

const NotificationContext = createContext(null)

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])

  const notify = useCallback(({ title = '', message = '', type = 'info', timeout = 6000 }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const item = { id, title, message, type }
    setNotifications((s) => [item, ...s])
    if (timeout > 0) setTimeout(() => setNotifications((s) => s.filter((n) => n.id !== id)), timeout)
    return id
  }, [])

  const dismiss = useCallback((id) => setNotifications((s) => s.filter((n) => n.id !== id)), [])

  return (
    <NotificationContext.Provider value={{ notify, dismiss }}>
      {children}
      <div aria-live="polite" aria-atomic="true">
        <div style={{ position: 'fixed', right: 20, top: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notifications.map((n) => (
            <InAppNotification key={n.id} notification={n} onClose={() => dismiss(n.id)} />
          ))}
        </div>
      </div>
    </NotificationContext.Provider>
  )
}

export const useNotification = () => {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider')
  return ctx
}

export default NotificationContext
