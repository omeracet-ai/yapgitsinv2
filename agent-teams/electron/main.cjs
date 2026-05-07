const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let mainWindow;
let tray;

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Yapgitsin Agent Müdür',
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    backgroundColor: '#0a0e17',
    autoHideMenuBar: true,
    frame: true,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  // Splash efekti — hazır olunca göster
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  if (isDev) {
    // Dev modda Vite sunucusuna bağlan
    const loadDevUrl = () => {
      mainWindow.loadURL('http://localhost:5173').catch(() => {
        // Vite henüz hazır değilse 1sn bekleyip tekrar dene
        setTimeout(loadDevUrl, 1000);
      });
    };
    loadDevUrl();
  } else {
    // Production — build edilmiş dosyaları yükle
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Menü
  const menuTemplate = [
    {
      label: 'Dosya',
      submenu: [
        { label: 'Yeniden Yükle', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { type: 'separator' },
        { label: 'Çıkış', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Görünüm',
      submenu: [
        { label: 'Tam Ekran', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { label: 'Geliştirici Araçları', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() },
        { type: 'separator' },
        { label: 'Yakınlaştır', accelerator: 'CmdOrCtrl+=', click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5) },
        { label: 'Uzaklaştır', accelerator: 'CmdOrCtrl+-', click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5) },
        { label: 'Sıfırla', accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.setZoomLevel(0) },
      ],
    },
    {
      label: 'Yardım',
      submenu: [
        { label: 'Yapgitsin Agent Müdür v1.0', enabled: false },
        { type: 'separator' },
        { label: 'Hakkında', click: () => {
          const { dialog } = require('electron');
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Yapgitsin Agent Müdür',
            message: 'Yapgitsin Agent Müdür v1.0',
            detail: 'AI İş Gücü Monitörü\n\nTüm hakları saklıdır © 2026 Yapgitsin',
          });
        }},
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

// Sistem tepsisi (system tray)
function createTray() {
  try {
    // Basit bir tray ikonu oluştur
    const iconPath = path.join(__dirname, '..', 'public', 'icon.png');
    let trayIcon;
    try {
      trayIcon = nativeImage.createFromPath(iconPath);
      if (trayIcon.isEmpty()) {
        // Fallback: 16x16 basit ikon
        trayIcon = nativeImage.createEmpty();
      }
    } catch {
      trayIcon = nativeImage.createEmpty();
    }
    
    tray = new Tray(trayIcon);
    tray.setToolTip('Yapgitsin Agent Müdür');
    
    const contextMenu = Menu.buildFromTemplate([
      { label: '🫡 Agent Müdür Aktif', enabled: false },
      { type: 'separator' },
      { label: 'Göster', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
      { label: 'Gizle', click: () => { if (mainWindow) mainWindow.hide(); } },
      { type: 'separator' },
      { label: 'Çıkış', click: () => app.quit() },
    ]);
    
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.focus();
        } else {
          mainWindow.show();
        }
      }
    });
  } catch (e) {
    console.log('Tray oluşturulamadı:', e.message);
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
