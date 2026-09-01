import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { useToast } from '../context/ToastContext'

const CATEGORIES = [
  'Harassment',
  'Privacy Violation',
  'Impersonation',
  'Spam',
  'Other'
]

const AccessDeniedView = () => (
  <div style={{padding:40, textAlign:'center', color:'#e6e6ef'}}>
    <h3>Access Denied</h3>
    <p>Reporting portal is reserved for verified users only. To gain access, please apply for verification.</p>
  </div>
)

const VerifiedReport = () => {
  const { currentUser } = useAuth()
  const { addToast } = useToast()
  const [category, setCategory] = useState(CATEGORIES[0])
  const [details, setDetails] = useState('')
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [reports, setReports] = useState([])
  const MAX_DETAILS = 2000

  useEffect(() => {
    if (currentUser?.isVerified) fetchMyReports()
  }, [currentUser])

  const handleFileChange = (e) => {
    const list = Array.from(e.target.files || [])
    setFiles(list)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentUser?.isVerified) return
    if (!details.trim() || details.trim().length < 20) {
      addToast({ type: 'error', text: 'Please provide more details (at least 20 characters).' })
      return
    }
    if (details.length > MAX_DETAILS) {
      addToast({ type: 'error', text: `Details cannot exceed ${MAX_DETAILS} characters.` })
      return
    }
    setSubmitting(true)
    setMessage(null)
    try {
      const form = new FormData()
      form.append('category', category)
      form.append('details', details)
      form.append('priority', 'high')
      files.forEach((f, i) => form.append('evidence', f))

      const res = await api.post('/reports', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      addToast({ type: 'success', text: 'Report submitted — thank you. Our team will review it.' })
      fetchMyReports()
      setDetails('')
      setFiles([])
    } catch (err) {
      console.error('submit report', err)
      const msg = err?.response?.data?.message || 'Failed to submit'
      addToast({ type: 'error', text: msg })
      setMessage(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const fetchMyReports = async () => {
    try {
      const res = await api.get('/reports/my')
      setReports(res.data.reports || res.data || [])
    } catch (e) {
      console.error('fetch reports', e)
    }
  }

  if (!currentUser?.isVerified) return <AccessDeniedView />

  return (
    <div style={{padding:24, maxWidth:760, margin:'24px auto', color:'#e6e6ef'}}>
      <h2>Verified Reporting Portal</h2>
      <p style={{color:'#9aa0c7'}}>This reporting form is reserved for users with a Verified badge. Reports submitted here receive priority handling.</p>

      <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:12, marginTop:12}}>
        <label style={{display:'flex', flexDirection:'column'}}>
          Report Category
          <select value={category} onChange={(e)=>setCategory(e.target.value)} style={inputStyle}>
            {CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label style={{display:'flex', flexDirection:'column'}}>
          Detailed Explanation (Markdown supported)
          <textarea value={details} onChange={(e)=>setDetails(e.target.value)} rows={8} style={{...inputStyle, minHeight:160}} placeholder="Describe the issue in detail. Use Markdown for formatting." maxLength={2000} />
          <div style={{color:'#9aa0c7', fontSize:12, marginTop:8}}>{details.length}/{MAX_DETAILS} characters</div>
        </label>

        <label style={{display:'flex', flexDirection:'column'}}>
          Evidence (images/screenshots)
          <input type="file" accept="image/*" multiple onChange={handleFileChange} style={{marginTop:8}} />
          {files.length>0 && <div style={{marginTop:8}}>{files.map((f,i)=>(<div key={i} style={{padding:6, background:'#0b0b0b', borderRadius:8}}>{f.name}</div>))}</div>}
        </label>

        <div style={{display:'flex', gap:8}}>
          <button type="submit" disabled={submitting} style={{padding:'10px 14px', borderRadius:8, background:'#0891b2', color:'#000'}}>{submitting? 'Submitting...':'Submit Report'}</button>
          <button type="button" onClick={fetchMyReports} style={{padding:'10px 14px', borderRadius:8, background:'#1f2937', color:'#fff'}}>Refresh</button>
        </div>
        {message && <div style={{color:'#a0f0c5'}}>{message}</div>}
      </form>

      <div style={{marginTop:24}}>
        <h3>Your Reports</h3>
        {reports.length===0 ? (
          <p style={{color:'#9aa0c7'}}>No reports submitted yet.</p>
        ) : (
          <div style={{display:'grid', gap:10}}>
            {reports.map(r => (
              <div key={r.id} style={{padding:12, borderRadius:8, background:'#0b0b0b', border:'1px solid #1f1f1f'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <div style={{fontWeight:700}}>{r.category}</div>
                  <div style={{color:'#9aa0c7'}}>{new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <div style={{marginTop:8}}>{r.details.substring(0,300)}{r.details.length>300?'...':''}</div>
                <div style={{marginTop:8}}><strong>Status:</strong> {r.status || 'Under Review'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle = { padding:10, borderRadius:8, border:'1px solid #2d2d2d', background:'#0b0b0b', color:'#e6e6ef', marginTop:8 }

export default VerifiedReport
