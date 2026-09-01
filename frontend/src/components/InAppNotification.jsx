import React from 'react'

const colorMap = {
  info: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.22)', accent: 'var(--accent)' },
  success: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(34,197,94,0.18)', accent: 'var(--success)' },
  error: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.18)', accent: 'var(--error)' },
  warn: { bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.18)', accent: 'goldenrod' },
}

const InAppNotification = ({ notification, onClose }) => {
  const { title, message, type = 'info' } = notification
  const colors = colorMap[type] || colorMap.info

  return (
    <div style={{
      minWidth: 320,
      maxWidth: 420,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      color: 'var(--text-primary)',
      padding: 14,
      borderRadius: 12,
      boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      transformOrigin: 'top right',
      animation: 'slideIn 320ms cubic-bezier(.2,.9,.2,1)',
      backdropFilter: 'blur(6px)'
    }}>
      <div style={{ width: 10, height: 40, borderRadius: 6, background: colors.accent }} aria-hidden />
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>}
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{message}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} aria-label="Dismiss notification">✕</button>
      </div>

      <style>{`@keyframes slideIn { from { opacity:0; transform: translateY(-8px) scale(.98); } to { opacity:1; transform: translateY(0) scale(1); } }`}</style>
    </div>
  )
}

export default InAppNotification
