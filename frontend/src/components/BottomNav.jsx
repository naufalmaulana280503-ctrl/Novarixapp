import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Search, PlusSquare, MessageCircle, UserRound, Bot, RadioTower } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

const items = [
  { to: '/dashboard', key: 'feed', Icon: Home },
  { to: '/live', key: 'live', Icon: RadioTower },
  { to: '/search', key: 'search', Icon: Search },
  { to: '/create', key: 'create', Icon: PlusSquare },
  { to: '/chat', key: 'chat', Icon: MessageCircle },
  { to: '/profile', key: 'profile', Icon: UserRound },
]

export default function BottomNav() {
  const { t } = useLanguage()
  return (
    <nav className="novarix-bottom-nav" aria-label={t('feed')}>
      {items.map(({ to, key, Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `novarix-bottom-nav-item${isActive ? ' is-active' : ''}`}>
          <Icon size={21} strokeWidth={2.2} aria-hidden="true" />
          <span>{t(key)}</span>
        </NavLink>
      ))}
    </nav>
  )
}
