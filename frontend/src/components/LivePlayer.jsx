import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MusicPlayerWidget from './MusicPlayerWidget'

const LivePlayer = () => {
  const [mode, setMode] = useState('landscape')
  const [isStreamRunning, setIsStreamRunning] = useState(false)
  const navigate = useNavigate()
  const [mobileExpanded, setMobileExpanded] = useState(false)

  return (
    <div className="live-player-container" style={styles.container}>
      {/* Compact mobile header */}
      <div className="live-player-topbar" style={styles.topBar}>
        <div style={styles.liveBadge}>{isStreamRunning ? '🔴 LIVE' : 'LIVE'}</div>
        <div className="live-player-controls" style={styles.controls}>
          <button className="live-mode-btn" style={styles.modeBtn} onClick={() => setMode((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'))}>
            {mode === 'portrait' ? 'Landscape' : 'Portrait'}
          </button>
          <button className="live-action-btn" style={styles.actionBtn} onClick={() => navigate('/camera')}>
            📷 Camera
          </button>
          <button
            className="live-action-btn"
            style={{
              ...styles.actionBtn,
              backgroundColor: isStreamRunning ? 'rgba(239,68,68,0.18)' : 'var(--accent)',
            }}
            onClick={() => setIsStreamRunning((value) => !value)}
          >
            {isStreamRunning ? '⏹ Stop' : '▶ Start'}
          </button>
          <button className="live-action-btn" style={{ ...styles.actionBtn, backgroundColor: 'var(--accent)' }} onClick={() => navigate('/live/studio')}>
            🔴 Go Live
          </button>
        </div>
      </div>

      {/* Mobile expandable area */}
      <div className="live-player-area" style={styles.playerArea}>
        <div style={styles.videoPlaceholder}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#dbeafe', textAlign: 'center' }}>
            {isStreamRunning ? '🔴 Stream Active' : '📡 Live Stream'}
            {!isStreamRunning && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Tap Start untuk mulai streaming</div>}
          </div>
        </div>

        <div className="live-chat-column" style={styles.chatColumn}>
          <div style={styles.chatHeader}>💬 Live Chat</div>
          <div style={styles.chatBody}>
            <div style={styles.chatMessage}><strong>@alice</strong> Hello! ❤️</div>
            <div style={styles.chatMessage}><strong>@bob</strong> Loving the vibe 🎵</div>
          </div>
          <div style={styles.chatInputRow}>
            <input placeholder="Say something..." style={styles.chatInput} />
            <button style={styles.sendBtn}>Send</button>
          </div>
        </div>
      </div>

      <MusicPlayerWidget />
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 12,
    padding: 12,
    border: '1px solid var(--border-color)',
  },
  portrait: {},
  landscape: {},
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  liveBadge: { background: '#ef4444', color: '#fff', padding: '6px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12 },
  controls: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  modeBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', padding: '5px 8px', borderRadius: 8, color: '#dbeafe', cursor: 'pointer', fontSize: 11 },
  actionBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', padding: '5px 8px', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 11 },
  playerArea: { display: 'grid', gridTemplateColumns: '1fr', gap: 12, alignItems: 'start' },
  videoPlaceholder: { backgroundColor: 'var(--bg-tertiary)', minHeight: 180, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  chatColumn: { background: 'rgba(255,255,255,0.01)', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', minHeight: 120, maxHeight: 160 },
  chatHeader: { fontWeight: 700, marginBottom: 6, fontSize: 13 },
  chatBody: { flex: 1, overflowY: 'auto', paddingRight: 6 },
  chatMessage: { marginBottom: 6, color: '#e6e6ef', fontSize: 13 },
  chatInputRow: { display: 'flex', gap: 6, marginTop: 6 },
  chatInput: { flex: 1, padding: 6, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: 'transparent', color: '#e6e6ef', fontSize: 13 },
  sendBtn: { padding: '6px 10px', borderRadius: 8, backgroundColor: 'var(--accent)', border: 'none', color: 'var(--text-primary)', fontWeight: 700, fontSize: 12 },
}

export default LivePlayer
