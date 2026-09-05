import React from 'react'

const FX = [
  { id: 'none', name: 'None' },
  { id: 'novarix', name: '✨ Novarix' },
  { id: 'neon', name: 'Neon Grade' },
  { id: 'grayscale', name: 'Grayscale' },
]

export default function EffectsLibrary({ selected, onSelect }) {
  return (
    <div className="p-2 rounded-xl bg-black/80 backdrop-blur border border-white/10" style={{ minWidth: 160 }}>
      <div className="flex flex-wrap gap-1.5 justify-center">
        {FX.map(f => (
          <button
            key={f.id}
            onClick={() => onSelect?.(f.id)}
            className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
              selected === f.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10 hover:text-neutral-200'
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>
    </div>
  )
}
