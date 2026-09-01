import React from 'react'
import './VerifiedBadge.css'

const tierColors = {
  blue: '#1D9BF0',
  gold: '#F59E0B',
  purple: '#0891b2',
}

const VerifiedBadge = ({ tier = 'blue', size = 18, title }) => {
  const cls = `verified-badge verified-badge--${tier}`
  const background = tierColors[tier] || tierColors.blue

  return (
    <span
      className={cls}
      title={title || (tier === 'gold' ? 'Official Brand' : tier === 'purple' ? 'Cyan Elite' : 'Verified Creator')}
      role="img"
      aria-label="verified badge"
      style={{ width: size, height: size, backgroundColor: background }}
    >
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size} aria-hidden>
        <path d="M9.2 12.6l1.8 1.8L15 10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </span>
  )
}

export default VerifiedBadge
