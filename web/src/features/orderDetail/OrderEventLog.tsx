import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface OrderEventLogProps {
  events: unknown[]
}

function EventRow({ event, index }: { event: unknown; index: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b border-gray-700 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="text-gray-500">#{index + 1}</span>
        <span className="truncate">
          {typeof event === 'object' && event !== null && 'type' in event
            ? String((event as { type: string }).type)
            : 'Event'}
        </span>
      </button>
      {expanded && (
        <pre className="px-3 pb-2 text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(event, null, 2)}
        </pre>
      )}
    </div>
  )
}

export function OrderEventLog({ events }: OrderEventLogProps) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-500 py-2">No events recorded.</p>
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {events.map((event, i) => (
        <EventRow key={i} event={event} index={i} />
      ))}
    </div>
  )
}
