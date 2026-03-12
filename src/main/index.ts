import { app, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { IPC, StartSessionPayload, TickPayload, BlockSuggestion, BorderSettings } from '../shared/types'
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

    // Send border settings to all overlays
    overlayWins.forEach((w) => {
      if (isAlive(w)) w.webContents.send(IPC.UPDATE_BORDER, payload.border)
    })

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

  ipcMain.handle(IPC.GET_BLOCK_SUGGESTIONS, (): BlockSuggestion[] => {
    return [
      // Individual apps
      { type: 'app', name: 'Mail', icon: '📧', bundleId: 'com.apple.mail' },
      { type: 'app', name: 'Messages', icon: '💬', bundleId: 'com.apple.MobileSMS' },
      { type: 'app', name: 'Slack', icon: '💼', bundleId: 'com.tinyspeck.slackmacgap' },
      { type: 'app', name: 'Discord', icon: '🎮', bundleId: 'com.hnc.Discord' },
      { type: 'app', name: 'WhatsApp', icon: '📱', bundleId: 'net.whatsapp.WhatsApp' },
      { type: 'app', name: 'Telegram', icon: '✈️', bundleId: 'ru.keepcoder.Telegram' },
      { type: 'app', name: 'Twitter', icon: '🐦', bundleId: 'com.twitter.twitter-mac' },
      { type: 'app', name: 'Safari', icon: '🧭', bundleId: 'com.apple.Safari' },
      { type: 'app', name: 'Chrome', icon: '🌐', bundleId: 'com.google.Chrome' },
      { type: 'app', name: 'YouTube', icon: '▶️', bundleId: 'com.google.Chrome' },
      // Categories
      {
        type: 'category', name: 'Gaming', icon: '🎮',
        apps: [
          { name: 'Steam', bundleId: 'com.valvesoftware.steam' },
          { name: 'Epic Games', bundleId: 'com.epicgames.EpicGamesLauncher' }
        ]
      },
      {
        type: 'category', name: 'Messaging', icon: '💬',
        apps: [
          { name: 'Messages', bundleId: 'com.apple.MobileSMS' },
          { name: 'Slack', bundleId: 'com.tinyspeck.slackmacgap' },
          { name: 'Discord', bundleId: 'com.hnc.Discord' },
          { name: 'WhatsApp', bundleId: 'net.whatsapp.WhatsApp' },
          { name: 'Telegram', bundleId: 'ru.keepcoder.Telegram' }
        ]
      },
      {
        type: 'category', name: 'News', icon: '📰',
        apps: [
          { name: 'News', bundleId: 'com.apple.news' },
          { name: 'Reeder', bundleId: 'com.reederapp.5.macOS' }
        ]
      },
      {
        type: 'category', name: 'Shopping', icon: '🛒',
        apps: [
          { name: 'Amazon', bundleId: 'com.amazon.Amazon' }
        ]
      },
      {
        type: 'category', name: 'Social', icon: '👥',
        apps: [
          { name: 'Twitter', bundleId: 'com.twitter.twitter-mac' },
          { name: 'Facebook', bundleId: 'com.facebook.Facebook' },
          { name: 'Instagram', bundleId: 'com.instagram.Instagram' },
          { name: 'Reddit', bundleId: 'com.reddit.Reddit' },
          { name: 'TikTok', bundleId: 'com.zhiliaoapp.musically' }
        ]
      }
    ]
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
