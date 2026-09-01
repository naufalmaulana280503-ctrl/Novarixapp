import React, { useEffect, useState } from 'react'
import supabase from '../services/supabase'
import { useNotification } from '../context/NotificationContext'

const ADMIN_VERIFY_FN = import.meta.env.VITE_ADMIN_VERIFY_FN_URL || ''

const ProfileModal = ({ profile, onClose }) => {
  if (!profile) return null
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6000 }} onClick={onClose}>
      <div style={{ width: 620, maxWidth: '95%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 88, height: 88, borderRadius: 16, overflow: 'hidden', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {profile.avatar_url ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: 32, fontWeight: 800 }}>{(profile.display_name || profile.username || 'U').charAt(0).toUpperCase()}</div>}
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{profile.display_name || profile.username}</div>
            <div style={{ color: 'var(--text-secondary)', marginTop: 6 }}>@{profile.username || profile.id}</div>
            <div style={{ marginTop: 8, color: 'var(--text-secondary)' }}>{profile.bio || ''}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
              <div style={{ fontWeight: 800 }}>{profile.followers_count || 0}</div>
              <div style={{ color: 'var(--text-secondary)' }}>followers</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <a href={`/profile/${profile.username || ''}`} style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: 'var(--accent)', color: 'var(--text-primary)', textDecoration: 'none' }}>Open Profile</a>
          <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8, background: 'transparent', color: 'var(--text-secondary)' }}>Close</button>
        </div>
      </div>
    </div>
  )
}

const AdminVerify = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const { notify } = useNotification()

  const fetchPending = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('id, user_id, tier, status, created_at, metadata')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (error) throw error
      const list = data || []

      // fetch profiles in batch
      const userIds = Array.from(new Set(list.map(r => r.user_id).filter(Boolean)))
      let profiles = []
      if (userIds.length) {
        const { data: pData, error: pErr } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url, bio, followers_count')
          .in('id', userIds)
        if (pErr) console.warn('Failed fetching profiles', pErr)
        profiles = pData || []
      }

      const byId = profiles.reduce((acc, p) => { acc[p.id] = p; return acc }, {})
      const enriched = list.map(r => ({ ...r, profile: byId[r.user_id] || null }))

      setRequests(enriched)
    } catch (err) {
      console.error('Failed to fetch pending requests', err)
      notify({ title: 'Error', message: 'Failed to load verification requests', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPending() }, [])

  const getAccessToken = async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data?.session?.access_token
  }

  const callAdminVerify = async (requestId, action, reason = '') => {
    if (!ADMIN_VERIFY_FN) {
      notify({ title: 'Not configured', message: 'Admin function URL not set (VITE_ADMIN_VERIFY_FN_URL)', type: 'warn' })
      return
    }
    setProcessingId(requestId)
    try {
      const token = await getAccessToken()
      const resp = await fetch(ADMIN_VERIFY_FN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ requestId, action: action === 'approve' ? 'approve' : 'reject', reason })
      })

      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        console.error('Admin verify failed', json)
        notify({ title: 'Failed', message: json.error || 'Action failed', type: 'error' })
      } else {
        notify({ title: 'Success', message: `Request ${action}ed`, type: 'success' })
        // Refresh list
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
      }
    } catch (err) {
      console.error('Admin verify error', err)
      notify({ title: 'Error', message: 'Failed to perform action', type: 'error' })
    } finally {
      setProcessingId(null)
    }
  }

  const openProfileModal = (profile) => {
    setSelectedProfile(profile)
    setModalOpen(true)
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin — Verification Requests</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Approve or reject pending verification requests. Actions are performed via secure Edge Function.</p>

      <div style={{ marginTop: 16 }}>
        {loading ? <div>Loading...</div> : (
          requests.length === 0 ? <div style={{ color: 'var(--text-secondary)' }}>No pending requests</div> : (
            <div style={{ display: 'grid', gap: 12 }}>
              {requests.map((r) => (
                <div key={r.id} style={{ padding: 12, borderRadius: 10, backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{r.tier?.toUpperCase()} • {r.profile ? (r.profile.display_name || r.profile.username) : r.user_id}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Requested: {new Date(r.created_at).toLocaleString()}</div>
                    {r.metadata && Object.keys(r.metadata).length > 0 && (
                      <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>{JSON.stringify(r.metadata)}</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {r.profile && <button onClick={() => openProfileModal(r.profile)} style={{ background: 'transparent', color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: 8 }}>View Profile</button>}
                    <button disabled={processingId === r.id} onClick={() => callAdminVerify(r.id, 'reject', 'Does not meet criteria')} style={{ backgroundColor: 'transparent', color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: 8 }}>Reject</button>
                    <button disabled={processingId === r.id} onClick={() => callAdminVerify(r.id, 'approve')} style={{ backgroundColor: 'var(--accent)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: 8 }}>{processingId === r.id ? 'Processing...' : 'Approve'}</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {modalOpen && <ProfileModal profile={selectedProfile} onClose={() => setModalOpen(false)} />}
    </div>
  )
}

export default AdminVerify
