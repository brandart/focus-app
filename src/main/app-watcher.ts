import { exec } from 'child_process'
import { dialog, BrowserWindow } from 'electron'
import type { BlockedApp } from '../shared/types'

const POLL_INTERVAL_MS = 1500
const STAY_COOLDOWN_MS = 2 * 60 * 1000 // 2 minutes

let watchedApps: BlockedApp[] = []
let pollTimer: ReturnType<typeof setInterval> | null = null
let dialogOpen = false
let stayUntil: number = 0
let lastFrontApp = ''

function getFrontmostApp(): Promise<{ name: string; bundleId: string }> {
  return new Promise((resolve, reject) => {
    const script = `
      tell application "System Events"
        set frontApp to first application process whose frontmost is true
        set appName to name of frontApp
        set appId to bundle identifier of frontApp
        return appName & "|" & appId
      end tell
    `
    exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (err, stdout) => {
      if (err) return reject(err)
      const [name, bundleId] = stdout.trim().split('|')
      resolve({ name: name || '', bundleId: bundleId || '' })
    })
  })
}

function isDistractingApp(name: string, bundleId: string): boolean {
  return watchedApps.some(
    (a) =>
      (a.bundleId && a.bundleId === bundleId) ||
      a.name.toLowerCase() === name.toLowerCase()
  )
}

function getDisplayName(name: string, bundleId: string): string {
  const match = watchedApps.find(
    (a) => (a.bundleId && a.bundleId === bundleId) || a.name.toLowerCase() === name.toLowerCase()
  )
  return match?.name ?? name
}

function hideApp(name: string): void {
  const script = `tell application "System Events" to set visible of process "${name}" to false`
  exec(`osascript -e '${script}'`, () => {})
}

async function checkFrontmostApp(parentWindow: BrowserWindow | null): Promise<void> {
  if (dialogOpen) return
  try {
    const { name, bundleId } = await getFrontmostApp()

    // Reset cooldown when user leaves the distracting app
    if (!isDistractingApp(name, bundleId)) {
      lastFrontApp = name
      stayUntil = 0
      return
    }

    // Only prompt on a fresh switch into the distracting app, respecting cooldown
    const isFreshSwitch = lastFrontApp !== name
    lastFrontApp = name

    if (!isFreshSwitch && Date.now() < stayUntil) return

    const displayName = getDisplayName(name, bundleId)
    dialogOpen = true
    stayUntil = Date.now() + STAY_COOLDOWN_MS // block re-entry immediately
    const { response } = await dialog.showMessageBox(parentWindow ?? ({} as BrowserWindow), {
      type: 'question',
      buttons: ['Back to Focus', 'Stay in ' + displayName],
      defaultId: 0,
      cancelId: 1,
      title: 'Focus Session Active',
      message: `You switched to ${displayName} during your focus session.`,
      detail: 'Do you want to hide it and get back to focusing?'
    })
    dialogOpen = false

    if (response === 0) {
      stayUntil = 0
      hideApp(displayName)
    }
    // on Stay: stayUntil is already set above, no re-prompt for 2 min
  } catch {
    dialogOpen = false
  }
}

export function startAppWatcher(
  getParentWindow: () => BrowserWindow | null,
  apps: BlockedApp[]
): void {
  watchedApps = apps
  stopAppWatcher()
  pollTimer = setInterval(() => {
    checkFrontmostApp(getParentWindow())
  }, POLL_INTERVAL_MS)
}

export function stopAppWatcher(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  dialogOpen = false
  stayUntil = 0
  lastFrontApp = ''
}
