import React from 'react'
import { Link } from 'react-router-dom'

const AdminNav = () => (
  <nav style={{display:'flex', gap:12, padding:12, borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
    <Link to="/admin/verification" style={{color:'#fff', textDecoration:'none', fontWeight:700}}>Verification</Link>
    <Link to="/admin/users" style={{color:'#ccc', textDecoration:'none'}}>Users</Link>
  </nav>
)

export default AdminNav
