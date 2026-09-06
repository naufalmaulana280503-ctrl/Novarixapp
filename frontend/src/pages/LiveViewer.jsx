import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  ArrowLeft, Users, Eye, Heart, MessageCircle,
  Share2, Gift, MoreHorizontal, Send,
  Radio, X, Star, Music, Flag, Bell, RotateCcw, SendHorizonal,
  Crown, Zap, Shield
} from 'lucide-react'

const MOCK_LIVE = {
  id: 'live_001',
  title: 'Main Bareng Genshin Impact! 🎮',
  host: { id: 1, username: 'gamergirl', display_name: 'Gamer Girl', avatar_url: '', verified: true, followers: 245000 },
  viewers: 12430,
  category: 'Gaming',
  tags: ['#genshin', '#gaming', '#coop'],
  startedAt: Date.now() - 3600000,
}

const INITIAL_CHAT = [
  { id: 1, user: 'alice_', display: 'Alice', text: 'Wah seru banget! 🔥', color: '#f472b6', isGift: false, gift: null, time: Date.now() - 30000 },
  { id: 2, user: 'bob_gamer', display: 'Bob Gamer', text: 'Karakter baru keren bgtt', color: '#60a5fa', isGift: false, gift: null, time: Date.now() - 25000 },
  { id: 3, user: 'linaa', display: 'Lina', text: '', color: '#34d399', isGift: true, gift: 'Love x5', time: Date.now() - 20000 },
  { id: 4, user: 'rio_music', display: 'Rio', text: 'Streamer nya baik banget 😍', color: '#fbbf24', isGift: false, gift: null, time: Date.now() - 15000 },
  { id: 5, user: 'admin_tech', display: 'Tech Admin', text: 'Ada giveaway ga kak?', color: '#a78bfa', isGift: false, gift: null, time: Date.now() - 10000 },
  { id: 6, user: 'foodie_jkt', display: 'Foodie', text: '', color: '#f87171', isGift: true, gift: 'Rocket x1', time: Date.now() - 5000 },
  { id: 7, user: 'gamer_pro', display: 'GamerPro', text: 'Mainin Genshin dong kak! 🔥', color: '#22d3ee', isGift: false, gift: null, time: Date.now() - 3000 },
  { id: 8, user: 'sarah_beauty', display: 'Sarah', text: 'Keren bgt skill nya!', color: '#fb923c', isGift: false, gift: null, time: Date.now() - 1000 },
]

const formatViewers = (num) => {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const formatDuration = (ms) => {
  const totalSec = Math.floor((Date.now() - ms) / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

const GIFT_LIST = [
  { name: 'Love', price: 5, emoji: '💖', color: 'from-pink-500 to-rose-500' },
  { name: 'Star', price: 20, emoji: '⭐', color: 'from-amber-400 to-orange-500' },
  { name: 'Fire', price: 50, emoji: '🔥', color: 'from-orange-500 to-red-500' },
  { name: 'Rocket', price: 100, emoji: '🚀', color: 'from-blue-500 to-indigo-500' },
  { name: 'Diamond', price: 200, emoji: '💎', color: 'from-cyan-400 to-blue-500' },
  { name: 'Crown', price: 500, emoji: '👑', color: 'from-yellow-500 to-amber-500' },
  { name: 'Flower', price: 30, emoji: '🌸', color: 'from-pink-400 to-fuchsia-500' },
  { name: 'Trophy', price: 1000, emoji: '🏆', color: 'from-yellow-400 to-yellow-600' },
]

export default function LiveViewer() {
  const { streamId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(8420)
  const [viewerCount, setViewerCount] = useState(MOCK_LIVE.viewers)
  const [isFollowing, setIsFollowing] = useState(false)
  const [chatMessages, setChatMessages] = useState(INITIAL_CHAT)
  const [chatInput, setChatInput] = useState('')
  const [showGiftPanel, setShowGiftPanel] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showChatInput, setShowChatInput] = useState(true)
  const [duration, setDuration] = useState(0)
  const [hearts, setHearts] = useState([])
  const [userCoins, setUserCoins] = useState(1250)
  const chatEndRef = useRef(null)
  const likeLockRef = useRef(false)

  const live = MOCK_LIVE

  useEffect(() => {
    const timer = setInterval(() => {
      setDuration(Math.floor((Date.now() - live.startedAt) / 1000))
      setViewerCount(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1
        const next = prev + delta
        return next < 1000 ? 1000 : next
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [live.startedAt])

  // Simulate incoming chat
  useEffect(() => {
    const sim = setInterval(() => {
      const users = ['alice_', 'bob_gamer', 'linaa', 'rio_music', 'admin_tech', 'foodie_jkt', 'gamer_pro', 'sarah_beauty']
      const texts = ['Kerenn!', 'Love it 💕', 'Woi dari mana kak', 'streamer ramah bgt', 'gaskeun 🔥', 'Hai kak 👋', 'Ada giveaway?', 'Bagus banget! 😍', 'Mantap jiwa!', 'GAS BARBAR 🔥🔥']
      const colors = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f87171', '#22d3ee', '#fb923c']
      const idx = Math.floor(Math.random() * users.length)
      const isGift = Math.random() > 0.85
      const giftNames = ['Love x3', 'Star x1', 'Fire x2']
      const newMsg = {
        id: Date.now(),
        user: users[idx],
        display: users[idx],
        text: isGift ? '' : texts[Math.floor(Math.random() * texts.length)],
        color: colors[idx],
        isGift,
        gift: isGift ? giftNames[Math.floor(Math.random() * giftNames.length)] : null,
        time: Date.now(),
      }
      setChatMessages(prev => [...prev.slice(-40), newMsg])
    }, 2500)
    return () => clearInterval(sim)
  }, [])

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chatMessages])

  const handleLike = () => {
    if (likeLockRef.current) return
    likeLockRef.current = true
    setTimeout(() => { likeLockRef.current = false }, 250)
    setIsLiked(true)
    setLikeCount(prev => prev + 1)
    const newHeart = { id: Date.now(), x: 60 + Math.random() * 30 }
    setHearts(prev => [...prev, newHeart])
    setTimeout(() => setHearts(prev => prev.filter(h => h.id !== newHeart.id)), 2500)
  }

  const handleSendChat = () => {
    if (!chatInput.trim()) return
    const msg = {
      id: Date.now(),
      user: currentUser?.username || 'you',
      display: currentUser?.display_name || 'You',
      avatar: currentUser?.avatar_url,
      text: chatInput.trim(),
      color: '#06b6d4',
      isGift: false,
      gift: null,
      time: Date.now(),
      isMine: true,
    }
    setChatMessages(prev => [...prev.slice(-40), msg])
    setChatInput('')
  }

  const handleSendGift = (gift) => {
    if (userCoins < gift.price) {
      setShowGiftPanel(true)
      return
    }
    setUserCoins(prev => prev - gift.price)
    const giftMsg = {
      id: Date.now(),
      user: currentUser?.username || 'you',
      display: currentUser?.display_name || 'You',
      text: '',
      color: '#f59e0b',
      isGift: true,
      gift: `${gift.emoji} ${gift.name}`,
      time: Date.now(),
      isMine: true,
    }
    setChatMessages(prev => [...prev.slice(-40), giftMsg])
    setShowGiftPanel(false)
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-black text-white overflow-hidden z-50 flex flex-col">
      {/* ===== Full-Screen Video Background ===== */}
      <div className="absolute inset-0 bg-neutral-900">
        {/* Gradient background as placeholder */}
        <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
          <div className="text-center space-y-3 opacity-40">
            <Radio className="w-16 h-16 text-red-500 animate-pulse mx-auto" />
            <p className="text-sm font-bold text-white/60">Live Stream</p>
          </div>
        </div>
        {/* Dark gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
      </div>

      {/* ===== Floating Hearts Animation ===== */}
      <div className="absolute right-16 bottom-36 sm:right-20 sm:bottom-40 w-10 pointer-events-none z-30">
        {hearts.map((heart) => (
          <div
            key={heart.id}
            className="absolute bottom-0 text-red-500 animate-[floatUp_2.5s_ease-out_forwards]"
            style={{ left: `${heart.x - 60}%` }}
          >
            <Heart className="w-8 h-8" fill="currentColor" />
          </div>
        ))}
      </div>

      {/* ===== Top Bar (Overlay) ===== */}
      <div className="relative z-20 p-3 flex items-start justify-between gap-2 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/60 transition shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Host Info Card */}
        <div className="flex-1 min-w-0 max-w-[calc(100%-140px)]">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white text-sm font-black shrink-0">
              {live.host.display_name?.charAt(0) || 'L'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold truncate">@{live.host.username}</span>
                {live.host.verified && (
                  <div className="w-3.5 h-3.5 rounded-full bg-cyan-500 flex items-center justify-center shrink-0">
                    <Star className="w-2 h-2 text-white" fill="currentColor" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-300">
                <span>{live.category}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-neutral-500" />
                <span>{formatDuration(live.startedAt)}</span>
              </div>
            </div>
            <button
              onClick={() => setIsFollowing(prev => !prev)}
              className={`shrink-0 h-8 px-3 rounded-xl font-black text-[10px] transition ${
                isFollowing
                  ? 'bg-white/10 border border-white/15 text-white'
                  : 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/30'
              }`}
            >
              {isFollowing ? 'Mengikuti' : 'Follow'}
            </button>
          </div>
        </div>

        {/* LIVE + Viewer Badge */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500 shadow-lg shadow-red-500/30">
            <Radio className="w-2.5 h-2.5 text-white animate-pulse" />
            <span className="text-[10px] font-black text-white">LIVE</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            <Eye className="w-2.5 h-2.5 text-neutral-300" />
            <span className="text-[10px] font-bold">{formatViewers(viewerCount)}</span>
          </div>
        </div>
      </div>

      {/* ===== Live Title (top area below host card) ===== */}
      <div className="relative z-20 px-3 shrink-0">
        <h2 className="text-sm font-black line-clamp-1 drop-shadow-lg">{live.title}</h2>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {live.tags.map(tag => (
            <span key={tag} className="px-1.5 py-0.5 rounded-full bg-black/30 backdrop-blur-sm text-[9px] font-semibold text-white/80 border border-white/10">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ===== Right Side Action Buttons (TikTok-style vertical strip) ===== */}
      <div className="absolute right-2 sm:right-3 bottom-28 sm:bottom-36 z-20 flex flex-col items-center gap-3">
        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center gap-0.5 active:scale-90 transition">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center">
            <Heart className={`w-5 h-5 ${isLiked ? 'text-red-500' : 'text-white'}`} fill={isLiked ? 'currentColor' : 'none'} />
          </div>
          <span className="text-[9px] font-bold drop-shadow">{formatViewers(likeCount)}</span>
        </button>

        {/* Comments */}
        <button className="flex flex-col items-center gap-0.5">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-[9px] font-bold drop-shadow">{formatViewers(chatMessages.length * 23)}</span>
        </button>

        {/* Gift */}
        <button onClick={() => setShowGiftPanel(true)} className="flex flex-col items-center gap-0.5 active:scale-90 transition">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <span className="text-[9px] font-bold text-amber-300 drop-shadow">Gift</span>
        </button>

        {/* Share */}
        <button className="flex flex-col items-center gap-0.5 active:scale-90 transition">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-[9px] font-bold drop-shadow">Share</span>
        </button>

        {/* More */}
        <button onClick={() => setShowMoreMenu(p => !p)} className="flex flex-col items-center gap-0.5 active:scale-90 transition">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center">
            <MoreHorizontal className="w-5 h-5 text-white" />
          </div>
        </button>

        {/* Host Avatar */}
        <div className="mt-1 relative">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white text-sm font-black border-2 border-white shadow-lg">
            {live.host.display_name?.charAt(0) || 'L'}
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
            <Music className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
      </div>

      {/* ===== Bottom: Chat + Input (Overlay) ===== */}
      <div className="relative z-20 mt-auto pb-16 sm:pb-4 px-3 shrink-0">
        {/* Chat Messages */}
        <div className="mb-2 h-36 sm:h-48 overflow-hidden">
          <div className="h-full overflow-y-auto no-scrollbar space-y-1 pr-1 mask-fade-b">
            {chatMessages.map(msg => (
              <ChatBubble key={msg.id} msg={msg} />
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Chat Input Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/15">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="Kirim pesan..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/40"
            />
          </div>
          <button
            onClick={handleSendChat}
            disabled={!chatInput.trim()}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition ${
              chatInput.trim()
                ? 'bg-cyan-500 shadow-lg shadow-cyan-500/30'
                : 'bg-white/10 border border-white/10 text-white/30'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ===== Gift Panel (Bottom Sheet) ===== */}
      {showGiftPanel && (
        <div className="absolute inset-0 z-40 flex items-end bg-black/60" onClick={() => setShowGiftPanel(false)}>
          <div
            className="w-full bg-[#0f0f14] rounded-t-3xl border-t border-white/10 p-4 sm:p-5 animate-[slideUp_0.3s_ease-out] max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                Kirim Gift
              </h3>
              <button onClick={() => setShowGiftPanel(false)} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Coin Balance */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg">🪙</div>
                <div>
                  <p className="text-[10px] font-bold text-amber-400">Saldo Kamu</p>
                  <p className="text-lg font-black">{userCoins.toLocaleString()} <span className="text-xs text-amber-400">Coin</span></p>
                </div>
              </div>
              <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 font-black text-xs shadow-lg shadow-orange-500/30 active:scale-95 transition">
                Top Up
              </button>
            </div>

            {/* Gift Grid */}
            <div className="grid grid-cols-4 gap-2.5">
              {GIFT_LIST.map(gift => (
                <button
                  key={gift.name}
                  onClick={() => handleSendGift(gift)}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition active:scale-95"
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gift.color} flex items-center justify-center text-xl shadow-lg`}>
                    {gift.emoji}
                  </div>
                  <span className="text-[10px] font-bold">{gift.name}</span>
                  <span className="text-[9px] font-semibold text-amber-300">{gift.price} Coin</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== More Menu (Popup) ===== */}
      {showMoreMenu && (
        <div className="absolute inset-0 z-40" onClick={() => setShowMoreMenu(false)}>
          <div className="absolute right-3 bottom-24 w-52 rounded-2xl bg-[#0f0f14] border border-white/10 p-2 shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            {[
              { Icon: Bell, label: 'Nyalakan Notifikasi' },
              { Icon: RotateCcw, label: 'Bagikan Live' },
              { Icon: SendHorizonal, label: 'Kirim ke Teman' },
              { Icon: Shield, label: 'Nonaktifkan Chat' },
              { Icon: Flag, label: 'Laporkan', danger: true },
            ].map(({ Icon, label, danger }) => (
              <button
                key={label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition hover:bg-white/5 ${
                  danger ? 'text-red-400' : 'text-white'
                }`}
                onClick={() => setShowMoreMenu(false)}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ===== Chat Bubble Component ===== */
function ChatBubble({ msg }) {
  if (msg.isGift) {
    return (
      <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3 py-1.5 rounded-2xl border border-amber-500/20 inline-flex max-w-[90%]">
        <span className="text-sm">{msg.gift?.split(' ')[0] || '🎁'}</span>
        <span className="text-[10px] font-bold text-amber-300">@{msg.user}</span>
        <span className="text-[10px] font-black text-amber-200">mengirim {msg.gift}</span>
      </div>
    )
  }
  return (
    <div className={`flex items-start gap-1.5 max-w-[85%] ${msg.isMine ? 'ml-auto' : ''}`}>
      {!msg.isMine && (
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-[7px] font-black text-white shrink-0 mt-0.5">
          {msg.display?.charAt(0)?.toUpperCase() || '?'}
        </div>
      )}
      <div className={`px-2.5 py-1.5 rounded-2xl backdrop-blur-sm ${
        msg.isMine
          ? 'bg-cyan-500/30 border border-cyan-500/20'
          : 'bg-black/30 border border-white/10'
      }`}>
        {!msg.isMine && (
          <span className="text-[10px] font-bold mr-1" style={{ color: msg.color || '#fff' }}>
            @{msg.user}
          </span>
        )}
        <span className="text-[11px] text-white/95">{msg.text}</span>
      </div>
    </div>
  )
}
