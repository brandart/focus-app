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

import type { GlowLevel, PulseLevel } from '../../shared/types'

// Maps named glow levels to { blur, spread, solidAlpha, glowAlpha }
const GLOW_MAP: Record<GlowLevel, { blur: number; spread: number; solidA: number; glowA: number }> =
  {
    none: { blur: 0, spread: 0, solidA: 0.6, glowA: 0 },
    subtle: { blur: 20, spread: 6, solidA: 0.6, glowA: 0.12 },
    soft: { blur: 35, spread: 12, solidA: 0.7, glowA: 0.25 },
    medium: { blur: 45, spread: 16, solidA: 0.75, glowA: 0.32 },
    bright: { blur: 55, spread: 20, solidA: 0.8, glowA: 0.4 },
    intense: { blur: 70, spread: 26, solidA: 0.85, glowA: 0.5 }
  }

// Maps named pulse levels to animation duration in seconds (0 = no animation)
const PULSE_MAP: Record<PulseLevel, number> = {
  static: 0,
  slow: 5.5,
  calm: 3.5,
  lively: 2.2,
  fast: 1.4
}

function buildBorderShadow(border: BorderSettings): string {
  if (!border.visible) return 'none'
  const { r, g, b } = hexToRgb(border.color)
  const g1 = GLOW_MAP[border.glow]
  const solid = `inset 0 0 0 3px rgba(${r}, ${g}, ${b}, ${g1.solidA})`
  if (g1.glowA === 0) return solid
  return `${solid}, inset 0 0 ${g1.blur}px ${g1.spread}px rgba(${r}, ${g}, ${b}, ${g1.glowA})`
}

function buildPulseShadow(border: BorderSettings): string {
  if (!border.visible) return 'none'
  const { r, g, b } = hexToRgb(border.color)
  const g1 = GLOW_MAP[border.glow]
  // Pulse peaks: slightly thicker border + amplified glow
  const solid = `inset 0 0 0 4px rgba(${r}, ${g}, ${b}, ${Math.min(1, g1.solidA + 0.15)})`
  if (g1.glowA === 0) return solid
  const peakBlur = Math.round(g1.blur * 1.4)
  const peakSpread = Math.round(g1.spread * 1.3)
  const peakAlpha = Math.min(0.65, g1.glowA + 0.12)
  return `${solid}, inset 0 0 ${peakBlur}px ${peakSpread}px rgba(${r}, ${g}, ${b}, ${peakAlpha})`
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
      el.textContent =
        '.focus-border-dynamic { box-shadow: none !important; animation: none !important; }'
      return
    }
    const base = buildBorderShadow(border)
    const pulse = buildPulseShadow(border)
    const duration = PULSE_MAP[border.pulse]
    const hasPulse = duration > 0
    el.textContent = `
      .focus-border-dynamic {
        box-shadow: ${base};
        ${hasPulse ? `animation: focus-glow-dynamic ${duration}s ease-in-out infinite;` : 'animation: none;'}
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
