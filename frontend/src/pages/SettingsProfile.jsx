import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'

const PROF_BIO_LIMIT = 300
const STATUS_OPTIONS = [
  { value: '', label: '— Select status (optional) —' },
  { value: 'student', label: 'Student (Siswa)' },
  { value: 'college_student', label: 'College Student (Mahasiswa)' },
  { value: 'brand_ambassador', label: 'Brand Ambassador (BA)' },
  { value: 'ex_player', label: 'Ex-Player' },
  { value: 'pro_player', label: 'Pro Player / Competitive Scene' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'ceo', label: 'CEO' },
  { value: 'manager', label: 'Manager' },
  { value: 'unemployed', label: 'Unemployed (Pengangguran)' },
  { value: 'other', label: 'Other' },
]

const GAME_OPTIONS = [
  { value: '', label: '— Select game (optional) —' },
  { value: 'mobile-legends', label: 'Mobile Legends' },
  { value: 'pubg-mobile', label: 'PUBG Mobile' },
  { value: 'pubg-pc', label: 'PUBG PC' },
  { value: 'honor-of-kings', label: 'Honor of Kings' },
  { value: 'free-fire', label: 'Free Fire' },
  { value: 'dota2', label: 'Dota 2' },
]

const SettingsProfile = () => {
  const { currentUser, setCurrentUser } = useAuth()

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '')
  const [username, setUsername] = useState(currentUser?.username || '')
  const [usernameError, setUsernameError] = useState('')

  const sanitizeUsername = (value) => {
    if (!value) return ''
    // normalize: lowercase, spaces -> underscore, allow only a-z0-9._
    let v = String(value).toLowerCase()
    v = v.replace(/\s+/g, '_') // spaces -> underscore
    v = v.replace(/[^a-z0-9._]/g, '') // remove invalid chars
    v = v.replace(/_+/g, '_') // collapse underscores
    // trim leading/trailing underscores or dots
    v = v.replace(/^[_\.]+|[_\.]+$/g, '')
    return v
  }
  const [gender, setGender] = useState(currentUser?.gender || '')
  const [bio, setBio] = useState(currentUser?.bio || '')
  const [status, setStatus] = useState(currentUser?.status || '')
  const [gameAffiliation, setGameAffiliation] = useState(currentUser?.gameAffiliation || '')
  const [teamAffiliation, setTeamAffiliation] = useState(currentUser?.teamAffiliation || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatarUrl || currentUser?.avatar || currentUser?.profileImage || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!currentUser) return
    const nextAvatar = currentUser.avatarUrl || currentUser.avatar || currentUser.profileImage || currentUser.imageUrl || ''
    setAvatarPreview((prev) => prev || nextAvatar)
    // normalize initial username field
    if (currentUser.username) setUsername(sanitizeUsername(currentUser.username))
  }, [currentUser])

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    // basic image validation
    if (!f.type.startsWith('image/')) {
      setMessage('Please upload a valid image file')
      return
    }
    setAvatarFile(f)
    const url = URL.createObjectURL(f)
    setAvatarPreview(url)
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview('')
    if (fileInputRef.current) fileInputRef.current.value = null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      let updated = null
      let payloadAvatar = avatarPreview || currentUser?.avatarUrl || currentUser?.avatar || currentUser?.profileImage || ''

      if (avatarFile) {
        const form = new FormData()
        form.append('displayName', displayName)
        form.append('username', username)
        form.append('gender', gender)
        form.append('bio', bio)
        form.append('status', status)
        form.append('gameAffiliation', gameAffiliation)
        form.append('teamAffiliation', teamAffiliation)
        form.append('avatar', avatarFile)

        const res = await api.put('/auth/profile', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        updated = res.data.user || res.data
      } else {
        const sanitizedUsername = sanitizeUsername(username)
        const payload = { displayName, username: sanitizedUsername, gender, bio, status, gameAffiliation, teamAffiliation }
        const res = await api.put('/auth/profile', payload)
        updated = res.data.user || res.data
      }

      const sanitizedUsernameFinal = sanitizeUsername(username) || updated?.username || currentUser?.username || ''

      // When updating normalizedUser, prefer the server-updated values if provided (updated),
      // otherwise reflect exactly what the user typed in the form (including empty strings).
      const normalizedUser = {
        ...(currentUser || {}),
        ...(updated || {}),
        displayName: (updated && Object.prototype.hasOwnProperty.call(updated, 'displayName')) ? updated.displayName : displayName,
        username: (updated && Object.prototype.hasOwnProperty.call(updated, 'username')) ? updated.username : sanitizedUsernameFinal,
        bio: (updated && Object.prototype.hasOwnProperty.call(updated, 'bio')) ? updated.bio : bio,
        gender: (updated && Object.prototype.hasOwnProperty.call(updated, 'gender')) ? updated.gender : gender,
        status: (updated && Object.prototype.hasOwnProperty.call(updated, 'status')) ? updated.status : status,
        gameAffiliation: (updated && Object.prototype.hasOwnProperty.call(updated, 'gameAffiliation')) ? updated.gameAffiliation : gameAffiliation,
        teamAffiliation: (updated && Object.prototype.hasOwnProperty.call(updated, 'teamAffiliation')) ? updated.teamAffiliation : teamAffiliation,
        avatarUrl: updated?.avatarUrl ?? updated?.avatar ?? updated?.profileImage ?? updated?.imageUrl ?? payloadAvatar,
        avatar: updated?.avatar ?? updated?.avatarUrl ?? payloadAvatar,
        profileImage: updated?.profileImage ?? updated?.avatarUrl ?? payloadAvatar,
      }

      if (setCurrentUser) {
        setCurrentUser(normalizedUser)
      }
      localStorage.setItem('user', JSON.stringify(normalizedUser))
      setMessage('Profile updated successfully')
    } catch (err) {
      console.error(err)
      setMessage(err?.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 780, margin: '32px auto', color: 'var(--text-primary)' }}>
      <h2 style={{ marginBottom: 12 }}>Settings — Edit Profile</h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 140, textAlign: 'center' }}>
            <div style={{ width: 120, height: 120, margin: '0 auto', borderRadius: 12, overflow: 'hidden', background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  No avatar
                </div>
              )}
            </div>

            <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <label style={{ cursor: 'pointer', padding: '6px 10px', borderRadius: 8, background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                Upload
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
                          <button type="button" onClick={handleRemoveAvatar} style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: 'none' }}>Remove</button>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column' }}>
              Display name
              <input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column' }}>
              Username
              <input value={username} onChange={(e)=>{
                const raw = e.target.value
                const sanitized = sanitizeUsername(raw)
                setUsername(sanitized)
                // simple validation
                if (!sanitized) setUsernameError('Username cannot be empty or contain only invalid characters')
                else if (sanitized.length < 3) setUsernameError('Username too short (min 3 chars)')
                else setUsernameError('')
              }} style={inputStyle} />
              {usernameError && <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 6 }}>{usernameError}</div>}
            </label>

          </div>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column' }}>
          Bio
          <textarea value={bio} onChange={(e)=>setBio(e.target.value.slice(0, PROF_BIO_LIMIT))} rows={4} style={{ ...inputStyle, minHeight: 100 }} />
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right' }}>{bio.length}/{PROF_BIO_LIMIT}</div>
        </label>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button type="submit" disabled={saving} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={()=>{
            // reset to user values
            setDisplayName(currentUser?.displayName || '')
            setUsername(sanitizeUsername(currentUser?.username || ''))
            setGender(currentUser?.gender || '')
            setBio(currentUser?.bio || '')
            setStatus(currentUser?.status || '')
            setGameAffiliation(currentUser?.gameAffiliation || '')
            setTeamAffiliation(currentUser?.teamAffiliation || '')
            setAvatarFile(null)
            setAvatarPreview(currentUser?.avatarUrl || '')
            setMessage(null)
            setUsernameError('')
            if (fileInputRef.current) fileInputRef.current.value = null
                  }} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: 'none' }}>Reset</button>
        </div>

        {message && <div style={{ marginTop: 8, color: 'var(--success)' }}>{message}</div>}
      </form>
    </div>
  )
}

const inputStyle = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--input-border)',
  background: 'var(--input-bg)',
  color: 'var(--input-text)',
  marginTop: 6,
}

export default SettingsProfile
