import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import ModernNavbar from '../components/ModernNavbar'
import TrendsSidebar from '../components/TrendsSidebar'
import LivePlayer from '../components/LivePlayer'
import ProfileCustomizer from '../components/ProfileCustomizer'
import Feed from './Feed'
import { Heart, Sparkles } from 'lucide-react'

// Simple Error Boundary to prevent the app from crashing to a white screen
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    // Log error to console or a monitoring service
    console.error('ErrorBoundary caught:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#fff', background: '#0b0b0b', minHeight: '100vh' }}>
          <h2 style={{ color: '#f87171' }}>Something went wrong.</h2>
          <p>Please refresh the page or try again later.</p>
        </div>
      )
    }
    return this.props.children
  }
}

const ProtectedRoute = ({ children }) => {
  const auth = useAuth() || {}
  const currentUser = auth.currentUser
  const loading = auth.loading

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return children
}

const Dashboard = () => {
  const navigate = useNavigate()
  const [companionEnabled, setCompanionEnabled] = useState(() => {
    try { return localStorage.getItem('novarix-ai-companion') !== 'off' } catch { return true }
  })

  const toggleCompanion = () => {
    setCompanionEnabled((enabled) => {
      const next = !enabled
      try { localStorage.setItem('novarix-ai-companion', next ? 'on' : 'off') } catch {}
      return next
    })
  }

  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <div style={styles.appLayout}>
          <Sidebar />

          <div className="novarix-content-area dashboard-content" style={styles.contentArea}>
            <ModernNavbar />

            <main className="novarix-grid-layout dashboard-grid" style={styles.gridLayout}>
              <section className="dashboard-left" style={styles.leftColumn} aria-label="content">
                <section className="companionBar" style={styles.companionBar} aria-label="AI Companion">
                  <div className="companionCopy" style={styles.companionCopy}><Heart size={20} fill="currentColor" /><div><strong>AI Companion</strong><span>{companionEnabled ? 'Aktif dan siap menemani harimu.' : 'Nonaktif untuk sementara.'}</span></div></div>
                  <div style={styles.companionActions}><button type="button" style={styles.companionButton} onClick={toggleCompanion} aria-pressed={companionEnabled}>{companionEnabled ? 'ON' : 'OFF'}</button><button type="button" style={styles.openCompanion} onClick={() => navigate('/ai-chat')}><Sparkles size={16} /> Buka ruang AI</button></div>
                </section>
                <LivePlayer />

                <div style={styles.feedWrapper}>
                  <h2 style={styles.sectionTitle}>Home</h2>
                  <Feed />
                </div>
              </section>

              <aside className="novarix-right-column" style={styles.rightColumn} aria-label="sidebar">
                <ProfileCustomizer />
                <TrendsSidebar />
              </aside>
            </main>
          </div>
        </div>
      </ErrorBoundary>
    </ProtectedRoute>
  )
}

const styles = {
  appLayout: {
    display: 'flex',
    minHeight: '100vh',
    background: '#05060a',
    color: '#e6e6ef',
  },
  contentArea: {
    flex: 1,
    marginLeft: '240px',
    display: 'flex',
    flexDirection: 'column',
  },
  gridLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: 20,
    padding: '20px',
    maxWidth: 1200,
    margin: '0 auto',
    width: '100%',
  },
  leftColumn: {
    minHeight: '80vh',
  },
  companionBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 12,
    padding: '14px 16px',
    border: '1px solid rgba(8,145,178,0.3)',
    borderRadius: 12,
    background: 'linear-gradient(110deg, rgba(8,145,178,0.15), rgba(6,182,212,0.12))',
  },
  companionCopy: { display: 'flex', alignItems: 'center', gap: 10, color: '#06b6d4' },
  companionActions: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  companionButton: { minWidth: 52, padding: '8px 10px', background: '#06b6d4', color: '#fff' },
  openCompanion: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: 'rgba(255,255,255,0.1)', color: '#fff' },
  rightColumn: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  feedWrapper: {
    marginTop: 12,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.005))',
    borderRadius: 12,
    padding: 12,
    border: '1px solid rgba(255,255,255,0.03)',
  },
  sectionTitle: {
    margin: '4px 0 12px 0',
    fontSize: 18,
    fontWeight: 700,
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid rgba(255,255,255,0.04)',
    borderTopColor: '#0891b2',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

}

export default Dashboard
