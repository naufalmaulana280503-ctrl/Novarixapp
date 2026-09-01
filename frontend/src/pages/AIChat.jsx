import React, { useState, useEffect, useRef } from 'react'
import { aiApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Heart, Mic, Paperclip, Sparkles, Volume2, VolumeX, X } from 'lucide-react'

const MAX_HISTORY_MESSAGES = 10

const SUGGESTION_CHIPS = [
  'Gimana cara upload video di Novarix?',
  'Bagi resep nasi goreng spesial dong',
  'Apa panduan komunitas Novarix?',
  'Curhat soal gebetan, tapi takut ditolak',
  'Lirik lagu Juicy Luicy yang lagi hits?',
  'Ide konten postingan buat hari ini',
]

const AIChat = () => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [attachment, setAttachment] = useState(null)
  const [attachmentPreview, setAttachmentPreview] = useState('')
  const [error, setError] = useState('')
  const [conversationId, setConversationId] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const { currentUser } = useAuth()
  const storageKey = currentUser?.id ? `novarix-ai-chat-${currentUser.id}` : 'novarix-ai-chat-guest'
  const convIdStorageKey = currentUser?.id ? `novarix-ai-convid-${currentUser.id}` : 'novarix-ai-convid-guest'

  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(storageKey)
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages)
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed)
      }
      const savedConvId = localStorage.getItem(convIdStorageKey)
      if (savedConvId) setConversationId(savedConvId)
    } catch (err) {
      console.warn('Failed to restore AI chat state:', err)
    }
  }, [storageKey, convIdStorageKey])

  useEffect(() => {
    try {
      if (!messages.length) localStorage.removeItem(storageKey)
      else localStorage.setItem(storageKey, JSON.stringify(messages.slice(-50)))
    } catch (err) {
      console.warn('Failed to persist AI chat history:', err)
    }
  }, [messages, storageKey])

  useEffect(() => {
    try {
      if (conversationId) localStorage.setItem(convIdStorageKey, conversationId)
    } catch { /* noop */ }
  }, [conversationId, convIdStorageKey])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() && !attachment) return

    const messageText = input.trim() || 'Tolong analisis lampiran ini.'
    const fileForRequest = attachment
    const userMessage = { id: Date.now(), text: messageText, sender: 'user', attachment: fileForRequest?.name }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setAttachment(null)
    setAttachmentPreview('')
    setError('')
    setLoading(true)

    try {
      const historyForRequest = [...messages, userMessage].slice(-MAX_HISTORY_MESSAGES).map((entry) => ({
        sender: entry.sender,
        text: entry.text,
      }))
      const nextConvId = conversationId || `ai-${currentUser?.id || 'guest'}-${Date.now().toString(36)}`

      const res = await aiApi.chat(messageText, fileForRequest, {
        conversationId: nextConvId,
        history: historyForRequest,
      })

      if (!conversationId && res.data?.conversation_id) setConversationId(res.data.conversation_id)
      else if (!conversationId) setConversationId(nextConvId)

      const aiMessage = {
        id: Date.now() + 1,
        text: res.data.reply || res.data.message || 'Waduh lagi nge-lag nih, coba lagi bentar ya ✨',
        sender: 'ai',
      }
      setMessages((prev) => [...prev, aiMessage])
      if (voiceEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(aiMessage.text)
        utterance.lang = /[\u4e00-\u9fff]/.test(input) ? 'zh-CN' : (/\b(the|and|you|how|what)\b/i.test(input) ? 'en-US' : 'id-ID')
        utterance.rate = 0.96
        utterance.pitch = 1.05
        window.speechSynthesis.speak(utterance)
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'AI Companion lagi offline bentar, coba lagi dong 🙏')
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        text: 'Waduh internet atau servernya lagi gangguan deh 😭 Coba kirim ulang sebentar lagi ya!',
        sender: 'ai',
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion)
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const isImage = file.type.startsWith('image/')
    const maxBytes = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024
    if (file.size > maxBytes) {
      setError(`Kegedean filenya dong. Maksimal ${isImage ? '10MB buat foto' : '50MB buat dokumen'}, ya.`)
      event.target.value = ''
      return
    }
    setAttachment(file)
    setError('')
    setAttachmentPreview(isImage ? URL.createObjectURL(file) : '')
    event.target.value = ''
  }

  const removeAttachment = () => {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview)
    setAttachment(null)
    setAttachmentPreview('')
  }

  return (
    <div style={styles.container}>
      <div style={styles.sidebarSpacer}></div>
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <h1 style={styles.title}><Sparkles size={22} /> AI Companion</h1>
          <p style={styles.subtitle}>Temen curhat asik, ngasih ide, resep, lirik lagu, semua ada.</p>
          <button type="button" onClick={() => setVoiceEnabled((enabled) => !enabled)} style={styles.voiceButton} title={voiceEnabled ? 'Matikan suara AI' : 'Nyalakan suara AI'} aria-pressed={voiceEnabled}>
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            {voiceEnabled ? 'Suara ON' : 'Suara OFF'}
          </button>
        </div>

        <div style={styles.chatContainer}>
          {messages.length === 0 && (
            <div style={styles.welcomeSection}>
              <div style={styles.welcomeIcon}><Heart size={34} fill="currentColor" /></div>
              <h2 style={styles.welcomeTitle}>Hai, {currentUser?.displayName || 'temen'} 👋</h2>
              <p style={styles.welcomeText}>Gue disini temen curhat paling amanah, ga bakal ngehukum lu. Mau curhat pacar, minta resep masak, lirik lagu, atau ide konten? Semua boleh, mulai aja! ✨</p>
              <div style={styles.suggestions}>
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSuggestionClick(chip)}
                    style={styles.chip}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={styles.messagesList}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  ...styles.message,
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {msg.sender === 'ai' && (
                  <div style={styles.aiAvatar}><Heart size={16} fill="currentColor" /></div>
                )}
                <div
                  style={{
                    ...styles.messageBubble,
                    backgroundColor: msg.sender === 'user' ? '#0891b2' : '#262626',
                  }}
                >
                  {msg.attachment && <small style={styles.attachmentLabel}>Lampiran: {msg.attachment}</small>}
                  <p style={styles.messageText}>{msg.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ ...styles.message, alignSelf: 'flex-start' }}>
                <div style={styles.aiAvatar}><Heart size={16} fill="currentColor" /></div>
                <div style={{ ...styles.messageBubble, backgroundColor: '#262626' }}>
                  <div style={styles.typingIndicator}>
                    <span style={styles.typingDot}></span>
                    <span style={styles.typingDot}></span>
                    <span style={styles.typingDot}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={handleSend} style={styles.inputForm}>
          {error && <p role="alert" style={styles.error}>{error}</p>}
          {attachment && (
            <div style={styles.attachmentPreview}>
              {attachmentPreview ? <img src={attachmentPreview} alt="Pratinjau lampiran" style={styles.previewImage} /> : <Paperclip size={18} />}
              <span>{attachment.name}</span>
              <button type="button" onClick={removeAttachment} aria-label="Hapus lampiran" style={styles.removeAttachment}><X size={16} /></button>
            </div>
          )}
          <div style={styles.inputRow}>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onChange={handleFileChange} style={styles.hiddenFileInput} />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading} style={styles.attachButton} aria-label="Lampirkan foto atau dokumen" title="Lampirkan foto atau dokumen">
              <Paperclip size={19} />
            </button>
            <input
              type="text"
              placeholder="Curhat apa hari ini? Atau minta resep / lirik lagu?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={styles.input}
            />
            <button type="submit" disabled={loading || (!input.trim() && !attachment)} style={styles.sendButton}>
              <Mic size={17} /> Kirim
            </button>
          </div>
        </form>
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
    maxWidth: '700px',
    margin: '0 auto',
    paddingTop: '60px',
    borderLeft: '1px solid #2d2d2d',
    borderRight: '1px solid #2d2d2d',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #2d2d2d',
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: '14px',
    color: '#a0a0a0',
  },
  voiceButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '12px',
    padding: '8px 10px',
    backgroundColor: '#262626',
    color: '#ffffff',
    border: '1px solid #3d3d3d',
    borderRadius: '8px',
    fontSize: '12px',
  },
  chatContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  },
  welcomeSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  welcomeIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '8px',
  },
  welcomeText: {
    fontSize: '14px',
    color: '#a0a0a0',
    marginBottom: '24px',
  },
  suggestions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
    maxWidth: '500px',
  },
  chip: {
    backgroundColor: '#262626',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    border: '1px solid #2d2d2d',
    cursor: 'pointer',
  },
  messagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  message: {
    display: 'flex',
    gap: '8px',
    maxWidth: '80%',
  },
  aiAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#0891b2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
  },
  messageBubble: {
    padding: '12px 16px',
    borderRadius: '16px',
    maxWidth: '100%',
  },
  messageText: {
    fontSize: '14px',
    color: '#ffffff',
    lineHeight: '1.5',
    margin: 0,
  },
  typingIndicator: {
    display: 'flex',
    gap: '4px',
    padding: '4px 0',
  },
  typingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#a0a0a0',
    animation: 'typing 1.4s infinite ease-in-out both',
  },
  inputForm: {
    padding: '16px 24px',
    borderTop: '1px solid #2d2d2d',
  },
  inputRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#262626',
    border: '1px solid #2d2d2d',
    borderRadius: '20px',
    padding: '12px 16px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
  },
  sendButton: {
    backgroundColor: '#0891b2',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
  },
  hiddenFileInput: {
    display: 'none',
  },
  attachButton: {
    width: '42px',
    height: '42px',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #3d3d3d',
    borderRadius: '50%',
    backgroundColor: '#262626',
    color: '#ffffff',
    cursor: 'pointer',
  },
  attachmentPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
    padding: '8px 10px',
    border: '1px solid #3d3d3d',
    borderRadius: '10px',
    color: '#d4d4d4',
    fontSize: '12px',
  },
  previewImage: {
    width: '42px',
    height: '42px',
    objectFit: 'cover',
    borderRadius: '6px',
  },
  removeAttachment: {
    display: 'inline-flex',
    marginLeft: 'auto',
    border: 0,
    background: 'transparent',
    color: '#ffffff',
    cursor: 'pointer',
  },
  attachmentLabel: {
    display: 'block',
    marginBottom: '6px',
    color: '#67e8f9',
  },
  error: {
    margin: '0 0 10px',
    color: '#fca5a5',
    fontSize: '12px',
  },
  rightSpacer: {
    width: '320px',
    flexShrink: 0,
    display: 'none',
  },
}

export default AIChat
