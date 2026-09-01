import React, { useState } from 'react'
import { MoreVertical, Reply, Pencil, Trash2, Flag } from 'lucide-react'

const REPORT_CATEGORIES = ['Penipuan', 'Judi online', 'Pencemaran nama baik', 'Pornografi', 'Lainnya']

export default function MessageActions({ message, canEdit, canDeleteForMe = true, onReply, onEdit, onDeleteForMe, onDeleteForEveryone, onReport }) {
  const [open, setOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [category, setCategory] = useState(REPORT_CATEGORIES[0])
  const [details, setDetails] = useState('')

  return (
    <div className="relative self-center">
      <button type="button" onClick={() => setOpen(value => !value)} className="w-7 h-7 rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 flex items-center justify-center" title="Aksi pesan">
        <MoreVertical size={16} />
      </button>
      {open && !reportOpen && (
        <div className="absolute z-30 right-0 bottom-8 w-40 rounded-xl border border-neutral-700 bg-[#1a1a20] p-1 shadow-2xl">
          <button type="button" onClick={() => { onReply(message); setOpen(false) }} className="w-full px-3 py-2 text-left text-xs hover:bg-white/10 flex items-center gap-2"><Reply className="w-3.5 h-3.5" /> Balas</button>
          {canEdit && <button type="button" onClick={() => { onEdit(message); setOpen(false) }} className="w-full px-3 py-2 text-left text-xs hover:bg-white/10 flex items-center gap-2"><Pencil className="w-3.5 h-3.5" /> Edit</button>}
          {canDeleteForMe && <button type="button" onClick={() => { onDeleteForMe(message); setOpen(false) }} className="w-full px-3 py-2 text-left text-xs text-red-300 hover:bg-white/10 flex items-center gap-2"><Trash2 size={14} /> Hapus untuk saya</button>}
          {canEdit && <button type="button" onClick={() => { onDeleteForEveryone(message); setOpen(false) }} className="w-full px-3 py-2 text-left text-xs text-red-300 hover:bg-white/10 flex items-center gap-2"><Trash2 size={14} /> Hapus untuk semua</button>}
          <button type="button" onClick={() => setReportOpen(true)} className="w-full px-3 py-2 text-left text-xs text-amber-300 hover:bg-white/10 flex items-center gap-2"><Flag className="w-3.5 h-3.5" /> Laporkan</button>
        </div>
      )}
      {reportOpen && (
        <form onSubmit={(event) => { event.preventDefault(); onReport(message, category, details); setReportOpen(false); setOpen(false) }} className="absolute z-30 right-0 bottom-8 w-64 rounded-xl border border-neutral-700 bg-[#1a1a20] p-3 shadow-2xl">
          <p className="text-xs font-semibold mb-2">Laporkan pesan</p>
          <select value={category} onChange={event => setCategory(event.target.value)} className="w-full rounded-lg bg-[#101014] border border-neutral-700 px-2 py-2 text-xs mb-2">{REPORT_CATEGORIES.map(item => <option key={item}>{item}</option>)}</select>
          <textarea value={details} onChange={event => setDetails(event.target.value)} minLength={10} required rows={3} placeholder="Jelaskan masalahnya" className="w-full resize-none rounded-lg bg-[#101014] border border-neutral-700 px-2 py-2 text-xs mb-2" />
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setReportOpen(false)} className="px-2 py-1.5 text-xs rounded-lg bg-neutral-800">Batal</button><button type="submit" className="px-2 py-1.5 text-xs rounded-lg bg-amber-500 text-black font-semibold">Kirim</button></div>
        </form>
      )}
    </div>
  )
}
