import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { postsApi } from '../services/api'
import {
  ALLOWED_ACCEPT,
  MAX_POST_MEDIA,
  isVideoUrl,
  validateMediaFile,
} from '../utils/media'

const PostComposer = ({ compact = false, onCreated }) => {
  const [files, setFiles] = useState([])
  const [caption, setCaption] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  const addFiles = (incoming) => {
    const next = [...files]
    const messages = []

    Array.from(incoming || []).forEach((file) => {
      const validationError = validateMediaFile(file)
      if (validationError) {
        messages.push(validationError)
        return
      }
      if (next.length >= MAX_POST_MEDIA) {
        messages.push(`You can upload up to ${MAX_POST_MEDIA} files.`)
        return
      }
      next.push({
        file,
        preview: URL.createObjectURL(file),
      })
    })

    setFiles(next)
    setError(messages[0] || '')
  }

  const removeFile = (index) => {
    setFiles((prev) => {
      const target = prev[index]
      if (target?.preview) URL.revokeObjectURL(target.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!files.length) {
      setError('Please select at least one JPEG, PNG, or MP4 file')
      return
    }

    setUploading(true)
    setProgress(0)
    setError('')

    const formData = new FormData()
    files.forEach(({ file }) => formData.append('media', file))
    formData.append('caption', caption)
    formData.append('privacy', privacy)
    // Tanggal & waktu postingan OTOMATIS REAL-TIME OLEH SISTEM
    formData.append('createdAt', new Date().toISOString())
    formData.append('timestamp', String(Date.now()))

    const firstFile = files[0]?.file
    if (firstFile) {
      try {
        const mediaElement = document.createElement(firstFile.type.startsWith('video/') ? 'video' : 'img')
        const metadata = await new Promise((resolve) => {
          mediaElement.onload = () => resolve({ width: mediaElement.naturalWidth, height: mediaElement.naturalHeight })
          mediaElement.onloadedmetadata = () => resolve({ width: mediaElement.videoWidth, height: mediaElement.videoHeight })
          mediaElement.onerror = () => resolve(null)
          mediaElement.src = URL.createObjectURL(firstFile)
        })
        if (metadata?.width && metadata?.height) {
          formData.append('width', String(metadata.width))
          formData.append('height', String(metadata.height))
        }
      } catch (metadataError) {
        console.warn('Media metadata unavailable:', metadataError)
      }
    }

    try {
      await postsApi.createPost(formData, (percent) => setProgress(percent))
      files.forEach(({ preview }) => URL.revokeObjectURL(preview))
      setFiles([])
      setCaption('')
      setProgress(0)
      if (onCreated) onCreated()
      else navigate('/feed')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ ...styles.card, ...(compact ? styles.compactCard : {}) }}>
      <h2 style={styles.title}>{compact ? 'Buat Postingan' : 'Buat Postingan'}</h2>
      {error && <div style={styles.error}>{error}</div>}

      <div
        style={{
          ...styles.dropzone,
          backgroundColor: dragOver ? 'var(--bg-tertiary, #1a1a1a)' : 'var(--bg-secondary, #141414)',
          borderColor: dragOver ? '#0891b2' : '#2d2d2d',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          addFiles(e.dataTransfer.files)
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <p style={styles.dropzoneText}>Add images or a video</p>
        <p style={styles.dropzoneHint}>JPEG / PNG (max 10MB) · MP4 (max 200MB) · up to {MAX_POST_MEDIA} files</p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_ACCEPT}
          multiple
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
          style={{ display: 'none' }}
        />
      </div>

      {files.length > 0 && (
        <div style={styles.previewGrid}>
          {files.map((item, index) => (
            <div key={item.preview} style={styles.previewItem}>
              {isVideoUrl(item.file.name, item.file.type) ? (
                <video src={item.preview} style={styles.previewMedia} muted />
              ) : (
                <img src={item.preview} alt="" style={styles.previewMedia} />
              )}
              <button type="button" onClick={() => removeFile(index)} style={styles.removeThumb}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleUpload} style={styles.form}>
        <textarea
          placeholder="Write a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={compact ? 2 : 3}
          style={styles.caption}
        />
        <div style={styles.optionsRow}>
          <label style={styles.privacyLabel}>
            <span style={styles.privacyLabelText}>🔐 Privasi postingan</span>
            <select value={privacy} onChange={(e) => setPrivacy(e.target.value)} style={styles.select}>
              <option value="public">🌐 Public — Semua orang bisa melihat</option>
              <option value="close_friends">👥 Close Friends — Hanya teman dekat</option>
              <option value="private">🔒 Private — Hanya Anda sendiri</option>
            </select>
          </label>
        </div>
        {uploading && (
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
            <span style={styles.progressText}>{progress}%</span>
          </div>
        )}
        <button type="submit" disabled={uploading || !files.length} style={styles.uploadButton}>
          {uploading ? 'Publishing...' : 'Publish'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  card: {
    padding: 24,
    borderBottom: '1px solid #2d2d2d',
  },
  compactCard: {
    padding: '16px 24px 20px',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 12,
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    borderRadius: 8,
    padding: 12,
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 12,
  },
  dropzone: {
    border: '2px dashed #2d2d2d',
    borderRadius: 12,
    padding: '28px 16px',
    textAlign: 'center',
    cursor: 'pointer',
    marginBottom: 16,
  },
  dropzoneText: {
    color: '#ffffff',
    fontWeight: 600,
    marginBottom: 4,
  },
  dropzoneHint: {
    color: '#9ca3af',
    fontSize: 12,
  },
  previewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
    gap: 8,
    marginBottom: 16,
  },
  previewItem: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    aspectRatio: '1',
    backgroundColor: '#111',
  },
  previewMedia: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  removeThumb: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(0,0,0,0.75)',
    color: '#fff',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  caption: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    border: '1px solid #2d2d2d',
    borderRadius: 8,
    padding: '12px 16px',
    color: '#ffffff',
    fontSize: 14,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  optionsRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  privacyLabel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 220,
  },
  privacyLabelText: {
    fontSize: 12,
    fontWeight: 600,
    color: '#9ca3af',
    letterSpacing: 0.2,
  },
  select: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#1a1a1a',
    border: '1px solid #2d2d2d',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#ffffff',
    fontSize: 14,
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#262626',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0891b2',
  },
  progressText: {
    fontSize: 14,
    color: '#a0a0a0',
    minWidth: 40,
  },
  uploadButton: {
    backgroundColor: '#0891b2',
    color: '#ffffff',
    padding: 14,
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 16,
    border: 'none',
    cursor: 'pointer',
  },
}

export default PostComposer
