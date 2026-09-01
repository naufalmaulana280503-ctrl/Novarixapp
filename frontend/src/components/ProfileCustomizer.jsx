import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const ProfileCustomizer = () => {
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const displayName = currentUser?.displayName || currentUser?.name || currentUser?.username || 'YourName'
  const username = currentUser?.username || 'username'
  const avatarUrl = currentUser?.avatarUrl || currentUser?.avatar || currentUser?.profileImage || currentUser?.imageUrl || ''
  const initials = (displayName || 'U').split(' ').map(s=>s.charAt(0)).join('').slice(0,2).toUpperCase()
  const isVerified = !!(currentUser?.verified || currentUser?.isVerified || currentUser?.verifiedBadge)

  const handleCustomize = () => {
    // navigate to profile settings page
    navigate('/settings/profile')
  }

  const handleViewProfile = () => {
    navigate(`/profile/${currentUser?.username || ''}`)
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>Profile</div>
      <div style={styles.avatarRow}>
        <div style={styles.banner} />
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" style={styles.avatarImage} />
        ) : (
          <div style={styles.avatar}>{initials}</div>
        )}
      </div>

      <div style={styles.info}>
        <div style={{fontWeight:800, display:'inline-flex', alignItems:'center', gap:8}}>
          {displayName}
          {isVerified && <span style={styles.verifiedPill}>✓</span>}
        </div>
        <div style={{color:'#9aa0c7', fontSize:13}}>@{username}</div>
      </div>

      <div style={styles.actions}>
        <button onClick={handleCustomize} style={styles.editBtn}>Customize</button>
        <button onClick={handleViewProfile} style={styles.viewBtn}>View Profile</button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: 12,
    borderRadius: 16,
    background: 'linear-gradient(180deg, rgba(124,58,237,0.18), rgba(15,23,42,0.85))',
    border: '1px solid rgba(167,139,250,0.35)',
    boxShadow: '0 18px 40px rgba(76, 29, 149, 0.24), inset 0 1px 0 rgba(255,255,255,0.08)',
  },
  header: { fontWeight: 800, marginBottom: 8, letterSpacing: '0.02em' },
  avatarRow: { position: 'relative', display: 'flex', alignItems: 'center', gap: 12 },
  banner: { height: 64, borderRadius: 12, flex: 1, background: 'linear-gradient(90deg,#f59e0b,#06b6d4,#10b981)' },
  avatar: { width: 72, height: 72, borderRadius: 16, background: 'linear-gradient(135deg,#0891b2,#06b6d4,#f59e0b)', color: '#e6e6ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginTop: -36, border: '3px solid rgba(255,255,255,0.22)', boxShadow: '0 0 18px rgba(8, 145, 178, 0.45)' },
  avatarImage: { width: 72, height: 72, borderRadius: 16, objectFit: 'cover', marginTop: -36, border: '3px solid rgba(255,255,255,0.22)', boxShadow: '0 0 18px rgba(130, 86, 255, 0.45)' },
  info: { padding: '12px 0' },
  verifiedPill: { display: 'inline-flex', width: 20, height: 20, borderRadius: '50%', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#60a5fa,#2563eb)', color: '#fff', fontSize: 12, boxShadow: '0 0 12px rgba(96,165,250,0.7)' },
  actions: { display: 'flex', gap: 8, marginTop: 12 },
  editBtn: { padding: '8px 12px', borderRadius: 10, background: 'linear-gradient(90deg,#0891b2,#06b6d4)', border: 'none', color: '#fff', fontWeight: 700 },
  viewBtn: { padding: '8px 12px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#e6e6ef' }
}

export default ProfileCustomizer
