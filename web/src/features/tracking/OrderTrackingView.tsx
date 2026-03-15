import { useParams } from 'react-router-dom'
import { useOrderEventStream } from '../../api/sse/useOrderEventStream'
import { Wifi, WifiOff, CheckCircle2, Circle, Loader2 } from 'lucide-react'

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

export function OrderTrackingView() {
  const { orderId } = useParams<{ orderId: string }>()
  const { orderViewModel, isConnected, isStale, reconnectAttempt } = useOrderEventStream(
    orderId ?? ''
  )

  const currentStatusIndex = STATUS_ORDER.indexOf(orderViewModel.status)

  return (
    <div className="max-w-lg mx-auto">
      {/* Connection indicator */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">
          Order #{orderViewModel.orderId.slice(-6).toUpperCase()}
        </h1>
        <div className="flex items-center gap-1.5 text-xs">
          {isStale ? (
            <>
              <WifiOff size={14} className="text-yellow-500" />
              <span className="text-yellow-600">
                Reconnecting... (attempt {reconnectAttempt})
              </span>
            </>
          ) : isConnected ? (
            <>
              <Wifi size={14} className="text-green-500" />
              <span className="text-green-600">Live</span>
            </>
          ) : (
            <>
              <Loader2 size={14} className="text-gray-400 animate-spin" />
              <span className="text-gray-500">Connecting...</span>
            </>
          )}
        </div>
      </div>

      {/* ETA window */}
      {orderViewModel.estimatedReadyAt && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-center">
          <p className="text-sm text-red-600 font-medium">Estimated arrival</p>
          <p className="text-2xl font-bold text-red-700 mt-1">
            {getETAWindow(orderViewModel.estimatedReadyAt)}
          </p>
        </div>
      )}

      {/* Status timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h2 className="font-semibold mb-4">Order Status</h2>
        <div className="space-y-4">
          {STATUS_ORDER.map((status, i) => {
            const isDone = i < currentStatusIndex
            const isActive = i === currentStatusIndex
            const isFuture = i > currentStatusIndex

            if (orderViewModel.status === 'cancelled' || orderViewModel.status === 'failed') {
              // Show all completed statuses + cancelled/failed at end
            }

            return (
              <div key={status} className="flex items-center gap-3">
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
          {(orderViewModel.status === 'cancelled' || orderViewModel.status === 'failed') && (
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-red-500 shrink-0" />
              <span className="text-sm font-semibold text-red-600">
                {STATUS_LABELS[orderViewModel.status]}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Per-item status */}
      {orderViewModel.items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold mb-3">Items</h2>
          <div className="space-y-2">
            {orderViewModel.items.map((item) => (
              <div key={item.itemId} className="flex items-center justify-between text-sm">
                <span>{item.quantity}× {item.name}</span>
                {item.status && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                    {item.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getETAWindow(isoString: string): string {
  const eta = new Date(isoString)
  const lower = new Date(eta.getTime() - 5 * 60_000)
  const upper = new Date(eta.getTime() + 5 * 60_000)
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${fmt(lower)} – ${fmt(upper)}`
}
