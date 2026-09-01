import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

const Moderation = () => {
  const [reports, setReports] = useState([])
  const [botFlags, setBotFlags] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('reports')
  const { currentUser } = useAuth()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [reportsRes, botsRes] = await Promise.all([
        api.get('/moderation/reports'),
        api.get('/moderation/bots'),
      ])
      setReports(reportsRes.data.reports || [])
      setBotFlags(botsRes.data.flags || [])
    } catch (err) {
      console.error('Failed to fetch moderation data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBanUser = async (userId, reason) => {
    try {
      await api.post('/moderation/ban', { userId, reason })
      fetchData()
    } catch (err) {
      console.error('Failed to ban user:', err)
    }
  }

  const handleDismissReport = async (reportId) => {
    try {
      await api.post(`/moderation/reports/${reportId}/dismiss`)
      fetchData()
    } catch (err) {
      console.error('Failed to dismiss report:', err)
    }
  }

  const handleWarnUser = async (userId, message) => {
    try {
      await api.post('/moderation/warn', { userId, message })
      fetchData()
    } catch (err) {
      console.error('Failed to warn user:', err)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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
          <h1 style={styles.title}>Moderation</h1>
          <p style={styles.subtitle}>Manage reports and flagged content</p>
        </div>

        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('reports')}
            style={{
              ...styles.tab,
              borderBottom: activeTab === 'reports' ? '2px solid #0891b2' : 'none',
              color: activeTab === 'reports' ? '#0891b2' : '#a0a0a0',
            }}
          >
            Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('bots')}
            style={{
              ...styles.tab,
              borderBottom: activeTab === 'bots' ? '2px solid #0891b2' : 'none',
              color: activeTab === 'bots' ? '#0891b2' : '#a0a0a0',
            }}
          >
            Bot Flags ({botFlags.length})
          </button>
        </div>

        {activeTab === 'reports' && (
          <div style={styles.section}>
            {reports.length === 0 ? (
              <p style={styles.emptyText}>No pending reports</p>
            ) : (
              <div style={styles.reportsList}>
                {reports.map((report) => (
                  <div key={report.id} style={styles.reportCard}>
                    <div style={styles.reportHeader}>
                      <div style={styles.reportAvatar}>
                        {report.reportedUserAvatar ? (
                          <img src={report.reportedUserAvatar} alt="" style={styles.avatarImg} />
                        ) : (
                          report.reportedUserDisplayName?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <div style={styles.reportInfo}>
                        <div style={styles.reportedUser}>@{report.reportedUserDisplayName}</div>
                        <div style={styles.reportReason}>{report.reason}</div>
                        <div style={styles.reportDate}>{formatDate(report.createdAt)}</div>
                      </div>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: report.status === 'pending' ? '#0891b2' : report.status === 'resolved' ? '#22c55e' : '#ef4444',
                      }}>
                        {report.status}
                      </span>
                    </div>

                    {report.contentPreview && (
                      <div style={styles.contentPreview}>
                        <p style={styles.previewText}>{report.contentPreview}</p>
                      </div>
                    )}

                    <div style={styles.reportActions}>
                      <button
                        onClick={() => handleDismissReport(report.id)}
                        style={styles.dismissButton}
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleWarnUser(report.reportedUserId, 'You have received a warning for violating community guidelines.')}
                        style={styles.warnButton}
                      >
                        Warn User
                      </button>
                      <button
                        onClick={() => handleBanUser(report.reportedUserId, report.reason)}
                        style={styles.banButton}
                      >
                        Ban User
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'bots' && (
          <div style={styles.section}>
            {botFlags.length === 0 ? (
              <p style={styles.emptyText}>No bot flags detected</p>
            ) : (
              <div style={styles.botsList}>
                {botFlags.map((flag) => (
                  <div key={flag.id} style={styles.botCard}>
                    <div style={styles.botHeader}>
                      <div style={styles.botAvatar}>
                        {flag.userAvatar ? (
                          <img src={flag.userAvatar} alt="" style={styles.avatarImg} />
                        ) : (
                          flag.userDisplayName?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <div style={styles.botInfo}>
                        <div style={styles.botName}>@{flag.userDisplayName}</div>
                        <div style={styles.botReason}>{flag.reason}</div>
                        <div style={styles.botDate}>{formatDate(flag.flaggedAt)}</div>
                      </div>
                      <span style={styles.botScore}>
                        Bot Score: {(flag.botScore || 0).toFixed(2)}
                      </span>
                    </div>
                    <div style={styles.botActions}>
                      <button
                        onClick={() => handleBanUser(flag.userId, 'Automated bot activity detected')}
                        style={styles.banButton}
                      >
                        Ban Bot
                      </button>
                      <button
                        onClick={() => handleDismissReport(flag.id)}
                        style={styles.dismissButton}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #2d2d2d',
  },
  tab: {
    flex: 1,
    padding: '16px',
    backgroundColor: 'transparent',
    color: '#a0a0a0',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
  },
  section: {
    padding: '24px',
  },
  emptyText: {
    color: '#a0a0a0',
    fontSize: '14px',
    textAlign: 'center',
    padding: '40px 20px',
  },
  reportsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  reportCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #2d2d2d',
    padding: '16px',
  },
  reportHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  reportAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#0891b2',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  reportInfo: {
    flex: 1,
  },
  reportedUser: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
  },
  reportReason: {
    fontSize: '13px',
    color: '#a0a0a0',
  },
  reportDate: {
    fontSize: '12px',
    color: '#6b6b6b',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  contentPreview: {
    padding: '12px',
    backgroundColor: '#262626',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  previewText: {
    fontSize: '13px',
    color: '#a0a0a0',
    lineHeight: '1.5',
  },
  reportActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  dismissButton: {
    backgroundColor: 'transparent',
    color: '#a0a0a0',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    border: '1px solid #2d2d2d',
  },
  warnButton: {
    backgroundColor: '#262626',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    border: '1px solid #2d2d2d',
  },
  banButton: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    border: 'none',
  },
  botsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  botCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #2d2d2d',
    padding: '16px',
  },
  botHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  botAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#0891b2',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
    flexShrink: 0,
    overflow: 'hidden',
  },
  botInfo: {
    flex: 1,
  },
  botName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
  },
  botReason: {
    fontSize: '13px',
    color: '#a0a0a0',
  },
  botDate: {
    fontSize: '12px',
    color: '#6b6b6b',
  },
  botScore: {
    fontSize: '12px',
    color: '#ef4444',
    fontWeight: '600',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  botActions: {
    display: 'flex',
    gap: '8px',
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

export default Moderation
