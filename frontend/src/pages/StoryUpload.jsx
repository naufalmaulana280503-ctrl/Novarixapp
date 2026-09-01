import React, { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { storiesApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import { Upload, Camera, Film, Type, X, Check, Loader2 } from 'lucide-react'

const StoryUpload = () => {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const fileInputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [mediaType, setMediaType] = useState('image') // image | video | boomerang
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFileSelect = useCallback((e) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    const isVideo = selected.type.startsWith('video/')
    const isImage = selected.type.startsWith('image/')

    if (!isVideo && !isImage) {
      addToast({ type: 'error', text: 'Hanya file gambar dan video yang didukung' })
      return
    }

    // Max 100MB
    if (selected.size > 100 * 1024 * 1024) {
      addToast({ type: 'error', text: 'Ukuran file maksimal 100MB' })
      return
    }

    setFile(selected)
    setMediaType(isVideo ? 'video' : 'image')

    // Create preview
    const url = URL.createObjectURL(selected)
    setPreview(url)
  }, [addToast])

  const handleUpload = useCallback(async () => {
    if (!file) {
      addToast({ type: 'error', text: 'Pilih file terlebih dahulu' })
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('media', file)
      formData.append('mediaType', mediaType)
      if (caption.trim()) {
        formData.append('caption', caption.trim())
      }

      await storiesApi.uploadStory(formData, (progress) => {
        setUploadProgress(progress)
      })

      addToast({ type: 'success', text: 'Story berhasil diupload!' })
      navigate(-1)
    } catch (err) {
      console.error('Story upload failed:', err)
      addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal upload story' })
    } finally {
      setUploading(false)
    }
  }, [file, mediaType, caption, navigate, addToast])

  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    setMediaType('image')
    setCaption('')
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <X size={24} />
          </button>
          <h2 style={styles.title}>Upload Story</h2>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{
              ...styles.uploadBtn,
              opacity: !file || uploading ? 0.5 : 1,
              cursor: !file || uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
          </button>
        </div>

        {/* Upload progress */}
        {uploading && (
          <div style={styles.progressContainer}>
            <div style={{ ...styles.progressBar, width: `${uploadProgress}%` }} />
            <span style={styles.progressText}>{uploadProgress}%</span>
          </div>
        )}

        {/* Preview area */}
        {preview ? (
          <div style={styles.previewContainer}>
            {(mediaType === 'video' || mediaType === 'boomerang') ? (
              <video
                src={preview}
                style={styles.previewMedia}
                autoPlay
                loop={mediaType === 'boomerang'}
                muted
                playsInline
              />
            ) : (
              <img src={preview} alt="Preview" style={styles.previewMedia} />
            )}
            <button onClick={clearFile} style={styles.clearBtn}>
              <X size={20} />
            </button>
          </div>
        ) : (
          <div style={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
            <div style={styles.uploadIcon}>
              <Camera size={48} />
            </div>
            <p style={styles.uploadText}>Pilih Foto atau Video</p>
            <p style={styles.uploadHint}>Maksimal 100MB</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Media type selector */}
        {file && (
          <div style={styles.typeSelector}>
            <button
              onClick={() => setMediaType('image')}
              style={{
                ...styles.typeBtn,
                ...(mediaType === 'image' ? styles.typeBtnActive : {}),
              }}
              disabled={!file.type.startsWith('image/')}
            >
              <Camera size={18} />
              <span>Foto</span>
            </button>
            <button
              onClick={() => setMediaType('video')}
              style={{
                ...styles.typeBtn,
                ...(mediaType === 'video' ? styles.typeBtnActive : {}),
              }}
              disabled={!file.type.startsWith('video/')}
            >
              <Film size={18} />
              <span>Video</span>
            </button>
            <button
              onClick={() => setMediaType('boomerang')}
              style={{
                ...styles.typeBtn,
                ...(mediaType === 'boomerang' ? styles.typeBtnActive : {}),
              }}
              disabled={!file.type.startsWith('video/')}
            >
              <Upload size={18} />
              <span>Boomerang</span>
            </button>
          </div>
        )}

        {/* Caption input */}
        {file && (
          <div style={styles.captionContainer}>
            <Type size={18} style={{ color: '#666', flexShrink: 0 }} />
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Tambahkan caption..."
              maxLength={200}
              style={styles.captionInput}
            />
            <span style={styles.charCount}>{caption.length}/200</span>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'var(--bg-primary, #0f0f0f)',
    display: 'flex',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 480,
    padding: '0 16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 0',
  },
  backBtn: {
    background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', padding: 8,
  },
  title: {
    color: '#fff', fontSize: 18, fontWeight: 700, margin: 0,
  },
  uploadBtn: {
    background: '#0891b2', border: 'none', color: '#fff', borderRadius: 20,
    width: 40, height: 40, cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  progressContainer: {
    position: 'relative', height: 4, background: '#333', borderRadius: 2,
    overflow: 'hidden', marginBottom: 16,
  },
  progressBar: {
    height: '100%', background: 'linear-gradient(90deg, #0891b2, #06b6d4)',
    borderRadius: 2, transition: 'width 0.3s',
  },
  progressText: {
    position: 'absolute', top: -20, right: 0, color: '#999', fontSize: 12,
  },
  uploadArea: {
    border: '2px dashed #333', borderRadius: 16, padding: '60px 20px',
    textAlign: 'center', cursor: 'pointer', marginTop: 20,
    transition: 'border-color 0.2s',
  },
  uploadIcon: {
    color: '#0891b2', marginBottom: 16,
  },
  uploadText: {
    color: '#fff', fontSize: 16, fontWeight: 600, margin: '0 0 8px',
  },
  uploadHint: {
    color: '#666', fontSize: 13, margin: 0,
  },
  previewContainer: {
    position: 'relative', width: '100%', aspectRatio: '9/16',
    maxHeight: '60vh', borderRadius: 16, overflow: 'hidden',
    background: '#000', marginTop: 16,
  },
  previewMedia: {
    width: '100%', height: '100%', objectFit: 'cover',
  },
  clearBtn: {
    position: 'absolute', top: 12, right: 12,
    background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff',
    borderRadius: '50%', width: 36, height: 36, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  typeSelector: {
    display: 'flex', gap: 8, marginTop: 16,
  },
  typeBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: '10px 12px', background: '#1a1a1a', border: '1px solid #333',
    borderRadius: 10, color: '#999', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s',
  },
  typeBtnActive: {
    background: 'rgba(8,145,178,0.15)', borderColor: '#0891b2', color: '#06b6d4',
  },
  captionContainer: {
    display: 'flex', alignItems: 'center', gap: 10, marginTop: 16,
    background: '#1a1a1a', borderRadius: 12, padding: '10px 14px',
    border: '1px solid #333',
  },
  captionInput: {
    flex: 1, background: 'none', border: 'none', color: '#fff',
    fontSize: 14, outline: 'none',
  },
  charCount: {
    color: '#666', fontSize: 12, flexShrink: 0,
  },
}

export default StoryUpload
