import React, { useState, useEffect } from 'react'
import { verificationApi } from '../services/api'
import { checkBlueEligibility, checkGoldEligibility, checkPurpleEligibility } from '../utils/verification'

const VerificationRequestModal = ({ user, onClose, onSubmitted }) => {
  const [selectedTier, setSelectedTier] = useState('blue')
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [blueInfo, setBlueInfo] = useState(null)
  const [goldInfo, setGoldInfo] = useState(null)
  const [purpleInfo, setPurpleInfo] = useState(null)
  const [documents, setDocuments] = useState(null)

  useEffect(() => {
    setBlueInfo(checkBlueEligibility(user || {}))
    setGoldInfo(checkGoldEligibility(user || {}))
    setPurpleInfo(checkPurpleEligibility(user || {}))

    // fetch authoritative eligibility from server if possible
    const fetchServer = async () => {
      try {
        if (!user?.id) return
        const res = await verificationApi.checkEligibility(user.id)
        const data = res.data
        // merge server data if present
        if (data) {
          setBlueInfo(prev => ({ ...prev, eligible: data.blue?.eligible, followers: data.followers, likes: data.likes, followersProgress: Math.min(1, data.followers / (data.blue?.required?.followers || 1)), likesProgress: Math.min(1, data.likes / (data.blue?.required?.likes || 1)) }))
          setGoldInfo(prev => ({ ...prev, eligible: data.gold?.eligible, isPartner: data.gold?.partner, hasBusinessDocs: data.gold?.businessVerified, followers: data.followers }))
          setPurpleInfo(prev => ({ ...prev, eligible: data.purple?.eligible }))
        }
      } catch (err) {
        // ignore server errors, keep client-side heuristics
      }
    }
    fetchServer()
  }, [user])

  const handleFile = (e) => {
    setDocuments(e.target.files?.[0] || null)
  }

  const canRequest = () => {
    if (selectedTier === 'blue') return blueInfo?.eligible
    if (selectedTier === 'gold') return goldInfo?.isPartner || goldInfo?.hasBusinessDocs || goldInfo?.followers >= goldInfo?.required?.followers
    if (selectedTier === 'purple') return purpleInfo?.eligible
    return false
  }

  const submitRequest = async () => {
    if (!canRequest()) {
      setStatusMessage('You do not meet the eligibility requirements for the selected tier.')
      return
    }

    setSubmitting(true)
    setStatusMessage(null)

    try {
      // Prepare form data if documents included
      const payload = new FormData()
      payload.append('userId', user?.id || user?._id || '')
      payload.append('tier', selectedTier)
      if (documents) payload.append('document', documents)

      // call server endpoint (server must implement /verification/request)
      await verificationApi.submitRequest(payload)

      setStatusMessage('Request submitted successfully. Our team will review it shortly.')
      if (onSubmitted) onSubmitted()
    } catch (err) {
      console.error(err)
      setStatusMessage(err?.response?.data?.message || 'Failed to submit request. Try again later.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal} role="dialog" aria-modal="true">
        <div style={styles.header}>
          <h3>Request Verified Badge</h3>
          <button onClick={onClose} style={styles.close}>✕</button>
        </div>

        <div style={styles.body}>
          <div style={styles.row}>
            <div style={styles.left}>
              <div style={styles.section}>
                <label style={styles.label}>Select Tier</label>
                <div style={styles.tiers}>
                  <button onClick={() => setSelectedTier('blue')} style={{...styles.tierBtn, ...(selectedTier==='blue'?styles.tierActive:{} )}}>Blue (Creator)</button>
                  <button onClick={() => setSelectedTier('gold')} style={{...styles.tierBtn, ...(selectedTier==='gold'?styles.tierActive:{} )}}>Gold (Brand)</button>
                  <button onClick={() => setSelectedTier('purple')} style={{...styles.tierBtn, ...(selectedTier==='purple'?styles.tierActive:{} )}}>Cyan Elite</button>
                </div>
              </div>

              <div style={styles.section}>
                <label style={styles.label}>Your Progress</label>

                <div style={styles.progressRow}>
                  <div>Followers</div>
                  <div style={styles.progressBarWrap}>
                    <div style={{...styles.progressBar, width: `${Math.round((blueInfo?.followersProgress||0)*100)}%`}}></div>
                  </div>
                  <div style={styles.progressText}>{(blueInfo?.followers||0).toLocaleString()}</div>
                </div>

                <div style={styles.progressRow}>
                  <div>Likes</div>
                  <div style={styles.progressBarWrap}>
                    <div style={{...styles.progressBar, width: `${Math.round((blueInfo?.likesProgress||0)*100)}%`, background:'#F59E0B'}}></div>
                  </div>
                  <div style={styles.progressText}>{(blueInfo?.likes||0).toLocaleString()}</div>
                </div>

                <div style={{marginTop:12}}>
                  <small style={{color:'#9aa0c7'}}>Blue requires 30,000,000 followers and 30,000,000 likes.</small>
                </div>

                <div style={{marginTop:12}}>
                  <small style={{color:'#9aa0c7'}}>Gold requires business documents; followers threshold ~10,000,000 or partner status.</small>
                </div>

                <div style={{marginTop:12}}>
                  <small style={{color:'#9aa0c7'}}>Cyan Elite is invite-only.</small>
                </div>
              </div>

            </div>

            <div style={styles.right}>
              <div style={styles.infoCard}>
                <h4 style={{marginTop:0}}>Tier Details</h4>
                {selectedTier === 'blue' && (
                  <div>
                    <p>Blue: Verified Creator — automatic eligibility based on metrics.</p>
                    <p style={{color: blueInfo?.eligible ? '#22c55e' : '#f97316'}}>{blueInfo?.eligible ? 'Eligible' : 'Not yet eligible'}</p>
                  </div>
                )}

                {selectedTier === 'gold' && (
                  <div>
                    <p>Gold: Official Brand — requires submission of legal business documents.</p>
                    <p style={{color: goldInfo?.eligible ? '#22c55e' : '#f97316'}}>{goldInfo?.eligible ? 'Eligible (docs verified)' : (goldInfo?.hasBusinessDocs ? 'Docs submitted (awaiting verification)' : 'Requires business documents')}</p>
                    <div style={{marginTop:8}}>
                      <label style={{display:'block', marginBottom:6}}>Upload business document (PDF/JPG)</label>
                      <input type="file" accept="application/pdf,image/*" onChange={handleFile} />
                    </div>
                  </div>
                )}

                {selectedTier === 'purple' && (
                  <div>
                    <p>Cyan Elite: Invite-only. If you have been invited, you can request and team will validate.</p>
                    <p style={{color: purpleInfo?.eligible ? '#22c55e' : '#f97316'}}>{purpleInfo?.eligible ? 'Invite found' : 'Invite required'}</p>
                  </div>
                )}

                {statusMessage && <div style={{marginTop:12, color:'#ffdcdc'}}>{statusMessage}</div>}

                <div style={{display:'flex', justifyContent:'flex-end', marginTop:12, gap:8}}>
                  <button onClick={onClose} style={styles.btn}>Cancel</button>
                  <button disabled={!canRequest() || submitting} onClick={submitRequest} style={{...styles.btnPrimary, opacity: (!canRequest()||submitting)?0.6:1}}>
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1001 },
  modal: { width:'min(980px,95%)', background:'#0b0c10', border:'1px solid rgba(255,255,255,0.03)', borderRadius:12, padding:16 },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  close: { background:'transparent', border:'none', color:'#9aa0c7', fontSize:18, cursor:'pointer' },
  body: {},
  row: { display:'flex', gap:12 },
  left: { flex:1 },
  right: { width: 360 },
  section: { marginBottom:12 },
  label: { display:'block', marginBottom:8, fontWeight:700 },
  tiers: { display:'flex', gap:8 },
  tierBtn: { padding:'8px 10px', borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.04)', color:'#e6e6ef', cursor:'pointer' },
  tierActive: { boxShadow:'0 6px 18px rgba(8,145,178,0.12)', border:'1px solid rgba(8,145,178,0.6)', background:'linear-gradient(90deg, rgba(8,145,178,0.08), rgba(6,182,212,0.04))' },
  progressRow: { display:'flex', alignItems:'center', gap:8, marginTop:8 },
  progressBarWrap: { flex:1, height:10, background:'rgba(255,255,255,0.04)', borderRadius:999, overflow:'hidden' },
  progressBar: { height:10, background:'#0891b2' },
  progressText: { width:110, textAlign:'right', color:'#9aa0c7', fontSize:13 },
  infoCard: { background:'rgba(255,255,255,0.01)', padding:12, borderRadius:8, border:'1px solid rgba(255,255,255,0.02)' },
  btn: { padding:'8px 12px', borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.04)', color:'#e6e6ef', cursor:'pointer' },
  btnPrimary: { padding:'8px 12px', borderRadius:8, background:'linear-gradient(90deg,#0891b2,#06b6d4)', border:'none', color:'#fff', cursor:'pointer' }
}

export default VerificationRequestModal
