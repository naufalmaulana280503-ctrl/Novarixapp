import React, { useEffect, useRef, useState } from 'react'
import { isVideoUrl, resolveMediaUrl } from '../utils/media'

const MediaCarousel = ({ items = [], mediaType, duration, watermark }) => {
  const [index, setIndex] = useState(0)
  const videoRef = useRef(null)
  const mediaItems = (items || []).filter(Boolean)
  const current = mediaItems[index] || ''
  const showVideo = isVideoUrl(current, mediaType)

  useEffect(() => {
    setIndex(0)
  }, [mediaItems.join('|')])

  useEffect(() => {
    const video = videoRef.current
    return () => {
      if (video) {
        video.pause()
      }
    }
  }, [index])

  if (!mediaItems.length) return null

  const goTo = (next) => {
    if (!mediaItems.length) return
    setIndex((next + mediaItems.length) % mediaItems.length)
  }

  return (
    <div style={styles.container}>
      {showVideo ? (
        <video
          key={current}
          ref={videoRef}
          src={resolveMediaUrl(current)}
          controls
          playsInline
          preload="metadata"
          style={styles.media}
        />
      ) : (
        <img src={resolveMediaUrl(current)} alt={`Post media ${index + 1}`} style={styles.media} />
      )}

      {duration && showVideo && (
        <div style={styles.durationBadge}>
          {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
        </div>
      )}

      {watermark && <div style={styles.watermark}>{watermark}</div>}

      {mediaItems.length > 1 && (
        <>
          <button type="button" aria-label="Previous media" onClick={() => goTo(index - 1)} style={{ ...styles.nav, left: 8 }}>
            ‹
          </button>
          <button type="button" aria-label="Next media" onClick={() => goTo(index + 1)} style={{ ...styles.nav, right: 8 }}>
            ›
          </button>
          <div style={styles.dots}>
            {mediaItems.map((_, i) => (
              <button
                key={`${mediaItems[i]}-${i}`}
                type="button"
                aria-label={`Go to media ${i + 1}`}
                onClick={() => setIndex(i)}
                style={{
                  ...styles.dot,
                  backgroundColor: i === index ? '#ffffff' : 'rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </div>
          <div style={styles.counter}>
            {index + 1}/{mediaItems.length}
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  container: {
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '12px',
    backgroundColor: '#111111',
  },
  media: {
    width: '100%',
    maxHeight: '520px',
    minHeight: '220px',
    objectFit: 'contain',
    display: 'block',
    backgroundColor: '#000000',
  },
  nav: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#ffffff',
    fontSize: 28,
    lineHeight: '32px',
    cursor: 'pointer',
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  },
  counter: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: 999,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 36,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#ffffff',
    padding: '4px 8px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
  },
  watermark: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#0891b2',
    padding: '4px 10px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
  },
}

export default MediaCarousel
