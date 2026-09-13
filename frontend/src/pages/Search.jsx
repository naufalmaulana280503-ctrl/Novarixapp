import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, UserRound, X } from 'lucide-react'
import { api } from '../services/api'
import { API_ORIGIN } from '../services/backendUrl'

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
                    {user.avatarUrl
                      ? <img src={user.avatarUrl.startsWith('/') ? `${API_ORIGIN}${user.avatarUrl}` : user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={S.avatarPH}><UserRound size={20} /></div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{user.displayName || user.username}</span>
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
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Cari username atau nama untuk menemukan teman.</p>
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
}

export default Search
