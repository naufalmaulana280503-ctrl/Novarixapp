import React, { useEffect, useState } from 'react'
import { userSettingsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

const IconAppearance = ({size=20}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
)
const IconSecurity = ({size=20}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l7 4v5c0 5-3 9-7 11-4-2-7-6-7-11V6l7-4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
)
const IconVIP = ({size=20}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l2.6 6.4L21 9l-5 3.6L17.2 21 12 17.8 6.8 21 8 12.6 3 9l6.4-0.6L12 2z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/></svg>
)
const IconLock = ({size=16}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
)

export default function Settings() {
  const { currentUser, setTheme } = useAuth()
  const { language, setLanguage, languages, t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [appearanceDark, setAppearanceDark] = useState(true)
  const [antiSpy, setAntiSpy] = useState(false)
  const [modeOffline, setModeOffline] = useState(false)
  const [isVIP, setIsVIP] = useState(false)
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
        // roles can be in metadata.roles or in app_metadata
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
    // optimistic update already applied by caller
    try {
      const { data } = await userSettingsApi.update(patch)
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
    // apply theme classes to root so CSS variables control colors
    setTheme(next ? 'dark' : 'light')
  }

  const toggleAntiSpy = async () => {
    const next = !antiSpy
    setAntiSpy(next)
    addToast({ type: 'success', text: next ? 'Anti-Spy aktif' : 'Anti-Spy nonaktif' })
    await updateUserSettings({ anti_spy: next })
  }

  const toggleModeOffline = async () => {
    if (!isVIP) {
      addToast({ type: 'info', text: 'Mode Offline khusus VIP' })
      return
    }
    const next = !modeOffline
    setModeOffline(next)
    addToast({ type: 'success', text: next ? 'Mode Offline aktif' : 'Mode Offline nonaktif' })
    await updateUserSettings({ mode_offline: next })
  }

  if (loading) return <div style={pageStyles.container}><div style={pageStyles.card}>Loading settings...</div></div>

  return (
    <div style={pageStyles.container}>
      <div style={pageStyles.card}>
        <h2 style={pageStyles.title}>Settings</h2>
        <p style={pageStyles.subtitle}>Manage your account and app preferences</p>

        <div style={pageStyles.group}>
          <div style={pageStyles.groupHeader}><strong>Account</strong></div>
          <div style={pageStyles.row}>
            <div style={pageStyles.rowLeft}><div style={pageStyles.icon}><IconVIP /></div><div><div style={pageStyles.rowTitle}>Profile</div><div style={pageStyles.rowSubtitle}>Manage your account</div></div></div>
            <div style={pageStyles.rowRight}><Link to="/settings/profile" style={pageStyles.link}>Open</Link></div>
          </div>
        </div>

        <div style={pageStyles.group}>
          <div style={pageStyles.groupHeader}><strong>Appearance</strong></div>
          <div style={pageStyles.row}>
            <div style={pageStyles.rowLeft}><div style={pageStyles.icon}><IconAppearance /></div><div><div style={pageStyles.rowTitle}>Theme</div><div style={pageStyles.rowSubtitle}>Toggle light/dark mode</div></div></div>
            <div style={pageStyles.rowRight}><label style={pageStyles.switch}><input type="checkbox" checked={appearanceDark} onChange={toggleAppearance} /><span style={pageStyles.slider}></span></label></div>
          </div>
        </div>

        <div style={pageStyles.group}>
          <div style={pageStyles.groupHeader}><strong>Security & Privacy</strong></div>
          <div style={pageStyles.row}>
            <div style={pageStyles.rowLeft}><div style={pageStyles.icon}><IconSecurity /></div><div><div style={pageStyles.rowTitle}>Anti-Spy Mode</div><div style={pageStyles.rowSubtitle}>Reduce sensitive info on screen</div></div></div>
            <div style={pageStyles.rowRight}><label style={pageStyles.switch}><input type="checkbox" checked={antiSpy} onChange={toggleAntiSpy} /><span style={pageStyles.slider}></span></label></div>
          </div>

          <div style={pageStyles.row}>
            <div style={pageStyles.rowLeft}><div style={pageStyles.icon}><IconVIP /></div><div><div style={pageStyles.rowTitle}>Mode Offline <span style={pageStyles.vipBadge}>VIP</span></div><div style={pageStyles.rowSubtitle}>Appear offline to others</div></div></div>
            <div style={pageStyles.rowRight}>
              {isVIP ? (
                <label style={pageStyles.switch}><input type="checkbox" checked={modeOffline} onChange={toggleModeOffline} /><span style={pageStyles.slider}></span></label>
              ) : (
                <button style={pageStyles.lockBtn} title="VIP required" onClick={() => addToast({ type: 'info', text: 'Mode Offline khusus VIP' })}><IconLock /></button>
              )}
            </div>
          </div>
        </div>

        <div style={pageStyles.group}>
          <div style={pageStyles.groupHeader}><strong>{t('language')}</strong></div>
          <div style={pageStyles.row}>
            <div style={pageStyles.rowLeft}><div style={pageStyles.icon}><IconAppearance /></div><div><div style={pageStyles.rowTitle}>{t('language')}</div><div style={pageStyles.rowSubtitle}>Pilih bahasa untuk seluruh aplikasi</div></div></div>
            <select value={language} onChange={(event) => setLanguage(event.target.value)} style={pageStyles.languageSelect}>
              {languages.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </div>
        </div>

        <div style={pageStyles.group}>
          <div style={pageStyles.groupHeader}><strong>App</strong></div>
          <div style={pageStyles.row}>
            <div style={pageStyles.rowLeft}><div style={pageStyles.icon}><IconAppearance /></div><div><div style={pageStyles.rowTitle}>About</div><div style={pageStyles.rowSubtitle}>App version and info</div></div></div>
            <div style={pageStyles.rowRight}><span style={pageStyles.muted}>v1.0.0</span></div>
          </div>
        </div>

      </div>
    </div>
  )
}

const pageStyles = {
  container: { padding: '20px max(12px, 3vw)', display:'flex', justifyContent:'center', width: '100%' },
  card: { width: 'min(720px, 100%)', background: 'var(--bg-secondary)', padding: 'clamp(14px, 3vw, 20px)', borderRadius: 12, border: '1px solid var(--border-color)', color: 'var(--text-primary)' },
  title: { margin: 0 },
  subtitle: { color: 'var(--text-secondary)', marginTop: 4, marginBottom: 12 },
  group: { marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-color)' },
  groupHeader: { marginBottom: 8, color: 'var(--text-secondary)', fontSize: 13 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' },
  rowLeft: { display: 'flex', gap: 12, alignItems: 'center' },
  icon: { width: 44, height: 44, borderRadius: 10, background: 'var(--pill-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontWeight: 700 },
  rowSubtitle: { color: 'var(--text-secondary)', fontSize: 13 },
  rowRight: {},
  link: { color: '#0891b2', textDecoration: 'none', fontWeight: 700 },
  switch: { position: 'relative', display: 'inline-block', width: 52, height: 30 },
  slider: { position: 'absolute', cursor: 'pointer', top: 4, left: 4, right: 4, bottom: 4, backgroundColor: 'var(--bg-tertiary)', borderRadius: 20, transition: '0.2s', display: 'block' },
  vipBadge: { background: 'linear-gradient(90deg,#F59E0B,#F97316)', padding: '2px 6px', borderRadius: 6, color: '#000', fontWeight: 700, fontSize: 11, marginLeft: 8 },
  lockBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.04)', padding: 8, borderRadius: 8, color: '#9aa0c7', cursor: 'pointer' },
  muted: { color: '#9aa0c7' },
  languageSelect: { maxWidth: 180, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '8px' },
}
