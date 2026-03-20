import { useState, useEffect, useRef } from 'react'
import type {
  SetupAPI,
  BlockSuggestion,
  BlockedApp,
  BorderSettings,
  GlowLevel,
  PulseLevel
} from '../../shared/types'
import { DEFAULT_BORDER } from '../../shared/types'

const api = (): SetupAPI => (window as unknown as { electronAPI: SetupAPI }).electronAPI

const DURATION_OPTIONS = [15, 20, 25, 30, 40, 45, 60, 90, 120]

const BORDER_COLORS = [
  { label: 'Blue', value: '#5082dc' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Green', value: '#30d158' },
  { label: 'Orange', value: '#f59e0b' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Pink', value: '#ec4899' }
]

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  }
}

const GLOW_OPTIONS: { value: GlowLevel; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'soft', label: 'Soft' },
  { value: 'medium', label: 'Medium' },
  { value: 'bright', label: 'Bright' },
  { value: 'intense', label: 'Intense' }
]

const PULSE_OPTIONS: { value: PulseLevel; label: string }[] = [
  { value: 'static', label: 'Static' },
  { value: 'slow', label: 'Slow' },
  { value: 'calm', label: 'Calm' },
  { value: 'lively', label: 'Lively' },
  { value: 'fast', label: 'Fast' }
]

const GLOW_PREVIEW: Record<
  GlowLevel,
  { blur: number; spread: number; solidA: number; glowA: number }
> = {
  none: { blur: 0, spread: 0, solidA: 0.6, glowA: 0 },
  subtle: { blur: 20, spread: 6, solidA: 0.6, glowA: 0.12 },
  soft: { blur: 35, spread: 12, solidA: 0.7, glowA: 0.25 },
  medium: { blur: 45, spread: 16, solidA: 0.75, glowA: 0.32 },
  bright: { blur: 55, spread: 20, solidA: 0.8, glowA: 0.4 },
  intense: { blur: 70, spread: 26, solidA: 0.85, glowA: 0.5 }
}

function buildPreviewShadow(border: BorderSettings): string {
  const { r, g, b } = hexToRgb(border.color)
  const g1 = GLOW_PREVIEW[border.glow]
  const solid = `inset 0 0 0 3px rgba(${r}, ${g}, ${b}, ${g1.solidA})`
  if (g1.glowA === 0) return solid
  return `${solid}, inset 0 0 ${g1.blur}px ${g1.spread}px rgba(${r}, ${g}, ${b}, ${g1.glowA})`
}

interface SelectedItem {
  name: string
  apps: BlockedApp[]
}

export default function App(): React.ReactElement {
  const [durationMinutes, setDurationMinutes] = useState(25)
  const [goal, setGoal] = useState('')
  const [mode, setMode] = useState<'block' | 'allow'>('block')
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [suggestions, setSuggestions] = useState<BlockSuggestion[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [border, setBorder] = useState<BorderSettings>({ ...DEFAULT_BORDER })
  const searchRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api().getBlockSuggestions().then(setSuggestions)
    api().onSessionEnded(() => {
      setGoal('')
    })
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredSuggestions = suggestions.filter((s) => {
    const alreadySelected = selectedItems.some((i) => i.name === s.name)
    if (alreadySelected) return false
    if (!searchQuery) return true
    return s.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const categories = filteredSuggestions.filter((s) => s.type === 'category')
  const apps = filteredSuggestions.filter((s) => s.type === 'app')

  const addItem = (s: BlockSuggestion): void => {
    const item: SelectedItem = {
      name: s.name,
      apps: s.type === 'category' ? s.apps! : [{ name: s.name, bundleId: s.bundleId! }]
    }
    setSelectedItems((prev) => [...prev, item])
    setSearchQuery('')
    searchRef.current?.focus()
  }

  const removeItem = (name: string): void => {
    setSelectedItems((prev) => prev.filter((i) => i.name !== name))
  }

  const allBlockedApps: BlockedApp[] = selectedItems.flatMap((i) => i.apps)

  const handleStart = (): void => {
    if (!goal.trim()) return
    api().startSession({
      durationMinutes,
      goal: goal.trim(),
      blockedApps: allBlockedApps,
      border
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && e.metaKey) handleStart()
  }

  return (
    <div style={styles.container} onKeyDown={handleKeyDown}>
      {/* Content area */}
      <div style={styles.content}>
        {/* Goal */}
        <div style={styles.formRow}>
          <label style={styles.formLabel}>Goal</label>
          <textarea
            style={styles.textarea}
            placeholder="What are you focusing on?"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            maxLength={120}
            rows={2}
            autoFocus
          />
        </div>

        {/* Duration */}
        <div style={styles.formRow}>
          <label style={styles.formLabel}>Duration</label>
          <select
            style={styles.select}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          >
            {DURATION_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
        </div>

        {/* Mode */}
        <div style={styles.formRow}>
          <label style={styles.formLabel}>Mode</label>
          <div style={styles.segmentedControl}>
            <button
              style={{
                ...styles.segmentBtn,
                ...(mode === 'block' ? styles.segmentBtnActive : {})
              }}
              onClick={() => setMode('block')}
            >
              Block
            </button>
            <button
              style={{
                ...styles.segmentBtn,
                ...(mode === 'allow' ? styles.segmentBtnActive : {})
              }}
              onClick={() => setMode('allow')}
            >
              Allow
            </button>
          </div>
        </div>

        {/* Block/Allow apps */}
        <div style={styles.formRow}>
          <label style={styles.formLabel}>{mode === 'block' ? 'Block' : 'Allow'}</label>
          <div style={styles.chipInputWrapper} ref={dropdownRef} data-no-drag>
            <div style={styles.chipInputInner}>
              {selectedItems.map((item) => (
                <span key={item.name} style={styles.chip}>
                  {item.name}
                  <button style={styles.chipRemove} onClick={() => removeItem(item.name)}>
                    ×
                  </button>
                </span>
              ))}
              <input
                ref={searchRef}
                style={styles.chipSearchInput}
                type="text"
                placeholder={selectedItems.length === 0 ? 'Search apps or categories...' : ''}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
              />
            </div>

            {showDropdown && filteredSuggestions.length > 0 && (
              <div style={styles.dropdown}>
                {categories.length > 0 && (
                  <>
                    <div style={styles.dropdownHeader}>
                      Categories <span style={styles.dropdownCount}>{categories.length}</span>
                    </div>
                    {categories.map((s) => (
                      <button
                        key={s.name}
                        style={styles.dropdownItem}
                        onClick={() => addItem(s)}
                        onMouseEnter={(e) => {
                          ;(e.target as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
                        }}
                        onMouseLeave={(e) => {
                          ;(e.target as HTMLElement).style.background = 'transparent'
                        }}
                      >
                        <span style={styles.dropdownItemIcon}>{s.icon}</span>
                        {s.name}
                      </button>
                    ))}
                  </>
                )}
                {apps.length > 0 && (
                  <>
                    <div style={styles.dropdownHeader}>
                      Apps <span style={styles.dropdownCount}>{apps.length}</span>
                    </div>
                    {apps.map((s) => (
                      <button
                        key={s.name}
                        style={styles.dropdownItem}
                        onClick={() => addItem(s)}
                        onMouseEnter={(e) => {
                          ;(e.target as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
                        }}
                        onMouseLeave={(e) => {
                          ;(e.target as HTMLElement).style.background = 'transparent'
                        }}
                      >
                        <span style={styles.dropdownItemIcon}>{s.icon}</span>
                        {s.name}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Focus Border */}
        <div style={styles.formRow}>
          <label style={{ ...styles.formLabel, paddingTop: 0 }}>Border</label>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Visible toggle — on same line as label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 20 }}>
              <button
                style={{
                  ...styles.toggle,
                  ...(border.visible ? styles.toggleOn : {})
                }}
                onClick={() => setBorder((b) => ({ ...b, visible: !b.visible }))}
              >
                <div
                  style={{
                    ...styles.toggleKnob,
                    ...(border.visible ? styles.toggleKnobOn : {})
                  }}
                />
              </button>
              <span style={{ fontSize: 13, color: c.textSecondary }}>
                {border.visible ? 'Visible' : 'Hidden'}
              </span>
            </div>

            {border.visible && (
              <>
                {/* Color presets + custom picker */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {BORDER_COLORS.map((preset) => (
                    <button
                      key={preset.value}
                      title={preset.label}
                      onClick={() => setBorder((b) => ({ ...b, color: preset.value }))}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        border:
                          border.color === preset.value
                            ? '2px solid #fff'
                            : '2px solid transparent',
                        background: preset.value,
                        cursor: 'pointer',
                        padding: 0,
                        outline: 'none',
                        boxShadow:
                          border.color === preset.value ? `0 0 0 1px ${c.surfaceBorder}` : 'none',
                        transition: 'border 0.15s, box-shadow 0.15s'
                      }}
                    />
                  ))}
                  <div style={{ position: 'relative', marginLeft: 4 }}>
                    <input
                      type="color"
                      value={border.color}
                      onChange={(e) => setBorder((b) => ({ ...b, color: e.target.value }))}
                      style={
                        {
                          width: 22,
                          height: 22,
                          border: 'none',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          padding: 0,
                          background: 'transparent',
                          appearance: 'none',
                          WebkitAppearance: 'none'
                        } as React.CSSProperties
                      }
                      title="Custom color"
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        border: `2px solid ${c.surfaceBorder}`,
                        pointerEvents: 'none',
                        background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)`,
                        opacity: 0.85
                      }}
                    />
                  </div>
                </div>

                {/* Glow level */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: c.textSecondary, minWidth: 38 }}>Glow</span>
                  <div style={styles.pillGroup}>
                    {GLOW_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        style={{
                          ...styles.pill,
                          ...(border.glow === opt.value ? styles.pillActive : {})
                        }}
                        onClick={() => setBorder((b) => ({ ...b, glow: opt.value }))}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pulse speed */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: c.textSecondary, minWidth: 38 }}>Pulse</span>
                  <div style={styles.pillGroup}>
                    {PULSE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        style={{
                          ...styles.pill,
                          ...(border.pulse === opt.value ? styles.pillActive : {})
                        }}
                        onClick={() => setBorder((b) => ({ ...b, pulse: opt.value }))}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live preview */}
                <div
                  style={{
                    height: 48,
                    borderRadius: 6,
                    background: '#1a1a1c',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 6,
                      boxShadow: buildPreviewShadow(border),
                      transition: 'box-shadow 0.3s ease'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      color: c.textTertiary,
                      letterSpacing: '0.3px'
                    }}
                  >
                    Preview
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={styles.bottomBar}>
        <button
          style={{
            ...styles.startBtn,
            ...(!goal.trim() ? styles.startBtnDisabled : {})
          }}
          onClick={handleStart}
          disabled={!goal.trim()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6, flexShrink: 0 }}>
            <circle cx="8" cy="8" r="6.8" fill="none" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="8" cy="8" r="4.2" fill="none" stroke="currentColor" strokeWidth="0.9"/>
            <circle cx="8" cy="8" r="1.7" fill="currentColor"/>
            <line x1="1" y1="8" x2="3" y2="8" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="13" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="8" y1="1" x2="8" y2="3" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
          </svg>
          Start Focus Session
        </button>
        <div style={styles.shortcutHint}>
          <span style={styles.shortcutKey}>⌘</span>
          <span style={styles.shortcutKey}>↵</span>
        </div>
      </div>
    </div>
  )
}

// Dark palette — matches native macOS dark mode
const c = {
  bg: '#2a2a2c',
  surface: '#3a3a3c', // raised inputs, controls
  surfaceBorder: '#4a4a4c', // subtle edge on inputs
  text: '#e5e5e7', // primary text — high contrast on dark
  textSecondary: '#98989d', // labels, hints
  textTertiary: '#6e6e73', // counts, disabled
  chipBg: 'rgba(10,132,255,0.18)', // system blue tint for chips
  chipText: '#64b5f6', // soft blue chip text
  accent: '#30d158', // macOS system green
  divider: 'rgba(255,255,255,0.06)'
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
    color: c.text,
    fontSize: 13,
    background: c.bg
  },

  content: {
    flex: 1,
    padding: '60px 32px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    overflowY: 'auto'
  },

  formRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16
  },

  formLabel: {
    width: 72,
    minWidth: 72,
    paddingTop: 7,
    fontSize: 13,
    fontWeight: 400,
    color: c.textSecondary,
    textAlign: 'right'
  },

  textarea: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 6,
    border: `1px solid ${c.surfaceBorder}`,
    background: c.surface,
    color: c.text,
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
    resize: 'none',
    lineHeight: 1.4
  },

  select: {
    flex: 1,
    padding: '6px 8px',
    borderRadius: 6,
    border: `1px solid ${c.surfaceBorder}`,
    background: c.surface,
    color: c.text,
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'auto' as React.CSSProperties['appearance']
  },

  segmentedControl: {
    display: 'inline-flex',
    borderRadius: 6,
    overflow: 'hidden',
    border: `1px solid ${c.surfaceBorder}`,
    background: c.surface
  },

  segmentBtn: {
    padding: '5px 16px',
    border: 'none',
    background: 'transparent',
    color: c.textSecondary,
    fontSize: 13,
    fontFamily: 'inherit',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s'
  },

  segmentBtnActive: {
    background: '#515154',
    color: c.text,
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
  },

  chipInputWrapper: {
    flex: 1,
    position: 'relative' as const
  },

  chipInputInner: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 4,
    padding: '5px 8px',
    borderRadius: 6,
    border: `1px solid ${c.surfaceBorder}`,
    background: c.surface,
    minHeight: 32,
    alignItems: 'center',
    cursor: 'text'
  },

  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px 2px 6px',
    borderRadius: 4,
    background: c.chipBg,
    color: c.chipText,
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap' as const
  },

  chipIcon: {
    fontSize: 12
  },

  chipIconImg: {
    width: 14,
    height: 14,
    borderRadius: 3,
    objectFit: 'cover' as const
  },

  chipRemove: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'none',
    color: c.chipText,
    fontSize: 14,
    cursor: 'pointer',
    padding: 0,
    marginLeft: 2,
    lineHeight: 1,
    fontFamily: 'inherit',
    opacity: 0.6
  },

  chipSearchInput: {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: 13,
    fontFamily: 'inherit',
    color: c.text,
    flex: 1,
    minWidth: 80,
    padding: '2px 0'
  },

  dropdown: {
    position: 'absolute' as const,
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: '#323234',
    borderRadius: 8,
    border: `1px solid ${c.surfaceBorder}`,
    boxShadow: '0 8px 30px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2)',
    maxHeight: 240,
    overflowY: 'auto' as const,
    zIndex: 1000,
    padding: '4px 0'
  },

  dropdownHeader: {
    padding: '8px 12px 4px',
    fontSize: 11,
    fontWeight: 600,
    color: c.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px'
  },

  dropdownCount: {
    color: c.textTertiary,
    fontWeight: 400,
    opacity: 0.6
  },

  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '7px 12px',
    border: 'none',
    background: 'transparent',
    color: c.text,
    fontSize: 13,
    fontFamily: 'inherit',
    cursor: 'pointer',
    textAlign: 'left' as const,
    borderRadius: 0,
    transition: 'background 0.1s'
  },

  dropdownItemIcon: {
    fontSize: 15,
    width: 20,
    textAlign: 'center' as const
  },

  dropdownItemIconImg: {
    width: 18,
    height: 18,
    borderRadius: 4,
    objectFit: 'cover' as const,
    flexShrink: 0
  },

  bottomBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 32px 16px',
    borderTop: `1px solid ${c.divider}`,
    background: 'transparent'
  },

  startBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '7px 20px',
    borderRadius: 6,
    border: 'none',
    background: c.accent,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'opacity 0.15s',
    letterSpacing: '-0.1px'
  },

  startBtnDisabled: {
    opacity: 0.3,
    cursor: 'default'
  },

  shortcutHint: {
    display: 'flex',
    alignItems: 'center',
    gap: 3
  },

  shortcutKey: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 20,
    borderRadius: 4,
    border: `1px solid ${c.surfaceBorder}`,
    background: c.surface,
    fontSize: 11,
    color: c.textSecondary,
    fontFamily: 'inherit'
  },

  toggle: {
    position: 'relative' as const,
    width: 36,
    height: 20,
    borderRadius: 10,
    border: 'none',
    background: c.surface,
    cursor: 'pointer',
    padding: 0,
    transition: 'background 0.2s',
    flexShrink: 0
  },

  toggleOn: {
    background: c.accent
  },

  toggleKnob: {
    position: 'absolute' as const,
    top: 2,
    left: 2,
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: '#fff',
    transition: 'left 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
  },

  toggleKnobOn: {
    left: 18
  },

  pillGroup: {
    display: 'flex',
    gap: 0,
    borderRadius: 6,
    overflow: 'hidden',
    border: `1px solid ${c.surfaceBorder}`,
    background: c.surface
  },

  pill: {
    padding: '4px 10px',
    border: 'none',
    background: 'transparent',
    color: c.textSecondary,
    fontSize: 11,
    fontFamily: 'inherit',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const
  },

  pillActive: {
    background: '#515154',
    color: c.text,
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
  }
}
