import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'
import type { OrderStatus } from '../../types/models'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Order Placed',
  confirmed: 'Order Confirmed',
  preparing: 'Prep in Progress',
  baking: 'In the Oven',
  ready: 'Ready for Pickup/Dispatch',
  dispatched: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Order Cancelled',
  failed: 'Order Failed',
}

const STATUS_ORDER = ['pending', 'confirmed', 'preparing', 'baking', 'ready', 'dispatched', 'delivered']

interface StatusTimelineProps {
  currentStatus: OrderStatus
}

export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const currentStatusIndex = STATUS_ORDER.indexOf(currentStatus)
  const isTerminal = currentStatus === 'cancelled' || currentStatus === 'failed'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <h2 className="font-semibold mb-4">Order Status</h2>
      <div className="space-y-4">
        {STATUS_ORDER.map((status, i) => {
          const isDone = i < currentStatusIndex
          const isActive = !isTerminal && i === currentStatusIndex
          const isFuture = isTerminal ? i >= currentStatusIndex : i > currentStatusIndex

          return (
            <div
              key={status}
              className="flex items-center gap-3 timeline-entry"
              style={{ animation: isDone || isActive ? 'timeline-slide-in 0.3s ease-out both' : undefined }}
            >
              {isDone ? (
                <CheckCircle2 size={20} className="text-green-500 shrink-0" />
              ) : isActive ? (
                <Loader2 size={20} className="text-red-600 animate-spin shrink-0" />
              ) : (
                <Circle size={20} className="text-gray-300 shrink-0" />
              )}
              <span
                className={`text-sm ${
                  isDone ? 'text-gray-500 line-through' : isActive ? 'font-semibold text-gray-900' : 'text-gray-400'
                }`}
              >
                {STATUS_LABELS[status]}
              </span>
            </div>
          )
        })}
        {isTerminal && (
          <div
            className="flex items-center gap-3 timeline-entry"
            style={{ animation: 'timeline-slide-in 0.3s ease-out both' }}
          >
            <XCircle size={20} className="text-red-500 shrink-0" />
            <span className="text-sm font-semibold text-red-600">
              {STATUS_LABELS[currentStatus]}
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes timeline-slide-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
