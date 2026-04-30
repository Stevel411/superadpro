import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Eager: only English (the default fallback). All other 19 locales are
// lazy-loaded on language change. This drops ~3.8MB (raw) / ~600KB (gzipped)
// of unused translation data from the initial bundle for English-speaking
// visitors — which is the majority for early launch.
import en from './locales/en.json';

// Vite glob import — gives us a map of dynamic-import functions for every
// non-English locale. Each one is its own chunk that's only fetched when
// the user actually selects that language.
var localeLoaders = import.meta.glob('./locales/!(en).json');

var savedLang = 'en';
try { savedLang = localStorage.getItem('superadpro-lang') || 'en'; } catch(e) {}

// Initialise with EN immediately. If the saved language isn't EN, kick off
// the lazy load (fire-and-forget) so we switch as soon as it lands.
i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',  // start in EN to avoid blank-page-while-loading on slow connections
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

function loadLocale(code) {
  if (code === 'en') return Promise.resolve();  // already loaded
  if (i18n.hasResourceBundle(code, 'translation')) return Promise.resolve();  // cached from prior load
  var loaderKey = './locales/' + code + '.json';
  var loader = localeLoaders[loaderKey];
  if (!loader) return Promise.reject(new Error('Unknown locale: ' + code));
  return loader().then(function(mod) {
    var data = mod.default || mod;
    i18n.addResourceBundle(code, 'translation', data);
  });
}

// If saved language is non-EN, lazy-load it then switch.
// User briefly sees EN; locale swap-in is usually <100ms on broadband.
if (savedLang !== 'en') {
  loadLocale(savedLang).then(function() { i18n.changeLanguage(savedLang); }).catch(function() {});
}

export function changeLanguage(code) {
  // Lazy-load the locale if needed, then switch.
  return loadLocale(code).then(function() {
    i18n.changeLanguage(code);
    try { localStorage.setItem('superadpro-lang', code); } catch(e) {}
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
