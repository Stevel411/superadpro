import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/design-tokens.css';
import './styles/globals.css';

// Register service worker for PWA support (installable + offline cache).
// Registration is deferred to window.load so it doesn't compete with initial
// page render on slow mobile connections.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/static/sw.js', { scope: '/' })
      .then(function (reg) {
        // Actively check for a newer SW on every load.
        try { reg.update(); } catch (e) {}
      })
      .catch(function (err) {
        // Silent fail — service worker is progressive enhancement, not required
        console.warn('[SW] Registration failed:', err);
      });
    // When a new SW takes control (after an update), reload ONCE so the page
    // runs on the fresh bundle instead of stale cached JS. Guarded against a
    // reload loop. Fixes members being stuck on old code after a deploy.
    var _swReloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (_swReloaded) return;
      _swReloaded = true;
      window.location.reload();
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
