import { useState } from 'react'
import { Link } from 'react-router-dom'
import ModernNavbar from '../components/ModernNavbar'

const Landing = () => {
  const [showSignup, setShowSignup] = useState(false)

  return (
    <div style={styles.page}>
      <ModernNavbar transparent />

      <header style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.brand}>
            <h1 style={styles.title}>Novarix</h1>
            <p style={styles.tagline}>Connect. Create. Captivate — Social in motion.</p>
          </div>

          <div style={styles.ctaGroup}>
            <Link to="/login" style={styles.ctaPrimary}>Log in</Link>
            <button style={styles.ctaSecondary} onClick={() => setShowSignup(true)}>Create account</button>
          </div>
        </div>

        <div style={styles.heroDecor} aria-hidden>
          <div style={styles.glow}></div>
          <svg width="0" height="0" style={{position:'absolute'}}>
            <defs>
              <filter id="soft-glow">
                <feGaussianBlur stdDeviation="30" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.features}>
          <h2 style={styles.featuresTitle}>A feature-rich social experience</h2>
          <p style={styles.featuresSubtitle}>Rich feed — Short videos — Live streaming — Profile customizations — Neo-dark design</p>

          <div style={styles.featureGrid}>
            <div style={styles.featureCard}>
              <strong>Dynamic Feed</strong>
              <p>Text, images, and short-form video content with powerful interactions: like, comment, share, and gifts.</p>
            </div>
            <div style={styles.featureCard}>
              <strong>Custom Profiles</strong>
              <p>Avatar, banners, badges, and decorative borders to express yourself.</p>
            </div>
            <div style={styles.featureCard}>
              <strong>Live Streaming</strong>
              <p>Portrait & landscape modes, integrated music player, and interactive live chat.</p>
            </div>
            <div style={styles.featureCard}>
              <strong>Modern Design</strong>
              <p>Dark mode with neon accents, glassmorphism, and responsive layouts for every device.</p>
            </div>
          </div>
        </section>

        <section style={styles.footerCTA}>
          <div style={styles.footerInner}>
            <h3 style={{margin:0}}>Ready to join Novarix?</h3>
            <div style={{display:'flex', gap:12, marginTop:12}}>
              <Link to="/register" style={styles.ctaPrimary}>Sign up</Link>
              <Link to="/feed" style={styles.ctaLink}>Explore Feed</Link>
            </div>
          </div>
        </section>
      </main>

      {showSignup && (
        <div style={styles.modalOverlay}>
          <div style={styles.signupModal}>
            <h3>Create your Novarix account</h3>
            <p style={{color:'#cfcfe0'}}>Signup is live in the app. Use Register to create an account.</p>
            <div style={{display:'flex', gap:12, marginTop:16}}>
              <Link to="/register" style={styles.ctaPrimary}>Register</Link>
              <button onClick={() => setShowSignup(false)} style={styles.ctaSecondary}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #05060a 0%, #0b0c11 100%)',
    color: '#e6e6ef',
    fontFamily: 'Inter, system-ui, -apple-system, Roboto, "Segoe UI", sans-serif',
  },
  hero: {
    padding: '36px 24px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(6px)',
  },
  heroInner: {
    width: '100%',
    maxWidth: 1200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    padding: '20px',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.04)',
    boxShadow: '0 6px 30px rgba(0,0,0,0.6)',
  },
  brand: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  title: {
    fontSize: 48,
    margin: 0,
    fontWeight: 800,
    letterSpacing: '-1px',
    color: 'linear-gradient(90deg, #a78bfa, #06b6d4)'
  },
  tagline: {
    margin: 0,
    color: '#9aa0c7',
  },
  ctaGroup: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  ctaPrimary: {
    background: 'linear-gradient(90deg,#0891b2,#06b6d4)',
    color: '#000',
    padding: '12px 20px',
    borderRadius: 12,
    textDecoration: 'none',
    fontWeight: 700,
  },
  ctaSecondary: {
    background: 'transparent',
    color: '#e6e6ef',
    padding: '10px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.06)',
    cursor: 'pointer',
    fontWeight: 600,
  },
  heroDecor: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 420,
    height: 420,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 30% 30%, rgba(8,145,178,0.18), rgba(6,182,212,0.08), rgba(0,0,0,0))',
    filter: 'blur(30px)',
    transform: 'translateY(20px)',
  },
  main: {
    padding: '40px 20px',
    maxWidth: 1200,
    margin: '0 auto',
  },
  features: {
    textAlign: 'center',
    marginBottom: 36,
  },
  featuresTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
  },
  featuresSubtitle: {
    color: '#9aa0c7',
    marginTop: 8,
    marginBottom: 18,
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
    gap: 16,
  },
  featureCard: {
    padding: 18,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.03)',
    textAlign: 'left',
  },
  footerCTA: {
    marginTop: 28,
    padding: 20,
    borderRadius: 12,
    background: 'linear-gradient(90deg, rgba(124,58,237,0.06), rgba(6,182,212,0.02))',
    border: '1px solid rgba(255,255,255,0.02)',
  },
  footerInner: {
    maxWidth: 1000,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  signupModal: {
    background: '#0f0f13',
    padding: 20,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.04)',
    maxWidth: 480,
    textAlign: 'center',
  }
}

export default Landing
