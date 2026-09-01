import React, { useEffect, useState } from 'react'
import { followsApi, api } from '../services/api'
import { useToast } from '../context/ToastContext'

export default function FollowListModal({ open, onClose, userId, type }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    if (!open || !userId) return
    setLoading(true)
    const request = type === 'followers' ? followsApi.followers(userId) : followsApi.followingList(userId)
    request.then((response) => setUsers(response.data?.users || [])).catch(() => addToast({ type: 'error', text: 'Daftar pengguna gagal dimuat' })).finally(() => setLoading(false))
  }, [open, userId, type, addToast])

  const toggleFollow = async (person) => {
    try {
      if (person.following) await followsApi.unfollow(person.id)
      else await followsApi.follow(person.id)
      setUsers((current) => current.map((item) => item.id === person.id ? { ...item, following: !person.following } : item))
    } catch { addToast({ type: 'error', text: 'Gagal memperbarui status mengikuti' }) }
  }

  const block = async (person) => {
    if (!window.confirm(`Blokir @${person.username}?`)) return
    try { await followsApi.block(person.id); setUsers((current) => current.filter((item) => item.id !== person.id)); addToast({ type: 'success', text: 'Pengguna diblokir' }) } catch { addToast({ type: 'error', text: 'Gagal memblokir pengguna' }) }
  }

  const report = async (person) => {
    const details = window.prompt('Jelaskan laporan (penipuan, pornografi, judi online, atau lainnya):')
    if (!details?.trim()) return
    try { await api.post('/reports', { category: 'user', details: `@${person.username}: ${details.trim()}`, targetUserId: person.id }); addToast({ type: 'success', text: 'Laporan terkirim' }) } catch { addToast({ type: 'error', text: 'Gagal mengirim laporan' }) }
  }

  if (!open) return null
  return <div style={styles.overlay} onClick={onClose}><div style={styles.modal} onClick={(event) => event.stopPropagation()}>
    <div style={styles.header}><h2>{type === 'followers' ? 'Pengikut' : 'Mengikuti'}</h2><button type="button" onClick={onClose} style={styles.close}>×</button></div>
    {loading ? <p>Memuat...</p> : users.length === 0 ? <p style={styles.muted}>Belum ada pengguna.</p> : users.map((person) => <div key={person.id} style={styles.row}>
      <div style={styles.identity}><div style={styles.avatar}>{person.avatarUrl ? <img src={person.avatarUrl} alt="" style={styles.avatarImage} /> : (person.displayName || person.username || 'U').charAt(0).toUpperCase()}</div><div><strong>{person.displayName || person.username}</strong><div style={styles.muted}>@{person.username}</div></div></div>
      <button type="button" onClick={() => toggleFollow(person)} style={person.following ? styles.following : styles.follow}>{person.following ? 'Mengikuti' : 'Ikuti'}</button>
      <details><summary style={styles.more}>•••</summary><div style={styles.menu}><button type="button" onClick={() => type === 'following' ? toggleFollow(person) : block(person)}>{type === 'following' ? 'Hapus dari mengikuti' : 'Blokir pengguna'}</button><button type="button" onClick={() => report(person)}>Laporkan</button></div></details>
    </div>)}
  </div></div>
}

const styles = { overlay: { position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }, modal: { width: 'min(100%, 560px)', maxHeight: '80vh', overflowY: 'auto', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 20 }, header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', marginBottom: 8 }, close: { background: 'none', border: 0, color: 'inherit', fontSize: 28, cursor: 'pointer' }, row: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', borderBottom: '1px solid var(--border-color)' }, identity: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }, avatar: { width: 42, height: 42, borderRadius: '50%', background: '#0891b2', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, overflow: 'hidden' }, avatarImage: { width: '100%', height: '100%', objectFit: 'cover' }, muted: { color: 'var(--text-secondary)', fontSize: 12 }, follow: { border: 0, borderRadius: 8, padding: '8px 12px', background: '#0891b2', color: '#fff', fontWeight: 700, cursor: 'pointer' }, following: { border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 12px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }, more: { listStyle: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 6 }, menu: { position: 'absolute', right: 20, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 6, display: 'grid', gap: 4, zIndex: 1 }, menuButton: { border: 0, background: 'transparent', color: 'var(--text-primary)', padding: 6 } }
