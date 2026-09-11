import axios from 'axios'
import { API_ORIGIN } from './backendUrl'

const API_URL = `${API_ORIGIN}/api`

export const REQUEST_TIMEOUT_MS = 20000
export const NETWORK_ERROR_MESSAGE = 'Server Novarix tidak dapat dihubungi. Pastikan backend sedang berjalan (npm run dev di folder backend) lalu coba lagi.'

export const api = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

const isRetriableNetworkError = (error) => (
  !error?.response
  && Boolean(error?.request || error?.code)
  && error?.code !== 'ERR_CANCELED'
)

api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('token')
      if (token && !config.headers?.Authorization) {
        config.headers = { ...(config.headers || {}), Authorization: 'Bearer ' + token }
      }
    } catch (e) {
      // ignore errors reading storage
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Retry a transient network failure once (dev-server proxy warm-up,
    // backend restart, flaky connection) before surfacing it to the UI.
    const config = error?.config
    if (config && !config.__isRetry && isRetriableNetworkError(error)) {
      config.__isRetry = true
      await new Promise((resolve) => setTimeout(resolve, 600))
      try {
        return await api.request(config)
      } catch (retryError) {
        if (!retryError.response) {
          retryError.message = NETWORK_ERROR_MESSAGE
        }
        return Promise.reject(retryError)
      }
    }

    if (isRetriableNetworkError(error)) {
      error.message = NETWORK_ERROR_MESSAGE
    }

    try {
      if (error.response?.status === 401) {
        // Clear stored auth and optionally redirect to login
        // OAuth exchange failures are handled by the callback page. A global
        // redirect here would hide the provider/backend error and race the
        // callback before it can finish restoring the Supabase session.
        const isOAuthExchange = Boolean(
          error.config?.__isOAuthExchange
          || String(error.config?.url || '').replace(/\/+$/, '').endsWith('/auth/oauth'),
        )
        if (!isOAuthExchange) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
        // If running in browser, navigate to login to force re-auth
        if (typeof window !== 'undefined') {
          // avoid infinite redirect loop if already on /login
          if (!isOAuthExchange && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login'
          }
        }
      }
    } catch (e) {
      // ignore interceptor errors
    }
    return Promise.reject(error)
  }
)
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
  confirmEmail: (token) => api.post('/auth/confirm-email', { token }),
  acceptTerms: () => api.post('/auth/accept-terms'),
  sendPhoneVerification: (phone) => api.post('/auth/phone-verification', { phone }),
  verifyPhone: (phone, code) => api.post('/auth/verify-phone', { phone, code }),
}

export const userSettingsApi = {
  get: () => api.get('/users/settings'),
  update: (data) => api.put('/users/settings', data),
}

export const followsApi = {
  status: (userId) => api.get(`/users/${userId}/following`),
  follow: (userId) => api.post(`/users/${userId}/follow`),
  unfollow: (userId) => api.delete(`/users/${userId}/follow`),
  followers: (userId) => api.get(`/users/${userId}/followers`),
  followingList: (userId) => api.get(`/users/${userId}/following-list`),
  block: (userId) => api.post(`/users/${userId}/block`),
}

export const userProfileApi = {
  getByUsername: (username) => api.get(`/users/${username}`),
}

export const postsApi = {
  getFeed: (scope = 'all', page = 1, limit = 20) => api.get('/posts/feed', { params: { scope, page, limit } }),
  getUserPosts: (userId, page = 1, limit = 50) => api.get(`/posts/user/${userId}`, { params: { page, limit } }),
  getUserLikedPosts: (userId, page = 1, limit = 50) => api.get(`/posts/user/${userId}/liked`, { params: { page, limit } }), // POSTINGAN YANG DI-LIKE USER (TAB DISUKAI PROFILE)
  getPost: (id) => api.get(`/posts/${id}`),
  createPost: (formData, onProgress) => api.post('/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (!onProgress || !progressEvent.total) return
      onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
    },
  }),
  deletePost: (id) => api.delete(`/posts/${id}`),
  incrementView: (id) => api.post(`/posts/${id}/view`),
  sharePost: (id) => api.post(`/posts/${id}/share`),
  repostPost: (id, data) => api.post(`/posts/${id}/repost`, data),
  // Like / Unlike via dedicated posts endpoint (LEBIH LANCAR tanpa error spam)
  likePost: (id) => api.post(`/posts/${id}/like`),
  unlikePost: (id) => api.delete(`/posts/${id}/like`),
}

export const storiesApi = {
  uploadStory: (formData, onProgress) => api.post('/stories', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (!onProgress || !progressEvent.total) return
      onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
    },
  }),
  getStoriesFeed: () => api.get('/stories/feed'),
  getUserStories: (userId) => api.get(`/stories/user/${userId}`),
  viewStory: (storyId) => api.post(`/stories/${storyId}/view`),
  getStoryViewers: (storyId) => api.get(`/stories/${storyId}/viewers`),
  deleteStory: (storyId) => api.delete(`/stories/${storyId}`),
}

export const commentsApi = {
  getComments: (postId) => api.get(`/comments/post/${postId}`),
  createComment: (postId, data) => api.post(`/comments/post/${postId}`, data),
  replyComment: (postId, parentId, data) => api.post(`/comments/post/${postId}`, { ...data, parentId }), // BALAS KOMENTAR (nested via parentId)
  updateComment: (commentId, data) => api.patch(`/comments/${commentId}`, data), // EDIT KOMENTAR (PATCH)
  deleteComment: (commentId) => api.delete(`/comments/${commentId}`),
  pinComment: (postId, commentId) => api.post(`/comments/post/${postId}/${commentId}/pin`),
  likeComment: (commentId) => api.post(`/comments/${commentId}/like`),
}

export const reactionsApi = {
  addReaction: (postId, type) => api.post(`/reactions/post/${postId}`, { type }),
  removeReaction: (postId) => api.delete(`/reactions/post/${postId}`),
  getReactions: (postId) => api.get(`/reactions/post/${postId}`),
  createDuetOrReact: (postId, reactionMediaUrl) => api.post(`/reactions/post/${postId}/duet-react`, { reaction_media_url: reactionMediaUrl }),
}

export const giftsApi = {
  listGifts: () => api.get('/gifts/list'),
  sendGift: (data) => api.post('/gifts/send', data),
  getGiftTransactions: (userId) => api.get(`/gifts/transactions/${userId}`),
  getGiftRevenue: (userId) => api.get(`/gifts/revenue/${userId}`),
}

export const stickersApi = {
  listStickers: () => api.get('/stickers/list'),
  getGiftStickers: () => api.get('/stickers/gifts'),
  acquireSticker: (stickerId) => api.post('/stickers/acquire', { stickerId }),
  getUserStickers: (userId) => api.get(`/stickers/user/${userId}`),
}

export const groupsApi = {
  getGroups: () => api.get('/groups'),
  getGroup: (id) => api.get(`/groups/${id}`),
  createGroup: (data) => api.post('/groups', data),
  updateGroup: (id, data) => api.put(`/groups/${id}`, data),
  deleteGroup: (id) => api.delete(`/groups/${id}`),
  listUserGroups: (userId) => api.get(`/groups/user/${userId}`),
  joinGroup: (id) => api.post(`/groups/${id}/join`),
  leaveGroup: (id) => api.post(`/groups/${id}/leave`),
  getMembers: (id) => api.get(`/groups/${id}/members`),
  kickMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
  changeMemberRole: (groupId, userId, role) => api.put(`/groups/${groupId}/members/${userId}/role`, { role }),
  generateInviteCode: (id) => api.post(`/groups/${id}/invite`),
  joinByInviteCode: (code) => api.post(`/groups/invite/${code}`),
}

export const pollsApi = {
  createPoll: (groupId, data) => api.post(`/polls/group/${groupId}`, data),
  votePoll: (pollId, optionIndex) => api.post(`/polls/poll/${pollId}/vote`, { option_index: optionIndex }),
  getPollResults: (pollId) => api.get(`/polls/poll/${pollId}`),
}

export const chatApi = {
  getConversations: () => api.get('/chat/conversations'),
  getPrivateMessages: (userId1, userId2) => api.get(`/chat/private/${userId1}/${userId2}`),
  getGroupMessages: (groupId) => api.get(`/chat/group/${groupId}`),
  sendMessage: (data) => api.post('/chat/send', data),
  pinMessage: (groupId, messageId) => api.post(`/chat/group/${groupId}/pin/${messageId}`),
  unpinMessage: (groupId, messageId) => api.post(`/chat/group/${groupId}/unpin/${messageId}`),
  getPinnedMessages: (groupId) => api.get(`/chat/group/${groupId}/pinned`),
}

export const callsApi = {
  initiateCall: (receiverId, type, groupId) => api.post('/calls/initiate', { receiver_id: receiverId, type, group_id: groupId }),
  updateCallStatus: (callId, status) => api.patch(`/calls/${callId}/status`, { status }),
  endCall: (callId, data) => api.post(`/calls/${callId}/end`, data),
  getHistory: () => api.get('/calls/history'),
}

export const adsApi = {
  checkEligibility: () => api.get('/ads/eligibility'),
  createAd: (data) => api.post('/ads/create', data),
  getMyAds: () => api.get('/ads/my'),
  getAdStats: (id) => api.get(`/ads/${id}/stats`),
}

export const moderationApi = {
  getReports: () => api.get('/moderation/reports'),
  getBotFlags: () => api.get('/moderation/bot-flags'),
  reportContent: (data) => api.post('/moderation/report', data),
  reviewReport: (reportId, actionTaken) => api.post(`/moderation/reports/${reportId}/review`, { action_taken: actionTaken }),
  runBotCheck: (userId) => api.post(`/moderation/bot-check/${userId}`),
  autoBanBots: () => api.post('/moderation/auto-ban-bots'),
}

export const cameraApi = {
  getDevices: () => api.get('/camera/devices'),
  capturePhoto: (data) => api.post('/camera/photo', data),
  startVideoRecording: (data) => api.post('/camera/video/start', data),
  stopVideoRecording: (sessionId) => api.post(`/camera/video/stop/${sessionId}`),
  applyBeautyEffect: (data) => api.post('/camera/beauty', data),
}

export const editorApi = {
  trimVideo: (postId, data) => api.post(`/editor/${postId}/trim`, data),
  changeSpeed: (postId, data) => api.post(`/editor/${postId}/speed`, data),
  addTransition: (postId, data) => api.post(`/editor/${postId}/transition`, data),
}

export const aiApi = {
  chat: (message, file, options = {}) => {
    const payload = {
      message,
      conversation_id: options.conversationId,
      history: options.history || [],
      context: options.context || 'general',
    }

    if (!file) return api.post('/ai/chat', payload)

    const formData = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value))
        return
      }
      formData.append(key, value)
    })
    formData.append('file', file)
    return api.post('/ai/chat', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  suggestCaption: (imageUrl) => api.post('/ai/suggest-caption', { image_url: imageUrl }),
  detectNSFW: (imageUrl) => api.post('/ai/detect-nsfw', { image_url: imageUrl }),
}

export const watermarkApi = {
  applyWatermark: (postId, data) => api.post(`/watermarks/post/${postId}`, data),
  getWatermarks: (postId) => api.get(`/watermarks/post/${postId}`),
  batchWatermark: (data) => api.post('/watermarks/batch', data),
}

export const verificationApi = {
  checkEligibility: (userId) => api.get(`/verification/eligibility/${userId}`),
  submitRequest: (data) => api.post('/verification/request', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getRequestStatus: (userId) => api.get(`/verification/status/${userId}`),
}

export const notificationsApi = {
  getAll: (page = 1) => api.get(`/notifications?page=${page}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (ids) => api.post('/notifications/read', { notificationIds: ids }),
  markAllRead: () => api.post('/notifications/read-all'),
}

export const bookmarksApi = {
  toggle: (postId) => api.post(`/bookmarks/${postId}/toggle`),
  getAll: (page = 1) => api.get(`/bookmarks?page=${page}`),
  getStatus: (postId) => api.get(`/bookmarks/${postId}/status`),
}

export const profileApi = {
  update: (data) => api.put('/users/me/profile', data),
  updateAvatar: (file) => {
    const fd = new FormData(); fd.append('avatar', file);
    return api.put('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  updateBanner: (file) => {
    const fd = new FormData(); fd.append('banner', file);
    return api.put('/users/me/banner', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
}

export const blockApi = {
  block: (userId) => api.post(`/users/${userId}/block`),
  unblock: (userId) => api.delete(`/users/${userId}/block`),
}

export const coinsApi = {
  getBalance: () => api.get('/gifts/coins/balance'),
  getHistory: () => api.get('/gifts/coins/history'),
}
