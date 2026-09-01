import React, { useEffect, useState } from 'react'
import { useNotification } from '../context/NotificationContext'
import supabase from '../services/supabase'

const TIERS = [
  { id: 'blue', label: 'Blue', description: 'Verified - Blue (standard)', price: 0 },
  { id: 'gold', label: 'Gold', description: 'Prestige - Gold (fast review)', price: 49 },
  { id: 'purple', label: 'Cyan Elite', description: 'VIP - Cyan Elite (priority + badge)', price: 299 },
]

const VerificationModal = ({ isOpen, onClose }) => {
  const [selected, setSelected] = useState('blue')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null) // null | pending | approved | rejected
  const [eligible, setEligible] = useState(null)
  const { notify } = useNotification()

  useEffect(() => {
    if (!isOpen) return
    // check eligibility when opened
    (async () => {
      try {
        // try calling a backend eligibility endpoint first
        const resp = await fetch('/api/verify-eligible')
        if (resp.ok) {
          const json = await resp.json()
          setEligible(json.eligible)
        } else {
          // fallback to client-side minimal check using supabase profile (best-effort)
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data } = await supabase.from('profiles').select('followers_count').eq('id', user.id).single()
            setEligible((data && data.followers_count >= 1000) || false)
          } else {
            setEligible(false)
          }
        }
      } catch (err) {
        console.error('Eligibility check failed', err)
        setEligible(false)
      }
    })()
  }, [isOpen])

  const submitRequest = async () => {
    setSubmitting(true)
    try {
      // POST to backend API route that enqueues verification review + triggers email + notification
      const resp = await fetch('/api/verify-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selected }),
      })

      if (resp.status === 403) {
        const { reason } = await resp.json()
        notify({ title: 'Not eligible', message: reason || 'You do not meet the verification criteria yet.', type: 'error' })
        setSubmitting(false)
        return
      }

      if (!resp.ok) throw new Error('Failed to submit request')

      const json = await resp.json()
      setStatus('pending')
      notify({ title: 'Verification requested', message: json.message || 'Your verification request was sent. We will review it shortly.', type: 'success' })

      // optimistic local profile update (best-effort)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('profiles').upsert({ id: user.id, verification_status: 'pending', verification_tier: selected }, { returning: 'minimal' })
        }
      } catch (e) {
        console.warn('Failed to persist local verification status', e)
      }

      setSubmitting(false)
      onClose && onClose()
    } catch (err) {
      console.error('Submission error', err)
      notify({ title: 'Error', message: 'Could not send verification request — please try again later.', type: 'error' })
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }} onClick={onClose}>
      <div style={{ width: 720, maxWidth: '95%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Verification Request</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>Close</button>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Choose the verification tier you'd like to apply for. Submitting will queue your profile for human review. Processing times vary by tier.</p>

        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          {TIERS.map((t) => (
            <div key={t.id} onClick={() => setSelected(t.id)} style={{ flex: 1, borderRadius: 10, padding: 14, cursor: 'pointer', border: `1px solid ${selected === t.id ? 'var(--accent)' : 'var(--border-color)'}`, backgroundColor: selected === t.id ? 'rgba(124,58,237,0.06)' : 'transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{t.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.description}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>{t.price === 0 ? 'Free' : `$${t.price}`}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>Cancel</button>
          <button disabled={!eligible || submitting} onClick={submitRequest} style={{ backgroundColor: eligible ? 'var(--accent)' : 'rgba(255,255,255,0.06)', color: eligible ? 'var(--text-primary)' : 'var(--text-secondary)', padding: '10px 18px', borderRadius: 8 }}>
            {submitting ? 'Submitting...' : (status === 'pending' ? 'Pending Review' : 'Submit Request')}
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          {eligible === false && <div style={{ color: 'var(--text-secondary)' }}>You are not yet eligible for verification. Build your followers and engagement to qualify.</div>}
        </div>
      </div>
    </div>
  )
}

export default VerificationModal
