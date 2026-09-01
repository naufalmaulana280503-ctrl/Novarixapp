import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Play, Download, Trash2, Clock, Calendar, User, Video,
  ArrowLeft, X, AlertTriangle, FileVideo, HardDrive
} from 'lucide-react'

const REPLAYS_STORAGE_KEY = 'novarix_live_replays'
const loadReplays = () => {
  try {
    const raw = localStorage.getItem(REPLAYS_STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}
const saveReplays = (arr) => {
  try { localStorage.setItem(REPLAYS_STORAGE_KEY, JSON.stringify(arr || [])) } catch {}
}

const fmtDuration = (sec) => {
  if (!sec || sec <= 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const fmtSize = (mb) => {
  if (!mb || mb <= 0) return '0 MB'
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb.toFixed(2)} MB`
}

const sourceLabel = (mode) => ({
  front: 'Kamera Depan',
  rear: 'Kamera Belakang',
  'screen-only': 'Layar Saja',
  'screen-pip': 'Layar + PiP',
  dual: 'Kamera Ganda',
}[mode] || mode)

const SOURCE_ICON = {
  front: <User className="w-3 h-3" />,
  rear: <Video className="w-3 h-3" />,
  'screen-only': <HardDrive className="w-3 h-3" />,
  'screen-pip': <HardDrive className="w-3 h-3" />,
  dual: <Video className="w-3 h-3" />,
}

const LiveReplays = () => {
  const [replays, setReplays] = useState([])
  const [activeReplay, setActiveReplay] = useState(null)
  const [videoSrc, setVideoSrc] = useState('')
  const [missingBlob, setMissingBlob] = useState(false)
  const videoRef = useRef(null)

  useEffect(() => {
    setReplays(loadReplays())
  }, [])

  useEffect(() => {
    return () => {
      if (videoSrc) URL.revokeObjectURL(videoSrc)
    }
  }, [videoSrc])

  const refresh = () => setReplays(loadReplays())

  const handlePlay = (r) => {
    setMissingBlob(false)
    const blob = window.__novarixReplayBlobs?.get?.(r.id)
    if (!blob) {
      setActiveReplay(r)
      setMissingBlob(true)
      setVideoSrc('')
      return
    }
    const url = URL.createObjectURL(blob)
    if (videoSrc) URL.revokeObjectURL(videoSrc)
    setVideoSrc(url)
    setActiveReplay(r)
    setTimeout(() => {
      if (videoRef.current) videoRef.current.play?.().catch(() => {})
    }, 80)
  }

  const closePlayer = () => {
    if (videoRef.current) {
      try { videoRef.current.pause() } catch {}
    }
    if (videoSrc) URL.revokeObjectURL(videoSrc)
    setVideoSrc('')
    setActiveReplay(null)
    setMissingBlob(false)
  }

  const handleDownload = (r) => {
    const blob = window.__novarixReplayBlobs?.get?.(r.id)
    if (!blob) {
      alert('File replay hanya tersedia di sesi browser ini. Silakan mulai ulang live dan download sesudahnya untuk simpan permanen.')
      return
    }
    const ext = (r.mimeType || '').includes('mp4') ? 'mp4' : 'webm'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${r.title || 'novarix-live'}-${r.id}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDelete = (r) => {
    if (!confirm(`Hapus replay "${r.title}" dari arsip?`)) return
    const arr = loadReplays().filter((x) => x.id !== r.id)
    saveReplays(arr)
    if (window.__novarixReplayBlobs?.has?.(r.id)) {
      window.__novarixReplayBlobs.delete(r.id)
    }
    refresh()
    if (activeReplay?.id === r.id) closePlayer()
  }

  return (
    <div className="min-h-screen bg-[#0b0b0e] text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0b0b0e]/90 backdrop-blur border-b border-neutral-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            to="/live/studio"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Studio
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <FileVideo className="w-5 h-5 text-cyan-400" />
            <h1 className="text-lg font-bold tracking-tight">Arsip Replay Live</h1>
          </div>
          <div className="flex-1" />
          <span className="text-xs text-neutral-500 hidden sm:inline">
            Total {replays.length} rekaman
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {replays.length === 0 ? (
          <div className="mt-16 text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cyan-600/20 to-cyan-500/20 border border-neutral-800 flex items-center justify-center mb-5">
              <FileVideo className="w-10 h-10 text-cyan-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Belum ada replay yang tersimpan</h2>
            <p className="text-neutral-400 max-w-md mx-auto mb-6">
              Mulai live streaming dan aktifkan opsi "Rekam sebagai Replay" di panel Live Studio — rekaman akan otomatis muncul disini.
            </p>
            <Link
              to="/live/studio"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold hover:opacity-90 transition"
            >
              <Video className="w-4 h-4" />
              Buka Live Studio
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {replays.map((r) => (
              <article
                key={r.id}
                className="group bg-[#141418] border border-neutral-800 rounded-2xl overflow-hidden hover:border-cyan-500/40 hover:-translate-y-0.5 transition-all"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-neutral-900 overflow-hidden">
                  {r.thumbnail ? (
                    <img
                      src={r.thumbnail}
                      alt={r.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-cyan-900/40 via-[#141418] to-cyan-900/30 flex items-center justify-center">
                      <Video className="w-14 h-14 text-neutral-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => handlePlay(r)}
                      className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-105 transition"
                    >
                      <Play className="w-6 h-6 ml-1 fill-black" />
                    </button>
                  </div>
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 backdrop-blur border border-white/10 text-[10px] font-semibold text-white">
                    {SOURCE_ICON[r.sourceMode]}
                    {sourceLabel(r.sourceMode)}
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/70 backdrop-blur border border-white/10 text-[11px] font-bold text-white">
                    <Clock className="w-3 h-3 text-red-400" />
                    {fmtDuration(r.durationSec)}
                  </div>
                </div>

                {/* Body */}
                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                    {r.title || `Live ${sourceLabel(r.sourceMode)}`}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400 mb-4">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(r.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span>{fmtSize(r.sizeMB)}</span>
                    <span>{r.viewerCount?.toLocaleString?.('id-ID') || 0} penonton</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handlePlay(r)}
                      className="col-span-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition text-xs font-semibold"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Putar
                    </button>
                    <button
                      onClick={() => handleDownload(r)}
                      className="col-span-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition text-xs font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      className="col-span-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 transition text-xs font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Modal Player */}
      {activeReplay && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closePlayer}
        >
          <div
            className="w-full max-w-4xl bg-[#141418] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
              <div>
                <h3 className="font-bold text-base mb-1">
                  {activeReplay.title || `Replay ${sourceLabel(activeReplay.sourceMode)}`}
                </h3>
                <div className="flex items-center gap-3 text-xs text-neutral-400">
                  <span>{new Date(activeReplay.createdAt).toLocaleString('id-ID')}</span>
                  <span>•</span>
                  <span>{fmtDuration(activeReplay.durationSec)}</span>
                  <span>•</span>
                  <span>{fmtSize(activeReplay.sizeMB)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(activeReplay)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh
                </button>
                <button
                  onClick={closePlayer}
                  className="w-9 h-9 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-black p-2 sm:p-4">
              {missingBlob ? (
                <div className="py-16 px-6 text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                  </div>
                  <h4 className="font-bold text-lg mb-2">File replay tidak tersedia di sesi ini</h4>
                  <p className="text-neutral-400 text-sm max-w-md mx-auto">
                    Rekaman replay hanya tersimpan di memori browser selama sesi ini berlangsung. Jika Anda me-refresh halaman, file video hilang (hanya metadata thumbnail yang tersimpan di localStorage). Silakan klik Unduh sesudah live selesai untuk menyimpan permanen.
                  </p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  controls
                  src={videoSrc}
                  className="w-full max-h-[70vh] rounded-xl bg-black"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LiveReplays
