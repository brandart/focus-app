import { useEffect, useState } from 'react'
import type { TickPayload, OverlayAPI } from '../../shared/types'

const api = (): OverlayAPI => (window as unknown as { electronAPI: OverlayAPI }).electronAPI

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function App(): React.ReactElement {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    api().onTick((payload: TickPayload) => {
      setRemaining(payload.remainingSeconds)
    })
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'transparent',
        pointerEvents: 'none'
      }}
    >
      {/* Soft blue focus border — gentle pulse (blue supports concentration) */}
      <div
        className="focus-border"
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
