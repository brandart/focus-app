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

export type GlowLevel = 'none' | 'subtle' | 'soft' | 'medium' | 'bright' | 'intense'
export type PulseLevel = 'static' | 'slow' | 'calm' | 'lively' | 'fast'

export interface BorderSettings {
  visible: boolean
  color: string // hex color, e.g. '#5082dc'
  glow: GlowLevel
  pulse: PulseLevel
}

export const DEFAULT_BORDER: BorderSettings = {
  visible: true,
  color: '#5082dc',
  glow: 'soft',
  pulse: 'calm'
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
