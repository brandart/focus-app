import { useState, useEffect, useRef } from 'react'
import type { SetupAPI, BlockSuggestion, BlockedApp } from '../../shared/types'

const api = (): SetupAPI => (window as unknown as { electronAPI: SetupAPI }).electronAPI

const DURATION_OPTIONS = [15, 20, 25, 30, 40, 45, 60, 90, 120]

interface SelectedItem {
  name: string
  icon: string
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
      icon: s.icon,
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
      blockedApps: allBlockedApps
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
                  <span style={styles.chipIcon}>{item.icon}</span>
                  {item.name}
                  <button
                    style={styles.chipRemove}
                    onClick={() => removeItem(item.name)}
                  >
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
                      Categories{' '}
                      <span style={styles.dropdownCount}>{categories.length}</span>
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
                      Apps{' '}
                      <span style={styles.dropdownCount}>{apps.length}</span>
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
  surface: '#3a3a3c',        // raised inputs, controls
  surfaceBorder: '#4a4a4c',  // subtle edge on inputs
  text: '#e5e5e7',           // primary text — high contrast on dark
  textSecondary: '#98989d',  // labels, hints
  textTertiary: '#6e6e73',   // counts, disabled
  chipBg: 'rgba(10,132,255,0.18)',  // system blue tint for chips
  chipText: '#64b5f6',              // soft blue chip text
  accent: '#30d158',         // macOS system green
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

  bottomBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 32px 16px',
    borderTop: `1px solid ${c.divider}`,
    background: 'transparent'
  },

  startBtn: {
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
  }
}
