/* =============================================
   electron/main.js — Application Windows (Electron)
   =============================================
   Pour construire l'app Windows :
   1. npm install
   2. npm run build:win
   ============================================= */

const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width:  1100,
    height: 720,
    minWidth:  480,
    minHeight: 600,
    title: 'CycleCare',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration:    false,
      contextIsolation:   true,
      enableRemoteModule: false,
    },
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  /* Charger l'application web */
  win.loadFile(path.join(__dirname, '..', 'index.html'));

  /* Afficher la fenêtre seulement quand elle est prête */
  win.once('ready-to-show', () => win.show());

  /* Ouvrir les liens externes dans le navigateur système */
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

/* Menu application */
const menuTemplate = [
  {
    label: 'Fichier',
    submenu: [
      { role: 'quit', label: 'Quitter' }
    ]
  },
  {
    label: 'Affichage',
    submenu: [
      { role: 'reload',         label: 'Actualiser' },
      { role: 'toggleDevTools', label: 'Outils développeur' },
      { type: 'separator' },
      { role: 'resetZoom',      label: 'Zoom normal' },
      { role: 'zoomIn',         label: 'Zoom +' },
      { role: 'zoomOut',        label: 'Zoom -' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Plein écran' }
    ]
  }
];

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
