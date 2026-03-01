const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 940,
    height: 650,
    minWidth: 500,
    minHeight: 380,
    title: 'NEON DASH ULTRA',
    backgroundColor: '#000011',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.setMenu(null);
  // Load the app-optimised shell (no PWA manifest, Electron feature flags)
  win.loadFile('platformer-app.html');

  // F11 = fullscreen toggle
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
    }
    // F12 = DevTools (handy during development)
    if (input.type === 'keyDown' && input.key === 'F12') {
      win.webContents.toggleDevTools();
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
