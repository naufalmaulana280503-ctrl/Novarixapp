import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Link2, MapPin, Save, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, profileApi } from '../services/api'

export default function ProfileEdit() {
  const { currentUser } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const avatarInput = useRef(null)
  const bannerInput = useRef(null)

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [gender, setGender] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [bannerPreview, setBannerPreview] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '')
      setUsername(currentUser.username || '')
      setBio(currentUser.bio || '')
      setAvatarPreview(currentUser.avatarUrl || '')
      setBannerPreview(currentUser.bannerUrl || '')
      setLocation(currentUser.location || '')
      setWebsite(currentUser.website || '')
      setGender(currentUser.gender || '')
      setIsPrivate(currentUser.isPrivate || false)
      setLoading(false)
    }
  }, [currentUser])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleBannerChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setBannerFile(file)
      setBannerPreview(URL.createObjectURL(file))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Upload avatar if changed
      if (avatarFile) {
        await profileApi.updateAvatar(avatarFile)
      }
      // Upload banner if changed
      if (bannerFile) {
        await profileApi.updateBanner(bannerFile)
      }
      // Update profile data
      await profileApi.update({
        displayName, bio, location, website, gender, isPrivate,
      })
      addToast({ type: 'success', text: 'Profil berhasil diperbarui!' })
      navigate('/profile')
    } catch (err) {
      console.error('Profile update error:', err)
      addToast({ type: 'error', text: err.response?.data?.message || 'Gagal update profil' })
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: '4px solid var(--bg-tertiary)', borderTopColor: '#0891b2', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  )

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}><ArrowLeft size={22} /></button>
        <h1 style={styles.title}>Edit Profil</h1>
        <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? 'Menyimpan...' : <><Save size={16} /> Simpan</>}
        </button>
      </div>

      <div style={styles.container}>
        {/* Banner */}
        <div style={styles.bannerWrap}>
          {bannerPreview ? (
            <img src={bannerPreview} alt="Banner" style={styles.bannerImg} />
          ) : (
            <div style={styles.bannerPlaceholder} />
          )}
          <button onClick={() => bannerInput.current?.click()} style={styles.bannerEditBtn}>
            <Camera size={16} /> Ubah Banner
          </button>
          <input ref={bannerInput} type="file" accept="image/*" onChange={handleBannerChange} style={{ display: 'none' }} />
        </div>

        {/* Avatar */}
        <div style={styles.avatarWrap}>
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" style={styles.avatarImg} />
          ) : (
            <div style={styles.avatarPlaceholder}>
              <span style={{ fontSize: 32, fontWeight: 700, color: '#fff' }}>
                {(displayName || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <button onClick={() => avatarInput.current?.click()} style={styles.avatarEditBtn}>
            <Camera size={14} />
          </button>
          <input ref={avatarInput} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
        </div>

        {/* Form Fields */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Nama Tampilan</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={styles.input} placeholder="Nama kamu" maxLength={50} />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Username</label>
          <div style={{ ...styles.input, opacity: 0.6, cursor: 'not-allowed' }}>@{username}</div>
          <span style={styles.hint}>Username tidak bisa diubah</span>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} style={styles.textarea} placeholder="Ceritakan tentang diri kamu..." maxLength={150} rows={3} />
          <span style={styles.hint}>{bio.length}/150</span>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}><MapPin size={14} /> Lokasi</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} style={styles.input} placeholder="Kota, Negara" maxLength={50} />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}><Link2 size={14} /> Website</label>
          <input value={website} onChange={(e) => setWebsite(e.target.value)} style={styles.input} placeholder="https://..." maxLength={100} />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Gender</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)} style={styles.select}>
            <option value="">Tidak ditampilkan</option>
            <option value="male">Laki-laki</option>
            <option value="female">Perempuan</option>
            <option value="other">Lainnya</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Privasi</label>
          <div style={styles.privacyRow}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Akun Privat</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Hanya pengikut yang bisa melihat postingan</div>
            </div>
            <label style={styles.toggleSwitch}>
              <input type="checkbox" checked={isPrivate} onChange={() => setIsPrivate(!isPrivate)} />
              <span style={styles.toggleSlider} />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80 },
  header: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '16px',
    borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0,
    background: 'var(--bg-primary)', zIndex: 10,
  },
  backBtn: { background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 4 },
  title: { margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', flex: 1 },
  saveBtn: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
    background: '#0891b2', color: '#fff', border: 'none', borderRadius: 8,
    fontWeight: 700, fontSize: 13, cursor: 'pointer',
  },
  container: { maxWidth: 600, margin: '0 auto', padding: '0 16px' },
  bannerWrap: { position: 'relative', height: 160, borderRadius: 12, overflow: 'hidden', margin: '16px 0 40px' },
  bannerImg: { width: '100%', height: '100%', objectFit: 'cover' },
  bannerPlaceholder: { width: '100%', height: '100%', background: 'linear-gradient(135deg, #0891b2, #06b6d4)' },
  bannerEditBtn: {
    position: 'absolute', bottom: 8, right: 8, display: 'flex', alignItems: 'center', gap: 4,
    padding: '6px 12px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
    color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  avatarWrap: {
    position: 'absolute', top: 120, left: '50%', transform: 'translateX(-50%)',
    width: 100, height: 100, borderRadius: '50%', border: '4px solid var(--bg-primary)',
    overflow: 'visible', background: 'var(--bg-tertiary)',
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' },
  avatarPlaceholder: {
    width: '100%', height: '100%', borderRadius: '50%',
    background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  avatarEditBtn: {
    position: 'absolute', bottom: 0, right: 0, width: 30, height: 30,
    borderRadius: '50%', background: '#0891b2', border: '2px solid var(--bg-primary)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  },
  formGroup: { marginBottom: 20 },
  label: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 },
  input: {
    width: '100%', padding: '12px 14px', background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--text-primary)',
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', padding: '12px 14px', background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--text-primary)',
    fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%', padding: '12px 14px', background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--text-primary)',
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
  },
  hint: { fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' },
  privacyRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px', background: 'var(--bg-secondary)', borderRadius: 10,
    border: '1px solid var(--border-color)',
  },
  toggleSwitch: { position: 'relative', width: 48, height: 28, flexShrink: 0, display: 'inline-block' },
  toggleSlider: {
    position: 'absolute', cursor: 'pointer', inset: 0, background: 'var(--bg-tertiary)',
    borderRadius: 28, transition: '0.3s',
  },
}
