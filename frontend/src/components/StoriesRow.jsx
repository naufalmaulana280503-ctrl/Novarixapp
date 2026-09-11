import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storiesApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Plus } from 'lucide-react'

const StoriesRow = () => {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { addToast } = useToast()

  useEffect(() => {
    fetchStories()
  }, [])

  const fetchStories = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await storiesApi.getStoriesFeed()
      const payload = res?.data
      const storyList = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.stories) ? payload.stories : [])
      const groupedByUser = {}
      storyList.forEach((story) => {
        if (!groupedByUser[story.userId]) {
          groupedByUser[story.userId] = story
        }
      })
      setStories(Object.values(groupedByUser))
    } catch (err) {
      console.error('Gagal fetch stories:', err)
      setError(err?.response?.data?.message || 'Story tidak dapat dimuat.')
      setStories([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenStories = (userId) => {
    navigate(`/stories/${userId}`)
  }

  if (loading) {
    return (
      <div className="stories-row">
        <div className="stories-scroll">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stories-skeleton" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="stories-row">
      <div className="stories-scroll">
        {error && (
          <div className="stories-empty" role="status">
            <p>{error}</p>
            <button type="button" onClick={fetchStories}>Coba lagi</button>
          </div>
        )}
        {/* Upload Story — your own story with + button */}
        <div
          className="stories-item"
          onClick={() => navigate('/stories/upload')}
          role="button"
          tabIndex={0}
        >
          <div className="stories-avatar-ring stories-ring-self">
            <div className="stories-avatar-inner">
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="Your story" className="stories-avatar-img" />
              ) : (
                <div className="stories-avatar-placeholder">
                  <span>{(currentUser?.displayName || 'U').charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>
          <div className="stories-plus-badge">
            <Plus size={12} strokeWidth={3} />
          </div>
          <span className="stories-name">Cerita Anda</span>
        </div>

        {/* Other users' stories */}
        {stories.map((story) => (
          <div
            key={story.id}
            className="stories-item"
            onClick={() => handleOpenStories(story.userId)}
            role="button"
            tabIndex={0}
          >
            <div className="stories-avatar-ring stories-ring-unseen">
              <div className="stories-avatar-inner">
                {story.avatarUrl ? (
                  <img src={story.avatarUrl} alt={story.username} className="stories-avatar-img" />
                ) : (
                  <div className="stories-avatar-placeholder">
                    <span>{(story.displayName || story.username || 'U').charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
            <span className="stories-name">{story.displayName || story.username}</span>
          </div>
        ))}

        {stories.length === 0 && (
          <div className="stories-empty">
            <p>Tidak ada story untuk ditonton</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StoriesRow
