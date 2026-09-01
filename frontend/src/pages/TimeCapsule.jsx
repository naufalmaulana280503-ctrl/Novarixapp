import React, { useEffect, useState } from 'react'
import { Clock3, LockKeyhole, Plus, Sparkles } from 'lucide-react'
import { api } from '../services/api'

export default function TimeCapsule() {
  const [capsules, setCapsules] = useState([])
  const [form, setForm] = useState({ title: '', message: '', unlockAt: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try { setError(''); const response = await api.get('/time-capsules'); setCapsules(response.data.capsules || []) }
    catch (err) { setError(err.response?.data?.message || 'Time Capsule belum dapat dimuat') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const submit = async (event) => {
    event.preventDefault()
    if (!form.message.trim() || !form.unlockAt) return setError('Isi pesan dan waktu buka terlebih dahulu')
    setSaving(true); setError('')
    try { await api.post('/time-capsules', form); setForm({ title: '', message: '', unlockAt: '' }); await load() }
    catch (err) { setError(err.response?.data?.message || 'Gagal membuat Time Capsule') }
    finally { setSaving(false) }
  }

  return <main className="feature-page">
    <header className="feature-header"><div><p className="eyebrow"><Sparkles size={15} /> NOVARIX FEATURE</p><h1>Time Capsule</h1><p className="feature-subtitle">Tulis sesuatu untuk dirimu di masa depan. Isi capsule hanya terbuka setelah waktunya tiba.</p></div><Clock3 size={42} aria-hidden="true" /></header>
    <section className="feature-grid">
      <form className="feature-panel" onSubmit={submit}><h2><Plus size={20} /> Buat capsule</h2><label>Judul<input value={form.title} maxLength={120} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Untuk aku setahun lagi" /></label><label>Pesan<textarea value={form.message} maxLength={5000} onChange={e => setForm({ ...form, message: e.target.value })} rows={7} placeholder="Tulis pesan atau resolusimu..." /></label><label>Terbuka pada<input type="datetime-local" value={form.unlockAt} onChange={e => setForm({ ...form, unlockAt: e.target.value })} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={saving}>{saving ? 'Menyimpan...' : 'Kunci capsule'}</button></form>
      <section className="feature-panel"><h2><LockKeyhole size={20} /> Capsule saya</h2>{loading ? <p className="muted">Memuat capsule...</p> : capsules.length === 0 ? <p className="muted">Belum ada capsule. Buat pesan pertamamu.</p> : <div className="feature-list">{capsules.map(capsule => <article className="feature-item" key={capsule.id}><div><strong>{capsule.title || 'Tanpa judul'}</strong><p>{new Date(capsule.unlock_at).toLocaleString()}</p></div><LockKeyhole size={19} aria-label="Terkunci" /></article>)}</div>}</section>
    </section>
  </main>
}
