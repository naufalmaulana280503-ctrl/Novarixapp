import React, { useEffect, useState, useRef } from 'react'

const fallbackMicrophones = () => [{ deviceId: 'default', label: 'Default Microphone / System Audio' }]

// MicrophonePanel: mic selection, mute/unmute, noise suppression toggle, level meter, monitoring
export default function MicrophonePanel({ audioTrackRef, onAudioStreamReady }) {
  const [devices, setDevices] = useState(fallbackMicrophones())
  const [selectedDeviceId, setSelectedDeviceId] = useState('default')
  const [muted, setMuted] = useState(false)
  const [noiseSuppression, setNoiseSuppression] = useState(true)
  const [monitor, setMonitor] = useState(false)
  const [level, setLevel] = useState(0)
  const [permissionError, setPermissionError] = useState('')
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const monitorGainRef = useRef(null)
  const currentStreamRef = useRef(null)
  const meterTimerRef = useRef(null)

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.addEventListener) return
    const handleDeviceChange = async () => {
      try {
        await ensureMicAccess()
      } catch (error) {
        console.warn('handleDeviceChange error', error)
      }
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
  }, [])

  useEffect(() => {
    if (!selectedDeviceId || selectedDeviceId === 'default') return
    startMic()
    return () => stopMic()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId, noiseSuppression])

  useEffect(() => {
    if (monitor) startMonitoring()
    else stopMonitoring()
    return () => stopMonitoring()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitor])

  const ensureMicAccess = async () => {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setDevices(fallbackMicrophones())
      setSelectedDeviceId('default')
      setPermissionError('Browser ini tidak mendukung akses mikrofon.')
      return false
    }

    try {
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      probe.getTracks().forEach((track) => track.stop())

      const list = await navigator.mediaDevices.enumerateDevices()
      const inputs = list.filter((d) => d.kind === 'audioinput')
      const nextDevices = inputs.length > 0 ? inputs : fallbackMicrophones()
      setDevices(nextDevices)
      if (!nextDevices.some((d) => d.deviceId === selectedDeviceId) || selectedDeviceId === 'default') {
        setSelectedDeviceId(nextDevices[0].deviceId)
      }
      setPermissionError('')
      return true
    } catch (error) {
      console.warn('Permission denied or mic unavailable', error)
      setDevices(fallbackMicrophones())
      setSelectedDeviceId('default')
      setPermissionError('Akses mikrofon ditolak. Klik tombol “Izinkan Mikrofon” untuk membiarkan aplikasi mengakses mic.')
      return false
    }
  }

  const startMic = async () => {
    stopMic()
    try {
      const hasPermission = await ensureMicAccess()
      if (!hasPermission && selectedDeviceId === 'default') {
        return
      }

      const constraints = {
        audio: {
          deviceId: selectedDeviceId && selectedDeviceId !== 'default' ? { exact: selectedDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: noiseSuppression,
          autoGainControl: true,
        },
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      currentStreamRef.current = stream

      const AudioContext = window.AudioContext || window.webkitAudioContext
      let audioContext = audioContextRef.current
      if (!audioContext) {
        audioContext = new AudioContext()
        audioContextRef.current = audioContext
      }

      const source = audioContext.createMediaStreamSource(stream)
      sourceNodeRef.current = source
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyserRef.current = analyser
      source.connect(analyser)

      const destination = audioContext.createMediaStreamDestination()
      source.connect(destination)

      const monitorGain = audioContext.createGain()
      monitorGain.gain.value = monitor ? 0.7 : 0
      monitorGainRef.current = monitorGain
      source.connect(monitorGain)
      monitorGain.connect(audioContext.destination)

      if (onAudioStreamReady) onAudioStreamReady(destination.stream)
      if (audioTrackRef) audioTrackRef.current = destination.stream.getAudioTracks()[0] || null

      startMeter()
    } catch (error) {
      console.error('startMic error', error)
      setPermissionError('Tidak bisa membuka mikrofon. Silakan coba lagi atau cek izin browser.')
    }
  }

  const stopMic = () => {
    try {
      stopMeter()
      if (sourceNodeRef.current) sourceNodeRef.current.disconnect()
      if (analyserRef.current) analyserRef.current.disconnect()
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((track) => track.stop())
        currentStreamRef.current = null
      }
      if (audioTrackRef) audioTrackRef.current = null
    } catch (error) {
      console.warn('stopMic err', error)
    }
  }

  const startMonitoring = () => {
    try {
      if (monitorGainRef.current) monitorGainRef.current.gain.value = 0.7
    } catch (error) {
      console.warn(error)
    }
  }

  const stopMonitoring = () => {
    try {
      if (monitorGainRef.current) monitorGainRef.current.gain.value = 0
    } catch (error) {
      console.warn(error)
    }
  }

  const startMeter = () => {
    stopMeter()
    meterTimerRef.current = setInterval(() => {
      try {
        const analyser = analyserRef.current
        if (!analyser) return
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const value = (data[i] - 128) / 128
          sum += value * value
        }
        const rms = Math.sqrt(sum / data.length)
        const nextLevel = Math.min(1, rms * 3)
        setLevel(nextLevel)
      } catch (error) {
        console.warn('meter error', error)
      }
    }, 100)
  }

  const stopMeter = () => {
    if (meterTimerRef.current) {
      clearInterval(meterTimerRef.current)
      meterTimerRef.current = null
    }
  }

  const handleDeviceChange = (event) => setSelectedDeviceId(event.target.value)

  const toggleMute = () => {
    setMuted((current) => {
      const next = !current
      try {
        if (currentStreamRef.current) {
          currentStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = !next
          })
        }
      } catch (error) {
        console.warn(error)
      }
      return next
    })
  }

  const toggleNoise = () => setNoiseSuppression((current) => !current)

  return (
    <div style={{ padding: 12, background: 'rgba(0,0,0,0.45)', borderRadius: 10, color: '#fff' }}>
      <h4 style={{ marginTop: 0 }}>Microphone</h4>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <select value={selectedDeviceId} onChange={handleDeviceChange} style={{ flex: 1 }}>
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>{device.label || 'Microphone'}</option>
          ))}
        </select>
        <button onClick={toggleMute} style={{ padding: '6px 10px' }}>{muted ? 'Unmute' : 'Mute'}</button>
      </div>

      <button
        type="button"
        onClick={ensureMicAccess}
        style={{ width: '100%', padding: '8px 10px', marginBottom: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: '#0f172a', color: '#fff' }}
      >
        Izinkan Mikrofon
      </button>

      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={noiseSuppression} onChange={toggleNoise} /> Noise Suppression
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={monitor} onChange={() => setMonitor((current) => !current)} /> Monitor
        </label>
      </div>

      {permissionError && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#fca5a5' }}>{permissionError}</div>
      )}

      <div style={{ marginTop: 8 }}>
        <div style={{ height: 8, background: '#111', borderRadius: 4 }}>
          <div style={{ height: 8, width: `${Math.round(level * 100)}%`, background: level > 0.6 ? '#ef4444' : '#06b6d4', borderRadius: 4 }} />
        </div>
      </div>
    </div>
  )
}
