import React, { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import { useToast } from '../context/ToastContext'
import { X, Camera, Search, UserPlus, Check } from 'lucide-react'

const CreateGroupModal = ({ open, onClose, onCreated }) => {
  const { addToast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [admins, setAdmins] = useState([])
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!open) reset()
  }, [open])

  const reset = () => {
    setName('')
    setDescription('')
    setAdmins([])
    setAvatarFile(null)
    setAvatarPreview('')
    setSearchQuery('')
    setSearchResults([])
    setLoading(false)
    setError(null)
  }

  const handleSearch = async (q) => {
    setSearchQuery(q)
    if (!q || q.length < 2) { setSearchResults([]); return }
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`)
      setSearchResults(res.data.users || [])
    } catch (e) { console.error('search users', e) }
  }

  const addAdmin = (user) => {
    if (admins.find(a => a.id === user.id)) return
    setAdmins(prev => [...prev, user])
    setSearchQuery('')
    setSearchResults([])
  }
  const removeAdmin = (id) => setAdmins(prev => prev.filter(a => a.id !== id))

  const handleCreate = async (e) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Nama grup wajib diisi')
      addToast({ type: 'error', text: 'Nama grup wajib diisi' })
      return
    }
    setLoading(true)
    try {
      let avatarUrl = ''
      if (avatarFile) {
        const form = new FormData()
        form.append('file', avatarFile)
        const upload = await api.post('/chat/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        avatarUrl = upload.data?.url || ''
      }
      const payload = { name: name.trim(), description: description.trim(), avatarUrl, admins: admins.map(a => a.id) }
      const res = await api.post('/groups', payload)
      const created = res.data.group || res.data
      addToast({ type: 'success', text: 'Grup berhasil dibuat!' })
      onCreated && onCreated(created)
      onClose()
    } catch (err) {
      console.error('create group', err)
      const status = err?.response?.status
      const msg = err?.response?.data?.message || (status === 401
        ? 'Sesi login tidak cocok. Silakan login ulang.'
        : 'Gagal membuat grup')
      setError(msg)
      addToast({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[420px] rounded-2xl bg-[#111b21] border border-[#222d34] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="h-[60px] px-4 flex items-center justify-between bg-[#202c33] shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-[#aebac1]">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-[17px] text-[#e9edef]">Grup Baru</h3>
          </div>
        </div>

        <form onSubmit={handleCreate} className="p-4 space-y-4">
          <div className="flex flex-col items-center">
            <button type="button" onClick={() => fileRef.current?.click()} className="relative w-20 h-20 rounded-full bg-[#202c33] border-2 border-dashed border-[#00a884]/40 flex items-center justify-center overflow-hidden hover:border-[#00a884] transition-colors group">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Group" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Camera className="w-6 h-6 text-[#8696a0] group-hover:text-[#00a884] transition-colors" />
                  <span className="text-[10px] text-[#8696a0] group-hover:text-[#00a884]">Foto</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) } }} />
            <p className="text-[12px] text-[#8696a0] mt-2">Ketuk untuk tambah foto grup</p>
          </div>

          <div>
            <label className="text-[13px] font-semibold text-[#8696a0] mb-1.5 block">Nama Grup</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masukkan nama grup..." className="w-full bg-[#202c33] rounded-lg px-4 py-2.5 text-[15px] text-[#e9edef] placeholder:text-[#8696a0] outline-none border border-transparent focus:border-[#00a884] transition-colors" maxLength={50} autoFocus />
          </div>

          <div>
            <label className="text-[13px] font-semibold text-[#8696a0] mb-1.5 block">Deskripsi <span className="font-normal opacity-60">(opsional)</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Tentang grup ini..." className="w-full bg-[#202c33] rounded-lg px-4 py-2.5 text-[14px] text-[#e9edef] placeholder:text-[#8696a0] outline-none border border-transparent focus:border-[#00a884] transition-colors resize-none" maxLength={200} />
          </div>

          <div>
            <label className="text-[13px] font-semibold text-[#8696a0] mb-1.5 block">Tambah Admin <span className="font-normal opacity-60">(opsional)</span></label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
              <input value={searchQuery} onChange={(e) => handleSearch(e.target.value)} placeholder="Cari nama atau @username..." className="w-full bg-[#202c33] rounded-lg pl-10 pr-4 py-2.5 text-[14px] text-[#e9edef] placeholder:text-[#8696a0] outline-none border border-transparent focus:border-[#00a884] transition-colors" />
            </div>
            {admins.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {admins.map(a => (
                  <span key={a.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00a884]/15 border border-[#00a884]/30 text-[12px] font-medium text-[#00a884]">
                    {a.displayName || a.username}
                    <button type="button" onClick={() => removeAdmin(a.id)} className="w-4 h-4 rounded-full bg-[#00a884]/20 hover:bg-red-500/30 flex items-center justify-center transition-colors">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-[160px] overflow-y-auto rounded-lg border border-[#222d34] bg-[#1a2329]">
                {searchResults.map(u => (
                  <button key={u.id} type="button" onClick={() => addAdmin(u)} className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-[#202c33] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-[12px] font-bold">
                        {(u.displayName || u.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="text-[14px] text-[#e9edef] font-medium">{u.displayName || u.username}</p>
                        <p className="text-[12px] text-[#8696a0]">@{u.username}</p>
                      </div>
                    </div>
                    <span className="w-7 h-7 rounded-full bg-[#00a884]/15 flex items-center justify-center">
                      <UserPlus className="w-3.5 h-3.5 text-[#00a884]" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[13px] text-red-400">{error}</div>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg text-[14px] font-semibold text-[#00a884] hover:bg-[#00a884]/10 transition-colors">Batal</button>
            <button type="submit" disabled={loading || !name.trim()} className="px-5 py-2.5 rounded-lg bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] text-[14px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2">
              {loading ? (<><div className="w-4 h-4 rounded-full border-2 border-[#111b21]/30 border-t-[#111b21] animate-spin" /> Membuat...</>) : (<><Check className="w-4 h-4" /> Buat Grup</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateGroupModal