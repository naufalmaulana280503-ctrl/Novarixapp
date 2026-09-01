import React from 'react'
import PostComposer from '../components/PostComposer'

const Upload = () => {
  return (
    <div className="upload-page" style={styles.container}>
      <div className="upload-sidebar-spacer" style={styles.sidebarSpacer}></div>
      <div className="upload-main" style={styles.mainContent}>
        <div style={styles.pageHeader}>
          <h1 style={styles.title}>Upload</h1>
        </div>
        <PostComposer />
      </div>
      <div style={styles.rightSpacer}></div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary, #0f0f0f)',
  },
  sidebarSpacer: {
    width: '240px',
    flexShrink: 0,
  },
  mainContent: {
    flex: 1,
    maxWidth: '600px',
    margin: '0 auto',
    paddingTop: '60px',
    borderLeft: '1px solid var(--border-color, #2d2d2d)',
    borderRight: '1px solid var(--border-color, #2d2d2d)',
    minHeight: '100vh',
  },
  pageHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-color, #2d2d2d)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'var(--text-primary, #ffffff)',
  },
  rightSpacer: {
    width: '320px',
    flexShrink: 0,
    display: 'none',
  },
}

export default Upload
