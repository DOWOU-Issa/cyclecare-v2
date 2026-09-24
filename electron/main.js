/* =============================================
   electron/main.js — Application Windows (Electron)
   =============================================
   Pour construire l'app Windows :
   1. npm install
   2. npm run build:win
   ============================================= */

const { app, BrowserWindow, Menu, shell, session, Tray, nativeImage } = require('electron');
const path = require('path');

let mainWindow;
let tray;

function isSafeExternalUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'mailto:';
  } catch (e) {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1280,   // assez large pour l'accueil sur 2 colonnes
    height: 820,
    center: true,
    minWidth:  480,
    minHeight: 600,
    title: 'CycleCare',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration:    false,
      contextIsolation:   true,
      enableRemoteModule: false,
      // Activer le support tactile et les gestes
      scrollBounce: true,
      // Permettre le zoom avec la molette
      zoomFactor: 1.0,
      // Assurer la connectivité réseau pour Supabase
      webSecurity: true,
      allowRunningInsecureContent: false,
      sandbox: true,               // le code web n'a aucun accès à Node/Windows
    },
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    // Améliorer la gestion du redimensionnement
    frame: true,
    resizable: true,
    maximizable: true,
    minimizable: true,
    closable: true,
  });

  /* Charger l'application web — MÊME source que le web et l'APK (dossier www/) */
  const APP_INDEX = path.join(__dirname, '..', 'www', 'index.html');
  mainWindow.loadFile(APP_INDEX);

  /* Activer le zoom et le scroll après chargement */
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomLevel(0);
    mainWindow.webContents.setVisualZoomLevelLimits(1, 3);
    
    // Injecter du CSS pour forcer le scroll avec la molette
    mainWindow.webContents.executeJavaScript(`
      document.body.style.overflow = 'auto';
      document.body.style.overscrollBehavior = 'auto';
    `);
  });

  /* Afficher la fenêtre seulement quand elle est prête */
  mainWindow.once('ready-to-show', () => mainWindow.show());

  /* Ouvrir les liens externes dans le navigateur système — uniquement
     https / mailto (jamais file:, smb:, protocoles personnalisés…) */
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  /* Interdire à la fenêtre de naviguer ailleurs que dans l'app */
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      if (isSafeExternalUrl(url)) shell.openExternal(url);
    }
  });
  
  /* Minimiser au lieu de fermer (pour le tray icon) */
  mainWindow.on('close', (event) => {
    /* Sans icône de barre des tâches, cacher la fenêtre la rendrait inaccessible */
    if (!app.isQuitting && tray) {
      event.preventDefault();
      mainWindow.hide();
      if (tray) {
        tray.displayBalloon({
          title: 'CycleCare',
          content: 'Application minimisée dans la barre des tâches'
        });
      }
    }
  });
}

/* Créer le tray icon avec actions rapides */
function createTray() {
  // Créer une icône simple (remplacer par votre propre icône)
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  /* Pas d'icône (dossier assets/ absent) → pas de tray : la croix ferme l'app */
  if (trayIcon.isEmpty()) return;
  
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Ouvrir CycleCare',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Journal',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.executeJavaScript(`
            if (typeof go === 'function') go('journal');
          `);
        }
      }
    },
    {
      label: 'Calendrier',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.executeJavaScript(`
            if (typeof go === 'function') go('calendrier');
          `);
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('CycleCare - Suivi du cycle menstruel');
  tray.setContextMenu(contextMenu);
  
  // Double-clic pour ouvrir
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

/* Menu application amélioré */
const menuTemplate = [
  {
    label: 'Fichier',
    submenu: [
      { role: 'quit', label: 'Quitter' }
    ]
  },
  {
    label: 'Édition',
    submenu: [
      { role: 'undo', label: 'Annuler' },
      { role: 'redo', label: 'Rétablir' },
      { type: 'separator' },
      { role: 'cut', label: 'Couper' },
      { role: 'copy', label: 'Copier' },
      { role: 'paste', label: 'Coller' }
    ]
  },
  {
    label: 'Affichage',
    submenu: [
      { role: 'reload',         label: 'Actualiser' },
      // Outils développeur seulement en développement (npm start), pas dans l'exe
      ...(app.isPackaged ? [] : [{ role: 'toggleDevTools', label: 'Outils développeur' }]),
      { type: 'separator' },
      { role: 'resetZoom',      label: 'Zoom normal' },
      { role: 'zoomIn',         label: 'Zoom +' },
      { role: 'zoomOut',        label: 'Zoom -' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Plein écran' }
    ]
  },
  {
    label: 'Aide',
    submenu: [
      {
        label: 'À propos',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.webContents.executeJavaScript(`
              if (typeof go === 'function') go('parametres');
            `);
          }
        }
      }
    ]
  }
];

app.whenReady().then(() => {
  // Configuration de session pour la connectivité Supabase
  // Assurer que les requêtes réseau vers Supabase sont autorisées
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: { ...details.requestHeaders } });
  });
  
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  createWindow();
  createTray();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
