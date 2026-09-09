import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import ConfirmEmail from './pages/ConfirmEmail'
import OAuthCallback from './pages/OAuthCallback'
import Dashboard from './pages/Dashboard'
import Feed from './pages/Feed'
import Upload from './pages/Upload'
import Profile from './pages/Profile'
import PostDetail from './pages/PostDetail'
import Chat from './pages/Chat'
import GroupChat from './pages/GroupChat'
import AIChat from './pages/AIChat'
import Calls from './pages/Calls'
import Create from './pages/Create'
import Camera from './pages/Camera'
import Editor from './pages/Editor'
import CreatorAds from './pages/CreatorAds'
import Moderation from './pages/Moderation'
import AdminVerification from './pages/AdminVerification'
import AdminVerify from './pages/AdminVerify2'
import AdminAudit from './pages/AdminAudit'
import SettingsProfile from './pages/SettingsProfile'
import Settings from './pages/Settings'
import LiveStudio from './pages/LiveStudio'
import LiveReplays from './pages/LiveReplays'
import LiveFeed from './pages/LiveFeed'
import LiveViewer from './pages/LiveViewer'
import VerifiedReport from './pages/VerifiedReport'
import { ToastProvider } from './context/ToastContext'
import SplashScreen from './components/SplashScreen'
import BottomNav from './components/BottomNav'
import TimeCapsule from './pages/TimeCapsule'
import AnonConfess from './pages/AnonConfess'
import Search from './pages/Search'
import StoryViewer from './pages/StoryViewer'
import StoryUpload from './pages/StoryUpload'
import SavedPosts from './pages/SavedPosts'
import ProfileEdit from './pages/ProfileEdit'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    console.error('Global ErrorBoundary caught an error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0b0b0b', color: '#fff', padding: 24 }}>
          <h2 style={{ color: '#f87171' }}>Something went wrong.</h2>
          <p>Please try refreshing the page or contact support if the issue persists.</p>
        </div>
      )
    }
    return this.props.children
  }
}

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f0f0f',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #262626',
          borderTopColor: '#0891b2',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}></div>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return children
}

const RedirectAuthenticated = ({ children }) => {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f0f0f',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #262626',
          borderTopColor: '#0891b2',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}></div>
      </div>
    )
  }

  if (currentUser) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

const App = () => {
  const { currentUser } = useAuth()
  const [showSplash, setShowSplash] = React.useState(true)
  const [splashExiting, setSplashExiting] = React.useState(false)

  React.useEffect(() => {
    const exitTimer = setTimeout(() => {
      setSplashExiting(true)
    }, 2600)
    const hideTimer = setTimeout(() => {
      setShowSplash(false)
    }, 3100)
    return () => {
      clearTimeout(exitTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  return (
    <>
      {showSplash && (
        <div className={splashExiting ? 'splash-exit' : ''}>
          <SplashScreen />
        </div>
      )}
      <ErrorBoundary>
        <ToastProvider>
          <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route
            path="/"
            element={
              <RedirectAuthenticated>
                <Login />
              </RedirectAuthenticated>
            }
          />
          <Route
            path="/login"
            element={
              <RedirectAuthenticated>
                <Login />
              </RedirectAuthenticated>
            }
          />
          <Route
            path="/register"
            element={
              <RedirectAuthenticated>
                <Register />
              </RedirectAuthenticated>
            }
          />
          <Route path="/confirm-email/:token" element={<ConfirmEmail />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feed"
            element={
              <ProtectedRoute>
                <Feed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create"
            element={
              <ProtectedRoute>
                <Create />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Create />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:username"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/post/:id"
            element={
              <ProtectedRoute>
                <PostDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:userId"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups"
            element={
              <ProtectedRoute>
                <GroupChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups/:id"
            element={
              <ProtectedRoute>
                <GroupChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/group-chat/:id"
            element={
              <ProtectedRoute>
                <GroupChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-chat"
            element={
              <ProtectedRoute>
                <AIChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calls"
            element={
              <ProtectedRoute>
                <Calls />
              </ProtectedRoute>
            }
          />
          <Route path="/time-capsule" element={<ProtectedRoute><TimeCapsule /></ProtectedRoute>} />
          <Route path="/anon-confess" element={<ProtectedRoute><AnonConfess /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
          <Route
            path="/stories/upload"
            element={
              <ProtectedRoute>
                <StoryUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stories/:userId"
            element={
              <ProtectedRoute>
                <StoryViewer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/camera"
            element={
              <ProtectedRoute>
                <Camera />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/:postId?"
            element={
              <ProtectedRoute>
                <Editor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/creator-ads"
            element={
              <ProtectedRoute>
                <CreatorAds />
              </ProtectedRoute>
            }
          />
          <Route
            path="/moderation"
            element={
              <ProtectedRoute>
                <Moderation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/verification"
            element={
              <ProtectedRoute>
                <AdminVerification />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/verify"
            element={
              <ProtectedRoute>
                <AdminVerify />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute>
                <AdminAudit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/profile"
            element={
              <ProtectedRoute>
                <SettingsProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <SavedPosts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute>
                <ProfileEdit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live/studio"
            element={
              <ProtectedRoute>
                <LiveStudio />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live/replays"
            element={
              <ProtectedRoute>
                <LiveReplays />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live"
            element={
              <ProtectedRoute>
                <LiveFeed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live/watch/:streamId"
            element={
              <ProtectedRoute>
                <LiveViewer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/verified"
            element={
              <ProtectedRoute>
                <VerifiedReport />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
          {currentUser && <BottomNav />}
      </ToastProvider>
    </ErrorBoundary>
    </>
  )
}

export default App
