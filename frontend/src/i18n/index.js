import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import de from './locales/de.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import ru from './locales/ru.json';
import ar from './locales/ar.json';
import zh from './locales/zh.json';
import hi from './locales/hi.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import tr from './locales/tr.json';
import pl from './locales/pl.json';
import vi from './locales/vi.json';
import th from './locales/th.json';
import id from './locales/id.json';
import tl from './locales/tl.json';
import sw from './locales/sw.json';

var resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  pt: { translation: pt },
  de: { translation: de },
  it: { translation: it },
  nl: { translation: nl },
  ru: { translation: ru },
  ar: { translation: ar },
  zh: { translation: zh },
  hi: { translation: hi },
  ja: { translation: ja },
  ko: { translation: ko },
  tr: { translation: tr },
  pl: { translation: pl },
  vi: { translation: vi },
  th: { translation: th },
  id: { translation: id },
  tl: { translation: tl },
  sw: { translation: sw },
};

var savedLang = 'en';
try { savedLang = localStorage.getItem('superadpro-lang') || 'en'; } catch(e) {}

i18n.use(initReactI18next).init({
  resources: resources,
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export function changeLanguage(code) {
  i18n.changeLanguage(code);
  try { localStorage.setItem('superadpro-lang', code); } catch(e) {}
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
