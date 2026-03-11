import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

export function createSetupWindow(isQuitting: () => boolean): BrowserWindow {
  const win = new BrowserWindow({
    width: 640,
    height: 520,
    minWidth: 520,
    minHeight: 420,
    resizable: true,
    show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#2a2a2c',
    trafficLightPosition: { x: 16, y: 16 },
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/setup.js'),
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win.show())

  win.on('close', (e) => {
    if (!isQuitting()) {
      e.preventDefault()
      win.hide()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/setup/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/setup/index.html'))
  }

  return win
}

function createOverlayForDisplay(bounds: Electron.Rectangle): BrowserWindow {
  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    type: 'panel',
    focusable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/overlay.js'),
      sandbox: false
    }
  })

  win.setIgnoreMouseEvents(true, { forward: true })
  win.setAlwaysOnTop(true, 'screen-saver')

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/overlay/index.html'))
  }

  return win
}

export function createOverlayWindows(): BrowserWindow[] {
  const displays = screen.getAllDisplays()
  return displays.map((display) => createOverlayForDisplay(display.bounds))
}
