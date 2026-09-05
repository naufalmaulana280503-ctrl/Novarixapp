import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { reactionsApi, commentsApi, postsApi, followsApi, bookmarksApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import VerifiedBadge from './VerifiedBadge'
import MediaCarousel from './MediaCarousel'
import { getPostMediaItems } from '../utils/media'

/* ===== LUCIDE ICONS (modern, clean) ===== */
import {
  Heart, MessageCircle, Share2, MoreHorizontal, Trash2,
  Send, Clock, Lock, Users, Globe2, Bookmark, Repeat2,
  Pencil, X, CornerDownLeft,
} from 'lucide-react'

/* ============================= HELPERS ============================= */

/* --- VALIDASI POST ID TUNTAS (sebelum dikirim ke API) --- */
const isValidPostId = (id) => {
  if (id === undefined || id === null) return false
  const s = String(id).trim()
  if (s === '' || s === 'NaN' || s === 'null' || s === 'undefined') return false
  if (/^\d+$/.test(s)) {
    const n = Number(s)
    return !isNaN(n) && isFinite(n) && n > 0
  }
  return s.length >= 2
}
const normalizePostId = (id) => (/^\d+$/.test(String(id).trim()) ? Number(id) : String(id).trim())

const copyToClipboard = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); return true } catch {}
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    return true
  } catch { return false }
}

const fmt = (n) => {
  const x = Number(n) || 0
  if (x >= 1e6) return (x / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (x >= 1e3) return (x / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(x)
}

const formatRelativeTime = (input) => {
  if (!input) return ''
  const d = input instanceof Date ? input : new Date(input)
  if (isNaN(d.getTime())) return String(input)
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 10) return 'Baru saja'
  if (s < 60) return `${s}d`
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`
  const h = Math.floor(m / 60); if (h < 24) return `${h}j`
  const day = Math.floor(h / 24); if (day < 7) return `${day}h`
  const wk = Math.floor(day / 7); if (wk < 5) return `${wk}mg`
  const bln = Math.floor(day / 30); if (bln < 12) return `${bln}bln`
  return `${Math.floor(day / 365)}th`
}

const formatCommentDate = (input) => {
  const date = new Date(input)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const getPrivacyInfo = (p) => {
  if (p === 'private') return { icon: Lock,       label: 'Private',       cls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' }
  if (p === 'close-friends' || p === 'close_friends') return { icon: Users, label: 'Close Friends', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
  return { icon: Globe2, label: 'Public', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
}

/* ============================= COMPONENT ============================= */

const PostCard = ({ post, onDelete }) => {
  const { currentUser } = useAuth()
  const { addToast } = useToast()

  // Refresh timestamp tiap 30 detik
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  // State UI - init dari backend data (priority: likes_count > likes)
  const [likes, setLikes] = useState(() => {
    const v = Number(post.likes_count ?? post.likes ?? 0)
    return isNaN(v) ? 0 : Math.max(0, v)
  })
  const [loved, setLoved] = useState(() => Boolean(post.loved || post.isLoved || false))
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState(post.comments || [])
  const [commentsCount, setCommentsCount] = useState(Number(post.commentsCount) || (post.comments?.length ?? 0))
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [following, setFollowing] = useState(Boolean(post.isFollowing))
  const [followLoading, setFollowLoading] = useState(false)

  const [reposted, setReposted] = useState(Boolean(post.isReposted || false))
  const [repostsCount, setRepostsCount] = useState(Number(post.repostsCount) || 0)

  // === REFS PENTING: Like Anti Spam + Validasi Post ID ===
  const likeBusyRef = useRef(false)                // Debounce: cegah request in-flight
  const lastLikeErrorAtRef = useRef(0)              // Throttle toast error: max 1x per 6s
  const postIdValidRef = useRef(isValidPostId(post?.id))
  const safePostIdRef = useRef(postIdValidRef.current ? normalizePostId(post?.id) : null)

  // === STATE Fitur Komentar Lanjutan: BALAS KOMENTAR + EDIT KOMENTAR ===
  const [replyingToId, setReplyingToId] = useState(null)   // commentId yang sedang di-balas (null = top-level)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState(null) // commentId yang sedang diedit
  const [editText, setEditText] = useState('')
  const [submittingEdit, setSubmittingEdit] = useState(false)
  const [lastCommentErrorAt, setLastCommentErrorAt] = useState(0)  // throttle toast error komentar (6s)

  // Sync ID + state likes/loved jika prop post.id berubah
  useEffect(() => {
    postIdValidRef.current = isValidPostId(post?.id)
    safePostIdRef.current = postIdValidRef.current ? normalizePostId(post?.id) : null
    const v = Number(post.likes_count ?? post.likes ?? 0)
    setLikes(isNaN(v) ? 0 : Math.max(0, v))
    setLoved(Boolean(post.loved || post.isLoved || false))
    setReposted(Boolean(post.isReposted || false))
    setRepostsCount(Number(post.repostsCount) || 0)
    setFollowing(Boolean(post.isFollowing))
    setComments(post.comments || [])
    setCommentsCount(Number(post.commentsCount) || (post.comments?.length ?? 0))
  }, [post?.id, post?.likes_count, post?.likes, post?.loved, post?.isLoved, post?.isReposted, post?.repostsCount, post?.isFollowing, post?.comments, post?.commentsCount])

  // Dropdown 3 titik (delete menu)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  useEffect(() => {
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  /* ----- Identitas ----- */
  const currentUserId = currentUser?.id || currentUser?.sub || currentUser?.user_id
  const isOwner = !!currentUserId && (
    String(post.userId ?? post.authorId ?? '') === String(currentUserId) ||
    (!!post.username && !!currentUser?.username && post.username === currentUser.username)
  )
  const canFollow = Boolean(currentUserId && post.userId && String(currentUserId) !== String(post.userId))
  const verifiedTier = post?.verifiedBadge || (post?.isVerified ? 'blue' : null)
  const createdAt = post.createdAt || post.timestamp || Date.now()
  const privacyInfo = getPrivacyInfo(post.privacy)
  const PrivacyIcon = privacyInfo.icon

  /* ================== HANDLERS ================== */

  const toggleFollow = useCallback(async () => {
    if (!canFollow || followLoading) return
    const next = !following
    setFollowing(next)
    setFollowLoading(true)
    try {
      if (next) await followsApi.follow(post.userId)
      else await followsApi.unfollow(post.userId)
      addToast({ type: 'success', text: next ? 'Sekarang mengikuti pengguna' : 'Berhenti mengikuti pengguna' })
    } catch (error) {
      setFollowing(!next)
      addToast({ type: 'error', text: error?.response?.data?.message || 'Gagal memperbarui follow' })
    } finally { setFollowLoading(false) }
  }, [addToast, canFollow, followLoading, following, post.userId])

  // 1) LIKE - Fitur UTAMA tanpa error spam seperti platform sosial media
  const toggleLove = useCallback(async () => {
    // === VALIDASI PERTAMA: Post ID harus valid & ada ===
    if (!postIdValidRef.current || safePostIdRef.current == null) {
      console.warn('[toggleLove] Dibatalkan: post.id TIDAK VALID:', post?.id, '| type:', typeof post?.id)
      return
    }
    const safeId = safePostIdRef.current

    // === VALIDASI: User harus login (tanpa spam toast) ===
    if (!currentUserId) {
      const now = Date.now()
      if (now - lastLikeErrorAtRef.current > 6000) {
        lastLikeErrorAtRef.current = now
        addToast({ type: 'error', text: 'Silakan login terlebih dahulu untuk menyukai postingan' })
      }
      return
    }

    // === DEBOUNCE: Cegah spam request (jika masih ada request in-flight, abaikan) ===
    if (likeBusyRef.current) return

    const wasLoved = loved
    const prevLikes = likes

    // Optimistic UI: Update tampilan duluan agar terasa smooth kayak IG/TikTok
    setLoved(!wasLoved)
    setLikes(wasLoved ? Math.max(0, prevLikes - 1) : prevLikes + 1)

    // Lock request agar tidak spam
    likeBusyRef.current = true

    try {
      let response
      if (wasLoved) {
        // UNLIKE: Hapus love dari postingan
        response = await postsApi.unlikePost(safeId)
      } else {
        // LIKE: Tambah love ke postingan
        response = await postsApi.likePost(safeId)
      }

      // === SINKRONISASI DARI RESPONSE API (source of truth) ===
      if (response?.data) {
        const data = response.data
        if (typeof data.likes !== 'undefined' && data.likes !== null) {
          const n = Number(data.likes)
          if (!isNaN(n) && isFinite(n)) setLikes(Math.max(0, n))
        }
        if (typeof data.isLoved === 'boolean') {
          setLoved(data.isLoved)
        } else if (typeof data.isLoved !== 'undefined' && data.isLoved !== null) {
          setLoved(Boolean(data.isLoved))
        }
      }
    } catch (err) {
      // === ROLLBACK jika gagal (UI kembali ke posisi semula) ===
      setLoved(wasLoved)
      setLikes(prevLikes)

      // === ANTI SPAM TOAST ERROR: Maksimal 1x tampil tiap 6 DETIK ===
      const now = Date.now()
      if (now - lastLikeErrorAtRef.current > 6000) {
        lastLikeErrorAtRef.current = now
        const raw = err?.response?.data?.message
        const isAuth = err?.response?.status === 401
        const msg = isAuth
          ? 'Sesi login berakhir. Silakan login ulang'
          : (typeof raw === 'string' && raw.length > 0 && raw.length < 120 ? raw : 'Gagal memproses like')
        addToast({ type: 'error', text: msg })
      }
      // Log ke console untuk debugging (TIDAK ditampilkan ke user berulang)
      console.warn('[toggleLove] non-kritis error (dithrottle 6s):', err?.message || err?.code || err)
    } finally {
      likeBusyRef.current = false
    }
  }, [loved, likes, currentUserId, addToast, post?.id])

  // 2) SHARE = copy link
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/post/${post.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: `Postingan ${post.displayName || 'Novarix'}`, url })
        postsApi.sharePost(post.id).catch(() => {})
        setMenuOpen(false)
        return
      } catch (error) {
        if (error?.name === 'AbortError') return
      }
    }
    const ok = await copyToClipboard(url)
    if (ok) {
      addToast({ type: 'success', text: 'Tautan disalin!' })
      postsApi.sharePost(post.id).catch(() => {})
    } else {
      addToast({ type: 'error', text: 'Gagal menyalin tautan' })
    }
    setMenuOpen(false)
  }, [post.id, addToast])

  const handleDeleteComment = useCallback(async (commentId) => {
    if (!commentId || String(commentId).startsWith('tmp_')) return
    // Gunakan window.confirm untuk sederhana - di mobile browser biasanya native confirm
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (!window.confirm('Hapus komentar ini?')) return
    }
    try {
      await commentsApi.deleteComment(commentId)
      setComments((prev) => prev.filter((comment) => comment.id !== commentId && comment.parentId !== commentId))
      setCommentsCount((count) => Math.max(0, count - 1))
      addToast({ type: 'success', text: 'Komentar dihapus' })
    } catch (error) {
      console.error(error)
      const now = Date.now()
      if (now - lastCommentErrorAt > 6000) {
        setLastCommentErrorAt(now)
        addToast({ type: 'error', text: 'Gagal menghapus komentar' })
      }
    }
  }, [addToast, lastCommentErrorAt])

  /* === Fitur BALAS KOMENTAR (nested via parentId) === */
  const handleStartReply = useCallback((commentId, username) => {
    setReplyingToId(commentId)
    setReplyText(username ? `@${username} ` : '')
    // Auto scroll ke input reply di section comment nanti
    setTimeout(() => {
      const el = document.getElementById(`reply-input-${String(post?.id)}-${String(commentId)}`)
      if (el) el.focus()
    }, 50)
  }, [post?.id])

  const handleCancelReply = useCallback(() => {
    setReplyingToId(null)
    setReplyText('')
  }, [])

  const handleSubmitReply = useCallback(async (parentCommentId) => {
    if (!currentUserId) {
      addToast({ type: 'error', text: 'Silakan login untuk membalas komentar' })
      return
    }
    // Hilangkan prefix @username jika ada
    const cleanText = replyText.replace(/^@[a-zA-Z0-9_]+\s*/, '').trim()
    if (!cleanText) return
    if (!parentCommentId) return

    const tmpId = 'tmp_r_' + Date.now()
    const optimistic = {
      id: tmpId, text: cleanText,
      parentId: parentCommentId,
      createdAt: new Date().toISOString(),
      userId: currentUserId,
      author: {
        id: currentUserId,
        displayName: currentUser?.displayName || currentUser?.name || 'Saya',
        username: currentUser?.username || 'user',
        avatarUrl: currentUser?.avatarUrl,
      },
    }
    setComments((c) => [...c, optimistic])
    setCommentsCount((c) => c + 1)
    setSubmittingReply(true)
    setReplyText('')
    try {
      const r = await commentsApi.replyComment(post.id, parentCommentId, { text: cleanText })
      const sv = r.data?.comment || r.data
      if (sv) setComments((prev) => prev.map((c) => (c.id === tmpId ? sv : c)))
      setReplyingToId(null)
      addToast({ type: 'success', text: 'Balasan dikirim!' })
    } catch (e) {
      console.error(e)
      setComments((prev) => prev.filter((c) => c.id !== tmpId))
      setCommentsCount((c) => Math.max(0, c - 1))
      const now = Date.now()
      if (now - lastCommentErrorAt > 6000) {
        setLastCommentErrorAt(now)
        addToast({ type: 'error', text: 'Gagal mengirim balasan' })
      }
    } finally {
      setSubmittingReply(false)
    }
  }, [replyText, currentUserId, currentUser, post.id, addToast, lastCommentErrorAt])

  /* === Fitur EDIT KOMENTAR (hanya pemilik) === */
  const handleStartEdit = useCallback((comment) => {
    if (String(comment.userId || comment.author?.id || '') !== String(currentUserId || '')) return
    setEditingCommentId(comment.id)
    setEditText(comment.text || comment.content || comment.body || '')
  }, [currentUserId])

  const handleCancelEdit = useCallback(() => {
    setEditingCommentId(null)
    setEditText('')
  }, [])

  const handleSubmitEdit = useCallback(async (commentId) => {
    if (!currentUserId) return
    const text = editText.trim()
    if (!text) {
      addToast({ type: 'error', text: 'Komentar tidak boleh kosong' })
      return
    }
    const originalComment = comments.find((c) => c.id === commentId)
    const originalText = originalComment?.text || originalComment?.content || originalComment?.body || ''
    setSubmittingEdit(true)
    try {
      const r = await commentsApi.updateComment(commentId, { text })
      const sv = r.data
      if (sv) {
        setComments((prev) => prev.map((c) => {
          if (c.id !== commentId) return c
          return { ...c, ...sv, text: sv.text ?? c.text, isEdited: sv.isEdited ?? true, editedAt: sv.editedAt ?? new Date().toISOString() }
        }))
      }
      setEditingCommentId(null)
      setEditText('')
      addToast({ type: 'success', text: 'Komentar diperbarui' })
    } catch (e) {
      console.error(e)
      // Rollback jika error
      if (originalText) setEditText(originalText)
      const now = Date.now()
      if (now - lastCommentErrorAt > 6000) {
        setLastCommentErrorAt(now)
        addToast({ type: 'error', text: e?.response?.data?.message || 'Gagal mengedit komentar' })
      }
    } finally {
      setSubmittingEdit(false)
    }
  }, [editText, currentUserId, comments, addToast, lastCommentErrorAt])

  // 3) KOMENTAR
  const loadComments = useCallback(async () => {
    setLoadingComments(true)
    try {
      const r = await commentsApi.getComments(post.id)
      const list = Array.isArray(r.data) ? r.data : (r.data?.comments || [])
      setComments(list); setCommentsCount(list.length)
    } catch (e) { console.error(e) }
    finally { setLoadingComments(false) }
  }, [post.id])

  const toggleComments = useCallback(() => {
    const willOpen = !showComments
    setShowComments(willOpen)
    if (willOpen && comments.length === 0) loadComments()
  }, [showComments, comments.length, loadComments])

  const submitComment = useCallback(async () => {
    const text = commentText.trim()
    if (!text) return
    if (!currentUserId) { addToast({ type: 'error', text: 'Silakan login untuk berkomentar' }); return }
    const tmpId = 'tmp_' + Date.now()
    const optimistic = {
      id: tmpId, text,
      createdAt: new Date().toISOString(),
      author: {
        id: currentUserId,
        displayName: currentUser?.displayName || currentUser?.name || 'Saya',
        username: currentUser?.username || 'user',
        avatarUrl: currentUser?.avatarUrl,
      },
    }
    setComments((c) => [...c, optimistic])
    setCommentsCount((c) => c + 1); setCommentText(''); setSubmittingComment(true)
    try {
      const r = await commentsApi.createComment(post.id, { text })
      const sv = r.data?.comment || r.data
      if (sv) setComments((prev) => prev.map((c) => (c.id === tmpId ? sv : c)))
      addToast({ type: 'success', text: 'Komentar dikirim!' })
    } catch (e) {
      console.error(e)
      setComments((prev) => prev.filter((c) => c.id !== tmpId))
      setCommentsCount((c) => Math.max(0, c - 1))
      addToast({ type: 'error', text: 'Gagal mengirim komentar' })
    } finally { setSubmittingComment(false) }
  }, [commentText, currentUserId, currentUser, post.id, addToast])

  // 5) REPOST
  const handleRepost = useCallback(async () => {
    if (reposted) {
      addToast({ type: 'info', text: 'Anda sudah repost postingan ini' })
      return
    }
    if (!currentUserId) { addToast({ type: 'error', text: 'Silakan login untuk repost' }); return }
    setReposted(true)
    setRepostsCount((c) => c + 1)
    try {
      await postsApi.repostPost(post.id, { caption: '' })
      addToast({ type: 'success', text: 'Repost berhasil!' })
    } catch (err) {
      console.error(err)
      setReposted(false)
      setRepostsCount((c) => Math.max(0, c - 1))
      addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal repost' })
    }
  }, [reposted, post.id, currentUserId, addToast])

  // 4) DELETE dari dropdown
  const handleDelete = useCallback(async () => {
    if (!isOwner || deleting) return
    setMenuOpen(false)
    if (!window.confirm('Hapus postingan ini?')) return
    setDeleting(true)
    try {
      await postsApi.deletePost(post.id)
      addToast({ type: 'success', text: 'Postingan dihapus' })
      if (typeof onDelete === 'function') onDelete(post.id)
    } catch (e) {
      console.error(e)
      addToast({ type: 'error', text: 'Gagal menghapus postingan' })
    } finally { setDeleting(false) }
  }, [isOwner, deleting, post.id, onDelete, addToast])

  /* ================== RENDER (INSTAGRAM/X STYLE, bg-[#121212], rounded-2xl) ================== */
  return (
    <article className="w-full max-w-[600px] mx-auto bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-lg">

      {/* ===== HEADER (1 baris rapi: avatar + nama + centang + username + waktu + privacy + dropdown 3 titik) ===== */}
      <header className="flex items-center gap-3 px-4 py-3">
        <Link to={`/profile/${post.username}`} className="flex-shrink-0 no-underline">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 via-emerald-500 to-teal-500 p-[2px]">
            <div className="w-full h-full rounded-full bg-[var(--bg-secondary)] p-[2px] overflow-hidden">
              {post.avatarUrl ? (
                <img src={post.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-cyan-600 flex items-center justify-center text-white font-semibold text-sm">
                  {(post.displayName?.charAt(0) || 'U').toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </Link>

        <div className="flex-1 min-w-0 flex flex-col justify-center leading-tight">
          <div className="flex items-center gap-1.5 min-w-0">
            <Link to={`/profile/${post.username}`} className="no-underline truncate">
              <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--text-primary)] hover:opacity-80 truncate">
                <span className="truncate">{post.displayName}</span>
                {verifiedTier && <VerifiedBadge tier={verifiedTier} title={post.verifiedBadgeTitle || 'Verified'} />}
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 min-w-0 flex-wrap">
            <span className="truncate">@{post.username}</span>
            <span className="text-neutral-700">•</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3 -mt-px" />
              <span title={new Date(createdAt).toLocaleString('id-ID')}>{formatRelativeTime(createdAt)}</span>
            </span>
          </div>
        </div>

        {canFollow && <button type="button" onClick={toggleFollow} disabled={followLoading} className="shrink-0 rounded-lg border border-[var(--border-color)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-60">{following ? 'Mengikuti' : 'Ikuti'}</button>}

        {/* Badge Privasi (lucide icon) */}
        <span className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${privacyInfo.cls}`}>
          <PrivacyIcon className="w-3 h-3" />
          <span>{privacyInfo.label}</span>
        </span>

        {/* ===== DROPDOWN 3 TITIK (hapus postingan) ===== */}
        {isOwner && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              title="Opsi lain"
              className="w-11 h-11 -mr-1 flex items-center justify-center rounded-full text-neutral-300 hover:text-white hover:bg-neutral-800 transition"
            >
              <MoreHorizontal className="w-6 h-6" strokeWidth={2.5} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-neutral-800 bg-neutral-900/95 backdrop-blur-xl shadow-2xl overflow-hidden z-30 animate-[fadeIn_.15s_ease-out]">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full inline-flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="font-semibold">{deleting ? 'Menghapus...' : 'Hapus postingan'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ===== CAPTION RAPI DI ATAS MEDIA ===== */}
      {post.caption && (
        <div className="px-4 pb-3">
          <p className="text-[14px] leading-relaxed text-neutral-100 break-words whitespace-pre-wrap">
            <Link to={`/profile/${post.username}`} className="font-semibold text-[var(--text-primary)] mr-1.5 hover:opacity-80 no-underline">
              {post.displayName}
            </Link>
            {post.caption}
          </p>
        </div>
      )}

      {/* ===== MEDIA (proporsional: object-cover max-h pas tanpa overlay tombol) ===== */}
      {(post.mediaUrls?.length || post.mediaUrl) && (
        <div className="w-full bg-black border-t border-b border-neutral-900/80 overflow-hidden">
          <div className="w-full aspect-[4/5] sm:aspect-square max-h-[620px]">
            <MediaCarousel
              items={getPostMediaItems(post)}
              mediaType={post.mediaType}
              duration={post.duration}
              watermark={post.isReposted ? 'Reposted' : post.isDownloaded ? 'Downloaded' : null}
            />
          </div>
        </div>
      )}

      {/* ===== ACTION BAR (RESPONSIVE MOBILE FRIENDLY, standard touch target W3C 40px) ===== */}
      <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 border-t border-transparent">
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* 1. LIKE / LOVE */}
          <button
            onClick={toggleLove}
            title={loved ? 'Batalkan suka' : 'Suka'}
            aria-pressed={loved}
            disabled={!postIdValidRef.current}
            className={
              'w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-90 select-none touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed ' +
              (loved ? 'text-red-500' : 'text-neutral-100 hover:text-red-400')
            }
          >
            <Heart
              className={'sm:hidden transition-transform duration-200 ' + (loved ? 'scale-105 drop-shadow-[0_0_4px_rgba(239,68,68,0.45)]' : '')}
              fill={loved ? 'currentColor' : 'none'}
              strokeWidth={loved ? 0 : 2}
              width={22} height={22} size={22}
            />
            <Heart
              className={'hidden sm:inline-block transition-transform duration-200 ' + (loved ? 'scale-105 drop-shadow-[0_0_4px_rgba(239,68,68,0.45)]' : '')}
              fill={loved ? 'currentColor' : 'none'}
              strokeWidth={loved ? 0 : 2}
              width={26} height={26} size={26}
            />
          </button>

          {/* 2. KOMENTAR */}
          <button
            onClick={toggleComments}
            title="Komentar"
            aria-pressed={showComments}
            className={
              'w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-90 select-none touch-manipulation ' +
              (showComments ? 'text-sky-400' : 'text-neutral-100 hover:text-sky-400')
            }
          >
            <MessageCircle className="sm:hidden" width={22} height={22} size={22} strokeWidth={2} />
            <MessageCircle className="hidden sm:inline-block" width={26} height={26} size={26} strokeWidth={2} />
          </button>

          {/* 3. SHARE */}
          <button
            onClick={handleShare}
            title="Bagikan / Salin tautan"
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl text-neutral-100 hover:text-emerald-400 active:scale-90 transition-all duration-200 select-none touch-manipulation"
          >
            <Share2 className="sm:hidden" width={22} height={22} size={22} strokeWidth={2} />
            <Share2 className="hidden sm:inline-block" width={26} height={26} size={26} strokeWidth={2} />
          </button>

          {/* 4. REPOST */}
          <button
            onClick={handleRepost}
            title={reposted ? 'Sudah repost' : 'Repost'}
            className={'w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl active:scale-90 transition-all duration-200 select-none touch-manipulation ' + (reposted ? 'text-emerald-400' : 'text-neutral-100 hover:text-emerald-400')}
          >
            <Repeat2 className={'sm:hidden ' + (reposted ? 'scale-105' : '')} width={20} height={20} size={20} strokeWidth={2} />
            <Repeat2 className={'hidden sm:inline-block ' + (reposted ? 'scale-105' : '')} width={24} height={24} size={24} strokeWidth={2} />
          </button>
        </div>

        <button
          type="button"
          onClick={async () => { try { const res = await bookmarksApi.toggle(post.id); setSaved(res.data.bookmarked); addToast({ type: 'success', text: res.data.bookmarked ? 'Disimpan ke bookmark' : 'Dihapus dari bookmark' }); } catch { setSaved((v) => !v); } }}
          title={saved ? 'Hapus dari tersimpan' : 'Simpan postingan'}
          aria-pressed={saved}
          className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-90 select-none touch-manipulation ${saved ? 'text-amber-400' : 'text-neutral-100 hover:text-amber-300'}`}
        >
          <Bookmark className="sm:hidden" width={22} height={22} size={22} fill={saved ? 'currentColor' : 'none'} strokeWidth={2} />
          <Bookmark className="hidden sm:inline-block" width={26} height={26} size={26} fill={saved ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
      </div>

      <div className="px-3 sm:px-4 pb-2 text-[12px] text-neutral-400 font-medium select-none flex items-center gap-3">
        <span><span className="text-white font-semibold">{fmt(likes)}</span> suka</span>
        {repostsCount > 0 && <span><span className="text-white font-semibold">{fmt(repostsCount)}</span> repost</span>}
      </div>

      {/* ===== KOMENTAR COUNTER RINGKAS (tanpa expand) ===== */}
      {!showComments && commentsCount > 0 && (
        <button
          onClick={toggleComments}
          className="w-full px-4 pb-2 text-left text-[12px] text-neutral-500 hover:text-neutral-300 transition font-medium"
        >
          Lihat semua {fmt(commentsCount)} komentar
        </button>
      )}

      {/* ===== SECTION KOMENTAR EXPANDABLE (Fitur Lengkap: Balas, Edit, Hapus, Badge Diedit) ===== */}
      {showComments && (
        <section className="border-t border-neutral-800/70 mt-1">
          <div className="max-h-[360px] sm:max-h-[420px] overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
            {loadingComments && comments.length === 0 && (
              <p className="text-xs text-neutral-500 italic">Memuat komentar...</p>
            )}
            {!loadingComments && comments.length === 0 && (
              <p className="text-xs text-neutral-500 italic">Belum ada komentar. Jadilah yang pertama! 💬</p>
            )}
            {comments
              .filter((c) => !c.parentId) // Hanya top-level di loop utama, reply di-render nested dibawahnya
              .map((c) => {
                const a = c.author || {}
                const av = a.avatarUrl || c.avatarUrl
                const nm = a.displayName || c.displayName || c.name || 'Pengguna'
                const un = a.username || c.username || ''
                const commentIsOwner = String(c.userId || a.id || '') === String(currentUserId || '')
                const isEditing = editingCommentId === c.id
                const isReplying = replyingToId === c.id
                // Reply (balasan) comment milik comment ini
                const replies = comments.filter((reply) => String(reply.parentId) === String(c.id))

                return (
                  <div key={c.id} className="space-y-2">
                    {/* ===== KOMENTAR UTAMA ===== */}
                    <div className={`flex items-start gap-2.5 sm:gap-3 ${c.parentId ? 'pl-6 border-l-2 border-neutral-800 ml-2' : ''}`}>
                      <div className="w-8 h-8 shrink-0 rounded-full bg-neutral-800 overflow-hidden flex items-center justify-center border border-neutral-700/60">
                        {av ? (
                          <img src={av} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span className="text-[11px] font-semibold text-neutral-300">{nm.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* === EDIT MODE: Tampilkan textarea ketika sedang edit === */}
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 bg-neutral-900 rounded-xl px-3 py-2 border border-sky-500/40 focus-within:ring-2 focus-within:ring-sky-500/20">
                              <textarea
                                autoFocus
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitEdit(c.id) }
                                  if (e.key === 'Escape') { handleCancelEdit() }
                                }}
                                rows={2}
                                disabled={submittingEdit}
                                className="flex-1 bg-transparent outline-none text-[13px] text-white placeholder:text-neutral-600 resize-none py-1 disabled:opacity-60"
                                placeholder="Edit komentar..."
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={submittingEdit || !editText.trim()}
                                onClick={() => handleSubmitEdit(c.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                              >
                                <Send className="w-3.5 h-3.5" />
                                {submittingEdit ? 'Menyimpan...' : 'Simpan'}
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                              >
                                <X className="w-3.5 h-3.5" />
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* === NORMAL MODE: Tampilkan teks komentar === */}
                            <div className="text-[13px] leading-snug text-neutral-100">
                              <Link to={`/profile/${un || ''}`} className="font-semibold text-white mr-1.5 hover:opacity-80 no-underline">{nm}</Link>
                              <span className="whitespace-pre-wrap break-words">{c.text || c.content || c.body}</span>
                              {c.isEdited && <span className="ml-1.5 text-[10px] text-neutral-600 italic" title={`Diedit pada ${formatCommentDate(c.editedAt)}`}>• diedit</span>}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-neutral-500">
                              {un && <span className="max-w-[180px] truncate">@{un}</span>}
                              <time dateTime={c.createdAt || c.timestamp} title={formatCommentDate(c.createdAt || c.timestamp || Date.now())}>
                                {formatCommentDate(c.createdAt || c.timestamp || Date.now())}
                              </time>
                              <button
                                type="button"
                                onClick={() => handleStartReply(c.id, un)}
                                className="font-semibold text-neutral-400 hover:text-sky-400 transition inline-flex items-center gap-1"
                                title="Balas komentar"
                              >
                                <CornerDownLeft className="w-3 h-3" />
                                Balas
                              </button>
                              {/* === TOMBOL EDIT & HAPUS untuk PEMILIK KOMENTAR === */}
                              {commentIsOwner && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(c)}
                                    className="inline-flex items-center gap-1 font-semibold text-sky-400/80 hover:text-sky-300 transition"
                                    title="Edit komentar"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComment(c.id)}
                                    className="inline-flex items-center gap-1 font-semibold text-red-400/80 hover:text-red-300 transition"
                                    title="Hapus komentar"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Hapus
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}

                        {/* === INPUT BALAS KOMENTAR (muncul ketika isReplying true) === */}
                        {isReplying && !isEditing && (
                          <div className="mt-3 space-y-2 pl-1 border-l-2 border-neutral-800">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 flex items-center gap-2 bg-neutral-900 rounded-full px-3 py-1.5 border border-sky-500/40 focus-within:ring-2 focus-within:ring-sky-500/20 transition">
                                <input
                                  id={`reply-input-${String(post?.id)}-${String(c.id)}`}
                                  type="text"
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitReply(c.id) }
                                    if (e.key === 'Escape') handleCancelReply()
                                  }}
                                  placeholder="Tulis balasan..."
                                  disabled={submittingReply}
                                  className="flex-1 bg-transparent outline-none text-[12px] text-white placeholder:text-neutral-600 py-0.5 disabled:opacity-60"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSubmitReply(c.id)}
                                disabled={submittingReply || !replyText.trim()}
                                title="Kirim balasan"
                                className={
                                  'w-9 h-9 shrink-0 flex items-center justify-center rounded-full transition-all active:scale-95 ' +
                                  (replyText.trim() && !submittingReply
                                    ? 'bg-sky-500 hover:bg-sky-600 text-white'
                                    : 'bg-neutral-800 text-neutral-600 cursor-not-allowed')
                                }
                              >
                                <Send size={15} strokeWidth={2.3} className={submittingReply ? 'animate-pulse' : ''} />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelReply}
                                className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition"
                                title="Batal membalas"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ===== NESTED REPLIES (balasan komentar ini) ===== */}
                    {replies.length > 0 && replies.map((rc) => {
                      const ra = rc.author || {}
                      const rav = ra.avatarUrl || rc.avatarUrl
                      const rnm = ra.displayName || rc.displayName || rc.name || 'Pengguna'
                      const run = ra.username || rc.username || ''
                      const replyIsOwner = String(rc.userId || ra.id || '') === String(currentUserId || '')
                      const replyIsEditing = editingCommentId === rc.id
                      return (
                        <div key={rc.id} className="flex items-start gap-2.5 sm:gap-3 pl-8 sm:pl-12">
                          <div className="w-7 h-7 shrink-0 rounded-full bg-neutral-800 overflow-hidden flex items-center justify-center border border-neutral-700/60">
                            {rav ? (
                              <img src={rav} alt="" className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <span className="text-[10px] font-semibold text-neutral-300">{rnm.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            {replyIsEditing ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 bg-neutral-900 rounded-xl px-3 py-2 border border-sky-500/40">
                                  <textarea
                                    autoFocus
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitEdit(rc.id) }
                                      if (e.key === 'Escape') { handleCancelEdit() }
                                    }}
                                    rows={2}
                                    disabled={submittingEdit}
                                    className="flex-1 bg-transparent outline-none text-[12px] text-white resize-none py-1 disabled:opacity-60"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button type="button" disabled={submittingEdit || !editText.trim()} onClick={() => handleSubmitEdit(rc.id)} className="rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-sky-500 text-white disabled:opacity-50">{submittingEdit ? '...' : 'Simpan'}</button>
                                  <button type="button" onClick={handleCancelEdit} className="rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-neutral-800 text-neutral-300">Batal</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="text-[12px] leading-snug text-neutral-100">
                                  <Link to={`/profile/${run || ''}`} className="font-semibold text-white mr-1.5 hover:opacity-80 no-underline text-[12px]">{rnm}</Link>
                                  <span className="whitespace-pre-wrap break-words">{rc.text || rc.content || rc.body}</span>
                                  {rc.isEdited && <span className="ml-1.5 text-[9px] text-neutral-600 italic">• diedit</span>}
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-neutral-500">
                                  {run && <span className="max-w-[160px] truncate">@{run}</span>}
                                  <time dateTime={rc.createdAt} title={formatCommentDate(rc.createdAt)}>{formatCommentDate(rc.createdAt)}</time>
                                  <button type="button" onClick={() => handleStartReply(rc.id, run)} className="font-semibold hover:text-sky-400 inline-flex items-center gap-1"><CornerDownLeft className="w-2.5 h-2.5" /> Balas</button>
                                  {replyIsOwner && (
                                    <>
                                      <button type="button" onClick={() => handleStartEdit(rc)} className="font-semibold text-sky-400/80 hover:text-sky-300 inline-flex items-center gap-1"><Pencil className="w-2.5 h-2.5" /> Edit</button>
                                      <button type="button" onClick={() => handleDeleteComment(rc.id)} className="font-semibold text-red-400/80 hover:text-red-300 inline-flex items-center gap-1"><Trash2 className="w-2.5 h-2.5" /> Hapus</button>
                                    </>
                                  )}
                                </div>
                                {/* Reply ke reply juga bisa */}
                                {replyingToId === rc.id && !replyIsEditing && (
                                  <div className="mt-2 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 flex items-center gap-2 bg-neutral-900 rounded-full px-3 py-1.5 border border-sky-500/40">
                                        <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)}
                                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitReply(rc.id) } if (e.key === 'Escape') handleCancelReply() }}
                                          placeholder="Balas..." disabled={submittingReply}
                                          className="flex-1 bg-transparent outline-none text-[12px] text-white disabled:opacity-60 py-0.5" />
                                      </div>
                                      <button type="button" onClick={() => handleSubmitReply(rc.id)} disabled={submittingReply || !replyText.trim()}
                                        className={'w-8 h-8 flex items-center justify-center rounded-full ' + (replyText.trim() && !submittingReply ? 'bg-sky-500 text-white' : 'bg-neutral-800 text-neutral-600')}>
                                        <Send size={13} />
                                      </button>
                                      <button type="button" onClick={handleCancelReply} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400"><X size={13} /></button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
          </div>

          {/* Input komentar dengan Lucide Send */}
          <div className="flex items-center gap-2 border-t border-neutral-800/70 px-3 py-2.5 bg-neutral-950/40">
            <div className="flex-1 flex items-center gap-2 bg-neutral-900 rounded-full px-3 py-1.5 sm:py-2 border border-neutral-800 focus-within:border-sky-500/70 focus-within:ring-2 focus-within:ring-sky-500/20 transition">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
                placeholder="Tambahkan komentar..."
                disabled={submittingComment}
                className="flex-1 bg-transparent outline-none text-[12px] sm:text-[13px] text-white placeholder:text-neutral-600 py-1 disabled:opacity-60"
              />
            </div>
            <button
              onClick={submitComment}
              disabled={submittingComment || !commentText.trim()}
              className={
                'w-10 h-10 shrink-0 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 ' +
                (commentText.trim() && !submittingComment
                  ? 'bg-sky-500 hover:bg-sky-600 text-white'
                  : 'bg-neutral-800 text-neutral-600 cursor-not-allowed')
              }
              title="Kirim komentar"
            >
              <Send size={17} strokeWidth={2.3} className={submittingComment ? 'animate-pulse' : ''} />
            </button>
          </div>
        </section>
      )}

      {/* Bottom tiny spacer */}
      <div className="h-1" />

      {/* keyframes global (inject sekali) */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px) scale(.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </article>
  )
}

export default PostCard
