import React, { useState, useRef } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

const STICKERS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '👏', '🎉', '💯', '👀', '✨']
const GIFT_STICKERS = [
  { id: 1, emoji: '🎁', name: 'Gift Box', price: 1000, adminFee: 100, taxFee: 100, creatorEarning: 800 },
  { id: 2, emoji: '💎', name: 'Diamond', price: 5000, adminFee: 500, taxFee: 500, creatorEarning: 4000 },
  { id: 3, emoji: '🏆', name: 'Trophy', price: 2000, adminFee: 200, taxFee: 200, creatorEarning: 1600 },
]

const Comments = ({ postId, postOwnerId }) => {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const [showGifts, setShowGifts] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const { currentUser } = useAuth()
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const fetchComments = async () => {
    try {
      const res = await api.get(`/posts/${postId}/comments`)
      setComments(res.data.comments || [])
    } catch (err) {
      console.error('Failed to fetch comments:', err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchComments()
  }, [postId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim() && !selectedImage) return

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('text', newComment)
      if (selectedImage) {
        formData.append('image', selectedImage)
      }
      await api.post(`/posts/${postId}/comments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setNewComment('')
      setSelectedImage(null)
      setShowStickers(false)
      fetchComments()
    } catch (err) {
      console.error('Failed to post comment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = async (commentId) => {
    if (!replyText.trim()) return
    try {
      await api.post(`/posts/${postId}/comments/${commentId}/reply`, { text: replyText })
      setReplyText('')
      setReplyingTo(null)
      fetchComments()
    } catch (err) {
      console.error('Failed to reply:', err)
    }
  }

  const handlePinComment = async (commentId) => {
    try {
      await api.post(`/posts/${postId}/comments/${commentId}/pin`)
      fetchComments()
    } catch (err) {
      console.error('Failed to pin comment:', err)
    }
  }

  const handleVoiceRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('audio', audioBlob)
        try {
          await api.post(`/posts/${postId}/comments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          fetchComments()
        } catch (err) {
          console.error('Failed to upload voice comment:', err)
        }
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Microphone access denied:', err)
    }
  }

  const stopVoiceRecord = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImage(file)
    }
  }

  const handleSendGift = async (stickerId) => {
    try {
      await api.post(`/posts/${postId}/gifts`, { stickerId })
      setShowGifts(false)
      fetchComments()
    } catch (err) {
      console.error('Failed to send gift:', err)
    }
  }

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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Comments</h3>
        <span style={styles.count}>{comments.length}</span>
      </div>

      <form onSubmit={handleSubmit} style={styles.commentForm}>
        <div style={styles.inputRow}>
          <input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            style={styles.input}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} style={styles.iconButton}>
            🖼️
          </button>
          <button type="button" onClick={() => setShowStickers(!showStickers)} style={styles.iconButton}>
            😊
          </button>
          <button type="button" onClick={() => setShowGifts(!showGifts)} style={styles.iconButton}>
            🎁
          </button>
          <button
            type="button"
            onClick={isRecording ? stopVoiceRecord : handleVoiceRecord}
            style={{
              ...styles.iconButton,
              backgroundColor: isRecording ? '#ef4444' : 'transparent',
            }}
          >
            {isRecording ? '⏹️' : '🎤'}
          </button>
        </div>

        {isRecording && <p style={styles.recordingText}>Recording... Click stop to finish</p>}

        {selectedImage && (
          <div style={styles.selectedImagePreview}>
            <img src={URL.createObjectURL(selectedImage)} alt="Selected" style={styles.selectedImage} />
            <button type="button" onClick={() => setSelectedImage(null)} style={styles.removeImage}>×</button>
          </div>
        )}

        {showStickers && (
          <div style={styles.picker}>
            {STICKERS.map((sticker) => (
              <button
                key={sticker}
                type="button"
                onClick={() => { setNewComment(newComment + sticker); setShowStickers(false) }}
                style={styles.stickerButton}
              >
                {sticker}
              </button>
            ))}
          </div>
        )}

        {showGifts && (
          <div style={styles.giftPicker}>
            {GIFT_STICKERS.map((gift) => (
              <div key={gift.id} style={styles.giftItem}>
                <button
                  type="button"
                  onClick={() => handleSendGift(gift.id)}
                  style={styles.giftButton}
                >
                  <span style={styles.giftEmoji}>{gift.emoji}</span>
                  <span style={styles.giftName}>{gift.name}</span>
                  <span style={styles.giftPrice}>${gift.price}</span>
                </button>
                <div style={styles.giftBreakdown}>
                  <span style={styles.giftFee}>Admin: ${gift.adminFee}</span>
                  <span style={styles.giftFee}>Tax: ${gift.taxFee}</span>
                  <span style={styles.giftFee}>Creator: ${gift.creatorEarning}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button type="submit" disabled={submitting || (!newComment.trim() && !selectedImage)} style={styles.submitButton}>
          {submitting ? 'Posting...' : 'Post Comment'}
        </button>
      </form>

      {loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
        </div>
      ) : (
        <div style={styles.commentsList}>
          {comments.map((comment) => (
            <div key={comment.id} style={styles.commentItem}>
              <div style={styles.commentHeader}>
                <div style={styles.commentAvatar}>
                  {comment.userAvatar ? (
                    <img src={comment.userAvatar} alt="" style={styles.avatarImg} />
                  ) : (
                    comment.userDisplayName?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div style={styles.commentUserInfo}>
                  <Link to={`/profile/${comment.userUsername}`} style={styles.commentUser}>
                    {comment.userDisplayName}
                  </Link>
                  <span style={styles.commentTime}>{formatDate(comment.createdAt)}</span>
                </div>
                {comment.isPinned && <span style={styles.pinnedBadge}>📌 Pinned</span>}
              </div>

              <p style={styles.commentText}>{comment.text}</p>

              {comment.imageUrl && (
                <img src={comment.imageUrl} alt="Comment" style={styles.commentImage} />
              )}

              {comment.audioUrl && (
                <audio controls style={styles.commentAudio}>
                  <source src={comment.audioUrl} type="audio/webm" />
                </audio>
              )}

              {comment.giftSticker && (
                <div style={styles.giftDisplay}>
                  <span style={styles.giftEmojiLarge}>{comment.giftSticker.emoji}</span>
                      <span style={styles.giftDisplayName}>{comment.giftSticker.name}</span>
                </div>
              )}

              <div style={styles.commentActions}>
                <button style={styles.commentActionButton}>❤️ {comment.likes || 0}</button>
                <button style={styles.commentActionButton}>Reply</button>
                {currentUser?.id === postOwnerId && !comment.isPinned && (
                  <button style={styles.commentActionButton} onClick={() => handlePinComment(comment.id)}>
                    📌 Pin
                  </button>
                )}
              </div>

              {replyingTo === comment.id && (
                <div style={styles.replyBox}>
                  <input
                    type="text"
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    style={styles.replyInput}
                  />
                  <button onClick={() => handleReply(comment.id)} style={styles.replyButton}>Reply</button>
                  <button onClick={() => setReplyingTo(null)} style={styles.replyCancel}>Cancel</button>
                </div>
              )}

              {comment.replies && comment.replies.length > 0 && (
                <div style={styles.repliesList}>
                  {comment.replies.map((reply) => (
                    <div key={reply.id} style={styles.replyItem}>
                      <div style={styles.commentHeader}>
                        <div style={styles.commentAvatar}>
                          {reply.userAvatar ? (
                            <img src={reply.userAvatar} alt="" style={styles.avatarImg} />
                          ) : (
                            reply.userDisplayName?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                        <div style={styles.commentUserInfo}>
                          <Link to={`/profile/${reply.userUsername}`} style={styles.commentUser}>
                            {reply.userDisplayName}
                          </Link>
                          <span style={styles.commentTime}>{formatDate(reply.createdAt)}</span>
                        </div>
                      </div>
                      <p style={styles.commentText}>{reply.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: '16px 24px',
    borderTop: '1px solid #2d2d2d',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#ffffff',
  },
  count: {
    fontSize: '14px',
    color: '#a0a0a0',
    backgroundColor: '#262626',
    padding: '2px 10px',
    borderRadius: '12px',
  },
  commentForm: {
    marginBottom: '24px',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#262626',
    border: '1px solid #2d2d2d',
    borderRadius: '20px',
    padding: '10px 16px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
  },
  iconButton: {
    backgroundColor: 'transparent',
    color: '#a0a0a0',
    fontSize: '18px',
    padding: '8px',
    borderRadius: '50%',
    border: 'none',
  },
  selectedImagePreview: {
    position: 'relative',
    marginTop: '12px',
    display: 'inline-block',
  },
  selectedImage: {
    maxWidth: '120px',
    maxHeight: '120px',
    borderRadius: '8px',
    border: '1px solid #2d2d2d',
  },
  removeImage: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
  },
  picker: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#262626',
    borderRadius: '12px',
    border: '1px solid #2d2d2d',
  },
  stickerButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    padding: '4px 8px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  giftPicker: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#262626',
    borderRadius: '12px',
    border: '1px solid #2d2d2d',
  },
  giftItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  giftButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #2d2d2d',
    borderRadius: '12px',
    color: '#ffffff',
    cursor: 'pointer',
  },
  giftEmoji: {
    fontSize: '32px',
  },
  giftName: {
    fontSize: '12px',
    color: '#a0a0a0',
  },
  giftPrice: {
    fontSize: '12px',
    color: '#0891b2',
    fontWeight: '600',
  },
  giftBreakdown: {
    display: 'flex',
    gap: '8px',
    fontSize: '10px',
    color: '#6b6b6b',
  },
  giftFee: {
    fontSize: '10px',
    color: '#6b6b6b',
  },
  recordingText: {
    fontSize: '12px',
    color: '#ef4444',
    marginTop: '8px',
  },
  submitButton: {
    backgroundColor: '#0891b2',
    color: '#ffffff',
    padding: '10px 20px',
    borderRadius: '20px',
    fontWeight: '600',
    fontSize: '14px',
    marginTop: '12px',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    padding: '40px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #262626',
    borderTopColor: '#0891b2',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  commentItem: {
    padding: '12px 0',
    borderBottom: '1px solid #2d2d2d',
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  commentAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#0891b2',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  commentUserInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  commentUser: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#ffffff',
    textDecoration: 'none',
  },
  commentTime: {
    fontSize: '12px',
    color: '#6b6b6b',
  },
  pinnedBadge: {
    marginLeft: 'auto',
    fontSize: '11px',
    color: '#0891b2',
    fontWeight: '600',
  },
  commentText: {
    fontSize: '14px',
    color: '#ffffff',
    lineHeight: '1.5',
    marginLeft: '40px',
  },
  commentImage: {
    maxWidth: '200px',
    maxHeight: '200px',
    borderRadius: '8px',
    marginLeft: '40px',
    marginTop: '8px',
  },
  commentAudio: {
    marginLeft: '40px',
    marginTop: '8px',
    maxWidth: '300px',
    height: '36px',
  },
  giftDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: '40px',
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#262626',
    borderRadius: '8px',
    border: '1px solid #2d2d2d',
  },
  giftEmojiLarge: {
    fontSize: '24px',
  },
  giftDisplayName: {
    fontSize: '13px',
    color: '#ffffff',
    fontWeight: '600',
  },
  commentActions: {
    display: 'flex',
    gap: '16px',
    marginLeft: '40px',
    marginTop: '8px',
  },
  commentActionButton: {
    backgroundColor: 'transparent',
    color: '#a0a0a0',
    fontSize: '13px',
    padding: '4px 8px',
    borderRadius: '4px',
    border: 'none',
  },
  replyBox: {
    display: 'flex',
    gap: '8px',
    marginLeft: '40px',
    marginTop: '8px',
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#262626',
    border: '1px solid #2d2d2d',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
  },
  replyButton: {
    backgroundColor: '#0891b2',
    color: '#ffffff',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
  },
  replyCancel: {
    backgroundColor: 'transparent',
    color: '#a0a0a0',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    border: '1px solid #2d2d2d',
  },
  repliesList: {
    marginLeft: '40px',
    marginTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  replyItem: {
    padding: '8px 0',
    borderTop: '1px solid #2d2d2d',
  },
}

export default Comments
