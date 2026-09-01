import React, { useState, useEffect, useCallback } from 'react'
import PostCard from '../components/PostCard'
import StoriesRow from '../components/StoriesRow'
import { api } from '../services/api'
import AnonConfess from './AnonConfess'

const Feed = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCompact, setIsCompact] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false)
  const [scope, setScope] = useState('all')
  const [zone, setZone] = useState('showcase')

  const fetchFeed = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    setError('')
    try {
      const res = await api.get(`/posts/feed?scope=${scope}`)
      const nextPosts = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.posts) ? res.data.posts : [])
      setPosts(nextPosts)
    } catch (err) {
      console.error('Failed to fetch feed:', err)
      setError(err?.response?.data?.message || err.message || 'Feed tidak dapat dimuat.')
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [scope])

  useEffect(() => {
    const updateLayout = () => setIsCompact(window.innerWidth <= 768)
    updateLayout()
    window.addEventListener('resize', updateLayout)
    if (zone === 'showcase') fetchFeed(true)

    return () => window.removeEventListener('resize', updateLayout)
  }, [fetchFeed, zone])

  if (zone === 'safe') {
    return <div style={{ ...styles.container, flexDirection: 'column' }}><div style={{ ...styles.feedContainer, maxWidth: '100%', border: 'none', paddingTop: 16 }}><div style={styles.zoneTabs} role="tablist" aria-label="Zona feed"><button type="button" role="tab" aria-selected={false} onClick={() => setZone('showcase')} style={styles.tab}>Zona Pamer</button><button type="button" role="tab" aria-selected={true} style={{ ...styles.tab, ...styles.activeTab }}>Safe Space</button></div><AnonConfess embedded /></div></div>
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
      </div>
    )
  }

  return (
    <div style={{ ...styles.container, ...(isCompact ? { flexDirection: 'column' } : {}) }}>
      {!isCompact && <div style={styles.sidebarSpacer}></div>}
      <div style={{ ...styles.feedContainer, ...(isCompact ? { maxWidth: '100%', borderLeft: 'none', borderRight: 'none', paddingTop: 16 } : {}) }}>
        <div style={styles.feed}>
          <StoriesRow />
          <div style={styles.zoneTabs} role="tablist" aria-label="Zona feed">
            <button type="button" role="tab" aria-selected={true} onClick={() => setZone('showcase')} style={{ ...styles.tab, ...styles.activeTab }}>Zona Pamer</button>
            <button type="button" role="tab" aria-selected={false} onClick={() => setZone('safe')} style={styles.tab}>Safe Space</button>
          </div>
          <div style={styles.tabs} role="tablist" aria-label="Feed scope">
            <button type="button" role="tab" aria-selected={scope === 'all'} onClick={() => setScope('all')} style={{ ...styles.tab, ...(scope === 'all' ? styles.activeTab : {}) }}>Untuk kamu</button>
            <button type="button" role="tab" aria-selected={scope === 'following'} onClick={() => setScope('following')} style={{ ...styles.tab, ...(scope === 'following' ? styles.activeTab : {}) }}>Mengikuti</button>
          </div>
          {error && (
            <div style={styles.errorBox} role="alert">
              <p style={styles.errorText}>{error}</p>
              <button type="button" onClick={() => fetchFeed(true)} style={styles.retryButton}>Coba lagi</button>
            </div>
          )}
          {!error && posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {!error && posts.length === 0 && (
            <div style={styles.empty}>
              <p style={styles.emptyText}>No posts yet. Be the first to upload!</p>
            </div>
          )}
        </div>
      </div>
      {!isCompact && <div style={styles.rightSpacer}></div>}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
  },
  sidebarSpacer: {
    width: '240px',
    flexShrink: 0,
  },
  feedContainer: {
    flex: 1,
    maxWidth: '600px',
    margin: '0 auto',
    paddingTop: '60px',
    borderLeft: '1px solid var(--border-color)',
    borderRight: '1px solid var(--border-color)',
    minHeight: '100vh',
  },
  feed: {
    paddingBottom: '40px',
  },
  empty: {
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyText: {
    color: 'var(--text-secondary)',
    fontSize: '16px',
  },
  errorBox: { margin: '20px 16px', padding: '18px', border: '1px solid rgba(248,113,113,0.35)', borderRadius: 12, background: 'rgba(127,29,29,0.18)', textAlign: 'center' },
  errorText: { color: '#fecaca', margin: '0 0 12px', fontSize: 14 },
  retryButton: { border: 'none', borderRadius: 8, padding: '9px 14px', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-primary)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid var(--bg-tertiary)',
    borderTopColor: '#0891b2',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  rightSpacer: {
    width: '320px',
    flexShrink: 0,
    display: 'none',
  },
  tabs: { display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border-color)' },
  tab: { flex: 1, background: 'transparent', color: 'var(--text-secondary)', borderBottom: '2px solid transparent', padding: '8px 12px' },
  activeTab: { color: 'var(--text-primary)', borderBottomColor: 'var(--accent)' },
}

export default Feed
