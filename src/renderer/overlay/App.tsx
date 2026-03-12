import { useEffect, useState } from 'react'
import type { TickPayload, OverlayAPI, BorderSettings } from '../../shared/types'
import { DEFAULT_BORDER } from '../../shared/types'

const api = (): OverlayAPI => (window as unknown as { electronAPI: OverlayAPI }).electronAPI

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  }
}

function buildBorderShadow(border: BorderSettings): string {
  if (!border.visible) return 'none'
  const { r, g, b } = hexToRgb(border.color)
  const t = border.thickness
  const solid = `inset 0 0 0 ${t}px rgba(${r}, ${g}, ${b}, 0.75)`
  if (!border.glow) return solid
  const glowSpread = Math.round(t * 4.5)
  const glowBlur = Math.round(t * 13)
  return `${solid}, inset 0 0 ${glowBlur}px ${glowSpread}px rgba(${r}, ${g}, ${b}, 0.35)`
}

function buildPulseShadow(border: BorderSettings): string {
  if (!border.visible) return 'none'
  const { r, g, b } = hexToRgb(border.color)
  const t = border.thickness
  const solid = `inset 0 0 0 ${t + 1}px rgba(${r}, ${g}, ${b}, 0.9)`
  if (!border.glow) return solid
  const glowSpread = Math.round(t * 6)
  const glowBlur = Math.round(t * 17)
  return `${solid}, inset 0 0 ${glowBlur}px ${glowSpread}px rgba(${r}, ${g}, ${b}, 0.45)`
}

export default function App(): React.ReactElement {
  const [remaining, setRemaining] = useState<number | null>(null)
  const [border, setBorder] = useState<BorderSettings>(DEFAULT_BORDER)

  useEffect(() => {
    api().onTick((payload: TickPayload) => {
      setRemaining(payload.remainingSeconds)
    })
    api().onBorderUpdate((settings: BorderSettings) => {
      setBorder(settings)
    })
  }, [])

  // Inject dynamic keyframes for the border glow animation
  useEffect(() => {
    const styleId = 'dynamic-focus-border'
    let el = document.getElementById(styleId) as HTMLStyleElement | null
    if (!el) {
      el = document.createElement('style')
      el.id = styleId
      document.head.appendChild(el)
    }
    if (!border.visible) {
      el.textContent = '.focus-border-dynamic { box-shadow: none !important; animation: none !important; }'
      return
    }
    const base = buildBorderShadow(border)
    const pulse = buildPulseShadow(border)
    el.textContent = `
      .focus-border-dynamic {
        box-shadow: ${base};
        ${border.glow ? `animation: focus-glow-dynamic 3.5s ease-in-out infinite;` : 'animation: none;'}
      }
      @keyframes focus-glow-dynamic {
        0%, 100% { box-shadow: ${base}; }
        50% { box-shadow: ${pulse}; }
      }
    `
  }, [border])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'transparent',
        pointerEvents: 'none'
      }}
    >
      <div
        className="focus-border-dynamic"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'transparent',
          pointerEvents: 'none'
        }}
      />

      {/* Timer — right side */}
      {remaining !== null && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 32,
            color: 'rgba(255, 255, 255, 1)',
            font: "600 20px -apple-system, 'SF Pro Display', sans-serif",
            textShadow: '0 1px 4px rgba(0,0,0,0.5), 0 0 24px rgba(80, 140, 255, 0.9)',
            letterSpacing: '0.05em',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          {formatTime(remaining)}
        </div>
      )}
    </div>
  )
}
