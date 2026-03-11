import { app, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { IPC, StartSessionPayload, TickPayload } from '../shared/types'
import { createSetupWindow, createOverlayWindows } from './windows'
import { startTimer, stopTimer } from './timer'
import { startAppWatcher, stopAppWatcher } from './app-watcher'
import type { BrowserWindow } from 'electron'

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (setupWin != null && !setupWin.isDestroyed()) {
      setupWin.show()
      setupWin.focus()
    }
  })
}

let setupWin: BrowserWindow | null = null
let overlayWins: BrowserWindow[] = []
let tray: Tray | null = null
let currentGoal = ''
let isQuitting = false

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function isAlive(win: BrowserWindow | null): boolean {
  return win != null && !win.isDestroyed()
}

function endSession(): void {
  stopTimer()
  stopAppWatcher()
  tray?.setTitle('')
  overlayWins.forEach((w) => { if (isAlive(w)) w.hide() })
  if (isAlive(setupWin)) {
    setupWin!.show()
    setupWin!.focus()
    setupWin!.webContents.send(IPC.SESSION_ENDED)
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.focus-app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupWin = createSetupWindow(() => isQuitting)
  overlayWins = createOverlayWindows()

  // Tray — focus crosshair icon (SVG via data URL; createFromPath doesn't support SVG)
  const resourcesDir = join(app.getAppPath(), 'resources')
  const focusSvgPath = join(resourcesDir, 'tray-focus-icon.svg')
  const mainIconPath = join(resourcesDir, 'icon.png')
  let trayIcon
  if (existsSync(focusSvgPath)) {
    const svg = readFileSync(focusSvgPath, 'utf-8')
    trayIcon = nativeImage.createFromDataURL(
      'data:image/svg+xml,' + encodeURIComponent(svg)
    )
  } else {
    trayIcon = nativeImage.createFromPath(mainIconPath)
  }
  if (trayIcon.isEmpty()) {
    trayIcon = nativeImage.createFromPath(mainIconPath).resize({ width: 16, height: 16 })
  } else {
    trayIcon = trayIcon.resize({ width: 16, height: 16 })
    if (process.platform === 'darwin') trayIcon.setTemplateImage(true)
  }
  tray = new Tray(trayIcon)

  const updateTrayMenu = (): void => {
    const menu = Menu.buildFromTemplate([
      {
        label: 'Open Setup',
        click: () => {
          if (isAlive(setupWin)) {
            setupWin!.show()
            setupWin!.focus()
          }
        }
      },
      {
        label: 'Stop Session',
        click: () => endSession()
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit()
      }
    ])
    tray!.setContextMenu(menu)
  }

  updateTrayMenu()
  tray.setToolTip('Focus App')

  // Keep dock visible — tray may not show when hidden on macOS; dock provides app access
  // if (app.dock) app.dock.hide()

  // IPC handlers
  ipcMain.on(IPC.START_SESSION, (_event, payload: StartSessionPayload) => {
    currentGoal = payload.goal
    const durationSeconds = payload.durationMinutes * 60

    if (isAlive(setupWin)) setupWin!.hide()
    overlayWins.forEach((w) => { if (isAlive(w)) w.show() })

    startAppWatcher(() => overlayWins.find((w) => isAlive(w)) ?? null, payload.blockedApps ?? [])

    startTimer(
      durationSeconds,
      (remainingSeconds: number) => {
        tray?.setTitle(formatTime(remainingSeconds))
        const tickPayload: TickPayload = { remainingSeconds, goal: currentGoal }
        overlayWins.forEach((w) => { if (isAlive(w)) w.webContents.send(IPC.TICK, tickPayload) })
      },
      () => endSession()
    )
  })

  ipcMain.on(IPC.STOP_SESSION, () => {
    endSession()
  })

  app.on('activate', () => {
    if (isAlive(setupWin)) {
      setupWin!.show()
      setupWin!.focus()
    }
  })
})

app.on('before-quit', () => {
  isQuitting = true
  stopTimer()
})

app.on('window-all-closed', () => {
  // Keep running in tray on macOS
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
