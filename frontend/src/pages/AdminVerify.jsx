import React, { useEffect, useState } from 'react'
import supabase from '../services/supabase'
import { useNotification } from '../context/NotificationContext'

const ADMIN_VERIFY_FN = import.meta.env.VITE_ADMIN_VERIFY_FN_URL || ''

const AdminVerify = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState(null)
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
      setRequests(data || [])
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
                    <div style={{ fontWeight: 800 }}>{r.tier?.toUpperCase()} — {r.user_id}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Requested: {new Date(r.created_at).toLocaleString()}</div>
                    {r.metadata && Object.keys(r.metadata).length > 0 && (
                      <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>{JSON.stringify(r.metadata)}</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button disabled={processingId === r.id} onClick={() => callAdminVerify(r.id, 'reject', 'Does not meet criteria')} style={{ backgroundColor: 'transparent', color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: 8 }}>Reject</button>
                    <button disabled={processingId === r.id} onClick={() => callAdminVerify(r.id, 'approve')} style={{ backgroundColor: 'var(--accent)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: 8 }}>{processingId === r.id ? 'Processing...' : 'Approve'}</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default AdminVerify
