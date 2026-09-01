import React, { useEffect, useState } from 'react'
import { api } from '../services/api'
import AdminNav from '../components/AdminNav'

const AdminVerification = () => {
  const [requests, setRequests] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [actionNote, setActionNote] = useState('')
  const [badgeTier, setBadgeTier] = useState('blue')

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/verification/requests')
      setRequests(res.data.requests || [])
    } catch (err) {
      console.error(err)
      alert('Failed to fetch requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRequests() }, [])

  const viewRequest = async (id) => {
    try {
      const res = await api.get(`/admin/verification/requests/${id}`)
      setSelected(res.data.request)
    } catch (err) {
      console.error(err)
      alert('Failed to load request')
    }
  }

  const approve = async () => {
    if (!selected) return
    try {
      await api.post(`/admin/verification/requests/${selected.id}/approve`, { badgeTier })
      alert('Approved')
      setSelected(null)
      fetchRequests()
    } catch (err) {
      console.error(err)
      alert('Approve failed')
    }
  }

  const reject = async () => {
    if (!selected) return
    try {
      await api.post(`/admin/verification/requests/${selected.id}/reject`, { reason: actionNote })
      alert('Rejected')
      setSelected(null)
      fetchRequests()
    } catch (err) {
      console.error(err)
      alert('Reject failed')
    }
  }

  const viewDocument = async () => {
    if (!selected) return
    try {
      const res = await api.get(`/admin/verification/requests/${selected.id}/document`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      console.error(err)
      alert('Failed to load document')
    }
  }

  return (
    <div style={{padding:20}}>
      <AdminNav />
      <h2>Verification Requests (Admin)</h2>
      <div style={{display:'flex', gap:20}}>
        <div style={{width:380}}>
          <button onClick={fetchRequests} disabled={loading}>{loading? 'Loading...':'Refresh'}</button>
          <ul style={{listStyle:'none', padding:0}}>
            {requests.map(r => (
              <li key={r.id} style={{padding:12, borderBottom:'1px solid #eee', cursor:'pointer'}} onClick={() => viewRequest(r.id)}>
                <div style={{fontWeight:700}}>{r.display_name || r.username}</div>
                <div style={{fontSize:12, color:'#666'}}>{r.tier} — submitted {new Date(r.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>

        <div style={{flex:1}}>
          {selected ? (
            <div style={{padding:12, border:'1px solid #ddd'}}>
              <h3>Request #{selected.id}</h3>
              <div><strong>User:</strong> {selected.display_name} (@{selected.username})</div>
              <div><strong>Followers:</strong> {selected.followers_count}</div>
              <div><strong>Likes:</strong> {selected.likes_received_count}</div>
              <div><strong>Tier:</strong> {selected.tier}</div>
              {selected.document_available && (
                <div style={{marginTop:12}}>
                  <button type="button" onClick={viewDocument}>View document</button>
                </div>
              )}

              <div style={{marginTop:12}}>
                <label>Assign badge tier on approval:</label>
                <select value={badgeTier} onChange={(e)=>setBadgeTier(e.target.value)}>
                  <option value="blue">Blue</option>
                  <option value="gold">Gold</option>
                  <option value="purple">Cyan Elite</option>
                </select>
              </div>

              <div style={{marginTop:12}}>
                <textarea placeholder="Admin note / rejection reason" value={actionNote} onChange={(e)=>setActionNote(e.target.value)} style={{width:'100%', minHeight:80}} />
              </div>

              <div style={{display:'flex', gap:8, marginTop:12}}>
                <button onClick={approve}>Approve</button>
                <button onClick={reject}>Reject</button>
                <button onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          ) : (
            <div>Select a request to review</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminVerification
