import React from 'react'

const FX = [
  { id:'none', name:'None' },
  { id:'novarix', name:'✨ Novarix' },
  { id:'neon', name:'Neon Grade' },
  { id:'grayscale', name:'Grayscale' },
]

export default function EffectsLibrary({ selected, onSelect }) {
  return (
    <div style={{padding:8,background:'rgba(0,0,0,0.5)',borderRadius:8,color:'#fff'}}>
      <h4 style={{margin:'4px 0'}}>Effects</h4>
      <div style={{display:'flex',gap:8}}>
        {FX.map(f => (
          <button key={f.id} onClick={()=>onSelect && onSelect(f.id)} style={selected===f.id?activeBtn:btn}>{f.name}</button>
        ))}
      </div>
    </div>
  )
}

const btn = { padding:'6px 10px', borderRadius:8, background:'#1f1f1f', color:'#ddd', border:'1px solid #2d2d2d' }
const activeBtn = { ...btn, border:'1px solid #0891b2', boxShadow:'0 0 10px rgba(8,145,178,0.15)' }
