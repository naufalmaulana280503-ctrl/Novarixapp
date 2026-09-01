import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SaturnLogo from '../components/SaturnLogo'
import { getSupabase, isSupabaseConfigured } from '../services/supabase'

/* ===== LUCIDE ===== */
import { Mail, Phone, Lock, Eye, EyeOff, User, AlertCircle, CheckCircle2, ArrowRight, Sparkles, Calendar, IdCard } from 'lucide-react'

/* ============================= SVG ICONS (GMAIL + YAHOO GRADIENT) ============================= */
const GmailIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M3 18V6l9 6 9-6v12" fill="none" stroke="#EA4335" strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M3 6l5.5 3.7" fill="none" stroke="#FBBC04" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M21 6l-5.5 3.7" fill="none" stroke="#34A853" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M3 18V6" fill="none" stroke="#4285F4" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
)
const YahooIcon = ({ className = '' }) => (
  <svg viewBox="0 0 64 32" className={className} aria-hidden="true">
    <text x="1" y="24" fill="currentColor" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="700" letterSpacing="-1.2">yahoo!</text>
  </svg>
)

/* ============================= HITUNG UMUM DARI TGL LAHIR ============================= */
const calcAge = (isoDate) => {
  if (!isoDate) return 0
  const t = new Date(isoDate)
  if (isNaN(t.getTime())) return 0
  const diff = Date.now() - t.getTime()
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000))
}

/* ============================= VALIDASI FLEKSIBEL (semua domain) ============================= */
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim())
const isValidPhone = (v) => !v || /^[+\d][\d\s-]{7,}$/.test(String(v || '').trim())

/* ============================= SOCIAL LOGIN HANDLER (OAuth via Supabase) ============================= */
const socialLogin = async (provider, { onError, onSuccess, onLoading }) => {
  onLoading?.(true)
  try {
    if (!isSupabaseConfigured()) {
      throw new Error(
        'Social Login belum aktif. Silakan atur VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env, lalu konfigurasikan provider OAuth di dashboard Supabase (Google/Yahoo).'
      )
    }
    const sb = getSupabase()
    if (!sb || typeof sb.auth?.signInWithOAuth !== 'function') {
      throw new Error('Client Supabase tidak tersedia.')
    }
    const normalizedProvider = String(provider).toLowerCase()
    const validProviders = ['google', 'yahoo']
    if (!validProviders.includes(normalizedProvider)) {
      throw new Error(`Provider ${provider} tidak didukung.`)
    }
    const redirectTo =
      (typeof window !== 'undefined' ? window.location.origin : '') + '/dashboard'

    const { error } = await sb.auth.signInWithOAuth({
      provider: normalizedProvider,
      options: {
        redirectTo,
        queryParams: normalizedProvider === 'google'
          ? { access_type: 'offline', prompt: 'consent' }
          : undefined,
      },
    })
    if (error) throw error
    onSuccess?.(`Mengarahkan ke halaman autentikasi ${provider}...`)
  } catch (e) {
    onError?.(e?.message || String(e))
  } finally {
    onLoading?.(false)
  }
}

/* ============================= PAGE ============================= */
const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    username: '',
    displayName: '',
    birthDate: '',
    password: '',
    confirmPassword: '',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [socialLoading, setSocialLoading] = useState('')

  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (error) setError('')
  }

  const validateForm = () => {
    if ((formData.fullName || '').trim().length < 2) {
      setError('Nama Lengkap minimal 2 karakter')
      return false
    }
    if (!isValidEmail(formData.email)) {
      setError('Masukkan alamat email yang valid (contoh: nama@gmail.com, nama@yahoo.com, nama@outlook.com)')
      return false
    }
    if (!isValidPhone(formData.phone)) {
      setError('Format nomor telepon tidak valid')
      return false
    }
    if ((formData.username || '').trim().length < 3) {
      setError('Username minimal 3 karakter')
      return false
    }
    if (!(formData.displayName || '').trim()) {
      setError('Nama tampilan (Display Name) tidak boleh kosong')
      return false
    }
    if (!formData.birthDate) {
      setError('Mohon isi Tanggal Lahir Anda')
      return false
    }
    const age = calcAge(formData.birthDate)
    if (age < 13) {
      setError('Usia minimal 13 tahun untuk mendaftar di Novarix.')
      return false
    }
    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok')
      return false
    }
    if (!termsAccepted) {
      setError('Anda harus menyetujui Syarat & Ketentuan untuk mendaftar')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!validateForm()) return

    setLoading(true)
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        username: formData.username.trim(),
        displayName: formData.displayName.trim(),
        birthDate: formData.birthDate,
        password: formData.password,
        termsAccepted: true,
      }
      await register(payload)
      setSuccess('Pendaftaran berhasil! Mengarahkan ke halaman login...')
      setFormData({ fullName: '', email: '', phone: '', username: '', displayName: '', birthDate: '', password: '', confirmPassword: '' })
      setTermsAccepted(false)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Pendaftaran gagal. Coba lagi nanti ya!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-4">
      {/* ===== WRAPPER KARTU (ditengahkan sempurna) ===== */}
      <div className="relative w-full max-w-md">

        {/* ===== CARD ===== */}
        <div className="relative w-full bg-[#121212] rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden">

          {/* Top accent bar */}
          <div aria-hidden="true" className="h-1 w-full nova-gradient-bg nova-animate-gradient"/>

          <div className="px-7 py-7 sm:px-9 sm:py-8 max-h-[92vh] overflow-y-auto scrollbar-thin">

            {/* Logo + Title */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-2xl nova-gradient-bg nova-animate-gradient p-[2px] mb-3">
                <div className="w-full h-full rounded-2xl bg-[#121212] flex items-center justify-center">
                  <SaturnLogo size={40} />
                </div>
              </div>
              <h1 className="text-2xl font-bold nova-gradient-text nova-animate-gradient tracking-tight inline-flex items-center gap-2">
                <span>Buat Akun Novarix</span>
                <Sparkles className="w-5 h-5 nova-gradient-text"/>
              </h1>
              <p className="mt-1.5 text-sm text-neutral-400">
                Bergabung dengan komunitas kami dan mulai berkreasi!
              </p>
            </div>

            {/* Alert */}
            {error && (
              <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-3 flex items-start gap-2.5 animate-[fadeIn_.18s_ease-out]">
                <AlertCircle className="w-[18px] h-[18px] text-red-400 shrink-0 mt-0.5"/>
                <p className="text-sm text-red-300 leading-snug">{error}</p>
              </div>
            )}
            {success && !error && (
              <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-3 flex items-start gap-2.5 animate-[fadeIn_.18s_ease-out]">
                <CheckCircle2 className="w-[18px] h-[18px] text-emerald-400 shrink-0 mt-0.5"/>
                <p className="text-sm text-emerald-300 leading-snug">{success}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">

              <Field
                label="Nama Lengkap"
                Icon={IdCard}
                error={formData.fullName && formData.fullName.trim().length < 2 ? 'Minimal 2 karakter' : ''}
              >
                <input
                  type="text"
                  name="fullName"
                  autoComplete="name"
                  placeholder="Nama lengkap sesuai KTP / akun sosial"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="w-full bg-transparent outline-none text-[14px] text-white placeholder:text-neutral-600"
                />
              </Field>

              <Field
                label="Email"
                Icon={Mail}
                error={formData.email && !isValidEmail(formData.email) ? 'Format email tidak valid' : ''}
              >
                <input
                  type="email"
                  name="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="nama@gmail.com / nama@yahoo.com / nama@outlook.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full bg-transparent outline-none text-[14px] text-white placeholder:text-neutral-600"
                />
              </Field>

              <Field
                label="Nomor Telepon (opsional)"
                Icon={Phone}
                error={formData.phone && !isValidPhone(formData.phone) ? 'Format telepon tidak valid' : ''}
              >
                <input
                  type="tel"
                  name="phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+62 812 3456 7890"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-transparent outline-none text-[14px] text-white placeholder:text-neutral-600"
                />
              </Field>

              <Field
                label={
                  <span className="inline-flex items-center gap-2">
                    <span>Tanggal Lahir</span>
                    {formData.birthDate && calcAge(formData.birthDate) > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {calcAge(formData.birthDate)} tahun
                      </span>
                    ) : null}
                  </span>
                }
                Icon={Calendar}
                error={
                  formData.birthDate
                    ? (calcAge(formData.birthDate) < 13 ? 'Minimal usia 13 tahun' : '')
                    : ''
                }
              >
                <input
                  type="date"
                  name="birthDate"
                  max={new Date(Date.now() - 13 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10)}
                  value={formData.birthDate}
                  onChange={handleChange}
                  required
                  className="w-full bg-transparent outline-none text-[14px] text-white placeholder:text-neutral-600 [color-scheme:dark]"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="Username"
                  Icon={User}
                  error={formData.username && formData.username.trim().length < 3 ? 'Minimal 3 karakter' : ''}
                >
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    placeholder="username_keren"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="w-full bg-transparent outline-none text-[14px] text-white placeholder:text-neutral-600"
                  />
                </Field>

                <Field
                  label="Display Name (Nama Tampilan)"
                  Icon={Sparkles}
                >
                  <input
                    type="text"
                    name="displayName"
                    autoComplete="nickname"
                    placeholder="Nama yang ditampilkan di profil"
                    value={formData.displayName}
                    onChange={handleChange}
                    required
                    className="w-full bg-transparent outline-none text-[14px] text-white placeholder:text-neutral-600"
                  />
                </Field>
              </div>

              <Field
                label="Password"
                Icon={Lock}
                right={
                  <button
                    type="button"
                    aria-label={showPwd ? 'Sembunyikan password' : 'Tampilkan password'}
                    onClick={() => setShowPwd((s) => !s)}
                    className="text-neutral-500 hover:text-white transition p-1 -m-1"
                  >
                    {showPwd ? <EyeOff className="w-[18px] h-[18px]"/> : <Eye className="w-[18px] h-[18px]"/>}
                  </button>
                }
                error={formData.password && formData.password.length < 6 ? 'Minimal 6 karakter' : ''}
              >
                <input
                  type={showPwd ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  placeholder="Buat password (min. 6 karakter)"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full bg-transparent outline-none text-[14px] text-white placeholder:text-neutral-600"
                />
              </Field>

              <Field
                label="Konfirmasi Password"
                Icon={Lock}
                right={
                  <button
                    type="button"
                    aria-label={showConfirmPwd ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                    onClick={() => setShowConfirmPwd((s) => !s)}
                    className="text-neutral-500 hover:text-white transition p-1 -m-1"
                  >
                    {showConfirmPwd ? <EyeOff className="w-[18px] h-[18px]"/> : <Eye className="w-[18px] h-[18px]"/>}
                  </button>
                }
                error={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'Password tidak cocok' : ''}
              >
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Ketik ulang password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full bg-transparent outline-none text-[14px] text-white placeholder:text-neutral-600"
                />
              </Field>

              {/* Checkbox Group */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 space-y-2 mt-0.5">
                <CheckboxItem
                  checked={termsAccepted}
                  onChange={(v) => { setTermsAccepted(v); if (error) setError('') }}
                  label={<>Saya menyetujui <span className="text-cyan-400 underline underline-offset-2">Syarat & Ketentuan</span> dan <span className="text-cyan-400 underline underline-offset-2">Kebijakan Privasi</span>. Saya juga mengonfirmasi usia saya minimal 13 tahun sesuai Tanggal Lahir yang diisi.</>}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-1 group relative w-full rounded-xl py-3.5 text-[15px] font-bold text-white
                           nova-gradient-bg nova-animate-gradient
                           hover:brightness-110
                           shadow-[0_8px_24px_-8px_rgba(8,145,178,0.55)]
                           active:scale-[0.99] transition-all duration-200
                           disabled:opacity-60 disabled:cursor-not-allowed
                           inline-flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"/>
                    <span>Membuat akun...</span>
                  </span>
                ) : (
                  <>
                    <span>Sign Up</span>
                    <ArrowRight className="w-4 h-4 -mr-1 group-hover:translate-x-0.5 transition"/>
                  </>
                )}
              </button>
            </form>

            {/* ===== DIVIDER + SOCIAL LOGIN ===== */}
            <div className="mt-6">
              <div className="flex items-center gap-3 text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-800 to-neutral-800"/>
                <span>Atau daftar dengan</span>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent via-neutral-800 to-neutral-800"/>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <SocialButton
                  label="Gmail"
                  Icon={GmailIcon}
                  loading={socialLoading === 'google'}
                  onClick={() => socialLogin('google', {
                    onError: setError,
                    onSuccess: setSuccess,
                    onLoading: (v) => setSocialLoading(v ? 'google' : ''),
                  })}
                  className="bg-[#fff] text-neutral-800 hover:bg-neutral-50 border border-neutral-200"
                />
                <SocialButton
                  label="Yahoo"
                  Icon={YahooIcon}
                  loading={socialLoading === 'yahoo'}
                  onClick={() => socialLogin('yahoo', {
                    onError: setError,
                    onSuccess: setSuccess,
                    onLoading: (v) => setSocialLoading(v ? 'yahoo' : ''),
                  })}
                  className="bg-[#720E9E] text-white hover:bg-[#8B13BF] border border-[#8B13BF]"
                />
              </div>
            </div>

            {/* Navigasi ke Login */}
            <div className="mt-6 text-center text-sm text-neutral-400">
              Sudah punya akun?{' '}
              <Link
                to="/login"
                className="font-bold nova-gradient-text nova-gradient-text-hover transition underline-offset-4 hover:underline"
              >
                Log In di sini
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #3a3a3a; }
      `}</style>
    </div>
  )
}

/* ============================= SUB COMPONENTS ============================= */

const Field = ({ label, Icon, right, children, error }) => (
  <label className="block">
    <span className="block text-[12px] font-semibold text-neutral-400 mb-1.5">{label}</span>
    <div className={
      'w-full flex items-center gap-2.5 rounded-xl bg-neutral-900 border px-3.5 py-3 transition-all ' +
      (error
        ? 'border-red-500/50 ring-2 ring-red-500/10'
        : 'border-neutral-800 focus-within:border-cyan-500/70 focus-within:ring-2 focus-within:ring-cyan-500/20')
    }>
      {Icon && <Icon className="w-[18px] h-[18px] text-neutral-500 shrink-0"/>}
      <div className="flex-1 min-w-0">{children}</div>
      {right}
    </div>
    {error && <p className="mt-1 text-[11px] text-red-400 font-medium">{error}</p>}
  </label>
)

const CheckboxItem = ({ checked, onChange, label }) => (
  <label className="inline-flex items-start gap-2.5 cursor-pointer select-none group">
    <div className="mt-0.5 relative">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer sr-only"
      />
      <div className="w-[18px] h-[18px] rounded-md border border-neutral-700 bg-neutral-900
                  peer-checked:nova-gradient-bg peer-checked:nova-animate-gradient
                  peer-checked:border-transparent transition-all group-hover:border-neutral-500
                  flex items-center justify-center">
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        )}
      </div>
    </div>
    <span className="text-[13px] text-neutral-300 leading-snug">{label}</span>
  </label>
)

const SocialButton = ({ label, Icon, onClick, loading, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className={
      'relative inline-flex items-center justify-center gap-2.5 rounded-xl px-3 py-3 text-[13px] font-bold transition-all active:scale-[0.98] disabled:opacity-60 ' +
      className
    }
  >
    {loading ? (
      <span className="w-4 h-4 rounded-full border-2 border-current/40 border-t-current animate-spin"/>
    ) : (
      <Icon className="w-[18px] h-[18px] shrink-0"/>
    )}
    <span>{label}</span>
  </button>
)

export default Register
