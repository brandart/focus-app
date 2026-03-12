export const IPC = {
  START_SESSION: 'session:start',
  STOP_SESSION: 'session:stop',
  TICK: 'timer:tick',
  SESSION_ENDED: 'session:ended',
  GET_BLOCK_SUGGESTIONS: 'block-suggestions:get',
  UPDATE_BORDER: 'border:update'
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

export interface BorderSettings {
  visible: boolean
  color: string       // hex color, e.g. '#5082dc'
  glowIntensity: number // 0–100, 0 = no glow (solid line only)
  pulseSpeed: number    // 0–100, 0 = static, 100 = fast pulse
}

export const DEFAULT_BORDER: BorderSettings = {
  visible: true,
  color: '#5082dc',
  glowIntensity: 60,
  pulseSpeed: 50
}

export interface StartSessionPayload {
  durationMinutes: number
  goal: string
  blockedApps: BlockedApp[]
  border: BorderSettings
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
  onBorderUpdate: (callback: (settings: BorderSettings) => void) => void
  stopSession: () => void
}
