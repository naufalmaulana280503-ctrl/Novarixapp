import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { storiesApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import VerifiedBadge from '../components/VerifiedBadge'
import { X, Eye, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'

const StoryViewer = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { addToast } = useToast()

  const [stories, setStories] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [showViewers, setShowViewers] = useState(false)
  const [viewers, setViewers] = useState([])
  const [viewersLoading, setViewersLoading] = useState(false)
  const [totalViewers, setTotalViewers] = useState(0)
  const progressTimer = useRef(null)
  const isOwner = currentUser?.id === Number(userId) || String(currentUser?.id) === String(userId)

  const currentStory = stories[currentIndex] || null

  const fetchStories = useCallback(async () => {
    try {
      setLoading(true)
      const data = await storiesApi.getUserStories(userId)
      const list = Array.isArray(data) ? data : (Array.isArray(data?.stories) ? data.data.stories : [])
      setStories(list)
    } catch (err) {
      console.error('Failed to fetch stories:', err)
      addToast({ type: 'error', text: 'Gagal memuat story' })
    } finally {
      setLoading(false)
    }
  }, [userId, addToast])

  // Mark story as viewed
  const markViewed = useCallback(async (storyId) => {
    if (!storyId) return
    try {
      await storiesApi.viewStory(storyId)
    } catch (err) {
      // Ignore view errors silently
    }
  }, [])

  // Auto-progress timer
  useEffect(() => {
    if (!currentStory || stories.length === 0) return

    setProgress(0)
    markViewed(currentStory.id)

    const duration = (currentStory.mediaType === 'boomerang' ? 3 : 5) * 1000
    const interval = 50
    let elapsed = 0

    progressTimer.current = setInterval(() => {
      elapsed += interval
      setProgress((elapsed / duration) * 100)
      if (elapsed >= duration) {
        clearInterval(progressTimer.current)
        if (currentIndex < stories.length - 1) {
          setCurrentIndex((i) => i + 1)
        }
      }
    }, interval)

    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current)
    }
  }, [currentStory, currentIndex, stories.length, markViewed])

  // Fetch viewers for current story (only for owner)
  const fetchViewers = useCallback(async () => {
    if (!currentStory || !isOwner) return
    setViewersLoading(true)
    try {
      const data = await storiesApi.getStoryViewers(currentStory.id)
      setViewers(data.viewers || [])
      setTotalViewers(data.totalViews || 0)
    } catch (err) {
      console.error('Failed to fetch viewers:', err)
    } finally {
      setViewersLoading(false)
    }
  }, [currentStory, isOwner])

  const toggleViewers = useCallback(() => {
    if (showViewers) {
      setShowViewers(false)
    } else {
      setShowViewers(true)
      fetchViewers()
    }
  }, [showViewers, fetchViewers])

  const handlePrev = () => {
    if (progressTimer.current) clearInterval(progressTimer.current)
    if (currentIndex > 0) setCurrentIndex((i) => i - 1)
    else navigate(-1)
  }

  const handleNext = () => {
    if (progressTimer.current) clearInterval(progressTimer.current)
    if (currentIndex < stories.length - 1) setCurrentIndex((i) => i + 1)
    else navigate(-1)
  }

  const handleDeleteStory = async () => {
    if (!currentStory) return
    if (!window.confirm('Hapus story ini?')) return
    try {
      await storiesApi.deleteStory(currentStory.id)
      addToast({ type: 'success', text: 'Story dihapus' })
      const remaining = stories.filter((_, i) => i !== currentIndex)
      if (remaining.length === 0) navigate(-1)
      else {
        setStories(remaining)
        if (currentIndex >= remaining.length) setCurrentIndex(remaining.length - 1)
      }
    } catch (err) {
      addToast({ type: 'error', text: 'Gagal menghapus story' })
    }
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
      </div>
    )
  }

  if (!currentStory) {
    return (
      <div style={styles.loadingContainer}>
        <p style={{ color: '#999' }}>Tidak ada story</p>
        <button onClick={() => navigate(-1)} style={styles.closeBtn}>Kembali</button>
      </div>
    )
  }

  return (
    <div style={styles.overlay}>
      {/* Close button */}
      <button onClick={() => navigate(-1)} style={styles.closeBtn} aria-label="Tutup">
        <X size={28} />
      </button>

      {/* Navigation arrows */}
      {stories.length > 1 && (
        <>
          <button onClick={handlePrev} style={{ ...styles.navBtn, left: 16 }} aria-label="Sebelumnya">
            <ChevronLeft size={32} />
          </button>
          <button onClick={handleNext} style={{ ...styles.navBtn, right: 16 }} aria-label="Selanjutnya">
            <ChevronRight size={32} />
          </button>
        </>
      )}

      {/* Progress bar */}
      <div style={styles.progressBarContainer}>
        {stories.map((_, i) => (
          <div key={i} style={styles.progressBarBg}>
            <div
              style={{
                ...styles.progressBarFill,
                width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Story content */}
      <div style={styles.storyContent} onClick={handleNext}>
        {currentStory.mediaType === 'video' || currentStory.mediaType === 'boomerang' ? (
          <video
            src={currentStory.mediaUrl}
            style={styles.media}
            autoPlay
            loop={currentStory.mediaType === 'boomerang'}
            muted
            playsInline
            key={currentStory.id}
          />
        ) : (
          <img
            src={currentStory.mediaUrl}
            alt={currentStory.caption || 'Story'}
            style={styles.media}
            key={currentStory.id}
          />
        )}

        {/* Caption overlay */}
        {currentStory.caption && (
          <div style={styles.captionOverlay}>
            <p style={styles.captionText}>{currentStory.caption}</p>
          </div>
        )}
      </div>

      {/* User info bar */}
      <div style={styles.userInfoBar}>
        <div style={styles.userInfoLeft}>
          <div
            style={{
              ...styles.userAvatar,
              backgroundImage: currentStory.avatarUrl ? `url(${currentStory.avatarUrl})` : 'none',
            }}
          >
            {!currentStory.avatarUrl && (
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                {(currentStory.displayName || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <div style={styles.userDisplayName}>
              {currentStory.displayName || currentStory.username}
              {currentStory.isVerified && <VerifiedBadge tier="blue" size={14} />}
            </div>
            <div style={styles.storyTime}>{formatTime(currentStory.createdAt)}</div>
          </div>
        </div>

        <div style={styles.userInfoRight}>
          {/* Eye icon for viewers (only shown to story owner) */}
          {isOwner && (
            <button onClick={toggleViewers} style={styles.eyeButton} title="Lihat penonton">
              <Eye size={20} />
              <span style={styles.eyeCount}>{currentStory.viewsCount || 0}</span>
            </button>
          )}
          {/* Delete button for owner */}
          {isOwner && (
            <button onClick={handleDeleteStory} style={styles.deleteBtn} title="Hapus story">
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Viewers modal */}
      {showViewers && (
        <div style={styles.modalOverlay} onClick={() => setShowViewers(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Penonton ({totalViewers})</h3>
              <button onClick={() => setShowViewers(false)} style={styles.modalCloseBtn}>
                <X size={22} />
              </button>
            </div>
            <div style={styles.modalBody}>
              {viewersLoading && <p style={{ color: '#888', textAlign: 'center' }}>Memuat...</p>}
              {!viewersLoading && viewers.length === 0 && (
                <p style={{ color: '#666', textAlign: 'center' }}>Belum ada yang menonton</p>
              )}
              {viewers.map((v) => (
                <div key={v.id} style={styles.viewerItem}>
                  <div
                    style={{
                      ...styles.viewerAvatar,
                      backgroundImage: v.avatarUrl ? `url(${v.avatarUrl})` : 'none',
                    }}
                  >
                    {!v.avatarUrl && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                        {(v.displayName || v.username || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={styles.viewerInfo}>
                    <span style={styles.viewerName}>
                      {v.displayName || v.username}
                      {v.isVerified && <VerifiedBadge tier="blue" size={12} />}
                    </span>
                    <span style={styles.viewerHandle}>@{v.username}</span>
                  </div>
                  <span style={styles.viewerTime}>{formatTime(v.viewedAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatTime(input) {
  if (!input) return ''
  const d = new Date(input)
  if (isNaN(d.getTime())) return ''
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'Baru saja'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m yang lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}j yang lalu`
  return `${Math.floor(h / 24)}h yang lalu`
}

const styles = {
  loadingContainer: {
    position: 'fixed', inset: 0, background: '#000', display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  },
  spinner: {
    width: 40, height: 40, border: '4px solid #333', borderTopColor: '#0891b2',
    borderRadius: '50%', animation: 'spin 1s linear infinite',
  },
  overlay: {
    position: 'fixed', inset: 0, background: '#000', zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16, zIndex: 10,
    background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
    borderRadius: '50%', width: 40, height: 40, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  navBtn: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 10,
    background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
    borderRadius: '50%', width: 44, height: 44, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  progressBarContainer: {
    position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10,
    display: 'flex', gap: 4,
  },
  progressBarBg: {
    flex: 1, height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%', background: '#fff', borderRadius: 2, transition: 'width 50ms linear',
  },
  storyContent: {
    width: '100%', maxWidth: 420, height: '100vh', maxHeight: '100vh',
    position: 'relative', overflow: 'hidden', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#000',
  },
  media: {
    width: '100%', height: '100%', objectFit: 'cover',
  },
  captionOverlay: {
    position: 'absolute', bottom: 80, left: 16, right: 16,
    background: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: '10px 14px',
    backdropFilter: 'blur(8px)',
  },
  captionText: {
    color: '#fff', fontSize: 14, margin: 0, lineHeight: 1.4,
  },
  userInfoBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
  },
  userInfoLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  userAvatar: {
    width: 36, height: 36, borderRadius: '50%', border: '2px solid #0891b2',
    backgroundSize: 'cover', backgroundPosition: 'center',
    background: 'linear-gradient(135deg, #0891b2, #10b981)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  userDisplayName: { color: '#fff', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 },
  storyTime: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  userInfoRight: { display: 'flex', alignItems: 'center', gap: 12 },
  eyeButton: {
    background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
    borderRadius: 20, padding: '6px 12px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
  },
  eyeCount: { color: '#fff', fontSize: 13, fontWeight: 600 },
  deleteBtn: {
    background: 'rgba(239,68,68,0.2)', border: 'none', color: '#ef4444',
    borderRadius: 20, padding: 6, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    zIndex: 10000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  modalContent: {
    width: '100%', maxWidth: 420, maxHeight: '60vh', background: '#1a1a1a',
    borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid #333',
  },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 },
  modalCloseBtn: {
    background: 'none', border: 'none', color: '#999', cursor: 'pointer',
    display: 'flex', alignItems: 'center',
  },
  modalBody: {
    flex: 1, overflowY: 'auto', padding: '8px 0',
  },
  viewerItem: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
  },
  viewerAvatar: {
    width: 40, height: 40, borderRadius: '50%', border: '2px solid #333',
    backgroundSize: 'cover', backgroundPosition: 'center',
    background: 'linear-gradient(135deg, #333, #555)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  viewerInfo: { flex: 1, minWidth: 0 },
  viewerName: { color: '#fff', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 },
  viewerHandle: { color: '#888', fontSize: 12, display: 'block' },
  viewerTime: { color: '#666', fontSize: 12, flexShrink: 0 },
}

export default StoryViewer
