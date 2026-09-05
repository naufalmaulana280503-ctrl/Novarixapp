import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, UserRound, Heart, MessageCircle, TrendingUp, X } from 'lucide-react'
import { api } from '../services/api'

const TRENDING_TAGS = [
  { tag: '#gaming', posts: '2.4M' },
  { tag: '#musik', posts: '1.8M' },
  { tag: '#kuliner', posts: '956K' },
  { tag: '#beauty', posts: '1.2M' },
  { tag: '#fashion', posts: '878K' },
  { tag: '#travel', posts: '654K' },
]

const EXPLORE_ITEMS = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  type: i % 5 === 0 ? 'video' : 'image',
  likes: Math.floor(Math.random() * 50000) + 1000,
  comments: Math.floor(Math.random() * 2000) + 100,
  color: ['#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed'][i % 5],
}))

const Search = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (event) => {
    event.preventDefault()
    const value = query.trim()
    if (value.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(value)}`)
      setResults(data.users || [])
    } catch (error) {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const isSearching = query.trim().length >= 2

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.heading}>Search</h1>
      </div>

      <div style={S.searchWrap}>
        <form onSubmit={handleSearch} style={S.form}>
          <SearchIcon size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari akun, tag, atau konten..."
            aria-label="Cari"
            style={S.input}
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); setResults([]) }} style={S.clearBtn}>
              <X size={16} />
            </button>
          )}
        </form>
      </div>

      {isSearching ? (
        <div style={{ padding: 16 }}>
          {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div style={S.spinner} /></div>}
          {!loading && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {results.map((user) => (
                <Link key={user.id} to={`/profile/${user.username}`} style={S.resultItem}>
                  <div style={S.avatar}>
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={S.avatarPH}><UserRound size={20} /></div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{user.display_name || user.username}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{user.username}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {!loading && results.length === 0 && (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Tidak ada hasil untuk &quot;{query}&quot;</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={S.sectionTitle}><TrendingUp size={16} style={{ color: '#0891b2' }} /> Trending Sekarang</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {TRENDING_TAGS.map((item) => (
                <button key={item.tag} style={S.tagItem}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{item.tag}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.posts} postingan</span>
                </button>
              ))}
            </div>
          </div>
          <div className="explore-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {EXPLORE_ITEMS.map((item) => (
              <div key={item.id} className={`explore-grid-item${item.id % 7 === 0 ? ' explore-wide' : ''}`} style={{ position: 'relative', aspectRatio: '1', borderRadius: 4, overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${item.color}22, ${item.color}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {item.type === 'video' && (
                    <div style={{ position: 'absolute', top: 8, right: 8, color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  )}
                  <div className="explore-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, transition: 'opacity 0.2s ease' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#fff' }}><Heart size={14} /> {(item.likes / 1000).toFixed(1)}K</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#fff' }}><MessageCircle size={14} /> {(item.comments / 1000).toFixed(1)}K</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const S = {
  page: { minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80 },
  header: { padding: '20px 16px 0' },
  heading: { fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--text-primary)' },
  searchWrap: { padding: '16px 16px 0', position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg-primary)' },
  form: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' },
  input: { flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', color: 'var(--text-primary)', fontSize: 15 },
  clearBtn: { background: 'var(--bg-tertiary)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 },
  spinner: { width: 32, height: 32, border: '3px solid var(--bg-tertiary)', borderTopColor: '#0891b2', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  resultItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', borderRadius: 12, textDecoration: 'none', color: 'inherit' },
  avatar: { width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-tertiary)' },
  avatarPH: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' },
  sectionTitle: { fontSize: 15, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' },
  tagItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', color: 'inherit' },
}

export default Search
