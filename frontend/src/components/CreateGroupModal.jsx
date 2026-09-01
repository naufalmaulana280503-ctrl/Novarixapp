import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useToast } from '../context/ToastContext'

const CreateGroupModal = ({ open, onClose, onCreated }) => {
  const { addToast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [admins, setAdmins] = useState([]) // array of user objects {id, displayName}
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
    } catch (e) {
      console.error('search users', e)
    }
  }

  const addAdmin = (user) => {
    if (admins.find(a => a.id === user.id)) return
    setAdmins(prev => [...prev, user])
  }
  const removeAdmin = (id) => setAdmins(prev => prev.filter(a => a.id !== id))

  const handleCreate = async (e) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('Group name required'); addToast({ type: 'error', text: 'Group name is required' }); return }
    setLoading(true)
    try {
      let avatarUrl = ''
      if (avatarFile) {
        const form = new FormData()
        form.append('file', avatarFile)
        const upload = await api.post('/chat/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        avatarUrl = upload.data?.url || ''
      }
      const payload = { name: name.trim(), description: description.trim(), avatarUrl, admins: admins.map(a=>a.id) }
      const res = await api.post('/groups', payload)
      const created = res.data.group || res.data
      addToast({ type: 'success', text: 'Group created' })
      onCreated && onCreated(created)
      onClose()
    } catch (err) {
      console.error('create group', err)
      const status = err?.response?.status
      const msg = err?.response?.data?.message || (status === 401
        ? 'Sesi login tidak cocok dengan database Supabase. Silakan login ulang.'
        : 'Failed to create group')
      setError(msg)
      addToast({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null
  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{marginTop:0}}>Create Group</h3>
        <form onSubmit={handleCreate} style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <div style={{width:64, height:64, borderRadius:'50%', overflow:'hidden', background:'#202024', border:'1px solid #383842', display:'flex', alignItems:'center', justifyContent:'center', color:'#a1a1aa', fontWeight:700}}>
              {avatarPreview ? <img src={avatarPreview} alt="Group preview" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : 'G'}
            </div>
            <label style={{cursor:'pointer', padding:'8px 12px', borderRadius:8, background:'#202024', color:'#fff'}}>
              Add group photo
              <input type="file" accept="image/jpeg,image/png,image/webp" style={{display:'none'}} onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setAvatarFile(file)
                setAvatarPreview(URL.createObjectURL(file))
              }} />
            </label>
          </div>
          <label style={labelStyle}>
            Name
            <input value={name} onChange={(e)=>setName(e.target.value)} style={inputStyle} placeholder="Group name" />
          </label>
          <label style={labelStyle}>
            Description
            <textarea value={description} onChange={(e)=>setDescription(e.target.value)} style={{...inputStyle, minHeight:80}} placeholder="What is this group about?" />
          </label>
          <div>
            <label style={{color:'#cbd5e1', fontSize:13}}>Add Admins (optional)</label>
            <div style={{display:'flex',gap:8, marginTop:8}}>
              <input value={searchQuery} onChange={(e)=>handleSearch(e.target.value)} placeholder="Search users by name or @username" style={inputStyle} />
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap', marginTop:8}}>
              {admins.map(a => (
                <div key={a.id} style={{padding:'6px 10px', background:'#202020', borderRadius:999}}>
                  {a.displayName || a.username}
                  <button type="button" onClick={()=>removeAdmin(a.id)} style={{marginLeft:8, background:'transparent', color:'#ef4444', border:'none'}}>✕</button>
                </div>
              ))}
            </div>
            {searchResults.length>0 && (
              <div style={{marginTop:8, maxHeight:160, overflowY:'auto', border:'1px solid #2d2d2d', borderRadius:8, padding:8}}>
                {searchResults.map(u => (
                  <div key={u.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 8px'}}>
                    <div>{u.displayName || u.username} <span style={{color:'#9aa0c7',fontSize:12}}>@{u.username}</span></div>
                    <button type="button" onClick={()=>addAdmin(u)} style={{padding:'6px 8px', background:'#0891b2', color:'#000', border:'none', borderRadius:8}}>Add</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button type="button" onClick={onClose} style={{padding:'8px 12px', borderRadius:8, background:'#1f2937', color:'#fff'}}>Cancel</button>
            <button type="submit" disabled={loading} style={{padding:'8px 12px', borderRadius:8, background:'#0891b2', color:'#000', fontWeight:700}}>{loading? 'Creating...':'Create Group'}</button>
          </div>
          {error && <div style={{color:'#ff7b7b'}}>{error}</div>}
        </form>
      </div>
    </div>
  )
}

const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000 }
const modal = { width:640, background:'#0b0b0d', padding:20, borderRadius:12, color:'#e6e6ef', boxShadow:'0 10px 30px rgba(2,6,23,0.6)' }
const labelStyle = { display:'flex', flexDirection:'column', gap:6 }
const inputStyle = { padding:'10px', borderRadius:8, border:'1px solid #2d2d2d', background:'#0b0b0b', color:'#e6e6ef', marginTop:6 }

export default CreateGroupModal
