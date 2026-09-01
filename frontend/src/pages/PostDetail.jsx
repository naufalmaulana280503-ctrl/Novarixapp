import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Comments from './Comments'
import MediaCarousel from '../components/MediaCarousel'
import { getPostMediaItems } from '../utils/media'

const REACTION_EMOJIS = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
}

const PostDetail = () => {
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userReaction, setUserReaction] = useState(null)
  const [reactionCounts, setReactionCounts] = useState({})
  const { currentUser } = useAuth()

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await api.get(`/posts/${id}`)
        setPost(res.data.post)
        setReactionCounts(res.data.reactions || {})
      } catch (err) {
        console.error('Failed to fetch post:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPost()
  }, [id])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCount = (count) => {
    if (!count) return '0'
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M'
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K'
    return count.toString()
  }

  const handleReaction = async (type) => {
    if (userReaction === type) {
      try {
        await api.delete(`/posts/${id}/reactions/${type}`)
        setUserReaction(null)
        setReactionCounts((prev) => ({ ...prev, [type]: Math.max(0, (prev[type] || 0) - 1) }))
      } catch (err) {
        console.error('Failed to remove reaction:', err)
      }
    } else {
      try {
        if (userReaction) {
          await api.delete(`/posts/${id}/reactions/${userReaction}`)
        }
        await api.post(`/posts/${id}/reactions`, { type })
        setUserReaction(type)
        setReactionCounts((prev) => ({ ...prev, [type]: (prev[type] || 0) + 1 }))
      } catch (err) {
        console.error('Failed to add reaction:', err)
      }
    }
  }

  const privacyColors = {
    public: '#22c55e',
    'close-friends': '#0891b2',
    private: '#ef4444',
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
      </div>
    )
  }

  if (!post) {
    return (
      <div style={styles.loading}>
        <p style={styles.errorText}>Post not found</p>
        <Link to="/feed" style={styles.backLink}>Back to Feed</Link>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.sidebarSpacer}></div>
      <div style={styles.mainContent}>
        <div style={styles.backButton}>
          <Link to="/feed" style={styles.backLink}>← Back to Feed</Link>
        </div>

        <div style={styles.postCard}>
          <div style={styles.header}>
            <Link to={`/profile/${post.username}`} style={styles.avatarLink}>
              <div style={styles.avatar}>
                {post.avatarUrl ? (
                  <img src={post.avatarUrl} alt="" style={styles.avatarImg} />
                ) : (
                  post.displayName?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
            </Link>
            <div style={styles.userInfo}>
              <Link to={`/profile/${post.username}`} style={styles.displayName}>
                {post.displayName}
              </Link>
              <span style={styles.username}>@{post.username}</span>
              <span style={styles.timestamp}>{formatDate(post.createdAt)}</span>
            </div>
            <div style={{
              ...styles.privacyBadge,
              backgroundColor: privacyColors[post.privacy] || '#6b6b6b',
            }}>
              {post.privacy === 'close-friends' ? 'Close Friends' : post.privacy?.charAt(0).toUpperCase() + post.privacy?.slice(1) || 'Public'}
            </div>
          </div>

          {(post.mediaUrls?.length || post.mediaUrl) && (
            <MediaCarousel
              items={getPostMediaItems(post)}
              mediaType={post.mediaType}
              duration={post.duration}
              watermark={post.isReposted ? 'Reposted' : post.isDownloaded ? 'Downloaded' : null}
            />
          )}

          <p style={styles.caption}>{post.caption}</p>

          <div style={styles.statsRow}>
            <span style={styles.statText}>{formatCount(post.views || 0)} views</span>
            <span style={styles.statText}>{formatCount(post.likes || 0)} likes</span>
            <span style={styles.statText}>{formatCount(post.commentsCount || 0)} comments</span>
            <span style={styles.statText}>{formatCount(post.sharesCount || 0)} shares</span>
            <span style={styles.statText}>{formatCount(post.repostsCount || 0)} reposts</span>
          </div>

          <div style={styles.reactionBar}>
            {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
              <button
                key={type}
                onClick={() => handleReaction(type)}
                style={{
                  ...styles.reactionButton,
                  backgroundColor: userReaction === type ? '#262626' : 'transparent',
                  transform: userReaction === type ? 'scale(1.2)' : 'scale(1)',
                }}
                title={type}
              >
                <span style={styles.reactionEmoji}>{emoji}</span>
                {reactionCounts[type] > 0 && (
                  <span style={styles.reactionCount}>{reactionCounts[type]}</span>
                )}
              </button>
            ))}
          </div>

          <div style={styles.actions}>
            <button style={styles.actionButton}>
              ❤️ <span style={styles.actionCount}>{formatCount(post.likes || 0)}</span>
            </button>
            <button style={styles.actionButton}>
              💬 <span style={styles.actionCount}>{formatCount(post.commentsCount || 0)}</span>
            </button>
            <button style={styles.actionButton}>
              🔁 <span style={styles.actionCount}>{formatCount(post.repostsCount || 0)}</span>
            </button>
            <button style={styles.actionButton}>
              ⬇️ <span style={styles.actionCount}>{formatCount(post.sharesCount || 0)}</span>
            </button>
            <button style={styles.actionButton}>
              ↗️ Share
            </button>
          </div>
        </div>

        <Comments postId={id} postOwnerId={post.userId} />
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
    maxWidth: '600px',
    margin: '0 auto',
    paddingTop: '60px',
    borderLeft: '1px solid #2d2d2d',
    borderRight: '1px solid #2d2d2d',
    minHeight: '100vh',
  },
  backButton: {
    padding: '16px 24px',
    borderBottom: '1px solid #2d2d2d',
  },
  backLink: {
    color: '#0891b2',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
  },
  postCard: {
    backgroundColor: '#0f0f0f',
    borderBottom: '1px solid #2d2d2d',
    padding: '16px 24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
    position: 'relative',
  },
  avatarLink: {
    textDecoration: 'none',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#0891b2',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  displayName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    textDecoration: 'none',
  },
  username: {
    fontSize: '13px',
    color: '#a0a0a0',
  },
  timestamp: {
    fontSize: '12px',
    color: '#6b6b6b',
  },
  privacyBadge: {
    marginLeft: 'auto',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  mediaContainer: {
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '12px',
    position: 'relative',
  },
  media: {
    width: '100%',
    maxHeight: '500px',
    objectFit: 'cover',
    display: 'block',
  },
  durationBadge: {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#ffffff',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
  },
  watermarkOverlay: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#0891b2',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  caption: {
    fontSize: '14px',
    color: '#ffffff',
    lineHeight: '1.5',
    marginBottom: '12px',
  },
  statsRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  statText: {
    fontSize: '13px',
    color: '#a0a0a0',
  },
  reactionBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    flexWrap: 'wrap',
    borderTop: '1px solid #2d2d2d',
    borderBottom: '1px solid #2d2d2d',
    padding: '8px 0',
  },
  reactionButton: {
    backgroundColor: 'transparent',
    color: '#ffffff',
    padding: '6px 10px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
  },
  reactionEmoji: {
    fontSize: '16px',
  },
  reactionCount: {
    fontSize: '12px',
    color: '#a0a0a0',
  },
  actions: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: 'transparent',
    color: '#a0a0a0',
    fontSize: '14px',
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    borderRadius: '4px',
  },
  actionCount: {
    fontSize: '13px',
    color: '#a0a0a0',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f0f',
    flexDirection: 'column',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #262626',
    borderTopColor: '#0891b2',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorText: {
    color: '#ef4444',
    fontSize: '16px',
  },
  rightSpacer: {
    width: '320px',
    flexShrink: 0,
    display: 'none',
  },
}

export default PostDetail
