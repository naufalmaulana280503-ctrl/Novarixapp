import React from 'react'

const CameraSettingsModal = ({ open, onClose, onSelectSource, current, sourceModes = ['front'] }) => {
  if (!open) return null

  const options = [
    { key: 'front', label: 'Single Front Camera' },
    { key: 'rear', label: 'Single Rear Camera', enabled: sourceModes.includes('rear') },
    { key: 'dual', label: 'Dual Cam (Front + Rear)', enabled: sourceModes.includes('dual') },
    { key: 'screen-pip', label: 'Screen + Front Cam (PiP)', enabled: sourceModes.includes('screen-pip') },
  ]

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ marginTop: 0 }}>Camera Settings</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {options.map(({ key, label, enabled }) => {
            if (enabled === false) return null
            const active = current === key
            return (
              <button
                key={key}
                onClick={() => onSelectSource(key)}
                style={{
                  ...buttonStyle,
                  background: active ? 'linear-gradient(90deg,#06b6d4,#0891b2)' : '#1f2733',
                  opacity: active ? 1 : 0.9,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: 12 }}>
          <h4 style={{ marginBottom: 8 }}>Quick toggles</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {sourceModes.includes('front') && <button style={chipStyle} onClick={() => onSelectSource('front')}>Front</button>}
            {sourceModes.includes('rear') && <button style={chipStyle} onClick={() => onSelectSource('rear')}>Rear</button>}
            {sourceModes.includes('screen-pip') && <button style={chipStyle} onClick={() => onSelectSource('screen-pip')}>Screen</button>}
          </div>
        </div>

        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8 }}>Close</button>
        </div>
      </div>
    </div>
  )
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }
const modal = { background: '#0f0f12', padding: 20, borderRadius: 12, width: 420, color: '#e6e6ef', maxWidth: '90vw' }
const buttonStyle = { padding: '10px 12px', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }
const chipStyle = { padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: '#111827', color: '#fff', cursor: 'pointer' }

export default CameraSettingsModal
