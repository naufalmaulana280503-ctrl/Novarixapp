import React, { createContext, useContext, useEffect, useState } from 'react'
import { userSettingsApi } from '../services/api'
import { useAuth } from './AuthContext'

export const LANGUAGES = [
  ['en', 'English (default)'],
  ['id', 'Bahasa Indonesia'],
  ['zh-CN', 'Chinese (Simplified)'],
  ['de', 'German'],
  ['tl', 'Tagalog'],
  ['th', 'Thai'],
  ['ru', 'Russian'],
  ['ar', 'Arabic (Saudi Arabia)'],
]

const english = {
  settings: 'Settings and privacy',
  managePreferences: 'Manage your account and preferences',
  profile: 'Profile',
  feed: 'Home',
  chat: 'Chat',
  groups: 'Groups',
  calls: 'Calls',
  live: 'Live',
  search: 'Search',
  create: 'Create',
  retry: 'Try again',
  noPosts: 'No posts yet. Be the first to upload!',
  notifications: 'Notifications',
  followers: 'Followers',
  following: 'Following',
  follow: 'Follow',
  unfollow: 'Unfollow',
  language: 'Language',
  appLanguage: 'App language',
  chooseLanguage: 'Choose your display language',
}

const translations = {
  en: english,
  id: { ...english, settings: 'Pengaturan dan privasi', managePreferences: 'Kelola akun dan preferensi kamu', profile: 'Profil', feed: 'Beranda', groups: 'Grup', calls: 'Panggilan', notifications: 'Notifikasi', followers: 'Pengikut', following: 'Mengikuti', follow: 'Ikuti', unfollow: 'Berhenti mengikuti', language: 'Bahasa', appLanguage: 'Bahasa aplikasi', chooseLanguage: 'Pilih bahasa tampilan' },
  'zh-CN': { ...english, settings: '设置与隐私', profile: '个人资料', feed: '首页', groups: '群组', calls: '通话', notifications: '通知', followers: '粉丝', following: '关注', follow: '关注', unfollow: '取消关注', language: '语言', appLanguage: '应用语言', chooseLanguage: '选择显示语言' },
  de: { ...english, settings: 'Einstellungen und Datenschutz', profile: 'Profil', feed: 'Startseite', groups: 'Gruppen', calls: 'Anrufe', notifications: 'Benachrichtigungen', followers: 'Follower', following: 'Folge ich', follow: 'Folgen', unfollow: 'Nicht mehr folgen', language: 'Sprache', appLanguage: 'App-Sprache', chooseLanguage: 'Anzeigesprache auswählen' },
  tl: { ...english, settings: 'Mga setting at privacy', profile: 'Profile', feed: 'Home', groups: 'Mga grupo', calls: 'Mga tawag', notifications: 'Mga notification', followers: 'Mga follower', following: 'Sinusundan', follow: 'Sundan', unfollow: 'I-unfollow', language: 'Wika', appLanguage: 'Wika ng app', chooseLanguage: 'Piliin ang wika ng display' },
  th: { ...english, settings: 'การตั้งค่าและความเป็นส่วนตัว', profile: 'โปรไฟล์', feed: 'หน้าหลัก', groups: 'กลุ่ม', calls: 'การโทร', notifications: 'การแจ้งเตือน', followers: 'ผู้ติดตาม', following: 'กำลังติดตาม', follow: 'ติดตาม', unfollow: 'เลิกติดตาม', language: 'ภาษา', appLanguage: 'ภาษาของแอป', chooseLanguage: 'เลือกภาษาที่แสดง' },
  ru: { ...english, settings: 'Настройки и конфиденциальность', profile: 'Профиль', feed: 'Главная', groups: 'Группы', calls: 'Звонки', notifications: 'Уведомления', followers: 'Подписчики', following: 'Подписки', follow: 'Подписаться', unfollow: 'Отписаться', language: 'Язык', appLanguage: 'Язык приложения', chooseLanguage: 'Выберите язык интерфейса' },
  ar: { ...english, settings: 'الإعدادات والخصوصية', profile: 'الملف الشخصي', feed: 'الرئيسية', groups: 'المجموعات', calls: 'المكالمات', notifications: 'الإشعارات', followers: 'المتابعون', following: 'المتابَعون', follow: 'متابعة', unfollow: 'إلغاء المتابعة', language: 'اللغة', appLanguage: 'لغة التطبيق', chooseLanguage: 'اختر لغة العرض' },
}

const LanguageContext = createContext(null)

export const LanguageProvider = ({ children }) => {
  const { currentUser } = useAuth()
  const [language, setLanguageState] = useState(() => localStorage.getItem('novarix_language') || 'en')

  useEffect(() => {
    if (!currentUser?.id) return undefined
    userSettingsApi.get().then((response) => {
      const saved = response.data?.settings?.language
      if (saved && LANGUAGES.some(([code]) => code === saved)) {
        setLanguageState(saved)
        localStorage.setItem('novarix_language', saved)
      }
    }).catch((error) => console.warn('Failed to load language preference', error))
    return undefined
  }, [currentUser?.id])

  const setLanguage = async (next) => {
    if (!LANGUAGES.some(([code]) => code === next)) return
    setLanguageState(next)
    localStorage.setItem('novarix_language', next)
    try {
      await userSettingsApi.update({ language: next })
    } catch (error) {
      console.warn('Failed to save language', error)
    }
  }

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  const t = (key) => translations[language]?.[key] || english[key] || key
  return <LanguageContext.Provider value={{ language, setLanguage, languages: LANGUAGES, t }}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => useContext(LanguageContext)
