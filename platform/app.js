/**
 * platform/app.js — Electron desktop app platform layer
 *
 * Loaded before game.js in platformer-app.html.
 * Sets feature flags and applies desktop-specific behaviour.
 */

window.NEON_PLATFORM = 'app';

// ── Feature flags ────────────────────────────────────────────
window.PLATFORM_CFG = {
  // Desktop can push more particles without noticeable frame-drop
  particleMax: 600,
  // Prefer lowest possible audio latency on desktop
  audioLatencyHint: 'playback',
  // Electron handles fullscreen via F11 in main.js — let the game know
  hasNativeFullscreen: true,
  // No PWA install prompt
  hasPWA: false,
};

// ── Block browser context-menu (right-click) ─────────────────
document.addEventListener('contextmenu', e => e.preventDefault());

// ── F5 = in-place reload; F12 = open DevTools via Electron ───
document.addEventListener('keydown', e => {
  if (e.key === 'F5') {
    e.preventDefault();
    location.reload();
  }
  // F12 is handled by main.js webContents.openDevTools() if desired;
  // the game won't use this key for gameplay so it's safe to pass through.
});

// ── Auto-scale the game canvas to fill the Electron window ───
(function scaleToWindow() {
  const gw = document.getElementById('gw');
  if (!gw) return;

  function resize() {
    const scaleX = window.innerWidth  / 900;
    const scaleY = window.innerHeight / 580;
    const scale  = Math.min(scaleX, scaleY);
    gw.style.transform = `scale(${scale})`;
  }

  resize();
  window.addEventListener('resize', resize);
})();

// ── Page visibility: pause audio context when window is hidden ─
document.addEventListener('visibilitychange', () => {
  if (typeof actx !== 'undefined' && actx) {
    if (document.hidden) actx.suspend();
    else                 actx.resume();
  }
});
