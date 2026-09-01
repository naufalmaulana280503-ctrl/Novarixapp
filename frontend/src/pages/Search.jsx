import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, UserRound } from 'lucide-react'
import { api } from '../services/api'

const Search = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (event) => {
    event.preventDefault()
    const value = query.trim()
    if (value.length < 2) {
      setResults([])
      return
    }

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

  return (
    <main style={styles.page}>
      <section style={styles.panel}>
        <h1 style={styles.heading}>Search Novarix</h1>
        <form onSubmit={handleSearch} style={styles.form}>
          <SearchIcon size={19} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari username atau nama"
            aria-label="Cari username atau nama"
            style={styles.input}
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Mencari...' : 'Cari'}
          </button>
        </form>

        <div style={styles.results}>
          {results.map((user) => (
            <Link key={user.id} to={`/profile/${user.username}`} style={styles.result}>
              <UserRound size={20} aria-hidden="true" />
              <span>
                <strong>{user.display_name || user.username}</strong>
                <small>@{user.username}</small>
              </span>
            </Link>
          ))}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p style={styles.empty}>Tidak ada pengguna yang ditemukan.</p>
          )}
        </div>
      </section>
    </main>
  )
}

const styles = {
  page: { minHeight: '100vh', padding: '32px 20px', background: 'var(--bg-primary, #0f0f0f)', color: 'var(--text-primary, #fff)' },
  panel: { width: '100%', maxWidth: 680, margin: '0 auto' },
  heading: { margin: '0 0 20px', fontSize: 28 },
  form: { display: 'flex', alignItems: 'center', gap: 10, padding: 10, border: '1px solid #333', borderRadius: 12, background: 'var(--bg-secondary, #191919)' },
  input: { flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', color: 'inherit', fontSize: 16 },
  button: { border: 0, borderRadius: 8, padding: '10px 16px', background: '#0891b2', color: '#fff', cursor: 'pointer' },
  results: { display: 'grid', gap: 8, marginTop: 20 },
  result: { display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, background: 'var(--bg-secondary, #191919)', color: 'inherit', textDecoration: 'none' },
  empty: { color: '#aaa' },
}

export default Search