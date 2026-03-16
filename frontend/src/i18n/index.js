import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';

// Language files will be loaded dynamically
var resources = { en: { translation: en } };

// Detect saved language or default to English
var savedLang = 'en';
try { savedLang = localStorage.getItem('superadpro-lang') || 'en'; } catch(e) {}

i18n.use(initReactI18next).init({
  resources: resources,
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

// Dynamic language loader — loads language files on demand
var loadedLangs = { en: true };

export function changeLanguage(code) {
  if (loadedLangs[code]) {
    i18n.changeLanguage(code);
    try { localStorage.setItem('superadpro-lang', code); } catch(e) {}
    return Promise.resolve();
  }
  return import('./locales/' + code + '.json').then(function(mod) {
    i18n.addResourceBundle(code, 'translation', mod.default || mod);
    loadedLangs[code] = true;
    i18n.changeLanguage(code);
    try { localStorage.setItem('superadpro-lang', code); } catch(e) {}
  }).catch(function(err) {
    console.warn('Language file not found:', code, err);
    i18n.changeLanguage('en');
  });
}

export var LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'tl', name: 'Filipino', flag: '🇵🇭' },
  { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
];

export default i18n;
