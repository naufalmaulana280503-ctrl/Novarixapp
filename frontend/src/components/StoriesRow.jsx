import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storiesApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Plus, Upload } from 'lucide-react'

const StoriesRow = () => {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { addToast } = useToast()

  useEffect(() => {
    fetchStories()
  }, [])

  const fetchStories = async () => {
    try {
      setLoading(true)
      const res = await storiesApi.getStoriesFeed()
      const groupedByUser = {}
      
      // Group stories by user, keep only the most recent one per user for display
      res.forEach((story) => {
        if (!groupedByUser[story.userId]) {
          groupedByUser[story.userId] = story
        }
      })
      
      setStories(Object.values(groupedByUser))
    } catch (err) {
      console.error('Gagal fetch stories:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenStories = (userId) => {
    navigate(`/stories/${userId}`)
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.skeleton} />
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Upload Story Button */}
      <div
        style={styles.storyCard}
        onClick={() => navigate('/stories/upload')}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => e.key === 'Enter' && navigate('/stories/upload')}
      >
        <div style={styles.uploadBox}>
          <Plus size={24} style={{ marginBottom: 8 }} />
          <span style={styles.uploadText}>Story Anda</span>
        </div>
      </div>

      {/* Stories Grid */}
      {stories.map((story) => (
        <div
          key={story.id}
          style={styles.storyCard}
          onClick={() => handleOpenStories(story.userId)}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === 'Enter' && handleOpenStories(story.userId)}
        >
          <div
            style={{
              ...styles.storyImage,
              backgroundImage: `url(${story.mediaUrl})`,
            }}
          >
            {/* Gradient overlay */}
            <div style={styles.overlay} />
            
            {/* User info at bottom */}
            <div style={styles.storyInfo}>
              <div
                style={{
                  ...styles.avatar,
                  backgroundImage: `url(${story.avatarUrl})`,
                }}
              />
              <span style={styles.username}>{story.displayName || story.username}</span>
            </div>
          </div>
        </div>
      ))}

      {!loading && stories.length === 0 && (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>Tidak ada story untuk ditonton</p>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    gap: '12px',
    overflowX: 'auto',
    paddingBottom: '12px',
    marginBottom: '16px',
    backgroundColor: 'var(--bg-primary, #0f0f0f)',
    paddingLeft: '16px',
    paddingRight: '16px',
    paddingTop: '12px',
    borderBottom: '1px solid var(--border-color, #2d2d2d)',
    scrollBehavior: 'smooth',
  },
  storyCard: {
    position: 'relative',
    width: '100px',
    height: '180px',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    flexShrink: 0,
    backgroundColor: 'var(--bg-secondary, #1a1a1a)',
    border: '2px solid transparent',
    transition: 'all 0.2s ease',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.6) 100%)',
  },
  storyInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    position: 'relative',
    zIndex: 10,
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    border: '2px solid #06b6d4',
  },
  username: {
    color: '#fff',
    fontSize: '11px',
    fontWeight: '600',
    truncate: true,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  uploadBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    backgroundColor: 'linear-gradient(135deg, #0891b2, #06b6d4)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    textAlign: 'center',
  },
  uploadText: {
    fontSize: '12px',
    fontWeight: '600',
  },
  skeleton: {
    width: '100px',
    height: '180px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: '14px',
  },
}

export default StoriesRow
