import React from 'react'
import { useAuth } from '../context/AuthContext'

const formatDate = (iso) => {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })
  } catch (e) { return iso }
}

const BlockedAccountsModal = ({ open, onClose }) => {
  const { currentUser, unblockUser } = useAuth()
  if (!open) return null

  const list = (currentUser && Array.isArray(currentUser.blockedAccounts)) ? currentUser.blockedAccounts : JSON.parse(localStorage.getItem('blockedAccounts') || '[]')

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.panel} onClick={(e)=>e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Blocked accounts</h3>
        <div style={{ maxHeight: '50vh', overflowY: 'auto', marginTop: 8 }}>
          {list.length === 0 && <div style={{ padding: 16, color: '#9ca3af' }}>You have not blocked any accounts.</div>}
          {list.map((b) => (
            <div key={b.id || b.username} style={styles.item}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={styles.avatar}>{b.avatarUrl ? <img src={b.avatarUrl} alt={b.displayName||b.username} style={{width:40,height:40,borderRadius:999,objectFit:'cover'}} /> : (b.displayName ? b.displayName.charAt(0).toUpperCase() : 'U')}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{b.displayName || b.username}</div>
                  <div style={{ color: '#9ca3af', fontSize: 13 }}>@{b.username}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>Diblokir pada {formatDate(b.blockedAt)}</div>
                <button style={styles.unblock} onClick={() => { unblockUser(b.id || b.username); }}>
                  Unblock
                </button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8, background: '#6b7280', color: '#fff' }}>Close</button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  panel: { width: 560, maxWidth: '95%', background: '#0b0b0f', padding: 18, borderRadius: 12, color: '#e6e6ef' },
  item: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid rgba(255,255,255,0.03)' },
  avatar: { width: 40, height: 40, borderRadius: 999, background: 'linear-gradient(135deg,#0891b2,#06b6d4)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  unblock: { marginTop: 8, padding: '6px 10px', background: '#ef4444', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer' }
}

export default BlockedAccountsModal
