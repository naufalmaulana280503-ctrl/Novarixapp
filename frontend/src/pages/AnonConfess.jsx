import React, { useEffect, useState } from 'react'
import { Flag, MessageCircleHeart, Send, ShieldQuestion } from 'lucide-react'
import { api } from '../services/api'

export default function AnonConfess({ embedded = false }) {
  const [posts, setPosts] = useState([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try { setError(''); const response = await api.get('/anon-confess'); setPosts(response.data.posts || []) }
    catch (err) { setError(err.response?.data?.message || 'Board belum dapat dimuat') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const publish = async (event) => {
    event.preventDefault()
    if (body.trim().length < 3) return setError('Tulis minimal 3 karakter')
    setSending(true); setError('')
    try { await api.post('/anon-confess', { body }); setBody(''); await load() }
    catch (err) { setError(err.response?.data?.message || 'Gagal menerbitkan pengakuan') }
    finally { setSending(false) }
  }

  const report = async (id) => {
    const reason = window.prompt('Alasan laporan')
    if (!reason?.trim()) return
    try { await api.post(`/anon-confess/${id}/report`, { reason }); setPosts(current => current.filter(post => post.id !== id)) }
    catch (err) { setError(err.response?.data?.message || 'Gagal mengirim laporan') }
  }

  return <main className={embedded ? '' : 'feature-page'}><header className={embedded ? 'feature-header safe-space-header' : 'feature-header'}><div><p className="eyebrow"><ShieldQuestion size={15} /> JUDGEMENT-FREE ZONE</p><h1>{embedded ? 'Safe Space' : 'Anon-Confess Board'}</h1><p className="feature-subtitle">Bagikan isi hati tanpa menampilkan identitas. Tetap hormati orang lain dan laporkan konten yang berbahaya.</p></div><MessageCircleHeart size={42} aria-hidden="true" /></header><section className="feature-grid confess-grid"><form className="feature-panel" onSubmit={publish}><h2><Send size={20} /> Tulis anonim</h2><textarea value={body} maxLength={2000} onChange={event => setBody(event.target.value)} rows={7} placeholder="Apa yang ingin kamu sampaikan?" aria-label="Isi pengakuan anonim" />{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={sending}>{sending ? 'Mengirim...' : 'Terbitkan anonim'}</button></form><section className="feature-panel"><h2><MessageCircleHeart size={20} /> Pengakuan terbaru</h2>{loading ? <p className="muted">Memuat board...</p> : posts.length === 0 ? <p className="muted">Belum ada pengakuan yang tampil.</p> : <div className="feature-list">{posts.map(post => <article className="confess-item" key={post.id}><p>{post.body}</p><div><small>{new Date(post.created_at).toLocaleString()}</small><button type="button" className="icon-button" onClick={() => report(post.id)} title="Laporkan pengakuan"><Flag size={16} /></button></div></article>)}</div>}</section></section></main>
}
