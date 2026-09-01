import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { editorApi } from '../services/api'

const TRANSITIONS = [
  { id: 'fade', name: 'Fade' },
  { id: 'slide', name: 'Slide' },
  { id: 'zoom', name: 'Zoom' },
  { id: 'blur', name: 'Blur' },
]

const Editor = () => {
  const { postId } = useParams()
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(100)
  const [speed, setSpeed] = useState(1)
  const [selectedTransition, setSelectedTransition] = useState('fade')
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const handleExport = async () => {
    if (!postId) return
    setExporting(true)
    setExportProgress(0)
    try {
      await editorApi.exportVideo(postId)
      setExportProgress(100)
      setTimeout(() => setExporting(false), 2000)
    } catch (err) {
      console.error('Export failed:', err)
      setExporting(false)
    }
  }

  const handleTrimApply = async () => {
    if (!postId) return
    try {
      await editorApi.trimVideo(postId, { start: trimStart, end: trimEnd })
    } catch (err) {
      console.error('Trim failed:', err)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.sidebarSpacer}></div>
      <div style={styles.mainContent}>
        <div style={styles.pageHeader}>
          <h1 style={styles.title}>Video Editor</h1>
          <p style={styles.subtitle}>Edit and enhance your video</p>
        </div>

        <div style={styles.editorLayout}>
          <div style={styles.previewSection}>
            <div style={styles.previewArea}>
              <div style={styles.previewPlaceholder}>
                <span style={styles.previewIcon}>🎬</span>
                <p style={styles.previewText}>
                  {postId ? 'Preview your video here' : 'Select a video to edit'}
                </p>
              </div>
            </div>

            <div style={styles.timeline}>
              <div style={styles.timelineTrack}>
                <div style={styles.trimHandleLeft}></div>
                <div style={{ ...styles.trimRegion, left: `${trimStart}%`, width: `${trimEnd - trimStart}%` }}></div>
                <div style={styles.trimHandleRight}></div>
              </div>
              <div style={styles.timelineLabels}>
                <span style={styles.timelineLabel}>0:00</span>
                <span style={styles.timelineLabel}>3:00</span>
              </div>
            </div>

            <div style={styles.controls}>
              <div style={styles.controlGroup}>
                <label style={styles.controlLabel}>Trim</label>
                <div style={styles.sliderGroup}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={trimStart}
                    onChange={(e) => setTrimStart(Number(e.target.value))}
                    style={styles.slider}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(Number(e.target.value))}
                    style={styles.slider}
                  />
                </div>
                <button onClick={handleTrimApply} style={styles.applyButton}>Apply Trim</button>
              </div>

              <div style={styles.controlGroup}>
                <label style={styles.controlLabel}>Speed</label>
                <div style={styles.speedControls}>
                  {[0.25, 0.5, 1, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      style={{
                        ...styles.speedButton,
                        backgroundColor: speed === s ? '#0891b2' : '#262626',
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.controlGroup}>
                <label style={styles.controlLabel}>Transitions</label>
                <div style={styles.transitionList}>
                  {TRANSITIONS.map((trans) => (
                    <button
                      key={trans.id}
                      onClick={() => setSelectedTransition(trans.id)}
                      style={{
                        ...styles.transitionButton,
                        backgroundColor: selectedTransition === trans.id ? '#0891b2' : '#262626',
                      }}
                    >
                      {trans.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.exportSection}>
                <button
                  onClick={handleExport}
                  disabled={exporting || !postId}
                  style={{
                    ...styles.exportButton,
                    opacity: (exporting || !postId) ? 0.6 : 1,
                  }}
                >
                  {exporting ? `Exporting... ${exportProgress}%` : 'Export Video'}
                </button>
                {exporting && (
                  <div style={styles.progressBar}>
                    <div style={{ ...styles.progressFill, width: `${exportProgress}%` }}></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={styles.rightSpacer}></div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0f0f0f',
  },
  sidebarSpacer: {
    width: '240px',
    flexShrink: 0,
  },
  mainContent: {
    flex: 1,
    maxWidth: '900px',
    margin: '0 auto',
    paddingTop: '60px',
    borderLeft: '1px solid #2d2d2d',
    borderRight: '1px solid #2d2d2d',
    minHeight: '100vh',
  },
  pageHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #2d2d2d',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: '14px',
    color: '#a0a0a0',
  },
  editorLayout: {
    padding: '24px',
  },
  previewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  previewArea: {
    aspectRatio: '16/9',
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    border: '1px solid #2d2d2d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewPlaceholder: {
    textAlign: 'center',
  },
  previewIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  previewText: {
    fontSize: '16px',
    color: '#a0a0a0',
  },
  timeline: {
    padding: '16px 0',
  },
  timelineTrack: {
    position: 'relative',
    height: '60px',
    backgroundColor: '#262626',
    borderRadius: '8px',
    border: '1px solid #2d2d2d',
  },
  trimRegion: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(8, 145, 178, 0.2)',
    border: '2px solid #0891b2',
  },
  trimHandleLeft: {
    position: 'absolute',
    left: '0',
    top: '0',
    bottom: '0',
    width: '8px',
    backgroundColor: '#0891b2',
    borderRadius: '4px 0 0 4px',
    cursor: 'ew-resize',
  },
  trimHandleRight: {
    position: 'absolute',
    right: '0',
    top: '0',
    bottom: '0',
    width: '8px',
    backgroundColor: '#0891b2',
    borderRadius: '0 4px 4px 0',
    cursor: 'ew-resize',
  },
  timelineLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
  },
  timelineLabel: {
    fontSize: '12px',
    color: '#6b6b6b',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  controlLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
  },
  sliderGroup: {
    display: 'flex',
    gap: '16px',
  },
  slider: {
    flex: 1,
    accentColor: '#0891b2',
    cursor: 'pointer',
  },
  applyButton: {
    backgroundColor: '#262626',
    color: '#ffffff',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    border: '1px solid #2d2d2d',
    alignSelf: 'flex-start',
  },
  speedControls: {
    display: 'flex',
    gap: '8px',
  },
  speedButton: {
    padding: '10px 16px',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    border: 'none',
  },
  transitionList: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  transitionButton: {
    padding: '10px 16px',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '13px',
    border: 'none',
  },
  exportSection: {
    marginTop: '16px',
  },
  exportButton: {
    width: '100%',
    backgroundColor: '#0891b2',
    color: '#ffffff',
    padding: '14px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#262626',
    borderRadius: '4px',
    marginTop: '12px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0891b2',
    transition: 'width 0.3s ease',
  },
  rightSpacer: {
    width: '320px',
    flexShrink: 0,
    display: 'none',
  },
}

export default Editor
