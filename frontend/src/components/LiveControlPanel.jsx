import React, { useState } from 'react'

function formatDuration(s = 0) {
  const sec = Math.floor(s % 60)
  const min = Math.floor((s / 60) % 60)
  const hr = Math.floor(s / 3600)
  return `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const STATUS_LABELS = {
  idle: 'Ready',
  connecting: 'Connecting',
  live: 'Live',
  ended: 'Ended',
}

const LiveControlPanel = ({
  isLive,
  liveState = 'idle',
  onGoLive,
  onEndLive,
  onPauseStream,
  onFollow,
  stats,
  quality,
  onQualityChange,
  networkQuality,
  errorMessage,
  viewerCount = 1245,
  isPaused = false,
}) => {
  const [followed, setFollowed] = useState(false)

  const currentState = isLive ? 'live' : liveState
  const buttonDisabled = currentState === 'connecting'

  const actionLabel = currentState === 'connecting'
    ? 'Connecting...'
    : currentState === 'live'
      ? 'End Live'
      : currentState === 'ended'
        ? 'Retry Live'
        : 'Go Live'

  const handleFollowClick = () => {
    setFollowed((v) => !v)
    if (onFollow) onFollow(!followed)
  }

  return (
    <div style={{ padding: 14, background: 'rgba(8,10,16,0.94)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 12, color: '#fff', minWidth: 260, maxWidth: 340, boxShadow: '0 10px 30px rgba(0,0,0,0.45)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <button
          onClick={currentState === 'live' ? onEndLive : onGoLive}
          disabled={buttonDisabled}
          style={{
            ...baseButton,
            ...(currentState === 'live' ? endStyle : goStyle),
            opacity: buttonDisabled ? 0.7 : 1,
            cursor: buttonDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          {actionLabel}
        </button>

        <div style={{
          fontSize: 11,
          padding: '4px 8px',
          borderRadius: 999,
          background: currentState === 'live' ? 'rgba(16,185,129,0.2)' : currentState === 'connecting' ? 'rgba(59,130,246,0.2)' : 'rgba(148,163,184,0.2)',
          color: '#e2e8f0',
          border: '1px solid rgba(255,255,255,0.12)',
          whiteSpace: 'nowrap',
        }}>
          {isPaused ? 'Paused' : STATUS_LABELS[currentState] || 'Ready'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button
          type="button"
          onClick={onPauseStream}
          disabled={!isLive}
          style={{ ...smallButton, background: isPaused ? '#f59e0b' : 'rgba(255,255,255,0.08)', opacity: isLive ? 1 : 0.45 }}
        >
          {isPaused ? 'Resume Stream' : 'Pause Stream'}
        </button>
        <button
          type="button"
          onClick={handleFollowClick}
          style={{ ...smallButton, background: followed ? 'linear-gradient(90deg,#10b981,#06b6d4)' : 'linear-gradient(90deg,#0891b2,#0ea5e9)' }}
        >
          {followed ? 'Following ✔️' : 'Follow'}
        </button>
      </div>

      <div style={{ fontSize: 12, lineHeight: 1.5, color: '#dbeafe' }}>
        <div><b>Bitrate:</b> {stats?.bitrate ? `${Math.round(stats.bitrate / 1000)} kbps` : '—'}</div>
        <div><b>Dropped:</b> {stats?.droppedFrames ?? '—'}</div>
        <div><b>Latency:</b> {stats?.rtt ? `${Math.round(stats.rtt)} ms` : '—'}</div>
        <div><b>Duration:</b> {formatDuration(stats?.durationSeconds)}</div>
        <div><b>Viewers:</b> {Number(viewerCount).toLocaleString()} </div>
        <div><b>Network:</b> {networkQuality || 'Checking...'}</div>
      </div>

      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 12, color: '#cbd5e1' }}>Broadcast Quality</label>
        <select
          value={quality}
          onChange={(e) => onQualityChange && onQualityChange(e.target.value)}
          style={{ display: 'block', width: '100%', marginTop: 6, borderRadius: 8, padding: '6px 8px' }}
        >
          <option value="1080p">FHD (1080p)</option>
          <option value="1440p">QHD (1440p)</option>
          <option value="2160p">4K (2160p)</option>
          <option value="4320p">8K (4320p)</option>
        </select>
      </div>

      {errorMessage && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#fca5a5', background: 'rgba(127,29,29,0.35)', borderRadius: 8, padding: '6px 8px' }}>
          {errorMessage}
        </div>
      )}
    </div>
  )
}

const baseButton = {
  border: 'none',
  borderRadius: 9,
  padding: '11px 16px',
  fontWeight: 800,
  color: '#fff',
  minWidth: 138,
  fontSize: 13,
  boxShadow: '0 5px 16px rgba(0,0,0,0.35)',
}

const smallButton = {
  border: 'none',
  borderRadius: 8,
  padding: '6px 10px',
  fontWeight: 700,
  color: '#fff',
  fontSize: 11,
  flex: 1,
  cursor: 'pointer',
}

const goStyle = {
  background: 'linear-gradient(90deg,#06b6d4,#0891b2)',
  border: '1px solid rgba(255,255,255,0.32)',
}

const endStyle = {
  background: '#ef4444',
  border: '1px solid #fecaca',
}

export default LiveControlPanel
