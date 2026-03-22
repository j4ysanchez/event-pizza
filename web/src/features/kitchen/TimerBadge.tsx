import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface TimerBadgeProps {
  placedAt: string
}

export function TimerBadge({ placedAt }: TimerBadgeProps) {
  const [minutesElapsed, setMinutesElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(placedAt).getTime()) / 60_000)
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setMinutesElapsed(Math.floor((Date.now() - new Date(placedAt).getTime()) / 60_000))
    }, 1000)
    return () => clearInterval(interval)
  }, [placedAt])

  const isCritical = minutesElapsed >= 25
  const isWarning = minutesElapsed >= 15
  const color = isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-gray-400'

  return (
    <span className={`flex items-center gap-1 text-xs ${color} ${isCritical ? 'animate-pulse' : ''}`}>
      <Clock size={12} />
      {minutesElapsed}m
    </span>
  )
}
