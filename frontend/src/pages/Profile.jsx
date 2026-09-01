import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import SettingsMenu from '../components/SettingsMenu'
import { useNavigate, useParams } from 'react-router-dom'
import { formatNumber } from '../utils/formatters'
import VerifiedBadge from '../components/VerifiedBadge'
import VerificationRequestModal from '../components/VerificationRequestModal'
import FollowListModal from '../components/FollowListModal'
import PostCard from '../components/PostCard'
import { postsApi, userProfileApi, followsApi } from '../services/api'

const Profile = ({ username: propUsername }) => {
  const routeParams = useParams()
  const username = propUsername || routeParams.username
  const { currentUser, antiSpy } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [followListType, setFollowListType] = useState(null)
  const [isCompact, setIsCompact] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false)
  const navigate = useNavigate()

  // Profile data
  const [profileData, setProfileData] = useState(null)
  const [userPosts, setUserPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  const isOwnProfile = !username || username === currentUser?.username
  const displayUser = isOwnProfile ? (profileData || currentUser) : profileData
  const displayName = displayUser?.displayName || displayUser?.name || username || 'Your Name'
  const userHandle = displayUser?.username || username || 'username'
  const safeAvatar = displayUser?.avatarUrl || displayUser?.avatar || displayUser?.profileImage || displayUser?.imageUrl || ''
  const verifiedTier = displayUser?.verifiedBadge || (displayUser?.isVerified ? 'blue' : null)

  // Posts count: prioritize the real fetched userPosts.length (source of truth)
  // then fall back to DB posts_count in profileData. Keep them in sync.
  const rawPostsCount = userPosts?.length ?? 0
  const postsCount = (rawPostsCount > 0 ? rawPostsCount : (displayUser?.postsCount ?? displayUser?.formattedPosts ?? 0))
  const followersCount = displayUser?.followersCount ?? displayUser?.formattedFollowers ?? 0
  const followingCount = displayUser?.followingCount ?? displayUser?.formattedFollowing ?? 0

  // Keep profileData.postsCount in sync with actual fetched posts
  useEffect(() => {
    if (!profileData || !profileData.id) return
    if (userPosts.length > 0 && (profileData.postsCount ?? 0) !== userPosts.length) {
      setProfileData((prev) => prev ? { ...prev, postsCount: userPosts.length } : prev)
    }
  }, [userPosts, profileData?.id])

  // Fetch fresh user profile by username
  const fetchProfile = useCallback(async () => {
    setProfileLoading(true)
    try {
      if (isOwnProfile) {
        // For own profile, try to fetch fresh data from backend
        const myUsername = currentUser?.username
        if (myUsername) {
          try {
            const res = await userProfileApi.getByUsername(myUsername)
            const userData = res.data?.user
            if (userData) {
              setProfileData(userData)
            }
          } catch (err) {
            console.warn('Could not fetch own profile from API, using cached data:', err.message)
            // Use currentUser from AuthContext as fallback
          }
        }
        // Fetch posts for own user
        if (currentUser?.id) {
          fetchUserPosts(currentUser.id)
        }
      } else {
        // Fetch other user's profile by username
        try {
          const res = await userProfileApi.getByUsername(username)
          const userData = res.data?.user
          if (userData) {
            setProfileData(userData)
            // Check follow status
            try {
              const followRes = await followsApi.status(userData.id)
              setIsFollowing(Boolean(followRes.data?.isFollowing || followRes.data?.following))
            } catch {}
            // Fetch posts for this user
            fetchUserPosts(userData.id)
          }
        } catch (err) {
          console.error('Failed to fetch user profile:', err)
          setProfileData(null)
        }
      }
    } finally {
      setProfileLoading(false)
    }
  }, [isOwnProfile, username, currentUser])

  // Fetch user posts by user ID
  const fetchUserPosts = useCallback(async (uid) => {
    if (!uid) return
    setPostsLoading(true)
    try {
      const res = await postsApi.getUserPosts(uid)
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.posts) ? res.data.posts : [])
      setUserPosts(list)
    } catch (err) {
      console.error('Failed to fetch user posts:', err)
      setUserPosts([])
    } finally {
      setPostsLoading(false)
    }
  }, [])

  // Follow / Unfollow
  const toggleFollow = useCallback(async () => {
    if (!profileData || followLoading) return
    const next = !isFollowing
    setIsFollowing(next)
    setFollowLoading(true)
    try {
      if (next) await followsApi.follow(profileData.id)
      else await followsApi.unfollow(profileData.id)
      // Refresh counts
      if (profileData.username) {
        const res = await userProfileApi.getByUsername(profileData.username)
        if (res.data?.user) setProfileData(res.data.user)
      }
    } catch (error) {
      setIsFollowing(!next)
    } finally { setFollowLoading(false) }
  }, [profileData, isFollowing, followLoading])

  // Fetch profile on mount and when username changes
  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Viewport listener
  useEffect(() => {
    const updateViewport = () => setIsCompact(window.innerWidth <= 768)
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  if (profileLoading && !displayUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ width: 40, height: 40, border: '4px solid var(--bg-tertiary)', borderTopColor: '#0891b2', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div className="profile-page">
      <div className="profile-sidebar-spacer" style={styles.sidebarSpacer} />
      <div className="profile-main" style={styles.mainContent}>
        {/* Settings gear */}
        <div style={{ position: 'absolute', right: 20, top: 18, zIndex: 2 }}>
          <button aria-label="Settings" onClick={() => setSettingsOpen(true)} style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 20 }}>⚙️</button>
        </div>

        {/* Instagram-style profile header */}
        <div className="profile-header" style={styles.profileHeader}>
          <div className="profile-info-row" style={styles.infoRow}>
            {/* Avatar */}
            <div className="profile-avatar" style={styles.avatarImageWrap}>
              {safeAvatar ? (
                <img src={safeAvatar} alt={displayName} style={styles.avatarImage} />
              ) : (
                <svg viewBox="0 0 24 24" width="64" height="64" aria-hidden style={{display:'block'}}>
                  <path fill="var(--bg-secondary)" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
                  <path fill="var(--text-secondary)" d="M4 20c0-3.31 4.03-6 8-6s8 2.69 8 6v1H4v-1z" />
                </svg>
              )}
            </div>

            {/* Stats row (Instagram-style) */}
            <div className="profile-stats-row" style={styles.statsRow}>
              <div style={styles.stat}>
                <span style={styles.statNumber}>{formatNumber(postsCount)}</span>
                <span style={styles.statLabel}>Postingan</span>
              </div>
              {!antiSpy && (
                <>
                  <button type="button" onClick={() => setFollowListType('followers')} style={styles.statButton}>
                    <span style={styles.statNumber}>{formatNumber(followersCount)}</span>
                    <span style={styles.statLabel}>Pengikut</span>
                  </button>
                  <button type="button" onClick={() => setFollowListType('following')} style={styles.statButton}>
                    <span style={styles.statNumber}>{formatNumber(followingCount)}</span>
                    <span style={styles.statLabel}>Mengikuti</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name & bio */}
          <div className="profile-name-section" style={styles.nameSection}>
            <h1 style={styles.displayName}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {displayName}
                {verifiedTier && <VerifiedBadge tier={verifiedTier} size={16} title={displayUser?.verifiedBadgeTitle || 'Verified'} />}
              </span>
            </h1>
            <p style={styles.username}>@{userHandle}</p>
            {displayUser?.bio && <p style={styles.bio}>{displayUser.bio}</p>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {displayUser?.gender ? <span style={styles.metaPill}>{displayUser.gender}</span> : null}
              {displayUser?.gameAffiliation ? <span style={styles.metaPill}>{displayUser.gameAffiliation}</span> : null}
              {displayUser?.teamAffiliation ? <span style={styles.metaPill}>{displayUser.teamAffiliation}</span> : null}
            </div>
          </div>

          {/* Action buttons */}
          <div className="profile-actions" style={styles.actionsRow}>
            {isOwnProfile ? (
              <>
                <button style={styles.editButton} onClick={() => navigate('/settings/profile')}>Edit Profile</button>
                <button style={styles.requestButton} onClick={() => setShowVerificationModal(true)}>Request Verification</button>
              </>
            ) : (
              <button
                style={{ ...styles.editButton, ...(!isFollowing ? { background: 'linear-gradient(90deg,#0891b2,#06b6d4)', border: 'none', color: '#fff' } : {}) }}
                onClick={toggleFollow}
                disabled={followLoading}
              >
                {followLoading ? '...' : (isFollowing ? 'Mengikuti' : 'Ikuti')}
              </button>
            )}
          </div>
        </div>

        {/* Posts grid */}
        <div style={styles.postsSection}>
          {postsLoading && (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ width: 32, height: 32, border: '3px solid var(--bg-tertiary)', borderTopColor: '#0891b2', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            </div>
          )}
          {!postsLoading && userPosts.length > 0 && (
            <div>
              {userPosts.map((post) => (
                <PostCard key={post.id} post={post} onDelete={(id) => setUserPosts((prev) => prev.filter((p) => p.id !== id))} />
              ))}
            </div>
          )}
          {!postsLoading && userPosts.length === 0 && (
            <div style={styles.empty}>
              <p style={styles.emptyText}>No posts yet</p>
            </div>
          )}
        </div>

        {showVerificationModal && (
          <VerificationRequestModal user={displayUser} onClose={() => setShowVerificationModal(false)} onSubmitted={() => setShowVerificationModal(false)} />
        )}
        {settingsOpen && <SettingsMenu open={settingsOpen} onClose={() => setSettingsOpen(false)} />}
        <FollowListModal open={Boolean(followListType)} onClose={() => setFollowListType(null)} userId={displayUser?.id} type={followListType || 'followers'} />
      </div>
      <div className="profile-right-spacer" style={styles.rightSpacer} />
    </div>
  )
}

const styles = {
  sidebarSpacer: {
    width: '240px',
    flexShrink: 0,
  },
  mainContent: {
    flex: 1,
    maxWidth: '640px',
    margin: '0 auto',
    minHeight: '100vh',
    position: 'relative',
  },
  profileHeader: {
    padding: '24px 24px 20px',
    borderBottom: '1px solid var(--border-color)',
    position: 'relative',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 32,
    marginBottom: 20,
  },
  avatarImageWrap: {
    width: 96,
    height: 96,
    borderRadius: '50%',
    overflow: 'hidden',
    border: '2px solid var(--border-color)',
    background: 'var(--bg-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  statsRow: {
    display: 'flex',
    gap: 32,
    flex: 1,
    justifyContent: 'center',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 60,
  },
  statButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    border: 0,
    background: 'transparent',
    cursor: 'pointer',
    color: 'inherit',
    padding: 0,
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  statLabel: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    marginTop: 2,
  },
  nameSection: {
    marginBottom: 12,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    marginBottom: 6,
  },
  bio: {
    fontSize: 14,
    color: 'var(--text-primary)',
    lineHeight: 1.4,
    marginBottom: 6,
  },
  metaPill: {
    display: 'inline-block',
    background: 'var(--pill-bg)',
    padding: '3px 10px',
    borderRadius: 999,
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: 500,
  },
  actionsRow: {
    display: 'flex',
    gap: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    padding: '8px 16px',
    borderRadius: 8,
    fontWeight: '600',
    fontSize: 13,
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    textAlign: 'center',
  },
  requestButton: {
    flex: 1,
    background: 'linear-gradient(90deg,#0891b2,#06b6d4)',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: 8,
    fontWeight: '700',
    fontSize: 13,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center',
  },
  postsSection: {
    padding: '0 16px 80px',
  },
  empty: {
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyText: {
    color: 'var(--text-secondary)',
    fontSize: 14,
  },
  rightSpacer: {
    width: '320px',
    flexShrink: 0,
    display: 'none',
  },
}

export default Profile
