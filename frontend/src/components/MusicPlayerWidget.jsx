import React from 'react'

const MusicPlayerWidget = () => {
  return (
    <div style={styles.player}>
      <div style={styles.row}>
        <div style={styles.trackInfo}>
          <div style={styles.trackTitle}>Ambient Loop</div>
          <div style={styles.trackArtist}>Novarix Radio</div>
        </div>
        <div style={styles.controls}>▶️ ⏸️ ⏭️</div>
      </div>
    </div>
  )
}

const styles = {
  player: {
    position:'absolute',
    right: 14,
    bottom: 14,
    background: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.04)',
    minWidth: 220,
  },
  row: { display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 },
  trackInfo: { display:'flex', flexDirection:'column' },
  trackTitle: { fontWeight:700, fontSize:13, color:'#e6e6ef' },
  trackArtist: { fontSize:12, color:'#9aa0c7' },
  controls: { fontSize:14 }
}

export default MusicPlayerWidget
