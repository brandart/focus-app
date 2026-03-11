export const IPC = {
  START_SESSION: 'session:start',
  STOP_SESSION: 'session:stop',
  TICK: 'timer:tick',
  SESSION_ENDED: 'session:ended'
} as const

export interface BlockedApp {
  name: string
  bundleId: string
}

export interface StartSessionPayload {
  durationMinutes: number
  goal: string
  blockedApps: BlockedApp[]
}

export interface TickPayload {
  remainingSeconds: number
  goal: string
}

export interface SetupAPI {
  startSession: (payload: StartSessionPayload) => void
  onSessionEnded: (callback: () => void) => void
}

export interface OverlayAPI {
  onTick: (callback: (payload: TickPayload) => void) => void
  stopSession: () => void
}
