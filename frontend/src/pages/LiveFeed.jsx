import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Radio, RadioTower, Users, Eye, Heart,
  MessageCircle, Share2, Search, Plus, TrendingUp,
  Music, Star, ChevronRight, X
} from 'lucide-react'

const MOCK_LIVES = [
  {
    id: 'live_001',
    title: 'Main Bareng Genshin Impact! 🎮',
    host: { id: 1, username: 'gamergirl', display_name: 'Gamer Girl', avatar_url: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=cute%20anime%20girl%20gamer%20avatar%20pink%20hair&image_size=square', verified: true },
    viewers: 12430,
    category: 'Gaming',
    thumbnail: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=epic%20gaming%20live%20stream%20thumbnail%20purple%20neon%20vibes&image_size=portrait_9_16',
    tags: ['#genshin', '#gaming', '#coop'],
    startedAt: Date.now() - 3600000,
  },
  {
    id: 'live_002',
    title: 'Kuliner Malam Jakarta 🍜',
    host: { id: 2, username: 'foodie_jkt', display_name: 'Foodie Jakarta', avatar_url: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=handsome%20indonesian%20man%20chef%20avatar&image_size=square', verified: false },
    viewers: 5820,
    category: 'Food',
    thumbnail: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=delicious%20indonesian%20street%20food%20night%20market%20warm%20lights&image_size=portrait_9_16',
    tags: ['#kuliner', '#jakarta', '#makanmalam'],
    startedAt: Date.now() - 7200000,
  },
  {
    id: 'live_003',
    title: 'Belajar Bahasa Inggris Bareng! 📚',
    host: { id: 3, username: 'teacher_anna', display_name: 'Teacher Anna', avatar_url: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=friendly%20female%20teacher%20avatar%20professional&image_size=square', verified: true },
    viewers: 3210,
    category: 'Education',
    thumbnail: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=online%20english%20class%20education%20warm%20colorful&image_size=portrait_9_16',
    tags: ['#english', '#study', '#education'],
    startedAt: Date.now() - 1800000,
  },
  {
    id: 'live_004',
    title: 'Live Music Akustik Malam Ini 🎸',
    host: { id: 4, username: 'musician_rio', display_name: 'Rio Music', avatar_url: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=cool%20male%20musician%20guitarist%20avatar%20long%20hair&image_size=square', verified: true },
    viewers: 8950,
    category: 'Music',
    thumbnail: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=acoustic%20guitar%20live%20performance%20stage%20warm%20lights&image_size=portrait_9_16',
    tags: ['#music', '#akustik', '#cover'],
    startedAt: Date.now() - 5400000,
  },
  {
    id: 'live_005',
    title: 'Review Makeup Korea Terbaru 💄',
    host: { id: 5, username: 'beauty_lina', display_name: 'Lina Beauty', avatar_url: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=beautiful%20korean%20beauty%20influencer%20avatar&image_size=square', verified: true },
    viewers: 15670,
    category: 'Beauty',
    thumbnail: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=korean%20makeup%20beauty%20cosmetics%20pink%20aesthetic&image_size=portrait_9_16',
    tags: ['#makeup', '#kbeauty', '#review'],
    startedAt: Date.now() - 900000,
  },
  {
    id: 'live_006',
    title: 'Workout Bersama - Full Body 💪',
    host: { id: 6, username: 'fitness_deo', display_name: 'Deo Fitness', avatar_url: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=fit%20male%20fitness%20trainer%20avatar%20muscular&image_size=square', verified: false },
    viewers: 2140,
    category: 'Fitness',
    thumbnail: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=gym%20workout%20fitness%20training%20energetic%20atmosphere&image_size=portrait_9_16',
    tags: ['#fitness', '#workout', '#healthy'],
    startedAt: Date.now() - 2700000,
  },
  {
    id: 'live_007',
    title: 'Q&A Seputar Karier Tech 💻',
    host: { id: 7, username: 'dev_sara', display_name: 'Sara Dev', avatar_url: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20female%20software%20developer%20avatar&image_size=square', verified: true },
    viewers: 4380,
    category: 'Tech',
    thumbnail: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=coding%20programming%20tech%20setup%20rgb%20keyboard%20dark&image_size=portrait_9_16',
    tags: ['#tech', '#career', '#programming'],
    startedAt: Date.now() - 4500000,
  },
  {
    id: 'live_008',
    title: 'Jahit Baju Custom Live! 🧵',
    host: { id: 8, username: 'fashion_design', display_name: 'Designer Mira', avatar_url: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=creative%20fashion%20designer%20woman%20avatar%20artistic&image_size=square', verified: false },
    viewers: 1520,
    category: 'Art',
    thumbnail: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=fashion%20designer%20sewing%20studio%20colorful%20fabrics&image_size=portrait_9_16',
    tags: ['#fashion', '#diy', '#craft'],
    startedAt: Date.now() - 6300000,
  },
]

const CATEGORIES = ['Semua', 'Gaming', 'Music', 'Food', 'Beauty', 'Education', 'Fitness', 'Tech', 'Art']

const formatViewers = (num) => {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const formatDuration = (ms) => {
  const totalSec = Math.floor((Date.now() - ms) / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h > 0) return `${h}j ${m}m`
  return `${m}m`
}

export default function LiveFeed() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('foryou')
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef(null)

  const featuredLive = MOCK_LIVES[0]
  const filteredLives = MOCK_LIVES.filter((live) => {
    const matchCategory = activeCategory === 'Semua' || live.category === activeCategory
    const matchSearch = !searchQuery
      || live.title.toLowerCase().includes(searchQuery.toLowerCase())
      || live.host.username.toLowerCase().includes(searchQuery.toLowerCase())
      || live.host.display_name.toLowerCase().includes(searchQuery.toLowerCase())
      || live.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchCategory && matchSearch
  }).slice(1)

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  return (
    <div className="min-h-screen w-full bg-[#05060a] text-white pb-24">
      {/* ===== Header ===== */}
      <div className="sticky top-0 z-30 bg-gradient-to-b from-[#05060a] via-[#05060a]/95 to-transparent backdrop-blur-sm border-b border-white/5">
        <div className="px-4 sm:px-6 py-3 max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-red-500 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                <RadioTower className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight leading-tight">Live Streaming</h1>
                <p className="text-[11px] text-neutral-400 font-semibold">Temukan creator favoritmu</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {searchOpen ? (
                <div className="flex items-center gap-2 bg-neutral-900 rounded-xl px-3 py-2 border border-neutral-800">
                  <Search className="w-4 h-4 text-neutral-500" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari live stream..."
                    className="bg-transparent outline-none text-sm w-40 sm:w-56 placeholder:text-neutral-500"
                  />
                  <button
                    onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-800 text-neutral-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                  <Link
                    to="/live/studio"
                    className="h-10 px-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 text-white font-bold text-sm shadow-lg shadow-red-500/25 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Go Live</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* ===== Tabs ===== */}
          <div className="flex items-center gap-1 mt-3 overflow-x-auto no-scrollbar -mx-1 px-1">
            {[
              { id: 'foryou', label: 'Untuk Kamu', Icon: Star },
              { id: 'following', label: 'Mengikuti', Icon: Users },
              { id: 'trending', label: 'Trending', Icon: TrendingUp },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === id
                    ? 'bg-white/10 text-white border border-white/10'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== Category Pills ===== */}
        <div className="px-4 sm:px-6 pb-3 max-w-[1200px] mx-auto">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white shadow shadow-red-500/20'
                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-neutral-700 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 max-w-[1200px] mx-auto mt-4">
        {/* ===== Featured Live (Hero Card) ===== */}
        {!searchQuery && (
          <div
            onClick={() => navigate(`/live/watch/${featuredLive.id}`)}
            className="relative w-full rounded-3xl overflow-hidden aspect-[16/9] sm:aspect-[21/9] cursor-pointer group border border-white/5 mb-6 shadow-2xl"
          >
            <img
              src={featuredLive.thumbnail}
              alt={featuredLive.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

            {/* Top Left: LIVE Badge */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-[11px] font-black shadow-lg shadow-red-500/30">
                <Radio className="w-3 h-3 animate-pulse" />
                LIVE
              </div>
              <div className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur text-[11px] font-bold text-white border border-white/10">
                {formatDuration(featuredLive.startedAt)}
              </div>
            </div>

            {/* Top Right: Viewers + Category */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur text-[11px] font-bold text-white border border-white/10">
                {featuredLive.category}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur text-[11px] font-bold text-white border border-white/10">
                <Eye className="w-3 h-3 text-pink-400" />
                {formatViewers(featuredLive.viewers)}
              </div>
            </div>

            {/* Bottom: Host Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-black mb-1.5 line-clamp-1">{featuredLive.title}</h2>
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      src={featuredLive.host.avatar_url}
                      alt={featuredLive.host.display_name}
                      className="w-9 h-9 rounded-full border-2 border-pink-500 object-cover"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold truncate">@{featuredLive.host.username}</span>
                        {featuredLive.host.verified && (
                          <div className="w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center shrink-0">
                            <Star className="w-2.5 h-2.5 text-white" fill="currentColor" />
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-neutral-300 truncate">{featuredLive.host.display_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {featuredLive.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-semibold text-neutral-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <button className="shrink-0 flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 text-white font-black text-sm shadow-xl shadow-red-500/30 transition group-hover:scale-105">
                  <PlayIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Tonton</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== Section Title ===== */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
            <Radio className="w-5 h-5 text-pink-500" />
            {searchQuery ? `Hasil pencarian "${searchQuery}"` : 'Live Streaming Sekarang'}
            <span className="px-2 py-0.5 rounded-lg bg-pink-500/20 text-pink-400 text-xs font-black">{filteredLives.length + (searchQuery ? 0 : 1)}</span>
          </h2>
          <button className="text-xs font-bold text-pink-400 flex items-center gap-1 hover:text-pink-300 transition">
            Lihat Semua <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ===== Live Grid (TikTok-style vertical cards) ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {filteredLives.map((live) => (
            <LiveCard key={live.id} live={live} onClick={() => navigate(`/live/watch/${live.id}`)} />
          ))}
        </div>

        {/* ===== Empty State ===== */}
        {filteredLives.length === 0 && !searchQuery && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-4">
              <Radio className="w-10 h-10 text-neutral-600" />
            </div>
            <h3 className="text-lg font-bold mb-1">Belum ada live stream</h3>
            <p className="text-sm text-neutral-400 mb-5">Jadilah yang pertama untuk memulai live!</p>
            <Link
              to="/live/studio"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 font-bold text-sm shadow-lg shadow-red-500/20"
            >
              <Plus className="w-4 h-4" />
              Mulai Live Sekarang
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

/* ===== LiveCard (compact grid card) ===== */
function LiveCard({ live, onClick }) {
  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden aspect-[9/14] cursor-pointer group border border-white/5 bg-neutral-900"
    >
      {/* Thumbnail */}
      <img
        src={live.thumbnail}
        alt={live.title}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* LIVE Badge */}
      <div className="absolute top-2.5 left-2.5">
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500 text-[10px] font-black shadow-lg shadow-red-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </div>
      </div>

      {/* Viewers */}
      <div className="absolute top-2.5 right-2.5">
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur text-[10px] font-bold">
          <Eye className="w-3 h-3 text-pink-400" />
          {formatViewers(live.viewers)}
        </div>
      </div>

      {/* Music indicator (bottom-left animation hint) */}
      <div className="absolute bottom-[72px] left-2.5 opacity-70">
        <Music className="w-3.5 h-3.5 text-white" />
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-2 mb-2">
          <img
            src={live.host.avatar_url}
            alt={live.host.username}
            className="w-7 h-7 rounded-full border border-white/20 object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold truncate">@{live.host.username}</span>
              {live.host.verified && (
                <div className="w-3 h-3 rounded-full bg-cyan-500 flex items-center justify-center shrink-0">
                  <Star className="w-2 h-2 text-white" fill="currentColor" />
                </div>
              )}
            </div>
          </div>
        </div>
        <h3 className="text-xs font-bold line-clamp-2 leading-tight mb-1.5">{live.title}</h3>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-neutral-300 bg-white/10 px-2 py-0.5 rounded-full">
            {live.category}
          </span>
          <span className="text-[10px] font-semibold text-neutral-400">
            {formatDuration(live.startedAt)}
          </span>
        </div>
      </div>

      {/* Hover play overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-red-500/50">
          <PlayIcon className="w-6 h-6 text-white ml-1" />
        </div>
      </div>
    </div>
  )
}

function PlayIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
