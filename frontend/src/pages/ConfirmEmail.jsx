import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { authApi } from '../services/api'
import SaturnLogo from '../components/SaturnLogo'

const ConfirmEmail = () => {
  const { token } = useParams()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const confirm = async () => {
      if (!token) {
        setStatus('invalid')
        setMessage('The email confirmation link is invalid.')
        return
      }

      try {
        const res = await authApi.confirmEmail(token)
        setStatus('confirmed')
        setMessage(res.data?.message || 'Your email has been successfully confirmed.')
      } catch (err) {
        if (err.response?.status === 410) {
          setStatus('expired')
          setMessage('This confirmation link has expired. Please request a new one.')
        } else if (err.response?.status === 404) {
          setStatus('invalid')
          setMessage('This confirmation link is invalid or does not exist.')
        } else {
          setStatus('error')
          setMessage('Something went wrong. Please try again later.')
        }
      }
    }

    confirm()
  }, [token])

  const getStatusColor = () => {
    switch (status) {
      case 'confirmed': return '#22c55e'
      case 'invalid':
      case 'expired':
      case 'error': return '#ef4444'
      default: return '#0891b2'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'confirmed': return '✅'
      case 'invalid':
      case 'expired':
      case 'error': return '❌'
      default: return '⏳'
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoWrapper}>
          <SaturnLogo size={80} />
        </div>
        <div style={styles.statusIcon}>{getStatusIcon()}</div>
        <h2 style={styles.title}>Email Confirmation</h2>
        <p style={styles.text}>
          {message || (status === 'loading' ? 'Verifying your email...' : '')}
        </p>

        {status === 'confirmed' && (
          <Link to="/login" style={styles.button}>
            Log In
          </Link>
        )}

        {status === 'expired' && (
          <Link to="/forgot-password" style={styles.button}>
            Request New Link
          </Link>
        )}

        {(status === 'invalid' || status === 'error') && (
          <div style={styles.actions}>
            <Link to="/register" style={styles.secondaryButton}>
              Register Again
            </Link>
            <Link to="/login" style={styles.button}>
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f0f',
    padding: '20px',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    border: '1px solid #2d2d2d',
    textAlign: 'center',
  },
  logoWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  statusIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '12px',
  },
  text: {
    fontSize: '14px',
    color: '#a0a0a0',
    marginBottom: '28px',
    lineHeight: '1.6',
  },
  button: {
    display: 'inline-block',
    backgroundColor: '#0891b2',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    textDecoration: 'none',
  },
  secondaryButton: {
    display: 'inline-block',
    backgroundColor: 'transparent',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    border: '1px solid #2d2d2d',
    textDecoration: 'none',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
}

export default ConfirmEmail
