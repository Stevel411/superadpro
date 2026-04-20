import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * InstallPrompt — shows a dismissible banner prompting members to install
 * SuperAdPro to their home screen. Handles both flows:
 *
 *   Android / Chrome / Edge: waits for the beforeinstallprompt event, shows
 *   an "Install" button that triggers the native prompt.
 *
 *   iOS Safari: no install API exists, so shows instructions pointing at the
 *   Share menu (the only way iOS users can add to home screen).
 *
 * Dismissal is remembered in localStorage for 30 days so members don't get
 * nagged on every page load. Doesn't render if the app is already installed
 * (display-mode: standalone) or if the user previously dismissed it.
 */
export default function InstallPrompt() {
  var { t } = useTranslation();
  var [deferredPrompt, setDeferredPrompt] = useState(null);
  var [visible, setVisible] = useState(false);
  var [isIOS, setIsIOS] = useState(false);

  useEffect(function () {
    // Check if already installed — running in standalone mode means they've
    // already added it to home screen. Don't show the prompt.
    var isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    if (isStandalone) return undefined;

    // Check if recently dismissed
    try {
      var dismissedAt = localStorage.getItem('sap_install_dismissed_at');
      if (dismissedAt) {
        var ageMs = Date.now() - parseInt(dismissedAt, 10);
        var thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        if (ageMs < thirtyDaysMs) return undefined;
      }
    } catch (e) { /* localStorage unavailable — just continue */ }

    // Detect iOS (Safari doesn't fire beforeinstallprompt)
    var ua = window.navigator.userAgent || '';
    var iOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    var isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    if (iOS && isSafari) {
      setIsIOS(true);
      // Show iOS prompt after a short delay so it doesn't compete with first render
      var t1 = setTimeout(function () { setVisible(true); }, 3000);
      return function () { clearTimeout(t1); };
    }

    // Non-iOS: wait for the install prompt event
    function handleBeforeInstall(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Also hide if user installs through browser menu
    function handleInstalled() { setVisible(false); setDeferredPrompt(null); }
    window.addEventListener('appinstalled', handleInstalled);

    return function () {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  function handleInstallClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function (choice) {
      if (choice.outcome === 'accepted') {
        setVisible(false);
      }
      setDeferredPrompt(null);
    });
  }

  function handleDismiss() {
    try { localStorage.setItem('sap_install_dismissed_at', String(Date.now())); } catch (e) {}
    setVisible(false);
  }

  if (!visible) return null;

  var bannerStyle = {
    position: 'fixed',
    bottom: 16,
    left: 16,
    right: 16,
    maxWidth: 520,
    margin: '0 auto',
    background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
    color: '#fff',
    borderRadius: 14,
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    boxShadow: '0 12px 40px rgba(14,165,233,.45), 0 0 0 1px rgba(255,255,255,.1)',
    zIndex: 9998,
    animation: 'sapInstallSlideUp .35s ease-out',
  };

  var iconBoxStyle = {
    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
    background: 'rgba(255,255,255,.18)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  };

  var textStyle = { flex: 1, minWidth: 0, fontFamily: 'DM Sans, sans-serif' };
  var titleStyle = { fontSize: 14, fontWeight: 800, lineHeight: 1.25, marginBottom: 2 };
  var subStyle = { fontSize: 12, opacity: .9, lineHeight: 1.35 };
  var closeBtnStyle = {
    width: 28, height: 28, borderRadius: 8, border: 'none',
    background: 'rgba(0,0,0,.2)', color: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontSize: 16, fontWeight: 700, padding: 0,
  };
  var installBtnStyle = {
    padding: '9px 16px', borderRadius: 10, border: 'none',
    background: '#fff', color: '#0ea5e9', fontWeight: 800, fontSize: 13,
    cursor: 'pointer', fontFamily: 'Sora, sans-serif', whiteSpace: 'nowrap',
  };

  return (
    <>
      <style>{'@keyframes sapInstallSlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}'}</style>
      <div style={bannerStyle} role="dialog" aria-label={t('pwa.installPromptAria', { defaultValue: 'Install SuperAdPro' })}>
        <div style={iconBoxStyle}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
            <line x1="12" y1="18" x2="12" y2="18"/>
          </svg>
        </div>
        <div style={textStyle}>
          <div style={titleStyle}>
            {t('pwa.installTitle', { defaultValue: 'Add SuperAdPro to your home screen' })}
          </div>
          <div style={subStyle}>
            {isIOS
              ? t('pwa.installSubIOS', { defaultValue: 'Tap Share, then "Add to Home Screen" for one-tap access to your daily quota.' })
              : t('pwa.installSub', { defaultValue: 'Watch your daily quota in one tap. No browser, no delays.' })
            }
          </div>
        </div>
        {!isIOS && deferredPrompt && (
          <button type="button" onClick={handleInstallClick} style={installBtnStyle}>
            {t('pwa.installBtn', { defaultValue: 'Install' })}
          </button>
        )}
        <button type="button" onClick={handleDismiss} style={closeBtnStyle} aria-label={t('pwa.installDismiss', { defaultValue: 'Dismiss' })}>
          ×
        </button>
      </div>
    </>
  );
}
