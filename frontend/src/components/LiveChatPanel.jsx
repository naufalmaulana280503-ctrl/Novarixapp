import React, { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '../services/supabase'

const BLACKLIST = ['anjing', 'bangsat', 'kontol', 'seks', 'porno', 'fuck', 'bitch', 'sex']

function sanitizeMessage(input) {
  const text = String(input || '').trim()
  if (!text) return ''

  const lowered = text.toLowerCase()
  const isBlocked = BLACKLIST.some((word) => lowered.includes(word))
  return isBlocked ? '[Pesan disensor karena melanggar aturan]' : text
}

const LiveChatPanel = ({ streamId = 'global', viewerCount = 0, currentUser = null }) => {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [pinnedMessageId, setPinnedMessageId] = useState(null)
  const chanRef = useRef(null)

  useEffect(() => {
    let mounted = true

    if (!supabase) return

    // initial load last 50 messages
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('live_chats')
          .select('*')
          .eq('stream_id', streamId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error
        if (!mounted) return
        const rows = (data || []).map((r) => ({ id: r.id || Date.now(), user: r.user || 'anon', text: sanitizeMessage(r.message || ''), pinned: Boolean(r.pinned) }))
        setMessages(rows.reverse())
        const pinned = rows.find((row) => row.pinned)
        if (pinned) setPinnedMessageId(pinned.id)
      } catch (err) {
        console.warn('failed to load chat messages', err)
      }
    })()

    // subscribe to real-time inserts on live_chats for this stream
    try {
      chanRef.current = supabase.channel(`room_live_${streamId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_chats', filter: `stream_id=eq.${streamId}` }, (payload) => {
          const newRow = payload.new
          const text = sanitizeMessage(newRow.message || '')
          setMessages((prev) => [...prev.slice(-49), { id: newRow.id || Date.now(), user: newRow.user || 'anon', text, pinned: Boolean(newRow.pinned) }])
        })
        .subscribe((status) => {
          // status: SUBSCRIBED, etc.
          // console.log('chat channel status', status)
        })
    } catch (e) {
      console.warn('subscribe chat failed', e)
    }

    return () => {
      mounted = false
      try { if (chanRef.current) supabase.removeChannel(chanRef.current) } catch (e) {}
    }
  }, [streamId])

  const sendMessage = async () => {
    const trimmed = draft.trim()
    if (!trimmed) return

    const filtered = sanitizeMessage(trimmed)

    // optimistic UI
    setMessages((prev) => [...prev.slice(-49), { id: Date.now(), user: currentUser?.username || 'You', text: filtered }])
    setDraft('')

    if (!supabase) return

    try {
      const payload = { stream_id: streamId, user: currentUser?.username || 'guest', message: trimmed }
      await supabase.from('live_chats').insert(payload)
    } catch (err) {
      console.warn('send chat failed', err)
    }
  }

  const viewerLabel = useMemo(() => `${Number(viewerCount).toLocaleString()} viewers`, [viewerCount])
  const pinMessage = async (message) => {
    const nextPinnedId = pinnedMessageId === message.id ? null : message.id
    setPinnedMessageId(nextPinnedId)
    setMessages((prev) => prev.map((item) => ({ ...item, pinned: item.id === nextPinnedId })))
    if (!supabase || typeof message.id !== 'number') return
    try {
      await supabase.from('live_chats').update({ pinned: nextPinnedId === message.id }).eq('id', message.id)
    } catch (err) {
      console.warn('pin chat failed', err)
    }
  }

  return (
    <div style={styles.panel}>
      <div style={styles.headerRow}>
        <div style={styles.headerTitle}>Live Chat</div>
        <div style={styles.viewerPill}>👁️ {viewerLabel}</div>
      </div>

      <div style={styles.chatBody}>
        {pinnedMessageId && messages.find((message) => message.id === pinnedMessageId) && (
          <div style={styles.pinnedBanner}>📌 Komentar disematkan: {messages.find((message) => message.id === pinnedMessageId).text}</div>
        )}
        {messages.map((message) => (
          <div key={message.id} style={{ ...styles.messageRow, ...(message.pinned ? styles.pinnedRow : {}) }}>
            <div style={styles.messageContent}>
              <span style={styles.user}>@{message.user}</span>
              <span style={styles.messageText}>{message.text}</span>
            </div>
            <button type="button" onClick={() => pinMessage(message)} style={styles.pinButton} title={message.pinned ? 'Lepas pin' : 'Pin komentar'}>
              {message.pinned ? '📌' : 'Pin'}
            </button>
          </div>
        ))}
        {!messages.length && <div style={styles.emptyState}>Belum ada komentar. Jadilah yang pertama menyapa.</div>}
      </div>

      <div style={styles.inputRow}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') sendMessage()
          }}
          placeholder="Send a chat message..."
          style={styles.input}
        />
        <button type="button" onClick={sendMessage} style={styles.sendBtn}>Send</button>
      </div>
    </div>
  )
}

const styles = {
  panel: {
    background: 'rgba(10,10,18,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 220,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerTitle: {
    color: '#f8fafc',
    fontWeight: 700,
    fontSize: 14,
  },
  viewerPill: {
    background: 'rgba(16,185,129,0.12)',
    border: '1px solid rgba(16,185,129,0.4)',
    color: '#bbf7d0',
    borderRadius: 999,
    padding: '4px 8px',
    fontSize: 11,
    whiteSpace: 'nowrap',
  },
  chatBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: 120,
    maxHeight: 180,
    overflowY: 'auto',
    paddingRight: 4,
  },
  messageRow: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 8,
    padding: '8px 10px',
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  messageContent: { display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' },
  pinnedRow: { border: '1px solid rgba(250,204,21,0.45)' },
  pinnedBanner: { color: '#fde68a', background: 'rgba(120,53,15,0.35)', borderRadius: 8, padding: '7px 9px', fontSize: 11 },
  pinButton: { border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#fcd34d', borderRadius: 6, padding: '3px 6px', fontSize: 10, cursor: 'pointer' },
  emptyState: { color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '18px 8px' },
  user: {
    color: '#a5b4fc',
    fontWeight: 700,
    fontSize: 11,
  },
  messageText: {
    color: '#e2e8f0',
    fontSize: 12,
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    marginTop: 'auto',
  },
  input: {
    flex: 1,
    minWidth: 0,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(15,23,42,0.8)',
    color: '#f8fafc',
    padding: '8px 10px',
  },
  sendBtn: {
    background: 'linear-gradient(90deg,#0891b2,#06b6d4)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontWeight: 700,
    padding: '8px 12px',
    cursor: 'pointer',
  },
}

export default LiveChatPanel
