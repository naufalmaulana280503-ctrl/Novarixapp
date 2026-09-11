import '../index.css'
import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabase, isSupabaseConfigured, restoreSessionFromUrl } from '../services/supabase'
import { syncSupabaseSession } from '../services/oauth'

const OAuthCallback = () => {
  const navigate = useNavigate()
  const readRef = useRef(false)

  useEffect(() => {
    if (readRef.current) return
    readRef.current = true

    const processOAuthCallback = async () => {
      if (!isSupabaseConfigured()) {
        navigate('/login?error=oauth_not_configured', { replace: true })
        return
      }

      const supabase = getSupabase()
      if (!supabase) {
        navigate('/login?error=oauth_client_missing', { replace: true })
        return
      }

      const restored = await restoreSessionFromUrl()
      const sessionResult = restored.session
        ? { data: { session: restored.session }, error: restored.error }
        : restored.error
          ? { data: { session: null }, error: restored.error }
          : await supabase.auth.getSession()
      const { data: { session }, error } = sessionResult

      if (error || !session?.access_token) {
        if (error) console.error('OAuth callback error:', error)
        navigate('/login?error=oauth_no_session', { replace: true })
        return
      }

      try {
        await syncSupabaseSession(session)
        navigate('/dashboard', { replace: true })
      } catch (err) {
        console.error('OAuth callback sync failed:', err?.response?.data?.message || err.message)
        navigate('/login?error=oauth_sync_failed', { replace: true })
      }
    }

    processOAuthCallback()
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0b0b0b',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #262626',
          borderTopColor: '#0891b2',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p style={{ color: '#a1a1aa' }}>Mengarahkan ke dashboard...</p>
      </div>
    </div>
  )
}

export default OAuthCallback
