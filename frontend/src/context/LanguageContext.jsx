import React, { createContext, useContext, useEffect, useState } from 'react'
import { userSettingsApi } from '../services/api'

export const LANGUAGES = [
  ['id', 'Bahasa Indonesia'], ['en', 'English'], ['zh-CN', '简体中文'], ['zh-TW', '繁體中文'], ['ja', '日本語'], ['ko', '한국어'], ['hi', 'हिन्दी'], ['ar', 'العربية'], ['th', 'ไทย'], ['vi', 'Tiếng Việt'], ['ms', 'Bahasa Melayu'], ['tl', 'Filipino'], ['fr', 'Français'], ['de', 'Deutsch'], ['es', 'Español'], ['it', 'Italiano'], ['pt', 'Português'], ['nl', 'Nederlands'], ['ru', 'Русский'], ['tr', 'Türkçe'], ['pl', 'Polski'], ['uk', 'Українська'], ['sv', 'Svenska'], ['no', 'Norsk'], ['da', 'Dansk'], ['fi', 'Suomi'], ['el', 'Ελληνικά'], ['he', 'עברית'], ['fa', 'فارسی'], ['sw', 'Kiswahili'],
]

const translations = {
  id: { settings: 'Pengaturan dan privasi', profile: 'Profil', feed: 'Beranda', chat: 'Chat', groups: 'Grup', calls: 'Panggilan', notifications: 'Notifikasi', followers: 'Pengikut', following: 'Mengikuti', follow: 'Ikuti', unfollow: 'Berhenti mengikuti', language: 'Bahasa' },
  en: { settings: 'Settings and privacy', profile: 'Profile', feed: 'Home', chat: 'Chat', groups: 'Groups', calls: 'Calls', notifications: 'Notifications', followers: 'Followers', following: 'Following', follow: 'Follow', unfollow: 'Unfollow', language: 'Language' },
  'zh-CN': { settings: '设置和隐私', profile: '个人资料', feed: '首页', chat: '聊天', groups: '群组', calls: '通话', notifications: '通知', followers: '粉丝', following: '关注', follow: '关注', unfollow: '取消关注', language: '语言' },
  ja: { settings: '設定とプライバシー', profile: 'プロフィール', feed: 'ホーム', chat: 'チャット', groups: 'グループ', calls: '通話', notifications: '通知', followers: 'フォロワー', following: 'フォロー中', follow: 'フォロー', unfollow: 'フォロー解除', language: '言語' },
  ko: { settings: '설정 및 개인정보', profile: '프로필', feed: '홈', chat: '채팅', groups: '그룹', calls: '통화', notifications: '알림', followers: '팔로워', following: '팔로잉', follow: '팔로우', unfollow: '언팔로우', language: '언어' },
  es: { settings: 'Configuración y privacidad', profile: 'Perfil', feed: 'Inicio', chat: 'Chat', groups: 'Grupos', calls: 'Llamadas', notifications: 'Notificaciones', followers: 'Seguidores', following: 'Siguiendo', follow: 'Seguir', unfollow: 'Dejar de seguir', language: 'Idioma' },
  fr: { settings: 'Paramètres et confidentialité', profile: 'Profil', feed: 'Accueil', chat: 'Discussion', groups: 'Groupes', calls: 'Appels', notifications: 'Notifications', followers: 'Abonnés', following: 'Abonnements', follow: 'Suivre', unfollow: 'Ne plus suivre', language: 'Langue' },
}

const LanguageContext = createContext(null)
export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => localStorage.getItem('novarix_language') || 'id')
  useEffect(() => {
    userSettingsApi.get().then((response) => {
      const saved = response.data?.settings?.language
      if (saved && LANGUAGES.some(([code]) => code === saved)) {
        setLanguageState(saved)
        localStorage.setItem('novarix_language', saved)
      }
    }).catch(() => {})
  }, [])
  const setLanguage = async (next) => {
    setLanguageState(next)
    localStorage.setItem('novarix_language', next)
    document.documentElement.lang = next
    try { await userSettingsApi.update({ language: next }) } catch (error) { console.warn('Failed to save language', error) }
  }
  useEffect(() => { document.documentElement.lang = language }, [language])
  const t = (key) => translations[language]?.[key] || translations.en[key] || key
  return <LanguageContext.Provider value={{ language, setLanguage, languages: LANGUAGES, t }}>{children}</LanguageContext.Provider>
}
export const useLanguage = () => useContext(LanguageContext)
