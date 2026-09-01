import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import supabase from '../services/supabase'
import { Bell, Mail, X } from 'lucide-react'

const ModernNavbar = ({ transparent = false }) => {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const isAdmin = currentUser && (currentUser.is_admin || currentUser.role === 'admin')
  // Admin pending count + preview for dropdown
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingPreview, setPendingPreview] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [messagesOpen, setMessagesOpen] = useState(false)
  const [conversations, setConversations] = useState([])
  const menuRef = useRef(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!isAdmin) return
      try {
        // fetch count via head request
        const { count, error } = await supabase
          .from('verification_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
        if (error) throw error
        if (!mounted) return
        setPendingCount(count || 0)

        // fetch top 3 pending preview
        const { data: preview } = await supabase
          .from('verification_requests')
          .select('id, user_id, tier, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(3)
        if (!mounted) return
        setPendingPreview(preview || [])
      } catch (err) {
        console.warn('Failed to load pending count', err)
      }
    }
    load()
    const iv = setInterval(load, 30000) // refresh every 30s
    return () => { mounted = false; clearInterval(iv) }
  }, [isAdmin])

  // close menu on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  useEffect(() => {
    const query = searchQuery.trim()
    if (!currentUser || query.length < 2) {
      setSearchResults([])
      return undefined
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/users/search?q=${encodeURIComponent(query)}`)
        setSearchResults(data.users || [])
        setSearchOpen(true)
      } catch (err) {
        console.warn('Failed to search users', err)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [currentUser, searchQuery])

  useEffect(() => {
    if (!currentUser) return undefined
    api.get('/chat/conversations').then(({ data }) => setConversations(data.conversations || [])).catch(() => {})
    return undefined
  }, [currentUser])

  return (
    <nav style={{...styles.nav, background: transparent ? 'transparent' : styles.nav.background}}>
      <div style={styles.left}>
        <Link to="/" style={styles.brand}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #10b981 100%)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            boxShadow: '0 4px 14px rgba(14,165,233,0.35)',
          }} aria-hidden>★</div>
          <div style={{
            fontWeight: 800,
            fontSize: 18,
            background: 'linear-gradient(90deg, #0ea5e9 0%, #06b6d4 50%, #10b981 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Novarix</div>
        </Link>
      </div>

      <div style={styles.center}>
        <div style={{ ...styles.search, position: 'relative' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{marginRight:8}}>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true) }}
            onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
            placeholder="Search on Novarix"
            style={styles.searchInput}
          />
          {searchOpen && searchQuery.trim().length >= 2 && (
            <div style={styles.searchResults}>
              {searchResults.length === 0 ? (
                <div style={styles.emptySearch}>Tidak ada pengguna</div>
              ) : searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  style={styles.searchResult}
                  onClick={() => {
                    setSearchOpen(false)
                    setSearchQuery('')
                    navigate(`/profile/${result.username}`)
                  }}
                >
                  <div style={styles.resultAvatar}>{(result.displayName || result.username || '?').charAt(0).toUpperCase()}</div>
                  <div style={{ textAlign: 'left', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.displayName || result.username}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>@{result.username}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.actionWrap}>
          <button type="button" onClick={() => { setNotificationsOpen(value => !value); setMessagesOpen(false) }} style={styles.iconButton} title="Notifications" aria-label="Notifications"><Bell size={20} strokeWidth={2} /></button>
          {notificationsOpen && <div style={styles.dropdown}>
            <div style={styles.dropdownHeader}><strong>Notifikasi</strong><button type="button" onClick={() => setNotificationsOpen(false)} style={styles.closeButton} title="Tutup"><X size={15} /></button></div>
            <div style={styles.emptyDropdown}>Belum ada notifikasi baru</div>
          </div>}
        </div>
        <div style={styles.actionWrap}>
          <button type="button" onClick={() => { setMessagesOpen(value => !value); setNotificationsOpen(false) }} style={styles.iconButton} title="Pesan" aria-label="Pesan"><Mail size={20} strokeWidth={2} /></button>
          {messagesOpen && <div style={styles.dropdown}>
            <div style={styles.dropdownHeader}><strong>Pesan masuk</strong><button type="button" onClick={() => setMessagesOpen(false)} style={styles.closeButton} title="Tutup"><X size={15} /></button></div>
            {conversations.length === 0 ? <div style={styles.emptyDropdown}>Belum ada percakapan</div> : conversations.slice(0, 5).map((conversation) => <button type="button" key={conversation.userId} style={styles.messageItem} onClick={() => { setMessagesOpen(false); navigate(`/chat/${conversation.userId}`) }}><strong>{conversation.displayName || 'Pengguna'}</strong><span>{conversation.lastMessage || 'Buka percakapan'}</span></button>)}
            <button type="button" style={styles.openMessages} onClick={() => { setMessagesOpen(false); navigate('/chat') }}>Buka semua pesan</button>
          </div>}
        </div>

        {isAdmin && (
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button aria-haspopup="true" aria-expanded={menuOpen} onClick={(e)=>{e.stopPropagation(); setMenuOpen(!menuOpen)}} style={{ ...styles.iconButton, position: 'relative' }} title="Admin menu">
              🛠️
              {pendingCount > 0 && <span style={{ position: 'absolute', top: -6, right: -6, minWidth:18, height:18, borderRadius:9, backgroundColor: 'var(--accent)', color: 'var(--text-primary)', display:'flex',alignItems:'center',justifyContent:'center', fontSize:11, fontWeight:800 }}>{pendingCount}</span>}
            </button>

            {menuOpen && (
              <div style={{ position: 'absolute', right: 0, top: 44, width: 320, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 8, boxShadow: '0 12px 40px rgba(0,0,0,0.4)', zIndex: 999 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ fontWeight:700 }}>Admin</div>
                  <div style={{ color:'var(--text-secondary)', fontSize:12 }}>{pendingCount} pending</div>
                </div>

                <div style={{ display:'grid', gap:8, maxHeight:220, overflowY:'auto' }}>
                  {pendingPreview.length === 0 && <div style={{ color:'var(--text-secondary)' }}>No pending requests</div>}
                  {pendingPreview.map(p => (
                    <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:8, borderRadius:8, backgroundColor:'var(--bg-tertiary)', border:'1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontWeight:700 }}>{p.tier?.toUpperCase()}</div>
                        <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{new Date(p.created_at).toLocaleString()}</div>
                        <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{p.user_id}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        <Link to={`/admin/verify`} style={{ padding:'6px 10px', background:'var(--accent)', color:'var(--text-primary)', borderRadius:6, textDecoration:'none' }}>Open</Link>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop:8, display:'flex', justifyContent:'space-between' }}>
                  <Link to="/admin/verify" style={{ color:'var(--text-primary)', backgroundColor:'var(--accent)', padding:'8px 10px', borderRadius:8, textDecoration:'none' }}>Manage Requests</Link>
                  <Link to="/admin/audit" style={{ color:'var(--text-secondary)', padding:'8px 10px', borderRadius:8, background:'transparent', textDecoration:'none' }}>View Audit</Link>
                </div>
              </div>
            )}
          </div>
        )}

        <Link to="/profile" style={styles.profile}>
          <div style={styles.avatar}>U</div>
        </Link>
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    backdropFilter: 'blur(6px)',
    position: 'sticky',
    top: 0,
    zIndex: 60,
  },
  left: { display: 'flex', alignItems: 'center', gap: 12 },
  brand: { display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' },
  logo: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'var(--accent)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 },
  title: { fontWeight: 800, fontSize: 18 },
  center: { flex: 1, display: 'flex', justifyContent: 'center' },
  search: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, background: 'rgba(0,0,0,0.25)', width: '60%', maxWidth: 520 },
  searchInput: { background: 'transparent', border: 'none', outline: 'none', color: '#e6e6ef', width: '100%' },
  searchResults: { position: 'absolute', top: 46, left: 0, right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 6, boxShadow: '0 12px 30px rgba(0,0,0,0.35)', zIndex: 100 },
  searchResult: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 8, border: 'none', borderRadius: 8, background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' },
  resultAvatar: { width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  emptySearch: { padding: 12, color: 'var(--text-secondary)', fontSize: 13 },
  right: { display: 'flex', alignItems: 'center', gap: 12 },
  icon: { color: '#e6e6ef', textDecoration: 'none', fontSize: 18 },
  iconButton: { background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: 8, borderRadius: 8, cursor: 'pointer' },
  actionWrap: { position: 'relative' },
  dropdown: { position: 'absolute', right: 0, top: 44, width: 280, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 8, boxShadow: '0 12px 40px rgba(0,0,0,0.28)', zIndex: 1000 },
  dropdownHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderBottom: '1px solid var(--border-color)' },
  closeButton: { background: 'transparent', color: 'var(--text-secondary)', padding: 4, display: 'flex', alignItems: 'center' },
  emptyDropdown: { padding: 18, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' },
  messageItem: { width: '100%', display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left', background: 'transparent', color: 'var(--text-primary)', padding: 10, borderRadius: 8 },
  openMessages: { width: '100%', background: 'var(--accent)', color: 'var(--on-accent)', padding: 9, marginTop: 4 },
  profile: { display: 'flex', alignItems: 'center', textDecoration: 'none' },
  avatar: { width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--accent)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }
}

export default ModernNavbar
