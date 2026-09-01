import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { currentUser } = useAuth()

  return (
    <nav style={styles.navbar}>
      <div style={styles.left}>
        <button
          style={styles.mobileToggle}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          ☰
        </button>
        <div style={styles.search}>
          <input
            type="text"
            placeholder="Search..."
            style={styles.searchInput}
          />
        </div>
      </div>

      <div style={styles.right}>
        <button style={styles.iconButton}>
          🔔
          <span style={styles.badge}>3</span>
        </button>
        <div style={styles.userMenu}>
          <div style={styles.avatar}>
            {currentUser?.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </nav>
  )
}

const styles = {
  navbar: {
    position: 'fixed',
    top: 0,
    left: '240px',
    right: '0',
    height: '60px',
    backgroundColor: '#0f0f0f',
    borderBottom: '1px solid #2d2d2d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    zIndex: 50,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1,
  },
  mobileToggle: {
    display: 'none',
    backgroundColor: 'transparent',
    color: '#ffffff',
    fontSize: '24px',
    padding: '4px 8px',
  },
  search: {
    maxWidth: '400px',
    width: '100%',
  },
  searchInput: {
    width: '100%',
    backgroundColor: '#262626',
    border: '1px solid #2d2d2d',
    borderRadius: '20px',
    padding: '8px 16px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  iconButton: {
    backgroundColor: 'transparent',
    color: '#ffffff',
    fontSize: '20px',
    padding: '8px',
    borderRadius: '8px',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: '0',
    right: '0',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 5px',
    borderRadius: '10px',
    minWidth: '16px',
    textAlign: 'center',
  },
  userMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#0891b2',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
  },
}

export default Navbar