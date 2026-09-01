import React from 'react'
import { Sparkles } from 'lucide-react'

const NovarixStarLogo = ({ size = 120 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="33%" stopColor="#06b6d4" />
          <stop offset="66%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
        <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="100" cy="100" r="80" fill="url(#glowGrad)" opacity="0.7" />

      <polygon
        points="100,20 120,78 182,80 132,118 148,180 100,146 52,180 68,118 18,80 80,78"
        fill="url(#starGrad)"
        filter="url(#glowFilter)"
        className="animate-pulse-slow"
      />

      <polygon
        points="100,40 112,72 148,74 120,96 128,132 100,114 72,132 80,96 52,74 88,72"
        fill="white"
        opacity="0.15"
      />

      <circle cx="80" cy="72" r="4" fill="white" opacity="0.6" />
      <circle cx="120" cy="96" r="2.5" fill="white" opacity="0.5" />
      <circle cx="100" cy="114" r="2" fill="white" opacity="0.4" />
    </svg>
  )
}

const SplashScreen = ({ onFinish }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0b0b0e] overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(ellipse at 20% 20%, rgba(56, 189, 248, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(8, 145, 178, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(52, 211, 153, 0.1) 0%, transparent 60%)',
        }}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <Sparkles
            key={i}
            className="absolute w-2 h-2 text-sky-400/40 animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-8 splash-logo-float">
          <div
            aria-hidden="true"
            className="absolute -inset-6 rounded-full nova-gradient-bg nova-animate-gradient blur-3xl opacity-40"
          />
          <div className="relative splash-logo-spin-slow">
            <NovarixStarLogo size={140} />
          </div>
        </div>

        <h1 className="text-5xl font-black tracking-tight nova-gradient-text nova-animate-gradient mb-3 splash-text-pop">
          Novarix
        </h1>

        <p className="text-sm text-neutral-400 font-medium tracking-wider uppercase mb-10 splash-text-fade">
          Social Media Reimagined
        </p>

        <div className="flex items-center gap-2 splash-loader-fade">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-bounce-dot" style={{ animationDelay: '0s' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-bounce-dot" style={{ animationDelay: '0.15s' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce-dot" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2.5s ease-in-out infinite;
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .animate-twinkle {
          animation: twinkle ease-in-out infinite;
        }
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
        .animate-bounce-dot {
          animation: bounce-dot 1.4s ease-in-out infinite;
        }
        .splash-logo-float {
          animation: splashFloat 3s ease-in-out infinite;
        }
        @keyframes splashFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .splash-logo-spin-slow {
          animation: splashSpin 12s linear infinite;
        }
        @keyframes splashSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .splash-text-pop {
          animation: splashPop 0.8s ease-out both;
          animation-delay: 0.3s;
        }
        @keyframes splashPop {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        .splash-text-fade {
          animation: splashFade 0.8s ease-out both;
          animation-delay: 0.6s;
        }
        @keyframes splashFade {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .splash-loader-fade {
          animation: splashFade 0.8s ease-out both;
          animation-delay: 0.9s;
        }
        .splash-exit {
          animation: splashExit 0.5s ease-in forwards;
        }
        @keyframes splashExit {
          0% { opacity: 1; }
          100% { opacity: 0; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}

export default SplashScreen
