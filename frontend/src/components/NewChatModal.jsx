import React, { useState } from 'react'
import { api } from '../services/api'
import { useToast } from '../context/ToastContext'

const NewChatModal = ({ open, onClose, onCreated }) => {
  const { addToast } = useToast()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (q) => {
    setQuery(q)
    if (!q || q.length < 2) { setResults([]); return }
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`)
      setResults(res.data.users || [])
    } catch (e) {
      console.error('search users', e)
    }
  }

  const startChat = async (user) => {
    try {
      setLoading(true)
      const res = await api.post('/chat/conversations', { userId: user.id })
      const conv = res.data.conversation || res.data
      addToast({ type: 'success', text: 'Conversation started' })
      onCreated && onCreated(conv)
      onClose()
    } catch (err) {
      console.error('start chat', err)
      addToast({ type: 'error', text: err?.response?.data?.message || 'Failed to start chat' })
      setLoading(false)
    }
  }

  if (!open) return null
  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{marginTop:0}}>New Chat</h3>
        <input placeholder="Search users by name or @username" value={query} onChange={(e)=>handleSearch(e.target.value)} style={inputStyle} />
        <div style={{marginTop:8, maxHeight:240, overflowY:'auto'}}>
          {results.map(u => (
            <div key={u.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 6px',borderBottom:'1px solid #1f1f1f'}}>
              <div>
                <div style={{fontWeight:700}}>{u.displayName}</div>
                <div style={{color:'#9aa0c7', fontSize:12}}>@{u.username}</div>
              </div>
              <div>
                <button onClick={()=>startChat(u)} disabled={loading} style={{padding:'6px 10px', borderRadius:8, background:'#0891b2', border:'none', color:'#000'}}>Chat</button>
              </div>
            </div>
          ))}
          {results.length === 0 && <div style={{padding:12,color:'#9aa0c7'}}>No users found</div>}
        </div>
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
          <button onClick={onClose} style={{padding:'8px 12px', borderRadius:8, background:'#1f2937', color:'#fff'}}>Close</button>
        </div>
      </div>
    </div>
  )
}

const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000 }
const modal = { width:520, background:'#0b0b0d', padding:18, borderRadius:12, color:'#e6e6ef' }
const inputStyle = { padding:10, borderRadius:8, border:'1px solid #2d2d2d', background:'#0b0b0b', color:'#e6e6ef', width:'100%' }

export default NewChatModal
