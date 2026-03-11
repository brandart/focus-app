import { useState } from 'react'
import type { SetupAPI } from '../../shared/types'

const api = (): SetupAPI => (window as unknown as { electronAPI: SetupAPI }).electronAPI

const PRESETS = [25, 45, 60]

export default function App(): React.ReactElement {
  const [durationMinutes, setDurationMinutes] = useState(25)
  const [customDuration, setCustomDuration] = useState('')
  const [goal, setGoal] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  const effectiveDuration = useCustom
    ? Math.max(1, parseInt(customDuration) || 1)
    : durationMinutes

  const handleStart = (): void => {
    if (!goal.trim()) return
    api().startSession({ durationMinutes: effectiveDuration, goal: goal.trim() })
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') handleStart()
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Focus</h1>

      <div style={styles.section}>
        <label style={styles.label}>Duration</label>
        <div style={styles.presets}>
          {PRESETS.map((m) => (
            <button
              key={m}
              style={{
                ...styles.presetBtn,
                ...(!useCustom && durationMinutes === m ? styles.presetBtnActive : {})
              }}
              onClick={() => {
                setUseCustom(false)
                setDurationMinutes(m)
              }}
            >
              {m}m
            </button>
          ))}
          <input
            style={{
              ...styles.customInput,
              ...(useCustom ? styles.customInputActive : {})
            }}
            type="number"
            min={1}
            max={480}
            placeholder="custom"
            value={customDuration}
            onChange={(e) => {
              setCustomDuration(e.target.value)
              setUseCustom(true)
            }}
            onFocus={() => setUseCustom(true)}
          />
        </div>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>What's your focus goal?</label>
        <input
          style={styles.goalInput}
          type="text"
          placeholder="e.g. finish the proposal draft"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          maxLength={80}
        />
      </div>

      <button
        style={{
          ...styles.startBtn,
          ...(!goal.trim() ? styles.startBtnDisabled : {})
        }}
        onClick={handleStart}
        disabled={!goal.trim()}
      >
        Start Focus
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    padding: '28px 28px 24px',
    background: '#111',
    minHeight: '100vh',
    boxSizing: 'border-box',
    fontFamily: "-apple-system, 'SF Pro Display', sans-serif",
    color: '#e8e8e8',
    userSelect: 'none'
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: '-0.5px',
    color: '#fff'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.6px'
  },
  presets: {
    display: 'flex',
    gap: 8,
    alignItems: 'center'
  },
  presetBtn: {
    padding: '7px 14px',
    borderRadius: 8,
    border: '1px solid #333',
    background: '#1a1a1a',
    color: '#aaa',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'inherit'
  },
  presetBtnActive: {
    background: '#1a3a5c',
    border: '1px solid rgba(100, 200, 255, 0.6)',
    color: 'rgba(180, 230, 255, 0.95)'
  },
  customInput: {
    width: 72,
    padding: '7px 10px',
    borderRadius: 8,
    border: '1px solid #333',
    background: '#1a1a1a',
    color: '#aaa',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit'
  },
  customInputActive: {
    border: '1px solid rgba(100, 200, 255, 0.6)',
    color: 'rgba(180, 230, 255, 0.95)'
  },
  goalInput: {
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid #333',
    background: '#1a1a1a',
    color: '#e8e8e8',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box'
  },
  startBtn: {
    padding: '10px 0',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #1a6eb5, #0d4f8a)',
    color: 'rgba(200, 235, 255, 0.95)',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 0 16px rgba(100, 180, 255, 0.25)',
    transition: 'opacity 0.15s'
  },
  startBtnDisabled: {
    opacity: 0.4,
    cursor: 'default'
  }
}
