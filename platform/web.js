/**
 * platform/web.js — Browser / PWA platform layer
 *
 * Loaded before game.js in platformer-web.html.
 * Handles service-worker registration, PWA install prompt,
 * responsive scaling, and browser-specific quirks.
 */

window.NEON_PLATFORM = 'web';

// ── Feature flags ────────────────────────────────────────────
window.PLATFORM_CFG = {
  // Be conservative on web — unknown device capability
  particleMax: 480,
  // 'interactive' hint reduces audio buffering in browsers
  audioLatencyHint: 'interactive',
  hasNativeFullscreen: false,
  hasPWA: true,
};

// ── Service worker registration (offline / fast repeat loads) ─
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        // Background update check
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              // New version cached — show a soft reload hint
              console.log('[SW] New version cached. Reload to update.');
            }
          });
        });
      })
      .catch(() => { /* SW unavailable — game still works online */ });
  });
}

// ── PWA install prompt ────────────────────────────────────────
let _installPrompt = null;
const _banner  = document.getElementById('installBanner');
const _installBtn = document.getElementById('installBtn');
const _dismissBtn = document.getElementById('dismissInstall');

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _installPrompt = e;
  if (_banner) _banner.style.display = 'flex';
});

if (_installBtn) {
  _installBtn.addEventListener('click', async () => {
    if (!_installPrompt) return;
    _installPrompt.prompt();
    const { outcome } = await _installPrompt.userChoice;
    _installPrompt = null;
    if (_banner) _banner.style.display = 'none';
  });
}

if (_dismissBtn) {
  _dismissBtn.addEventListener('click', () => {
    if (_banner) _banner.style.display = 'none';
  });
}

// ── Responsive canvas scaling ─────────────────────────────────
(function scaleToWindow() {
  const gw = document.getElementById('gw');
  if (!gw) return;

  function resize() {
    const scaleX = window.innerWidth  / 900;
    const scaleY = window.innerHeight / 580;
    const scale  = Math.min(scaleX, scaleY, 1); // cap at 1× on web
    gw.style.transform = `scale(${scale})`;
  }

  resize();
  window.addEventListener('resize', resize);
})();

// ── Page Visibility API — pause audio when tab is hidden ──────
document.addEventListener('visibilitychange', () => {
  if (typeof actx !== 'undefined' && actx) {
    if (document.hidden) actx.suspend();
    else                 actx.resume();
  }
});

// ── Fullscreen helper exposed to game ─────────────────────────
window.requestNativeFullscreen = () => {
  const el = document.documentElement;
  if (el.requestFullscreen)            el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
};

// ── Disable right-click on canvas so mobile long-press doesn't ─
//    show the browser context menu
document.addEventListener('contextmenu', e => {
  if (e.target.tagName === 'CANVAS') e.preventDefault();
});
