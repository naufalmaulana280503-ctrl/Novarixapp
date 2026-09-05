import React, { useState, useEffect, useCallback } from 'react'
import { BookMarked, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { bookmarksApi } from '../services/api'
import PostCard from '../components/PostCard'

export default function SavedPosts() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const navigate = useNavigate()

  const fetchPosts = useCallback(async (pageNum = 1) => {
    setLoading(true)
    try {
      const res = await bookmarksApi.getAll(pageNum)
      const list = res.data?.posts || []
      if (pageNum === 1) setPosts(list)
      else setPosts((prev) => [...prev, ...list])
      setHasMore(list.length >= 20)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPosts(1) }, [fetchPosts])

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    fetchPosts(next)
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}><ArrowLeft size={22} /></button>
        <h1 style={styles.title}>Postingan Tersimpan</h1>
      </div>

      {loading && posts.length === 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={styles.spinner} />
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div style={styles.empty}>
          <BookMarked size={48} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <h3 style={{ margin: 0, fontSize: 17, color: 'var(--text-primary)' }}>Belum ada postingan tersimpan</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>Klik ikon bookmark pada postingan untuk menyimpannya di sini.</p>
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
          />
        ))}
        {hasMore && !loading && posts.length > 0 && (
          <button onClick={handleLoadMore} style={styles.loadMore}>Muat Lebih Banyak</button>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80 },
  header: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '16px',
    borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0,
    background: 'var(--bg-primary)', zIndex: 10,
  },
  backBtn: {
    background: 'transparent', border: 'none', color: 'var(--text-primary)',
    cursor: 'pointer', padding: 4, borderRadius: 8,
  },
  title: { margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' },
  empty: { padding: '80px 20px', textAlign: 'center' },
  spinner: {
    width: 32, height: 32, border: '3px solid var(--bg-tertiary)',
    borderTopColor: '#0891b2', borderRadius: '50%', animation: 'spin 1s linear infinite',
  },
  loadMore: {
    display: 'block', width: '100%', padding: '14px', background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)', borderRadius: 12,
    color: '#0891b2', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginTop: 12,
  },
}
