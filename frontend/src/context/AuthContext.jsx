import React, { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react'
import { api } from '../services/api'
import { supabase } from '../services/supabase'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // app-level UI settings
  const [theme, setThemeState] = useState(() => localStorage.getItem('theme') || 'dark')
  const [antiSpy, setAntiSpyState] = useState(() => {
    const v = localStorage.getItem('antiSpy')
    return v === 'true'
  })
  // privacy settings
  const [privateAccount, setPrivateAccountState] = useState(() => {
    const v = localStorage.getItem('privateAccount')
    return v === 'true'
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    if (token && user) {
      try { setCurrentUser(JSON.parse(user)) } catch (e) { setCurrentUser(null) }
    }
    // initialise privateAccount from user metadata if available
    try {
      const parsed = localStorage.getItem('user')
      if (parsed) {
        const u = JSON.parse(parsed)
        if (u && typeof u.privateAccount !== 'undefined') {
          setPrivateAccountState(Boolean(u.privateAccount))
          localStorage.setItem('privateAccount', u.privateAccount ? 'true' : 'false')
        }
        if (u && Array.isArray(u.blockedAccounts)) {
          localStorage.setItem('blockedAccounts', JSON.stringify(u.blockedAccounts))
        }
      }
    } catch (e) {}
    setLoading(false)
  }, [])

  useEffect(() => {
    let mounted = true
    const syncOAuthSession = async (session) => {
      if (!session?.access_token) return
      try {
        const response = await api.post('/auth/oauth', {}, { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (!mounted) return
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        setCurrentUser(response.data.user)
      } catch (error) {
        console.error('OAuth session sync failed:', error?.response?.data?.message || error.message)
      }
    }
    const { data: initData } = supabase.auth.getSession()
    if (initData?.session?.access_token) {
      syncOAuthSession(initData.session)
    }
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'AUTH_EMAIL_OTP_SESSION_EXPIRED' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        syncOAuthSession(session)
      }
    })
    setSyncing(false)
    return () => { mounted = false; data?.subscription?.unsubscribe?.() }
  }, [])

  // helper to apply theme synchronously to document root and localStorage
  const applyThemeToRoot = (themeVal) => {
    try {
      const root = document.documentElement || document.body
      // Use 'dark' class to be compatible with Tailwind-style dark mode toggles
      if (themeVal === 'dark') {
        root.classList.add('dark')
        root.classList.remove('light')
        root.setAttribute('data-theme', 'dark')
      } else {
        root.classList.add('light')
        root.classList.remove('dark')
        root.setAttribute('data-theme', 'light')
      }
      // persist theme
      localStorage.setItem('theme', themeVal)
    } catch (e) {
      // ignore (server-side render)
    }
  }

  // apply theme before paint to avoid FOUC
  useLayoutEffect(() => {
    applyThemeToRoot(theme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keep side-effect in case theme changed elsewhere (defensive)
  useEffect(() => {
    applyThemeToRoot(theme)
  }, [theme])

  // helper to set antiSpy synchronously
  const applyAntiSpy = (val) => {
    try {
      localStorage.setItem('antiSpy', val ? 'true' : 'false')
      // other global effects (if any) can be applied here
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    applyAntiSpy(antiSpy)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    applyAntiSpy(antiSpy)
  }, [antiSpy])

  // private account persistence
  useEffect(() => {
    try { localStorage.setItem('privateAccount', privateAccount ? 'true' : 'false') } catch (e) {}
  }, [privateAccount])

  // blocked accounts (persist list)
  useEffect(() => {
    try {
      const list = (currentUser && Array.isArray(currentUser.blockedAccounts)) ? currentUser.blockedAccounts : JSON.parse(localStorage.getItem('blockedAccounts') || '[]')
      localStorage.setItem('blockedAccounts', JSON.stringify(list || []))
    } catch (e) {}
  }, [currentUser])

  const login = async (loginData) => {
    const res = await api.post('/auth/login', loginData)
    const { token, user } = res.data
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setCurrentUser(user)
    return user
  }

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setCurrentUser(null)
  }

  // helper wrapper to update currentUser and persist to localStorage
  const saveCurrentUser = (userObj) => {
    setCurrentUser(userObj)
    try { localStorage.setItem('user', JSON.stringify(userObj)) } catch (e) {}
  }

  // synchronous setters that update state + root/localStorage immediately
  const setTheme = (val) => {
    setThemeState(val)
    applyThemeToRoot(val)
    // persist to backend if supabase available and user is authenticated
    try {
      if (supabase && (currentUser && (currentUser.id || currentUser.sub || currentUser.user_id))) {
        // update auth user metadata (safe best-effort; may fail in dev without session)
        supabase.auth.updateUser ? supabase.auth.updateUser({ data: { theme: val } }).catch(()=>{}) : null
        // also attempt upsert to profiles table if exists
        try {
          const userId = currentUser.id || currentUser.sub || currentUser.user_id
          supabase.from('profiles').upsert({ id: userId, theme: val }).then(()=>{}).catch(()=>{})
        } catch(e) {}
      }
    } catch (e) {
      // ignore backend persistence errors
    }
  }

  const setAntiSpy = (val) => {
    setAntiSpyState(val)
    applyAntiSpy(val)
  }

  // private account setter that updates currentUser metadata and persists
  const setPrivateAccount = (val) => {
    setPrivateAccountState(val)
    try {
      // update currentUser object if present
      setCurrentUser((prev) => {
        const next = prev ? { ...prev, privateAccount: !!val } : prev
        try { localStorage.setItem('user', JSON.stringify(next)) } catch (e) {}
        return next
      })
      localStorage.setItem('privateAccount', val ? 'true' : 'false')
      // optional: send to backend
      // api.post('/user/settings', { privateAccount: val }).catch(()=>{})
    } catch (e) {}
  }

  // blocked accounts management
  const blockUser = (userToBlock) => {
    try {
      const now = new Date().toISOString()
      const entry = { id: userToBlock.id || userToBlock.userId || userToBlock.username || String(Date.now()), username: userToBlock.username || userToBlock.user || 'unknown', displayName: userToBlock.displayName || userToBlock.name || '', avatarUrl: userToBlock.avatarUrl || '', blockedAt: now }
      setCurrentUser((prev) => {
        const list = (prev && Array.isArray(prev.blockedAccounts)) ? [...prev.blockedAccounts] : (JSON.parse(localStorage.getItem('blockedAccounts')||'[]')||[])
        list.unshift(entry)
        const next = prev ? { ...prev, blockedAccounts: list } : { blockedAccounts: list }
        try { localStorage.setItem('user', JSON.stringify(next)) } catch (e) {}
        localStorage.setItem('blockedAccounts', JSON.stringify(list))
        return next
      })
      return entry
    } catch (e) { return null }
  }

  const unblockUser = (idOrUsername) => {
    try {
      setCurrentUser((prev) => {
        const list = (prev && Array.isArray(prev.blockedAccounts)) ? prev.blockedAccounts.filter(b => b.id !== idOrUsername && b.username !== idOrUsername) : (JSON.parse(localStorage.getItem('blockedAccounts')||'[]')||[]).filter(b => b.id !== idOrUsername && b.username !== idOrUsername)
        const next = prev ? { ...prev, blockedAccounts: list } : { blockedAccounts: list }
        try { localStorage.setItem('user', JSON.stringify(next)) } catch (e) {}
        localStorage.setItem('blockedAccounts', JSON.stringify(list))
        return next
      })
      return true
    } catch (e) { return false }
  }

  const value = {
    currentUser,
    setCurrentUser: saveCurrentUser,
    login,
    register,
    logout,
    loading,
    syncing,
    theme,
    setTheme,
    antiSpy,
    setAntiSpy,
    privateAccount,
    setPrivateAccount,
    blockUser,
    unblockUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
