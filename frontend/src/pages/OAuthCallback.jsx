import '../index.css'
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabase, isSupabaseConfigured } from '../services/supabase'

const OAuthCallback = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (!isSupabaseConfigured()) {
        navigate('/login?error=oauth_not_configured', { replace: true })
        return
      }

      const supabase = getSupabase()
      if (!supabase) {
        navigate('/login?error=oauth_client_missing', { replace: true })
        return
      }

      // Supabase handles the OAuth callback automatically via detectSessionInUrl.
      // We just need to grab the session and sync to Novarix backend.
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('OAuth callback error:', error)
        navigate('/login?error=oauth_failed', { replace: true })
        return
      }

      if (!session?.access_token) {
        // No session — maybe user cancelled or error. Redirect to login with message.
        navigate('/login?error=oauth_no_session', { replace: true })
        return
      }

      try {
        // Sync the Supabase session to Novarix backend
        const res = await fetch('/api/auth/oauth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (!res.ok) {
          console.error('OAuth sync to backend failed:', res.status, await res.text())
          navigate('/login?error=oauth_sync_failed', { replace: true })
          return
        }

        const { token, user } = await res.json()
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        navigate('/dashboard', { replace: true })
      } catch (err) {
        console.error('OAuth callback network error:', err)
        navigate('/login?error=oauth_network_error', { replace: true })
      }
    }

    handleOAuthCallback()
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
