import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SaturnLogo from '../components/SaturnLogo'
import { Home, Tv, Upload, Camera, MessageCircle, Users, Phone, Megaphone, UserRound, Shield, Clock3, ShieldQuestion, Bot, LogOut, ArrowLeft, ArrowRight } from 'lucide-react'

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false)
  const { logout, currentUser } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'moderator'

  const navItems = [
    { path: '/dashboard', label: 'Home', Icon: Home },
    { path: '/feed', label: 'Feed', Icon: Tv },
    { path: '/upload', label: 'Upload', Icon: Upload },
    { path: '/camera', label: 'Camera', Icon: Camera },
    { path: '/chat', label: 'Chat', Icon: MessageCircle },
    { path: '/groups', label: 'Groups', Icon: Users },
    { path: '/calls', label: 'Calls', Icon: Phone },
    { path: '/ai-chat', label: 'AI Companion', Icon: Bot },
    { path: '/time-capsule', label: 'Time Capsule', Icon: Clock3 },
    { path: '/anon-confess', label: 'Anon-Confess', Icon: ShieldQuestion },
    { path: '/creator-ads', label: 'Creator Ads', Icon: Megaphone },
    { path: '/profile', label: 'Profile', Icon: UserRound },
  ]

  const adminItems = isAdmin ? [
    { path: '/moderation', label: 'Moderation', Icon: Shield },
  ] : []

  return (
    <aside className="novarix-sidebar" style={{ ...styles.sidebar, width: collapsed ? '72px' : '240px' }}>
      <div style={styles.logoWrapper}>
        <NavLink to="/dashboard" style={styles.logoLink}>
          <SaturnLogo size={32} />
          {!collapsed && <span style={styles.logoText}>Novarix</span>}
        </NavLink>
      </div>

      <nav style={styles.nav}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              ...styles.navItem,
              backgroundColor: isActive ? '#262626' : 'transparent',
              color: isActive ? '#0891b2' : '#a0a0a0',
            })}
          >
            <span style={styles.navIcon}><item.Icon size={20} aria-hidden="true" /></span>
            {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
          </NavLink>
        ))}
        {adminItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              ...styles.navItem,
              backgroundColor: isActive ? '#262626' : 'transparent',
              color: isActive ? '#0891b2' : '#a0a0a0',
            })}
          >
            <span style={styles.navIcon}><item.Icon size={20} aria-hidden="true" /></span>
            {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div style={styles.bottom}>
        <button onClick={handleLogout} style={styles.logoutButton}>
          <span style={styles.navIcon}><LogOut size={20} aria-hidden="true" /></span>
          {!collapsed && <span style={styles.navLabel}>Logout</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={styles.collapseButton}
        >
          {collapsed ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
        </button>
      </div>
    </aside>
  )
}

const styles = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    backgroundColor: '#0f0f0f',
    borderRight: '1px solid #2d2d2d',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.2s ease',
    zIndex: 100,
    overflow: 'hidden',
  },
  logoWrapper: {
    padding: '16px',
    borderBottom: '1px solid #2d2d2d',
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#ffffff',
    whiteSpace: 'nowrap',
  },
  nav: {
    flex: 1,
    padding: '16px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  navIcon: {
    fontSize: '20px',
    width: '24px',
    textAlign: 'center',
    flexShrink: 0,
  },
  navLabel: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  bottom: {
    padding: '16px 8px',
    borderTop: '1px solid #2d2d2d',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#ef4444',
    fontSize: '14px',
    fontWeight: '500',
    width: '100%',
    justifyContent: 'flex-start',
  },
  collapseButton: {
    backgroundColor: '#262626',
    color: '#ffffff',
    padding: '8px',
    borderRadius: '6px',
    fontSize: '14px',
    width: '100%',
  },
}

export default Sidebar
