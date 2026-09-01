import React from 'react'

const SaturnLogo = ({ size = 80 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="starGrad" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="43" fill="#11131a" />
      <path d="M50 10 59 39 90 50 59 61 50 90 41 61 10 50 41 39Z" fill="url(#starGrad)" filter="url(#starGlow)" />
      <path d="m50 24 4 22 22 4-22 4-4 22-4-22-22-4 22-4Z" fill="#fff" opacity=".9" />
    </svg>
  )
}

export default SaturnLogo