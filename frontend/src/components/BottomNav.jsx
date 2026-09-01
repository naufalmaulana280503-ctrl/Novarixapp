import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Search, PlusSquare, MessageCircle, UserRound, Bot } from 'lucide-react'

const items = [
  { to: '/dashboard', label: 'Home', Icon: Home },
  { to: '/search', label: 'Search', Icon: Search },
  { to: '/upload', label: 'Create', Icon: PlusSquare },
  { to: '/chat', label: 'Chat', Icon: MessageCircle },
  { to: '/ai-chat', label: 'AI', Icon: Bot },
  { to: '/profile', label: 'Profile', Icon: UserRound },
]

export default function BottomNav() {
  return (
    <nav className="novarix-bottom-nav" aria-label="Navigasi utama">
      {items.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `novarix-bottom-nav-item${isActive ? ' is-active' : ''}`}>
          <Icon size={21} strokeWidth={2.2} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
