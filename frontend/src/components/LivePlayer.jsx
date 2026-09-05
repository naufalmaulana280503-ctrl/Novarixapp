import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MusicPlayerWidget from './MusicPlayerWidget'
import { Radio, RadioTower, Eye, Users, MessageCircle, ChevronRight, Play, Plus } from 'lucide-react'

const FEATURED_LIVES = [
  {
    id: 'live_001',
    title: 'Main Bareng Genshin! 🎮',
    username: 'gamergirl',
    viewers: 12430,
    category: 'Gaming',
    thumbnail: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=epic%20gaming%20purple%20neon&image_size=square',
    verified: true,
  },
  {
    id: 'live_002',
    title: 'Kuliner Malam Jkt 🍜',
    username: 'foodie_jkt',
    viewers: 5820,
    category: 'Food',
    thumbnail: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=delicious%20indonesian%20food%20warm&image_size=square',
    verified: false,
  },
  {
    id: 'live_003',
    title: 'Live Akustik Malam 🎸',
    username: 'musician_rio',
    viewers: 8950,
    category: 'Music',
    thumbnail: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=acoustic%20guitar%20warm%20stage&image_size=square',
    verified: true,
  },
  {
    id: 'live_004',
    title: 'Review Makeup Korea 💄',
    username: 'beauty_lina',
    viewers: 15670,
    category: 'Beauty',
    thumbnail: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=korean%20makeup%20cosmetics%20pink&image_size=square',
    verified: true,
  },
]

const formatViewers = (num) => {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const LivePlayer = () => {
  const navigate = useNavigate()
  const [isStreamRunning, setIsStreamRunning] = useState(false)

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#141418] via-[#0f0f14] to-[#0b0b0e] border border-white/5 p-4 sm:p-5 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 via-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/20">
              <RadioTower className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-[#141418] animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight leading-tight">Live Streaming</h2>
            <p className="text-[11px] text-neutral-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {FEATURED_LIVES.length} creator sedang live
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/live')}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 hover:border-white/15 transition shrink-0"
        >
          Jelajahi <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Live Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {FEATURED_LIVES.map((live) => (
          <button
            key={live.id}
            onClick={() => navigate(`/live/watch/${live.id}`)}
            className="group relative rounded-xl overflow-hidden aspect-square text-left border border-white/5 hover:border-white/15 transition-all"
          >
            <img
              src={live.thumbnail}
              alt={live.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

            {/* LIVE Badge */}
            <div className="absolute top-2 left-2">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-500">
                <Radio className="w-2.5 h-2.5 text-white animate-pulse" />
                <span className="text-[9px] font-black text-white">LIVE</span>
              </div>
            </div>

            {/* Viewers */}
            <div className="absolute top-2 right-2">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm">
                <Eye className="w-2.5 h-2.5 text-pink-400" />
                <span className="text-[9px] font-bold text-white">{formatViewers(live.viewers)}</span>
              </div>
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <img
                  src={live.thumbnail}
                  alt={live.username}
                  className="w-5 h-5 rounded-full border border-white/20 object-cover"
                />
                <span className="text-[10px] font-bold truncate text-white">@{live.username}</span>
              </div>
              <h3 className="text-[10px] font-semibold text-white/90 line-clamp-1 leading-tight">{live.title}</h3>
            </div>

            {/* Hover Play */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-xl shadow-red-500/50">
                <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <button
          onClick={() => navigate('/live/studio')}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 hover:from-red-400 hover:via-pink-400 hover:to-rose-400 text-white font-black text-sm shadow-lg shadow-red-500/25 transition"
        >
          <Plus className="w-4 h-4" />
          Mulai Live Stream
        </button>
        <button
          onClick={() => navigate('/camera')}
          className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/15 text-white font-bold text-sm transition"
        >
          📷 Camera
        </button>
        <button
          onClick={() => setIsStreamRunning((v) => !v)}
          className={`flex items-center justify-center gap-2 h-11 px-4 rounded-xl font-bold text-sm transition ${
            isStreamRunning
              ? 'bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30'
              : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
          }`}
        >
          {isStreamRunning ? '⏹ Stop' : '▶ Test'}
        </button>
      </div>

      {/* Stats strip */}
      <div className="mt-4 flex items-center gap-3 pt-4 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-pink-400" />
          <span className="text-xs font-semibold text-neutral-300">Total penonton hari ini</span>
          <span className="text-xs font-black text-white ml-auto">42.8K</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-semibold text-neutral-300">Chats aktif</span>
          <span className="text-xs font-black text-white ml-auto">1,247</span>
        </div>
      </div>

      <MusicPlayerWidget />
    </div>
  )
}

export default LivePlayer
