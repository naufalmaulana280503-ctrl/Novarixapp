import React, { useState, useEffect } from 'react'
import supabase from '../services/supabase'

export default function Auth({ onLogin }) {
  const [step, setStep] = useState('email') // 'email' | 'verify' | 'done'
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [code, setCode] = useState('')

  // resend / expiry timer (180 seconds)
  const EXPIRY_SEC = 180
  const [timer, setTimer] = useState(0)

  useEffect(() => {
    let timerId
    if (timer > 0) {
      timerId = setTimeout(() => setTimer(timer - 1), 1000)
    }
    return () => clearTimeout(timerId)
  }, [timer])

  const sendMagic = async () => {
    setLoading(true)
    setError('')
    setInfo('')
    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
      setStep('verify')
      setTimer(EXPIRY_SEC)
      setInfo('A sign-in code was sent to your email. It will expire in 3 minutes.')
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async () => {
    setLoading(true)
    setError('')
    try {
      // verifyOtp is used to confirm OTP codes via the Supabase client
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
      if (error) throw error
      setStep('done')
      setInfo('Verification successful. You are signed in.')
      if (onLogin) onLogin(data?.user || null)
    } catch (err) {
      const msg = err.message || String(err)
      if (msg.toLowerCase().includes('expired')) {
        setError('Code expired. You can resend a new code.')
      } else if (msg.toLowerCase().includes('invalid')) {
        setError('Invalid code. Please try again.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    if (timer > 0) return
    setError('')
    setInfo('Resending code...')
    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
      setTimer(EXPIRY_SEC)
      setInfo('A new code was sent. It will expire in 3 minutes.')
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  const forgotPassword = async () => {
    setLoading(true)
    setError('')
    setInfo('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      setInfo('Password reset link/OTP sent to your email if the account exists.')
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      {step === 'email' && (
        <div style={styles.card}>
          <h3 style={styles.title}>Sign in / Register</h3>
          <p style={styles.subtitle}>Enter your email to receive a sign-in code.</p>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain.com" style={styles.input} />
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <button onClick={sendMagic} style={styles.primary} disabled={loading || !email}>{loading ? 'Sending...' : 'Send code'}</button>
            <button onClick={forgotPassword} style={styles.link} disabled={loading || !email}>Forgot password</button>
          </div>
          {error && <div style={styles.error}>{error}</div>}
          {info && <div style={styles.info}>{info}</div>}
        </div>
      )}

      {step === 'verify' && (
        <div style={styles.card}>
          <h3 style={styles.title}>Enter verification code</h3>
          <p style={styles.subtitle}>We sent a code to {email}. Expires in {timer}s</p>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Your code" style={styles.input} />
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <button onClick={verifyCode} style={styles.primary} disabled={loading || !code}>{loading ? 'Verifying...' : 'Verify'}</button>
            <button onClick={resend} style={{...styles.secondary, opacity: timer>0 ? 0.5 : 1}} disabled={timer>0}>{timer>0 ? `Resend (${timer}s)` : 'Resend code'}</button>
          </div>
          {error && <div style={styles.error}>{error}</div>}
          {info && <div style={styles.info}>{info}</div>}
        </div>
      )}

      {step === 'done' && (
        <div style={styles.card}>
          <h3 style={styles.title}>Signed in</h3>
          <p style={styles.subtitle}>{info}</p>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { padding: 20 },
  card: { background: '#0f0f13', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', color: '#e6e6ef', maxWidth: 420 },
  title: { margin: '0 0 8px 0' },
  subtitle: { marginTop: 0, color: '#9aa0c7', fontSize: 13 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, background: '#121217', border: '1px solid rgba(255,255,255,0.03)', color: '#fff', outline: 'none' },
  primary: { background: 'linear-gradient(90deg,#0891b2,#06b6d4)', color: '#fff', padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer' },
  secondary: { background: 'transparent', color: '#9aa0c7', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' },
  link: { background: 'transparent', color: '#9aa0c7', padding: '10px 14px', borderRadius: 10, border: 'none', textDecoration: 'underline', cursor: 'pointer' },
  error: { marginTop: 12, color: '#ff7b7b' },
  info: { marginTop: 12, color: '#9aa0c7' },
}