import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api, cameraApi } from '../services/api'
import EffectsLibrary from '../components/EffectsLibrary'

// Modern SVG icons used in the camera toolbar
const IconGear = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09c.7 0 1.27-.45 1.51-1a1.65 1.65 0 00-.33-1.82l-.06-.06A2 2 0 016.9 3.2l.06.06c.48.48 1.18.67 1.82.33.5-.26 1.06-.4 1.63-.4H12c.57 0 1.13.14 1.63.4.64.34 1.34.15 1.82-.33l.06-.06A2 2 0 0119.4 4.1l-.06.06c-.66.66-.85 1.56-.33 2.33.26.5.4 1.06.4 1.63V12c0 .57-.14 1.13-.4 1.63-.52.77-.33 1.67.33 2.33l.06.06z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IconBoomerang = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12c0 3.9 3.1 7 7 7 1.3 0 2.5-.3 3.6-.9L21 14l-2-2-7.4 3.1C11.6 15 9.4 14 8 12.6 6.6 11.2 6 9 6 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IconLighting = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IconEffects = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IconNovarix = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2l1.8 4.6L18.8 8l-4 3.1L15 15l-3-1.9L9 15l.2-3.9L5.2 8l4-1.4L12 2z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" />
  </svg>
)

const IconStabilizer = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)

const IconClose = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)


const RESOLUTIONS = [
  { label: '360p', value: '360p' },
  { label: '480p', value: '480p' },
  { label: '720p', value: '720p' },
  { label: '1080p', value: '1080p' },
  { label: '4K', value: '2160p' },
  { label: '8K', value: '4320p' },
]

const RESOLUTION_DIMENSIONS = {
  '360p': { width: 640, height: 360 },
  '480p': { width: 854, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '2160p': { width: 3840, height: 2160 },
  '4320p': { width: 7680, height: 4320 },
}

const SLOW_MOTION_SPEEDS = [1, 10, 100, 500, 1000]

const Camera = () => {
  const [mode, setMode] = useState('photo')
  const [facing, setFacing] = useState('environment')
  const [resolution, setResolution] = useState('1080p')
  const [slowMotion, setSlowMotion] = useState(false)
  const [slowMotionSpeed, setSlowMotionSpeed] = useState(1000)
  const [novarixEnabled, setNovarixEnabled] = useState(false)
  const [boomerangEnabled, setBoomerangEnabled] = useState(false)
  const [lightingEnabled, setLightingEnabled] = useState(false)
  const [effectsOpen, setEffectsOpen] = useState(false)
  const [selectedEffect, setSelectedEffect] = useState('none')
  const [stabilizerEnabled, setStabilizerEnabled] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [stream, setStream] = useState(null)
  const [error, setError] = useState('')
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [showStudioPanel, setShowStudioPanel] = useState(false)
  const [studioMounted, setStudioMounted] = useState(false)
  const [studioVisible, setStudioVisible] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)

  const openStudio = () => {
    setStudioMounted(true)
    // small timeout to allow mount then trigger transition
    requestAnimationFrame(() => setStudioVisible(true))
  }
  const closeStudio = () => {
    setStudioVisible(false)
    // wait for animation to finish then unmount
    setTimeout(() => setStudioMounted(false), 260)
  }

  // When novarix (formerly beauty) or selected effect changes, notify backend to apply effect
  useEffect(() => {
    let cancelled = false
    const apply = async () => {
      try {
        // backend expects some data; send enabled flag and effect id
        await cameraApi.applyBeautyEffect({ enabled: novarixEnabled, effect: selectedEffect })
      } catch (err) {
        if (!cancelled) console.error('Failed to apply Novarix effect:', err)
      }
    }
    apply()
    return () => { cancelled = true }
  }, [novarixEnabled, selectedEffect])

  useEffect(() => {
    // Try to request camera on mount to prompt permission automatically where allowed.
    // If browser blocks ambient permission request, user can click "Mulai Kamera" to trigger via user gesture.
    startCamera({requestAudio:false}).catch(() => {})
    return () => streamRef.current?.getTracks().forEach(track => track.stop())
  }, [facing, resolution])

  const startCamera = async ({ requestAudio = false } = {}) => {
    try {
      streamRef.current?.getTracks().forEach(track => track.stop())
      const dimensions = RESOLUTION_DIMENSIONS[resolution] || RESOLUTION_DIMENSIONS['1080p']
      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: dimensions.width },
          height: { ideal: dimensions.height },
        },
        audio: requestAudio || mode === 'video',
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = mediaStream
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        try { await videoRef.current.play() } catch (e) { /* autoplay may be blocked until user gesture */ }
      }
      setError('')
      return mediaStream
    } catch (err) {
      setError('Camera access denied or unavailable. Please check permissions.')
      console.error('Camera error:', err)
      throw err
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const dimensions = RESOLUTION_DIMENSIONS[resolution] || RESOLUTION_DIMENSIONS['1080p']
    canvas.width = video.videoWidth || dimensions.width
    canvas.height = video.videoHeight || dimensions.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/png')
    setCapturedPhoto(dataUrl)
  }

  const toggleRecording = async () => {
    if (!stream) return
    if (isRecording) {
      recorderRef.current?.stop()
      recorderRef.current = null
      setIsRecording(false)
      return
    }
    try {
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
      recorderRef.current = mediaRecorder
      const chunks = []
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = async () => {
        recorderRef.current = null
        const blob = new Blob(chunks, { type: 'video/webm' })
        const formData = new FormData()
        formData.append('video', blob)
        formData.append('resolution', resolution)
        formData.append('slowMotion', slowMotion ? slowMotionSpeed.toString() : 'false')
        try {
          await api.post('/camera/record', formData)
        } catch (err) {
          console.error('Failed to save recording:', err)
        }
      }
      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Recording failed:', err)
    }
  }

  const retakePhoto = () => {
    setCapturedPhoto(null)
  }

  const savePhoto = async () => {
    if (!capturedPhoto) return
    try {
      const blob = await (await fetch(capturedPhoto)).blob()
      const formData = new FormData()
      formData.append('photo', blob, 'photo.png')
      await api.post('/camera/photo', formData)
      setCapturedPhoto(null)
    } catch (err) {
      console.error('Failed to save photo:', err)
    }
  }

  return (
    <div className="camera-page" style={styles.container}>
      <div className="camera-sidebar-spacer" style={styles.sidebarSpacer}></div>
      <div className="camera-main" style={styles.mainContent}>
        <div className="camera-header" style={styles.pageHeader}>
          <h1 style={styles.title}>Camera</h1>
          <p style={styles.subtitle}>Take photos and record videos</p>
        </div>

        <div style={styles.cameraSection}>
          {error && <div style={styles.error}>{error}</div>}

          {capturedPhoto ? (
            <div style={styles.previewContainer}>
              <img src={capturedPhoto} alt="Captured" style={styles.previewImage} />
              <div style={styles.previewActions}>
                <button onClick={retakePhoto} style={styles.previewButton}>Retake</button>
                <button onClick={savePhoto} style={styles.previewButton}>Save</button>
              </div>
            </div>
          ) : (
            <div style={styles.viewfinder}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  ...styles.video,
                  transform: `${facing === 'user' ? 'scaleX(-1)' : 'scaleX(1)'} scale(${zoom})`,
                  transformOrigin: 'center',
                }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <div className="camera-overlay" style={styles.cameraOverlay}>
                <div style={styles.topControls}>
                  <div style={styles.leftTopControls}>
                    <button
                      onClick={openStudio}
                      style={styles.iconButton}
                      title="Camera Studio"
                    >
                      <IconGear />
                    </button>
                  </div>

                  <div style={styles.rightTopControls}>
                    <button onClick={() => setFacing(facing === 'user' ? 'environment' : 'user')} style={styles.controlButton} title="Flip Camera">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 10v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 14V8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 10a8 8 0 10-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>

                    {mode === 'video' && (
                      <button
                        onClick={() => setSlowMotion(!slowMotion)}
                        style={{
                          ...styles.controlButton,
                          backgroundColor: slowMotion ? '#0891b2' : 'rgba(0,0,0,0.5)',
                        }}
                        title="Slow Motion"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    )}

                    {/* Boomerang */}
                    <button
                      onClick={() => setBoomerangEnabled(!boomerangEnabled)}
                      style={{
                        ...styles.controlButton,
                        backgroundColor: boomerangEnabled ? '#0891b2' : 'rgba(0,0,0,0.5)',
                      }}
                      title="Boomerang"
                    >
                      <IconBoomerang />
                    </button>

                    {/* Lighting */}
                    <button
                      onClick={() => setLightingEnabled(!lightingEnabled)}
                      style={{
                        ...styles.controlButton,
                        backgroundColor: lightingEnabled ? '#f59e0b' : 'rgba(0,0,0,0.5)',
                      }}
                      title="Lighting"
                    >
                      <IconLighting />
                    </button>

                    {/* Effects */}
                    <button
                      onClick={() => setEffectsOpen(!effectsOpen)}
                      style={{
                        ...styles.controlButton,
                        backgroundColor: effectsOpen ? '#06b6d4' : 'rgba(0,0,0,0.5)',
                      }}
                      title="Effects"
                    >
                      <IconEffects />
                    </button>

                    {/* Novarix (former Beauty) */}
                    <button
                      onClick={() => setNovarixEnabled(!novarixEnabled)}
                      style={{
                        ...styles.controlButton,
                        backgroundColor: novarixEnabled ? '#a78bfa' : 'rgba(0,0,0,0.5)',
                      }}
                      title="Novarix"
                    >
                      <div style={{display:'flex',alignItems:'center',gap:8}}><IconNovarix /><span style={{fontSize:12}}>Novarix</span></div>
                    </button>

                    {/* Stabilizer */}
                    <button
                      onClick={() => setStabilizerEnabled(!stabilizerEnabled)}
                      style={{
                        ...styles.controlButton,
                        backgroundColor: stabilizerEnabled ? '#10b981' : 'rgba(0,0,0,0.5)',
                      }}
                      title="Stabilizer"
                    >
                      <IconStabilizer />
                    </button>
                  </div>
                </div>

                {slowMotion && (
                  <div style={styles.speedSelector}>
                    {SLOW_MOTION_SPEEDS.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setSlowMotionSpeed(speed)}
                        style={{
                          ...styles.speedButton,
                          backgroundColor: slowMotionSpeed === speed ? '#0891b2' : 'rgba(0,0,0,0.5)',
                        }}
                      >
                        {speed}fps
                      </button>
                    ))}
                  </div>
                )}

                {/* Effects panel */}
                {effectsOpen && (
                  <div style={{ position: 'absolute', top: 72, left: 16, zIndex: 30, pointerEvents: 'auto' }}>
                    <EffectsLibrary selected={selectedEffect} onSelect={(id) => { setSelectedEffect(id); setEffectsOpen(false); }} />
                  </div>
                )}

                {/* Camera Studio panel (settings) */}
                {studioMounted && (
                  <div style={styles.studioOverlay} onClick={closeStudio}>
                    <div style={{...styles.studioPanel, ...(studioVisible ? styles.studioPanelOpen : styles.studioPanelClosed)}} onClick={(e) => e.stopPropagation()}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <h3 style={{margin:0}}>Camera Studio</h3>
                        <button onClick={closeStudio} style={styles.iconButton} title="Close"><IconClose /></button>
                      </div>

                      <div style={{marginTop:18,display:'flex',justifyContent:'flex-end'}}>
                        <Link to="/account" style={styles.studioFooterLink}>Account Settings</Link>
                      </div>
                    </div>
                  </div>
                )}

                <div style={styles.bottomControls}>
                  <div style={styles.zoomControls}>
                    <button onClick={() => setZoom(Math.max(1, zoom - 0.5))} style={styles.zoomButton}>-</button>
                    <span style={styles.zoomText}>{zoom}x</span>
                    <button onClick={() => setZoom(Math.min(5, zoom + 0.5))} style={styles.zoomButton}>+</button>
                  </div>

                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    {!stream ? (
                      <button onClick={() => startCamera({requestAudio:true})} style={styles.primaryAction}>Mulai Kamera</button>
                    ) : (
                      <button onClick={() => { if (stream) { stream.getTracks().forEach(t=>t.stop()); setStream(null); } }} style={styles.secondaryAction}>Stop Kamera</button>
                    )}

                    <button onClick={() => { /* navigate to live studio */ window.location.href = '/live/studio' }} style={styles.primaryAction}>Mulai Live Stream</button>
                  </div>

                  {mode === 'photo' ? (
                    <button onClick={capturePhoto} style={styles.captureButton}>
                      <div style={styles.captureInner}></div>
                    </button>
                  ) : (
                    <button
                      onClick={toggleRecording}
                      style={{
                        ...styles.recordButton,
                        backgroundColor: isRecording ? '#ef4444' : '#ef4444',
                        borderRadius: isRecording ? '8px' : '50%',
                      }}
                    >
                      {isRecording ? 'Stop' : '●'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div style={styles.settingsPanel}>
            <div style={styles.settingGroup}>
              <label style={styles.settingLabel}>Mode</label>
              <div style={styles.toggleGroup}>
                <button
                  onClick={() => setMode('photo')}
                  style={{
                    ...styles.toggleButton,
                    backgroundColor: mode === 'photo' ? '#0891b2' : '#262626',
                  }}
                >
                  Photo
                </button>
                <button
                  onClick={() => setMode('video')}
                  style={{
                    ...styles.toggleButton,
                    backgroundColor: mode === 'video' ? '#0891b2' : '#262626',
                  }}
                >
                  Video
                </button>
              </div>
            </div>

            <div style={styles.settingGroup}>
              <label style={styles.settingLabel}>Resolution</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                style={styles.select}
              >
                {RESOLUTIONS.map((res) => (
                  <option key={res.value} value={res.value}>{res.label}</option>
                ))}
              </select>
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
    maxWidth: '700px',
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
  cameraSection: {
    padding: '24px',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    padding: '12px',
    color: '#ef4444',
    fontSize: '14px',
    marginBottom: '16px',
  },
  primaryAction: {
    backgroundColor: 'var(--accent)',
    color: 'var(--text-primary)',
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
  },
  secondaryAction: {
    background: 'transparent',
    color: '#e6e6ef',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.04)',
    cursor: 'pointer',
    fontWeight: 700,
  },
  viewfinder: {
    position: 'relative',
    borderRadius: '16px',
    overflow: 'hidden',
    backgroundColor: '#000000',
    aspectRatio: '9/16',
    maxHeight: '600px',
    margin: '0 auto',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '16px',
    pointerEvents: 'none',
  },
  topControls: {
    display: 'flex',
    justifyContent: 'space-between',
    pointerEvents: 'auto',
    alignItems: 'center',
  },
  leftTopControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  rightTopControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: '70%',
  },
  iconButton: {
    width: '40px',
    height: '40px',
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
  },
  controlButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#ffffff',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
  },
  speedSelector: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    pointerEvents: 'auto',
    marginTop: '8px',
  },
  speedButton: {
    padding: '6px 12px',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '12px',
    border: 'none',
    cursor: 'pointer',
  },
  studioOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 16,
    zIndex: 60,
    pointerEvents: 'auto',
  },
  studioPanel: {
    width: 360,
    background: '#0f0f13',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
    color: '#e6e6ef',
    transformOrigin: 'left top',
    transition: 'transform 220ms ease, opacity 220ms ease',
    opacity: 0,
    transform: 'translateY(-8px) scale(0.98)'
  },
  studioPanelOpen: {
    opacity: 1,
    transform: 'translateY(0px) scale(1)'
  },
  studioPanelClosed: {
    opacity: 0,
    transform: 'translateY(-8px) scale(0.98)'
  },
  studioFooterLink: {
    padding: '8px 12px',
    backgroundColor: 'var(--accent)',
    color: 'var(--text-primary)',
    borderRadius: 8,
    textDecoration: 'none',
    fontWeight: 700,
  },
  bottomControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '32px',
    flexWrap: 'wrap',
    padding: '0 4px',
    pointerEvents: 'auto',
  },
  zoomControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  zoomButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#ffffff',
    fontSize: '18px',
    border: 'none',
    cursor: 'pointer',
  },
  zoomText: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
  },
  captureButton: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    border: '4px solid #ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
  },
  captureInner: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
  },
  recordButton: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
  },
  settingsPanel: {
    marginTop: '24px',
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  settingGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
    minWidth: '150px',
  },
  settingLabel: {
    fontSize: '12px',
    color: '#a0a0a0',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  toggleGroup: {
    display: 'flex',
    gap: '8px',
  },
  toggleButton: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    border: 'none',
  },
  select: {
    backgroundColor: '#262626',
    border: '1px solid #2d2d2d',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
  },
  previewContainer: {
    textAlign: 'center',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '500px',
    borderRadius: '12px',
    border: '1px solid #2d2d2d',
  },
  previewActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '16px',
  },
  previewButton: {
    backgroundColor: '#0891b2',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
  },
  rightSpacer: {
    width: '320px',
    flexShrink: 0,
    display: 'none',
  },
}

export default Camera
