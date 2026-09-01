import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

const CreatorAds = () => {
  const [eligibility, setEligibility] = useState(null)
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    media: null,
    targetDate: '',
  })
  const { currentUser } = useAuth()

  useEffect(() => {
    fetchEligibility()
    fetchAds()
  }, [])

  const fetchEligibility = async () => {
    try {
      const res = await api.get('/ads/eligibility')
      setEligibility(res.data)
    } catch (err) {
      console.error('Failed to fetch eligibility:', err)
    }
  }

  const fetchAds = async () => {
    try {
      const res = await api.get('/ads')
      setAds(res.data.ads || [])
    } catch (err) {
      console.error('Failed to fetch ads:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAd = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title)
      formDataToSend.append('description', formData.description)
      if (formData.media) {
        formDataToSend.append('media', formData.media)
      }
      formDataToSend.append('targetDate', formData.targetDate)
      await api.post('/ads', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFormData({ title: '', description: '', media: null, targetDate: '' })
      fetchAds()
    } catch (err) {
      console.error('Failed to create ad:', err)
    } finally {
      setCreating(false)
    }
  }

  const formatNumber = (num) => {
    if (!num) return '0'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const isEligible = eligibility?.eligible || (currentUser?.followersCount >= 70000000 && currentUser?.likesReceived >= 35000000000000)

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.sidebarSpacer}></div>
      <div style={styles.mainContent}>
        <div style={styles.pageHeader}>
          <h1 style={styles.title}>Creator Ads</h1>
          <p style={styles.subtitle}>Promote your content with sponsored ads</p>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Eligibility</h3>
          <div style={styles.eligibilityCard}>
            <div style={styles.eligibilityStatus}>
              <span style={{ ...styles.statusIcon, color: isEligible ? '#22c55e' : '#ef4444' }}>
                {isEligible ? '✅' : '❌'}
              </span>
              <span style={styles.statusText}>
                {isEligible ? 'You are eligible for Creator Ads!' : 'Not yet eligible'}
              </span>
            </div>
            <div style={styles.requirements}>
              <div style={styles.requirement}>
                <span style={styles.requirementLabel}>Followers</span>
                <span style={styles.requirementValue}>
                  {formatNumber(currentUser?.followersCount || 0)} / 70M
                </span>
              </div>
              <div style={styles.requirement}>
                <span style={styles.requirementLabel}>Total Likes</span>
                <span style={styles.requirementValue}>
                  {formatNumber(currentUser?.likesReceived || 0)} / 35T
                </span>
              </div>
            </div>
          </div>
        </div>

        {isEligible && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Create Ad</h3>
            <form onSubmit={handleCreateAd} style={styles.form}>
              <div style={styles.feeNotice}>
                <span style={styles.feeIcon}>💰</span>
                <span style={styles.feeText}>
                  Ad display fee: <strong>$1,000 USD</strong> per display
                </span>
              </div>
              <input
                type="text"
                placeholder="Ad Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                style={styles.input}
              />
              <textarea
                placeholder="Ad Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                style={styles.textarea}
              />
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setFormData({ ...formData, media: e.target.files[0] })}
                style={styles.fileInput}
              />
              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                required
                style={styles.input}
              />
              <button type="submit" disabled={creating} style={styles.submitButton}>
                {creating ? 'Creating...' : 'Create Ad'}
              </button>
            </form>
          </div>
        )}

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Your Ads</h3>
          {ads.length === 0 ? (
            <p style={styles.emptyText}>No ads created yet</p>
          ) : (
            <div style={styles.adsList}>
              {ads.map((ad) => (
                <div key={ad.id} style={styles.adCard}>
                  <div style={styles.adHeader}>
                    <h4 style={styles.adTitle}>{ad.title}</h4>
                    <span style={styles.adStatus}>{ad.status}</span>
                  </div>
                  <p style={styles.adDescription}>{ad.description}</p>
                  <div style={styles.adStats}>
                    <div style={styles.adStat}>
                      <span style={styles.adStatValue}>{formatNumber(ad.views || 0)}</span>
                      <span style={styles.adStatLabel}>Views</span>
                    </div>
                    <div style={styles.adStat}>
                      <span style={styles.adStatValue}>{formatNumber(ad.clicks || 0)}</span>
                      <span style={styles.adStatLabel}>Clicks</span>
                    </div>
                    <div style={styles.adStat}>
                      <span style={styles.adStatValue}>${ad.spend || 0}</span>
                      <span style={styles.adStatLabel}>Spend</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={styles.rightSpacer}></div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0f0f0f',
  },
  sidebarSpacer: {
    width: '240px',
    flexShrink: 0,
  },
  mainContent: {
    flex: 1,
    maxWidth: '800px',
    margin: '0 auto',
    paddingTop: '60px',
    borderLeft: '1px solid #2d2d2d',
    borderRight: '1px solid #2d2d2d',
    minHeight: '100vh',
  },
  pageHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #2d2d2d',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: '14px',
    color: '#a0a0a0',
  },
  section: {
    padding: '24px',
    borderBottom: '1px solid #2d2d2d',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '16px',
  },
  eligibilityCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #2d2d2d',
    padding: '24px',
  },
  eligibilityStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  statusIcon: {
    fontSize: '24px',
  },
  statusText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
  },
  requirements: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  requirement: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: '#262626',
    borderRadius: '8px',
  },
  requirementLabel: {
    fontSize: '14px',
    color: '#a0a0a0',
  },
  requirementValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  feeNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: 'rgba(8, 145, 178, 0.1)',
    border: '1px solid #0891b2',
    borderRadius: '8px',
  },
  feeIcon: {
    fontSize: '20px',
  },
  feeText: {
    fontSize: '14px',
    color: '#ffffff',
  },
  input: {
    width: '100%',
    backgroundColor: '#262626',
    border: '1px solid #2d2d2d',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    backgroundColor: '#262626',
    border: '1px solid #2d2d2d',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    minHeight: '80px',
    fontFamily: 'inherit',
  },
  fileInput: {
    color: '#ffffff',
    fontSize: '14px',
  },
  submitButton: {
    backgroundColor: '#0891b2',
    color: '#ffffff',
    padding: '14px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '16px',
    border: 'none',
  },
  emptyText: {
    color: '#a0a0a0',
    fontSize: '14px',
    textAlign: 'center',
    padding: '20px',
  },
  adsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  adCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #2d2d2d',
    padding: '16px',
  },
  adHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  adTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
  },
  adStatus: {
    fontSize: '12px',
    color: '#22c55e',
    fontWeight: '600',
    padding: '4px 8px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: '6px',
  },
  adDescription: {
    fontSize: '14px',
    color: '#a0a0a0',
    marginBottom: '12px',
  },
  adStats: {
    display: 'flex',
    gap: '24px',
  },
  adStat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  adStatValue: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0891b2',
  },
  adStatLabel: {
    fontSize: '12px',
    color: '#6b6b6b',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f0f',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #262626',
    borderTopColor: '#0891b2',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  rightSpacer: {
    width: '320px',
    flexShrink: 0,
    display: 'none',
  },
}

export default CreatorAds
