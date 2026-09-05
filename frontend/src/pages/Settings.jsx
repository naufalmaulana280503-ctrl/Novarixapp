import React, { useEffect, useState } from 'react'
import { userSettingsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import {
  Globe, Shield, Bell, Palette, Lock, Eye, Download,
  ChevronRight, Info, Heart, MessageCircle, UserPlus,
  Clock, Trash2, Flag, HelpCircle, Smartphone
} from 'lucide-react'

export default function Settings() {
  const { currentUser, setTheme } = useAuth()
  const { language, setLanguage, languages, t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [appearanceDark, setAppearanceDark] = useState(true)
  const [antiSpy, setAntiSpy] = useState(false)
  const [modeOffline, setModeOffline] = useState(false)
  const [isVIP, setIsVIP] = useState(false)
  const [pushNotif, setPushNotif] = useState(true)
  const [emailNotif, setEmailNotif] = useState(false)
  const [privateAccount, setPrivateAccount] = useState(false)
  const [dataSaver, setDataSaver] = useState(false)
  const [autoplay, setAutoplay] = useState(true)
  const navigate = useNavigate()
  const { addToast } = useToast()

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const response = await userSettingsApi.get()
        if (!mounted) return
        setUser(currentUser)
        const settings = response.data?.settings || {}
        setAppearanceDark(settings.appearance !== 'light')
        setAntiSpy(!!settings.anti_spy)
        setModeOffline(!!settings.mode_offline)
        setIsVIP(currentUser?.role === 'elite' || currentUser?.is_premium === true)
      } catch (err) {
        console.error('Failed to load user', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [currentUser])

  const updateUserSettings = async (patch) => {
    try {
      await userSettingsApi.update(patch)
      setUser(currentUser)
      return true
    } catch (err) {
      console.error('Failed to update user settings', err)
      addToast({ type: 'error', text: 'Gagal menyimpan pengaturan' })
      return false
    }
  }

  const toggleAppearance = async () => {
    const next = !appearanceDark
    setAppearanceDark(next)
    addToast({ type: 'success', text: next ? 'Mode gelap aktif' : 'Mode terang aktif' })
    await updateUserSettings({ appearance: next ? 'dark' : 'light' })
    setTheme(next ? 'dark' : 'light')
  }

  const toggleAntiSpy = async () => {
    const next = !antiSpy
    setAntiSpy(next)
    addToast({ type: 'success', text: next ? 'Anti-Spy aktif' : 'Anti-Spy nonaktif' })
    await updateUserSettings({ anti_spy: next })
  }

  const togglePrivateAccount = async () => {
    const next = !privateAccount
    setPrivateAccount(next)
    addToast({ type: 'success', text: next ? 'Akun privat aktif' : 'Akun publik aktif' })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: '4px solid var(--bg-tertiary)', borderTopColor: '#0891b2', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  )

  return (
    <div className="settings-page" style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Pengaturan</h1>
          <p style={styles.subtitle}>Kelola akun dan preferensi kamu</p>
        </div>

        {/* Account Section */}
        <div className="settings-section">
          <div className="settings-section-title">Akun & Keamanan</div>
          <Link to="/settings/profile" className="settings-row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="settings-row-left">
              <div className="settings-row-icon"><UserPlus size={20} /></div>
              <div className="settings-row-text">
                <h4>Profil</h4>
                <p>Edit nama, bio, foto profil</p>
              </div>
            </div>
            <div className="settings-row-right"><ChevronRight size={18} /></div>
          </Link>
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Lock size={20} /></div>
              <div className="settings-row-text">
                <h4>Ganti Password</h4>
                <p>Ubah password akun kamu</p>
              </div>
            </div>
            <div className="settings-row-right"><ChevronRight size={18} /></div>
          </div>
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Shield size={20} /></div>
              <div className="settings-row-text">
                <h4>Autentikasi Dua Faktor</h4>
                <p>Tambahkan lapisan keamanan</p>
              </div>
            </div>
            <div className="settings-row-right"><ChevronRight size={18} /></div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="settings-section">
          <div className="settings-section-title">Privasi</div>
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Eye size={20} /></div>
              <div className="settings-row-text">
                <h4>Akun Privat</h4>
                <p>Hanya pengikut yang bisa melihat postingan</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={privateAccount} onChange={togglePrivateAccount} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Shield size={20} /></div>
              <div className="settings-row-text">
                <h4>Anti-Spy Mode</h4>
                <p>Sembunyikan info sensitif di layar</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={antiSpy} onChange={toggleAntiSpy} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Lock size={20} /></div>
              <div className="settings-row-text">
                <h4>Akun yang Diblokir</h4>
                <p>Kelola daftar blokir</p>
              </div>
            </div>
            <div className="settings-row-right"><ChevronRight size={18} /></div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="settings-section">
          <div className="settings-section-title">Notifikasi & Aktivitas</div>
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Bell size={20} /></div>
              <div className="settings-row-text">
                <h4>Notifikasi Push</h4>
                <p>Notifikasi di perangkat</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={pushNotif} onChange={() => setPushNotif(!pushNotif)} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Globe size={20} /></div>
              <div className="settings-row-text">
                <h4>Notifikasi Email</h4>
                <p>Update via email</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={emailNotif} onChange={() => setEmailNotif(!emailNotif)} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Clock size={20} /></div>
              <div className="settings-row-text">
                <h4>Riwayat Aktivitas</h4>
                <p>Lihat aktivitas terakhir</p>
              </div>
            </div>
            <div className="settings-row-right"><ChevronRight size={18} /></div>
          </div>
        </div>

        {/* Content Preferences */}
        <div className="settings-section">
          <div className="settings-section-title">Preferensi Konten</div>
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Heart size={20} /></div>
              <div className="settings-row-text">
                <h4>Konten yang Disukai</h4>
                <p>Lihat semua postingan yang kamu sukai</p>
              </div>
            </div>
            <div className="settings-row-right"><ChevronRight size={18} /></div>
          </div>
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Download size={20} /></div>
              <div className="settings-row-text">
                <h4>Penyimpanan & Data</h4>
                <p>Kelola penggunaan data</p>
              </div>
            </div>
            <div className="settings-row-right"><ChevronRight size={18} /></div>
          </div>
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Smartphone size={20} /></div>
              <div className="settings-row-text">
                <h4>Hemat Data</h4>
                <p>Kurangi penggunaan data seluler</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={dataSaver} onChange={() => setDataSaver(!dataSaver)} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Globe size={20} /></div>
              <div className="settings-row-text">
                <h4>Putar Otomatis</h4>
                <p>Putar video otomatis di feed</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={autoplay} onChange={() => setAutoplay(!autoplay)} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="settings-section">
          <div className="settings-section-title">Tampilan</div>
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Palette size={20} /></div>
              <div className="settings-row-text">
                <h4>Tema</h4>
                <p>{appearanceDark ? 'Mode Gelap' : 'Mode Terang'}</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={appearanceDark} onChange={toggleAppearance} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {/* Language Section */}
        <div className="settings-section">
          <div className="settings-section-title">Bahasa</div>
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Globe size={20} /></div>
              <div className="settings-row-text">
                <h4>Bahasa Aplikasi</h4>
                <p>Pilih bahasa tampilan</p>
              </div>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={styles.select}
            >
              {languages.map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Support & About */}
        <div className="settings-section">
          <div className="settings-section-title">Bantuan & Lainnya</div>
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><HelpCircle size={20} /></div>
              <div className="settings-row-text">
                <h4>Bantuan</h4>
                <p>Pusat bantuan & FAQ</p>
              </div>
            </div>
            <div className="settings-row-right"><ChevronRight size={18} /></div>
          </div>
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Flag size={20} /></div>
              <div className="settings-row-text">
                <h4>Laporkan Masalah</h4>
                <p>Kirim laporan bug</p>
              </div>
            </div>
            <div className="settings-row-right"><ChevronRight size={18} /></div>
          </div>
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Info size={20} /></div>
              <div className="settings-row-text">
                <h4>Tentang Novarix</h4>
                <p>Versi 1.0.0</p>
              </div>
            </div>
            <div className="settings-row-right"><ChevronRight size={18} /></div>
          </div>
        </div>

        {/* Logout */}
        <div style={{ padding: '24px 0', paddingBottom: 100 }}>
          <button
            onClick={() => {
              localStorage.clear()
              window.location.href = '/login'
            }}
            style={styles.logoutBtn}
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    paddingBottom: 80,
  },
  container: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '0 16px',
  },
  header: {
    padding: '24px 0 16px',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    margin: 0,
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    marginTop: 4,
  },
  select: {
    maxWidth: 160,
    borderRadius: 8,
    border: '1px solid var(--border-color)',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    padding: '8px 10px',
    fontSize: 13,
  },
  logoutBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: 12,
    border: '1px solid rgba(239,68,68,0.3)',
    background: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
}
