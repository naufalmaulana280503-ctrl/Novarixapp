import React, { useEffect, useRef, useState } from 'react'
import signaling from '../services/signalingClient'

const DEFAULT_SOUND = '/sounds/donation_chime.mp3'

export default function DonationAlertOverlay({ streamId }) {
  const [alerts, setAlerts] = useState([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [voice, setVoice] = useState('soft')
  const [volume, setVolume] = useState(0.9)
  const [customSoundUrl, setCustomSoundUrl] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const customUrlRef = useRef('')

  const speakAlert = (payload) => {
    if (!soundEnabled) return
    const message = `${payload?.from || 'Seseorang'} mengirim gift ${payload?.amount || ''}`
    if (voice === 'custom' && customSoundUrl) {
      const audio = new Audio(customSoundUrl)
      audio.volume = volume
      audio.play().catch(() => {})
      return
    }
    if (!window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(message)
    utterance.volume = volume
    utterance.pitch = voice === 'robot' ? 0.45 : voice === 'barbar' ? 0.7 : 1.25
    utterance.rate = voice === 'barbar' ? 1.15 : voice === 'robot' ? 0.9 : 1
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    function onDonation(payload) {
      setAlerts(a => [payload, ...a].slice(0,5))
      speakAlert(payload)
    }

    signaling.on(`donation:${streamId}`, onDonation)
    return () => signaling.off(`donation:${streamId}`, onDonation)
  }, [streamId, soundEnabled, voice, volume, customSoundUrl])

  return (
    <div style={{position:'absolute', bottom:80, left:16, zIndex:20, display:'flex', flexDirection:'column', gap:8, maxWidth:300, pointerEvents:'auto'}}>
      <button type="button" onClick={() => setSettingsOpen(p => !p)} style={{...styles.settings, cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:'6px 10px', fontSize:11, fontWeight:700}}>
        🎁 Gift Sound {soundEnabled ? '🔊' : '🔇'}
      </button>
      {settingsOpen && (
      <div style={styles.settings}>
        <strong>Gift sound</strong>
        <button type="button" onClick={() => setSoundEnabled((enabled) => !enabled)} style={styles.toggle}>{soundEnabled ? 'ON' : 'OFF'}</button>
        <select value={voice} onChange={(event) => setVoice(event.target.value)} style={styles.select} disabled={!soundEnabled}>
          <option value="robot">Robot AI</option>
          <option value="soft">Perempuan lembut</option>
          <option value="barbar">Cowo barbar</option>
          <option value="custom">Audio custom</option>
        </select>
        <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => setVolume(Number(event.target.value))} disabled={!soundEnabled} />
        {voice === 'custom' && <input type="file" accept="audio/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) { const url = URL.createObjectURL(file); customUrlRef.current = url; setCustomSoundUrl(url) } }} />}
      </div>
      )}
      {alerts.map((a, idx) => (
        <div key={idx} style={{background:'linear-gradient(90deg,#111827,#0b1220)', padding:'10px 12px', borderRadius:10, color:'#fff', boxShadow:'0 6px 18px rgba(0,0,0,0.6)'}}>
          <div style={{fontWeight:700}}>{a.from} donated {a.amount}</div>
          <div style={{fontSize:13}}>{a.message}</div>
        </div>
      ))}
    </div>
  )
}

const styles = {
  settings: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, alignItems: 'center', background: 'rgba(17,24,39,0.94)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: 10, color: '#fff', fontSize: 11, backdropFilter: 'blur(8px)' },
  toggle: { border: '1px solid rgba(52,211,153,0.5)', background: 'rgba(16,185,129,0.18)', color: '#a7f3d0', borderRadius: 6, padding: '4px 7px', fontSize: 10, fontWeight: 800, cursor: 'pointer' },
  select: { gridColumn: '1 / -1', width: '100%', borderRadius: 6, padding: '5px 6px', background: '#111827', color: '#fff', border: '1px solid rgba(255,255,255,0.14)' },
}
