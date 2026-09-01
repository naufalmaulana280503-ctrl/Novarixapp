import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import BlockedAccountsModal from './BlockedAccountsModal'

const ToggleSwitch = ({ checked, onChange, ariaLabel }) => {
  return (
    <button aria-label={ariaLabel} onClick={() => onChange(!checked)} style={{
      width: 48, height: 28, borderRadius: 999, padding: 4, background: checked ? '#10b981' : '#374151', border: 'none', display: 'inline-flex', alignItems: 'center', cursor: 'pointer'
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: 999, background: '#fff', transform: `translateX(${checked ? 20 : 0}px)`, transition: 'transform 160ms ease'
      }} />
    </button>
  )
}

const SettingsMenu = ({ open, onClose }) => {
  const { theme, setTheme, antiSpy, setAntiSpy, privateAccount, setPrivateAccount, currentUser } = useAuth()
  const [blockedOpen, setBlockedOpen] = useState(false)
  if (!open) return null

  const onToggleTheme = (isLight) => {
    setTheme(isLight ? 'light' : 'dark')
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Settings & Privacy</h3>

        <div style={styles.section}>
          <h4>Account & Security</h4>
          <div style={styles.menuItem}>Change password</div>
          <div style={styles.menuItem}>Two-factor auth</div>
        </div>

        <div style={styles.section}>
          <h4>Privacy</h4>
          <div style={{...styles.menuItemRow}}>
            <div>Private account</div>
            <ToggleSwitch checked={!!privateAccount} onChange={(v)=>setPrivateAccount(v)} ariaLabel="Toggle private account" />
          </div>
          <div style={{...styles.menuItem, cursor:'pointer'}} onClick={()=>setBlockedOpen(true)}>Blocked accounts</div>
        </div>

        <div style={styles.section}>
          <h4>Notifications & Activity</h4>
          <div style={styles.menuItem}>Push notifications</div>
          <div style={styles.menuItem}>Email notifications</div>
        </div>

        <div style={styles.section}>
          <h4>Appearance</h4>
          <div style={styles.toggleRow}>
            <label style={{marginRight:12}}>Theme: {theme === 'light' ? 'Light' : 'Dark'}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <ToggleSwitch checked={theme === 'light'} onChange={(v)=>onToggleTheme(v)} ariaLabel="Toggle theme" />
            </div>
          </div>
          <div style={styles.toggleRow}>
            <label style={{marginRight:12}}>Anti-Spy Mode</label>
            <ToggleSwitch checked={!!antiSpy} onChange={(v)=>setAntiSpy(v)} ariaLabel="Toggle Anti-Spy Mode" />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8, background: '#6b7280', color: '#fff' }}>Close</button>
        </div>

        {blockedOpen && <BlockedAccountsModal open={blockedOpen} onClose={()=>setBlockedOpen(false)} />}
      </div>
    </div>
  )
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
  },
  panel: { width: 560, maxWidth: '95%', background: '#0b0b0f', padding: 18, borderRadius: 12, color: '#e6e6ef' },
  section: { marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10 },
  menuItem: { padding: '8px 0', cursor: 'pointer' },
  toggleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' },
  menuItemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }
}

export default SettingsMenu
