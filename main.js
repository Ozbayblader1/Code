const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 940,
    height: 650,
    minWidth: 500,
    minHeight: 380,
    title: 'NEON PLATFORMER',
    backgroundColor: '#000011',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.setMenu(null);
  win.loadFile('platformer.html');

  // F11 = fullscreen toggle
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
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
