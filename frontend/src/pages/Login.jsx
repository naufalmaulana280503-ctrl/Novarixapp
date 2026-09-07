import '../index.css'
import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSupabase, isOAuthProviderEnabled, isSupabaseConfigured } from '../services/supabase'
import { authApi } from '../services/api'

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Sparkles,
  Apple,
  X,
} from 'lucide-react'

const PROVIDER_LABELS = {
  google: 'Gmail',
  yahoo: 'Yahoo',
  apple: 'Apple',
}

const isValidIdentifier = (value) => {
  const identifier = String(value || '').trim()
  if (!identifier) return false
  if (identifier.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(identifier)
  return identifier.length >= 3
}

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim())

const getErrorMessage = (error) => {
  if (typeof error === 'string') return error
  return error?.response?.data?.message
    || error?.response?.data?.error
    || error?.message
    || ''
}

const normalizeAuthError = (error, provider = '', context = 'login') => {
  const rawMessage = getErrorMessage(error)
  const message = rawMessage.toLowerCase()
  const status = error?.response?.status
  const providerLabel = PROVIDER_LABELS[provider] || provider || 'sosial'
  const noResponse = !error?.response && (
    Boolean(error?.request)
    || message.includes('network error')
    || message.includes('failed to fetch')
    || message.includes('econnrefused')
  )

  if (context === 'forgot') {
    if (noResponse) return 'Server reset password tidak dapat dihubungi. Pastikan backend Novarix sedang berjalan lalu coba lagi.'
    if (status >= 500) return 'Server sedang bermasalah. Coba kirim ulang permintaan reset password nanti.'
    return 'Permintaan reset password gagal. Periksa alamat email lalu coba lagi.'
  }

  const supabaseMissing = /supabase.*(belum|not configured|tidak tersedia)|social login belum|vite_supabase|client supabase/.test(message)
  const providerUnavailable = /provider.*(not enabled|disabled)|unsupported provider|provider is not enabled/.test(message)

  if (supabaseMissing) {
    return 'Login sosial belum dikonfigurasi. Gunakan email/username dan password untuk masuk.'
  }
  if (provider && providerUnavailable) {
    return `Login ${providerLabel} sementara belum tersedia. Gunakan email/username dan password untuk masuk.`
  }
  if (noResponse) {
    return 'Server login tidak dapat dihubungi. Pastikan backend Novarix sedang berjalan lalu coba lagi.'
  }
  if (status === 401 || /invalid credentials|email\/phone and password are required/.test(message)) {
    return 'Email/username atau password salah. Periksa kembali kredensial Anda.'
  }
  if (status >= 500) {
    return 'Server Novarix sedang bermasalah. Coba lagi sebentar.'
  }

  return 'Gagal login. Periksa kembali kredensial Anda lalu coba lagi.'
}

const GmailIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M3 18V6l9 6 9-6v12" fill="none" stroke="#EA4335" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M3 6l5.5 3.7" fill="none" stroke="#FBBC04" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M21 6l-5.5 3.7" fill="none" stroke="#34A853" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M3 18V6" fill="none" stroke="#4285F4" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
)

const YahooIcon = ({ className = '' }) => (
  <svg viewBox="0 0 64 32" className={className} aria-hidden="true">
    <text x="1" y="24" fill="currentColor" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="700" letterSpacing="-1.2">yahoo!</text>
  </svg>
)

const nativeOAuthLogin = async (provider, { onError, onSuccess, onLoading }) => {
  onLoading?.(true)
  try {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.')
    }

    const supabase = getSupabase()
    if (!supabase || typeof supabase.auth?.signInWithOAuth !== 'function') {
      throw new Error('Client Supabase tidak tersedia.')
    }

    const normalizedProvider = String(provider).toLowerCase()
    if (!Object.prototype.hasOwnProperty.call(PROVIDER_LABELS, normalizedProvider)) {
      throw new Error(`Provider ${provider} tidak didukung.`)
    }
    if (!isOAuthProviderEnabled(normalizedProvider)) {
      throw new Error('OAuth provider is not enabled')
    }

    const redirectTo = `${window.location.origin}/dashboard`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: normalizedProvider,
      options: {
        redirectTo,
        queryParams: normalizedProvider === 'google'
          ? { access_type: 'offline', prompt: 'consent' }
          : undefined,
      },
    })

    if (error) throw error
    onSuccess?.(`Mengarahkan ke autentikasi ${PROVIDER_LABELS[normalizedProvider]}...`)
  } catch (error) {
    onError?.(error)
  } finally {
    onLoading?.(false)
  }
}

const Login = () => {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState('')

  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')

  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!forgotOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setForgotOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [forgotOpen])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')

    if (!isValidIdentifier(identifier)) {
      setError('Masukkan email atau username yang valid (contoh: nama@gmail.com / username_keren)')
      return
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }

    setLoading(true)
    try {
      await login({
        identifier: identifier.trim(),
        password,
        rememberMe: true,
      })
      navigate('/dashboard', { replace: true })
    } catch (loginError) {
      setError(normalizeAuthError(loginError))
    } finally {
      setLoading(false)
    }
  }

  const handleSocialClick = async (provider) => {
    setError('')
    setInfo('')
    setSocialLoading(provider)

    try {
      await nativeOAuthLogin(provider, {
        onLoading: (isLoading) => setSocialLoading(isLoading ? provider : ''),
        onError: (oauthError) => setError(normalizeAuthError(oauthError, provider)),
        onSuccess: setInfo,
      })
    } catch (oauthError) {
      setError(normalizeAuthError(oauthError, provider))
      setSocialLoading('')
    }
  }

  const handleGoogleLogin = async () => {
    await handleSocialClick('google')
  }

  const openForgotPassword = () => {
    setForgotOpen(true)
    setForgotEmail(identifier.includes('@') ? identifier.trim() : '')
    setForgotMessage('')
    setForgotError('')
  }

  const handleForgotSubmit = async (event) => {
    event.preventDefault()
    setForgotError('')
    setForgotMessage('')

    if (!isValidEmail(forgotEmail)) {
      setForgotError('Masukkan alamat email yang valid.')
      return
    }

    setForgotLoading(true)
    try {
      const response = await authApi.forgotPassword(forgotEmail.trim())
      setForgotMessage(response.data?.message || 'Jika akun ditemukan, link reset password akan dikirim ke email Anda.')
    } catch (forgotRequestError) {
      setForgotError(normalizeAuthError(forgotRequestError, '', 'forgot'))
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="login-shell">
      <main className="login-card login-card-enter" aria-labelledby="login-title">
        <header className="flex flex-col items-center text-center">
          <div className="login-brand-icon-wrap" aria-hidden="true">
            <div className="login-brand-icon-glow" />
            <div className="login-brand-icon login-gradient-bg">
              <Sparkles className="h-9 w-9 text-white" />
              <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-white" />
            </div>
          </div>
          <h1 id="login-title" className="login-title login-gradient-text login-gradient-animated">Novarix</h1>
          <p className="login-subtitle">Welcome to social media Novarix</p>
        </header>

        {error ? (
          <div role="alert" className="login-alert login-card-enter">
            <AlertCircle className="login-alert-icon" aria-hidden="true" />
            <p>{error}</p>
          </div>
        ) : null}

        {info ? (
          <div role="status" aria-live="polite" className="login-info login-card-enter">
            <CheckCircle2 className="login-info-icon" aria-hidden="true" />
            <p>{info}</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
          <InputField
            label="Username atau Email"
            type="text"
            name="identifier"
            Icon={Mail}
            placeholder="nama@gmail.com / username_keren"
            value={identifier}
            onChange={(event) => {
              setIdentifier(event.target.value)
              if (error) setError('')
            }}
            autoComplete="username"
            required
            error={identifier && !isValidIdentifier(identifier) ? 'Masukkan email/username yang valid' : ''}
          />

          <InputField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            Icon={Lock}
            placeholder="Minimal 6 karakter"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              if (error) setError('')
            }}
            autoComplete="current-password"
            required
            error={password && password.length < 6 ? 'Password minimal 6 karakter' : ''}
            rightAction={(
              <button
                type="button"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                onClick={() => setShowPassword((visible) => !visible)}
                className="login-input-toggle"
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            )}
          />

          <div className="flex justify-end pt-0.5">
            <button type="button" onClick={openForgotPassword} className="login-link">
              Lupa password?
            </button>
          </div>

          <button type="submit" disabled={loading} className="login-primary-button group">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Signing in...</span>
              </span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <div className="login-divider mt-8" aria-hidden="true">
          <span />
          <strong>or continue with</strong>
          <span />
        </div>

        <div className="login-social-grid mt-7">
          <SocialButton
            label="Gmail"
            Icon={GmailIcon}
            loading={socialLoading === 'google'}
            onClick={handleGoogleLogin}
            className="login-social-gmail"
          />
          <SocialButton
            label="Yahoo"
            Icon={YahooIcon}
            loading={socialLoading === 'yahoo'}
            onClick={() => handleSocialClick('yahoo')}
            className="login-social-yahoo"
          />
          <SocialButton
            label="Apple"
            Icon={Apple}
            loading={socialLoading === 'apple'}
            onClick={() => handleSocialClick('apple')}
            className="login-social-apple"
          />
        </div>

        <p className="mt-7 text-center text-sm text-neutral-400">
          New to Novarix?{' '}
          <Link to="/register" className="login-link login-link-inline">
            Create account
          </Link>
        </p>
      </main>

      {forgotOpen ? (
        <div
          className="login-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
          onMouseDown={() => setForgotOpen(false)}
        >
          <div className="login-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="login-modal-close"
              aria-label="Tutup reset password"
              onClick={() => setForgotOpen(false)}
            >
              <X className="h-[18px] w-[18px]" />
            </button>
            <h2 id="forgot-password-title" className="text-xl font-black text-white">Reset password</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              Masukkan email akun Novarix. Jika akun ditemukan, kami akan mengirim link reset password.
            </p>

            {forgotMessage ? (
              <div role="status" aria-live="polite" className="login-info mt-5">
                <CheckCircle2 className="login-info-icon" aria-hidden="true" />
                <p>{forgotMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} noValidate className="mt-5 space-y-4">
                <label htmlFor="forgot-email-input" className="login-field-label">Alamat Email</label>
                <input
                  id="forgot-email-input"
                  type="email"
                  name="forgotEmail"
                  value={forgotEmail}
                  onChange={(event) => {
                    setForgotEmail(event.target.value)
                    if (forgotError) setForgotError('')
                  }}
                  placeholder="nama@gmail.com"
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(forgotError)}
                  aria-describedby={forgotError ? 'forgot-email-error' : undefined}
                  className="login-input"
                />
                {forgotError ? <p id="forgot-email-error" className="login-field-error">{forgotError}</p> : null}
                <button type="submit" disabled={forgotLoading} className="login-primary-button">
                  {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  <span>{forgotLoading ? 'Mengirim...' : 'Kirim link reset'}</span>
                </button>
              </form>
            )}

            <button type="button" className="login-modal-secondary" onClick={() => setForgotOpen(false)}>
              Tutup
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const InputField = ({
  label,
  type,
  name,
  Icon,
  placeholder,
  value,
  onChange,
  required,
  error,
  autoComplete,
  rightAction,
}) => {
  const inputId = `${name}-input`
  const errorId = `${name}-error`

  return (
    <label htmlFor={inputId} className="block">
      <span className="login-field-label">{label}</span>
      <div className={`login-input-wrap${error ? ' login-input-wrap-error' : ''}`}>
        {Icon ? <Icon className="login-input-icon" aria-hidden="true" /> : null}
        <input
          id={inputId}
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="login-input"
        />
        {rightAction ? <div className="login-input-action">{rightAction}</div> : null}
      </div>
      {error ? <p id={errorId} className="login-field-error">{error}</p> : null}
    </label>
  )
}

const SocialButton = ({ label, Icon, onClick, loading, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    title={`Login dengan ${label}`}
    aria-label={`Login dengan ${label}`}
    className={`login-social-button ${className}`}
  >
    {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Icon className="login-social-icon" />}
    <span>{label}</span>
  </button>
)

export default Login
