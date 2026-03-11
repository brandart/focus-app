export const IPC = {
  START_SESSION: 'session:start',
  STOP_SESSION: 'session:stop',
  TICK: 'timer:tick',
  SESSION_ENDED: 'session:ended',
  GET_BLOCK_SUGGESTIONS: 'block-suggestions:get'
} as const

export interface BlockedApp {
  name: string
  bundleId: string
}

export interface AppCategory {
  name: string
  icon: string
  apps: BlockedApp[]
}

export interface BlockSuggestion {
  type: 'app' | 'category'
  name: string
  icon: string
  bundleId?: string
  apps?: BlockedApp[]
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
  getBlockSuggestions: () => Promise<BlockSuggestion[]>
}

export interface OverlayAPI {
  onTick: (callback: (payload: TickPayload) => void) => void
  stopSession: () => void
}
