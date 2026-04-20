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
      .catch(function (err) {
        // Silent fail — service worker is progressive enhancement, not required
        console.warn('[SW] Registration failed:', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
