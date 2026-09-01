import { API_ORIGIN as RESOLVED_API_ORIGIN } from '../services/backendUrl'

export const API_ORIGIN = RESOLVED_API_ORIGIN

export const MAX_POST_MEDIA = 10
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024
export const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4']
export const ALLOWED_ACCEPT = 'image/jpeg,image/png,video/mp4,.jpg,.jpeg,.png,.mp4'

export const resolveMediaUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('blob:')) return url
  const path = url.startsWith('/') ? url : `/${url}`
  return `${API_ORIGIN}${path}`
}

export const isVideoUrl = (url, mimeType) => {
  const value = (url || '').split('?')[0].toLowerCase()
  if (/\.(mp4|mov|webm)(?:$|[/?#])/i.test(value) || value.endsWith('.mp4') || value.endsWith('.mov') || value.endsWith('.webm')) {
    return true
  }
  if (/\.(jpe?g|png|gif|webp)(?:$|[/?#])/i.test(value) || value.endsWith('.jpg') || value.endsWith('.jpeg') || value.endsWith('.png')) {
    return false
  }
  return Boolean(mimeType?.startsWith('video'))
}

export const getPostMediaItems = (post) => {
  if (!post) return []
  if (Array.isArray(post.mediaUrls) && post.mediaUrls.length) return post.mediaUrls
  if (Array.isArray(post.media_urls) && post.media_urls.length) return post.media_urls
  if (post.mediaUrl) return [post.mediaUrl]
  if (post.media_url) return [post.media_url]
  return []
}

export const validateMediaFile = (file) => {
  const type = file.type || ''
  const name = (file.name || '').toLowerCase()
  const isJpeg = type === 'image/jpeg' || type === 'image/jpg' || name.endsWith('.jpg') || name.endsWith('.jpeg')
  const isPng = type === 'image/png' || name.endsWith('.png')
  const isMp4 = type === 'video/mp4' || name.endsWith('.mp4')

  if (!isJpeg && !isPng && !isMp4) {
    return `File "${file.name}" is not allowed. Use JPEG, PNG, or MP4.`
  }
  if ((isJpeg || isPng) && file.size > MAX_IMAGE_BYTES) {
    return `Image "${file.name}" exceeds the 10MB limit.`
  }
  if (isMp4 && file.size > MAX_VIDEO_BYTES) {
    return `Video "${file.name}" exceeds the 200MB limit.`
  }
  return null
}
