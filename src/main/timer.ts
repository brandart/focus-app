let timerId: ReturnType<typeof setInterval> | null = null

export function startTimer(
  durationSeconds: number,
  onTick: (remainingSeconds: number) => void,
  onEnd: () => void
): void {
  stopTimer()
  let remaining = durationSeconds

  onTick(remaining)

  timerId = setInterval(() => {
    remaining -= 1
    if (remaining <= 0) {
      stopTimer()
      onEnd()
    } else {
      onTick(remaining)
    }
  }, 1000)
}

export function stopTimer(): void {
  if (timerId !== null) {
    clearInterval(timerId)
    timerId = null
  }
}
