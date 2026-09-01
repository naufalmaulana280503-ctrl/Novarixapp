import React, { useEffect, useState } from 'react'
import supabase from '../services/supabase'
import { useNotification } from '../context/NotificationContext'

const PAGE_SIZE = 20

const prettyJson = (j) => {
  try { return JSON.stringify(j, null, 2) } catch { return String(j) }
}

const AuditRow = ({ row }) => {
  return (
    <div style={{ padding: 12, borderRadius: 10, backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
      <div>
        <div style={{ fontWeight: 700 }}>{row.change_type.toUpperCase()}</div>
        <div style={{ color: 'var(--text-secondary)', marginTop: 6 }}>By: {row.changed_by || 'system'} • {new Date(row.created_at).toLocaleString()}</div>
        {row.reason && <div style={{ marginTop: 6, color: 'var(--text-secondary)' }}>Reason: {row.reason}</div>}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', overflowX: 'auto' }}>
        <div style={{ marginBottom: 8 }}><strong>Old:</strong></div>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{prettyJson(row.old_data)}</pre>
        <div style={{ marginTop: 8 }}><strong>New:</strong></div>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{prettyJson(row.new_data)}</pre>
      </div>
    </div>
  )
}

const AdminAudit = () => {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const { notify } = useNotification()

  const fetchPage = async (p = 1) => {
    setLoading(true)
    try {
      const from = (p - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const { data, error, count } = await supabase
        .from('verification_audit')
        .select('id, request_id, change_type, changed_by, old_data, new_data, reason, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      setRows(data || [])
      setTotal(typeof count === 'number' ? count : (data || []).length)
      setPage(p)
    } catch (err) {
      console.error('Failed to fetch audit', err)
      notify({ title: 'Error', message: 'Failed to load audit logs', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPage(1) }, [])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin — Audit Log</h2>
      <p style={{ color: 'var(--text-secondary)' }}>All changes to verification requests are recorded here. Only admins can access this page.</p>

      <div style={{ marginTop: 16 }}>
        {loading ? <div>Loading...</div> : (
          <div style={{ display: 'grid', gap: 12 }}>
            {rows.map(r => <AuditRow key={r.id} row={r} />)}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
        <button disabled={page <= 1} onClick={() => fetchPage(page - 1)} style={{ padding: '8px 12px', background: 'transparent', color: 'var(--text-secondary)' }}>Prev</button>
        <div style={{ color: 'var(--text-secondary)' }}>Page {page} / {totalPages}</div>
        <button disabled={page >= totalPages} onClick={() => fetchPage(page + 1)} style={{ padding: '8px 12px', background: 'var(--accent)', color: 'var(--text-primary)', borderRadius: 8 }}>Next</button>
      </div>
    </div>
  )
}

export default AdminAudit
