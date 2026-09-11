import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Heart, MessageCircle, UserPlus, AtSign, Gift, Star, X, Check } from 'lucide-react'
import { notificationsApi } from '../services/api'

const NOTIF_ICONS = {
  like: { Icon: Heart, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  comment: { Icon: MessageCircle, color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  follow: { Icon: UserPlus, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  mention: { Icon: AtSign, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  gift: { Icon: Gift, color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  repost: { Icon: Star, color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  story_view: { Icon: Heart, color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
  group_invite: { Icon: UserPlus, color: '#0891b2', bg: 'rgba(8,145,178,0.15)' },
  system: { Icon: Bell, color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
}

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'Baru saja'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}j`
  if (s < 604800) return `${Math.floor(s / 86400)}h`
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const panelRef = useRef(null)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsApi.getUnreadCount()
      setUnreadCount(res.data?.count || 0)
    } catch {}
  }, [])

  const fetchNotifications = useCallback(async (pageNum = 1) => {
    setLoading(true)
    try {
      const res = await notificationsApi.getAll(pageNum)
      const list = res.data?.notifications || []
      if (pageNum === 1) setNotifications(list)
      else setNotifications((prev) => [...prev, ...list])
      setHasMore(list.length >= 30)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 15000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  useEffect(() => {
    if (open) {
      fetchNotifications(1)
      setPage(1)
    }
  }, [open, fetchNotifications])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAllRead = async () => {
    try {
      setActionError('')
      await notificationsApi.markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.warn('Failed to mark notifications as read', error)
      setActionError('Notifikasi belum dapat diperbarui.')
    }
  }

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    fetchNotifications(next)
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={styles.bellBtn} aria-label="Notifikasi">
        <Bell size={22} />
        {unreadCount > 0 && <span style={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h3 style={styles.panelTitle}>Notifikasi</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} style={styles.markAllBtn}>
                <Check size={14} /> Tandai semua dibaca
              </button>
            )}
          </div>
          {actionError && <div role="alert" style={styles.actionError}>{actionError}</div>}

          <div style={styles.notifList}>
            {notifications.length === 0 && !loading && (
              <div style={styles.empty}>
                <Bell size={40} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Belum ada notifikasi</p>
              </div>
            )}
            {notifications.map((notif) => {
              const { Icon, color, bg } = NOTIF_ICONS[notif.type] || NOTIF_ICONS.system
              return (
                <div key={notif.id} style={{ ...styles.notifItem, background: notif.isRead ? 'transparent' : 'rgba(8,145,178,0.06)' }}>
                  <div style={{ ...styles.iconWrap, background: bg }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <div style={styles.notifContent}>
                    <div style={styles.notifAvatar}>
                      {notif.actor?.avatarUrl ? (
                        <img src={notif.actor.avatarUrl} alt="" style={styles.avatarImg} />
                      ) : (
                        <div style={styles.avatarPlaceholder}>{(notif.actor?.displayName || 'U').charAt(0)}</div>
                      )}
                    </div>
                    <div style={styles.notifText}>
                      <span style={styles.notifName}>{notif.actor?.displayName || notif.actor?.username}</span>
                      <span style={styles.notifMsg}> {notif.message}</span>
                      <span style={styles.notifTime}> · {timeAgo(notif.createdAt)}</span>
                    </div>
                    {notif.postMediaUrl && (
                      <img src={notif.postMediaUrl} alt="" style={styles.postThumb} />
                    )}
                  </div>
                  {!notif.isRead && <div style={styles.unreadDot} />}
                </div>
              )
            })}
            {loading && <div style={{ padding: 20, textAlign: 'center' }}><div style={styles.spinner} /></div>}
            {hasMore && !loading && notifications.length > 0 && (
              <button onClick={handleLoadMore} style={styles.loadMoreBtn}>Muat Lebih Banyak</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  bellBtn: {
    position: 'relative', background: 'transparent', border: 'none', color: 'var(--text-secondary)',
    cursor: 'pointer', padding: 8, borderRadius: 10, transition: 'all 0.2s',
  },
  badge: {
    position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9,
    background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
    border: '2px solid var(--bg-primary)',
  },
  panel: {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 380, maxHeight: 500,
    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
    borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 1000,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 16px 12px', borderBottom: '1px solid var(--border-color)',
  },
  panelTitle: { margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' },
  markAllBtn: {
    display: 'flex', alignItems: 'center', gap: 4, background: 'transparent',
    border: 'none', color: '#0891b2', cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
  notifList: { overflowY: 'auto', flex: 1, maxHeight: 420 },
  notifItem: {
    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer',
    transition: 'background 0.15s', position: 'relative',
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 8, display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notifContent: { display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 },
  notifAvatar: { width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarPlaceholder: {
    width: '100%', height: '100%', background: 'var(--bg-tertiary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-muted)', fontSize: 12, fontWeight: 700,
  },
  notifText: { fontSize: 13, lineHeight: 1.4, color: 'var(--text-secondary)' },
  notifName: { fontWeight: 600, color: 'var(--text-primary)' },
  notifMsg: {},
  notifTime: { fontSize: 11, color: 'var(--text-muted)' },
  postThumb: { width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 },
  unreadDot: {
    width: 8, height: 8, borderRadius: '50%', background: '#0891b2',
    position: 'absolute', top: 18, right: 12,
  },
  empty: { padding: '40px 20px', textAlign: 'center' },
  spinner: {
    width: 24, height: 24, border: '3px solid var(--bg-tertiary)',
    borderTopColor: '#0891b2', borderRadius: '50%', animation: 'spin 1s linear infinite',
    margin: '0 auto',
  },
  loadMoreBtn: {
    display: 'block', width: '100%', padding: '12px', background: 'transparent',
    border: 'none', color: '#0891b2', fontWeight: 600, fontSize: 13, cursor: 'pointer',
  },
  actionError: {
    padding: '8px 16px',
    color: '#fca5a5',
    fontSize: 12,
    borderBottom: '1px solid var(--border-color)',
  },
}
