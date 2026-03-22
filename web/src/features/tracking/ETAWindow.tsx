interface ETAWindowProps {
  estimatedReadyAt: string
}

function getETAWindow(isoString: string): string {
  const eta = new Date(isoString)
  const lower = new Date(eta.getTime() - 5 * 60_000)
  const upper = new Date(eta.getTime() + 5 * 60_000)
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${fmt(lower)} \u2013 ${fmt(upper)}`
}

export function ETAWindow({ estimatedReadyAt }: ETAWindowProps) {
  return (
    <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-center">
      <p className="text-sm text-red-600 font-medium">Estimated arrival</p>
      <p className="text-2xl font-bold text-red-700 mt-1">
        {getETAWindow(estimatedReadyAt)}
      </p>
    </div>
  )
}
